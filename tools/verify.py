#!/usr/bin/env python3
"""Checker for the Java Notes content files. See CONTENT.md for the format.

    python3 tools/verify.py                         every topic
    python3 tools/verify.py content/t3-control-flow.md
    python3 tools/verify.py --stable                run every snippet twice and compare
    python3 tools/verify.py -j 2 --no-cache

It compiles and runs every Java snippet and compares the real output with the
`out` block (or the `err` fence of a question). It also checks structure,
cross references, dry runs, mem diagrams and svg diagrams.
Set VERIFY_TMP to choose where temporary build folders go.
"""
import argparse, concurrent.futures as cf, hashlib, json, os, re, shutil, subprocess
import sys, tempfile, time
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content")
CACHE_FILE = os.path.join(ROOT, "tools", ".verify-cache.json")
IMPORTS = ("import java.util.*;\nimport java.util.function.*;\nimport java.util.regex.*;\n"
           "import java.util.stream.*;\nimport java.io.*;\n")
BLOCKS = {"code", "out", "dry", "mem", "svg", "trap", "note", "interview", "q"}
SVG_CLASSES = {"dg-box", "dg-hl", "dg-warn", "dg-text", "dg-label", "dg-line", "dg-arrow"}
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿⭐⭕️]")
ID_RE = re.compile(r"^[a-z][a-z0-9]*(-[a-z0-9]+)+$")
JAVA_ENV = {k: v for k, v in os.environ.items() if k != "JAVA_TOOL_OPTIONS"}
JVM_FAST = ["-Xshare:auto", "-XX:TieredStopAtLevel=1", "-XX:+UseSerialGC"]


# ---------------------------------------------------------------- parsing
class Block:
    def __init__(self, name, arg, lines, line_no):
        self.name, self.arg, self.lines, self.line_no = name, arg, lines, line_no


class Section:
    def __init__(self, title, sid, line_no):
        self.title, self.id, self.line_no = title, sid, line_no
        self.items = []  # ("text", [(lineno, line)]) or ("block", Block)

    def blocks(self, name=None):
        return [b for k, b in self.items if k == "block" and (name is None or b.name == name)]


class Topic:
    def __init__(self, path):
        self.path = path
        self.name = os.path.basename(path)
        self.title = self.id = self.summary = None
        self.sections = []
        self.problems = []
        self.warnings = []

    def err(self, line, msg):
        self.problems.append((line, msg))

    def warn(self, line, msg):
        self.warnings.append((line, msg))


def parse_topic(path):
    t = Topic(path)
    with open(path, encoding="utf-8") as f:
        raw = f.read().split("\n")
    i, n = 0, len(raw)
    sec = None
    text = None
    while i < n:
        line = raw[i]
        if sec is None:
            if line.startswith("# ") and t.title is None:
                t.title = line[2:].strip()
            elif line.startswith("id:") and t.id is None:
                t.id = line[3:].strip()
            elif line.startswith("summary:") and t.summary is None:
                t.summary = line[8:].strip()
            elif line.startswith("## "):
                pass
            elif line.strip():
                t.err(i + 1, "unexpected text before the first subtopic")
        if line.startswith("## "):
            m = re.match(r"^##\s+(.*?)\s*\{#([a-z0-9-]+)\}\s*$", line)
            if not m:
                t.err(i + 1, "subtopic heading needs a {#id}")
                sec = Section(line[3:].strip(), "", i + 1)
            else:
                sec = Section(m.group(1), m.group(2), i + 1)
            t.sections.append(sec)
            text = None
            i += 1
            continue
        if sec is None:
            i += 1
            continue
        m = re.match(r"^:::(\w+)\s*(.*)$", line)
        if m and line.strip() != ":::":
            name, arg = m.group(1), m.group(2).strip()
            body, j, closed = [], i + 1, False
            while j < n:
                if raw[j].strip() == ":::":
                    closed = True
                    break
                if re.match(r"^:::\w+", raw[j]):
                    break
                body.append(raw[j])
                j += 1
            if not closed:
                t.err(i + 1, f"block :::{name} is not closed with :::")
            if name not in BLOCKS:
                t.err(i + 1, f"unknown block :::{name}")
            sec.items.append(("block", Block(name, arg, body, i + 1)))
            text = None
            i = j + 1
            continue
        if line.strip() == ":::":
            t.err(i + 1, "stray ::: line")
            i += 1
            continue
        if line.startswith("```"):
            t.err(i + 1, "fenced code outside a block: use :::code")
        if text is None:
            text = []
            sec.items.append(("text", text))
        text.append((i + 1, line))
        i += 1
    return t


def parse_q(block):
    """Return dict with Q, A, E (list of lines) and the fences found in each."""
    parts = {"Q": [], "A": [], "E": []}
    cur, fence = None, None
    for ln in block.lines:
        if fence is None:
            m = re.match(r"^([QAE]):\s?(.*)$", ln)
            if m:
                cur = m.group(1)
                parts[cur].append(m.group(2))
                continue
        if ln.startswith("```"):
            fence = None if fence is not None else ln[3:].strip()
        if cur:
            parts[cur].append(ln)
    return parts


def fences(lines):
    res, cur, info = [], None, None
    for ln in lines:
        if ln.startswith("```"):
            if cur is None:
                cur, info = [], ln[3:].strip()
            else:
                res.append((info, "\n".join(cur)))
                cur = None
        elif cur is not None:
            cur.append(ln)
    return res


# ---------------------------------------------------------------- java
def strip_java(code):
    out, i, n = [], 0, len(code)
    blank = lambda s: re.sub(r"[^\n]", " ", s)
    while i < n:
        if code.startswith("//", i):
            j = code.find("\n", i)
            j = n if j < 0 else j
            out.append(" " * (j - i)); i = j
        elif code.startswith("/*", i):
            j = code.find("*/", i + 2)
            j = n if j < 0 else j + 2
            out.append(blank(code[i:j])); i = j
        elif code.startswith('"""', i):
            j = code.find('"""', i + 3)
            j = n if j < 0 else j + 3
            out.append(blank(code[i:j])); i = j
        elif code[i] in "\"'":
            q, j = code[i], i + 1
            while j < n and code[j] != q and code[j] != "\n":
                j += 2 if code[j] == "\\" else 1
            j = min(j + 1, n)
            out.append(blank(code[i:j])); i = j
        else:
            out.append(code[i]); i += 1
    return "".join(out)


def analyze(code):
    s = strip_java(code)
    depth, depth_at = 0, []
    for ch in s:
        if ch == "}":
            depth -= 1
        depth_at.append(depth)
        if ch == "{":
            depth += 1
    types = []
    for m in re.finditer(r"(?<![\w.])(class|interface|enum|record)\s+([A-Za-z_]\w*)", s):
        if depth_at[m.start()] != 0:
            continue
        if m.group(1) == "record" and not re.match(r"\s*[(<]", s[m.end():]):
            continue
        pre = re.search(r"((?:\b(?:public|abstract|final|sealed|non-sealed|static|strictfp)\s+)*)$", s[:m.start()])
        public = "public" in pre.group(1)
        b = s.find("{", m.end())
        e = b
        if b >= 0:
            e = b + 1
            while e < len(s) and not (s[e] == "}" and depth_at[e] == 0):
                e += 1
        types.append({"name": m.group(2), "public": public, "start": m.start(), "body": (b, e)})
    mains = [m.start() for m in re.finditer(r"\bvoid\s+main\s*\(", s)]
    owner = None
    for p in mains:
        for ty in types:
            if ty["body"][0] < p < ty["body"][1]:
                owner = ty["name"]
    # what is left at depth 0 once imports and type declarations are removed
    rest = list(s)
    for ty in types:
        a = ty["start"]
        pre = re.search(r"((?:\b(?:public|abstract|final|sealed|non-sealed|static|strictfp)\s+)*)$", s[:a])
        a -= len(pre.group(1))
        for k in range(a, min(ty["body"][1] + 1, len(rest))):
            rest[k] = " "
    rest = re.sub(r"^\s*(import|package)\s[^;]*;", " ", "".join(rest), flags=re.M)
    return {"types": types, "has_main": bool(mains), "owner": owner, "has_statements": bool(rest.strip())}


def build(code, flags):
    """Return (mode, filename, owner, source) or raise ValueError."""
    if "members" in flags:
        return "compile", "Members.java", None, IMPORTS + "class Members {\n" + code + "\n}\n"
    a = analyze(code)
    if a["has_main"]:
        if a["owner"] is None:
            raise ValueError("main is not inside a top-level class")
        pubs = [t["name"] for t in a["types"] if t["public"]]
        if len(pubs) > 1:
            raise ValueError("more than one public class")
        fname = (pubs[0] if pubs else a["owner"]) + ".java"
        return "run", fname, a["owner"], IMPORTS + code + "\n"
    if a["types"] and not a["has_statements"]:
        pubs = [t["name"] for t in a["types"] if t["public"]]
        if len(pubs) > 1:
            raise ValueError("more than one public class")
        fname = (pubs[0] if pubs else a["types"][0]["name"]) + ".java"
        return "compile", fname, None, IMPORTS + code + "\n"
    lines = code.split("\n")
    hoisted = [l for l in lines if re.match(r"^\s*import\s", l)]
    body = [l for l in lines if not re.match(r"^\s*import\s", l)]
    src = IMPORTS + "\n".join(hoisted) + "\npublic class Main {\n    public static void main(String[] args) {\n" \
        + "\n".join(body) + "\n    }\n}\n"
    return "run", "Main.java", "Main", src


def run_java(mode, fname, owner, src, stable=False):
    base = os.environ.get("VERIFY_TMP") or None
    d = tempfile.mkdtemp(prefix="jn-", dir=base)
    try:
        path = os.path.join(d, fname)
        with open(path, "w", encoding="utf-8") as f:
            f.write(src)
        c = subprocess.run(["javac", "-encoding", "UTF-8", "-proc:none", "-Xlint:none", "-J-Xshare:auto",
                            "-J-XX:TieredStopAtLevel=1", "-J-XX:+UseSerialGC", "-d", d, path],
                           capture_output=True, text=True, env=JAVA_ENV, timeout=90)
        res = {"compiled": c.returncode == 0, "msg": c.stderr, "out": "", "exc": "", "rc": 0, "timeout": False}
        if not res["compiled"] or mode == "compile":
            return res
        outs = []
        for _ in range(2 if stable else 1):
            try:
                r = subprocess.run(["java", *JVM_FAST, "-Xmx256m", "-Dfile.encoding=UTF-8", "-cp", d, owner],
                                   capture_output=True, text=True, env=JAVA_ENV, timeout=20,
                                   stdin=subprocess.DEVNULL, encoding="utf-8", errors="replace")
            except subprocess.TimeoutExpired:
                res["timeout"] = True
                return res
            exc = ""
            if r.returncode != 0:
                for ln in r.stderr.split("\n"):
                    if ln.strip():
                        exc = ln.rstrip()
                        break
            outs.append((r.stdout, exc, r.returncode))
        res["out"], res["exc"], res["rc"] = outs[0]
        if stable and outs[0] != outs[1]:
            res["unstable"] = True
        return res
    finally:
        shutil.rmtree(d, ignore_errors=True)


def norm(text):
    lines = [l.rstrip() for l in text.replace("\r\n", "\n").split("\n")]
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def actual_output(res):
    parts = [res["out"]] if res["out"] else []
    text = norm("\n".join(parts))
    if res["exc"].startswith("Exception in thread"):
        text = (text + "\n" if text else "") + res["exc"]
    return text


class Runner:
    def __init__(self, workers, use_cache, stable):
        self.workers, self.stable = workers, stable
        self.cache = {}
        self.use_cache = use_cache
        if use_cache and os.path.exists(CACHE_FILE):
            try:
                self.cache = json.load(open(CACHE_FILE))
            except Exception:
                self.cache = {}
        self.jobs = {}
        self.results = {}

    def add(self, code, flags):
        try:
            mode, fname, owner, src = build(code, flags)
        except ValueError as e:
            return None, str(e)
        key = hashlib.sha1(f"{mode}|{fname}|{owner}|{self.stable}|{src}".encode()).hexdigest()
        self.jobs[key] = (mode, fname, owner, src)
        return key, None

    def execute(self):
        todo = [k for k in self.jobs if k not in self.cache]
        done = 0
        with cf.ThreadPoolExecutor(max_workers=self.workers) as ex:
            futs = {ex.submit(run_java, *self.jobs[k], self.stable): k for k in todo}
            for fu in cf.as_completed(futs):
                k = futs[fu]
                try:
                    r = fu.result()
                except Exception as e:  # noqa
                    r = {"compiled": False, "msg": f"runner error: {e}", "out": "", "exc": "", "rc": 1, "timeout": False}
                if not r.get("timeout") and not r["msg"].startswith("runner error"):
                    self.cache[k] = r
                else:
                    self.results[k] = r
                done += 1
                if done % 20 == 0:
                    print(f"  ran {done}/{len(todo)} snippets", file=sys.stderr)
        for k in self.jobs:
            if k in self.cache:
                self.results[k] = self.cache[k]
        if self.use_cache:
            try:
                keep = {k: v for k, v in self.cache.items() if k in self.jobs or len(self.cache) < 4000}
                json.dump(keep, open(CACHE_FILE, "w"))
            except Exception:
                pass


# ---------------------------------------------------------------- checks
def check_expect(t, line, label, res, expect, fail, mode):
    """Compare a result with the expected out/err text."""
    if res is None:
        return
    if res.get("timeout"):
        t.err(line, f"{label}: timed out after 20 s")
        return
    if res.get("unstable"):
        t.err(line, f"{label}: output changes between runs")
    if fail:
        if res["compiled"]:
            t.err(line, f"{label}: marked fail but it compiles")
            return
        msg = res["msg"]
        for el in [x.strip() for x in expect.split("\n") if x.strip()]:
            if el not in msg:
                first = [x for x in msg.split("\n") if "error:" in x][:3]
                t.err(line, f"{label}: javac message does not contain {el!r}. javac said: {first}")
        return
    if not res["compiled"]:
        first = "\n      ".join([x for x in res["msg"].split("\n") if x.strip()][:6])
        t.err(line, f"{label}: does not compile\n      {first}")
        return
    if mode == "compile":
        return
    got, want = actual_output(res), norm(expect)
    if got != want:
        t.err(line, f"{label}: output differs\n      expected: {want!r}\n      actual:   {got!r}")


def check_dry(t, sec, blk, codes, prev_code):
    lines = blk.lines
    code_lines = None
    if "---" in [l.strip() for l in lines]:
        k = [l.strip() for l in lines].index("---")
        code_lines, steps = lines[:k], lines[k + 1:]
        ncode = len(code_lines)
    else:
        steps = lines
        if prev_code is None:
            t.err(blk.line_no, "dry has no code above it and no own code (code, ---, steps)")
            return
        ncode = len(prev_code.lines)
    steps = [(i, s) for i, s in enumerate(steps) if s.strip()]
    if not 3 <= len(steps) <= 20:
        t.err(blk.line_no, f"dry has {len(steps)} steps; use 6-14")
    elif not 6 <= len(steps) <= 14:
        t.warn(blk.line_no, f"dry has {len(steps)} steps; 6-14 is the target")
    if code_lines is None and getattr(prev_code, "out", None):
        want = [l.rstrip() for l in prev_code.out.split("\n")]
        got = []
        for _, s in steps:
            f = [x.strip() for x in s.split("|")]
            if len(f) == 4 and f[3]:
                got.append(f[3])
        k = 0
        for g in got:
            while k < len(want) and want[k] != g:
                k += 1
            if k == len(want):
                t.warn(blk.line_no, f"dry console line {g!r} does not match the snippet output in order")
                break
            k += 1
    for _, s in steps:
        f = [x.strip() for x in s.split("|")]
        if len(f) < 2 or len(f) > 4:
            t.err(blk.line_no, f"dry step needs 2-4 fields (line | variables | note | console): {s!r}")
            continue
        if f[0] != "-" and not (f[0].isdigit() and 1 <= int(f[0]) <= ncode):
            t.err(blk.line_no, f"dry step line {f[0]!r} is not 1..{ncode} or -")
        if f[1]:
            for item in f[1].split(";"):
                item = item.strip()
                if not item:
                    continue
                if not re.match(r"^(~[A-Za-z_][\w.\[\]]*|[A-Za-z_][\w.\[\]]*\s*=.*)$", item):
                    t.err(blk.line_no, f"dry variable {item!r} must be name=value or ~name")
        if len(f) < 3 or not f[2]:
            t.warn(blk.line_no, f"dry step without a note: {s!r}")


def check_mem(t, blk):
    region, ids, refs = None, set(), []
    for i, raw in enumerate(blk.lines):
        if not raw.strip():
            continue
        if raw.startswith("caption:"):
            continue
        if not raw.startswith((" ", "\t")):
            if raw.strip() in ("stack", "heap", "pool"):
                region = raw.strip()
                continue
            t.err(blk.line_no, f"mem: unknown line {raw!r}")
            continue
        row = raw.strip()
        star = row.startswith("*")
        if star:
            row = row[1:].strip()
        if region == "stack":
            if re.match(r"^frame\s+\S+", row):
                continue
            m = re.match(r"^([A-Za-z_]\w*)\s*(=|->)\s*(.+)$", row)
            if not m:
                t.err(blk.line_no, f"mem stack row {row!r}")
            elif m.group(2) == "->":
                if m.group(3) == "null":
                    continue
                mm = re.match(r"^#(\d+)$", m.group(3))
                if not mm:
                    t.err(blk.line_no, f"mem stack reference must be #id or null: {row!r}")
                else:
                    refs.append(mm.group(1))
        elif region in ("heap", "pool"):
            m = re.match(r"^#(\d+)\s+(\S+)\s*:\s?(.*)$", row)
            if not m:
                t.err(blk.line_no, f"mem object row {row!r} (use #id Type : fields)")
                continue
            if m.group(1) in ids:
                t.err(blk.line_no, f"mem duplicate id #{m.group(1)}")
            ids.add(m.group(1))
            for fld in m.group(3).split("|"):
                fld = fld.strip()
                fld = fld[1:].strip() if fld.startswith("*") and not fld.startswith("**") else fld
                mm = re.match(r"^(?:[A-Za-z_]\w*\s*)?->\s*(#\d+|null)$", fld)
                if "->" in fld and mm and mm.group(1) != "null":
                    refs.append(mm.group(1)[1:])
                elif "->" in fld and not mm and not fld.startswith('"'):
                    t.err(blk.line_no, f"mem field {fld!r}")
        else:
            t.err(blk.line_no, "mem row outside stack, heap or pool")
    for r in refs:
        if r not in ids:
            t.err(blk.line_no, f"mem refers to #{r} but no object has that id")


def check_svg(t, blk):
    src = "\n".join(blk.lines).strip()
    m = re.search(r'viewBox="0 0 (\d+) (\d+)"', src)
    if not m or m.group(1) != "360" or int(m.group(2)) > 300:
        t.err(blk.line_no, 'svg viewBox must be "0 0 360 H" with H <= 300')
    if re.search(r"\bstyle\s*=", src):
        t.err(blk.line_no, "svg must not use style=")
    if re.search(r"#[0-9a-fA-F]{3,8}\b", src):
        t.err(blk.line_no, "svg must not use hex colors")
    if re.search(r'\b(fill|stroke)\s*=\s*"(?!none")', src):
        t.err(blk.line_no, "svg must not set fill/stroke attributes; use the dg- classes")
    try:
        root = ET.fromstring(src)
    except ET.ParseError as e:
        t.err(blk.line_no, f"svg is not well-formed XML: {e}")
        return
    for el in root.iter():
        tag = el.tag.split("}")[-1]
        cls = el.get("class", "").split()
        for c in cls:
            if c not in SVG_CLASSES:
                t.err(blk.line_no, f"svg class {c!r} is not allowed")
        if tag == "text" and not ({"dg-text", "dg-label"} & set(cls)):
            t.err(blk.line_no, "svg <text> needs class dg-text or dg-label")
        if tag in ("rect", "line", "path", "circle", "ellipse", "polygon", "polyline") and not cls:
            t.err(blk.line_no, f"svg <{tag}> needs a dg- class")


def collect_refs(t):
    refs = []
    for sec in t.sections:
        for kind, it in sec.items:
            if kind == "text":
                lines = [(n, l) for n, l in it]
            elif it.name in ("trap", "note", "interview", "dry"):
                lines = [(it.line_no, l) for l in it.lines]
            elif it.name == "q":
                lines = [(it.line_no, l) for l in it.lines]
            else:
                continue
            for n, l in lines:
                for m in re.finditer(r"\[\[([^\]|]+)\|([^\]]+)\]\]", l):
                    refs.append((n, m.group(1).strip()))
    return refs


def outline_ids():
    ids = set()
    p = os.path.join(ROOT, "CONTENT.md")
    if os.path.exists(p):
        txt = open(p, encoding="utf-8").read()
        for m in re.finditer(r"^### t\d+ .*\n(t\d+-[a-z0-9, -]+)$", txt, flags=re.M):
            ids.update(x.strip() for x in m.group(1).split(","))
    return ids


def verify(files, workers, use_cache, stable):
    topics = [parse_topic(f) for f in files]
    all_ids = set(outline_ids())
    for t in topics:
        for s in t.sections:
            if s.id:
                all_ids.add(s.id)
    # also ids from content files that are not being checked now
    if os.path.isdir(CONTENT):
        for f in os.listdir(CONTENT):
            full = os.path.join(CONTENT, f)
            if f.endswith(".md") and full not in files:
                all_ids.update(s.id for s in parse_topic(full).sections if s.id)
    runner = Runner(workers, use_cache, stable)
    plan = []  # deferred checks: (topic, line, label, key, expect, fail, mode)
    stats = {}
    for t in topics:
        st = stats[t.name] = dict(sub=0, code=0, out=0, dry=0, mem=0, svg=0, trap=0, note=0, itv=0, chk=0, test=0)
        if not t.title:
            t.err(1, "missing # title")
        if not t.id or not re.match(r"^t\d+$", t.id):
            t.err(1, "missing id: tN")
        if not t.summary:
            t.err(1, "missing summary:")
        if EMOJI.search(open(t.path, encoding="utf-8").read()):
            t.err(1, "contains an emoji")
        seen = set()
        for si, sec in enumerate(t.sections):
            st["sub"] += 1
            is_test = si == len(t.sections) - 1 and sec.id.endswith("-test")
            if sec.id in seen:
                t.err(sec.line_no, f"duplicate id {sec.id}")
            seen.add(sec.id)
            if sec.id and t.id and not sec.id.startswith(t.id + "-"):
                t.err(sec.line_no, f"id {sec.id} must start with {t.id}-")
            if sec.id and not ID_RE.match(sec.id):
                t.err(sec.line_no, f"bad id {sec.id}")
            if sec.id.endswith("-test") and si != len(t.sections) - 1:
                t.err(sec.line_no, "the test must be the last section")
            prev_code, last_code_key, last_code_fail = None, None, False
            counts = dict(code=0, trap=0, q=0)
            for kind, it in sec.items:
                if kind == "text":
                    continue
                b = it
                if b.name == "code":
                    flags = set(b.arg.split())
                    bad = flags - {"fail", "nocheck", "members"}
                    if bad:
                        t.err(b.line_no, f"unknown code flag {sorted(bad)}")
                    st["code"] += 1
                    counts["code"] += 1
                    code = "\n".join(b.lines)
                    if not code.strip():
                        t.err(b.line_no, "empty code block")
                    prev_code = b
                    b.flags = flags
                    b.key, b.mode = None, None
                    if "nocheck" not in flags:
                        key, e = runner.add(code, flags)
                        if e:
                            t.err(b.line_no, f"code: {e}")
                        b.key = key
                        if key:
                            b.mode = runner.jobs[key][0]
                    b.out = None
                elif b.name == "out":
                    st["out"] += 1
                    if prev_code is None or getattr(prev_code, "out", 1) is not None:
                        t.err(b.line_no, "out without a code block directly above it")
                        continue
                    prev_code.out = "\n".join(b.lines)
                    if prev_code.key:
                        plan.append((t, prev_code.line_no, "code", prev_code.key, prev_code.out,
                                     "fail" in prev_code.flags, prev_code.mode))
                elif b.name == "dry":
                    st["dry"] += 1
                    check_dry(t, sec, b, None, prev_code)
                elif b.name == "mem":
                    st["mem"] += 1
                    check_mem(t, b)
                elif b.name == "svg":
                    st["svg"] += 1
                    check_svg(t, b)
                elif b.name == "trap":
                    st["trap"] += 1
                    counts["trap"] += 1
                elif b.name == "note":
                    st["note"] += 1
                elif b.name == "interview":
                    st["itv"] += 1
                elif b.name == "q":
                    counts["q"] += 1
                    st["test" if is_test else "chk"] += 1
                    check_q(t, b, sec, is_test, runner, plan, all_ids)
            # code blocks with no out (and not nocheck/members/compile-only) are only compile-checked
            for kind, it in sec.items:
                if kind == "block" and it.name == "code" and it.key and getattr(it, "out", None) is None:
                    plan.append((t, it.line_no, "code", it.key, None, "fail" in it.flags, it.mode))
            if is_test:
                if counts["q"] != 12:
                    t.err(sec.line_no, f"the test has {counts['q']} questions; it needs exactly 12")
            else:
                if counts["code"] == 0:
                    t.warn(sec.line_no, f"{sec.id}: no code snippet")
                if counts["q"] < 2:
                    t.err(sec.line_no, f"{sec.id}: has {counts['q']} check questions; it needs 2-3")
                elif counts["q"] > 3:
                    t.warn(sec.line_no, f"{sec.id}: has {counts['q']} check questions; 2-3 is the target")
                if counts["trap"] > 1:
                    t.warn(sec.line_no, f"{sec.id}: more than one trap")
        if t.sections and not t.sections[-1].id.endswith("-test"):
            t.err(t.sections[-1].line_no, "the last section must be the topic test (id ends in -test)")
        for n, ref in collect_refs(t):
            if ref not in all_ids:
                t.err(n, f"unknown cross reference id {ref!r}")
    print(f"running {len(runner.jobs)} snippets ({sum(1 for k in runner.jobs if k not in runner.cache)} not cached)...",
          file=sys.stderr)
    t0 = time.time()
    runner.execute()
    print(f"  done in {time.time() - t0:.0f}s", file=sys.stderr)
    for t, line, label, key, expect, fail, mode in plan:
        res = runner.results.get(key)
        if expect is None:
            if res is None:
                continue
            if res.get("timeout"):
                t.err(line, f"{label}: timed out")
            elif fail:
                t.err(line, f"{label}: marked fail but has no out block with the compiler message")
            elif not res["compiled"]:
                first = "\n      ".join([x for x in res["msg"].split("\n") if x.strip()][:6])
                t.err(line, f"{label}: does not compile\n      {first}")
            elif res.get("unstable"):
                t.err(line, f"{label}: output changes between runs")
        else:
            check_expect(t, line, label, res, expect, fail, mode)
    if len(files) > 1 and os.path.isdir(CONTENT):
        defined = {s.id for t in topics for s in t.sections}
        mine = {t.id for t in topics}
        missing = sorted(i for i in outline_ids() - defined if i.split("-")[0] in mine)
        if missing and len(files) == len([f for f in os.listdir(CONTENT) if f.endswith('.md')]):
            topics[0].err(1, f"outline ids not defined in any topic: {', '.join(missing)}")
    return topics, stats


def check_q(t, b, sec, is_test, runner, plan, all_ids):
    parts = parse_q(b)
    for k in "QAE":
        if not "\n".join(parts[k]).strip():
            t.err(b.line_no, f"question is missing {k}:")
    tags = []
    m = re.search(r"tags=([\w,-]+)", b.arg)
    if m:
        tags = [x for x in m.group(1).split(",") if x]
    if is_test and not 1 <= len(tags) <= 3:
        t.err(b.line_no, "test question needs tags= with 1-3 subtopic ids")
    for tg in tags:
        if tg not in {s.id for s in t.sections}:
            t.err(b.line_no, f"tag {tg!r} is not a subtopic id in this file")
    qf = [(i, c) for i, c in fences(parts["Q"]) if i.split()[:1] == ["java"]]
    af = fences(parts["A"])
    runnable = [(i, c) for i, c in qf if "nocheck" not in i.split()]
    exp_out = [c for i, c in af if i == "out"]
    exp_err = [c for i, c in af if i == "err"]
    if len(runnable) > 1:
        t.err(b.line_no, "a question may hold one verified java fence; mark others nocheck")
    if len(runnable) == 1:
        if not exp_out and not exp_err:
            t.err(b.line_no, "runnable question needs an ```out or ```err fence in A:")
            return
        code = runnable[0][1]
        key, e = runner.add(code, set())
        if e:
            t.err(b.line_no, f"question code: {e}")
            return
        if exp_err:
            plan.append((t, b.line_no, "question", key, exp_err[0], True, runner.jobs[key][0]))
        else:
            plan.append((t, b.line_no, "question", key, exp_out[0], False, runner.jobs[key][0]))
    elif exp_out or exp_err:
        t.warn(b.line_no, "A: has an out/err fence but Q: has no verified java fence")


def report(topics, stats):
    bad = 0
    for t in topics:
        for line, msg in sorted(t.problems):
            print(f"{t.name}:{line}: PROBLEM {msg}")
            bad += 1
        for line, msg in sorted(t.warnings):
            print(f"{t.name}:{line}: warning {msg}")
    print()
    hdr = f"{'topic':24} {'sub':>3} {'code':>4} {'dry':>3} {'mem':>3} {'svg':>3} {'trap':>4} {'note':>4} {'intv':>4} {'chk':>3} {'test':>4} {'prob':>4} {'warn':>4}"
    print(hdr)
    for t in topics:
        s = stats[t.name]
        print(f"{t.name:24} {s['sub']:>3} {s['code']:>4} {s['dry']:>3} {s['mem']:>3} {s['svg']:>3} {s['trap']:>4} "
              f"{s['note']:>4} {s['itv']:>4} {s['chk']:>3} {s['test']:>4} {len(t.problems):>4} {len(t.warnings):>4}")
    print(f"\n{bad} problem(s)")
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="*")
    ap.add_argument("-j", type=int, default=2)
    ap.add_argument("--no-cache", action="store_true")
    ap.add_argument("--stable", action="store_true")
    a = ap.parse_args()
    files = [os.path.abspath(f) for f in a.files] or sorted(
        os.path.join(CONTENT, f) for f in os.listdir(CONTENT) if f.endswith(".md"))
    if not files:
        print("no content files")
        return 0
    topics, stats = verify(files, a.j, not a.no_cache, a.stable)
    return 1 if report(topics, stats) else 0


if __name__ == "__main__":
    sys.exit(main())
