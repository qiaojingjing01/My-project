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
  var sgRound = 0;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- 存储 ---------- */
  function load() {
    var d = { book: 'all', goal: 10, cards: {}, days: {}, starred: [], requests: [] };
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
    var pair = '<div class="cbtns"><button class="c-no" data-grade="no">不认识</button><button class="c-know" data-grade="know">认识</button></div>';
    var backFoot = g ? '<div class="cbtns"><button class="c-next" data-act="next">下一个</button></div>' : pair;
    return '' +
      '<div class="study-top"><button class="quit" data-act="quit" aria-label="结束这一组">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>结束</button>' +
        '<div class="progress"><i style="width:' + Math.round(done / total * 100) + '%"></i></div>' +
        '<span class="count">' + done + ' / ' + total + '</span></div>' +
      '<div class="flip' + (s.flipped ? ' flipped' : '') + '" id="card">' +
        '<div class="stamp yes" aria-hidden="true">认识</div><div class="stamp no" aria-hidden="true">' + (g ? '下一个' : '不认识') + '</div>' +
        '<div class="flip-in">' +
          '<div class="face front">' +
            '<div class="front-body" data-act="flip" role="button" tabindex="0" aria-label="翻面查看解释">' +
              '<span class="badge ' + w.book + '">' + BOOK_NAME[w.book] + '</span>' +
              '<div class="word">' + esc(w.word) + '</div>' +
              '<div class="ask">拿不准？点卡片看解释</div></div>' +
            (s.flipped ? '' : pair) + '</div>' +
          '<div class="face back" aria-hidden="' + (s.flipped ? 'false' : 'true') + '"><div class="back-scroll">' + detailHTML(w) + '</div>' +
            (s.flipped ? backFoot : '') + '</div>' +
        '</div></div>' +
      '<p class="keys">' + (g === 'no' ? '这个词这一组里还会再出现一次' : (s.flipped ? '看完解释，再选认识或不认识' : '也可以右滑认识、左滑不认识 · 键盘 → 认识 · ← 不认识 · 空格翻面')) + '</p>' +
      (undoSnap ? '<div class="toast" role="status">「' + esc(byId[undoSnap.id].word) + '」记为认识<button data-act="undo">撤回</button></div>' : '');
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

  /* ---------- 发现：大词库 ---------- */
  var SUGGEST = { ai: [0, 8, 1, 2, 3, 4, 11, 19, 5, 13, 15, 18], data: [26, 29, 35, 33, 57, 32, 40, 36, 41, 38, 34, 28], work: [46, 44, 53, 54, 50, 51, 55, 56, 47, 49, 45, 42] };
  var SHORT = { 5: '上下文窗口', 50: 'Deadline', 32: 'DAU', 40: 'A/B 实验', 25: '人在回路' };
  function pickSuggest() {
    // 12 个：三本词书各 4 个；收藏和在学最多的那本 6 个、其余各 3 个；不推已收藏、已掌握的词；“换一批”轮换
    var books = ['ai', 'data', 'work'];
    var score = {}; books.forEach(function (b) { score[b] = 0; });
    words.forEach(function (w) { if (state.starred.indexOf(w.id) >= 0 || isLearning(w.id)) score[w.book]++; });
    var top = books.slice().sort(function (a, b) { return score[b] - score[a]; })[0];
    var quota = {}; books.forEach(function (b) { quota[b] = score[top] > 0 ? (b === top ? 6 : 3) : 4; });
    var lists = {};
    books.forEach(function (b) {
      var pool = SUGGEST[b].filter(function (id) { return byId[id] && state.starred.indexOf(id) < 0 && !isMastered(id); });
      var off = pool.length ? (sgRound * quota[b]) % pool.length : 0;
      lists[b] = pool.slice(off).concat(pool.slice(0, off)).slice(0, quota[b]);
    });
    var out = [];
    for (var i = 0; i < 6; i++) books.forEach(function (b) { if (lists[b][i] != null && out.length < 12) out.push(lists[b][i]); });
    if (out.length < 12) words.forEach(function (w) { if (out.length < 12 && out.indexOf(w.id) < 0) out.push(w.id); });
    return out;
  }
  function freshWords() {
    var max = ''; words.forEach(function (w) { if ((w.updated || '') > max) max = w.updated; });
    return words.filter(function (w) { return w.updated === max && w.fresh; });
  }
  function suggestHTML() {
    return '<div class="sg-head"><span>猜你想搜</span><button type="button" class="sg-more" data-act="more">换一批</button></div>' +
      '<div class="sg-grid">' + pickSuggest().map(function (id) {
        var w = byId[id];
        return '<button type="button" data-q="' + esc(w.word) + '">' + esc(SHORT[id] || w.word) + '</button>';
      }).join('') + '</div>';
  }
  function dictHTML() {
    var fresh = freshWords();
    return '' +
      '<div class="dhero"><small class="kicker">新人入行词典</small>' +
        '<h2>入行第一步，<br>先听懂行话。</h2>' +
        '<p class="sub">AI、数据、职场黑话三本词书，每个词都有人话解释和真实用法。</p></div>' +
      '<div class="disc-search"><label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>' +
        '<input id="dictQ" type="search" placeholder="输入一个听不懂的词" value="' + esc(dictQ) + '" aria-label="搜索词条" autocomplete="off"></label>' +
        '<div class="suggest" id="suggest">' + suggestHTML() + '</div></div>' +
      (fresh.length ? '<p class="fresh" id="freshLine"><i></i>本周新收录 ' + fresh.map(function (w) {
        return '<button type="button" data-open="' + w.id + '">' + esc(w.word) + '</button>'; }).join('、') +
        '<span>· Agent 整理于 ' + esc(fresh[0].updated) + '</span></p>' : '') +
      '<div id="discRes">' + discResHTML() + '</div>';
  }
  function discResHTML() {
    var q = dictQ.trim().toLowerCase();
    var inQ = words.filter(function (w) {
      return !q || (w.word + ' ' + w.alt + ' ' + w.en + ' ' + w.cn + ' ' + w.definition).toLowerCase().indexOf(q) >= 0;
    });
    var list = inQ.filter(function (w) { return inBook(w, dictBook); });
    var chips = ['all', 'ai', 'data', 'work'].map(function (k) {
      var n = inQ.filter(function (w) { return inBook(w, k); }).length;
      return '<button class="chip' + (dictBook === k ? ' on' : '') + '" data-dbook="' + k + '">' + BOOK_NAME[k] + '<small>' + n + '</small></button>';
    }).join('');
    var head = '<div class="lhead"><b>' + (q ? '搜索结果' : '按词书浏览') + '</b><span>' + (q ? '找到 ' + list.length + ' 个词' : '像背单词一样，一本一本看过去') + '</span></div>';
    if (q && !inQ.length) {
      var asked = state.requests.some(function (r) { return r.q === dictQ.trim(); });
      return '<div class="empty"><b class="miss">词库里还没有「' + esc(dictQ.trim()) + '」</b>' +
        (asked ? '<span>已提交，Agent 查资料、补全解释后会收进词库，进度在「我的 · 申请」里。</span>'
               : '<span>提交后，Agent 会查它的用法、补全解释，审核通过后收进词库。</span><button class="big" data-act="request">申请收录「' + esc(dictQ.trim()) + '」</button>') + '</div>';
    }
    return head + '<div class="chips" style="margin-bottom:12px">' + chips + '</div>' +
      '<div class="wgrid">' + list.map(wcardHTML).join('') + '</div>';
  }
  function wcardHTML(w) {
    var on = state.starred.indexOf(w.id) >= 0;
    return '<article class="wcard"><div class="wtop"><span class="badge ' + w.book + '">' + BOOK_NAME[w.book] + '</span>' +
      '<button class="bm' + (on ? ' on' : '') + '" data-star-card="' + w.id + '" aria-label="' + (on ? '取消收藏 ' : '收藏 ') + esc(w.word) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg></button></div>' +
      '<button class="wopen" data-open="' + w.id + '"><span class="ww">' + esc(w.word) + '</span><span class="wa">' + esc(w.alt) + '</span>' +
      '<span class="wd">' + esc(w.definition) + '</span></button>' +
      '<div class="we">“' + esc(w.example) + '”</div></article>';
  }
  function updateDisc() {
    var r = $('#discRes'); if (r) r.innerHTML = discResHTML();
    var has = !!dictQ.trim();
    var f = $('#freshLine'); if (f) f.hidden = has;
    var s = $('#suggest'); if (s) s.classList.toggle('off', has);
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
    var lists = { new: weak, star: starred, master: mastered, req: [] };
    var empty = { req: '还没有申请。在「发现」里搜不到的词，可以一键申请收录。', new: '还没有生词。背的时候选“不认识”或“模糊”的词会出现在这里。', star: '还没有收藏。在词条详情里点“收藏”。', master: '还没有掌握的词。同一个词连续几次都选“认识”就会掌握。' };
    var cur = lists[meTab];
    return '' +
      '<h2>我的</h2><p class="sub">进度只存在这台设备的浏览器里。</p>' +
      '<div class="stats" style="grid-template-columns:repeat(4,1fr)">' +
        '<div class="stat"><b>' + mastered.length + '</b><span>已掌握</span></div>' +
        '<div class="stat"><b>' + learning.length + '</b><span>学习中</span></div>' +
        '<div class="stat"><b>' + weak.length + '</b><span>生词</span></div>' +
        '<div class="stat"><b>' + days + '</b><span>打卡天数</span></div></div>' +
      '<div class="seg seg4" style="margin-bottom:12px">' +
        '<button data-me="new" class="' + (meTab === 'new' ? 'on' : '') + '">生词本 ' + weak.length + '</button>' +
        '<button data-me="star" class="' + (meTab === 'star' ? 'on' : '') + '">收藏 ' + starred.length + '</button>' +
        '<button data-me="master" class="' + (meTab === 'master' ? 'on' : '') + '">已掌握 ' + mastered.length + '</button>' +
        '<button data-me="req" class="' + (meTab === 'req' ? 'on' : '') + '">申请 ' + state.requests.length + '</button></div>' +
      (meTab === 'req' ? (state.requests.length ? '<div class="list">' + state.requests.map(function (r) {
          return '<div class="item"><span class="w">' + esc(r.q) + '</span><span class="d">' + esc(r.at) + ' 提交 · Agent 查找用法中</span><span class="st vague">待收录</span></div>';
        }).join('') + '</div>' : '<div class="empty">' + empty.req + '</div>')
        : (cur.length ? '<div class="list">' + cur.map(itemHTML).join('') + '</div>' : '<div class="empty">' + empty[meTab] + '</div>')) +
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
  var undoSnap = null, undoTimer = null;
  function clone(o) { return o == null ? null : JSON.parse(JSON.stringify(o)); }
  function doGrade(g) {
    var s = session, id = s.queue[s.idx];
    if (s.graded) return;
    var peeked = s.flipped;
    // 认识：直接下一个，不展示解释。先翻面看了解释再选“认识”，按“模糊”记，明天再复习
    // 不认识：没翻面时翻过来看解释；已经看过解释就直接下一个（这一组里会再出现）
    var rec = g === 'know' ? (peeked ? 'vague' : 'know') : 'no';
    if (g === 'know' && !peeked) {
      undoSnap = { id: id, sess: clone(s), rec: clone(state.cards[id]), day: clone(state.days[today()]) };
      clearTimeout(undoTimer);
      undoTimer = setTimeout(function () { undoSnap = null; var t = $('.toast'); if (t) t.remove(); }, 4000);
    } else { undoSnap = null; clearTimeout(undoTimer); }
    grade(id, rec);
    if (!(id in s.first)) s.first[id] = rec;
    s.graded = rec;
    if (g === 'know' || peeked) { next(); return; }
    s.flipped = true;
    render();
  }
  function undo() {
    if (!undoSnap) return;
    var u = undoSnap, t = today();
    session = u.sess;
    if (u.rec) state.cards[u.id] = u.rec; else delete state.cards[u.id];
    if (u.day) state.days[t] = u.day; else delete state.days[t];
    save();
    undoSnap = null; clearTimeout(undoTimer);
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
    if (s.idx >= s.queue.length) { undoSnap = null; clearTimeout(undoTimer); }
    render();
  }

  /* ---------- 左右滑动 ---------- */
  var drag = null, swallowClick = false;
  function flyOut(dir, then) {
    var c = $('#card'); if (!c) { then(); return; }
    c.classList.remove('dragging');
    c.style.transition = 'transform .22s ease-in, opacity .22s ease-in';
    c.style.transform = 'translateX(' + (dir * 130) + '%) rotate(' + (dir * 14) + 'deg)';
    c.style.opacity = '0';
    setTimeout(then, 200);
  }
  function swipe(dir) {
    if (!session || session.idx >= session.queue.length) return;
    var s = session;
    if (s.graded) { flyOut(dir, next); return; }
    if (dir > 0) flyOut(1, function () { doGrade('know'); });
    else doGrade('no');
  }
  document.addEventListener('pointerdown', function (e) {
    var c = e.target.closest('#card');
    if (!c || e.button > 0) return;
    drag = { x: e.clientX, y: e.clientY, dx: 0, on: false, el: c, id: e.pointerId };
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.on) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      drag.on = true; drag.el.classList.add('dragging');
      try { drag.el.setPointerCapture(e.pointerId); } catch (err) { }
    }
    drag.dx = dx;
    drag.el.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 22) + 'deg)';
    var k = Math.min(1, Math.abs(dx) / 90);
    drag.el.querySelector('.stamp.yes').style.opacity = dx > 0 ? k : 0;
    drag.el.querySelector('.stamp.no').style.opacity = dx < 0 ? k : 0;
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag; drag = null;
    if (!d.on) return;
    swallowClick = true; setTimeout(function () { swallowClick = false; }, 0);
    if (Math.abs(d.dx) > 90) { swipe(d.dx > 0 ? 1 : -1); return; }
    d.el.classList.remove('dragging');
    d.el.style.transform = '';
    d.el.querySelectorAll('.stamp').forEach(function (x) { x.style.opacity = 0; });
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  /* ---------- 事件 ---------- */
  document.addEventListener('click', function (e) {
    if (swallowClick && e.target.closest('#card')) { swallowClick = false; return; }
    var t = e.target.closest('button,[data-act]');
    if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; resetArmed = false; if (tab !== 'today' && session && session.idx >= session.queue.length) session = null; render(); window.scrollTo(0, 0); return; }
    if (t.dataset.book) { state.book = t.dataset.book; save(); render(); return; }
    if (t.dataset.goal) { state.goal = +t.dataset.goal; save(); render(); return; }
    if (t.dataset.dbook) { dictBook = t.dataset.dbook; updateDisc(); return; }
    if (t.dataset.me) { meTab = t.dataset.me; resetArmed = false; render(); return; }
    if (t.dataset.grade) { doGrade(t.dataset.grade); return; }
    if (t.dataset.q != null) { dictQ = t.dataset.q; var inp = $('#dictQ'); if (inp) { inp.value = dictQ; inp.blur(); } updateDisc(); return; }
    if (t.dataset.starCard) {
      var sid = +t.dataset.starCard, si = state.starred.indexOf(sid);
      if (si >= 0) state.starred.splice(si, 1); else state.starred.unshift(sid);
      save(); updateDisc(); return;
    }
    if (t.dataset.open) { openSheet(+t.dataset.open); return; }
    if (t.dataset.star) {
      var id = +t.dataset.star, i = state.starred.indexOf(id);
      if (i >= 0) state.starred.splice(i, 1); else state.starred.unshift(id);
      save(); openSheet(id); if (tab === 'dict') updateDisc(); else render(); return;
    }
    if (t.hasAttribute('data-close')) { closeSheet(); return; }
    switch (t.dataset.act) {
      case 'start': startToday(); break;
      case 'more': sgRound++; var sg = $('#suggest'); if (sg) sg.innerHTML = suggestHTML(); break;
      case 'request':
        var rq = dictQ.trim();
        if (rq && !state.requests.some(function (r) { return r.q === rq; })) { state.requests.unshift({ q: rq, at: today() }); save(); }
        updateDisc(); break;
      case 'flip': if (session && !session.flipped) { session.flipped = true; render(); } break;
      case 'next': next(); break;
      case 'undo': undo(); break;
      case 'quit': session = null; undoSnap = null; render(); break;
      case 'again': session = null; startToday(); if (!session) render(); break;
      case 'home': session = null; render(); break;
      case 'drill':
        startSession(words.filter(function (w) { return isWeak(w.id); }).slice(0, state.goal).map(function (w) { return w.id; }));
        break;
      case 'reset':
        if (!resetArmed) { resetArmed = true; render(); break; }
        state.cards = {}; state.days = {}; state.starred = []; state.requests = []; resetArmed = false; session = null; save(); render(); break;
    }
  });

  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.suggest')) e.preventDefault();
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'dictQ') { dictQ = e.target.value; updateDisc(); }
  });

  document.addEventListener('keydown', function (e) {
    if (!$('#sheet').hidden) { if (e.key === 'Escape') closeSheet(); return; }
    if (tab !== 'today' || !session || session.idx >= session.queue.length) return;
    if (e.target.tagName === 'INPUT') return;
    var s = session;
    if (e.key === ' ' || (e.key === 'Enter' && e.target.classList && e.target.classList.contains('front-body'))) {
      e.preventDefault();
      if (s.graded) next(); else if (!s.flipped) { s.flipped = true; render(); }
      return;
    }
    if (e.key === 'ArrowRight') { e.preventDefault(); swipe(1); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); swipe(-1); return; }
    if (s.graded && e.key === 'Enter') { e.preventDefault(); next(); }
  });

  /* ---------- 启动 ---------- */
  (window.DONGHANG_DATA ? Promise.resolve(window.DONGHANG_DATA) : fetch('data/words.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }))
    .then(function (d) {
      meta = d; words = d.words || [];
      words.forEach(function (w) { byId[w.id] = w; });
      render();
    })
    .catch(function () {
      $('#view').innerHTML = '<div class="empty">词库没有加载出来。请通过网页地址打开（直接双击本地文件时浏览器会拦截读取词库）。</div>';
    });
})();
