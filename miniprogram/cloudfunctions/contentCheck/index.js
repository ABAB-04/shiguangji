// ==================== 食光机 - 内容安全检测云函数 ====================
// 对用户生成内容（UGC）进行文字和图片的安全校验
// 参考文档：https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/sec-check/security.msgSecCheck.html

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 检测文本内容是否合规
 * @param {string} content 待检测的文本内容
 * @returns {object} { pass: boolean, message: string }
 */
async function checkText(content) {
  if (!content || content.trim().length === 0) {
    return { pass: true, message: '空内容跳过检测' };
  }

  try {
    const result = await cloud.openapi.security.msgSecCheck({
      content: content.trim()
    });
    // result.errCode === 0 表示通过检测
    if (result.errCode === 0) {
      return { pass: true, message: '文本检测通过' };
    } else {
      return { pass: false, message: '文本含违规内容', errCode: result.errCode };
    }
  } catch (err) {
    // errCode === 87014 表示内容含有违法违规内容
    if (err.errCode === 87014) {
      return { pass: false, message: '文本含违规内容', errCode: 87014 };
    }
    // 其他错误（如网络超时）做降级处理：允许通过，避免阻断正常用户
    console.error('[contentCheck] 文本检测异常，降级放行:', err.errCode, err.message);
    return { pass: true, message: '检测服务异常，降级放行' };
  }
}

/**
 * 检测图片内容是否合规
 * @param {string} mediaUrl 图片的临时 URL 或 cloud:// 路径
 * @returns {object} { pass: boolean, message: string }
 */
async function checkImage(mediaUrl) {
  if (!mediaUrl) {
    return { pass: true, message: '无图片跳过检测' };
  }

  try {
    // 如果是 cloud:// 路径，需要先获取临时 HTTPS 链接
    let fileUrl = mediaUrl;
    if (mediaUrl.startsWith('cloud://')) {
      const tempRes = await cloud.getTempFileURL({
        fileList: [mediaUrl]
      });
      if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
        fileUrl = tempRes.fileList[0].tempFileURL;
      } else {
        // 无法获取临时链接，降级放行
        console.warn('[contentCheck] 无法获取图片临时链接，降级放行');
        return { pass: true, message: '无法获取图片链接，降级放行' };
      }
    }

    // 下载图片文件到缓冲区
    const downloadRes = await cloud.downloadFile({
      fileID: mediaUrl.startsWith('cloud://') ? mediaUrl : fileUrl
    });

    // 调用图片安全检测
    const result = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/jpeg',
        value: downloadRes.fileContent
      }
    });

    if (result.errCode === 0) {
      return { pass: true, message: '图片检测通过' };
    } else {
      return { pass: false, message: '图片含违规内容', errCode: result.errCode };
    }
  } catch (err) {
    // errCode === 87014 表示内容含有违法违规内容
    if (err.errCode === 87014) {
      return { pass: false, message: '图片含违规内容', errCode: 87014 };
    }
    // 其他错误做降级处理
    console.error('[contentCheck] 图片检测异常，降级放行:', err.errCode, err.message);
    return { pass: true, message: '检测服务异常，降级放行' };
  }
}

/**
 * 通过 base64 数据检测图片内容是否合规
 * 适用于客户端本地临时文件（尚未上传至云存储时）的内容检测
 * @param {string} base64Data 图片的 base64 编码数据（不含 data:image/xxx;base64, 前缀）
 * @returns {object} { pass: boolean, message: string }
 */
async function checkImageByBase64(base64Data) {
  if (!base64Data) {
    return { pass: true, message: '无图片数据跳过检测' };
  }

  try {
    // 将 base64 转为 Buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // 调用图片安全检测
    const result = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/jpeg',
        value: buffer
      }
    });

    if (result.errCode === 0) {
      return { pass: true, message: '图片检测通过' };
    } else {
      return { pass: false, message: '图片含违规内容', errCode: result.errCode };
    }
  } catch (err) {
    // errCode === 87014 表示内容含有违法违规内容
    if (err.errCode === 87014) {
      return { pass: false, message: '图片含违规内容', errCode: 87014 };
    }
    // 其他错误做降级处理
    console.error('[contentCheck] 图片base64检测异常，降级放行:', err.errCode, err.message);
    return { pass: true, message: '检测服务异常，降级放行' };
  }
}

// ==================== 云函数入口 ====================
exports.main = async (event, context) => {
  const { action, content, mediaUrl, base64Data } = event;

  console.log('[contentCheck] 收到请求 action=' + action);

  switch (action) {
    case 'checkText':
      return await checkText(content || '');

    case 'checkImage':
      return await checkImage(mediaUrl || '');

    case 'checkImageBase64':
      return await checkImageByBase64(base64Data || '');

    case 'checkBoth':
      // 同时检测文本和图片
      const [textResult, imageResult] = await Promise.all([
        checkText(content || ''),
        checkImage(mediaUrl || '')
      ]);
      return {
        pass: textResult.pass && imageResult.pass,
        textResult: textResult,
        imageResult: imageResult,
        message: (!textResult.pass)
          ? '您发布的内容含违规信息，请修改后再尝试'
          : (!imageResult.pass)
            ? '您发布的内容含违规信息，请修改后再尝试'
            : '检测通过'
      };

    default:
      return { pass: false, message: '未知检测类型: ' + action };
  }
};
