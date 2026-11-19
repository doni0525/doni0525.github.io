/* ============================================================
   见己 · 数据层  Store
   基于 localStorage 的本地持久化（离线可用、数据不出本机）
   抽象为统一接口，便于日后迁移到 IndexedDB / 云端
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'jianji.data.v1';

  var DEFAULT = {
    version: 1,
    createdAt: '',
    records: [],      // 每日成长记录
    thoughts: [],     // 独立思考训练
    expressions: [],  // 表达练习
    opinions: [],     // 观点库
    reports: [],      // 已生成的周报快照
    settings: {
      theme: 'light',             // light | dark | system
      remindDaily: { on: false, time: '21:00' },
      remindWeekly: { on: false, day: '周日', time: '20:00' },
      lastReportWeek: ''
    }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function todayStr(d) {
    d = d || new Date();
    var y = d.getFullYear(), m = ('0' + (d.getMonth() + 1)).slice(-2), day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }

  var Store = {
    data: null,
    _listeners: [],

    init: function () {
      var raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { }
      if (raw) {
        try {
          this.data = JSON.parse(raw);
          // 补齐字段，兼容旧版本
          var d = this.data;
          ['records', 'thoughts', 'expressions', 'opinions', 'reports'].forEach(function (k) {
            if (!Array.isArray(d[k])) d[k] = [];
          });
          d.settings = Object.assign(clone(DEFAULT.settings), d.settings || {});
          d.settings.remindDaily = Object.assign(clone(DEFAULT.settings.remindDaily), d.settings.remindDaily || {});
          d.settings.remindWeekly = Object.assign(clone(DEFAULT.settings.remindWeekly), d.settings.remindWeekly || {});
        } catch (e) {
          this.data = clone(DEFAULT);
        }
      } else {
        this.data = clone(DEFAULT);
        this.data.createdAt = new Date().toISOString();
      }
      this.save();
      return this.data;
    },

    save: function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
        this._emit();
        return true;
      } catch (e) {
        if (global.App && App.toast) App.toast('保存失败：本地空间可能已满，请导出备份');
        return false;
      }
    },

    onChange: function (fn) { this._listeners.push(fn); },
    _emit: function () { this._listeners.forEach(function (f) { try { f(); } catch (e) { } }); },

    /* ---------- 通用集合操作 ---------- */
    all: function (name) { return this.data[name] || []; },
    find: function (name, id) {
      return (this.data[name] || []).filter(function (x) { return x.id === id; })[0] || null;
    },
    upsert: function (name, item) {
      var arr = this.data[name];
      var idx = -1;
      for (var i = 0; i < arr.length; i++) { if (arr[i].id === item.id) { idx = i; break; } }
      if (idx >= 0) arr[idx] = Object.assign({}, arr[idx], item);
      else arr.unshift(item);
      this.save();
      return item;
    },
    remove: function (name, id) {
      this.data[name] = (this.data[name] || []).filter(function (x) { return x.id !== id; });
      this.save();
    },

    /* ---------- 记录 ---------- */
    getRecordByDate: function (date) {
      return this.all('records').filter(function (r) { return r.date === date; })[0] || null;
    },
    saveRecord: function (rec) {
      var now = new Date().toISOString();
      rec.id = rec.id || uid();
      rec.createdAt = rec.createdAt || now;
      rec.updatedAt = now;
      return this.upsert('records', rec);
    },

    /* ---------- 思考 / 表达 ---------- */
    getThoughtByDate: function (date) {
      return this.all('thoughts').filter(function (r) { return r.date === date; })[0] || null;
    },
    saveThought: function (t) {
      var now = new Date().toISOString();
      t.id = t.id || uid(); t.createdAt = t.createdAt || now; t.updatedAt = now;
      return this.upsert('thoughts', t);
    },
    saveExpression: function (e) {
      var now = new Date().toISOString();
      e.id = e.id || uid(); e.createdAt = e.createdAt || now; e.updatedAt = now;
      return this.upsert('expressions', e);
    },

    /* ---------- 观点库 ---------- */
    saveOpinion: function (o) {
      var now = new Date().toISOString();
      o.id = o.id || uid(); o.createdAt = o.createdAt || now; o.updatedAt = now;
      o.timeline = o.timeline || [];
      return this.upsert('opinions', o);
    },
    addOpinion: function (text, topic, source, date) {
      date = date || todayStr();
      var op = {
        id: uid(), text: text, topic: topic || '自我认识',
        status: 'pending', source: source || '手动添加', date: date,
        timeline: [{ date: date, text: text }],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      this.data.opinions.unshift(op);
      this.save();
      return op;
    },

    /* ---------- 周报 ---------- */
    getReport: function (weekKey) {
      return this.all('reports').filter(function (r) { return r.weekKey === weekKey; })[0] || null;
    },
    saveReport: function (r) {
      r.id = r.id || uid();
      r.generatedAt = new Date().toISOString();
      return this.upsert('reports', r);
    },

    /* ---------- 设置 ---------- */
    setting: function (k) { return this.data.settings[k]; },
    setSetting: function (k, v) { this.data.settings[k] = v; this.save(); },

    /* ---------- 导入导出 ---------- */
    exportJSON: function () { return JSON.stringify(this.data, null, 2); },
    importJSON: function (text) {
      var obj = JSON.parse(text);
      if (!obj || typeof obj !== 'object' || !Array.isArray(obj.records)) {
        throw new Error('文件格式不正确');
      }
      var d = clone(DEFAULT);
      d = Object.assign(d, obj);
      ['records', 'thoughts', 'expressions', 'opinions', 'reports'].forEach(function (k) {
        if (!Array.isArray(d[k])) d[k] = [];
      });
      d.settings = Object.assign(clone(DEFAULT.settings), d.settings || {});
      this.data = d;
      this.save();
      return true;
    },
    clearAll: function () {
      this.data = clone(DEFAULT);
      this.data.createdAt = new Date().toISOString();
      this.save();
    },

    utility: { uid: uid, todayStr: todayStr, clone: clone }
  };

  global.Store = Store;
})(window);
