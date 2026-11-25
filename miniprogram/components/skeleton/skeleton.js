// ==================== 骨架屏组件 ====================
Component({
  properties: {
    // 骨架屏类型：calendar | list
    type: {
      type: String,
      value: 'list'
    },
    // 列表骨架屏的卡片数量
    count: {
      type: Number,
      value: 6
    },
    // 是否显示骨架屏
    loading: {
      type: Boolean,
      value: true
    }
  },

  data: {
    // 日历骨架屏的日期占位
    calendarCells: [],
    // 列表骨架屏的卡片占位
    listCards: []
  },

  observers: {
    'type, count': function(type, count) {
      if (type === 'calendar') {
        // 生成 35 个日历格子占位（5行 x 7列）
        var cells = [];
        for (var i = 0; i < 35; i++) {
          cells.push({ index: i });
        }
        this.setData({ calendarCells: cells });
      } else {
        // 生成列表卡片占位
        var cards = [];
        for (var i = 0; i < count; i++) {
          cards.push({
            index: i,
            // 随机高度模拟瀑布流
            height: 120 + Math.floor(Math.random() * 60)
          });
        }
        this.setData({ listCards: cards });
      }
    }
  }
});