/* ============================================================
   见己 · 周报生成引擎  Report
   全部结论来自用户真实记录并标注日期；证据不足时如实提示。
   纯本地规则生成，不编造进步，不对人格做定性判断。
   ============================================================ */
(function (global) {
  'use strict';

  function parseDate(s) { return new Date((s || '') + 'T00:00:00'); }
  function fmt(s) {
    var d = parseDate(s);
    var wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + wd;
  }
  function inWeek(dateStr, start, end) {
    var d = parseDate(dateStr).getTime();
    return d >= start.getTime() && d <= end.getTime();
  }
  // 某周一为起点的周范围
  function weekRange(baseDate) {
    var d = baseDate ? new Date(baseDate) : new Date();
    var day = d.getDay(); // 0=周日
    var diff = (day === 0 ? -6 : 1) - day;
    var mon = new Date(d); mon.setDate(d.getDate() + diff); mon.setHours(0, 0, 0, 0);
    var sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
    return { start: mon, end: sun, key: Store.utility.todayStr(mon) };
  }
  function label(start, end) {
    function s(d) { return (d.getMonth() + 1) + '.' + d.getDate(); }
    return s(start) + ' — ' + s(end);
  }

  function generate(data, baseDate) {
    var wr = weekRange(baseDate);
    var records = data.records.filter(function (r) { return r.status === 'done' && inWeek(r.date, wr.start, wr.end); });
    var thoughts = data.thoughts.filter(function (t) { return inWeek(t.date, wr.start, wr.end) && (t.steps && Object.values(t.steps).some(Boolean)); });
    var exprs = data.expressions.filter(function (e) { return inWeek(e.date, wr.start, wr.end); });

    // 真实行动：来自记录中的 action 字段
    var actions = [];
    records.forEach(function (r) {
      if (r.answers && r.answers.action && r.answers.action.trim()) actions.push({ date: r.date, text: r.answers.action.trim() });
    });

    // 候选观点：记录的 view + 思考的 revise/view + 表达练习的题目（作为观点线索）
    var candidateOpinions = [];
    records.forEach(function (r) {
      if (r.answers && r.answers.view && r.answers.view.trim()) candidateOpinions.push({ date: r.date, text: r.answers.view.trim(), from: '记录' });
    });
    thoughts.forEach(function (t) {
      var v = t.steps && (t.steps.revise || t.steps.view);
      if (v && v.trim()) candidateOpinions.push({ date: t.date, text: v.trim(), from: '思考' });
    });

    var enough = records.length >= 2 || (records.length + thoughts.length + exprs.length) >= 3;

    // 3 个重要观点（取有代表性的，标注日期）
    var topOpinions = candidateOpinions.slice(0, 3).map(function (o) {
      return { date: o.date, text: o.text.length > 34 ? o.text.slice(0, 34) + '…' : o.text, full: o.text, from: o.from };
    });

    // 反复出现的思维模式：基于关键词出现，引用真实日期
    var patterns = [];
    var selfDoubtRe = /(不够好|是不是我|我是不是|我不行|怀疑自己|否定|自卑|怕别人|不专业)/;
    var doubtRecords = records.filter(function (r) {
      var a = r.answers || {};
      return selfDoubtRe.test((a.feel || '') + (a.react || '') + (a.factGuess || '') + (a.guess || ''));
    });
    if (doubtRecords.length >= 2) {
      patterns.push({
        title: '遇到不顺时，容易先怀疑自己',
        body: '在 ' + doubtRecords.slice(0, 3).map(function (r) { return fmt(r.date); }).join('、') + ' 的记录里，都出现了类似的自我怀疑表述。',
        note: '这是基于文字的观察，不是对你的定性判断。'
      });
    }
    var actionLess = records.filter(function (r) { return !(r.answers && r.answers.action && r.answers.action.trim()); });
    if (actionLess.length >= 2 && actions.length >= 1) {
      patterns.push({
        title: '“想法多、行动记录少”的倾向',
        body: '本周 ' + actionLess.length + ' 条记录里没有写下具体行动，而 ' + fmt(actions[0].date) + ' 记录了一次真实行动。',
        note: '行动本就不必每天都有，这里只是提示记录习惯，不是评价。'
      });
    }

    // 最值得保留的一段原始表达：优先取观点，其次取感受/事件中最长的一段
    var quote = null;
    var quotePool = records.map(function (r) {
      var a = r.answers || {};
      var cands = [a.view, a.other, a.feel, a.event].filter(Boolean).sort(function (x, y) { return y.length - x.length; });
      return cands[0] ? { date: r.date, text: cands[0] } : null;
    }).filter(Boolean);
    if (quotePool.length) {
      quotePool.sort(function (a, b) { return b.text.length - a.text.length; });
      quote = quotePool[0];
    }

    // 表达能力变化：对比本周表达反馈与更早的反馈（诚实处理证据）
    var prevExprs = data.expressions.filter(function (e) { return e.date < wr.key; });
    var change;
    if (exprs.length >= 1 && prevExprs.length >= 1) {
      var lastPrev = prevExprs[0], lastCur = exprs[exprs.length - 1];
      var pv = lastPrev.feedback ? lastPrev.feedback.total : null;
      var cv = lastCur.feedback ? lastCur.feedback.total : null;
      if (pv != null && cv != null) {
        change = { ok: true, text: '表达反馈参考分从 ' + fmt(lastPrev.date) + ' 的 ' + pv + ' 分，到 ' + fmt(lastCur.date) + ' 的 ' + cv + ' 分。分数仅供自查，真正的变化在于你能否举出更具体的例子。' };
      } else { change = { ok: false, text: '证据不足：已有表达记录，但缺少可对比的反馈数据。' }; }
    } else if (exprs.length >= 1) {
      change = { ok: false, text: '证据不足：本周有 ' + exprs.length + ' 次表达练习，但还没有更早的记录可供对比。继续记录，几周后就能看到变化趋势。' };
    } else {
      change = { ok: false, text: '证据不足：本周没有表达练习记录，暂无法判断表达能力变化。' };
    }

    // 下周最值得练习的能力：取本周表达反馈最弱维度；无数据则给中性建议
    var focus;
    if (exprs.length && exprs[exprs.length - 1].feedback) {
      var dims = exprs[exprs.length - 1].feedback.dims || [];
      var weak = dims.slice().sort(function (a, b) { return a.width - b.width; })[0];
      focus = weak ? weak.name : '用具体事例支撑观点';
    } else {
      focus = '把想法落成一个真实的小行动';
    }

    // 3 个微行动（基于本周数据，具体可做）
    var microActions = [];
    if (exprs.length < 2) microActions.push('本周完成 2 次表达练习，每次只写 100 字。');
    else microActions.push('每次表达后，补一句“比如……”的具体场景。');
    if (actions.length < 2) microActions.push('挑一件想起却没做的事，用一个 10 分钟动作完成它，并写进记录。');
    else microActions.push('继续记录真实行动，重点写“做完后发现了什么”。');
    microActions.push('遇到评价时，先在“事实 / 推测”两栏各写一句再下判断。');

    return {
      weekKey: wr.key,
      label: label(wr.start, wr.end),
      generatedAt: new Date().toISOString(),
      counts: { records: records.length, practices: thoughts.length + exprs.length, actions: actions.length },
      enough: enough,
      opinions: topOpinions,
      patterns: patterns,
      quote: quote ? { date: quote.date, text: quote.text } : null,
      change: change,
      focus: focus,
      microActions: microActions.slice(0, 3),
      actions: actions,
      basedOn: { records: records.length, thoughts: thoughts.length, expressions: exprs.length }
    };
  }

  global.Report = { generate: generate, weekRange: weekRange, fmt: fmt };
})(window);
