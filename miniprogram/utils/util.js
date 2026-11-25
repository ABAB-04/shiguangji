// ==================== 食光机 - 通用工具函数 ====================

/**
 * 随机洗牌数组（Fisher-Yates）
 */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 从预定义配色板中随机提取 N 个颜色
 * @param {number} count 提取颜色数量，默认 5
 */
function extractColors(count) {
  count = count || 5;
  const { PALETTE_COLORS } = require('./constants');
  const shuffled = shuffle(PALETTE_COLORS);
  return shuffled.slice(0, count);
}

/**
 * 格式化秒数为 MM:SS
 * @param {number} seconds 秒数
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

/**
 * 获取当前日期字符串
 */
function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/**
 * 显示 Toast 提示
 * @param {string} message 提示文字
 * @param {number} duration 显示时长(ms)，默认 2000
 */
function showToast(message, duration) {
  duration = duration || 2000;
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  if (page && page.setData) {
    page.setData({ toastText: message, toastShow: true });
    setTimeout(function () {
      page.setData({ toastShow: false });
    }, duration);
  }
}

/**
 * 瀑布流分配：将 items 分配到左右两列
 * @param {Array} items 待分配的数据项
 */
function waterfallDistribute(items) {
  const left = [];
  const right = [];
  items.forEach(function (item, i) {
    // 模拟高度随机分配（实际应基于图片尺寸）
    if (i % 2 === 0) {
      left.push(item);
    } else {
      right.push(item);
    }
  });
  return { left: left, right: right };
}

/**
 * 将数据中的 cloud:// 文件 ID 转换为临时 HTTPS URL
 * 微信小程序 <image> 等组件不能直接使用 cloud:// 路径，
 * 必须先通过 wx.cloud.getTempFileURL() 转换为临时链接
 *
 * @param {Object|Array} data 需要转换的数据对象或数组
 * @param {Array<string>} fileFields 包含 cloud:// 文件 ID 的字段名列表，如 ['image', 'poster', 'src']
 * @returns {Promise<Object|Array>} 转换后的数据（保持原结构）
 */
/**
 * 【安全模式】不调用 getTempFileURL，直接返回原始 cloud:// 路径
 *
 * 原因：wx.cloud.getTempFileURL() 是 WAService 原生调用，
 * 只要参数中包含无效的 cloud:// 文件 ID，原生层会独立触发内部超时计时器，
 * 最终抛出 Error: timeout —— JS 层任何 try/catch、Promise.catch、
 * setTimeout 包装均无法拦截此原生级错误。
 *
 * 图片渲染方案：小程序 <image> 组件可直接使用 cloud:// 路径作为 src
 * （基础库 2.x+ 支持），WAService 内部在处理 <image> 的 cloud:// 路径时
 * 会自动按需调用 getTempFileURL 并做缓存，单张图片失败不会影响全局。
 */
function convertCloudFileUrls(data, fileFields) {
  // 直接透传，不做 getTempFileURL 转换
  // cloud:// 路径由各组件自行处理
  return Promise.resolve(data);
}

/**
 * 压缩图片
 * @param {string} srcImagePath 源图片路径
 * @param {number} quality 压缩质量 0-100，默认 80
 * @returns {Promise<string>} 压缩后的图片路径
 */
function compressImage(srcImagePath, quality) {
  quality = quality || 80;

  return new Promise(function (resolve, reject) {
    wx.compressImage({
      src: srcImagePath,
      quality: quality,
      success: function (res) {
        resolve(res.tempFilePath);
      },
      fail: function (err) {
        console.warn('[util] 图片压缩失败，使用原图:', err.errMsg);
        // 压缩失败时返回原图
        resolve(srcImagePath);
      }
    });
  });
}

/**
 * 生成云存储缩略图 URL
 * 微信云存储支持通过 URL 参数生成缩略图
 * @param {string} imageUrl 图片 URL（临时链接）
 * @param {number} width 缩略图宽度
 * @param {number} height 缩略图高度
 * @returns {string} 缩略图 URL
 */
function getThumbnailUrl(imageUrl, width, height) {
  if (!imageUrl || imageUrl.indexOf('http') !== 0) {
    return imageUrl;
  }
  width = width || 200;
  height = height || 200;
  // 微信云存储图片处理参数
  return imageUrl + '?imageView2/1/w/' + width + '/h/' + height;
}

/**
 * Promise 超时封装
 * @param {Promise} promise 要执行的 Promise
 * @param {number} timeoutMs 超时时间（毫秒），默认 8000ms
 * @param {string} taskName 任务名称，用于错误日志
 * @returns {Promise} 带超时的 Promise
 */
function withTimeout(promise, timeoutMs, taskName) {
  timeoutMs = timeoutMs || 8000;
  taskName = taskName || 'unknown';

  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      console.error('[util] 超时错误 [' + taskName + ']: 超过 ' + timeoutMs + 'ms');
      reject(new Error('timeout_from=' + taskName));
    }, timeoutMs);

    promise.then(function (result) {
      clearTimeout(timer);
      resolve(result);
    }).catch(function (err) {
      clearTimeout(timer);
      console.error('[util] 执行失败 [' + taskName + ']:', err);
      reject(err);
    });
  });
}

/**
 * 安全执行异步操作，带超时和错误处理
 * @param {Function} asyncFn 返回 Promise 的异步函数
 * @param {Object} options 配置
 * @param {number} options.timeoutMs 超时时间
 * @param {string} options.taskName 任务名称
 * @param {any} options.fallbackValue 失败时的默认返回值
 * @returns {Promise} 安全执行的 Promise
 */
function safeExecute(asyncFn, options) {
  options = options || {};
  var timeoutMs = options.timeoutMs || 8000;
  var taskName = options.taskName || 'safeExecute';
  var fallbackValue = options.fallbackValue || null;

  return withTimeout(asyncFn(), timeoutMs, taskName)
    .catch(function (err) {
      console.warn('[util] safeExecute 失败 [' + taskName + ']:', err.message || err);
      return fallbackValue;
    });
}

module.exports = {
  shuffle,
  extractColors,
  formatTime,
  getTodayStr,
  showToast,
  waterfallDistribute,
  convertCloudFileUrls,
  compressImage,
  getThumbnailUrl,
  withTimeout,
  safeExecute
};
