// ==================== 食光机 - 色卡分享卡生成工具 ====================
// 使用离屏 Canvas 绘制精美分享卡片，保存到相册

/**
 * 生成今日食光分享卡并保存到相册
 * @param {object} food 食物数据 { title, date, image, colors, desc }
 */
function generateShareCard(food) {
  return new Promise(function (resolve, reject) {
    // 卡片尺寸：3:4 比例适合朋友圈
    var cardW = 750;
    var cardH = 1000;

    var canvas = wx.createOffscreenCanvas
      ? wx.createOffscreenCanvas({ type: '2d', width: cardW, height: cardH })
      : null;

    if (!canvas) {
      reject(new Error('Canvas 不可用'));
      return;
    }

    var ctx = canvas.getContext('2d');
    var colors = food.colors || ['#d4a574'];

    // ---- 1. 背景 ----
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, cardW, cardH);

    // ---- 2. 加载并绘制食物照片（上半部分） ----
    var img = canvas.createImage();
    img.onload = function () {
      // 照片区域：占卡片上部 55%
      var photoH = cardH * 0.52;
      var scale = Math.max(cardW / img.width, photoH / img.height);
      var sw = img.width * scale;
      var sh = img.height * scale;
      var sx = (sw - cardW) / 2;
      var sy = (sh - photoH) / 2;

      ctx.save();
      // 照片区域裁剪
      ctx.beginPath();
      ctx.rect(0, 0, cardW, photoH);
      ctx.clip();
      ctx.drawImage(img, -sx, -sy, sw, sh);
      // 底部渐变遮罩
      var gradient = ctx.createLinearGradient(0, photoH - 120, 0, photoH);
      gradient.addColorStop(0, 'rgba(26,26,26,0)');
      gradient.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, photoH - 120, cardW, 120);
      ctx.restore();

      // ---- 3. 色卡区域 ----
      var paletteY = photoH + 40;
      var dotSize = 56;
      var dotGap = 20;
      var totalDotsW = colors.length * dotSize + (colors.length - 1) * dotGap;
      var startX = (cardW - totalDotsW) / 2;

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      var rx = startX - 24, ry = paletteY - 20, rw = totalDotsW + 48, rh = dotSize + 60, rr = 16;
      ctx.beginPath();
      ctx.moveTo(rx + rr, ry);
      ctx.lineTo(rx + rw - rr, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rr, rr);
      ctx.lineTo(rx + rw, ry + rh - rr);
      ctx.arcTo(rx + rw, ry + rh, rx + rw - rr, ry + rh, rr);
      ctx.lineTo(rx + rr, ry + rh);
      ctx.arcTo(rx, ry + rh, rx, ry + rh - rr, rr);
      ctx.lineTo(rx, ry + rr);
      ctx.arcTo(rx, ry, rx + rr, ry, rr);
      ctx.closePath();
      ctx.fill();

      for (var i = 0; i < colors.length; i++) {
        var cx = startX + i * (dotSize + dotGap) + dotSize / 2;
        var cy = paletteY + dotSize / 2 + 10;

        // 阴影
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        // 色圆
        ctx.beginPath();
        ctx.arc(cx, cy, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = colors[i];
        ctx.fill();

        // 白边
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 色号标注
        ctx.fillStyle = '#888';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(colors[i], cx, cy + dotSize / 2 + 32);
      }

      ctx.shadowColor = 'transparent';

      // ---- 4. 食物信息 ----
      var infoY = paletteY + dotSize + 90;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(food.title, cardW / 2, infoY);

      ctx.fillStyle = '#888';
      ctx.font = '26px "PingFang SC", sans-serif';
      ctx.fillText(food.date, cardW / 2, infoY + 44);

      // ---- 5. 描述（如果有） ----
      if (food.desc) {
        var desc = food.desc.length > 40 ? food.desc.slice(0, 40) + '...' : food.desc;
        ctx.fillStyle = '#aaa';
        ctx.font = '24px "PingFang SC", sans-serif';
        ctx.fillText(desc, cardW / 2, infoY + 90);
      }

      // ---- 6. 底部分隔 + 品牌 ----
      var footerY = cardH - 80;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, footerY - 30);
      ctx.lineTo(cardW - 80, footerY - 30);
      ctx.stroke();

      ctx.fillStyle = '#555';
      ctx.font = '24px "PingFang SC", sans-serif';
      ctx.fillText('食光机 · 复古美食日记', cardW / 2, footerY + 10);

      // ---- 7. 导出 ----
      canvas.toDataURL({
        success: function (res) {
          // 将 base64 写入临时文件
          var fs = wx.getFileSystemManager();
          var tempPath = wx.env.USER_DATA_PATH + '/share_card_' + Date.now() + '.png';
          fs.writeFile({
            filePath: tempPath,
            data: res.data.replace(/^data:image\/\w+;base64,/, ''),
            encoding: 'base64',
            success: function () {
              // 保存到相册
              wx.saveImageToPhotosAlbum({
                filePath: tempPath,
                success: function () {
                  resolve(tempPath);
                },
                fail: function (err) {
                  if (err.errMsg.indexOf('auth deny') !== -1) {
                    // 引导用户授权
                    wx.showModal({
                      title: '需要相册权限',
                      content: '请在设置中允许小程序保存图片到相册',
                      showCancel: false
                    });
                  }
                  reject(err);
                }
              });
            },
            fail: reject
          });
        },
        fail: reject
      });
    };

    img.onerror = function () {
      reject(new Error('图片加载失败'));
    };

    img.src = food.image;
  });
}

module.exports = { generateShareCard };
