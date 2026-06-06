# 处方镜 RxLens v3.0.0

> 赛博医疗级智能处方扫描与台账管理系统

## 项目概述

RxLens 是一款面向医疗场景的智能化台账管理工具，支持处方/小票的 OCR 扫描识别、离线本地存储、云端数据同步，以及赛博医疗级的动态视觉体验。采用 Next.js 14 + React 18 构建，可作为 PWA 独立应用安装到手机桌面。

## 核心特性

- **OCR 智能识别**：拍照扫描处方与小票，自动提取药品名称、数量、价格
- **离线优先**：基于 Dexie (IndexedDB) 的本地数据库，无网络也能正常使用
- **云端同步**：Supabase 后端支持，网络恢复后自动同步离线数据
- **应用锁**：密码保护 + 生物识别，保障医疗数据隐私安全
- **数据导出**：支持 Excel/CSV 导出，便于财务对账
- **赛博医疗级 UI**：荧光青全息投影、粒子特效、路径动画、CountUp 数字滚动

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14.2 (App Router) |
| UI | React 18.2 + Tailwind CSS 3.4 |
| 图表 | Recharts 3.8 |
| 图标 | Lucide React |
| 本地数据库 | Dexie 4.4 (IndexedDB 封装) |
| 云端同步 | Supabase JS Client |
| 加密 | @noble/hashes + crypto-js |
| 动画 | Canvas 粒子系统 + requestAnimationFrame |

## 完整目录结构

```
rxlens-workspace/
├── public/
│   ├── manifest.json              # PWA 应用清单
│   ├── icons/                     # 应用图标 (72x72 ~ 512x512)
│   └── screenshots/               # PWA 商店截图
├── src/
│   ├── app/                       # Next.js App Router 页面
│   │   ├── page.tsx               # 首页（仪表盘）
│   │   ├── layout.tsx             # 根布局（PWA meta + 加载动画）
│   │   ├── globals.css            # 全局样式
│   │   ├── settings/page.tsx      # 设置页（同步配置/导出/锁设置）
│   │   ├── api/ocr/route.ts       # OCR 识别 API
│   │   ├── db-test/page.tsx       # 数据库测试页
│   │   ├── log-viewer/page.tsx    # 日志查看器
│   │   ├── ocr-test/page.tsx      # OCR 测试页
│   │   ├── sync-test/page.tsx     # 同步测试页
│   │   ├── test-submit/page.tsx   # 表单提交测试页
│   │   └── validation-test/page.tsx # 校验逻辑测试页
│   ├── components/                # React 组件
│   │   ├── AnalyticsChart.tsx     # 数据图表（折线路径动画）
│   │   ├── AppLayout.tsx          # 应用布局（生命周期/可见性监听）
│   │   ├── AppLock.tsx            # 应用锁逻辑
│   │   ├── CreateRecordForm.tsx   # 手动录入表单
│   │   ├── GlassPreviewForm.tsx   # 毛玻璃表单（粒子特效）
│   │   ├── ImageUploader.tsx      # 图片上传（压缩 + OCR）
│   │   ├── LockScreen.tsx         # 锁屏界面
│   │   ├── ScanButton.tsx         # 扫描按钮
│   │   ├── SummaryCard.tsx        # 汇总卡片
│   │   └── SyncPendingBanner.tsx  # 同步 pending 横幅
│   ├── hooks/                     # 自定义 Hooks
│   │   ├── useAppLock.ts          # 应用锁状态管理
│   │   ├── useDatabase.ts         # 数据库操作（含缓存）
│   │   └── useSync.ts             # 云端同步（指数退避重试）
│   └── lib/                       # 工具库
│       ├── animations.ts          # 动画工具（粒子/CountUp/路径）
│       ├── appLock.ts             # 应用锁加密逻辑
│       ├── asyncState.ts          # 异步状态联合类型
│       ├── auth.ts                # 认证/哈希工具
│       ├── cache.ts               # 数据缓存层（5s TTL）
│       ├── db.ts                  # Dexie 数据库定义
│       ├── encryption.ts          # 数据加密
│       ├── export.ts              # Excel/CSV 导出
│       ├── imageUtils.ts          # 图片压缩（Canvas）
│       ├── supabase.ts            # Supabase 客户端
│       ├── utils.ts               # 通用工具（cn 函数）
│       └── validationLogger.ts    # 校验日志
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## 环境变量配置

在项目根目录创建 `.env.local` 文件，配置以下变量：

```bash
# Supabase 云端同步配置（可选，不配置则仅使用本地模式）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

| 变量名 | 说明 | 是否必填 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 否（不填则禁用云同步） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | 否（不填则禁用云同步） |

> 注意：环境变量需以 `NEXT_PUBLIC_` 前缀开头，以便在浏览器端访问。

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产包
npm run build

# 生产环境启动
npm start
```

## PWA 安装指南

### Android (Chrome)

1. 使用 Chrome 浏览器访问部署后的 RxLens 网址
2. 点击地址栏右侧的 **「添加到主屏幕」** 按钮（或菜单 -> 安装应用）
3. 确认安装，RxLens 将以独立应用形式出现在手机桌面
4. 应用以 `standalone` 模式运行，无浏览器地址栏，体验如同原生 App

### iOS (Safari)

1. 使用 Safari 访问 RxLens 网址
2. 点击底部分享按钮 **「分享」**
3. 选择 **「添加到主屏幕」**
4. 点击「添加」，RxLens 图标将出现在主屏幕
5. 由于 iOS 限制，状态栏将保持显示，但应用仍以全屏模式运行

### Windows/macOS (Chrome/Edge)

1. 使用 Chrome 或 Edge 访问 RxLens 网址
2. 点击地址栏右侧的 **「安装」** 图标（或菜单 -> 安装此站点作为应用）
3. 应用将以独立窗口运行，支持离线访问

### PWA 配置参数

| 属性 | 值 |
|------|-----|
| 应用名称 | 处方镜 RxLens |
| 短名称 | RxLens |
| 显示模式 | standalone |
| 主题色 | #121212 |
| 背景色 | #121212 |
| 方向 | portrait-primary |
| 语言 | zh-CN |
| 图标尺寸 | 72x72 / 96x96 / 128x128 / 144x144 / 152x152 / 192x192 / 384x384 / 512x512 |

## 版本升级备份

项目包含版本备份机制，每次重大更新前会自动备份到 `rxlens-backups/` 目录：

- `v1.0.0` — 基础功能：OCR、本地存储、离线优先
- `v2.0.0` — 架构优化：状态收敛、防抖节流、网络异常兜底
- `v3.0.0` — 视效升华：粒子特效、路径动画、CountUp、全息投影

## 性能优化

- **数据缓存**：useTodayStats / useAllStats / useDatabaseRecords 均内置 5 秒 TTL 缓存，避免重复查询
- **图片压缩**：上传前使用 Canvas 将图片压缩至 1920px 宽度、质量 0.7，控制存储体积
- **事件清理**：所有 addEventListener（visibilitychange / online / offline）均在 useEffect 清理函数中移除
- **按需加载**：AppLayout 组件使用 dynamic import 禁用 SSR，减少首屏负载

## 浏览器兼容性

- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

## License

MIT
