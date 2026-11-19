/* ============================================================
   见己 · AI 引擎  AI
   - 浏览器直连 DeepSeek（兼容 OpenAI Chat Completions 协议）
   - 密钥存于本机 localStorage，不混入数据备份
   - 全部能力为"显式调用"：用户点击才发送，不做后台上传
   - 所有方法返回 Promise，统一错误语义
   ============================================================ */
(function (global) {
  'use strict';

  var CFG_KEY = 'jianji.ai.config.v1';

  var DEFAULT = {
    enabled: false,
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    temperature: 0.7
  };

  var PROVIDERS = [
    { id: 'deepseek', name: 'DeepSeek（推荐）', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner'], applyUrl: 'https://platform.deepseek.com/api_keys' },
    { id: 'custom', name: '自定义（OpenAI 兼容）', baseUrl: '', models: [] }
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function getConfig() {
    var raw = null;
    try { raw = localStorage.getItem(CFG_KEY); } catch (e) { }
    var cfg = clone(DEFAULT);
    if (raw) {
      try { cfg = Object.assign(cfg, JSON.parse(raw)); } catch (e) { }
    }
    return cfg;
  }

  function saveConfig(cfg) {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(Object.assign(getConfig(), cfg || {})));
      return true;
    } catch (e) { return false; }
  }

  function isReady() {
    var c = getConfig();
    return !!(c.enabled && c.apiKey && c.apiKey.trim());
  }

  function maskKey(k) {
    k = k || '';
    if (k.length <= 8) return k.replace(/./g, '•');
    return k.slice(0, 4) + '••••' + k.slice(-4);
  }

  /* ---------- 底层调用 ---------- */
  function errMsg(status, body) {
    if (status === 401) return '密钥无效或已过期，请到设置里检查 API Key。';
    if (status === 402) return '账户余额不足，请到对应平台充值后再试。';
    if (status === 429) return '请求过于频繁或额度受限，请稍后再试。';
    if (status >= 500) return 'AI 服务暂时不可用，请稍后再试。';
    var m = '';
    try { var j = JSON.parse(body); m = (j.error && (j.error.message || j.error.type)) || j.message || ''; } catch (e) { m = (body || '').slice(0, 120); }
    return m ? ('调用失败：' + m) : ('调用失败（HTTP ' + status + '）');
  }

  function chat(messages, opts) {
    opts = opts || {};
    var cfg = getConfig();
    if (!cfg.apiKey || !cfg.apiKey.trim()) {
      return Promise.reject(new Error('尚未配置 API Key，请先到「我的 → AI 设置」填写。'));
    }
    var url = (cfg.baseUrl || DEFAULT.baseUrl).replace(/\/$/, '') + '/chat/completions';
    var payload = {
      model: cfg.model || DEFAULT.model,
      messages: messages,
      temperature: opts.temperature != null ? opts.temperature : cfg.temperature,
      stream: false
    };
    if (opts.maxTokens) payload.max_tokens = opts.maxTokens;
    if (opts.json) {
      payload.response_format = { type: 'json_object' };
    }

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 90000) : null;

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey.trim()
      },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.text().then(function (text) {
        if (!res.ok) throw new Error(errMsg(res.status, text));
        var data;
        try { data = JSON.parse(text); } catch (e) { throw new Error('AI 返回内容无法解析，请重试。'); }
        var choice = data.choices && data.choices[0];
        var content = choice && choice.message && choice.message.content;
        if (content == null && choice && choice.message && choice.message.reasoning_content) {
          content = choice.message.reasoning_content;
        }
        if (content == null) throw new Error('AI 未返回内容，请重试。');
        return typeof content === 'string' ? content : String(content);
      });
    }).catch(function (e) {
      if (timer) clearTimeout(timer);
      if (e && e.name === 'AbortError') throw new Error('请求超时，请检查网络后重试。');
      if (e instanceof TypeError || (e && e.message === 'Failed to fetch')) {
        throw new Error('无法连接 AI 服务：请检查网络，并确认所用平台支持浏览器直连（DeepSeek 支持）。');
      }
      throw e;
    });
  }

  // 从模型文本里稳健地抽取 JSON（兼容 ```json 包裹与前后说明文字）
  function parseJSON(text) {
    if (text == null) return null;
    var s = String(text).trim();
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { return JSON.parse(s); } catch (e) { }
    var start = s.indexOf('{'), end = s.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(s.slice(start, end + 1)); } catch (e2) { }
    }
    var a = s.indexOf('['), b = s.lastIndexOf(']');
    if (a >= 0 && b > a) {
      try { return JSON.parse(s.slice(a, b + 1)); } catch (e3) { }
    }
    return null;
  }

  function callJSON(system, user, opts) {
    opts = opts || {};
    return chat([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], Object.assign({ json: true, temperature: 0.6 }, opts)).then(function (text) {
      var obj = parseJSON(text);
      if (!obj) throw new Error('AI 返回格式异常，请重试。');
      return obj;
    });
  }

  /* ---------- 系统提示词 ---------- */
  var PERSONA = '你是「见己」里的思考与表达教练。风格：冷静、具体、克制，不说空话套话，不堆砌形容词，不谄媚。' +
    '你始终尊重用户自己的判断——你的作用是帮他看清、想深、说清，而不是替他下结论或代笔。' +
    '凡涉及评价，只针对文本本身，不评价人格。输出必须是严格的 JSON，不要包含 Markdown 代码块标记或 JSON 以外的任何文字。';

  /* ========== 能力 1：拆解理解素材 ========== */
  function decompose(material, topic) {
    var sys = PERSONA + '你的任务是"拆解理解"一段知识素材，帮用户真正读懂它。';
    var user = '请拆解下面这段素材。\n\n素材主题：' + (topic || '未指定') +
      '\n\n素材原文：\n"""' + material + '"""\n\n' +
      '输出 JSON，字段如下：\n' +
      '{\n' +
      '  "gist": "用一句话说清这段素材到底在讲什么（不超过40字）",\n' +
      '  "concepts": [{"name":"核心概念名","explain":"用大白话解释它"}],  // 2-5个\n' +
      '  "logic": "作者的论证链条是怎样一步步推出来的（2-4句）",\n' +
      '  "assumptions": ["这段论述依赖的、未被说明的前提假设"],  // 1-3条\n' +
      '  "blindspots": ["这段论述可能被质疑或忽略的地方"],  // 1-3条\n' +
      '  "connections": ["可以联想到的一句话，帮用户把它和自己已有认知连起来"]\n' +
      '}\n' +
      '要求：解释要具体、准确；不要复述原文；不要编造素材中没有的信息。';
    return callJSON(sys, user, { maxTokens: 1400 });
  }

  /* ========== 能力 2：苏格拉底式追问 ========== */
  function probe(material, decomp, round, history) {
    var sys = PERSONA + '你的任务是用"苏格拉底式追问"帮助用户把知识内化成自己的理解。';
    var context = '素材原文：\n"""' + (material || '') + '"""\n\n' +
      '已做的拆解：' + JSON.stringify(decomp || {}) + '\n\n' +
      (history && history.length ? '已往问答：\n' + history.map(function (h, i) {
        return (i + 1) + '. 问：' + h.q + '\n   用户答：' + (h.a || '（未作答）');
      }).join('\n') + '\n\n' : '');
    var user = context + (round === 1
      ? '请提出 3 个层层递进的问题，从第 1 轮开始：先问"理解"，再问"迁移"，最后问"质疑"。'
      : '这是第 ' + round + ' 轮追问。基于用户前面的回答，再提出 3 个更深入、更贴近他自己处境的问题；避免重复之前问过的角度。') +
      '\n\n输出 JSON：\n' +
      '{\n' +
      '  "questions": [\n' +
      '    {"level":"理解|迁移|质疑","q":"问题的具体表述","hint":"回答这个问题时可以想的方向（一句话）"}\n' +
      '  ]\n' +
      '}\n' +
      '要求：问题必须紧扣这段素材和用户已写的回答，不要泛泛而谈；每个问题都要能引发真正的思考，而不是 Yes/No。';
    return callJSON(sys, user, { maxTokens: 900, temperature: 0.8 });
  }

  /* ========== 能力 3：AI 辅助创作 ========== */
  function create(material, decomp, answers, form, topic) {
    var forms = {
      note: '一张"知识卡"：包含【一句话结论】【关键要点3条】【我的理解】【可用于什么场景】，简洁凝练',
      essay: '一篇结构完整的短文：有明确开头观点、2-3段论证、一个具体例子、结尾收束（约500字）',
      talk: '一份3分钟口述稿：口语化、有节奏、开头能抓住人、结尾有落点（约600字）',
      viewpoint: '一段有力的观点陈述：先立论、再给出最有说服力的理由、预留一处反面回应（约300字）'
    };
    var sys = PERSONA + '你的任务是"辅助创作"：基于用户已经理解并回答过的内容，帮他写出初稿。' +
      '重要：初稿要体现用户的观点和他自己写下的思考，你的语言只是把它组织清楚；不要凭空拔高，不要写成套话。';
    var user = '创作形式：' + (forms[form] || forms.note) + '\n\n' +
      '素材主题：' + (topic || '未指定') + '\n' +
      '素材原文：\n"""' + (material || '') + '"""\n\n' +
      '拆解理解：' + JSON.stringify(decomp || {}) + '\n\n' +
      '用户自己的思考与回答：\n' + JSON.stringify(answers || []) + '\n\n' +
      '请写出初稿。输出 JSON：\n' +
      '{\n  "title": "给这篇初稿起个小标题",\n  "body": "初稿全文（用\\n表示分段）"\n}\n' +
      '要求：body 里不要使用 Markdown 标记；内容必须建立在用户提供的素材和回答之上。';
    return callJSON(sys, user, { maxTokens: 1800, temperature: 0.75 });
  }

  /* ========== 能力 4：点评与润色建议 ========== */
  function critique(draft, form) {
    var sys = PERSONA + '你的任务是"点评文本"：针对文本本身给出具体、可操作的改进意见，肯定优点但不空泛夸奖。';
    var user = '请点评下面这段创作（形式：' + (form || '创作') + '）：\n\n"""' + (draft || '') + '"""\n\n' +
      '输出 JSON：\n' +
      '{\n' +
      '  "score": 75,  // 0-100 的综合分，仅作参考\n' +
      '  "dims": [{"name":"观点清晰","score":80,"comment":"一句话具体评价"},{"name":"论证有力","score":70,"comment":"..."},{"name":"结构完整","score":85,"comment":"..."},{"name":"语言简洁","score":75,"comment":"..."}],\n' +
      '  "strength": "这段写得最好的地方，指出具体句子或做法",\n' +
      '  "improve": ["最值得改的第1点，要具体到怎么改","第2点"],\n' +
      '  "polished": "在尽量保留原意和原声的前提下，给出一版润色后的全文"\n' +
      '}\n' +
      '要求：comment 和 improve 必须具体，禁止"可以再加强""继续努力"这类空话。';
    return callJSON(sys, user, { maxTokens: 1800, temperature: 0.6 });
  }

  /* ========== 能力 5：表达练习深度反馈（五维） ========== */
  function expressFeedback(content, mode, topic) {
    var sys = PERSONA + '你的任务是"评价一段表达练习"，按五个维度给出参考分和具体建议。';
    var user = '练习题目：' + (topic || '未指定') + '\n形式：' + (mode || '表达') + '\n\n' +
      '用户的表达：\n"""' + content + '"""\n\n' +
      '输出 JSON：\n' +
      '{\n' +
      '  "total": 78,  // 0-100 综合参考分\n' +
      '  "dims": [\n' +
      '    {"name":"观点清晰度","score":80,"level":"良","comment":"具体评价，引用文本中的地方"},\n' +
      '    {"name":"逻辑结构","score":70,"level":"良","comment":"..."},\n' +
      '    {"name":"具体事例","score":60,"level":"待加强","comment":"..."},\n' +
      '    {"name":"语言简洁度","score":85,"level":"优","comment":"..."},\n' +
      '    {"name":"独立判断","score":75,"level":"良","comment":"..."}\n' +
      '  ],\n' +
      '  "strength": "这段表达最出色的具体一点",\n' +
      '  "advice": "最值得优先改进的一点，给出可直接照做的写法建议",\n' +
      '  "rewriteHint": "如果要更进一步，可以从哪个角度补充（一句话）"\n' +
      '}\n' +
      'level 按 score 映射：>=85 优，>=70 良，其余 待加强。' +
      '要求：分数是自查参考不是评判；每条 comment 都要指向文本里的具体句子；不要替用户重写全文。';
    return callJSON(sys, user, { maxTokens: 1600, temperature: 0.6 });
  }

  /* ========== 能力 6：每日记录洞察 ========== */
  function recordInsight(record) {
    var sys = PERSONA + '你的任务是从用户的每日记录里，提炼出他自己可能没注意到的洞察，帮助他更好地认识自己。';
    var a = record.answers || {};
    var user = '这是一条每日成长记录（' + (record.date || '') + '）：\n\n' +
      '发生的事：' + (a.event || '（未写）') + '\n' +
      '当时感受：' + (a.feel || '（未写）') + '\n' +
      '第一反应：' + (a.react || '（未写）') + '\n' +
      '事实与推测：' + (a.factGuess || a.fact || a.guess || '（未写）') + '\n' +
      '其他理解：' + (a.other || '（未写）') + '\n' +
      '形成的观点：' + (a.view || '（未写）') + '\n' +
      '采取的行动：' + (a.action || '（未写）') + '\n\n' +
      '输出 JSON：\n' +
      '{\n' +
      '  "gist": "一句话概括这条记录的核心（30字内）",\n' +
      '  "insights": ["从记录中看到的1-2个具体洞察，要引用记录里的原话做依据"],\n' +
      '  "blindspot": "一个值得留意的盲点或可以换的角度（温和、就事论事）",\n' +
      '  "question": "一个能推动他继续想下去的问题",\n' +
      '  "nextStep": "一个具体到可以马上做的小行动"\n' +
      '}\n' +
      '要求：只依据他写下的内容，不脑补、不做心理诊断、不给人格标签；语气克制、有启发。';
    return callJSON(sys, user, { maxTokens: 1200, temperature: 0.7 });
  }

  /* ========== 能力 7：周报深度分析 ========== */
  function weeklyInsight(summary) {
    var sys = PERSONA + '你的任务是阅读用户一周的记录摘要，给出有依据的成长分析。';
    var user = '这是用户本周的真实记录摘要（已按主题整理，均来自他本人写下的内容）：\n\n' +
      JSON.stringify(summary, null, 2) + '\n\n' +
      '输出 JSON：\n' +
      '{\n' +
      '  "headline": "一句话点出这一周最值得注意的变化或状态（30字内）",\n' +
      '  "themes": [{"name":"反复出现的主题","evidence":"引用哪些日期/原话作为依据","meaning":"这可能意味着什么"}],  // 1-3个\n' +
      '  "growth": ["本周可见的具体进步，必须指向记录里的证据"],\n' +
      '  "blindspot": "一个值得留意的思维或行动盲点，温和、就事论事",\n' +
      '  "nextFocus": "下周最值得聚焦的一个方向",\n' +
      '  "microActions": ["一个具体到本周就能做的小行动","第二个"]\n' +
      '}\n' +
      '要求：每个结论都要能对应到摘要里的具体记录；证据不足就少说，绝不编造进步；不对人格做定性判断。';
    return callJSON(sys, user, { maxTokens: 1800, temperature: 0.65 });
  }

  /* ---------- 连接测试 ---------- */
  function testConnection() {
    return chat([
      { role: 'system', content: '你是一个连通性测试助手。' },
      { role: 'user', content: '请只回复两个字：正常' }
    ], { maxTokens: 20, temperature: 0 });
  }

  global.AI = {
    DEFAULT: DEFAULT,
    PROVIDERS: PROVIDERS,
    getConfig: getConfig,
    saveConfig: saveConfig,
    isReady: isReady,
    maskKey: maskKey,
    chat: chat,
    parseJSON: parseJSON,
    decompose: decompose,
    probe: probe,
    create: create,
    critique: critique,
    expressFeedback: expressFeedback,
    recordInsight: recordInsight,
    weeklyInsight: weeklyInsight,
    testConnection: testConnection
  };
})(window);
