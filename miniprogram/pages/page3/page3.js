// ==================== 食光机 - 美食灵感页逻辑 ====================
const api = require('../../utils/api');
const app = getApp();

// 中文类型 → 英文 CSS 类名 key
var TYPE_KEY_MAP = {
  '技巧': 'skill',
  '时令': 'seasonal',
  '趣闻': 'trivia',
  '搭配': 'pairing'
};

function addTypeKey(item) {
  item.typeKey = TYPE_KEY_MAP[item.type] || 'default';
  return item;
}

var FALLBACK_INSPIRATIONS = [
  // 技巧 (6)
  { type: '技巧', icon: '🔪', title: '切肉的顺逆之道', content: '牛肉逆纹切（断纤维更嫩），猪肉斜纹切，鸡肉顺纹切。记住：横切牛羊竖切鸡。', season: '全年' },
  { type: '技巧', icon: '🧂', title: '盐的加入时机', content: '炒青菜最后放盐保脆嫩；炖肉早放盐让肉变硬。蔬菜后放，肉类中途放。', season: '全年' },
  { type: '技巧', icon: '🔥', title: '热锅凉油不粘锅', content: '锅烧到冒烟再放油，油热后倒出，重新加凉油再下食材。物理不粘，铁锅也能煎出完整的鱼。', season: '全年' },
  { type: '技巧', icon: '🥚', title: '完美的溏心蛋', content: '水开后下蛋，中火煮6分30秒，立即冰水浸泡。蛋白全熟、蛋黄流动——黄金时间精准到秒。', season: '全年' },
  { type: '技巧', icon: '🍚', title: '米饭更香的秘诀', content: '淘米不超3次，米水比例1:1.2，煮好后焖10分钟再开盖。滴两滴油饭粒更分明。', season: '全年' },
  { type: '技巧', icon: '🍆', title: '茄子不吸油', content: '切好的茄子撒盐腌15分钟挤掉水分，或者用微波炉先加热2分钟。预处理后茄子不再像海绵一样吸油。', season: '全年' },
  // 时令 (6)
  { type: '时令', icon: '🌸', title: '三月·春笋破土出', content: '清明前的春笋最鲜甜，根部越白越嫩。油焖笋、腌笃鲜、春笋炖排骨——错过等一年。', season: '春季' },
  { type: '时令', icon: '🌸', title: '清明·青团', content: '艾草汁拌入糯米粉，包入豆沙或咸蛋黄肉松，蒸熟后碧绿油亮。一口青团，吃下整个江南的春天。', season: '春季' },
  { type: '时令', icon: '☀️', title: '夏日·瓜果当道', content: '夏天吃瓜正当时。西瓜消暑、冬瓜清热、苦瓜降火、丝瓜养颜。「夏日吃苦胜似进补」。', season: '夏季' },
  { type: '时令', icon: '☀️', title: '盛夏·酸梅汤', content: '乌梅+山楂+甘草+桂花+冰糖，慢火熬一小时。冰镇后酸甜回甘生津止渴，比碳酸饮料健康一百倍。', season: '夏季' },
  { type: '时令', icon: '🍂', title: '九月·蟹肥菊黄', content: '秋风起蟹脚痒。农历九月吃雌蟹（蟹黄饱满），十月吃雄蟹（蟹膏丰腴）。清蒸配姜醋黄酒，人间至味。', season: '秋季' },
  { type: '时令', icon: '❄️', title: '冬日·一锅暖身', content: '冬天是火锅和炖菜的天下。羊肉萝卜汤、酸菜白肉锅——热腾腾一锅，暖身又暖心。', season: '冬季' },
  // 趣闻 (6)
  { type: '趣闻', icon: '📜', title: '豆腐的意外发明', content: '豆腐据说是西汉淮南王刘安炼丹时无意发明的。豆浆和石膏混合凝结成了世界上第一块豆腐。', season: '全年' },
  { type: '趣闻', icon: '📜', title: '辣椒传入才400年', content: '辣椒明朝末年才从美洲传入中国。在此之前中国人用花椒、姜、茱萸获取辣味。川菜的麻辣灵魂其实是外来客。', season: '全年' },
  { type: '趣闻', icon: '📜', title: '火锅的起源', content: '火锅最早可追溯到商周时期的「鼎」，汉代出土的「斗」已接近现代火锅。成吉思汗的骑兵用头盔涮羊肉大概是传说。', season: '全年' },
  { type: '趣闻', icon: '📜', title: '东坡肉的来源', content: '苏东坡被贬黄州时发明了东坡肉。「黄州好猪肉，价贱如泥土」——他用慢火少水炖猪肉，写下了千古名菜的做法。', season: '全年' },
  { type: '趣闻', icon: '📜', title: '宫保鸡丁的名号', content: '「宫保」是官名（太子太保），纪念清朝官员丁宝桢。他家的厨子做得好吃，传到民间成了名菜。', season: '全年' },
  { type: '趣闻', icon: '📜', title: '筷子1800岁了', content: '饺子在东汉末年由医圣张仲景发明，最初是药用。千年来形状基本没变，一弯新月包万物。', season: '全年' },
  // 搭配 (6)
  { type: '搭配', icon: '🍷', title: '红酒配红肉，白酒配白肉', content: '红酒单宁与红肉脂肪结合产生美妙口感；白酒清爽不抢夺白肉的细腻风味。这不是死规矩但很好用。', season: '全年' },
  { type: '搭配', icon: '🫖', title: '什么茶配什么点心', content: '绿茶配绿豆糕，乌龙配蛋黄酥，普洱配肉干，红茶配巧克力。茶苦中和点甜，互相成就。', season: '全年' },
  { type: '搭配', icon: '🍜', title: '番茄+鸡蛋：最稳定的CP', content: '番茄的酸+鸡蛋的香=永恒的经典。番茄炒蛋、番茄蛋汤、番茄蛋面——这对搭档几乎不可能出错。', season: '全年' },
  { type: '搭配', icon: '🥢', title: '菌菇+鸡肉', content: '菌菇的鸟苷酸+鸡肉的谷氨酸，两种鲜味物质叠加产生1+1>2的协同效应。小鸡炖蘑菇就是以此原理称霸。', season: '全年' },
  { type: '搭配', icon: '🍜', title: '炸酱面+生蒜', content: '老北京炸酱面必须配几瓣生蒜。「吃面不吃蒜，香味少一半」。大蒜辛辣与酱香交融是胡同里的经典搭配。', season: '全年' },
  { type: '搭配', icon: '🥢', title: '猪肉+梅干菜', content: '梅干菜经发酵日晒浓缩鲜味，五花肉油脂浸润干菜使其回软——一道扣肉两种惊艳。', season: '全年' }
];

Page({
  data: {
    featured: null,
    allItems: [],
    filteredItems: [],
    activeFilter: '',
    loading: true,
    fromCloud: false,
    debugInfo: '',
    toastText: '',
    toastShow: false
  },

  onLoad: function () {
    this.loadInspirations();
  },

  onShow: function () {
    // 每次进入页面都从云端拉取最新数据
    this.loadInspirations();
  },

  // ---------------------------- 加载灵感数据 ----------------------------
  loadInspirations: function () {
    var self = this;

    // 通过云函数查询（突破客户端 20 条限制）
    api.getInspirations().then(function (items) {
      if (items && items.length > 0) {
        console.log('[美食灵感] 云端加载成功, 共 ' + items.length + ' 条');
        var mapped = items.map(addTypeKey);
        self.setData({ allItems: mapped, loading: false, fromCloud: true, debugInfo: '云端 ' + items.length + ' 条' });
        self.pickFeatured(mapped);
        self.applyShuffle();
      } else {
        console.warn('[美食灵感] 云端无数据，使用离线备用');
        self.setData({ debugInfo: '云端返回空，用离线数据' });
        self.useFallback();
      }
    }).catch(function (err) {
      console.error('[美食灵感] 加载失败:', err.message || err);
      self.setData({ debugInfo: '加载失败，用离线数据' });
      self.useFallback();
    });
  },

  useFallback: function () {
    // 如果已有云端数据不覆盖
    if (this.data.fromCloud && this.data.allItems.length > 0) {
      this.setData({ loading: false });
      return;
    }
    var items = FALLBACK_INSPIRATIONS.map(function (item, index) {
      var mapped = addTypeKey(item);
      mapped._key = 'fallback_' + index; // 确保 wx:key 唯一
      return mapped;
    });
    this.setData({ allItems: items, loading: false, fromCloud: false });
    this.pickFeatured(items);
    this.applyShuffle();
  },

  // ---------------------------- 今日精选 ----------------------------
  pickFeatured: function (items) {
    // 用日期做种子，保证同一天看到同一条精选
    var today = new Date();
    var seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    var idx = seed % items.length;
    this.setData({ featured: items[idx] });
  },

  onFeaturedTap: function () {
    // 点击精选卡片 → 在列表中高亮对应条目（切换到对应筛选）
    var featured = this.data.featured;
    if (featured) {
      this.setData({ activeFilter: featured.type });
      this.applyFilter();
    }
  },

  // ---------------------------- 打乱 + 筛选 ----------------------------
  applyShuffle: function () {
    var items = this.data.allItems.slice();
    // Fisher-Yates
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = items[i]; items[i] = items[j]; items[j] = tmp;
    }
    this.setData({ allItems: items });
    this.applyFilter();
  },

  onShuffle: function () {
    wx.vibrateShort({ type: 'light', fail: function () {} });
    this.applyShuffle();
  },

  // ---------------------------- 随机一条 ----------------------------
  onRandomOne: function () {
    var items = this.data.allItems;
    if (items.length === 0) return;
    var idx = Math.floor(Math.random() * items.length);
    var item = items[idx];

    wx.vibrateShort({ type: 'medium', fail: function () {} });

    // 显示为模态弹窗
    wx.showModal({
      title: item.icon + ' ' + item.title,
      content: item.content + '\n\n—— ' + item.type + ' · ' + item.season,
      showCancel: false,
      confirmText: '再来一条',
      confirmColor: '#d4a574',
      success: function (res) {
        if (res.confirm) {
          // 递归再来一条（实际重新调用自己）
          wx.nextTick(function () {
            // 简单递归调用
            var page = getCurrentPages().slice(-1)[0];
            if (page && page.onRandomOne) page.onRandomOne();
          });
        }
      }
    });
  },

  // ---------------------------- 类型筛选 ----------------------------
  onFilter: function (e) {
    var type = e.currentTarget.dataset.type;
    this.setData({ activeFilter: type });
    this.applyFilter();
  },

  applyFilter: function () {
    var type = this.data.activeFilter;
    if (!type) {
      this.setData({ filteredItems: this.data.allItems });
    } else {
      this.setData({
        filteredItems: this.data.allItems.filter(function (item) {
          return item.type === type;
        })
      });
    }
  },

  // ---------------------------- 下拉刷新 ----------------------------
  onPullDownRefresh: function () {
    this.applyShuffle();
    wx.stopPullDownRefresh();
  }
});
