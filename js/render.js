/* Turns parsed topics into HTML strings. Pure functions; the app wires up the events. */
(function () {
  'use strict';
  var JN = (window.JN = window.JN || {});

  var esc = (JN.esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });
  var attr = function (s) { return esc(s).replace(/"/g, '&quot;'); };

  /* ---------- Java highlighting ---------- */
  var KW = {};
  ('abstract assert boolean break byte case catch char class const continue default do double else enum extends ' +
    'final finally float for goto if implements import instanceof int interface long native new package private ' +
    'protected public return short static strictfp super switch synchronized this throw throws transient try void ' +
    'volatile while var record sealed permits yield true false null').split(' ').forEach(function (k) { KW[k] = 1; });
  var TOKEN = new RegExp(
    '(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)' + // 1 comment
      '|("""[\\s\\S]*?"""|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])+\')' + // 2 string or char
      '|(@\\w+)' + // 3 annotation
      '|(\\b0[xX][0-9a-fA-F_]+[lL]?\\b|\\b0[bB][01_]+[lL]?\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?[fFdDlL]?\\b)' + // 4 number
      '|([A-Za-z_$][\\w$]*)', // 5 word
    'g'
  );
  JN.hl = function (code) {
    var out = '', last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(code))) {
      out += esc(code.slice(last, m.index));
      last = m.index + m[0].length;
      var t = esc(m[0]);
      if (m[1]) out += '<span class="t-c">' + t + '</span>';
      else if (m[2]) out += '<span class="t-s">' + t + '</span>';
      else if (m[3]) out += '<span class="t-a">' + t + '</span>';
      else if (m[4]) out += '<span class="t-n">' + t + '</span>';
      else if (KW[m[5]]) out += '<span class="t-k">' + t + '</span>';
      else if (/^[A-Z]/.test(m[5]) && !/^[A-Z0-9_]+$/.test(m[5])) out += '<span class="t-t">' + t + '</span>';
      else out += t;
    }
    return out + esc(code.slice(last));
  };

  /* ---------- inline text ---------- */
  JN.inline = function (s) {
    return s
      .split(/(`[^`]+`)/)
      .map(function (part) {
        if (part.length > 1 && part.charAt(0) === '`' && part.charAt(part.length - 1) === '`')
          return '<code>' + esc(part.slice(1, -1)) + '</code>';
        return esc(part)
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, function (_, id, label) {
            id = id.trim();
            if (JN.byId && JN.byId[id]) return '<a class="xref" href="#/s/' + id + '" data-ref="' + id + '">' + label + '</a>';
            return '<span class="xref off">' + label + '</span>';
          });
      })
      .join('');
  };

  function fenceHtml(f) {
    var info = f.info.split(/\s+/)[0];
    if (info === 'java') return codeHtml(f.code, [], null);
    if (info === 'out') return '<div class="res"><div class="reslabel">Output</div>' + outPre(f.code) + '</div>';
    if (info === 'err') return '<div class="res bad"><div class="reslabel">Compiler message</div>' + outPre(f.code) + '</div>';
    return '<pre class="plain">' + esc(f.code) + '</pre>';
  }

  function mdHtml(blocks) {
    return blocks
      .map(function (b) {
        switch (b.k) {
          case 'p': return '<p>' + JN.inline(b.text) + '</p>';
          case 'h3': return '<h3>' + JN.inline(b.text) + '</h3>';
          case 'ul': return '<ul>' + b.items.map(function (x) { return '<li>' + JN.inline(x) + '</li>'; }).join('') + '</ul>';
          case 'ol': return '<ol>' + b.items.map(function (x) { return '<li>' + JN.inline(x) + '</li>'; }).join('') + '</ol>';
          case 'table':
            return '<div class="tw"><table><thead><tr>' +
              b.head.map(function (c) { return '<th>' + JN.inline(c) + '</th>'; }).join('') +
              '</tr></thead><tbody>' +
              b.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + JN.inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
              '</tbody></table></div>';
          case 'fence': return fenceHtml(b);
        }
        return '';
      })
      .join('');
  }
  JN.mdHtml = function (lines) { return mdHtml(JN.md(lines)); };

  /* ---------- code, output ---------- */
  function outPre(text) {
    var lines = text.replace(/\s+$/, '').split('\n').map(function (l) {
      return /^Exception in thread/.test(l) ? '<span class="exc">' + esc(l) + '</span>' : esc(l);
    });
    return '<pre class="outp">' + lines.join('\n') + '</pre>';
  }

  function codeHtml(code, flags, out) {
    var fail = flags.indexOf('fail') >= 0;
    var tag = fail ? '<span class="ctag bad">Does not compile</span>' : flags.indexOf('members') >= 0 ? '<span class="ctag">Class members</span>' : '';
    var h =
      '<div class="snip"><figure class="code"><div class="chead"><span class="lang">Java</span>' + tag +
      '<button type="button" class="copy" data-act="copy">Copy</button></div>' +
      '<pre><code>' + JN.hl(code) + '</code></pre></figure>';
    if (out !== null && out !== undefined)
      h += '<details class="out"><summary>' + (fail ? 'Compiler message' : 'Output') + '</summary>' + outPre(out) + '</details>';
    return h + '</div>';
  }

  /* ---------- dry run ---------- */
  JN.dryNew = function (item, reg) {
    var id = reg.length;
    reg.push({ item: item, i: 0, lines: item.code.map(JN.hl) });
    return (
      '<details class="dry" data-dry="' + id + '"><summary><span>Dry run' + (item.title ? '<span class="dt"> · ' + esc(item.title) + '</span>' : '') +
      '</span></summary><div class="dbody"></div></details>'
    );
  };

  JN.dryBody = function (d) {
    var steps = d.item.steps, n = steps.length, i = d.i, s = steps[i];
    var vars = [], seen = {}, cons = [];
    for (var k = 0; k <= i; k++) {
      steps[k].vars.forEach(function (v) {
        if (v.del) { delete seen[v.name]; vars = vars.filter(function (x) { return x !== v.name; }); return; }
        if (!(v.name in seen)) vars.push(v.name);
        seen[v.name] = v.val;
      });
      if (steps[k].out !== '') cons.push(steps[k].out);
    }
    var changed = {};
    s.vars.forEach(function (v) { changed[v.name] = 1; });
    var code = d.lines.map(function (h, ix) {
      return '<div class="ln' + (s.line === ix + 1 ? ' cur' : '') + '"><span class="no">' + (ix + 1) + '</span><span class="tx">' + (h || ' ') + '</span></div>';
    }).join('');
    var table = vars.length
      ? '<table class="vars"><tbody>' + vars.map(function (v) {
          return '<tr' + (changed[v] ? ' class="chg"' : '') + '><th>' + esc(v) + '</th><td>' + esc(seen[v]) + '</td></tr>';
        }).join('') + '</tbody></table>'
      : '<p class="novars">No variables yet</p>';
    return (
      '<div class="dcode">' + code + '</div>' + table +
      '<p class="dnote">' + (s.note ? JN.inline(s.note) : '&nbsp;') + '</p>' +
      (cons.length ? '<pre class="dcons">' + esc(cons.join('\n')) + '</pre>' : '') +
      '<div class="dctl"><button type="button" data-act="dprev"' + (i === 0 ? ' disabled' : '') + '>Prev</button>' +
      '<span class="dcount">Step ' + (i + 1) + ' of ' + n + '</span>' +
      '<button type="button" data-act="dnext"' + (i === n - 1 ? ' disabled' : '') + '>Next</button>' +
      '<button type="button" class="quiet" data-act="dreset">Restart</button></div>'
    );
  };

  /* ---------- memory diagram ---------- */
  var memUid = 0;
  function parseField(f) {
    var m = f.match(/^([A-Za-z_]\w*)?\s*->\s*(#\d+|null)$/);
    if (m) return m[2] === 'null' ? { name: m[1] || '', kind: 'null' } : { name: m[1] || '', kind: 'ref', ref: m[2].slice(1) };
    m = f.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);
    if (m) return { name: m[1], kind: 'val', val: m[2] };
    return { name: '', kind: 'val', val: f };
  }

  JN.memHtml = function (item) {
    var uid = 'mh' + ++memUid, R = { stack: [], heap: [], pool: [] }, cur = null, caption = '';
    item.lines.forEach(function (raw) {
      if (!raw.trim()) return;
      if (/^caption:/.test(raw)) { caption = raw.slice(8).trim(); return; }
      if (!/^\s/.test(raw)) { var r = raw.trim(); if (R[r]) cur = r; return; }
      var row = raw.trim(), star = false, m;
      if (row.charAt(0) === '*') { star = true; row = row.slice(1).trim(); }
      if (cur === 'stack') {
        m = row.match(/^frame\s+(.+)$/);
        if (m) { R.stack.push({ frame: m[1].trim(), rows: [] }); return; }
        m = row.match(/^([A-Za-z_]\w*)\s*(=|->)\s*(.+)$/);
        if (!m) return;
        var fr = R.stack[R.stack.length - 1];
        if (!fr) { fr = { frame: null, rows: [] }; R.stack.push(fr); }
        if (m[2] === '=') fr.rows.push({ name: m[1], kind: 'val', val: m[3], star: star });
        else if (m[3] === 'null') fr.rows.push({ name: m[1], kind: 'null', star: star });
        else fr.rows.push({ name: m[1], kind: 'ref', ref: m[3].replace('#', ''), star: star });
      } else if (cur === 'heap' || cur === 'pool') {
        m = row.match(/^#(\d+)\s+(\S+)\s*:\s?(.*)$/);
        if (!m) return;
        R[cur].push({ id: m[1], type: m[2], star: star, fields: m[3].split('|').map(function (x) { return x.trim(); }).filter(Boolean).map(parseField) });
      }
    });

    var W = 372, sx = 6, sw = 136, hx = 184, hw = 164, rowH = 24, titleH = 22, top = 24;
    var o = [], anchors = [], pos = {};

    /* stack */
    var y = top;
    if (R.stack.length) {
      o.push('<text class="dg-label" x="' + sx + '" y="14">Stack</text>');
      R.stack.forEach(function (fr) {
        var h = (fr.frame ? 20 : 0) + fr.rows.length * rowH + 6, y0 = y;
        o.push('<rect class="dg-box" x="' + sx + '" y="' + y0 + '" width="' + sw + '" height="' + h + '" rx="4"/>');
        var yy = y0 + 3;
        if (fr.frame) { o.push('<text class="dg-label" x="' + (sx + 8) + '" y="' + (yy + 13) + '">' + esc(fr.frame) + '</text>'); yy += 20; }
        fr.rows.forEach(function (r) {
          var cy = yy + rowH / 2;
          if (r.star) o.push('<rect class="dg-hl" x="' + (sx + 3) + '" y="' + (yy + 1) + '" width="' + (sw - 6) + '" height="' + (rowH - 2) + '" rx="3"/>');
          o.push('<text class="dg-text" x="' + (sx + 8) + '" y="' + (cy + 4) + '">' + esc(r.name) + '</text>');
          if (r.kind === 'val') o.push('<text class="dg-text" x="' + (sx + sw - 8) + '" y="' + (cy + 4) + '" text-anchor="end">' + esc(r.val) + '</text>');
          else if (r.kind === 'null') o.push('<text class="dg-label" x="' + (sx + sw - 8) + '" y="' + (cy + 4) + '" text-anchor="end">null</text>');
          else { o.push('<circle class="dg-dot" cx="' + (sx + sw - 12) + '" cy="' + cy + '" r="3"/>'); anchors.push({ x: sx + sw - 12, y: cy, ref: r.ref, heap: false }); }
          yy += rowH;
        });
        y = y0 + h + 10;
      });
    }
    var stackEnd = y;

    /* heap and pool */
    y = top;
    function drawRegion(name, label) {
      if (!R[name].length) return;
      o.push('<text class="dg-label" x="' + hx + '" y="' + (y - 10) + '">' + label + '</text>');
      R[name].forEach(function (ob) {
        var isArr = /\[\]$/.test(ob.type), cw = ob.fields.length <= 4 ? 40 : 32, per = Math.max(1, Math.floor((hw - 12) / cw));
        var body = isArr ? Math.max(1, Math.ceil(ob.fields.length / per)) * 36 + 4 : Math.max(1, ob.fields.length) * rowH + 4;
        var h = titleH + body;
        pos[ob.id] = { x: hx, y: y, w: hw, h: h };
        o.push('<rect class="' + (ob.star ? 'dg-hl' : 'dg-box') + '" x="' + hx + '" y="' + y + '" width="' + hw + '" height="' + h + '" rx="4"/>');
        o.push('<text class="dg-text" x="' + (hx + 8) + '" y="' + (y + 15) + '">' + esc(ob.type) + '</text>');
        o.push('<text class="dg-label" x="' + (hx + hw - 8) + '" y="' + (y + 15) + '" text-anchor="end">#' + ob.id + '</text>');
        o.push('<line class="dg-line" x1="' + hx + '" y1="' + (y + titleH) + '" x2="' + (hx + hw) + '" y2="' + (y + titleH) + '"/>');
        var by = y + titleH + 2;
        if (isArr) {
          ob.fields.forEach(function (f, k) {
            var cx0 = hx + 6 + (k % per) * cw, cy0 = by + Math.floor(k / per) * 36;
            o.push('<rect class="dg-cell" x="' + cx0 + '" y="' + (cy0 + 2) + '" width="' + (cw - 2) + '" height="32" rx="2"/>');
            o.push('<text class="dg-idx" x="' + (cx0 + 3) + '" y="' + (cy0 + 12) + '">' + k + '</text>');
            var mx = cx0 + (cw - 2) / 2, my = cy0 + 24;
            if (f.kind === 'ref') { o.push('<circle class="dg-dot" cx="' + mx + '" cy="' + my + '" r="3"/>'); anchors.push({ x: mx, y: my, ref: f.ref, heap: true, right: hx + hw }); }
            else o.push('<text class="' + (f.kind === 'null' ? 'dg-label' : 'dg-text') + '" x="' + mx + '" y="' + (my + 3) + '" text-anchor="middle">' + esc(f.kind === 'null' ? 'null' : f.val) + '</text>');
          });
        } else {
          ob.fields.forEach(function (f, k) {
            var cy = by + k * rowH + rowH / 2;
            if (f.name) o.push('<text class="dg-label" x="' + (hx + 8) + '" y="' + (cy + 4) + '">' + esc(f.name) + '</text>');
            if (f.kind === 'val') o.push('<text class="dg-text" x="' + (f.name ? hx + hw - 8 : hx + 8) + '" y="' + (cy + 4) + '"' + (f.name ? ' text-anchor="end"' : '') + '>' + esc(f.val) + '</text>');
            else if (f.kind === 'null') o.push('<text class="dg-label" x="' + (hx + hw - 8) + '" y="' + (cy + 4) + '" text-anchor="end">null</text>');
            else { o.push('<circle class="dg-dot" cx="' + (hx + hw - 12) + '" cy="' + cy + '" r="3"/>'); anchors.push({ x: hx + hw - 12, y: cy, ref: f.ref, heap: true, right: hx + hw }); }
          });
        }
        y += h + 12;
      });
      y += 12;
    }
    drawRegion('heap', 'Heap');
    drawRegion('pool', 'String pool');
    var heapEnd = y;

    /* arrows */
    var paths = anchors.map(function (a, n) {
      var p = pos[a.ref];
      if (!p) return '';
      var ty = p.y + titleH / 2;
      if (!a.heap) return '<path class="mem-arrow" marker-end="url(#' + uid + ')" d="M' + a.x + ' ' + a.y + ' C' + (a.x + 40) + ' ' + a.y + ' ' + (p.x - 40) + ' ' + ty + ' ' + p.x + ' ' + ty + '"/>';
      var rx = p.x + p.w, bulge = 16 + (n % 3) * 5;
      return '<path class="mem-arrow" marker-end="url(#' + uid + ')" d="M' + a.x + ' ' + a.y + ' L' + a.right + ' ' + a.y + ' C' + (a.right + bulge) + ' ' + a.y + ' ' + (rx + bulge) + ' ' + ty + ' ' + rx + ' ' + ty + '"/>';
    }).join('');

    var H = Math.max(stackEnd, heapEnd, 60) - 4;
    return (
      '<figure class="fig mem"><figcaption class="ftitle">' + esc(item.title || 'Memory') + '</figcaption>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + attr(item.title || 'Memory diagram') + '">' +
      '<defs><marker id="' + uid + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="mem-head" d="M0 1L9 5L0 9z"/></marker></defs>' +
      o.join('') + paths + '</svg>' + (caption ? '<p class="fcap">' + JN.inline(caption) + '</p>' : '') + '</figure>'
    );
  };

  /* ---------- questions ---------- */
  JN.qHtml = function (q, key, num, ctx) {
    var tags = '';
    if (q.tags.length && ctx.showTags)
      tags = '<span class="qtags">' + q.tags.map(function (tg) {
        var hit = JN.byId[tg];
        return hit ? '<a class="xref" href="#/s/' + tg + '" data-ref="' + tg + '">' + esc(hit.sub.title) + '</a>' : '';
      }).join('') + '</span>';
    var st = ctx.rating(key);
    return (
      '<section class="q' + (st ? ' is-' + st : '') + '" data-q="' + attr(key) + '" id="q' + num + '">' +
      '<div class="qhead"><span class="qn">Question ' + num + '</span><span class="qstate">' + (st === 'g' ? 'Got it' : st === 'm' ? 'Missed' : '') + '</span></div>' +
      '<div class="qbody">' + JN.mdHtml(q.parts.Q) + '</div>' + tags +
      '<details class="reveal"><summary>Answer and explanation</summary>' +
      '<div class="ans"><div class="lab">Answer</div>' + JN.mdHtml(q.parts.A) + '</div>' +
      '<div class="exp"><div class="lab">Why</div>' + JN.mdHtml(q.parts.E) + '</div>' +
      '<div class="rate"><button type="button" data-act="rate" data-v="g"' + (st === 'g' ? ' class="on"' : '') + '>Got it</button>' +
      '<button type="button" data-act="rate" data-v="m"' + (st === 'm' ? ' class="on"' : '') + '>Missed it</button></div>' +
      '</details></section>'
    );
  };

  /* ---------- a whole subtopic body ---------- */
  var LABEL = { trap: 'Trap', note: 'Rule', interview: 'Interview' };
  JN.subBody = function (sub, ctx) {
    var h = '', qn = 0, shownCheck = false;
    ctx.dry.length = 0;
    sub.items.forEach(function (it) {
      switch (it.t) {
        case 'text': h += mdHtml(JN.md(it.lines)); break;
        case 'code': h += codeHtml(it.code, it.flags, it.out); break;
        case 'dry': h += JN.dryNew(it, ctx.dry); break;
        case 'mem': h += JN.memHtml(it); break;
        case 'svg':
          h += '<figure class="fig"><figcaption class="ftitle">' + esc(it.title) + '</figcaption><div class="svgw">' + it.lines.join('\n') + '</div></figure>';
          break;
        case 'trap': case 'note': case 'interview':
          h += '<aside class="call ' + it.t + '"><div class="lab">' + LABEL[it.t] + '</div>' + JN.mdHtml(it.lines) + '</aside>';
          break;
        case 'q':
          if (!shownCheck && !sub.isTest) { h += '<h2 class="check">Check yourself</h2>'; shownCheck = true; }
          qn++;
          h += JN.qHtml(it, sub.id + '#' + qn, qn, ctx);
          break;
      }
    });
    return h;
  };

  /* ---------- plain text for search and peek ---------- */
  JN.plain = function (s) {
    return s.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1').replace(/[`*]/g, '');
  };
  JN.subText = function (sub) {
    var prose = [], code = [];
    sub.items.forEach(function (it) {
      if (it.t === 'text' || it.t === 'trap' || it.t === 'note' || it.t === 'interview') prose.push(JN.plain((it.lines || []).join(' ')));
      else if (it.t === 'code') code.push(it.code);
      else if (it.t === 'q') prose.push(JN.plain(it.parts.Q.join(' ')));
    });
    return { prose: prose.join(' \n'), code: code.join(' \n') };
  };
  JN.firstPara = function (sub) {
    for (var k = 0; k < sub.items.length; k++) {
      if (sub.items[k].t !== 'text') continue;
      var b = JN.md(sub.items[k].lines).filter(function (x) { return x.k === 'p'; })[0];
      if (b) return JN.plain(b.text);
    }
    return '';
  };
})();
