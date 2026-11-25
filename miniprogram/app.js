// ==================== 食光机 - 微信小程序入口文件 ====================
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: 'cloudbase-d6gd9abpkd54d029f'
    });
    this.loadGlobalData();

    const windowInfo = wx.getWindowInfo();
    const deviceInfo = wx.getDeviceInfo();
    const appBaseInfo = wx.getAppBaseInfo();
    this.globalData.systemInfo = {
      ...windowInfo,
      ...deviceInfo,
      ...appBaseInfo
    };
    this.globalData.statusBarHeight = windowInfo.statusBarHeight;
    this.globalData.navBarHeight = windowInfo.statusBarHeight + 44;
  },

  loadGlobalData: function () {
    console.log('[食光机] 未做预加载，各页面按需查询');
  },

  globalData: {
    systemInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0,
    userInfo: {
      name: '美食记录者',
      avatar: '👨‍🍳'
    },
    banners: [],
    foods: [],
    videos: [],
    audios: [],
    about: {},
    theme: {
      primary: '#d4a574',
      secondary: '#8b7355',
      accent: '#c9302c',
      background: '#1a1a1a',
      cardBg: '#f4f1ea',
      text: '#f0f0f0',
      textDark: '#2c2c2c',
      textLight: '#888888'
    },
    musicState: {
      currentIndex: null,
      playing: false,
      progress: 0,
      audioContext: null
    }
  }
});
