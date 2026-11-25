# 食光机（美食时光机）

复古胶片风的微信小程序：拍一张照片，自动提取 5 个主色生成专属色卡，把每一餐沉淀成可回看的美食日记。

## 功能

- 拍照 / 相册选图，自动提取主色调生成色卡
- 美食图鉴、白噪音、计时器、个人中心
- 保存时走「文本检测 → 图片检测」双内容安全校验
- 分享卡片生成、骨架屏、分页加载

## 技术栈

- 微信小程序原生框架（WXML / WXSS / JS）
- 微信云开发：云数据库 + 云存储 + 云函数
- Canvas 2D 像素级取色、OffscreenCanvas 兼容降级

## 目录结构

```
miniprogram/
├── pages/          # 首页 / 图鉴 / 影像 / 白噪音 / 我的 / 拍摄
├── components/     # 色卡、胶片卡、骨架屏、顶部导航、Toast
├── utils/          # 取色算法、云数据库封装、内容安全、分享卡片
└── cloudfunctions/ # getHomeData、contentCheck
```

## 核心实现：取色算法

`miniprogram/utils/colorExtractor.js`

1. 按 4 像素步长采样，把计算量降到 1/16；
2. RGB 各通道 32 级量化，建频次直方图；
3. 按频次排序，用 RGB 欧氏距离（阈值 25）迭代去重；
4. 前置过滤透明、近黑近白与低饱和像素，避免背景色吃掉主色；
5. 真机兼容：OffscreenCanvas 优先，失败回退页面内 Canvas 并按 DPR 缩放，叠加 3 秒超时与预设色板兜底。

## 运行

1. 用微信开发者工具导入本目录；
2. 在 `project.config.json` 里替换为你的 AppID；
3. 开通云开发，创建 `banners` / `foods` / `videos` / `audios` / `about` 五个集合；
4. 上传云函数 `contentCheck`、`getHomeData`。

## 说明

- 仓库内不含任何密钥或用户数据，云环境 ID 请自行替换。
- 小程序已上线，欢迎扫码体验（见 docs/screenshots）。
