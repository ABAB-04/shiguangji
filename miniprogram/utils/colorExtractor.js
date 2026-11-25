// ==================== 食光机 - 真实颜色提取工具 ====================
// 使用页面内 Canvas 2D API 采样像素（离屏 Canvas 在部分真机上不回调）

/**
 * 从图片路径提取 N 个主色调
 * @param {string} imagePath 图片本地临时路径
 * @param {number} count 提取颜色数量，默认 5
 * @returns {Promise<string[]>} 颜色数组，如 ['#8B4513', '#D2691E', ...]
 */
function extractColors(imagePath, count) {
  count = count || 5;
  return new Promise(function (resolve) {
    // 安全兜底：3 秒没出结果就用配色板
    var done = false;
    var timer = setTimeout(function () {
      if (!done) { done = true; resolve(getFallbackColors(count)); }
    }, 3000);

    function finish(colors) {
      if (!done) { done = true; clearTimeout(timer); resolve(colors); }
    }

    // 先获取图片尺寸
    wx.getImageInfo({
      src: imagePath,
      success: function (info) {
        var scale = Math.min(1, 150 / info.width);
        var w = Math.floor(info.width * scale);
        var h = Math.floor(info.height * scale);

        // 尝试离屏 Canvas
        if (wx.createOffscreenCanvas) {
          try {
            var offCanvas = wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
            var ctx = offCanvas.getContext('2d');
            var img = offCanvas.createImage();
            img.onload = function () {
              ctx.drawImage(img, 0, 0, w, h);
              var imageData = ctx.getImageData(0, 0, w, h);
              finish(analyzePixels(imageData.data, count));
            };
            img.onerror = function () {
              // 离屏失败，走页面 Canvas
              extractViaPageCanvas(imagePath, w, h, count, finish);
            };
            img.src = imagePath;
            return;
          } catch (e) {
            // 离屏异常，走页面 Canvas
          }
        }

        // 回退：页面内 Canvas
        extractViaPageCanvas(imagePath, w, h, count, finish);
      },
      fail: function () {
        finish(getFallbackColors(count));
      }
    });
  });
}

/**
 * 使用页面内 Canvas 提取颜色
 */
function extractViaPageCanvas(imagePath, w, h, count, callback) {
  var pages = getCurrentPages();
  var page = pages[pages.length - 1];
  if (!page) { callback(getFallbackColors(count)); return; }

  // 先设置 canvas 宽高
  page.setData({ _extractW: w, _extractH: h }, function () {
    var query = wx.createSelectorQuery();
    query.select('#colorExtractCanvas').fields({ node: true, size: true }).exec(function (res) {
      if (res && res[0] && res[0].node) {
        var canvas = res[0].node;
        var dpr = wx.getWindowInfo().pixelRatio || 2;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        var img = canvas.createImage();
        img.onload = function () {
          ctx.drawImage(img, 0, 0, w, h);
          var imageData = ctx.getImageData(0, 0, w, h);
          callback(analyzePixels(imageData.data, count));
        };
        img.onerror = function () {
          callback(getFallbackColors(count));
        };
        img.src = imagePath;
      } else {
        callback(getFallbackColors(count));
      }
    });
  });
}

/**
 * 分析像素数据，提取主色调
 */
function analyzePixels(pixels, count) {
  var colorMap = {};
  var step = 4;
  var quantize = 32;

  for (var i = 0; i < pixels.length; i += step * 4) {
    var r = pixels[i];
    var g = pixels[i + 1];
    var b = pixels[i + 2];
    var a = pixels[i + 3];

    if (a === undefined) a = 255;
    if (a < 128) continue;
    if (r + g + b < 60) continue;
    if (r > 245 && g > 245 && b > 245) continue;
    if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10) {
      if (r > 200 || r < 40) continue;
    }

    var qr = Math.round(r / quantize) * quantize;
    var qg = Math.round(g / quantize) * quantize;
    var qb = Math.round(b / quantize) * quantize;
    var key = qr + ',' + qg + ',' + qb;

    if (colorMap[key]) {
      colorMap[key].freq++;
    } else {
      colorMap[key] = { r: r, g: g, b: b, freq: 1 };
    }
  }

  var sorted = Object.values(colorMap).sort(function (a, b) { return b.freq - a.freq; });

  if (sorted.length < count) {
    var fallbacks = getFallbackColors(count);
    for (var m = 0; m < fallbacks.length && sorted.length < count; m++) {
      var rgb = hexToRgb(fallbacks[m]);
      sorted.push({ r: rgb.r, g: rgb.g, b: rgb.b, freq: 0 });
    }
  }

  var result = [];
  for (var j = 0; j < sorted.length && result.length < count; j++) {
    var color = sorted[j];
    var hex = rgbToHex(color.r, color.g, color.b);
    var tooClose = false;
    for (var k = 0; k < result.length; k++) {
      if (colorDistance(hex, result[k]) < 25) { tooClose = true; break; }
    }
    if (!tooClose) result.push(hex);
  }

  if (result.length < count) {
    var extras = getFallbackColors(count);
    for (var n = 0; n < extras.length && result.length < count; n++) {
      if (result.indexOf(extras[n]) === -1) result.push(extras[n]);
    }
  }

  return result;
}

function rgbToHex(r, g, b) {
  var toHex = function (c) { var hex = c.toString(16); return hex.length === 1 ? '0' + hex : hex; };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function hexToRgb(hex) {
  var h = hex.replace('#', '');
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

function colorDistance(hex1, hex2) {
  var c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  var dr = c1.r - c2.r, dg = c1.g - c2.g, db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getFallbackColors(count) {
  var palette = ['#8B4513','#D2691E','#F5DEB3','#DEB887','#CD853F','#A0522D','#BC8F8F','#F4A460','#DAA520','#B8860B','#FF6347','#228B22','#FFF8DC','#FA8072','#FFD700'];
  var result = [], used = {};
  while (result.length < count) {
    var idx = Math.floor(Math.random() * palette.length);
    if (!used[idx]) { used[idx] = true; result.push(palette[idx]); }
  }
  return result;
}

module.exports = { extractColors };
