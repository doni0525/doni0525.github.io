/* ============================================================
   见己 · 内容库 Content
   - 记录引导问题
   - 每日一思题库（五大主题）
   - 表达训练题库
   - 本地启发式反馈引擎（非云端AI，明确标注）
   ============================================================ */
(function (global) {
  'use strict';

  var THEMES = ['职场成长', '成功与价值', '社会观察', '人际关系', '自我认识', '生活选择', '阅读与播客感悟'];

  var RECORD_QUESTIONS = [
    { key: 'event',   label: '今天发生了什么值得记录的事？', ph: '写下具体发生的事……' },
    { key: 'feel',    label: '我当时有什么感受？', ph: '尽量具体的情绪词……' },
    { key: 'react',   label: '我的第一反应和解释是什么？', ph: '当时脑海里冒出的第一个念头……' },
    { key: 'fact',    label: '事实与我的推测分别是什么？', ph: '分栏填写', split: true },
    { key: 'other',   label: '有没有其他可能的理解？', ph: '换一个角度看……' },
    { key: 'view',    label: '我最终形成了什么观点？', ph: '此刻我的判断是……' },
    { key: 'action',  label: '我今天采取了什么行动？', ph: '真实做过的事……' },
    { key: 'tomorrow',label: '明天愿意尝试的一件小事是什么？', ph: '一个足够小的行动……' }
  ];

  // 每日一思题库：渐进式追问，不给标准答案
  var THOUGHT_QUESTIONS = [
    { id: 1,  theme: '自我认识', q: '“做自己”和被他人期待冲突时，该如何选择？' },
    { id: 2,  theme: '职场成长', q: '为什么有些人工作多年，能力却没有明显增长？' },
    { id: 3,  theme: '成功与价值', q: '如果不用向任何人证明自己，你还会追求现在的目标吗？' },
    { id: 4,  theme: '人际关系', q: '一段关系里，“真诚”和“分寸”哪个更重要？' },
    { id: 5,  theme: '社会观察', q: '为什么大家都说要独立思考，却常常附和多数人的意见？' },
    { id: 6,  theme: '生活选择', q: '“稳定”和“可能性”，在人生选择中应如何权衡？' },
    { id: 7,  theme: '阅读与播客感悟', q: '读到一个很有道理的观点，为什么很快又忘了？' },
    { id: 8,  theme: '自我认识', q: '你判断“自己在进步”的依据，可靠吗？' },
    { id: 9,  theme: '职场成长', q: '忙碌不等于进展。你如何判断自己是真正在推进？' },
    { id: 10, theme: '成功与价值', q: '“被看见”是价值的一部分，还是价值的错觉？' },
    { id: 11, theme: '人际关系', q: '当别人的评价和你的自我认知不一致，该相信谁？' },
    { id: 12, theme: '社会观察', q: '为什么我们更容易相信符合自己已有看法的信息？' },
    { id: 13, theme: '生活选择', q: '“及时行乐”和“延迟满足”，是否被过度对立了？' },
    { id: 14, theme: '阅读与播客感悟', q: '为什么听大咖分享很受启发，回到生活却没有改变？' },
    { id: 15, theme: '自我认识', q: '你反复为自己设定的目标，是否真的出自你自己的意愿？' },
    { id: 16, theme: '职场成长', q: '“靠谱”是一种能力，还是一种习惯？' },
    { id: 17, theme: '成功与价值', q: '如果失败不会被任何人知道，你还会害怕失败吗？' },
    { id: 18, theme: '人际关系', q: '为什么亲近的人之间，反而更难好好说话？' },
    { id: 19, theme: '社会观察', q: '“大家都这么做”能不能成为一个人这么做的理由？' },
    { id: 20, theme: '生活选择', q: '如何区分“我想要的”和“我以为我想要的”？' },
    { id: 21, theme: '阅读与播客感悟', q: '读同一本书，不同阶段为什么会有完全不同的感受？' }
  ];

  var THINK_STEPS = [
    { key: 'view',    label: '观点', q: '你的第一反应是什么？先不必严谨，写下最直觉的判断。', ph: '我认为……' },
    { key: 'reason',  label: '理由', q: '为什么会这么想？给出至少一条支撑它的理由。', ph: '因为……' },
    { key: 'example', label: '事例', q: '有没有一件真实发生过的事，能说明这个判断？', ph: '比如有一次……' },
    { key: 'counter', label: '反面', q: '如果站在相反的立场，会怎样反驳你？', ph: '可能有人会说……' },
    { key: 'revise',  label: '修正', q: '综合以上，你的判断需要修改吗？现在怎么看？', ph: '现在我倾向于……' }
  ];

  var EXPRESS_MODES = [
    { key: 'e100',  label: '100字观点', target: 100, desc: '用约 100 字清晰表达一个观点' },
    { key: 'e300',  label: '300字论述', target: 300, desc: '有结构地展开一个完整论述' },
    { key: 'e3min', label: '3分钟口述', target: 450, desc: '为一次 3 分钟口头表达写提纲' },
    { key: 'retell',label: '复述评论', target: 250, desc: '复述内容并给出自己的评论' }
  ];

  var EXPRESS_TOPICS = [
    { mode: 'e100',  topic: '为什么说“独处的能力”是一种被低估的能力？' },
    { mode: 'e100',  topic: '“完成”比“完美”更重要吗？' },
    { mode: 'e100',  topic: '为什么越想说服别人，越容易适得其反？' },
    { mode: 'e300',  topic: '请论述：忙碌不等于进展，我们该如何判断真正的进展？' },
    { mode: 'e300',  topic: '请论述：为什么“区分事实与推测”是一项重要能力？' },
    { mode: 'e300',  topic: '请论述：独立思考是否可能变成另一种固执？' },
    { mode: 'e3min', topic: '向一位同事解释：为什么要花时间做周复盘。' },
    { mode: 'e3min', topic: '向朋友介绍你最近改变的一个看法，以及原因。' },
    { mode: 'retell',topic: '复述一个你最近读到/听到的观点，然后说出你同意和保留的部分。' },
    { mode: 'retell',topic: '复述一次让你印象深刻的对话，然后评价其中的沟通方式。' }
  ];

  function dayIndex(dateStr, len) {
    // 用日期稳定映射到题目索引（同一天固定，不同天轮换）
    var s = (dateStr || '').replace(/-/g, '');
    var n = parseInt(s, 10);
    if (isNaN(n)) n = Math.floor(Date.now() / 86400000);
    return n % len;
  }

  /* ---------- 本地启发式反馈引擎 ----------
     说明：这是基于文本特征的规则反馈，不调用任何 AI，也不上传文本。
     目的：给出可操作的具体建议，同时不代替用户思考。 */
  function feedback(text, mode) {
    text = (text || '').trim();
    var len = text.replace(/[\s\n]/g, '').length;
    var modeObj = EXPRESS_MODES.filter(function (m) { return m.key === mode; })[0] || EXPRESS_MODES[0];

    function has(re) { return re.test(text); }
    function dim(name, ok, partial, width, level) {
      return { name: name, width: width, level: level, tip: ok, partial: partial };
    }

    // 观点清晰度：是否有明确判断 + 第一人称立场
    var clearHit = has(/(我认为|我觉得|我的看法|我倾向|我同意|我不同意|我判断|在我看来)/);
    var clear = clearHit && len >= 40 ? 88 : (clearHit ? 66 : 48);
    // 逻辑结构：连接词 / 分层词
    var logicHits = (text.match(/(因为|所以|首先|其次|最后|但是|然而|因此|一方面|另一方面|总之)/g) || []).length;
    var logic = logicHits >= 3 ? 86 : (logicHits >= 1 ? 68 : 46);
    // 具体事例：是否有例子/数据/时间
    var exHit = has(/(比如|例如|有一次|举个例子|数据显示|上周|昨天|那次|曾经)/) || /\d/.test(text);
    var example = exHit ? 84 : 42;
    // 语言简洁：字数吻合度 + 长句
    var diff = Math.abs(len - modeObj.target) / modeObj.target;
    var concise = diff <= 0.2 ? 86 : (diff <= 0.4 ? 70 : 54);
    // 独立判断：是否有转折 / 权衡 / 自我修正
    var indepHits = (text.match(/(但是|然而|不过|虽然|另一方面|我保留|我不完全|需要修正|反过来)/g) || []).length;
    var indep = indepHits >= 2 ? 86 : (indepHits >= 1 ? 70 : 52);

    var dims = [
      dim('观点清晰度', clear >= 80, clear >= 60, clear, clear >= 80 ? '优' : clear >= 60 ? '良' : '待加强'),
      dim('逻辑结构', logic >= 80, logic >= 60, logic, logic >= 80 ? '优' : logic >= 60 ? '良' : '待加强'),
      dim('具体事例', example >= 80, example >= 60, example, example >= 80 ? '优' : example >= 60 ? '良' : '待加强'),
      dim('语言简洁度', concise >= 80, concise >= 60, concise, concise >= 80 ? '优' : concise >= 60 ? '良' : '待加强'),
      dim('独立判断', indep >= 80, indep >= 60, indep, indep >= 80 ? '优' : indep >= 60 ? '良' : '待加强')
    ];

    var total = Math.round((clear + logic + example + concise + indep) / 5);

    // 找最弱维度，给一条具体、可操作但不代笔的建议
    var weakest = dims.slice().sort(function (a, b) { return a.width - b.width; })[0];
    var adviceMap = {
      '观点清晰度': '开头可以更直接：先用一句话说清“我认为……”，再展开理由，读者会更容易跟上你的结论。',
      '逻辑结构': '试着加入“首先 / 其次 / 但是 / 所以”这类连接词，让句与句之间的关系显现出来。',
      '具体事例': '这里缺一个具体场景。试着补一句“比如有一次……”——一个真实细节比三句概括更有说服力。',
      '语言简洁度': '字数与要求有出入。若为短练习，可删去重复修饰；若为长论述，可补充一层论证而非堆砌形容词。',
      '独立判断': '试着加入一处转折或权衡（如“不过也有人会认为……”），再说明你为何仍坚持或如何修正——这正是独立思考的痕迹。'
    };
    var advice = adviceMap[weakest.name];

    return {
      total: total, len: len, target: modeObj.target, dims: dims, advice: advice,
      note: '本反馈由本地规则根据文本特征生成，用于自查，不代表 AI 或他人评价，也不代替你自己的判断。'
    };
  }

  global.Content = {
    THEMES: THEMES,
    RECORD_QUESTIONS: RECORD_QUESTIONS,
    THOUGHT_QUESTIONS: THOUGHT_QUESTIONS,
    THINK_STEPS: THINK_STEPS,
    EXPRESS_MODES: EXPRESS_MODES,
    EXPRESS_TOPICS: EXPRESS_TOPICS,
    pickThought: function (date) { return THOUGHT_QUESTIONS[dayIndex(date, THOUGHT_QUESTIONS.length)]; },
    pickExpress: function (date, mode) {
      var pool = EXPRESS_TOPICS.filter(function (t) { return t.mode === mode; });
      if (!pool.length) pool = EXPRESS_TOPICS;
      return pool[dayIndex(date, pool.length)].topic;
    },
    feedback: feedback
  };
})(window);
