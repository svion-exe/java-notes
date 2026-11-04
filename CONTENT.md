# Writing notes for Java Notes

Every topic is one file in `content/`. The app reads these files directly, so adding or fixing a note never touches the app code. Run `python3 tools/verify.py` after every edit. It compiles and runs every Java snippet and compares the real output with the `out` block.

## File layout

```
# Topic title
id: t1
summary: One sentence that says what the topic covers.

## Subtopic title {#t1-scope}
...
## Topic test {#t1-test}
...
```

- One `#` heading per file, then `id:` and `summary:`.
- Every `##` heading is a subtopic and needs a unique `{#id}`. Ids start with the topic id (`t1-scope`).
- The last `##` section of a topic is the test. Its id ends in `-test` and it holds exactly 12 `:::q` blocks.

## Text

- Paragraphs are plain lines. A blank line starts a new paragraph.
- Inline: `**bold**` and `` `code` ``. No italics.
- Lists: lines starting `- ` or `1. `.
- Tables: pipe tables with a `|---|---|` separator row.
- `### Heading` is a small heading inside a subtopic.
- Cross reference: `[[t5-pool|String Constant Pool]]`. The text after `|` is what the reader sees. The id must exist (see the outline below). Tapping it jumps there and shows a "Back" button. Long-press shows a preview.

## Blocks

A block starts with `:::name` on its own line and ends with `:::` on its own line. Blocks do not nest.

### code, out

```
:::code
int x = 5;
System.out.println(x + 1);
:::
:::out
6
:::
```

- `out` belongs to the closest `code` above it. It shows as a collapsed "Output" drawer.
- `:::code fail` is a snippet that must NOT compile. The `out` block then holds the compiler message text (one or more lines). Each line must appear in the real `javac` message.
- `:::code nocheck` skips verification. Use it only when the snippet is deliberately incomplete.
- `:::code members` is a list of fields and methods without a `main`. It is compiled inside a class.
- A snippet that ends with an uncaught exception shows its stdout, then only the first stderr line, for example `Exception in thread "main" java.lang.ArithmeticException: / by zero`.
- Never print anything that changes between runs (`hashCode`, `Object.toString()` addresses, time, random).

How the verifier compiles a snippet:

1. If it contains `void main(`, it is a full program. Write complete classes. Imports for `java.util.*`, `java.util.function.*`, `java.util.regex.*`, `java.util.stream.*` and `java.io.*` are added automatically.
2. If it has top-level `class`, `interface`, `enum` or `record` declarations and no `main`, it is compile-checked only.
3. Otherwise it is a fragment of statements and is placed inside `public static void main(String[] args)`.

Details that matter:

- A fragment has **no `throws` clause**. A checked exception must be caught, or the snippet must be a full program.
- If a snippet has top-level types **and** statements (for example a `record` followed by lines that use it), it is a fragment. The types become local types inside `main`. Use a full program when you need `static` members or interfaces with `static` methods.
- A snippet whose only content is type declarations is compile-checked only. It cannot have an `out` block.
- A full program may have several top-level classes. Put `main` in the class you want to run. At most one class may be `public`.
- Snippets run with no input (`System.in` is empty) and a 20 second limit.

### dry

A step-by-step trace. It attaches to the `code` block above it. The reader sees the code with the current line highlighted, a variable table, a note, and any console output so far.

```
:::dry Tracing the loop
1 | sum=0 | sum starts at 0
2 | i=1 | first pass, i is 1
3 | sum=1 | 0 + 1
2 | i=2 |
3 | sum=3 | 1 + 2 | sum is now 3
:::
```

Each step is `line | variables | note | console`. Fields cannot contain `|`, and variable values cannot contain `;`.

- `line` is the 1-based line number in the code block. Use `-` for no highlight.
- `variables` are `name=value` pairs separated by `;`. Only list variables that change in this step. Earlier values are kept. `~name` removes a variable when it goes out of scope. Values may contain commas, for example `a=[1, 2, 3]`.
- `note` is one short sentence saying what happened and why.
- `console` is one printed line (what one `println` shows). It is appended to the console area as a new line. Leave it out when nothing is printed.
- Trailing empty fields can be left out.

A dry run can carry its own code. Put the code first, then a line with only `---`, then the steps. Use this when the trace is not about the snippet above it.

Use a dry run whenever a snippet has a loop, recursion, or state that changes. Keep it to 6-14 steps. Show the interesting iterations, not all of them.

### mem

A memory diagram: stack on the left, heap and pool on the right, with arrows for references.

```
:::mem Two references, one object
stack
  frame main
  a -> #1
  *b -> #1
  n = 5
heap
  #1 Student : name -> #2 | marks = 90
  #2 String : "Ana"
  #3 int[] : 10 | 20 | 30
  #4 Student[] : -> #1 | -> #1 | null
pool
  #5 String : "java"
caption: b was copied from a, so both point to the same Student.
:::
```

- `stack`, `heap` and `pool` open a region. `pool` is the String pool. Regions are drawn in the order you write them. Leave out the ones you do not need.
- Stack rows: `name = value` for primitives, `name -> #id` for references, `name -> null`. `frame name` starts a labelled stack frame. Without it all rows share one frame.
- Heap and pool objects: `#id Type : field | field | ...`. A field is `name = value`, `name -> #id`, `name -> null`, a plain `value`, or `-> #id` for an unnamed reference.
- A `Type` ending in `[]` is drawn as a row of indexed cells (use plain values and `-> #id`). Any other type is drawn as a box with one field per row.
- A `*` at the start of a row or object marks it as changed or important (highlighted).
- `caption:` adds one line under the diagram.
- `#id` values are unique within the block.

### svg

Hand-drawn diagram for things `mem` cannot show (type ladders, growth charts, hierarchies, flow). Keep the viewBox width at 360 and the height under 300.

```
:::svg Widening direction
<svg viewBox="0 0 360 80">
  <rect class="dg-box" x="10" y="20" width="60" height="36" rx="6"/>
  <text class="dg-text" x="40" y="43" text-anchor="middle">byte</text>
  <line class="dg-line" x1="70" y1="38" x2="100" y2="38" marker-end="url(#ah)"/>
</svg>
:::
```

Use only these classes so the colors follow light and dark mode: `dg-box` (neutral box), `dg-hl` (accent box), `dg-warn` (warning box), `dg-text` (mono text), `dg-label` (small muted text), `dg-line` (muted line), `dg-arrow` (accent line). Arrow heads: `marker-end="url(#ah)"`. Never use hex colors or `style=`.

### trap, note, interview

```
:::trap
`new String("java") == "java"` is false. The constructor always creates a fresh object.
:::
```

- `trap`: a mistake people really make. Name the mistake and the fix.
- `note`: a rule worth remembering.
- `interview`: a question an interviewer asks about this, with the one-line answer.

Use them sparingly: one trap per subtopic at most, and only when it is real.

### q

```
:::q tags=t1-scope,t1-shadowing
Q: What does this print?
```java
int x = 10;
{ int y = x + 1; }
System.out.println(y);
```
A: It does not compile.
```err
cannot find symbol
```
E: `y` is declared in an inner block and is gone after the closing brace.
:::
```

- `Q:` is the question. `A:` is the short answer. `E:` is the explanation. All three are required.
- Any of the three may contain paragraphs, lists and fenced code.
- `tags=` lists the subtopic ids the question covers. It is required in the test and optional in subtopic checks.
- The verifier runs a `java` fence in `Q:` when `A:` holds an `out` fence (expected output) or an `err` fence (expected compile error text). Always give one of them for a runnable question. Write the program as a fragment or a full program following the same rules as `code`.
- A fence that must not be verified is written ```java nocheck.

## Writing rules

Voice
- Plain, direct and exact. Short sentences. Easy words for hard ideas, but never a wrong word for an easy one.
- No emojis, no filler, no chatty openers ("Let's dive in"), no praise, no hype, no "as we all know".
- Define a term once, where it first matters, in one sentence. Then use it.

Each subtopic
1. The idea in 2-6 sentences. Say what it is, why it exists, and what goes wrong without it.
2. Snippets with real, verified output. Build up from a minimal example to the surprising one.
3. A `dry` for anything with loops, recursion, or changing state. A `mem` for anything involving references or memory.
4. At most one `trap`, only if it is a real trap.
5. Two or three `q` check questions at the end (varied: predict the output, why does this fail, true or false).

The topic test (12 questions)
- Each question has `tags=` with one to three subtopic ids it exercises.
- Tricky, but built only from fundamentals. No obscure API. The difficulty comes from combining two ideas or from a detail people skim past.
- Mix: predict the output (5-6), will it compile (2), spot the bug (2), what changes if (1-2), which statement is true (1).
- Every runnable question is verified by the checker.

Depth and cross references
- Go deeper than a tutorial. Explain how it works inside, not only what it does.
- Link to earlier ideas with `[[id|label]]`. A link is worth it when the reader may have forgotten the idea. Do not link every mention.
- Forward links are allowed when marked in the sentence, for example "covered in [[t8-hashmap|HashMap]]".
- Add subtopics beyond the outline when the topic needs them. New ids must start with the topic id.

## Quality bar

The reader is a trainee learning core Java and DSA on a phone. These notes are the book they revise from, so they have to be correct, deep and easy to scan.

- **Correct first.** Every claim about Java behaviour is checked by running it. If the checker cannot test a claim (JVM internals, performance), state it only if you are sure, and say "typically" when it depends on the implementation.
- **Mentor voice.** Say what the beginner usually gets wrong and why the language works that way. Give a rule of thumb the reader can reuse. Prefer one exact sentence over three vague ones.
- **Build up.** Each subtopic starts with the smallest snippet that shows the idea, then adds one twist at a time, ending with the case that surprises people.
- **Snippets are short.** 3-15 lines. Print values so the output teaches something. Use realistic names (`student`, `balance`, `marks`), not `foo` and `bar`.
- **Memory and state are drawn.** Use `mem` for references, arrays, objects and the String pool. Use `dry` for loops, recursion and changing variables.
- **Check questions** (2-3 per subtopic) test the idea just taught. **Test questions** (12 per topic) are harder: they combine subtopics, and each has exactly one defensible answer.
- **Explanations (`E:`)** say why the right answer is right and name the wrong belief that leads to the wrong answer.
- **Cross references.** Link back to the idea a subtopic depends on, and link a forward preview where it helps. Ten to twenty links per topic is about right.
- **No clutter.** No emojis, no filler, no "Note that", no "Let's". No empty sections. If a subtopic has nothing real for a `trap`, `note` or `interview`, leave it out.
- **No copying.** Write everything fresh. Do not paste text from books, tutorials or documentation.

## Topics list

`content/topics.json` is the list of files in reading order. The app and the checker both read it:

```
[{"id":"t1","file":"t1-variables.md"}, ...]
```

## Outline and ids

These are the ids other topics may link to.

### t1 Variables, Data Types and Casting (content/t1-variables.md)
t1-prim-ref, t1-primitives, t1-literals, t1-scope, t1-shadowing, t1-widening, t1-narrowing, t1-precision, t1-promotion, t1-operators, t1-test

### t2 Methods (content/t2-methods.md)
t2-anatomy, t2-pass-by-value, t2-reference-params, t2-swap, t2-overloading, t2-resolution, t2-varargs, t2-returns, t2-call-stack, t2-static, t2-test

### t3 Control Flow (content/t3-control-flow.md)
t3-branching, t3-loops, t3-break-continue, t3-labels, t3-nested, t3-patterns, t3-complexity, t3-loop-bugs, t3-invariants, t3-test

### t4 Arrays and Matrices (content/t4-arrays.md)
t4-memory, t4-basics, t4-bounds, t4-2d, t4-jagged, t4-traversal, t4-matrix-ops, t4-utility, t4-copying, t4-array-objects, t4-patterns, t4-test

### t5 Strings and Characters (content/t5-strings.md)
t5-immutability, t5-pool, t5-equality, t5-inspect, t5-extract, t5-split, t5-character, t5-char-arith, t5-builder, t5-parsing, t5-format, t5-test

### t6 Regular Expressions (content/t6-regex.md)
t6-intro, t6-pattern-matcher, t6-classes, t6-quantifiers, t6-anchors, t6-groups, t6-matcher-api, t6-replace-split, t6-flags, t6-escaping, t6-practical, t6-test

### t7 Generics and Wrapper Classes (content/t7-generics.md)
t7-why, t7-classes-methods, t7-bounded, t7-wildcards, t7-erasure, t7-wrappers, t7-autoboxing, t7-cache, t7-parsing, t7-test

### t8 Collections and Iterators (content/t8-collections.md)
t8-hierarchy, t8-arraylist, t8-arraylist-internals, t8-hashmap, t8-hashmap-internals, t8-hashset, t8-equals-hashcode, t8-others, t8-iteration, t8-iterator, t8-cme, t8-utility, t8-patterns, t8-test

## Checking

```
python3 tools/verify.py                      # every topic
python3 tools/verify.py content/t3-control-flow.md   # one topic
```

The checker reports compile errors, output mismatches, unknown cross-reference ids, malformed dry-run steps and malformed `mem` blocks, and prints counts per topic. A topic is finished when it reports zero problems.
