// ==================== 食光机 - 首页数据聚合云函数 ====================
// 从云数据库一次性获取首页需要的所有数据
// 注意：云函数端查询上限为 1000 条，远超客户端的 20 条

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 并行查询多个集合（云函数端无 limit 限制）
    const [bannersRes, foodsRes, inspirationsRes] = await Promise.all([
      db.collection('banners').orderBy('id', 'asc').get(),
      db.collection('foods').orderBy('date', 'desc').limit(20).get(),
      db.collection('inspirations').limit(1000).get()
    ]);

    return {
      banners: bannersRes.data,
      foods: foodsRes.data,
      inspirations: inspirationsRes.data,
      status: 'success'
    };
  } catch (error) {
    console.error('[getHomeData] 查询失败:', error);
    return {
      banners: [],
      foods: [],
      inspirations: [],
      status: 'error',
      error: error.message
    };
  }
};
