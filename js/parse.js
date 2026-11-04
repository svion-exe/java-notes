/* Reads a topic file (format in CONTENT.md) into plain objects. No DOM here. */
(function () {
  'use strict';
  var JN = (window.JN = window.JN || {});

  var BLOCKS = { code: 1, out: 1, dry: 1, mem: 1, svg: 1, trap: 1, note: 1, interview: 1, q: 1 };

  /* Markdown subset -> blocks: p, h3, ul, ol, table, fence */
  JN.md = function (lines) {
    var out = [], i = 0, n = lines.length;
    var blank = function (s) { return !s.trim(); };
    var cells = function (s) { return s.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); };
    while (i < n) {
      var l = lines[i];
      if (blank(l)) { i++; continue; }
      var f = /^```\s*(.*)$/.exec(l);
      if (f) {
        var code = [];
        i++;
        while (i < n && !/^```/.test(lines[i])) code.push(lines[i++]);
        i++;
        out.push({ k: 'fence', info: f[1].trim(), code: code.join('\n') });
        continue;
      }
      if (/^###\s+/.test(l)) { out.push({ k: 'h3', text: l.replace(/^###\s+/, '').trim() }); i++; continue; }
      if (/^\s*\|/.test(l) && i + 1 < n && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        var head = cells(l), rows = [];
        i += 2;
        while (i < n && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
        out.push({ k: 'table', head: head, rows: rows });
        continue;
      }
      var ul = /^\s*-\s+/.test(l), ol = /^\s*\d+\.\s+/.test(l);
      if (ul || ol) {
        var re = ol ? /^\s*\d+\.\s+(.*)$/ : /^\s*-\s+(.*)$/, items = [];
        while (i < n) {
          var m = re.exec(lines[i]);
          if (m) { items.push(m[1]); i++; }
          else if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1] += ' ' + lines[i].trim(); i++; }
          else break;
        }
        out.push({ k: ol ? 'ol' : 'ul', items: items });
        continue;
      }
      var para = [];
      while (i < n && !blank(lines[i]) && !/^```/.test(lines[i]) && !/^###\s/.test(lines[i]) &&
             !/^\s*-\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i]) && !/^\s*\|/.test(lines[i])) {
        para.push(lines[i].trim());
        i++;
      }
      if (para.length) out.push({ k: 'p', text: para.join(' ') });
      else i++;
    }
    return out;
  };

  /* dry: "line | name=value; ~name | note | console" per step, optional own code before a --- line */
  function dryItem(title, body, prevCode) {
    var cut = -1;
    for (var i = 0; i < body.length; i++) if (body[i].trim() === '---') { cut = i; break; }
    var code = cut >= 0 ? body.slice(0, cut) : (prevCode || []);
    var rest = cut >= 0 ? body.slice(cut + 1) : body;
    var steps = [];
    rest.forEach(function (s) {
      if (!s.trim()) return;
      var f = s.split('|').map(function (x) { return x.trim(); });
      var vars = [];
      (f[1] || '').split(';').forEach(function (it) {
        it = it.trim();
        if (!it) return;
        if (it.charAt(0) === '~') { vars.push({ name: it.slice(1).trim(), del: true }); return; }
        var e = it.indexOf('=');
        if (e > 0) vars.push({ name: it.slice(0, e).trim(), val: it.slice(e + 1).trim() });
      });
      steps.push({ line: f[0] === '-' ? 0 : parseInt(f[0], 10) || 0, vars: vars, note: f[2] || '', out: f[3] || '' });
    });
    return { t: 'dry', title: title, code: code, steps: steps };
  }

  function splitQ(body) {
    var parts = { Q: [], A: [], E: [] }, cur = null, fence = false;
    body.forEach(function (ln) {
      if (!fence) {
        var m = /^([QAE]):\s?(.*)$/.exec(ln);
        if (m) { cur = m[1]; parts[cur].push(m[2]); return; }
      }
      if (/^```/.test(ln)) fence = !fence;
      if (cur) parts[cur].push(ln);
    });
    return parts;
  }

  JN.parseTopic = function (src) {
    var raw = src.replace(/\r\n/g, '\n').split('\n');
    var topic = { id: '', title: '', summary: '', subs: [] };
    var sub = null, buf = null, lastCode = null, i = 0, n = raw.length;

    function flush() {
      if (buf && sub) sub.items.push({ t: 'text', lines: buf });
      buf = null;
    }

    while (i < n) {
      var line = raw[i];
      if (line.indexOf('## ') === 0) {
        flush();
        var h = /^##\s+(.*?)\s*\{#([a-z0-9-]+)\}\s*$/.exec(line);
        var id = h ? h[2] : 'x-' + i;
        sub = { id: id, title: h ? h[1] : line.slice(3).trim(), isTest: /-test$/.test(id), items: [] };
        topic.subs.push(sub);
        lastCode = null;
        i++;
        continue;
      }
      if (!sub) {
        if (line.indexOf('# ') === 0 && !topic.title) topic.title = line.slice(2).trim();
        else if (line.indexOf('id:') === 0) topic.id = line.slice(3).trim();
        else if (line.indexOf('summary:') === 0) topic.summary = line.slice(8).trim();
        i++;
        continue;
      }
      var m = /^:::(\w+)\s*(.*)$/.exec(line);
      if (m && BLOCKS[m[1]]) {
        var body = [], j = i + 1;
        while (j < n && raw[j].trim() !== ':::' && !/^:::\w+/.test(raw[j])) body.push(raw[j++]);
        flush();
        var name = m[1], arg = m[2].trim();
        if (name === 'code') {
          lastCode = { t: 'code', code: body.join('\n'), flags: arg.split(/\s+/).filter(Boolean), out: null };
          sub.items.push(lastCode);
        } else if (name === 'out') {
          if (lastCode && lastCode.out === null) lastCode.out = body.join('\n').replace(/\s+$/, '');
        } else if (name === 'dry') {
          sub.items.push(dryItem(arg, body, lastCode ? lastCode.code.split('\n') : []));
        } else if (name === 'q') {
          var tg = /tags=([\w,-]+)/.exec(arg);
          sub.items.push({ t: 'q', tags: tg ? tg[1].split(',').filter(Boolean) : [], parts: splitQ(body) });
        } else {
          sub.items.push({ t: name, title: arg, lines: body });
        }
        i = j + 1;
        continue;
      }
      if (line.trim() === ':::') { i++; continue; }
      if (!buf) buf = [];
      buf.push(line);
      i++;
    }
    flush();
    return topic;
  };
})();
