// ==================== 食光机 - 美食图鉴页逻辑 ====================
const api = require('../../utils/api');
const util = require('../../utils/util');
const shareCard = require('../../utils/shareCard');
const app = getApp();

Page({
  data: {
    // 加载状态
    isLoading: true,
    isLoadingMore: false,
    hasMore: true,

    // 瀑布流数据
    leftFoods: [],
    rightFoods: [],
    allFoods: [], // 用于瀑布流分配

    // 分页状态
    currentPage: 0,
    totalCount: 0,

    // 当前选中的美食（内联详情模式）
    selectedFood: null,
    // Toast
    toastText: '',
    toastShow: false
  },

  onLoad: function (options) {
    // 从 page1 跳转过来时可能带有 id 参数
    if (options.id) {
      this.loadFoodDetail(options.id);
    }
    this.loadFoodsPaged();
  },

  onShow: function () {
    // 首次加载或数据被清除时重新加载
    if (this.data.allFoods.length === 0) {
      this.loadFoodsPaged();
    }

    // 从 page5 最近记录跳转过来的
    if (app.globalData._pendingFoodId) {
      var id = app.globalData._pendingFoodId;
      app.globalData._pendingFoodId = null;
      // 等数据加载完再查详情
      var self = this;
      setTimeout(function () {
        self.loadFoodDetail(id);
      }, 500);
    }
  },

  // ---------------------------- 分页加载美食 ----------------------------
  loadFoodsPaged: function () {
    var self = this;

    this.setData({ isLoading: true, currentPage: 0 });

    // 先获取总数
    api.getFoodsCount().then(function (total) {
      self.setData({ totalCount: total, hasMore: total > 0 });

      // 加载第一页
      return api.getFoodsPaged(0);
    }).then(function (foods) {
      app.globalData.foods = foods;
      self.setData({
        isLoading: false,
        allFoods: foods,
        currentPage: foods.length,
        hasMore: foods.length < self.data.totalCount,
        leftFoods: util.waterfallDistribute(foods).left,
        rightFoods: util.waterfallDistribute(foods).right
      });
    }).catch(function (err) {
      console.error('加载美食列表失败:', err);
      self.setData({ isLoading: false, hasMore: false });
    });
  },

  // ---------------------------- 触底加载更多 ----------------------------
  onReachBottom: function () {
    var self = this;

    // 正在加载或没有更多数据时不再加载
    if (this.data.isLoadingMore || !this.data.hasMore) {
      return;
    }

    this.setData({ isLoadingMore: true });

    api.getFoodsPaged(this.data.currentPage).then(function (newFoods) {
      if (newFoods.length === 0) {
        self.setData({ hasMore: false, isLoadingMore: false });
        return;
      }

      // 合并数据
      var allFoods = self.data.allFoods.concat(newFoods);
      app.globalData.foods = allFoods;

      self.setData({
        isLoadingMore: false,
        allFoods: allFoods,
        currentPage: self.data.currentPage + newFoods.length,
        hasMore: allFoods.length < self.data.totalCount,
        leftFoods: util.waterfallDistribute(allFoods).left,
        rightFoods: util.waterfallDistribute(allFoods).right
      });
    }).catch(function (err) {
      console.error('加载更多失败:', err);
      self.setData({ isLoadingMore: false });
    });
  },

  // ---------------------------- 下拉刷新 ----------------------------
  onPullDownRefresh: function () {
    this.loadFoodsPaged();
    wx.stopPullDownRefresh();
  },

  // ---------------------------- 加载单条美食详情 ----------------------------
  loadFoodDetail: function (id) {
    var self = this;

    // 先从全局缓存查找
    var cached = app.globalData.foods.find(function (f) {
      return f._id === id || String(f.id) === String(id);
    });

    if (cached) {
      self.setData({ selectedFood: cached });
      return;
    }

    // 从云数据库加载
    api.getFoodDetail(id).then(function (food) {
      self.setData({ selectedFood: food });
    }).catch(function (err) {
      console.error('加载美食详情失败:', err);
      util.showToast('加载失败');
    });
  },

  // ---------------------------- 卡片点击 → 展开详情 ----------------------------
  onFoodTap: function (e) {
    var id = e.detail.id || e.currentTarget.dataset.id;
    if (id) {
      this.loadFoodDetail(id);
    }
  },

  // ---------------------------- 返回画廊列表 ----------------------------
  onBackToList: function () {
    this.setData({ selectedFood: null });
  },

  // ---------------------------- 拍照记录 ----------------------------
  onAddFood: function () {
    wx.navigateTo({
      url: '/pages/camera/camera'
    });
  },

  // ---------------------------- 生成分享卡 ----------------------------
  onGenerateShareCard: function () {
    var self = this;
    var food = this.data.selectedFood;
    if (!food) return;

    wx.showLoading({ title: '正在生成...' });

    shareCard.generateShareCard(food).then(function () {
      wx.hideLoading();
      wx.showToast({ title: '已保存到相册', icon: 'success' });
    }).catch(function (err) {
      wx.hideLoading();
      console.error('分享卡生成失败:', err);
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
    });
  },

  // ---------------------------- 删除记录 ----------------------------
  onDeleteFood: function () {
    var self = this;
    var food = this.data.selectedFood;
    if (!food || !food._id) return;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除「' + food.title + '」吗？此操作不可恢复。',
      confirmText: '删除',
      confirmColor: '#c9302c',
      cancelText: '取消',
      success: function (res) {
        if (res.confirm) {
          var db = wx.cloud.database();
          db.collection('foods').doc(food._id).remove().then(function () {
            // 清除缓存强制刷新
            app.globalData.foods = [];
            self.setData({ selectedFood: null });
            self.loadFoodsPaged();
            wx.showToast({ title: '已删除', icon: 'success' });
          }).catch(function (err) {
            console.error('删除失败:', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  }
});
