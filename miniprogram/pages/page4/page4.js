// ==================== 食光机 - 烹饪计时器页逻辑 ====================
const app = getApp();

Page({
  data: {
    displayMin: '00',
    displaySec: '00',
    timerLabel: '选择一个预设',
    cookingLabel: '烹饪中...',

    presetIndex: -1,
    customMinutes: 10,

    totalSeconds: 0,
    remainingSeconds: 0,
    isRunning: false,
    isPaused: false,
    isFinished: false,
    statusText: '准备开始',

    canvasWidth: 220,
    canvasHeight: 220
  },

  _timer: null,
  _ringTimer: null,    // 环动画定时器（用 setInterval 替代 requestAnimationFrame）
  _canvasCtx: null,

  onLoad: function () {
    var windowInfo = wx.getWindowInfo();
    var ringSize = Math.min(windowInfo.windowWidth * 0.5, 220);
    this.setData({ canvasWidth: ringSize, canvasHeight: ringSize });
  },

  onReady: function () {
    this.initCanvas();
  },

  onUnload: function () {
    this.clearAllTimers();
    wx.setKeepScreenOn({ keepScreenOn: false });
  },

  // ---------------------------- Canvas 初始化 ----------------------------
  initCanvas: function () {
    var self = this;
    var query = wx.createSelectorQuery();
    query.select('#timerRing').fields({ node: true, size: true }).exec(function (res) {
      if (res[0] && res[0].node) {
        var canvas = res[0].node;
        var dpr = wx.getWindowInfo().pixelRatio || 2;
        canvas.width = self.data.canvasWidth * dpr;
        canvas.height = self.data.canvasHeight * dpr;
        self._canvasCtx = canvas.getContext('2d');
        self._canvasCtx.scale(dpr, dpr);
        self.drawRing(0, false);
      }
    });
  },

  // ---------------------------- 绘制进度环 ----------------------------
  drawRing: function (percent, isRunning) {
    var ctx = this._canvasCtx;
    if (!ctx) return;

    var w = this.data.canvasWidth;
    var h = this.data.canvasHeight;
    var cx = w / 2;
    var cy = h / 2;
    var radius = w / 2 - 16;
    var lineWidth = 10;

    ctx.clearRect(0, 0, w, h);

    // 呼吸光晕（运行时）— 用 Date.now() 驱动动画
    if (isRunning) {
      var glowAlpha = 0.06 + Math.sin(Date.now() / 800) * 0.03;
      var glowGrad = ctx.createRadialGradient(cx, cy, radius - 10, cx, cy, radius + 20);
      glowGrad.addColorStop(0, 'rgba(212,165,116,0)');
      glowGrad.addColorStop(0.5, 'rgba(212,165,116,' + glowAlpha + ')');
      glowGrad.addColorStop(1, 'rgba(212,165,116,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
    }

    // 背景环
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (percent > 0) {
      var startAngle = -Math.PI / 2;
      var endAngle = startAngle + (Math.PI * 2 * percent / 100);

      var gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, isRunning ? '#e8c99b' : '#d4a574');
      gradient.addColorStop(1, isRunning ? '#f0d8b0' : '#c49564');

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 终点光点
      var dotX = cx + radius * Math.cos(endAngle);
      var dotY = cy + radius * Math.sin(endAngle);
      ctx.beginPath();
      ctx.arc(dotX, dotY, lineWidth / 2 + (isRunning ? 2 : 0), 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
  },

  // ---------------------------- 环动画（用 setInterval，兼容真机） ----------------------------
  startRingAnimation: function () {
    var self = this;
    this.stopRingAnimation();
    this._ringTimer = setInterval(function () {
      if (!self.data.isRunning) return;
      var percent = (1 - self.data.remainingSeconds / self.data.totalSeconds) * 100;
      self.drawRing(percent, true);
    }, 50); // 20fps，足够流畅且不费电
  },

  stopRingAnimation: function () {
    if (this._ringTimer) {
      clearInterval(this._ringTimer);
      this._ringTimer = null;
    }
  },

  // ---------------------------- 选择预设 ----------------------------
  onPreset: function (e) {
    if (this.data.isRunning) {
      wx.showToast({ title: '请先停止当前计时', icon: 'none' });
      return;
    }

    var seconds = parseInt(e.currentTarget.dataset.seconds);
    var label = e.currentTarget.dataset.label;
    var idx = parseInt(e.currentTarget.dataset.idx);
    var emoji = e.currentTarget.dataset.emoji || '⏱️';

    if (idx === 7) {
      this.setData({
        presetIndex: 7,
        timerLabel: '自定义时间',
        cookingLabel: emoji + ' 自定义烹饪',
        totalSeconds: this.data.customMinutes * 60,
        remainingSeconds: this.data.customMinutes * 60,
        isPaused: false,
        isFinished: false
      });
    } else {
      this.setData({
        presetIndex: idx,
        timerLabel: label + '计时',
        cookingLabel: emoji + ' ' + label + '中...',
        totalSeconds: seconds,
        remainingSeconds: seconds,
        isPaused: false,
        isFinished: false,
        statusText: '准备开始'
      });
    }

    this.updateDisplay();
    this.drawRing(0, false);
  },

  onCustomChange: function (e) {
    if (this.data.isRunning) return;
    var mins = e.detail.value;
    this.setData({
      customMinutes: mins,
      totalSeconds: mins * 60,
      remainingSeconds: mins * 60,
      timerLabel: mins + '分钟 · 自定义',
      cookingLabel: '⏱️ 自定义烹饪中...'
    });
    this.updateDisplay();
    this.drawRing(0, false);
  },

  // ---------------------------- 开始/暂停 ----------------------------
  onToggleTimer: function () {
    var self = this;

    if (this.data.isRunning) {
      // 暂停
      this.clearAllTimers();
      wx.setKeepScreenOn({ keepScreenOn: false });
      this.setData({ isRunning: false, isPaused: true, statusText: '已暂停' });
      this.drawRing((1 - this.data.remainingSeconds / this.data.totalSeconds) * 100, false);
    } else {
      if (this.data.remainingSeconds <= 0) {
        wx.showToast({ title: '请先选择时间', icon: 'none' });
        return;
      }

      wx.setKeepScreenOn({ keepScreenOn: true });
      this.setData({ isRunning: true, isPaused: false, isFinished: false, statusText: '烹饪中...' });
      this.startRingAnimation();

      this._timer = setInterval(function () {
        var remaining = self.data.remainingSeconds - 1;
        if (remaining <= 0) {
          self.onTimerEnd();
          return;
        }
        self.setData({ remainingSeconds: remaining });
        self.updateDisplay();
      }, 1000);
    }
  },

  // ---------------------------- 重置 ----------------------------
  onReset: function () {
    this.clearAllTimers();
    wx.setKeepScreenOn({ keepScreenOn: false });
    this.setData({
      isRunning: false,
      isPaused: false,
      isFinished: false,
      remainingSeconds: this.data.totalSeconds,
      statusText: '已重置'
    });
    this.updateDisplay();
    this.drawRing(0, false);
  },

  // ---------------------------- 计时结束 ----------------------------
  onTimerEnd: function () {
    this.clearAllTimers();
    wx.setKeepScreenOn({ keepScreenOn: false });

    this.setData({
      isRunning: false,
      isPaused: false,
      isFinished: true,
      remainingSeconds: 0,
      statusText: '⏰ 时间到！'
    });
    this.updateDisplay();
    this.drawRing(100, false);

    wx.vibrateLong({ fail: function () {} });
    setTimeout(function () { wx.vibrateShort({ type: 'heavy', fail: function () {} }); }, 300);

    wx.showModal({
      title: '⏰ 烹饪完成！',
      content: '计时结束，快去享用美食吧~',
      showCancel: false,
      confirmText: '好的',
      confirmColor: '#d4a574'
    });
  },

  // ---------------------------- 辅助 ----------------------------
  updateDisplay: function () {
    var sec = this.data.remainingSeconds;
    var min = Math.floor(sec / 60);
    var s = sec % 60;
    this.setData({
      displayMin: String(min).padStart(2, '0'),
      displaySec: String(s).padStart(2, '0')
    });
  },

  clearAllTimers: function () {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.stopRingAnimation();
  }
});
