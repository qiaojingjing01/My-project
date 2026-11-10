/* 懂行：每天背一组行话
 * 纯静态页面：词库在 data/words.json，学习进度存在浏览器本地（localStorage）。
 * 复习间隔用简化的间隔重复（Leitner 盒子）：认识就拉长间隔，不认识就当天再来。
 */
(function () {
  'use strict';

  var KEY = 'dongxing:v1';
  var INTERVAL = [0, 1, 2, 4, 7, 15, 30]; // 每个盒子对应的复习间隔（天）
  var MASTER_BOX = 4;                    // 进入第 4 个盒子算“已掌握”
  var BOOK_NAME = { all: '全部', ai: 'AI', data: '数据', work: '职场黑话' };

  var words = [], byId = {}, meta = {};
  var state = load();
  var tab = 'today';
  var session = null;   // 正在背的一组
  var meTab = 'new';
  var dictBook = 'all', dictQ = '';
  var resetArmed = false;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- 存储 ---------- */
  function load() {
    var d = { book: 'all', goal: 10, cards: {}, days: {}, starred: [] };
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var p = JSON.parse(raw); for (var k in d) if (p[k] != null) d[k] = p[k]; }
    } catch (e) { /* 隐私模式等情况下读不到，用默认值 */ }
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { } }

  /* ---------- 日期 ---------- */
  function today() { return ymd(new Date()); }
  function ymd(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function addDays(s, n) { var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return ymd(d); }

  /* ---------- 学习状态 ---------- */
  function rec(id) { return state.cards[id]; }
  function isMastered(id) { var r = rec(id); return !!r && r.box >= MASTER_BOX; }
  function isLearning(id) { var r = rec(id); return !!r && r.box < MASTER_BOX; }
  function isWeak(id) { var r = rec(id); return !!r && r.box < MASTER_BOX && (r.last === 'no' || r.last === 'vague' || (r.wrong || 0) > 0); }
  function inBook(w, b) { return b === 'all' || w.book === b; }

  function grade(id, g) {
    var t = today();
    var r = rec(id) || { box: 0, seen: 0, wrong: 0 };
    var first = !r.seen;
    if (g === 'know') r.box = first ? 3 : Math.min(6, r.box + 1);
    else if (g === 'vague') r.box = 1;
    else { r.box = 0; r.wrong = (r.wrong || 0) + 1; }
    r.due = addDays(t, INTERVAL[r.box]);
    r.seen = (r.seen || 0) + 1;
    r.last = g;
    r.at = t;
    state.cards[id] = r;
    var day = state.days[t] || { done: 0, ids: [] };
    if (day.ids.indexOf(id) < 0) { day.ids.push(id); day.done = day.ids.length; }
    state.days[t] = day;
    save();
  }

  function streak() {
    var n = 0, d = today();
    if (!(state.days[d] && state.days[d].done)) d = addDays(d, -1);
    while (state.days[d] && state.days[d].done) { n++; d = addDays(d, -1); }
    return n;
  }

  function plan(book) {
    var t = today();
    var pool = words.filter(function (w) { return inBook(w, book); });
    var due = pool.filter(function (w) { var r = rec(w.id); return r && r.due <= t; })
      .sort(function (a, b) { return rec(a.id).due < rec(b.id).due ? -1 : 1; });
    var fresh = pool.filter(function (w) { return !rec(w.id); });
    return { due: due, fresh: fresh, pool: pool };
  }

  /* ---------- 渲染 ---------- */
  function render() {
    document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    var s = streak();
    $('#streak').innerHTML = s ? '连续打卡 <b>' + s + '</b> 天' : '今天还没打卡';
    var v = $('#view');
    if (tab === 'today') v.innerHTML = session ? (session.idx < session.queue.length ? studyHTML() : doneHTML()) : todayHTML();
    else if (tab === 'dict') v.innerHTML = dictHTML();
    else v.innerHTML = meHTML();
    if (tab === 'dict') {
      var inp = $('#dictQ');
      if (inp && document.activeElement !== inp && dictQ) { inp.focus(); inp.setSelectionRange(dictQ.length, dictQ.length); }
    }
  }

  function bookChips(cur, attr) {
    return ['all', 'ai', 'data', 'work'].map(function (k) {
      var n = words.filter(function (w) { return inBook(w, k); }).length;
      return '<button class="chip' + (cur === k ? ' on' : '') + '" ' + attr + '="' + k + '">' + BOOK_NAME[k] + '<small>' + n + '</small></button>';
    }).join('');
  }

  function todayHTML() {
    var p = plan(state.book);
    var n = Math.min(state.goal, p.due.length + p.fresh.length);
    var mastered = p.pool.filter(function (w) { return isMastered(w.id); }).length;
    var pct = p.pool.length ? Math.round(mastered / p.pool.length * 100) : 0;
    var doneToday = (state.days[today()] || {}).done || 0;
    return '' +
      '<h2>' + (doneToday ? '今天已背 ' + doneToday + ' 个词' : '今天背 ' + state.goal + ' 个词') + '</h2>' +
      '<p class="sub">刚入行就像背单词：先把这个行业里常说的词，一个个弄懂。</p>' +
      '<div class="panel">' +
        '<p class="label">选一本词书</p><div class="chips">' + bookChips(state.book, 'data-book') + '</div>' +
        '<div class="gap"></div><p class="label">每天背几个</p>' +
        '<div class="seg">' + [10, 20, 30].map(function (g) {
          return '<button data-goal="' + g + '" class="' + (state.goal === g ? 'on' : '') + '">' + g + ' 个</button>';
        }).join('') + '</div>' +
      '</div>' +
      '<div class="stats">' +
        '<div class="stat"><b>' + p.due.length + '</b><span>今天要复习</span></div>' +
        '<div class="stat"><b>' + p.fresh.length + '</b><span>还没背过</span></div>' +
        '<div class="stat"><b>' + mastered + '<small style="font-size:13px;color:var(--muted)"> / ' + p.pool.length + '</small></b><span>已掌握</span></div>' +
      '</div>' +
      '<div class="progress" aria-label="已掌握进度"><i style="width:' + pct + '%"></i></div>' +
      '<button class="big" data-act="start"' + (n ? '' : ' disabled') + '>' +
        (n ? (doneToday ? '再来一组（' + n + ' 个）' : '开始背今天的 ' + n + ' 个词') : '这本词书今天背完了') + '</button>' +
      '<p class="note">先复习到期的词，再学新词。认识的词间隔会越拉越长，不认识的当天再出现一次。词库更新于 ' + esc(meta.updated || '') + '，共 ' + words.length + ' 个词。</p>';
  }

  function detailHTML(w) {
    return '' +
      '<div class="tags"><span class="badge ' + w.book + '">' + BOOK_NAME[w.book] + '</span><span class="badge cat">' + esc(w.cat) + '</span></div>' +
      '<div class="word">' + esc(w.word) + '</div><div class="alt">' + esc(w.alt) + '</div>' +
      '<div class="plain">' + esc(w.definition) + '</div>' +
      '<div class="row"><div class="k">打个比方</div><div class="v">' + esc(w.analogy) + '</div></div>' +
      '<div class="row"><div class="k">实际这样用</div><div class="v">' + esc(w.example) + '</div></div>' +
      '<div class="row warn"><div class="k">容易弄错</div><div class="v">' + esc(w.caution) + '</div></div>';
  }

  function studyHTML() {
    var s = session, id = s.queue[s.idx], w = byId[id];
    var total = s.total, done = s.done;
    var g = s.graded;
    var bottom;
    if (!s.flipped && !g) {
      bottom = '<div class="grade">' +
        '<button class="g-know" data-grade="know">认识</button>' +
        '<button class="g-vague" data-grade="vague">模糊</button>' +
        '<button class="g-no" data-grade="no">不认识</button></div>' +
        '<p class="keys">点卡片翻面看意思 · 键盘 1 认识 · 2 模糊 · 3 不认识 · 空格翻面</p>';
    } else if (!g) {
      bottom = '<div class="grade">' +
        '<button class="g-know" data-grade="know">记得</button>' +
        '<button class="g-vague" data-grade="vague">模糊</button>' +
        '<button class="g-no" data-grade="no">没记住</button></div>' +
        '<p class="keys">看完意思，诚实地选一个</p>';
    } else {
      var txt = { know: '认识，间隔会拉长', vague: '模糊，明天再复习', no: '不认识，这一组里还会再出现' }[g];
      bottom = '<div class="after"><button class="next" data-act="next">下一个</button>' +
        '<span class="verdict">' + txt + '</span>' +
        (g !== 'no' ? '<button class="fix" data-act="fix">其实没记住</button>' : '') + '</div>';
    }
    return '' +
      '<div class="study-top"><button class="quit" data-act="quit" aria-label="结束这一组">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>结束</button>' +
        '<div class="progress"><i style="width:' + Math.round(done / total * 100) + '%"></i></div>' +
        '<span class="count">' + done + ' / ' + total + '</span></div>' +
      '<div class="flip' + (s.flipped ? ' flipped' : '') + '">' +
        '<div class="flip-in">' +
          '<div class="face front" data-act="flip" role="button" tabindex="0" aria-label="翻面查看意思">' +
            '<span class="badge ' + w.book + '">' + BOOK_NAME[w.book] + '</span>' +
            '<div class="word">' + esc(w.word) + '</div>' +
            '<div class="ask">你知道它是什么意思吗？</div>' +
            '<div class="tap">点一下翻面</div></div>' +
          '<div class="face back" aria-hidden="' + (s.flipped ? 'false' : 'true') + '"><div class="back-scroll">' + detailHTML(w) + '</div></div>' +
        '</div></div>' + bottom;
  }

  function doneHTML() {
    var s = session, ids = s.order;
    var cnt = { know: 0, vague: 0, no: 0 };
    ids.forEach(function (id) { cnt[s.first[id]]++; });
    var label = { know: '认识', vague: '模糊', no: '不认识' };
    return '' +
      '<div class="done-hero"><div class="num">' + ids.length + '</div><p class="sub" style="margin:6px 0 0">这一组背完了，连续打卡 ' + streak() + ' 天</p></div>' +
      '<div class="stats"><div class="stat"><b style="color:var(--green)">' + cnt.know + '</b><span>认识</span></div>' +
      '<div class="stat"><b style="color:var(--amber)">' + cnt.vague + '</b><span>模糊</span></div>' +
      '<div class="stat"><b style="color:var(--red)">' + cnt.no + '</b><span>不认识</span></div></div>' +
      '<div class="list">' + ids.map(function (id) {
        var w = byId[id], g = s.first[id];
        return '<button class="item" data-open="' + id + '"><span class="w">' + esc(w.word) + '</span><span class="d">' + esc(w.definition) + '</span><span class="st ' + g + '">' + label[g] + '</span></button>';
      }).join('') + '</div>' +
      '<button class="big" data-act="again">再来一组</button>' +
      '<button class="ghost" data-act="home">回到今日</button>';
  }

  function dictHTML() {
    var q = dictQ.trim().toLowerCase();
    var list = words.filter(function (w) {
      return inBook(w, dictBook) && (!q || (w.word + ' ' + w.alt + ' ' + w.en + ' ' + w.cn + ' ' + w.definition).toLowerCase().indexOf(q) >= 0);
    });
    return '' +
      '<h2>词典</h2><p class="sub">查一个会上听到、没听懂的词。</p>' +
      '<label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>' +
        '<input id="dictQ" type="search" placeholder="比如 RAG、口径、对齐" value="' + esc(dictQ) + '" aria-label="搜索词条" autocomplete="off"></label>' +
      '<div class="chips" style="margin-bottom:12px">' + bookChips(dictBook, 'data-dbook') + '</div>' +
      (list.length ? '<div class="list">' + list.map(itemHTML).join('') + '</div>'
        : '<div class="empty">词库里还没有「' + esc(dictQ) + '」。<br>以后这里可以一键申请收录，由 Agent 查资料补全。</div>');
  }

  function statusOf(id) {
    if (isMastered(id)) return ['master', '已掌握'];
    var r = rec(id);
    if (!r) return null;
    if (r.last === 'no') return ['no', '生词'];
    if (r.last === 'vague') return ['vague', '模糊'];
    return ['know', '学习中'];
  }
  function itemHTML(w) {
    var st = statusOf(w.id);
    return '<button class="item" data-open="' + w.id + '"><span class="w">' + esc(w.word) + '</span><span class="d">' + esc(w.alt + ' · ' + w.definition) + '</span>' +
      (st ? '<span class="st ' + st[0] + '">' + st[1] + '</span>' : '') + '</button>';
  }

  function meHTML() {
    var mastered = words.filter(function (w) { return isMastered(w.id); });
    var learning = words.filter(function (w) { return isLearning(w.id); });
    var weak = words.filter(function (w) { return isWeak(w.id); })
      .sort(function (a, b) { return (rec(b.id).wrong || 0) - (rec(a.id).wrong || 0); });
    var starred = state.starred.map(function (id) { return byId[id]; }).filter(Boolean);
    var days = Object.keys(state.days).filter(function (d) { return state.days[d].done; }).length;
    var lists = { new: weak, star: starred, master: mastered };
    var empty = { new: '还没有生词。背的时候选“不认识”或“模糊”的词会出现在这里。', star: '还没有收藏。在词条详情里点“收藏”。', master: '还没有掌握的词。同一个词连续几次都选“认识”就会掌握。' };
    var cur = lists[meTab];
    return '' +
      '<h2>我的</h2><p class="sub">进度只存在这台设备的浏览器里。</p>' +
      '<div class="stats" style="grid-template-columns:repeat(4,1fr)">' +
        '<div class="stat"><b>' + mastered.length + '</b><span>已掌握</span></div>' +
        '<div class="stat"><b>' + learning.length + '</b><span>学习中</span></div>' +
        '<div class="stat"><b>' + weak.length + '</b><span>生词</span></div>' +
        '<div class="stat"><b>' + days + '</b><span>打卡天数</span></div></div>' +
      '<div class="seg" style="margin-bottom:12px">' +
        '<button data-me="new" class="' + (meTab === 'new' ? 'on' : '') + '">生词本 ' + weak.length + '</button>' +
        '<button data-me="star" class="' + (meTab === 'star' ? 'on' : '') + '">收藏 ' + starred.length + '</button>' +
        '<button data-me="master" class="' + (meTab === 'master' ? 'on' : '') + '">已掌握 ' + mastered.length + '</button></div>' +
      (cur.length ? '<div class="list">' + cur.map(itemHTML).join('') + '</div>' : '<div class="empty">' + empty[meTab] + '</div>') +
      (meTab === 'new' && weak.length ? '<button class="big" data-act="drill">只背生词（' + Math.min(weak.length, state.goal) + ' 个）</button>' : '') +
      '<button class="ghost" data-act="reset">' + (resetArmed ? '再点一次，确认清空全部进度' : '清空学习进度') + '</button>';
  }

  /* ---------- 详情弹层 ---------- */
  function openSheet(id) {
    var w = byId[id]; if (!w) return;
    var on = state.starred.indexOf(id) >= 0;
    $('#sheetContent').innerHTML = detailHTML(w) +
      '<button class="ghost star" data-star="' + id + '">' + (on ? '已收藏，点击取消' : '收藏这个词') + '</button>';
    $('#sheet').hidden = false;
    $('.sheet-x').focus();
  }
  function closeSheet() { $('#sheet').hidden = true; }

  /* ---------- 背词流程 ---------- */
  function startSession(ids) {
    if (!ids.length) return;
    session = { queue: ids.slice(), order: ids.slice(), idx: 0, total: ids.length, done: 0, first: {}, again: {}, flipped: false, graded: null };
    tab = 'today';
    render();
  }
  function startToday() {
    var p = plan(state.book);
    var ids = p.due.concat(p.fresh).slice(0, state.goal).map(function (w) { return w.id; });
    startSession(ids);
  }
  function doGrade(g) {
    var s = session, id = s.queue[s.idx];
    if (s.graded) return;
    s.graded = g;
    s.flipped = true;
    grade(id, g);
    if (!(id in s.first)) s.first[id] = g;
    render();
  }
  function fixGrade() {
    var s = session, id = s.queue[s.idx];
    s.graded = 'no';
    s.first[id] = 'no';
    grade(id, 'no');
    render();
  }
  function next() {
    var s = session, id = s.queue[s.idx];
    if (s.graded === 'no' && !s.again[id]) {
      s.again[id] = true;                         // 不认识的词，隔 3 张再出现一次
      s.queue.splice(Math.min(s.idx + 4, s.queue.length), 0, id);
    } else if (s.queue.indexOf(id, s.idx + 1) < 0) {
      s.done++;
    }
    s.idx++;
    s.flipped = false;
    s.graded = null;
    render();
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button,[data-act]');
    if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; resetArmed = false; if (tab !== 'today' && session && session.idx >= session.queue.length) session = null; render(); window.scrollTo(0, 0); return; }
    if (t.dataset.book) { state.book = t.dataset.book; save(); render(); return; }
    if (t.dataset.goal) { state.goal = +t.dataset.goal; save(); render(); return; }
    if (t.dataset.dbook) { dictBook = t.dataset.dbook; render(); return; }
    if (t.dataset.me) { meTab = t.dataset.me; resetArmed = false; render(); return; }
    if (t.dataset.grade) { doGrade(t.dataset.grade); return; }
    if (t.dataset.open) { openSheet(+t.dataset.open); return; }
    if (t.dataset.star) {
      var id = +t.dataset.star, i = state.starred.indexOf(id);
      if (i >= 0) state.starred.splice(i, 1); else state.starred.unshift(id);
      save(); openSheet(id); render(); return;
    }
    if (t.hasAttribute('data-close')) { closeSheet(); return; }
    switch (t.dataset.act) {
      case 'start': startToday(); break;
      case 'flip': if (session && !session.flipped) { session.flipped = true; render(); } break;
      case 'next': next(); break;
      case 'fix': fixGrade(); break;
      case 'quit': session = null; render(); break;
      case 'again': session = null; startToday(); if (!session) render(); break;
      case 'home': session = null; render(); break;
      case 'drill':
        startSession(words.filter(function (w) { return isWeak(w.id); }).slice(0, state.goal).map(function (w) { return w.id; }));
        break;
      case 'reset':
        if (!resetArmed) { resetArmed = true; render(); break; }
        state.cards = {}; state.days = {}; state.starred = []; resetArmed = false; session = null; save(); render(); break;
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'dictQ') { dictQ = e.target.value; render(); }
  });

  document.addEventListener('keydown', function (e) {
    if (!$('#sheet').hidden) { if (e.key === 'Escape') closeSheet(); return; }
    if (tab !== 'today' || !session || session.idx >= session.queue.length) return;
    if (e.target.tagName === 'INPUT') return;
    var s = session;
    if (e.key === ' ' || (e.key === 'Enter' && e.target.classList && e.target.classList.contains('front'))) {
      e.preventDefault();
      if (s.graded) next(); else if (!s.flipped) { s.flipped = true; render(); }
      return;
    }
    if (!s.graded && (e.key === '1' || e.key === '2' || e.key === '3')) { doGrade({ '1': 'know', '2': 'vague', '3': 'no' }[e.key]); return; }
    if (s.graded && (e.key === 'Enter' || e.key === 'ArrowRight')) { e.preventDefault(); next(); }
  });

  /* ---------- 启动 ---------- */
  fetch('data/words.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      meta = d; words = d.words || [];
      words.forEach(function (w) { byId[w.id] = w; });
      render();
    })
    .catch(function () {
      $('#view').innerHTML = '<div class="empty">词库没有加载出来。请通过网页地址打开（直接双击本地文件时浏览器会拦截读取词库）。</div>';
    });
})();
