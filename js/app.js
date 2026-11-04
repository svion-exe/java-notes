/* Java Notes: routing, storage and screens. */
(function () {
  'use strict';
  var JN = window.JN;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var view = $('#view');
  var DAY = 86400000, STEPS = [1, 3, 7, 14, 30];

  /* ---------- saved state ---------- */
  var KEY = 'jn:v1';
  var S = { revised: {}, q: {}, bm: {}, last: null, theme: 'auto', fs: 17 };
  try { var saved = JSON.parse(localStorage.getItem(KEY)); if (saved) for (var k in saved) S[k] = saved[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function applyPrefs() {
    var r = document.documentElement;
    if (S.theme === 'light' || S.theme === 'dark') r.setAttribute('data-theme', S.theme); else r.removeAttribute('data-theme');
    r.style.setProperty('--fs', S.fs + 'px');
  }
  applyPrefs();

  /* ---------- content ---------- */
  JN.topics = [];
  JN.byId = {};
  var flat = [];
  var searchIndex = [];

  function boot() {
    return fetch('content/topics.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('topics'); return r.json(); })
      .then(function (list) {
        return Promise.all(list.map(function (e) {
          return fetch('content/' + e.file, { cache: 'no-cache' }).then(function (r) {
            if (!r.ok) throw new Error(e.file);
            return r.text();
          }).then(function (src) { var t = JN.parseTopic(src); t.file = e.file; if (!t.id) t.id = e.id; return t; });
        }));
      })
      .then(function (topics) {
        JN.topics = topics;
        topics.forEach(function (t, ti) {
          t.subs.forEach(function (s, si) {
            JN.byId[s.id] = { topic: t, sub: s, ti: ti, si: si };
            flat.push(s.id);
            var tx = JN.subText(s);
            searchIndex.push({ id: s.id, topic: t.title, title: s.title, tl: s.title.toLowerCase(), pl: tx.prose.toLowerCase(), cl: tx.code.toLowerCase(), prose: tx.prose, code: tx.code });
          });
        });
      });
  }

  /* ---------- helpers ---------- */
  var MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  function fmtDate(ts) { var d = new Date(ts); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function dueOf(r) { return r.d + STEPS[Math.min(r.n - 1, STEPS.length - 1)] * DAY; }
  function isDue(id) { var r = S.revised[id]; return !!r && dueOf(r) <= Date.now(); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function esc(s) { return JN.esc(s); }
  function nTests(t) { return t.subs.filter(function (s) { return s.isTest; }).length; }
  function revisedCount(t) { return t.subs.filter(function (s) { return !s.isTest && S.revised[s.id]; }).length; }
  function noteCount(t) { return t.subs.filter(function (s) { return !s.isTest; }).length; }
  function testScore(sub) {
    var g = 0, m = 0, n = sub.items.filter(function (i) { return i.t === 'q'; }).length;
    for (var i = 1; i <= n; i++) { var v = S.q[sub.id + '#' + i]; if (v === 'g') g++; else if (v === 'm') m++; }
    return { g: g, m: m, n: n };
  }
  function ago(ts) {
    var d = Math.round((Date.now() - ts) / DAY);
    return d <= 0 ? 'today' : d === 1 ? '1 day ago' : d + ' days ago';
  }

  /* ---------- navigation ---------- */
  var intent = null, ret = null, cur = { label: 'Contents' }, navCount = 0, scrollMem = {}, lp = false;

  function go(hash, opts) {
    intent = opts || {};
    if (location.hash === hash) route(); else location.hash = hash;
  }

  window.addEventListener('hashchange', route);
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { scrollMem[location.hash || '#/'] = window.scrollY; ticking = false; });
  }, { passive: true });

  function setBar(o) {
    $('#title').textContent = o.title || '';
    $('#back').hidden = !o.back;
    var bm = $('#bm');
    bm.hidden = !o.bm;
    if (o.bm) { bm.dataset.id = o.bm; bm.textContent = S.bm[o.bm] ? 'Saved' : 'Save'; bm.classList.toggle('on', !!S.bm[o.bm]); }
    document.title = (o.doc || o.title || 'Java Notes') + (o.doc || o.title ? ' · Java Notes' : '');
    document.querySelectorAll('#tabs a').forEach(function (a) { a.setAttribute('aria-current', a.dataset.tab === o.tab ? 'page' : 'false'); });
  }

  function route() {
    navCount++;
    var h = location.hash || '#/', m, prevIntent = intent;
    intent = null;
    closePeek();
    view.classList.remove('enter');
    if ((m = h.match(/^#\/t\/([\w-]+)$/)) && topicById(m[1])) showTopic(topicById(m[1]));
    else if ((m = h.match(/^#\/s\/([\w-]+?)(?:\/q(\d+))?$/)) && JN.byId[m[1]]) showSub(JN.byId[m[1]], m[2], prevIntent);
    else if (h === '#/search') showSearch();
    else if (h === '#/review') showReview();
    else showHome();
    if (ret && ret.hash === h) ret = null;
    updateRet();
    var target = 0;
    if (prevIntent) target = prevIntent.y || 0; else target = scrollMem[h] || 0;
    if (!(m && m[2])) window.scrollTo(0, target);
    void view.offsetWidth;
    view.classList.add('enter');
  }

  function topicById(id) { return JN.topics.filter(function (t) { return t.id === id; })[0]; }

  function updateRet() {
    var el = $('#ret');
    if (!ret) { el.hidden = true; return; }
    el.hidden = false;
    $('#retgo').textContent = 'Back to ' + ret.label;
  }

  /* ---------- screens ---------- */
  function showHome() {
    cur.label = 'Contents';
    setBar({ title: 'Java Notes', back: false, tab: 'home' });
    var h = '<h1 class="big">Java Notes</h1><p class="lede">Core Java and data structures, in the order to learn them.</p>';
    if (!JN.topics.length) {
      view.innerHTML = h + '<div class="empty"><p><strong>No notes yet.</strong></p><p>Topics appear here once their files are added to the content folder.</p></div>';
      return;
    }
    var due = Object.keys(S.revised).filter(isDue).length;
    var last = S.last && JN.byId[S.last.id];
    if (last) h += '<a class="resume" href="#/s/' + S.last.id + '"><span class="k">Continue</span><span class="v">' + esc(last.sub.title) + '</span><span class="s">' + esc(last.topic.title) + '</span></a>';
    if (due) h += '<a class="dueline" href="#/review">' + due + (due === 1 ? ' subtopic is' : ' subtopics are') + ' due for revision</a>';
    h += '<h2 class="sec">Topics</h2><ol class="toc">';
    JN.topics.forEach(function (t, i) {
      var tot = noteCount(t), done = revisedCount(t), pct = tot ? Math.round((done / tot) * 100) : 0;
      h += '<li><a href="#/t/' + t.id + '"><span class="num">' + pad(i + 1) + '</span><span class="body"><span class="name">' + esc(t.title) +
        '</span><span class="sum">' + esc(t.summary) + '</span><span class="prog"><i style="width:' + pct + '%"></i></span>' +
        '<span class="cnt">' + done + ' of ' + tot + ' revised</span></span></a></li>';
    });
    view.innerHTML = h + '</ol>';
  }

  function showTopic(t) {
    cur.label = t.title;
    setBar({ title: t.title, back: true, tab: 'home' });
    var tot = noteCount(t), done = revisedCount(t), pct = tot ? Math.round((done / tot) * 100) : 0;
    var h = '<p class="kicker">Topic ' + pad(JN.topics.indexOf(t) + 1) + '</p><h1>' + esc(t.title) + '</h1><p class="lede">' + esc(t.summary) + '</p>' +
      '<div class="prog wide"><i style="width:' + pct + '%"></i></div><p class="cnt">' + done + ' of ' + tot + ' revised</p><ol class="subs">';
    var test = null;
    t.subs.forEach(function (s, i) {
      if (s.isTest) { test = s; return; }
      var r = S.revised[s.id];
      h += '<li><a href="#/s/' + s.id + '"><span class="num">' + (i + 1) + '</span><span class="name">' + esc(s.title) + '</span><span class="st">' +
        (S.bm[s.id] ? '<span class="tag">Saved</span>' : '') + (r ? (isDue(s.id) ? '<span class="tag due">Due</span>' : '<span class="tag ok">Revised</span>') : '') + '</span></a></li>';
    });
    h += '</ol>';
    if (test) {
      var sc = testScore(test);
      h += '<a class="testrow" href="#/s/' + test.id + '"><span class="k">Topic test</span><span class="v">' + sc.n + ' questions across the subtopics</span><span class="s">' +
        (sc.g + sc.m ? sc.g + ' got it, ' + sc.m + ' missed' : 'Not attempted yet') + '</span></a>';
    }
    view.innerHTML = h;
  }

  var dryReg = [];
  function showSub(hit, qn, fromGo) {
    var t = hit.topic, s = hit.sub, i = hit.si;
    cur.label = s.title;
    setBar({ title: t.title, doc: s.title, back: true, bm: s.id, tab: 'home' });
    S.last = { id: s.id }; save();
    var ctx = { dry: dryReg, showTags: s.isTest, rating: function (k) { return S.q[k] || ''; } };
    var h = '<p class="kicker">' + (s.isTest ? 'Topic test' : 'Subtopic ' + (i + 1)) + '</p><h1>' + esc(s.title) + '</h1>';
    if (s.isTest) h += '<div class="scorebox" id="score"></div><p class="lede">Try each question before you open the answer. Mark it honestly: missed questions collect under Review.</p>';
    h += '<div class="prose">' + JN.subBody(s, ctx) + '</div>';
    if (!s.isTest) h += '<div class="revise" id="revise"></div>';
    else h += '<div class="revise"><button type="button" class="quiet" data-act="resettest" data-id="' + s.id + '">Clear this test</button></div>';
    var prev = t.subs[i - 1], next = t.subs[i + 1], nt = JN.topics[hit.ti + 1];
    h += '<nav class="pn">' + (prev ? '<a href="#/s/' + prev.id + '"><span class="k">Previous</span><span class="v">' + esc(prev.title) + '</span></a>' : '<span></span>');
    if (next) h += '<a class="r" href="#/s/' + next.id + '"><span class="k">Next</span><span class="v">' + esc(next.title) + '</span></a>';
    else if (nt) h += '<a class="r" href="#/t/' + nt.id + '"><span class="k">Next topic</span><span class="v">' + esc(nt.title) + '</span></a>';
    else h += '<a class="r" href="#/t/' + t.id + '"><span class="k">Topic</span><span class="v">Back to the list</span></a>';
    view.innerHTML = h + '</nav>';
    renderRevise(s.id);
    renderScore(s);
    if (qn) {
      var el = document.getElementById('q' + qn);
      if (el) { var d = el.querySelector('details'); if (d) d.open = true; setTimeout(function () { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -60); el.classList.add('flash'); }, 30); }
    }
  }

  function renderRevise(id) {
    var el = $('#revise');
    if (!el) return;
    var r = S.revised[id];
    if (!r) el.innerHTML = '<button type="button" class="primary" data-act="revise" data-id="' + id + '">Mark as revised</button>';
    else if (isDue(id)) el.innerHTML = '<p>Revised ' + fmtDate(r.d) + '. Time to look at it again.</p><button type="button" class="primary" data-act="revise" data-id="' + id + '">Revised again</button>';
    else el.innerHTML = '<p>Revised ' + fmtDate(r.d) + '. Next review ' + fmtDate(dueOf(r)) + '.</p><button type="button" class="quiet" data-act="unrevise" data-id="' + id + '">Undo</button>';
  }

  function renderScore(s) {
    var el = $('#score');
    if (!el || !s.isTest) return;
    var sc = testScore(s), left = sc.n - sc.g - sc.m;
    el.innerHTML = '<div><b>' + sc.g + '</b><span>Got it</span></div><div><b>' + sc.m + '</b><span>Missed</span></div><div><b>' + left + '</b><span>Left</span></div>';
  }

  /* search */
  var lastQuery = '';
  function showSearch() {
    cur.label = 'Search';
    setBar({ title: 'Search', back: false, tab: 'search' });
    view.innerHTML = '<input id="q" class="sbox" type="search" placeholder="Search notes and code" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search" value="' + esc(lastQuery) + '"><div id="results"></div>';
    runSearch(lastQuery);
  }
  function runSearch(q) {
    lastQuery = q;
    var box = $('#results');
    var tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) { box.innerHTML = JN.topics.length ? '<p class="hint">Type a word, a method name or a phrase.</p>' : '<p class="hint">Nothing to search yet.</p>'; return; }
    var res = [];
    searchIndex.forEach(function (e) {
      var score = 0;
      for (var i = 0; i < tokens.length; i++) {
        var tk = tokens[i], a = e.tl.indexOf(tk) >= 0, b = e.pl.indexOf(tk) >= 0, c = e.cl.indexOf(tk) >= 0;
        if (!a && !b && !c) return;
        score += (a ? 10 : 0) + (b ? 3 : 0) + (c ? 1 : 0);
      }
      res.push({ e: e, score: score });
    });
    res.sort(function (x, y) { return y.score - x.score; });
    if (!res.length) { box.innerHTML = '<p class="hint">Nothing matches “' + esc(q) + '”.</p>'; return; }
    box.innerHTML = '<ul class="results">' + res.slice(0, 40).map(function (r) {
      var e = r.e, src = e.pl.indexOf(tokens[0]) >= 0 ? e.prose : e.cl.indexOf(tokens[0]) >= 0 ? e.code : '';
      var snip = '';
      if (src) {
        var at = src.toLowerCase().indexOf(tokens[0]), from = Math.max(0, at - 50);
        snip = (from ? '…' : '') + src.slice(from, at + 90).replace(/\s+/g, ' ');
        snip = esc(snip);
        tokens.forEach(function (tk) { snip = snip.replace(new RegExp('(' + tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
      }
      return '<li><a href="#/s/' + e.id + '"><span class="name">' + esc(e.title) + '</span><span class="meta">' + esc(e.topic) + '</span>' + (snip ? '<span class="ctx">' + snip + '</span>' : '') + '</a></li>';
    }).join('') + '</ul>';
  }

  /* review */
  function showReview() {
    cur.label = 'Review';
    setBar({ title: 'Review', back: false, tab: 'review' });
    var h = '<h1 class="big">Review</h1>';
    var due = Object.keys(S.revised).filter(isDue).sort(function (a, b) { return dueOf(S.revised[a]) - dueOf(S.revised[b]); });
    h += '<h2 class="sec">Due for revision</h2>';
    h += due.length ? '<ul class="plain">' + due.map(function (id) {
      var x = JN.byId[id]; if (!x) return '';
      return '<li><a href="#/s/' + id + '"><span class="name">' + esc(x.sub.title) + '</span><span class="meta">' + esc(x.topic.title) + ' · revised ' + ago(S.revised[id].d) + '</span></a></li>';
    }).join('') + '</ul>' : '<p class="hint">Nothing is due. After you mark a subtopic as revised it comes back after 1, 3, 7, 14 and 30 days.</p>';

    var weak = Object.keys(S.q).filter(function (k) { return S.q[k] === 'm'; });
    h += '<h2 class="sec">Weak spots</h2>';
    var rows = weak.map(function (k) {
      var p = k.split('#'), x = JN.byId[p[0]]; if (!x) return '';
      var qs = x.sub.items.filter(function (i) { return i.t === 'q'; }), q = qs[+p[1] - 1]; if (!q) return '';
      var txt = JN.plain(q.parts.Q.filter(function (l) { return l.indexOf('```') !== 0; }).join(' ')).slice(0, 110);
      return '<li><a href="#/s/' + p[0] + '/q' + p[1] + '"><span class="name">' + esc(txt) + '</span><span class="meta">' + esc(x.sub.title) + ' · question ' + p[1] + '</span></a></li>';
    }).join('');
    h += rows ? '<ul class="plain">' + rows + '</ul>' : '<p class="hint">Questions you mark as missed collect here.</p>';

    var bms = Object.keys(S.bm).filter(function (id) { return JN.byId[id]; });
    h += '<h2 class="sec">Saved</h2>';
    h += bms.length ? '<ul class="plain">' + bms.map(function (id) {
      var x = JN.byId[id];
      return '<li><a href="#/s/' + id + '"><span class="name">' + esc(x.sub.title) + '</span><span class="meta">' + esc(x.topic.title) + '</span></a></li>';
    }).join('') + '</ul>' : '<p class="hint">Use Save at the top of a page to keep it here.</p>';

    h += '<h2 class="sec">Settings</h2><div class="settings">' +
      '<div class="row"><span>Theme</span><span class="seg">' + ['auto', 'light', 'dark'].map(function (t) {
        return '<button type="button" data-act="theme" data-v="' + t + '"' + (S.theme === t ? ' class="on"' : '') + '>' + t.charAt(0).toUpperCase() + t.slice(1) + '</button>';
      }).join('') + '</span></div>' +
      '<div class="row"><span>Text size</span><span class="seg"><button type="button" data-act="fs" data-v="-1" aria-label="Smaller">A−</button><button type="button" data-act="fs" data-v="1" aria-label="Larger">A+</button></span></div>' +
      '<div class="row"><span>Progress</span><span class="seg"><button type="button" data-act="export">Export</button><button type="button" data-act="import">Import</button></span></div>' +
      '<div class="row"><span>Clear progress</span><span class="seg"><button type="button" class="warn" data-act="wipe">Clear</button></span></div>' +
      '<input id="file" type="file" accept="application/json" hidden></div>' +
      '<p class="hint">Progress is stored on this device only. Export it to keep a copy.</p>';
    view.innerHTML = h;
  }

  /* ---------- peek ---------- */
  var peekTimer = null, peekId = null;
  function openPeek(id) {
    var x = JN.byId[id];
    if (!x) return;
    peekId = id;
    var para = JN.firstPara(x.sub);
    if (para.length > 260) para = para.slice(0, 257).replace(/\s+\S*$/, '') + '…';
    var p = $('#peek');
    p.innerHTML = '<div class="pk"><p class="meta">' + esc(x.topic.title) + '</p><p class="name">' + esc(x.sub.title) + '</p>' + (para ? '<p class="para">' + esc(para) + '</p>' : '') +
      '<div class="acts"><button type="button" class="primary" data-act="peekopen">Open</button><button type="button" class="quiet" data-act="peekclose">Close</button></div></div>';
    p.hidden = false;
  }
  function closePeek() { $('#peek').hidden = true; peekId = null; }
  function followRef(id) {
    ret = { hash: location.hash || '#/', y: window.scrollY, label: cur.label };
    scrollMem[ret.hash] = window.scrollY;
    go('#/s/' + id);
  }

  document.addEventListener('pointerdown', function (e) {
    var a = e.target.closest && e.target.closest('a.xref');
    if (!a) return;
    var sx = e.clientX, sy = e.clientY;
    clearTimeout(peekTimer);
    peekTimer = setTimeout(function () { lp = true; openPeek(a.dataset.ref); }, 450);
    var cancel = function (ev) {
      if (ev && ev.type === 'pointermove' && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 10) return;
      clearTimeout(peekTimer);
      document.removeEventListener('pointermove', cancel);
      document.removeEventListener('pointerup', cancel);
      document.removeEventListener('pointercancel', cancel);
    };
    document.addEventListener('pointermove', cancel);
    document.addEventListener('pointerup', cancel);
    document.addEventListener('pointercancel', cancel);
  });
  document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('a.xref')) e.preventDefault(); });

  /* ---------- clicks ---------- */
  document.addEventListener('click', function (e) {
    if (lp) { lp = false; e.preventDefault(); e.stopPropagation(); return; }
    var x = e.target.closest('a.xref[data-ref]');
    if (x) { e.preventDefault(); followRef(x.dataset.ref); return; }
    var a = e.target.closest('[data-act]');
    if (!a) return;
    var act = a.dataset.act, id = a.dataset.id;
    switch (act) {
      case 'copy': copyText(a.closest('.code').querySelector('code').textContent, a); break;
      case 'dprev': case 'dnext': case 'dreset': {
        var box = a.closest('.dry'), d = dryReg[+box.dataset.dry];
        d.i = act === 'dreset' ? 0 : Math.max(0, Math.min(d.item.steps.length - 1, d.i + (act === 'dnext' ? 1 : -1)));
        box.querySelector('.dbody').innerHTML = JN.dryBody(d);
        break;
      }
      case 'rate': {
        var q = a.closest('.q'), key = q.dataset.q, v = a.dataset.v;
        if (S.q[key] === v) delete S.q[key]; else S.q[key] = v;
        save();
        var st = S.q[key] || '';
        q.classList.remove('is-g', 'is-m');
        if (st) q.classList.add('is-' + st);
        q.querySelector('.qstate').textContent = st === 'g' ? 'Got it' : st === 'm' ? 'Missed' : '';
        q.querySelectorAll('.rate button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === st); });
        var hit = JN.byId[key.split('#')[0]];
        if (hit && hit.sub.isTest) renderScore(hit.sub);
        break;
      }
      case 'revise': {
        var old = S.revised[id];
        S.revised[id] = { d: Date.now(), n: old ? old.n + 1 : 1 };
        save(); renderRevise(id); break;
      }
      case 'unrevise': delete S.revised[id]; save(); renderRevise(id); break;
      case 'resettest': {
        var tt = JN.byId[id];
        if (!tt || !confirm('Clear your marks for this test?')) break;
        Object.keys(S.q).forEach(function (k) { if (k.indexOf(id + '#') === 0) delete S.q[k]; });
        save(); showSub(tt); break;
      }
      case 'peekopen': { var pid = peekId; closePeek(); if (pid) followRef(pid); break; }
      case 'peekclose': closePeek(); break;
      case 'retgo': {
        var r = ret; ret = null; updateRet();
        if (r) go(r.hash, { y: r.y });
        break;
      }
      case 'retx': ret = null; updateRet(); break;
      case 'theme': S.theme = a.dataset.v; save(); applyPrefs(); showReview(); break;
      case 'fs': S.fs = Math.max(14, Math.min(22, S.fs + (+a.dataset.v))); save(); applyPrefs(); break;
      case 'export': {
        var blob = new Blob([JSON.stringify(S)], { type: 'application/json' }), u = URL.createObjectURL(blob), l = document.createElement('a');
        l.href = u; l.download = 'java-notes-progress.json'; document.body.appendChild(l); l.click(); l.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
        break;
      }
      case 'import': $('#file').click(); break;
      case 'wipe':
        if (confirm('Clear all revised marks, answers, saved pages and your place?')) { S.revised = {}; S.q = {}; S.bm = {}; S.last = null; save(); showReview(); }
        break;
    }
  });

  $('#bm').addEventListener('click', function () {
    var id = this.dataset.id;
    if (S.bm[id]) delete S.bm[id]; else S.bm[id] = Date.now();
    save();
    this.textContent = S.bm[id] ? 'Saved' : 'Save';
    this.classList.toggle('on', !!S.bm[id]);
  });
  $('#back').addEventListener('click', function () {
    var h = location.hash, m;
    if (navCount > 1) { history.back(); return; }
    if ((m = h.match(/^#\/s\/([\w-]+)/)) && JN.byId[m[1]]) go('#/t/' + JN.byId[m[1]].topic.id);
    else go('#/');
  });

  document.addEventListener('input', function (e) { if (e.target.id === 'q') runSearch(e.target.value); });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'file' || !e.target.files[0]) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var o = JSON.parse(rd.result);
        ['revised', 'q', 'bm'].forEach(function (k) { if (o[k] && typeof o[k] === 'object') for (var x in o[k]) S[k][x] = o[k][x]; });
        save(); showReview(); alert('Progress imported.');
      } catch (err) { alert('That file is not a progress export.'); }
    };
    rd.readAsText(e.target.files[0]);
  });
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d.classList && d.classList.contains('dry') && d.open) {
      var b = d.querySelector('.dbody');
      if (!b.firstChild) b.innerHTML = JN.dryBody(dryReg[+d.dataset.dry]);
    }
  }, true);
  $('#peek').addEventListener('click', function (e) { if (e.target === this) closePeek(); });

  function copyText(text, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o === 'Copied' ? 'Copy' : o; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      ta.remove();
    }
  }

  /* ---------- start ---------- */
  boot().then(route, function () {
    setBar({ title: 'Java Notes', back: false, tab: 'home' });
    view.innerHTML = '<h1 class="big">Java Notes</h1><div class="empty"><p><strong>Could not load the notes.</strong></p><p>Open the app once with internet on, then it works offline.</p></div>';
  });

  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
})();
