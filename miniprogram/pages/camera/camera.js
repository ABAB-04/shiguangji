// ==================== 食光机 - 拍照记录页逻辑 ====================
const colorExtractor = require('../../utils/colorExtractor');
const util = require('../../utils/util');
const contentSecurity = require('../../utils/contentSecurity');
const app = getApp();

Page({
  data: {
    capturedImage: '',
    showResult: false,
    extractedColors: [],
    foodName: '',
    foodDesc: '',

    // 心情记录
    selectedMood: '',
    feeling: '',
    moodList: [
      { emoji: '😋', label: '好吃', value: 'yummy' },
      { emoji: '😍', label: '超爱', value: 'love' },
      { emoji: '🤤', label: '满足', value: 'satisfied' },
      { emoji: '😌', label: '舒适', value: 'cozy' },
      { emoji: '🤔', label: '还行', value: 'ok' },
      { emoji: '😢', label: '踩雷', value: 'bad' }
    ],

    saving: false,
    scrollHeight: 0,
    _extractW: 1,
    _extractH: 1,

    // 盲盒
    showBlindBox: false,
    blindBox: { emoji: '', tag: '', desc: '' },

    toastText: '',
    toastShow: false
  },

  onLoad: function () {
    // 计算编辑区滚动高度：屏幕 - 头部(50px) - 底部按钮(70px)
    var sys = wx.getWindowInfo();
    this.setData({ scrollHeight: sys.windowHeight - 50 - 70 });
  },

  // ---------------------------- 拍照 ----------------------------
  onTakePhoto: function () {
    var self = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: function (res) {
        self.processPhoto(res.tempFilePaths[0]);
      },
      fail: function (err) {
        if (err.errMsg.indexOf('cancel') === -1) {
          self.showToast('拍照失败，请重试');
        }
      }
    });
  },

  // ---------------------------- 相册选择 ----------------------------
  onChooseFromAlbum: function () {
    var self = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: function (res) {
        self.processPhoto(res.tempFilePaths[0]);
      },
      fail: function (err) {
        if (err.errMsg.indexOf('cancel') === -1) {
          self.showToast('选择照片失败');
        }
      }
    });
  },

  // ---------------------------- 处理照片 ----------------------------
  processPhoto: function (imagePath) {
    var self = this;

    // 先随机色卡，立即进入编辑模式
    var fallbackColors = util.extractColors(5);
    this.setData({
      capturedImage: imagePath,
      extractedColors: fallbackColors,
      showResult: true,
      toastShow: false,
      foodName: '',
      foodDesc: '',
      selectedMood: '',
      feeling: ''
    });

    // 后台提取真实颜色（extractor 内部已有 3 秒超时保护）
    colorExtractor.extractColors(imagePath, 5).then(function (realColors) {
      self.setData({ extractedColors: realColors });
    });
  },

  // ---------------------------- 重拍 ----------------------------
  onRetake: function () {
    this.setData({
      showResult: false,
      capturedImage: '',
      extractedColors: [],
      foodName: '',
      foodDesc: '',
      selectedMood: '',
      feeling: ''
    });
  },

  // ---------------------------- 关闭 ----------------------------
  onClose: function () {
    wx.navigateBack();
  },

  // ---------------------------- 输入处理 ----------------------------
  onFoodNameInput: function (e) { this.setData({ foodName: e.detail.value }); },
  onFoodDescInput: function (e) { this.setData({ foodDesc: e.detail.value }); },
  onFeelingInput: function (e) { this.setData({ feeling: e.detail.value }); },

  // ---------------------------- 心情选择 ----------------------------
  onSelectMood: function (e) {
    var mood = e.currentTarget.dataset.mood;
    // 点击同一个取消选择
    this.setData({
      selectedMood: this.data.selectedMood === mood ? '' : mood
    });
  },

  // ---------------------------- 保存（含内容安全检测） ----------------------------
  onSave: function () {
    var self = this;
    var foodName = this.data.foodName.trim();
    var foodDesc = this.data.foodDesc.trim();
    var feeling = this.data.feeling.trim();
    var mood = this.data.selectedMood;

    if (!foodName) {
      wx.showToast({ title: '请输入食物名称', icon: 'none' });
      return;
    }
    if (this.data.saving) return;

    this.setData({ saving: true });

    // 第一步：检测文字内容安全（将所有用户输入文字合并检测）
    wx.showLoading({ title: '安全检测中...' });
    var allText = [foodName, foodDesc, feeling].filter(function (t) { return t; }).join('，');

    contentSecurity.checkText(allText).then(function (result) {
      if (!result.pass) {
        wx.hideLoading();
        self.setData({ saving: false });
        contentSecurity.showViolationToast();
        return Promise.reject('text_check_failed');
      }

      // 第二步：压缩并上传图片
      wx.showLoading({ title: '上传中...' });
      return util.compressImage(self.data.capturedImage, 60);
    }).then(function (compressedPath) {
      var cloudPath = 'foods/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.jpg';
      return wx.cloud.uploadFile({ cloudPath: cloudPath, filePath: compressedPath });
    }).then(function (uploadRes) {
      // 第三步：检测图片内容安全
      wx.showLoading({ title: '图片检测中...' });
      return contentSecurity.checkImage(uploadRes.fileID).then(function (imgResult) {
        if (!imgResult.pass) {
          // 图片违规，删除已上传的文件
          wx.cloud.deleteFile({ fileList: [uploadRes.fileID] }).catch(function () {});
          wx.hideLoading();
          self.setData({ saving: false });
          contentSecurity.showViolationToast();
          return Promise.reject('image_check_failed');
        }
        return uploadRes;
      });
    }).then(function (uploadRes) {
      // 第四步：写入云数据库
      wx.showLoading({ title: '保存中...' });
      var db = wx.cloud.database();
      return db.collection('foods').add({
        data: {
          title: foodName,
          desc: foodDesc || '',
          image: uploadRes.fileID,
          colors: self.data.extractedColors,
          tags: self.generateTags(foodName),
          date: util.getTodayStr(),
          mood: mood || '',
          feeling: feeling || '',
          _createTime: db.serverDate()
        }
      });
    }).then(function () {
      wx.hideLoading();
      self.setData({ saving: false });

      // 清除缓存
      app.globalData.foods = [];

      // 盲盒彩蛋
      var box = self.getRandomBlindBox(foodName, mood, self.data.extractedColors);
      self.setData({
        showResult: false,
        capturedImage: '',
        foodName: '', foodDesc: '',
        selectedMood: '', feeling: '',
        showBlindBox: true,
        blindBox: box
      });
    }).catch(function (err) {
      // 内容违规已在上方处理，此处跳过
      if (err === 'text_check_failed' || err === 'image_check_failed') {
        return;
      }
      wx.hideLoading();
      console.error('保存失败:', err);
      self.setData({ saving: false });
      self.showToast('保存失败，请重试');
    });
  },

  // ---------------------------- 标签生成 ----------------------------
  generateTags: function (name) {
    var tags = [];
    var keywordMap = {
      '面': ['面食', '主食'], '饭': ['米饭', '主食'],
      '鱼': ['鱼类', '海鲜'], '虾': ['海鲜'],
      '鸡': ['禽肉'], '鸭': ['禽肉'],
      '猪': ['猪肉'], '牛': ['牛肉'], '羊': ['羊肉'],
      '汤': ['汤品'], '茶': ['饮品', '点心'],
      '包': ['面点', '小吃'], '饺': ['面点', '小吃'],
      '饼': ['面食', '小吃'], '锅': ['火锅'],
      '菜': ['蔬菜', '素食'], '豆': ['豆制品'],
      '蛋': ['蛋类'], '炒': ['热菜'],
      '蒸': ['蒸菜'], '烤': ['烧烤'], '炸': ['炸物', '小吃']
    };
    for (var key in keywordMap) {
      if (name.indexOf(key) !== -1) tags = tags.concat(keywordMap[key]);
    }
    var unique = [];
    for (var i = 0; i < tags.length; i++) {
      if (unique.indexOf(tags[i]) === -1) unique.push(tags[i]);
    }
    return unique.slice(0, 3).length > 0 ? unique.slice(0, 3) : ['美食'];
  },

  // ---------------------------- 盲盒 ----------------------------
  getRandomBlindBox: function (foodName, mood, colors) {
    // 心情点评
    var moodMessages = {
      'yummy': '看来这道菜深得你心！',
      'love': '这道菜要加入常点清单了！',
      'satisfied': '美食总能给人满满的幸福感~',
      'cozy': '吃得舒服最重要！',
      'ok': '下一顿会更好~',
      'bad': '踩雷没关系，下次避开就好！'
    };
    var moodMsg = moodMessages[mood] || '每一餐都值得被记录';

    // 色系点评
    var colorComments = [];
    var avgR = 0, avgG = 0, avgB = 0;
    for (var i = 0; i < colors.length; i++) {
      var h = colors[i].replace('#', '');
      avgR += parseInt(h.substring(0, 2), 16);
      avgG += parseInt(h.substring(2, 4), 16);
      avgB += parseInt(h.substring(4, 6), 16);
    }
    avgR /= colors.length; avgG /= colors.length; avgB /= colors.length;

    if (avgR > avgB + 30 && avgR > avgG + 20) colorComments = ['暖阳色系 ☀️', '温暖的色调让人食欲大开'];
    else if (avgG > avgR && avgG > avgB) colorComments = ['清新自然色系 🌿', '绿色代表新鲜与生命力'];
    else if (avgR + avgG + avgB > 600) colorComments = ['明亮轻快色系 ✨', '色泽淡雅，像一幅水彩画'];
    else if (avgR + avgG + avgB < 300) colorComments = ['浓郁深沉色系 🖤', '深色调自带高级感'];
    else colorComments = ['莫兰迪色系 🎨', '低饱和度的高级灰调'];

    var boxes = [
      { emoji: '🌟', tag: mood ? moodMsg : '今日记录', desc: colorComments[1] },
      { emoji: '🎨', tag: colorComments[0], desc: colorComments[1] },
      { emoji: '📝', tag: '记录心得', desc: '用美食日记，留住每一刻的味觉记忆' },
      { emoji: '🔥', tag: '最佳搭配', desc: foodName + ' + 一碗白米饭 = 人间至味' },
      { emoji: '💡', tag: '小提示', desc: foodName.indexOf('面') !== -1 ? '面条过凉水更劲道哦' : '趁热吃永远是第一法则' }
    ];

    return boxes[Math.floor(Math.random() * boxes.length)];
  },

  onCloseBlindBox: function () {
    this.setData({ showBlindBox: false });
    wx.navigateBack();
  },

  // ---------------------------- Toast ----------------------------
  showToast: function (msg) {
    var self = this;
    this.setData({ toastText: msg, toastShow: true });
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(function () {
      self.setData({ toastShow: false });
    }, 2000);
  }
});
