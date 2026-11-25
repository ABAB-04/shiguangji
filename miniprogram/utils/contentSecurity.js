// ==================== 食光机 - 内容安全检测工具 ====================
// 对用户生成内容（UGC）进行文字和图片的安全校验
// 参考文档：https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/sec-check/security.msgSecCheck.html

/**
 * 检测文本内容是否合规
 * @param {string} content 待检测的文本内容
 * @returns {Promise<{pass: boolean, message: string}>}
 */
function checkText(content) {
  if (!content || (typeof content === 'string' && content.trim().length === 0)) {
    return Promise.resolve({ pass: true, message: '空内容跳过检测' });
  }

  return wx.cloud.callFunction({
    name: 'contentCheck',
    data: { action: 'checkText', content: content.trim() }
  }).then(function (res) {
    return res.result || { pass: true, message: '检测结果异常，降级放行' };
  }).catch(function (err) {
    console.error('[contentSecurity] 文本检测调用失败:', err);
    // 云函数调用失败做降级处理，避免阻断正常用户
    return { pass: true, message: '检测服务异常，降级放行' };
  });
}

/**
 * 检测图片内容是否合规（用于已上传到云存储的图片）
 * @param {string} cloudFileID 图片的 cloud:// 文件 ID
 * @returns {Promise<{pass: boolean, message: string}>}
 */
function checkImage(cloudFileID) {
  if (!cloudFileID) {
    return Promise.resolve({ pass: true, message: '无图片跳过检测' });
  }

  return wx.cloud.callFunction({
    name: 'contentCheck',
    data: { action: 'checkImage', mediaUrl: cloudFileID }
  }).then(function (res) {
    return res.result || { pass: true, message: '检测结果异常，降级放行' };
  }).catch(function (err) {
    console.error('[contentSecurity] 图片检测调用失败:', err);
    return { pass: true, message: '检测服务异常，降级放行' };
  });
}

/**
 * 通过 base64 数据检测图片内容是否合规（适用于本地临时文件，上传前检测）
 * 小程序端读取本地文件为 base64，传给云函数进行安全检测
 *
 * @param {string} filePath 本地临时文件路径（如 wx.chooseImage 返回的 tempFilePath）
 * @returns {Promise<{pass: boolean, message: string}>}
 */
function checkImageByBase64(filePath) {
  if (!filePath) {
    return Promise.resolve({ pass: true, message: '无图片跳过检测' });
  }

  return new Promise(function (resolve) {
    // 读取本地文件为 base64
    var fs = wx.getFileSystemManager();
    try {
      var base64Data = fs.readFileSync(filePath, 'base64');
      if (!base64Data) {
        console.warn('[contentSecurity] 读取文件base64为空，降级放行');
        resolve({ pass: true, message: '读取文件失败，降级放行' });
        return;
      }

      wx.cloud.callFunction({
        name: 'contentCheck',
        data: {
          action: 'checkImageBase64',
          base64Data: base64Data
        }
      }).then(function (res) {
        resolve(res.result || { pass: true, message: '检测结果异常，降级放行' });
      }).catch(function (err) {
        console.error('[contentSecurity] base64图片检测调用失败:', err);
        resolve({ pass: true, message: '检测服务异常，降级放行' });
      });
    } catch (readErr) {
      console.error('[contentSecurity] 读取文件失败:', readErr);
      resolve({ pass: true, message: '读取文件异常，降级放行' });
    }
  });
}

/**
 * 同时检测文本和已上传云存储的图片
 * @param {string} content 文本内容
 * @param {string} cloudFileID 图片 cloud:// 文件 ID
 * @returns {Promise<{pass: boolean, textResult: object, imageResult: object, message: string}>}
 */
function checkBoth(content, cloudFileID) {
  return wx.cloud.callFunction({
    name: 'contentCheck',
    data: {
      action: 'checkBoth',
      content: content || '',
      mediaUrl: cloudFileID || ''
    }
  }).then(function (res) {
    return res.result || { pass: true, message: '检测结果异常，降级放行' };
  }).catch(function (err) {
    console.error('[contentSecurity] 综合检测调用失败:', err);
    return { pass: true, message: '检测服务异常，降级放行' };
  });
}

/**
 * 违规信息统一提示
 * 微信审核要求：仅需提示用户所发布内容含违规信息即可
 */
function showViolationToast() {
  wx.showToast({
    title: '您发布的内容含违规信息，请修改后再尝试',
    icon: 'none',
    duration: 3000
  });
}

module.exports = {
  checkText: checkText,
  checkImage: checkImage,
  checkImageByBase64: checkImageByBase64,
  checkBoth: checkBoth,
  showViolationToast: showViolationToast
};
