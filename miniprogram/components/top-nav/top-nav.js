// ==================== 顶部导航栏组件 ====================
const app = getApp();

Component({
  properties: {
    title: {
      type: String,
      value: '食光机'
    },
    showBack: {
      type: Boolean,
      value: false
    },
    showMenu: {
      type: Boolean,
      value: false
    }
  },

  data: {
    statusBarHeight: 0,
    navIcon: '🎞️'
  },

  lifetimes: {
    attached: function () {
      this.setData({
        statusBarHeight: app.globalData.statusBarHeight || 20
      });
      // 根据标题自动设置图标
      var iconMap = {
        '食光机': '🎞️',
        '美食图鉴': '📖',
        '美食灵感': '💡',
        '个人中心': '👤',
        '烹饪计时器': '⏰'
      };
      var icon = iconMap[this.properties.title] || '🍽️';
      this.setData({ navIcon: icon });
    }
  },

  methods: {
    onBack: function () {
      this.triggerEvent('backtap');
      wx.navigateBack({ delta: 1 });
    },
    onMenu: function () {
      this.triggerEvent('menutap');
    }
  }
});
