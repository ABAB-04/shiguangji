// ==================== 胶片风格卡片组件 ====================
const util = require('../../utils/util');

Component({
  properties: {
    food: {
      type: Object,
      value: {}
    },
    // 是否使用缩略图（列表页用缩略图，详情页用原图）
    useThumbnail: {
      type: Boolean,
      value: true
    }
  },

  data: {
    imageLoaded: false,
    displayImage: '' // 实际显示的图片 URL
  },

  observers: {
    'food.image, useThumbnail': function(image, useThumbnail) {
      if (image) {
        // 列表页使用缩略图，详情页使用原图
        if (useThumbnail) {
          this.setData({ displayImage: util.getThumbnailUrl(image, 300, 300) });
        } else {
          this.setData({ displayImage: image });
        }
      } else {
        this.setData({ displayImage: '' });
      }
    }
  },

  methods: {
    onTap: function () {
      var id = this.data.food._id || this.data.food.id;
      this.triggerEvent('tap', { id: id });
    },

    onImageLoad: function () {
      this.setData({ imageLoaded: true });
    },

    onImageError: function () {
      // 图片加载失败，保持占位状态
      this.setData({ imageLoaded: false });
    }
  }
});
