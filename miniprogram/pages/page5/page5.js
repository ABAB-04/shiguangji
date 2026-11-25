// ==================== 食光机 - 个人中心逻辑 ====================
const api = require('../../utils/api');
const util = require('../../utils/util');
const contentSecurity = require('../../utils/contentSecurity');
const app = getApp();

// 默认头像列表
var AVATARS = ['👨‍🍳', '👩‍🍳', '🍳', '🥘', '🍜', '🍣', '🍰', '🥩', '🫕', '🧑‍🍳'];

Page({
  data: {
    userAvatar: '👨‍🍳',
    userAvatarImage: '',
    userName: '美食记录者',
    userSlogan: '用胶片记录每一餐的美好',

    avatarList: ['👨‍🍳', '👩‍🍳', '🧑‍🍳', '🍳', '🥘', '🍜', '🍣', '🍰', '🥩', '🫕', '🍕', '🥗', '🍔', '🌮', '🍩', '🧁'],
    statFoods: 0,
    statDays: 0,
    statMoods: 0,
    weekMoods: [],
    recentFoods: [],
    about: {
      intro: '食光机是一款复古风格的美食记录应用，用胶片定格每一次味觉记忆。',
      features: ['胶片风格设计', '真实色卡提取', '瀑布流展示', '烹饪计时器', '美食灵感']
    },

    showAvatarPicker: false,
    showNameModal: false,
    nameInput: '',
    showDevModal: false,
    devInfo: {
      name: '杨佳其',
      school: '云南大学',
      major: '信息学院智能与科学专业',
      email: '1990621809@qq.com',
      desc: '此小程序为在校学生独立开发，用于课程期末考核，不做任何盈利或商用活动。如有建议、咨询需求请通过预留邮箱进行联系。'
    }
  },

  onLoad: function () {
    // 读取本地存储的用户信息
    var avatar = wx.getStorageSync('user_avatar') || '👨‍🍳';
    var avatarImage = wx.getStorageSync('user_avatar_image') || '';
    var name = wx.getStorageSync('user_name') || '美食记录者';
    this.setData({ userAvatar: avatar, userAvatarImage: avatarImage, userName: name });
    this.updateSlogan();
    this.loadStats();
    this.loadAbout();
  },

  onShow: function () {
    this.loadStats();
    this.updateSlogan();
  },

  // ---------------------------- 更换头像（弹出选择器）---------------------------
  onChangeAvatar: function () {
    this.setData({ showAvatarPicker: true });
  },
  onSelectAvatar: function (e) {
    var avatar = e.currentTarget.dataset.avatar;
    this.setData({ userAvatar: avatar, userAvatarImage: '', showAvatarPicker: false });
    wx.setStorageSync('user_avatar', avatar);
    wx.removeStorageSync('user_avatar_image');
    wx.vibrateShort({ type: 'light', fail: function () {} });
  },
  onUploadAvatar: function () {
    var self = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var tempPath = res.tempFiles[0].tempFilePath;

        // 内容安全检测
        wx.showLoading({ title: '安全检测中...' });
        contentSecurity.checkImageByBase64(tempPath).then(function (checkResult) {
          wx.hideLoading();
          if (!checkResult.pass) {
            // 图片含违规内容，拒绝使用
            contentSecurity.showViolationToast();
            return;
          }
          // 检测通过，使用该头像
          self.setData({ userAvatarImage: tempPath, showAvatarPicker: false });
          wx.setStorageSync('user_avatar_image', tempPath);
          wx.vibrateShort({ type: 'light', fail: function () {} });
        }).catch(function () {
          wx.hideLoading();
          // 检测服务异常时降级放行
          self.setData({ userAvatarImage: tempPath, showAvatarPicker: false });
          wx.setStorageSync('user_avatar_image', tempPath);
          wx.vibrateShort({ type: 'light', fail: function () {} });
        });
      }
    });
  },
  onHideAvatarPicker: function () {
    this.setData({ showAvatarPicker: false });
  },

  // ---------------------------- 修改昵称 ----------------------------
  onChangeName: function () {
    this.setData({ showNameModal: true, nameInput: this.data.userName });
  },
  onNameInput: function (e) {
    this.setData({ nameInput: e.detail.value });
  },
  onConfirmName: function () {
    var self = this;
    var name = (this.data.nameInput || '').trim();
    if (!name) return;

    name = name.slice(0, 12);

    // 内容安全检测
    wx.showLoading({ title: '安全检测中...' });
    contentSecurity.checkText(name).then(function (result) {
      wx.hideLoading();
      if (!result.pass) {
        contentSecurity.showViolationToast();
        return;
      }
      // 检测通过，保存昵称
      self.setData({ userName: name, showNameModal: false });
      wx.setStorageSync('user_name', name);
      wx.showToast({ title: '昵称已更新', icon: 'success' });
    }).catch(function (err) {
      wx.hideLoading();
      console.error('昵称检测失败:', err);
      // 降级处理：检测服务异常时允许保存
      self.setData({ userName: name, showNameModal: false });
      wx.setStorageSync('user_name', name);
    });
  },
  onHideNameModal: function () {
    this.setData({ showNameModal: false });
  },

  // ---------------------------- 更新标语 ----------------------------
  updateSlogan: function () {
    var hour = new Date().getHours();
    var slogans = {
      morning: ['今天第一餐准备吃什么？', '早餐是一天的开始 ☀️'],
      noon: ['午饭时间到，好好犒劳自己', '美食是生活最好的调味剂'],
      afternoon: ['下午茶时间 ☕', '来点甜点补充能量'],
      evening: ['晚餐是一天的高光时刻 ✨', '好好吃饭，好好生活'],
      night: ['深夜食堂时间 🌙', '回味今天的美食记忆']
    };
    var key;
    if (hour < 9) key = 'morning';
    else if (hour < 12) key = 'noon';
    else if (hour < 14) key = 'noon';
    else if (hour < 18) key = 'afternoon';
    else if (hour < 22) key = 'evening';
    else key = 'night';

    var list = slogans[key];
    var slogan = list[Math.floor(Math.random() * list.length)];
    this.setData({ userSlogan: slogan });
  },

  // ---------------------------- 加载统计数据 ----------------------------
  loadStats: function () {
    var self = this;

    // 美食总数
    api.getFoodsCount().then(function (count) {
      self.setData({
        statFoods: count,
        statDays: Math.max(1, count)
      });
    });

    // 心情统计
    api.getFoodsCount().then(function (count) {
      // 简化：用总数代替心情统计
      self.setData({ statMoods: count });
    });

    // 最近记录
    api.getFoodsPaged(0, 8).then(function (recent) {
      var moods = [];
      var moodEmojiMap = {
        'yummy': '😋', 'love': '😍', 'satisfied': '🤤',
        'cozy': '😌', 'ok': '🤔', 'bad': '😢'
      };
      for (var i = 0; i < recent.length; i++) {
        var r = recent[i];
        if (r.mood && r.date) {
          moods.push({
            emoji: moodEmojiMap[r.mood] || '🍽️',
            date: r.date.slice(5)
          });
        }
      }
      self.setData({
        recentFoods: recent,
        weekMoods: moods.slice(0, 7).reverse()
      });
    });
  },

  // ---------------------------- 加载关于 ----------------------------
  loadAbout: function () {
    var self = this;
    if (app.globalData.about && app.globalData.about.intro) {
      self.setData({ about: app.globalData.about });
    }
    api.getAbout().then(function (about) {
      if (about) {
        app.globalData.about = about;
        self.setData({ about: about });
      }
    });
  },

  // ---------------------------- 最近记录点击 → 跳转图鉴 ----------------------------
  onRecentTap: function (e) {
    var id = e.currentTarget.dataset.id;
    if (id) {
      app.globalData._pendingFoodId = id;
      wx.switchTab({ url: '/pages/page2/page2' });
    }
  },

  // ---------------------------- 关于开发者 ----------------------------
  onShowDeveloper: function () {
    this.setData({ showDevModal: true });
  },
  onHideDeveloper: function () {
    this.setData({ showDevModal: false });
  }
});
