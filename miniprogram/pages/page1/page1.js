// ==================== 食光机 - 首页逻辑 ====================
const api = require('../../utils/api');
const util = require('../../utils/util');
const app = getApp();

Page({
  data: {
    isLoading: true,
    greeting: '',
    greetingSub: '用胶片记录每一餐的美好',
    viewMode: 'calendar',
    calYear: 2025,
    calMonth: 1,
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],
    foodDates: {},
    foodCount: 0,
    selectedDayFood: null,
    banners: [],
    leftFoods: [],
    rightFoods: [],
    toastText: '',
    toastShow: false
  },

  onLoad: function () {
    this.setGreeting();
    var now = new Date();
    this.setData({ calYear: now.getFullYear(), calMonth: now.getMonth() + 1 });
    this.loadData();
  },

  onShow: function () {
    this.loadData();
  },

  // ---------------------------- 问候语 ----------------------------
  setGreeting: function () {
    var hour = new Date().getHours();
    var greet = '你好';
    if (hour < 6) greet = '夜深了';
    else if (hour < 9) greet = '早上好';
    else if (hour < 12) greet = '上午好';
    else if (hour < 14) greet = '中午好';
    else if (hour < 18) greet = '下午好';
    else if (hour < 22) greet = '晚上好';
    else greet = '夜深了';
    this.setData({ greeting: greet });
  },

  // ---------------------------- 数据加载 ----------------------------
  loadData: function () {
    var that = this;
    api.getHomeData().then(function (res) {
      var data = res || {};
      var foods = data.foods || [];
      var foodMap = {};
      foods.forEach(function (f) {
        if (f.date) foodMap[f.date] = f;
      });

      var left = [], right = [];
      util.waterfallDistribute(foods, left, right);

      that.setData({
        banners: data.banners || [],
        foods: foods,
        foodDates: foodMap,
        leftFoods: left,
        rightFoods: right,
        isLoading: false
      });

      that.generateCalendar();
    }).catch(function (err) {
      console.error('首页数据加载失败:', err);
      that.setData({ isLoading: false });
      that.showToast('数据加载失败，请下拉刷新');
    });
  },

  // ---------------------------- 日历 ----------------------------
  generateCalendar: function () {
    var year = this.data.calYear;
    var month = this.data.calMonth;
    var firstDay = new Date(year, month - 1, 1);
    var startDay = firstDay.getDay();
    var daysInMonth = new Date(year, month, 0).getDate();
    var prevMonthDays = new Date(year, month - 1, 0).getDate();

    var days = [];
    // 上月填充
    for (var i = startDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        month: 'prev',
        date: year + '-' + String(month - 1 || 12).padStart(2, '0') + '-' + String(prevMonthDays - i).padStart(2, '0')
      });
    }
    // 当月
    var count = 0;
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var hasFood = !!this.data.foodDates[dateStr];
      if (hasFood) count++;
      days.push({
        day: d,
        month: 'current',
        date: dateStr,
        hasFood: hasFood
      });
    }
    // 下月填充
    var remaining = 42 - days.length;
    for (var n = 1; n <= remaining; n++) {
      var nextMonth = month + 1 > 12 ? 1 : month + 1;
      days.push({
        day: n,
        month: 'next',
        date: year + '-' + String(nextMonth).padStart(2, '0') + '-' + String(n).padStart(2, '0')
      });
    }

    this.setData({ calendarDays: days, foodCount: count });
  },

  prevMonth: function () {
    var y = this.data.calYear;
    var m = this.data.calMonth;
    if (m === 1) { y--; m = 12; } else { m--; }
    this.setData({ calYear: y, calMonth: m });
    this.generateCalendar();
  },

  nextMonth: function () {
    var y = this.data.calYear;
    var m = this.data.calMonth;
    if (m === 12) { y++; m = 1; } else { m++; }
    this.setData({ calYear: y, calMonth: m });
    this.generateCalendar();
  },

  onDayTap: function (e) {
    var date = e.currentTarget.dataset.date;
    var food = this.data.foodDates[date];
    this.setData({ selectedDayFood: food || null });
  },

  // ---------------------------- 视图切换 ----------------------------
  switchView: function (e) {
    var mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  // ---------------------------- Toast ----------------------------
  showToast: function (text) {
    var that = this;
    this.setData({ toastText: text, toastShow: true });
    setTimeout(function () {
      that.setData({ toastShow: false });
    }, 2000);
  },

  // ---------------------------- 下拉刷新 ----------------------------
  onPullDownRefresh: function () {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
