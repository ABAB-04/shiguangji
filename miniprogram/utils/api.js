// ==================== 食光机 - 云数据库调用封装 ====================

// 延迟获取 db 实例：api.js 在 App.onLaunch 之前被 require，
// 此时 wx.cloud.init() 尚未执行，提前调用 wx.cloud.database() 会拿到无效句柄，
// 导致后续所有 DB 查询在 WAService 原生层超时。
function getDb() {
  return wx.cloud.database();
}

// 分页配置
const PAGE_SIZE = 10; // 每页加载条数
const MAX_LIMIT = 100; // 最大单次查询条数

// ======== 核心安全机制 ========
// 1. 不调用 wx.cloud.getTempFileURL() —— 无效 cloud:// ID 会触发 WAService 原生超时
// 2. cloud:// URL 不允许进入渲染层 —— <image src="cloud://..."> 会在 WAService
//    内部自动调 getTempFileURL，同样会触发原生超时
// 3. 所有返回数据中的 cloud:// 字段统一清空，<image> 通过 wx:if 跳过空 src

/**
 * 递归清空对象/数组中所有 cloud:// 开头的值
 * 支持的字段名：image, poster, src, avatar 等
 */
function stripCloudUrls(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      stripCloudUrls(obj[i]);
    }
    return obj;
  }
  var keys = Object.keys(obj);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var val = obj[key];
    if (typeof val === 'string' && val.startsWith('cloud://')) {
      obj[key] = '';
    } else if (typeof val === 'object' && val !== null) {
      stripCloudUrls(val);
    }
  }
  return obj;
}

/**
 * 获取首页数据（banners + foods）
 */
function getHomeData() {
  return Promise.all([
    getDb().collection('banners').orderBy('id', 'asc').limit(10).get(),
    getDb().collection('foods').orderBy('_createTime', 'desc').limit(PAGE_SIZE).get()
  ]).then(function (results) {
    return {
      banners: stripCloudUrls(results[0].data),
      foods: stripCloudUrls(results[1].data)
    };
  }).catch(function (err) {
    console.error('[api] getHomeData 失败:', err.message || err);
    return { banners: [], foods: [] };
  });
}

/**
 * 分页获取美食列表
 */
function getFoodsPaged(skip, limit) {
  skip = skip || 0;
  limit = Math.min(limit || PAGE_SIZE, MAX_LIMIT);
  return getDb().collection('foods')
    .orderBy('_createTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()
    .then(function (res) { return stripCloudUrls(res.data); })
    .catch(function (err) {
      console.error('[api] getFoodsPaged 失败:', err.message || err);
      return [];
    });
}

/**
 * 获取美食总数
 */
function getFoodsCount() {
  return getDb().collection('foods').count()
    .then(function (res) { return res.total; })
    .catch(function (err) {
      console.error('[api] getFoodsCount 失败:', err.message || err);
      return 0;
    });
}

/**
 * 获取视频列表
 */
function getVideos() {
  return getDb().collection('videos').orderBy('id', 'asc').limit(20).get()
    .then(function (res) { return stripCloudUrls(res.data); })
    .catch(function (err) {
      console.error('[api] getVideos 失败:', err.message || err);
      return [];
    });
}

/**
 * 获取白噪音列表
 */
function getAudios() {
  return getDb().collection('audios').orderBy('id', 'asc').limit(20).get()
    .then(function (res) { return stripCloudUrls(res.data); })
    .catch(function (err) {
      console.error('[api] getAudios 失败:', err.message || err);
      return [];
    });
}

/**
 * 获取关于信息
 */
function getAbout() {
  return getDb().collection('about').limit(1).get()
    .then(function (res) { return stripCloudUrls(res.data[0] || {}); })
    .catch(function (err) {
      console.error('[api] getAbout 失败:', err.message || err);
      return {};
    });
}

/**
 * 获取美食详情
 */
function getFoodDetail(id) {
  return getDb().collection('foods').doc(id).get()
    .then(function (res) { return stripCloudUrls(res.data); })
    .catch(function (err) {
      console.error('[api] getFoodDetail 失败:', err.message || err);
      return null;
    });
}

/**
 * 根据日期获取美食记录
 */
function getFoodsByDate(startDate, endDate) {
  return getDb().collection('foods')
    .where({
      date: getDb().command.gte(startDate).and(getDb().command.lte(endDate))
    })
    .orderBy('date', 'desc')
    .limit(MAX_LIMIT)
    .get()
    .then(function (res) { return stripCloudUrls(res.data); })
    .catch(function (err) {
      console.error('[api] getFoodsByDate 失败:', err.message || err);
      return [];
    });
}

/**
 * 获取全部灵感数据（通过云函数）
 */
function getInspirations() {
  var startTime = Date.now();
  console.log('[api] getInspirations 开始调用云函数 getHomeData...');
  return wx.cloud.callFunction({ name: 'getHomeData' })
    .then(function (res) {
      var elapsed = Date.now() - startTime;
      console.log('[api] getHomeData 返回成功, 耗时 ' + elapsed + 'ms');
      if (res.result && res.result.inspirations) {
        return res.result.inspirations;
      }
      return [];
    })
    .catch(function (err) {
      var elapsed = Date.now() - startTime;
      console.error('[api] getHomeData 云函数失败, 耗时 ' + elapsed + 'ms, 错误:', err.message || err);
      return [];
    });
}

module.exports = {
  getHomeData,
  getFoodsPaged,
  getFoodsCount,
  getVideos,
  getAudios,
  getAbout,
  getFoodDetail,
  getFoodsByDate,
  getInspirations
};
