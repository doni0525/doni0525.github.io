/* ============================================================
   见己 · 主应用  App
   路由 / 渲染 / 交互 / 提醒 / 导出
   ============================================================ */
(function (global) {
  'use strict';

  var SCREEN = document.getElementById('screen');
  var TABBAR = document.getElementById('tabbar');
  var state = {
    tab: 'home',
    view: null,        // 二级页面：record / think / express / weekly / opinions / search / history
    params: {},
    recordDate: null,
    recordDraft: null,
    thinkStep: 0,
    expressMode: 'e100',
    searchQuery: '',
    editingOpinion: null
  };

  var TABS = [
    { key: 'home', label: '今日', icon: '<circle cx="9" cy="9" r="6.5"/><circle cx="9" cy="9" r="2" fill="currentColor" stroke="none"/>' },
    { key: 'record', label: '记录', icon: '<rect x="3.5" y="2.5" width="11" height="13" rx="2"/><path d="M6 6H12M6 9H12M6 12H10"/>' },
    { key: 'practice', label: '练习', icon: '<path d="M9 2L11 6.5L15.5 9L11 11.5L9 16L7 11.5L2.5 9L7 6.5L9 2Z"/>' },
    { key: 'opinions', label: '观点', icon: '<path d="M4 3H14V15H4V3Z"/><path d="M6.5 6.5H11.5M6.5 9.5H11.5M6.5 12.5H9.5"/>' },
    { key: 'me', label: '我的', icon: '<circle cx="9" cy="6" r="3"/><path d="M3.5 15C3.5 11.7 6 10 9 10C12 10 14.5 11.7 14.5 15"/>' }
  ];

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function svg(inner, size) {
    return '<svg viewBox="0 0 18 18" width="' + (size || 18) + '" height="' + (size || 18) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }
  var ICON = {
    check: '<path d="M4 9L7.5 12.5L14 6"/>',
    back: '<path d="M11 3.5L5.5 9L11 14.5"/>',
    info: '<circle cx="9" cy="9" r="6.5"/><path d="M9 8V12.5"/><circle cx="9" cy="5.5" r="0.8" fill="currentColor" stroke="none"/>',
    search: '<circle cx="8" cy="8" r="5"/><path d="M12 12L16 16"/>',
    plus: '<path d="M9 3V15M3 9H15"/>',
    close: '<path d="M4 4L14 14M14 4L4 14"/>',
    shield: '<path d="M9 2L15 4.5V9C15 13 12.5 15.8 9 17C5.5 15.8 3 13 3 9V4.5L9 2Z"/><path d="M6.5 9L8.3 10.8L11.8 7.3"/>',
    download: '<path d="M9 2V11M5.5 8L9 11.5L12.5 8M3 14.5H15"/>',
    upload: '<path d="M9 12V3M5.5 6.5L9 3L12.5 6.5M3 14.5H15"/>'
  };
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }
  function pad(n) { return ('0' + n).slice(-2); }
  function statusBar() {
    var d = new Date();
    return '<div class="statusbar"><span>' + d.getHours() + ':' + pad(d.getMinutes()) + '</span>' +
      '<span class="icons">' +
      '<svg viewBox="0 0 18 14"><rect x="0" y="9" width="3" height="5" rx="1"/><rect x="5" y="6" width="3" height="8" rx="1"/><rect x="10" y="3" width="3" height="11" rx="1"/><rect x="15" y="0" width="3" height="14" rx="1"/></svg>' +
      '<svg viewBox="0 0 16 14"><path d="M1 4.5C4.5 1.5 11.5 1.5 15 4.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3.5 7.5C6 5.5 10 5.5 12.5 7.5" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="8" cy="12.5" r="1.2"/></svg>' +
      '<svg viewBox="0 0 24 13" style="width:22px"><rect x="0.5" y="0.5" width="20" height="12" rx="3" stroke="currentColor" fill="none"/><rect x="2" y="2" width="15" height="9" rx="1.5" fill="currentColor"/><path d="M22 4V9C23 8.6 23.5 7.8 23.5 6.5C23.5 5.2 23 4.4 22 4Z" fill="currentColor"/></svg>' +
      '</span></div>';
  }
  function appShell(pageHtml) { return statusBar() + '<div class="page">' + pageHtml + '</div>'; }

  /* ---------- 路由 ---------- */
  function go(tab, view, params) {
    state.tab = tab || state.tab;
    state.view = view || null;
    state.params = params || {};
    if (state.view === 'record') {
      state.recordDate = state.params.date || Store.utility.todayStr();
      var rec = Store.getRecordByDate(state.recordDate);
      state.recordDraft = rec ? Store.utility.clone(rec) : { date: state.recordDate, answers: {}, tags: [], status: 'draft' };
    }
    if (state.view === 'think') {
      var t = Store.getThoughtByDate(Store.utility.todayStr());
      state.thinkDraft = t ? Store.utility.clone(t) : { date: Store.utility.todayStr(), qid: Content.pickThought(Store.utility.todayStr()).id, steps: {} };
      state.thinkStep = state.params.step || 0;
    }
    if (state.view === 'express') {
      state.expressDraft = { date: Store.utility.todayStr(), mode: state.expressMode, content: '', topic: '' };
      state.expressResult = null;
    }
    render();
    SCREEN.scrollTop = 0;
  }

  function renderTabbar() {
    var show = !state.view || ['search', 'history'].indexOf(state.view) >= 0;
    TABBAR.innerHTML = '<div class="tabbar-inner">' + TABS.map(function (t) {
      var active = state.tab === t.key && (show || ['record','practice','opinions','me'].indexOf(t.key) < 0);
      return '<button class="tab' + (active ? ' active' : '') + '" data-tab="' + t.key + '">' + svg(t.icon) + '<span>' + t.label + '</span></button>';
    }).join('') + '</div>';
  }

  function render() {
    renderTabbar();
    var html;
    switch (state.view) {
      case 'record': html = viewRecord(); break;
      case 'think': html = viewThink(); break;
      case 'express': html = viewExpress(); break;
      case 'practice': html = viewPractice(); break;
      case 'weekly': html = viewWeekly(); break;
      case 'opinions': html = viewOpinions(); break;
      case 'opinionEdit': html = viewOpinionEdit(); break;
      case 'history': html = viewHistory(); break;
      case 'search': html = viewSearch(); break;
      case 'me': html = viewMe(); break;
      default:
        if (state.tab === 'record') html = viewRecordHome();
        else if (state.tab === 'practice') html = viewPractice();
        else if (state.tab === 'opinions') html = viewOpinions();
        else if (state.tab === 'me') html = viewMe();
        else html = viewHome();
    }
    SCREEN.innerHTML = appShell(html);
    bindEvents();
  }

  /* ---------- 首页 ---------- */
  function viewHome() {
    var today = Store.utility.todayStr();
    var rec = Store.getRecordByDate(today);
    var thought = Store.getThoughtByDate(today);
    var exprToday = Store.all('expressions').filter(function (e) { return e.date === today; });
    var tasks = [
      { label: '每日成长记录', done: !!(rec && rec.status === 'done'), target: 'record' },
      { label: '独立思考训练', done: !!(thought && Object.values(thought.steps).some(Boolean)), target: 'think' },
      { label: '表达能力练习', done: exprToday.length > 0, target: 'express' }
    ];
    var doneCount = tasks.filter(function (t) { return t.done; }).length;

    // 近7日记录柱状
    var bars = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var ds = Store.utility.todayStr(d);
      var r = Store.getRecordByDate(ds);
      var filled = r && r.status === 'done';
      var draft = r && r.status !== 'done';
      var h = filled ? 26 + Object.values(r.answers || {}).filter(Boolean).length * 6 : (draft ? 18 : 8);
      bars.push('<div class="bar-col"><div class="bar' + (filled ? ' hi' : '') + '" style="height:' + h + 'px"></div><div class="bar-label">' + ['日','一','二','三','四','五','六'][d.getDay()] + '</div></div>');
    }
    var recordedDays = 0;
    for (var j = 6; j >= 0; j--) {
      var dd = new Date(); dd.setDate(dd.getDate() - j);
      var rr = Store.getRecordByDate(Store.utility.todayStr(dd));
      if (rr && rr.status === 'done') recordedDays++;
    }

    var opinions = Store.all('opinions').slice(0, 2);
    var hour = new Date().getHours();
    var greet = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
    var hasRecordToday = !!(rec && Object.values(rec.answers || {}).some(Boolean));

    return '' +
      '<div class="greeting"><h2>' + greet + '，欢迎回来</h2><p>今天，也诚实地看一眼自己。</p></div>' +
      '<div class="content">' +
        '<div class="today-card">' +
          '<div class="card-t"><h2>今日三件事</h2><span class="sub">' + doneCount + ' / 3 已完成</span></div>' +
          tasks.map(function (t) {
            return '<div class="task' + (t.done ? ' done' : '') + '" data-go="' + t.target + '">' +
              '<span class="check' + (t.done ? ' done' : '') + '">' + (t.done ? svg(ICON.check) : '') + '</span>' +
              '<span class="task-name">' + t.label + '</span>' +
              '<span class="task-status' + (t.done ? ' ok' : '') + '">' + (t.done ? '已完成' : '待完成') + '</span></div>';
          }).join('') +
        '</div>' +
        '<button class="btn btn-primary btn-block" data-go="record">' + (hasRecordToday ? '继续今日记录' : '开始今日记录') + ' ' + svg('<path d="M3 9H14M10 5L14 9L10 13"/>') + '</button>' +
        '<div class="card">' +
          '<div class="card-t"><h2>成长趋势</h2><span class="more">近 7 日</span></div>' +
          '<div class="bars">' + bars.join('') + '</div>' +
          '<div class="note" style="margin-top:10px">过去 7 天记录了 ' + recordedDays + ' 天 · 慢慢来，比较的对象只有自己。</div>' +
        '</div>' +
        '<div>' +
          '<div class="sec-title" style="margin-bottom:10px">近期观点 <span class="link-btn" data-go="opinions">查看全部</span></div>' +
          (opinions.length ? opinions.map(function (o) {
            return '<div class="opinion-mini" style="margin-bottom:8px"><div class="meta">' + esc(o.topic) + ' · ' + esc(o.date) + '</div><p>“' + esc(o.text.length > 40 ? o.text.slice(0, 40) + '…' : o.text) + '”</p></div>';
          }).join('') : '<div class="note">还没有观点。记录或表达后，观点会自动归档到这里。</div>') +
        '</div>' +
        '<div>' +
          '<div class="sec-title" style="margin-bottom:10px">快捷入口</div>' +
          '<div class="quick-grid">' +
            '<button class="quick" data-go="think"><span class="qi">' + svg('<path d="M9 2L11 6.5L15.5 9L11 11.5L9 16L7 11.5L2.5 9L7 6.5L9 2Z"/>') + '</span><span class="qt">每日一思</span><span class="qd">一道值得想的问题</span></button>' +
            '<button class="quick" data-go="express"><span class="qi">' + svg('<path d="M3 4H15V12H8L4 15V12H3V4Z"/>') + '</span><span class="qt">表达练习</span><span class="qd">说清楚一个观点</span></button>' +
            '<button class="quick" data-go="weekly"><span class="qi">' + svg('<path d="M3 15V9M7 15V5M11 15V11M15 15V7"/>') + '</span><span class="qt">本周成长</span><span class="qd">基于真实记录分析</span></button>' +
            '<button class="quick" data-view="search"><span class="qi">' + svg(ICON.search) + '</span><span class="qt">搜索历史</span><span class="qd">找回写过的内容</span></button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ---------- 记录首页（历史入口） ---------- */
  function viewRecordHome() {
    var recs = Store.all('records').slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    return '' +
      '<div class="topbar"><h1>成长记录</h1><div class="topbar-row"><button class="link-btn" data-view="search">' + svg(ICON.search, 16) + ' 搜索</button><button class="btn btn-soft btn-sm" data-go="record">写今天</button></div></div>' +
      '<div class="content">' +
        (recs.length ? recs.map(function (r) {
          var a = r.answers || {};
          var body = a.event || a.feel || a.view || a.react || '';
          var tags = (r.tags || []).slice(0, 3);
          var cnt = Object.values(a).filter(Boolean).length;
          return '<div class="list-item" data-edit-date="' + esc(r.date) + '">' +
            '<div class="li-top"><span class="li-date">' + esc(r.date) + (r.status === 'draft' ? ' · 草稿' : '') + '</span><span class="li-tag">已写 ' + cnt + ' 项</span></div>' +
            '<div class="li-body">' + esc(body || '（这份记录还没有内容）') + '</div>' +
            (tags.length ? '<div class="li-foot">' + tags.map(function (t) { return '<span class="tagpill">' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
            '</div>';
        }).join('') : '<div class="empty"><div class="ei">' + svg('<rect x="3.5" y="2.5" width="11" height="13" rx="2"/><path d="M6 6H12M6 9H12M6 12H10"/>') + '</div><h3>还没有记录</h3><p>每天 5—15 分钟，写一点点就好。<br>所有问题都可以跳过。</p><button class="btn btn-primary btn-sm" data-go="record">写第一条记录</button></div>') +
      '</div>';
  }

  /* ---------- 记录编辑页 ---------- */
  var TAG_OPTIONS = ['自我认识', '职场成长', '人际关系', '生活选择', '阅读感悟', '情绪观察'];
  function viewRecord() {
    var d = state.recordDraft;
    var a = d.answers || {};
    var qs = Content.RECORD_QUESTIONS;
    var filled = qs.filter(function (q) { return q.split ? (a.fact || a.guess) : a[q.key]; }).length;
    var isToday = d.date === Store.utility.todayStr();

    var cards = qs.map(function (q, i) {
      var num = pad(i + 1);
      if (q.split) {
        return '<div class="qcard">' +
          '<div class="qhead"><span class="qnum">' + num + '</span><span class="qtext">' + q.label + '</span></div>' +
          '<div class="fact-split">' +
            '<div class="fact-col"><div class="lb">事实</div><textarea data-akey="fact" placeholder="客观发生了什么">' + esc(a.fact || '') + '</textarea></div>' +
            '<div class="fact-col guess"><div class="lb">我的推测</div><textarea data-akey="guess" placeholder="我当时的解读">' + esc(a.guess || '') + '</textarea></div>' +
          '</div></div>';
      }
      var has = !!(a[q.key] && a[q.key].trim());
      return '<div class="qcard">' +
        '<div class="qhead"><span class="qnum">' + num + '</span><span class="qtext">' + q.label + '</span><span class="skip" data-skip="' + q.key + '">' + (has ? '已写' : '跳过') + '</span></div>' +
        '<textarea class="qinput" data-akey="' + q.key + '" placeholder="' + q.ph + '">' + esc(a[q.key] || '') + '</textarea>' +
        '</div>';
    }).join('');

    return '' +
      '<div class="topbar"><button class="back-btn" data-back>' + svg(ICON.back) + '返回</button><h1 style="font-size:16px">今日记录</h1><span class="draft-state" id="saveState">草稿已自动保存</span></div>' +
      '<div class="content">' +
        '<div class="date-bar"><input type="date" id="recordDate" value="' + esc(d.date) + '" max="' + Store.utility.todayStr() + '"><div class="nav">' + (isToday ? '' : '<button data-today>回到今天</button>') + '</div></div>' +
        '<div class="tip">' + svg(ICON.info) + '<span>已完成 ' + filled + ' / 8 · 所有问题均可跳过，写得乱也没关系。内容只保存在你的设备上。</span></div>' +
        cards +
        '<div class="card flat"><div class="sec-title" style="margin-bottom:10px">标签分类</div><div class="chips">' + TAG_OPTIONS.map(function (t) {
          return '<button class="chip' + ((d.tags || []).indexOf(t) >= 0 ? ' on' : '') + '" data-tag="' + t + '">' + t + '</button>';
        }).join('') + '</div></div>' +
        '<div class="actions-row"><button class="btn btn-outline" data-save-draft>存草稿</button><button class="btn btn-primary" data-finish-record>完成记录</button></div>' +
      '</div>';
  }

  /* ---------- 每日一思 ---------- */
  function viewThink() {
    var d = state.thinkDraft;
    var q = Content.pickThought(d.date);
    var steps = Content.THINK_STEPS;
    var step = state.thinkStep;
    var cur = steps[step];
    var val = (d.steps && d.steps[cur.key]) || '';
    var stepHtml = steps.map(function (s, i) {
      var cls = i === step ? ' on' : ((d.steps && d.steps[s.key]) ? ' done' : '');
      return '<div class="step' + cls + '">' + (i > 0 ? '<div class="step-line"></div>' : '') + '<div class="step-dot">' + (i < step ? svg(ICON.check, 13) : (i + 1)) + '</div><div class="step-label">' + s.label + '</div></div>';
    }).join('');

    return '' +
      '<div class="topbar"><button class="back-btn" data-back>' + svg(ICON.back) + '返回</button><h1 style="font-size:16px">每日一思</h1><span class="sub" style="color:var(--sage)">' + esc(q.theme) + '</span></div>' +
      '<div class="content">' +
        '<div class="think-hero"><div class="lb">今日问题 · 第 ' + pad(q.id) + ' 期</div><div class="q">' + esc(q.q) + '</div><div class="hint">没有标准答案，我们关心你是如何得出判断的。</div></div>' +
        '<div class="card flat"><div class="steps">' + stepHtml + '</div></div>' +
        '<div class="card"><div class="card-t"><h2>第 ' + (step + 1) + ' 步 · ' + cur.label + '</h2><span class="more">' + (step + 1) + ' / 5</span></div>' +
          '<div class="note" style="margin-bottom:12px;line-height:1.7">' + esc(cur.q) + '</div>' +
          '<textarea class="qinput" id="thinkInput" style="min-height:110px" placeholder="' + cur.ph + '">' + esc(val) + '</textarea>' +
          '<div class="wordcount" id="thinkCount">' + val.replace(/\s/g, '').length + ' 字</div>' +
        '</div>' +
        '<div class="tip">' + svg(ICON.info) + '<span>这一步写完点“下一步”，我会用另一个角度继续追问。随时可以停。</span></div>' +
        '<div class="actions-row"><button class="btn btn-outline" data-think-skip>跳过此步</button><button class="btn btn-primary" data-think-next>' + (step === 4 ? '完成并归档观点' : '下一步：' + steps[step + 1].label) + '</button></div>' +
      '</div>';
  }

  /* ---------- 表达训练 ---------- */
  function viewExpress() {
    var mode = state.expressMode;
    var m = Content.EXPRESS_MODES.filter(function (x) { return x.key === mode; })[0];
    var topic = Content.pickExpress(Store.utility.todayStr(), mode);
    var ed = state.expressDraft || { content: '' };
    var len = (ed.content || '').replace(/\s/g, '').length;
    var f = state.expressResult;

    return '' +
      '<div class="topbar"><button class="back-btn" data-back>' + svg(ICON.back) + '返回</button><h1 style="font-size:16px">表达练习</h1></div>' +
      '<div class="content">' +
        '<div class="segment">' + Content.EXPRESS_MODES.map(function (x) {
          return '<button class="' + (x.key === mode ? 'on' : '') + '" data-mode="' + x.key + '">' + x.label + '</button>';
        }).join('') + '</div>' +
        '<div class="card"><div class="lb" style="font-size:10px;color:var(--sage);font-weight:600;margin-bottom:6px">今日题目 · ' + m.desc + '</div><div style="font-size:14px;font-weight:500;line-height:1.6">' + esc(topic) + '</div></div>' +
        '<div class="card"><div class="card-t"><h2>你的表达</h2><span class="more">' + len + ' / ' + m.target + ' 字</span></div>' +
          '<textarea class="qinput" id="expressInput" style="min-height:150px" placeholder="写下你的观点……">' + esc(ed.content || '') + '</textarea>' +
          '<div class="note" style="margin-top:8px">写完点“获取反馈”，从五个维度自查。</div>' +
        '</div>' +
        (f ? '<div class="feedback">' +
          '<div class="fb-head"><div class="t">' + svg('<path d="M9 1.5L10.8 5.4L15 5.4L11.5 8L12.8 12L9 9.6L5.2 12L6.5 8L3 5.4L7.2 5.4L9 1.5Z" fill="currentColor" stroke="none"/>', 14) + ' 表达反馈</div><div class="score">综合 ' + f.total + ' · ' + f.len + '字</div></div>' +
          f.dims.map(function (d) {
            return '<div class="dim"><span class="n">' + d.name + '</span><span class="track"><span class="fill' + (d.width < 60 ? ' mid' : '') + '" style="width:' + d.width + '%"></span></span><span class="v">' + d.level + '</span></div>';
          }).join('') +
          '<div class="advice"><div class="lb">一处可以更好</div><p>' + esc(f.advice) + '</p></div>' +
          '<div class="disclaimer">' + esc(f.note) + '</div>' +
        '</div>' : '') +
        '<div class="actions-row">' + (f ? '<button class="btn btn-outline" data-express-save>存入观点库</button>' : '') +
          '<button class="btn btn-primary" data-express-feedback>获取反馈</button></div>' +
      '</div>';
  }

  /* ---------- 练习中心 ---------- */
  function viewPractice() {
    var today = Store.utility.todayStr();
    var thoughtDone = Store.getThoughtByDate(today);
    var exprCount = Store.all('expressions').filter(function (e) { return e.date === today; }).length;
    return '' +
      '<div class="topbar"><h1>成长练习</h1><span class="sub">每天一点点</span></div>' +
      '<div class="content">' +
        '<div class="tip">' + svg(ICON.info) + '<span>先观察，再思考，最后把它说清楚。三项练习可任意顺序完成。</span></div>' +
        '<button class="quick" data-go="think" style="width:100%"><span class="qi">' + svg('<path d="M9 2L11 6.5L15.5 9L11 11.5L9 16L7 11.5L2.5 9L7 6.5L9 2Z"/>') + '</span><span class="qt">每日独立思考</span><span class="qd">' + (thoughtDone ? '今天已完成 · 可继续修改' : '一道值得想的问题 · 五步渐进追问') + '</span></button>' +
        '<button class="quick" data-go="express" style="width:100%"><span class="qi">' + svg('<path d="M3 4H15V12H8L4 15V12H3V4Z"/>') + '</span><span class="qt">表达能力训练</span><span class="qd">' + (exprCount ? '今天已练习 ' + exprCount + ' 次 · 再来一次' : '四种模式 · 五维度反馈') + '</span></button>' +
        '<button class="quick" data-go="weekly" style="width:100%"><span class="qi">' + svg('<path d="M3 15V9M7 15V5M11 15V11M15 15V7"/>') + '</span><span class="qt">每周成长分析</span><span class="qd">基于真实记录 · 引用具体日期</span></button>' +
      '</div>';
  }

  /* ---------- 每周成长分析 ---------- */
  function viewWeekly() {
    var wr = Report.weekRange();
    var cached = Store.getReport(wr.key);
    var r = cached ? cached.data : Report.generate(Store.data);
    var c = r.counts;
    return '' +
      '<div class="topbar"><button class="back-btn" data-back>' + svg(ICON.back) + '返回</button><h1 style="font-size:16px">本周成长</h1><span class="sub">' + esc(r.label) + '</span></div>' +
      '<div class="content">' +
        '<div class="think-hero"><div class="lb">这一周，你和自己的相处</div><div class="q" style="font-size:17px">基于 ' + r.basedOn.records + ' 条记录、' + r.basedOn.expressions + ' 次表达、' + r.basedOn.thoughts + ' 次思考生成</div><div class="hint">以下内容全部来自你的真实记录，并标注日期。</div></div>' +
        (!r.enough ? '<div class="tip">' + svg(ICON.info) + '<span>证据不足：本周记录较少。先随手记下几件真实的事，下周的分析会更有依据。</span></div>' : '') +
        '<div class="stat-row">' +
          '<div class="stat"><div class="num">' + c.records + '</div><div class="lb">条记录</div></div>' +
          '<div class="stat"><div class="num">' + c.practices + '</div><div class="lb">次练习</div></div>' +
          '<div class="stat"><div class="num">' + c.actions + '</div><div class="lb">个行动</div></div>' +
        '</div>' +
        '<div class="report-block"><h3>本周形成的观点</h3>' +
          (r.opinions.length ? r.opinions.map(function (o, i) {
            return '<div class="report-line"><span class="rn">' + (i + 1) + '</span><span>' + esc(o.text) + '<br><span style="color:var(--ink-3);font-size:10px">来自' + esc(o.from) + ' · ' + esc(Report.fmt(o.date)) + '</span></span></div>';
          }).join('') : '<div class="note">证据不足：本周还没有形成可归档的观点。</div>') +
        '</div>' +
        '<div class="report-block soft"><h3>反复出现的思维模式</h3>' +
          (r.patterns.length ? r.patterns.map(function (p) {
            return '<div style="margin-bottom:10px"><div style="font-size:12px;font-weight:600;margin-bottom:4px">' + esc(p.title) + '</div><div class="note" style="color:var(--ink-2);line-height:1.7">' + esc(p.body) + '</div><div class="note" style="font-size:10px;margin-top:3px">' + esc(p.note) + '</div></div>';
          }).join('') : '<div class="note">证据不足：本周记录中暂未发现重复出现的模式。这很正常，长期记录后更易显现。</div>') +
        '</div>' +
        '<div class="report-block"><h3>最值得保留的一段原话</h3>' +
          (r.quote ? '<div class="quote">“' + esc(r.quote.text) + '”<br><span style="font-size:10px;color:var(--ink-3);font-style:normal">—— ' + esc(Report.fmt(r.quote.date)) + '</span></div>' : '<div class="note">证据不足：还没有可引用的原始表达。</div>') +
        '</div>' +
        '<div class="report-block"><h3>观点与表达能力的变化</h3><div class="note" style="color:var(--ink-2);line-height:1.7">' + esc(r.change.text) + '</div></div>' +
        '<div class="report-block ochre"><h3>下周重点：' + esc(r.focus) + '</h3>' +
          r.microActions.map(function (a, i) { return '<div class="report-line"><span class="rn">' + (i + 1) + '</span><span>' + esc(a) + '</span></div>'; }).join('') +
        '</div>' +
        '<div class="evidence">' + svg(ICON.info) + '<span>全部内容来自真实记录并标注日期；证据不足的板块已如实提示，不编造进步，不对人格做定性判断。</span></div>' +
        '<button class="btn btn-outline btn-block" data-refresh-report>重新生成周报</button>' +
      '</div>';
  }

  /* ---------- 观点库 ---------- */
  function viewOpinions() {
    var ops = Store.all('opinions');
    var topics = ['全部'].concat(Content.THEMES);
    var filter = state.params.topic || '全部';
    var list = filter === '全部' ? ops : ops.filter(function (o) { return o.topic === filter; });
    return '' +
      '<div class="topbar"><h1>观点库</h1><div class="topbar-row"><button class="link-btn" data-view="search">' + svg(ICON.search, 16) + '</button><button class="link-btn" data-new-opinion>' + svg(ICON.plus, 16) + '</button></div></div>' +
      '<div class="content">' +
        '<div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px">' + topics.map(function (t) {
          return '<button class="chip' + (t === filter ? ' on' : '') + '" data-topic="' + t + '" style="white-space:nowrap">' + t + '</button>';
        }).join('') + '</div>' +
        '<div class="note">共 ' + ops.length + ' 条观点 · 来自记录、思考与表达练习，可确认或编辑。</div>' +
        (list.length ? list.map(function (o) {
          return '<div class="opinion-card">' +
            '<div class="oc-head"><span class="topic-tag">' + esc(o.topic) + '</span><span class="status-tag ' + (o.status === 'confirmed' ? 'ok' : 'wait') + '">' + (o.status === 'confirmed' ? '已确认' : '待确认') + '</span></div>' +
            '<div class="opinion-text">“' + esc(o.text) + '”</div>' +
            (o.timeline && o.timeline.length > 1 ? '<div class="timeline-title">观点变化 · ' + o.timeline.length + ' 次记录</div>' + o.timeline.map(function (t, i) {
              return '<div class="tl-node' + (i === o.timeline.length - 1 ? ' cur' : '') + '"><span class="tl-dot"></span><span class="tl-txt">' + esc(t.date) + '　' + esc(t.text.length > 26 ? t.text.slice(0, 26) + '…' : t.text) + '</span></div>';
            }).join('') : '<div class="tl-txt" style="color:var(--ink-3);font-size:10px">' + esc(o.date) + ' · 来自' + esc(o.source) + '</div>') +
            '<div class="op-actions"><button data-op-confirm="' + o.id + '">' + (o.status === 'confirmed' ? '取消确认' : '确认观点') + '</button><button data-op-edit="' + o.id + '">编辑</button><button class="del" data-op-del="' + o.id + '">删除</button></div>' +
            '</div>';
        }).join('') : '<div class="empty"><div class="ei">' + svg('<path d="M4 3H14V15H4V3Z"/><path d="M6.5 6.5H11.5M6.5 9.5H11.5"/>') + '</div><h3>这里还空着</h3><p>完成记录或表达练习后，观点会自动归档。也可以手动添加。</p><button class="btn btn-primary btn-sm" data-new-opinion>添加一条观点</button></div>') +
      '</div>';
  }

  function viewOpinionEdit() {
    var o = state.editingOpinion;
    var isNew = !o;
    o = o || { text: '', topic: '自我认识' };
    return '' +
      '<div class="topbar"><button class="back-btn" data-back>' + svg(ICON.back) + '返回</button><h1 style="font-size:16px">' + (isNew ? '添加观点' : '编辑观点') + '</h1></div>' +
      '<div class="content">' +
        '<div class="card"><div class="field"><label>观点内容</label><textarea id="opText" placeholder="写下你的判断……">' + esc(o.text) + '</textarea></div>' +
          '<div class="field"><label>主题</label><select id="opTopic">' + Content.THEMES.map(function (t) { return '<option' + (t === o.topic ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
          '<div class="note">编辑已归档的观点时，旧版本会保留在时间线里，形成你的思想变化轨迹。</div>' +
        '</div>' +
        '<button class="btn btn-primary btn-block" data-op-save>保存观点</button>' +
      '</div>';
  }

  /* ---------- 历史与搜索 ---------- */
  function searchAll(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return [];
    var out = [];
    Store.all('records').forEach(function (r) {
      var text = JSON.stringify(r.answers || {}) + ' ' + (r.tags || []).join(' ');
      if (text.toLowerCase().indexOf(q) >= 0) out.push({ type: '记录', date: r.date, id: r.id, text: (r.answers && (r.answers.event || r.answers.view || r.answers.feel)) || '（记录）' });
    });
    Store.all('thoughts').forEach(function (t) {
      var text = JSON.stringify(t.steps || {});
      if (text.toLowerCase().indexOf(q) >= 0) out.push({ type: '思考', date: t.date, id: t.id, text: (t.steps && (t.steps.revise || t.steps.view)) || '（思考）' });
    });
    Store.all('expressions').forEach(function (e) {
      if ((e.content || '').toLowerCase().indexOf(q) >= 0) out.push({ type: '表达', date: e.date, id: e.id, text: e.content });
    });
    Store.all('opinions').forEach(function (o) {
      if ((o.text || '').toLowerCase().indexOf(q) >= 0) out.push({ type: '观点', date: o.date, id: o.id, text: o.text });
    });
    return out.sort(function (a, b) { return b.date.localeCompare(a.date); });
  }
  function viewSearch() {
    var q = state.searchQuery;
    var res = searchAll(q);
    return '' +
      '<div class="topbar"><button class="back-btn" data-back>' + svg(ICON.back) + '返回</button><h1 style="font-size:16px">搜索历史</h1></div>' +
      '<div class="content">' +
        '<div class="searchbar">' + svg(ICON.search) + '<input id="searchInput" value="' + esc(q) + '" placeholder="搜索记录、观点、表达……" autocomplete="off"></div>' +
        (q ? '<div class="note">找到 ' + res.length + ' 条结果</div>' : '<div class="note">输入关键词，可搜索所有记录、思考、表达与观点的内容。</div>') +
        (res.length ? res.map(function (r) {
          return '<div class="list-item"><div class="li-top"><span class="li-date">' + esc(r.date) + '</span><span class="li-tag">' + r.type + '</span></div><div class="li-body">' + esc(r.text) + '</div></div>';
        }).join('') : (q ? '<div class="empty"><div class="ei">' + svg(ICON.search) + '</div><h3>没有找到相关内容</h3><p>换个关键词试试。</p></div>' : '')) +
      '</div>';
  }
  function viewHistory() { return viewRecordHome(); }

  /* ---------- 我的 / 设置 ---------- */
  function viewMe() {
    var st = Store.data.settings;
    var theme = st.theme;
    var recordCount = Store.all('records').length;
    var opinionCount = Store.all('opinions').length;
    var exprCount = Store.all('expressions').length;
    return '' +
      '<div class="topbar"><h1>我的</h1><span class="sub">设置与数据</span></div>' +
      '<div class="content">' +
        '<div class="privacy-card">' + svg(ICON.shield) + '<div><div class="t">隐私优先</div><div class="s">所有记录默认保存在这台设备的浏览器里，不上传、不联网。反馈由本地规则生成，你的文字不会发送给任何服务器。数据始终由你掌控。</div></div></div>' +

        '<div class="set-card"><h3>每日提醒</h3>' +
          '<div class="set-row"><div class="set-info"><div class="t">每日记录提醒</div><div class="s">网页内提醒 · 需保持页面打开</div></div>' +
            '<input type="time" class="time-input" id="dailyTime" value="' + esc(st.remindDaily.time) + '"><button class="switch' + (st.remindDaily.on ? ' on' : '') + '" data-toggle="remindDaily"><span class="knob"></span></button></div>' +
          '<div class="set-row"><div class="set-info"><div class="t">每周复盘提醒</div><div class="s">每周日 · 网页内提醒</div></div>' +
            '<input type="time" class="time-input" id="weeklyTime" value="' + esc(st.remindWeekly.time) + '"><button class="switch' + (st.remindWeekly.on ? ' on' : '') + '" data-toggle="remindWeekly"><span class="knob"></span></button></div>' +
        '</div>' +

        '<div class="notice-card"><h4>关于提醒，请如实了解</h4>' +
          '<p>· <b>网页内提醒</b>：本版已实现，仅在应用页面打开时生效。</p>' +
          '<p>· <b>浏览器系统通知</b>：可调用浏览器通知授权，但关闭页面后无法定时触发（需要常驻服务）。</p>' +
          '<p>· <b>真正的定时推送</b>：需要服务器或安装为应用并授权系统权限，纯本地网页无法做到，本版未实现。</p>' +
          '<p style="color:var(--ink-3)">未开通的方式不会假装已生效。你也可以在手机日历里设一个固定提醒。</p>' +
          '<button class="btn btn-outline btn-sm" data-notify-test style="margin-top:8px">测试浏览器通知</button>' +
        '</div>' +

        '<div class="set-card"><h3>外观</h3><div class="segment">' +
          [['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']].map(function (x) {
            return '<button class="' + (theme === x[0] ? 'on' : '') + '" data-theme-set="' + x[0] + '">' + x[1] + '</button>';
          }).join('') + '</div></div>' +

        '<div class="set-card"><h3>数据与备份</h3>' +
          '<div class="note" style="margin-bottom:12px">现有 ' + recordCount + ' 条记录、' + exprCount + ' 次表达、' + opinionCount + ' 条观点。建议定期导出备份，清除浏览器数据不会自动保留这些内容。</div>' +
          '<div class="export-grid">' +
            '<button data-export="json">' + svg(ICON.download) + 'JSON 备份</button>' +
            '<button data-export="md">' + svg(ICON.download) + 'Markdown</button>' +
            '<button data-export="pdf">' + svg(ICON.download) + '打印/PDF</button>' +
            '<button data-import>' + svg(ICON.upload) + '导入备份</button>' +
          '</div>' +
          '<button class="link-btn" data-clear style="display:block;margin-top:14px;color:var(--danger)">清空全部数据</button>' +
        '</div>' +

        '<div class="note" style="text-align:center;padding:6px 0 12px">见己 · 个人思考与表达成长系统<br>本地版本 v1.0 · 数据只属于你</div>' +
      '</div>';
  }

  /* ---------- 主题 ---------- */
  function applyTheme() {
    var t = Store.setting('theme') || 'light';
    var real = t;
    if (t === 'system') real = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', real);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', real === 'dark' ? '#171A18' : '#F4F1EA');
    var btn = document.getElementById('deskTheme');
    if (btn) btn.innerHTML = svg(real === 'dark'
      ? '<circle cx="9" cy="9" r="3.5"/><path d="M9 2V3.5M9 14.5V16M2 9H3.5M14.5 9H16M4 4L5 5M13 13L14 14M14 4L13 5M5 13L4 14"/>'
      : '<path d="M14 11.5A6 6 0 0 1 6.5 4A6 6 0 1 0 14 11.5Z"/>');
  }

  /* ---------- 导出 ---------- */
  function download(name, content, type) {
    var blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  }
  function exportMarkdown() {
    var d = Store.data;
    var lines = ['# 见己 · 我的成长档案', '', '> 导出时间：' + new Date().toLocaleString('zh-CN'), ''];
    lines.push('## 一、成长记录（' + d.records.length + '）', '');
    d.records.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).forEach(function (r) {
      lines.push('### ' + r.date + (r.status === 'draft' ? '（草稿）' : ''));
      Content.RECORD_QUESTIONS.forEach(function (q) {
        var v = q.split ? ((r.answers.fact || '') + (r.answers.guess ? '｜推测：' + r.answers.guess : '')) : (r.answers[q.key] || '');
        if (v) lines.push('- **' + q.label + '** ' + v.replace(/\n/g, ' '));
      });
      if (r.tags && r.tags.length) lines.push('- 标签：' + r.tags.join('、'));
      lines.push('');
    });
    lines.push('## 二、独立思考（' + d.thoughts.length + '）', '');
    d.thoughts.forEach(function (t) {
      var q = Content.THOUGHT_QUESTIONS.filter(function (x) { return x.id === t.qid; })[0];
      lines.push('### ' + t.date + ' · ' + (q ? q.q : ''));
      Content.THINK_STEPS.forEach(function (s) { if (t.steps && t.steps[s.key]) lines.push('- **' + s.label + '**：' + t.steps[s.key].replace(/\n/g, ' ')); });
      lines.push('');
    });
    lines.push('## 三、表达练习（' + d.expressions.length + '）', '');
    d.expressions.forEach(function (e) {
      lines.push('### ' + e.date + ' · ' + e.mode);
      lines.push('- 题目：' + (e.topic || ''));
      lines.push('- 内容：' + (e.content || '').replace(/\n/g, ' '));
      lines.push('');
    });
    lines.push('## 四、观点库（' + d.opinions.length + '）', '');
    d.opinions.forEach(function (o) {
      lines.push('### ' + o.date + ' · ' + o.topic + '（' + (o.status === 'confirmed' ? '已确认' : '待确认') + '）');
      lines.push('- ' + o.text);
      if (o.timeline && o.timeline.length > 1) {
        lines.push('- 变化：' + o.timeline.map(function (x) { return x.date + '「' + x.text + '」'; }).join(' → '));
      }
      lines.push('');
    });
    return lines.join('\n');
  }
  function exportPDF() {
    var md = exportMarkdown();
    var escHtml = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>见己 · 成长档案</title>' +
      '<style>body{font-family:-apple-system,"PingFang SC",sans-serif;max-width:760px;margin:40px auto;color:#2B302C;line-height:1.7}h1{font-size:26px}h2{margin-top:32px;border-bottom:2px solid #6E8166;padding-bottom:6px}h3{font-size:15px;margin:18px 0 6px}blockquote{color:#6E8166}li{margin:3px 0}@media print{body{margin:0}}</style></head><body><pre style="white-space:pre-wrap;font-family:inherit">' + escHtml + '</pre></body></html>';
    var w = window.open('', '_blank');
    if (!w) { toast('请允许弹出窗口以打印'); return; }
    w.document.write(html); w.document.close();
    setTimeout(function () { w.print(); }, 300);
  }

  /* ---------- 提醒 ---------- */
  var remindTimer = null;
  var notifiedDays = {};
  function checkReminders() {
    var now = new Date();
    var hm = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var st = Store.data.settings;
    var today = Store.utility.todayStr();
    if (st.remindDaily.on && hm === st.remindDaily.time && !notifiedDays['d' + today]) {
      notifiedDays['d' + today] = true;
      var rec = Store.getRecordByDate(today);
      if (!rec || rec.status !== 'done') { toast('该记录今天的心情了 · 花 5 分钟写一点吧'); fireNotify('见己', '今天还没有记录，花 5 分钟写一点吧'); }
    }
    if (st.remindWeekly.on && now.getDay() === 0 && hm === st.remindWeekly.time && !notifiedDays['w' + today]) {
      notifiedDays['w' + today] = true;
      toast('周日复盘时间 · 看看这周的成长'); fireNotify('见己', '周日复盘时间到了，来看看本周成长');
    }
  }
  function fireNotify(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(title, { body: body }); } catch (e) { }
  }
  function requestNotify() {
    if (!('Notification' in window)) { toast('此浏览器不支持系统通知'); return; }
    Notification.requestPermission().then(function (p) {
      if (p === 'granted') { fireNotify('见己', '通知已开启（仅在页面打开时可提醒）'); toast('已开启浏览器通知'); }
      else toast('未授权通知，将只用网页内提醒');
    });
  }

  /* ---------- 事件绑定（事件委托） ---------- */
  function bindEvents() {
    // data-go：切换主 tab / 二级页面
    SCREEN.querySelectorAll('[data-go]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        var t = el.getAttribute('data-go');
        if (t === 'record') go('record', 'record');
        else if (t === 'think') go('practice', 'think');
        else if (t === 'express') go('practice', 'express');
        else if (t === 'weekly') go('practice', 'weekly');
        else if (t === 'opinions') go('opinions');
      });
    });
    // data-view：同 tab 内二级页面
    SCREEN.querySelectorAll('[data-view]').forEach(function (el) {
      el.addEventListener('click', function () {
        var v = el.getAttribute('data-view');
        if (v === 'search') { state.searchQuery = ''; go(state.tab, 'search'); }
        else go(state.tab, v);
      });
    });
    // 返回
    SCREEN.querySelectorAll('[data-back]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (state.view === 'record' || state.view === 'weekly' || state.view === 'think' || state.view === 'express' || state.view === 'opinionEdit') {
          go(state.tab === 'practice' ? 'practice' : state.tab);
        } else if (state.view === 'search' || state.view === 'history') go(state.tab);
        else { state.view = null; render(); }
      });
    });

    bindRecordEvents();
    bindThinkEvents();
    bindExpressEvents();
    bindWeeklyEvents();
    bindOpinionEvents();
    bindSearchEvents();
    bindMeEvents();
  }

  function bindRecordEvents() {
    var dt = document.getElementById('recordDate');
    if (dt) dt.addEventListener('change', function () {
      state.recordDate = dt.value;
      var rec = Store.getRecordByDate(dt.value);
      state.recordDraft = rec ? Store.utility.clone(rec) : { date: dt.value, answers: {}, tags: [], status: 'draft' };
      render();
    });
    var todayBtn = SCREEN.querySelector('[data-today]');
    if (todayBtn) todayBtn.addEventListener('click', function () {
      state.recordDate = Store.utility.todayStr();
      var rec = Store.getRecordByDate(state.recordDate);
      state.recordDraft = rec ? Store.utility.clone(rec) : { date: state.recordDate, answers: {}, tags: [], status: 'draft' };
      render();
    });
    SCREEN.querySelectorAll('[data-akey]').forEach(function (el) {
      el.addEventListener('input', function () {
        var k = el.getAttribute('data-akey');
        state.recordDraft.answers[k] = el.value;
        var st = document.getElementById('saveState');
        if (st) st.textContent = '保存中…';
        clearTimeout(bindRecordEvents._t);
        bindRecordEvents._t = setTimeout(function () {
          var d = state.recordDraft;
          d.status = d.status === 'done' ? 'done' : 'draft';
          Store.saveRecord(d);
          var st2 = document.getElementById('saveState');
          if (st2) st2.textContent = '草稿已自动保存';
        }, 500);
      });
    });
    SCREEN.querySelectorAll('[data-skip]').forEach(function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-skip');
        state.recordDraft.answers[k] = '';
        Store.saveRecord(state.recordDraft);
        toast('已留空，可随时补写'); render();
      });
    });
    SCREEN.querySelectorAll('[data-tag]').forEach(function (el) {
      el.addEventListener('click', function () {
        var t = el.getAttribute('data-tag');
        var tags = state.recordDraft.tags || [];
        var i = tags.indexOf(t);
        if (i >= 0) tags.splice(i, 1); else tags.push(t);
        state.recordDraft.tags = tags;
        Store.saveRecord(state.recordDraft); render();
      });
    });
    var sd = SCREEN.querySelector('[data-save-draft]');
    if (sd) sd.addEventListener('click', function () { Store.saveRecord(state.recordDraft); toast('草稿已保存'); });
    var fin = SCREEN.querySelector('[data-finish-record]');
    if (fin) fin.addEventListener('click', function () {
      state.recordDraft.status = 'done';
      Store.saveRecord(state.recordDraft);
      // 自动把“观点”归档到观点库（待确认）
      var v = state.recordDraft.answers && state.recordDraft.answers.view;
      if (v && v.trim()) {
        var exist = Store.all('opinions').filter(function (o) { return o.text === v.trim(); })[0];
        if (!exist) Store.addOpinion(v.trim(), (state.recordDraft.tags && state.recordDraft.tags[0]) || '自我认识', '每日记录', state.recordDraft.date);
      }
      toast('记录已完成'); go('record');
    });
    SCREEN.querySelectorAll('[data-edit-date]').forEach(function (el) {
      el.addEventListener('click', function () { go('record', 'record', { date: el.getAttribute('data-edit-date') }); });
    });
  }

  function bindThinkEvents() {
    var inp = document.getElementById('thinkInput');
    if (inp) inp.addEventListener('input', function () {
      var k = Content.THINK_STEPS[state.thinkStep].key;
      state.thinkDraft.steps[k] = inp.value;
      var c = document.getElementById('thinkCount');
      if (c) c.textContent = inp.value.replace(/\s/g, '').length + ' 字';
      clearTimeout(bindThinkEvents._t);
      bindThinkEvents._t = setTimeout(function () { Store.saveThought(state.thinkDraft); }, 500);
    });
    var skip = SCREEN.querySelector('[data-think-skip]');
    if (skip) skip.addEventListener('click', function () {
      var k = Content.THINK_STEPS[state.thinkStep].key;
      state.thinkDraft.steps[k] = '';
      Store.saveThought(state.thinkDraft);
      nextThinkStep();
    });
    var next = SCREEN.querySelector('[data-think-next]');
    if (next) next.addEventListener('click', function () {
      var k = Content.THINK_STEPS[state.thinkStep].key;
      state.thinkDraft.steps[k] = (document.getElementById('thinkInput') || {}).value || state.thinkDraft.steps[k] || '';
      Store.saveThought(state.thinkDraft);
      if (state.thinkStep === 4) {
        var v = state.thinkDraft.steps.revise || state.thinkDraft.steps.view;
        if (v && v.trim()) {
          var q = Content.pickThought(state.thinkDraft.date);
          var exist = Store.all('opinions').filter(function (o) { return o.text === v.trim(); })[0];
          if (!exist) Store.addOpinion(v.trim(), q.theme, '独立思考', state.thinkDraft.date);
        }
        toast('五步思考已完成，观点已归档'); go('practice');
      } else { state.thinkStep++; render(); SCREEN.scrollTop = 0; }
    });
    function nextThinkStep() {
      if (state.thinkStep === 4) { toast('已跳过，可随时回来补充'); go('practice'); }
      else { state.thinkStep++; render(); SCREEN.scrollTop = 0; }
    }
  }

  function bindExpressEvents() {
    SCREEN.querySelectorAll('[data-mode]').forEach(function (el) {
      el.addEventListener('click', function () {
        state.expressMode = el.getAttribute('data-mode');
        state.expressDraft = { date: Store.utility.todayStr(), mode: state.expressMode, content: '' };
        state.expressResult = null;
        render();
      });
    });
    var inp = document.getElementById('expressInput');
    if (inp) inp.addEventListener('input', function () {
      state.expressDraft.content = inp.value;
      var more = SCREEN.querySelector('.card-t .more');
      var m = Content.EXPRESS_MODES.filter(function (x) { return x.key === state.expressMode; })[0];
      if (more) more.textContent = inp.value.replace(/\s/g, '').length + ' / ' + m.target + ' 字';
      state.expressResult = null;
    });
    var fb = SCREEN.querySelector('[data-express-feedback]');
    if (fb) fb.addEventListener('click', function () {
      var content = (document.getElementById('expressInput') || {}).value || '';
      content = content.trim();
      if (content.replace(/\s/g, '').length < 10) { toast('再写一点吧，至少写 10 个字'); return; }
      var topic = Content.pickExpress(Store.utility.todayStr(), state.expressMode);
      var result = Content.feedback(content, state.expressMode);
      state.expressDraft = { date: Store.utility.todayStr(), mode: state.expressMode, content: content, topic: topic, feedback: result };
      Store.saveExpression(state.expressDraft);
      state.expressResult = result;
      render();
      setTimeout(function () { var f = SCREEN.querySelector('.feedback'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
    });
    var save = SCREEN.querySelector('[data-express-save]');
    if (save) save.addEventListener('click', function () {
      var d = state.expressDraft;
      var text = (d.content || '').trim();
      if (!text) { toast('没有可归档的内容'); return; }
      var first = text.split(/[。！？\n]/)[0].trim();
      var m = Content.EXPRESS_MODES.filter(function (x) { return x.key === d.mode; })[0];
      Store.addOpinion(first || text, '自我认识', '表达练习 · ' + (m ? m.label : ''), d.date);
      toast('第一句观点已存入观点库');
    });
  }

  function bindWeeklyEvents() {
    var r = SCREEN.querySelector('[data-refresh-report]');
    if (r) r.addEventListener('click', function () {
      var fresh = Report.generate(Store.data);
      Store.saveReport({ weekKey: fresh.weekKey, data: fresh });
      toast('周报已重新生成'); render();
    });
  }

  function bindOpinionEvents() {
    SCREEN.querySelectorAll('[data-topic]').forEach(function (el) {
      el.addEventListener('click', function () { go('opinions', null, { topic: el.getAttribute('data-topic') }); });
    });
    SCREEN.querySelectorAll('[data-op-confirm]').forEach(function (el) {
      el.addEventListener('click', function () {
        var o = Store.find('opinions', el.getAttribute('data-op-confirm'));
        if (o) { o.status = o.status === 'confirmed' ? 'pending' : 'confirmed'; Store.saveOpinion(o); render(); }
      });
    });
    SCREEN.querySelectorAll('[data-op-edit]').forEach(function (el) {
      el.addEventListener('click', function () {
        state.editingOpinion = Store.find('opinions', el.getAttribute('data-op-edit'));
        go('opinions', 'opinionEdit');
      });
    });
    SCREEN.querySelectorAll('[data-op-del]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-op-del');
        confirmModal('删除这条观点？', '删除后无法恢复，时间线记录也会一并移除。', function () { Store.remove('opinions', id); toast('已删除'); render(); });
      });
    });
    SCREEN.querySelectorAll('[data-new-opinion]').forEach(function (el) {
      el.addEventListener('click', function () { state.editingOpinion = null; go('opinions', 'opinionEdit'); });
    });
    var save = SCREEN.querySelector('[data-op-save]');
    if (save) save.addEventListener('click', function () {
      var text = (document.getElementById('opText') || {}).value || '';
      var topic = (document.getElementById('opTopic') || {}).value || '自我认识';
      text = text.trim();
      if (!text) { toast('观点内容不能为空'); return; }
      var old = state.editingOpinion;
      if (old && old.id) {
        if (old.text !== text) old.timeline = (old.timeline || []).concat([{ date: Store.utility.todayStr(), text: text }]);
        old.text = text; old.topic = topic;
        Store.saveOpinion(old); toast('观点已更新');
      } else {
        Store.addOpinion(text, topic, '手动添加', Store.utility.todayStr()); toast('观点已添加');
      }
      go('opinions');
    });
  }

  function bindSearchEvents() {
    var inp = document.getElementById('searchInput');
    if (inp) {
      inp.addEventListener('input', function () {
        state.searchQuery = inp.value;
        clearTimeout(bindSearchEvents._t);
        bindSearchEvents._t = setTimeout(function () {
          var pos = inp.selectionStart;
          render();
          var ni = document.getElementById('searchInput');
          if (ni) { ni.focus(); try { ni.setSelectionRange(pos, pos); } catch (e) { } }
        }, 300);
      });
    }
  }

  function bindMeEvents() {
    SCREEN.querySelectorAll('[data-toggle]').forEach(function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-toggle');
        var st = Store.data.settings[k];
        st.on = !st.on; Store.save();
        toast(st.on ? '已开启网页内提醒（需保持页面打开）' : '已关闭提醒'); render();
      });
    });
    var dt = document.getElementById('dailyTime');
    if (dt) dt.addEventListener('change', function () { Store.data.settings.remindDaily.time = dt.value; Store.save(); toast('提醒时间已更新'); });
    var wt = document.getElementById('weeklyTime');
    if (wt) wt.addEventListener('change', function () { Store.data.settings.remindWeekly.time = wt.value; Store.save(); toast('复盘时间已更新'); });
    SCREEN.querySelectorAll('[data-theme-set]').forEach(function (el) {
      el.addEventListener('click', function () { Store.setSetting('theme', el.getAttribute('data-theme-set')); applyTheme(); render(); });
    });
    SCREEN.querySelectorAll('[data-export]').forEach(function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-export');
        var d = new Date(); var tag = Store.utility.todayStr();
        if (k === 'json') { download('见己备份-' + tag + '.json', Store.exportJSON(), 'application/json'); toast('JSON 备份已下载'); }
        else if (k === 'md') { download('见己成长档案-' + tag + '.md', exportMarkdown(), 'text/markdown'); toast('Markdown 已下载'); }
        else if (k === 'pdf') exportPDF();
      });
    });
    var imp = SCREEN.querySelector('[data-import]');
    if (imp) imp.addEventListener('click', function () { document.getElementById('importFile').click(); });
    var clr = SCREEN.querySelector('[data-clear]');
    if (clr) clr.addEventListener('click', function () {
      confirmModal('清空全部数据？', '这会删除本机所有记录、观点与设置，且不可恢复。建议先导出备份。', function () { Store.clearAll(); toast('已清空'); go('home'); });
    });
    var nt = SCREEN.querySelector('[data-notify-test]');
    if (nt) nt.addEventListener('click', requestNotify);
  }

  /* ---------- 弹窗 ---------- */
  function confirmModal(title, desc, onOk) {
    var root = document.getElementById('modal-root');
    root.innerHTML = '<div class="modal-mask"><div class="modal"><h3>' + esc(title) + '</h3><p>' + esc(desc) + '</p>' +
      '<div class="row"><button class="btn btn-outline" id="mCancel">取消</button><button class="btn btn-primary" id="mOk">确定</button></div></div></div>';
    document.getElementById('mCancel').onclick = function () { root.innerHTML = ''; };
    document.getElementById('mOk').onclick = function () { root.innerHTML = ''; onOk(); };
    root.querySelector('.modal-mask').onclick = function (e) { if (e.target === this) root.innerHTML = ''; };
  }

  /* ---------- 底部导航事件 ---------- */
  TABBAR.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-tab]');
    if (!btn) return;
    var t = btn.getAttribute('data-tab');
    if (t === 'home') go('home');
    else if (t === 'record') go('record');
    else if (t === 'practice') go('practice');
    else if (t === 'opinions') go('opinions');
    else if (t === 'me') go('me');
  });

  /* ---------- 桌面主题按钮 ---------- */
  document.getElementById('deskTheme').addEventListener('click', function () {
    var cur = Store.setting('theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    Store.setSetting('theme', next); applyTheme(); render();
  });

  /* ---------- 导入文件 ---------- */
  document.getElementById('importFile').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        Store.importJSON(reader.result);
        applyTheme(); toast('备份已导入'); go('home');
      } catch (err) { toast('导入失败：文件格式不正确'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  });

  /* ---------- 初始化 ---------- */
  function init() {
    Store.init();
    applyTheme();
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (Store.setting('theme') === 'system') applyTheme();
      });
    }
    go('home');
    checkReminders();
    remindTimer = setInterval(checkReminders, 30000);
    // 每天首次打开时预生成一次周报快照（如尚无）
    var wr = Report.weekRange();
    if (!Store.getReport(wr.key)) Store.saveReport({ weekKey: wr.key, data: Report.generate(Store.data) });
  }

  global.App = {
    state: state, go: go, render: render, toast: toast, esc: esc, svg: svg, ICON: ICON,
    appShell: appShell, statusBar: statusBar, viewHome: viewHome, viewRecordHome: viewRecordHome,
    viewRecord: viewRecord, viewThink: viewThink, viewExpress: viewExpress, viewPractice: viewPractice,
    viewWeekly: viewWeekly, viewOpinions: viewOpinions, viewOpinionEdit: viewOpinionEdit,
    viewSearch: viewSearch, viewHistory: viewHistory, searchAll: searchAll, viewMe: viewMe,
    applyTheme: applyTheme, init: init, confirmModal: confirmModal
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
