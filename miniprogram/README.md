# 食光机 - 微信小程序版

复古美食日记 · 微信小程序 + 云开发

---

## 项目结构

```
miniprogram/
├── app.js / app.json / app.wxss     # 小程序入口
├── project.config.json              # 开发者工具配置
├── pages/                           # 页面
│   ├── page1/       # 首页（轮播图+瀑布流+问候语）
│   ├── page2/       # 美食图鉴（画廊+内联详情）
│   ├── page3/       # 烹饪影像（视频卡片+播放器）
│   ├── page4/       # 白噪音（音频列表+波形动画）
│   └── page5/       # 个人中心（用户信息+关于）
├── components/                      # 公共组件
│   ├── top-nav/     # 顶部导航栏
│   ├── bottom-player/ # 底部音乐播放器
│   ├── video-player/  # 视频播放器弹窗
│   ├── color-palette/ # 色卡展示
│   ├── film-card/     # 胶片卡片
│   └── toast/         # 提示组件
├── utils/                           # 工具函数
├── cloudfunctions/                  # 云函数
│   ├── getHomeData/  # 首页数据聚合
│   └── importData/   # 数据导入
├── images/                          # 本地图标（≤100x100px）
└── data/                            # 云数据库导入用 JSON
```

---

## 快速开始

### 1. 注册微信小程序

1. 前往 [微信公众平台](https://mp.weixin.qq.com/) 注册小程序账号（个人主体即可）
2. 获取 **AppID**（开发 → 开发管理 → 开发设置）
3. 在微信开发者工具中开启**云开发**（设置 → 云开发 → 开通）

### 2. 配置项目

1. 打开 `project.config.json`，将 `appid` 替换为你的小程序 AppID
2. 打开 `app.js`，确认 `env: 'cloudbase-d6gd9apkpd54d029f'` 已正确配置（或替换为你的云环境 ID）

### 3. 创建云数据库集合

在微信开发者工具 → 云开发控制台 → 数据库，创建以下集合：

| 集合名 | 权限 | 说明 |
|--------|------|------|
| `banners` | 所有用户可读，仅创建者可写 | 轮播图 |
| `foods` | 所有用户可读，仅创建者可写 | 美食记录 |
| `videos` | 所有用户可读，仅创建者可写 | 视频列表 |
| `audios` | 所有用户可读，仅创建者可写 | 白噪音 |
| `about` | 所有用户可读，仅创建者可写 | 关于信息 |

### 4. 上传素材到云存储

将 `assets/` 文件夹中的图片上传到云存储，路径结构：
- `banners/banner_01.jpg` ~ `banner_03.jpg`
- `foods/food_01.jpg` ~ `food_06.jpg`
- `videos/video_01_poster.jpg` ~ `video_02_poster.jpg`

上传后更新 `data/` 文件夹中 JSON 文件的 `image`/`poster` 字段为实际 cloud fileID。

### 5. 导入数据

1. 在云开发控制台 → 数据库 → 对应集合 → 导入
2. 选择 `data/` 文件夹中对应的 JSON 文件
3. 逐一导入 5 个集合

### 6. 编译运行

1. 微信开发者工具 → 打开项目 → 选择 `miniprogram/` 目录
2. 点击编译 → 预览 → 扫码在真机测试

---

## 注意事项

- 个人主体可发布，无需营业执照
- 上线前需完成 ICP 备案
- Tab 图标位于 `images/` 文件夹，≤100x100px
