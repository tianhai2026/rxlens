# 处方镜 RxLens 小白级部署与安装指南

> 这是一份面向非技术用户的傻瓜式操作手册，教你如何把 RxLens 变成可下载安装的应用。

---

## 一、电脑端安装包下载（Windows / macOS）

### 第一步：把代码传到 GitHub

1. **注册 GitHub 账号**
   - 打开 https://github.com
   - 点击右上角「Sign Up」注册账号

2. **创建新仓库**
   - 登录后点击右上角「+」→「New repository」
   - Repository name 填写：`rxlens`
   - 选择「Public」（公开）
   - 点击「Create repository」

3. **上传代码**
   - 方式一（最简单）：直接拖拽上传
     - 点击「uploading an existing file」
     - 把整个项目文件夹拖进去
     - 点击「Commit changes」

   - 方式二（推荐）：使用 GitHub Desktop 软件
     - 下载安装 GitHub Desktop：https://desktop.github.com
     - 打开软件，登录你的 GitHub 账号
     - 点击「File」→「Add local repository」
     - 选择你的项目文件夹
     - 点击「Publish repository」上传

### 第二步：触发云端自动打包

GitHub 会自动帮你编译出安装包，你不需要安装任何编译工具！

1. **创建发布标签**
   - 在 GitHub 仓库页面点击「Releases」→「Draft a new release」
   - Tag version 填写：`v4.0.0`
   - Release title 填写：`处方镜 RxLens v4.0.0 正式版`
   - 点击「Publish release」

2. **等待打包完成**
   - 点击仓库顶部的「Actions」标签
   - 你会看到一个正在运行的任务「Build Desktop Apps」
   - 大约等待 10-20 分钟（第一次会慢一些）
   - 当任务显示绿色对勾 ✓ 就表示打包成功了

3. **下载安装包**
   - 回到「Releases」页面
   - 你会看到两个安装包：
     - `RxLens_4.0.0_x64-setup.exe` → Windows 电脑用
     - `RxLens_4.0.0.dmg` → Mac 电脑用
   - 点击下载你需要的那个

### 第三步：安装到电脑

**Windows 用户：**
1. 双击下载的 `.exe` 文件
2. 按提示点击「下一步」完成安装
3. 从桌面或开始菜单启动 RxLens

**Mac 用户：**
1. 双击下载的 `.dmg` 文件
2. 把 RxLens 图标拖到「应用程序」文件夹
3. 打开「应用程序」，双击 RxLens 启动
4. 如果提示「无法打开」，去「系统设置」→「隐私与安全性」点击「仍要打开」

---

## 二、手机端安装（PWA 全屏应用）

> 不需要下载安装包！直接用浏览器添加到桌面，体验和原生 App 一样。

### 第一步：一键部署到 Vercel

Vercel 是一个免费的网站托管平台，专门用来部署这种网页应用。

1. **注册 Vercel 账号**
   - 打开 https://vercel.com
   - 点击「Sign Up」→ 选择「Continue with GitHub」用 GitHub 账号登录

2. **导入项目**
   - 登录后点击「Add New...」→「Project」
   - 在列表中找到你刚才上传的 `rxlens` 仓库
   - 点击「Import」

3. **点击部署**
   - 不需要改任何设置
   - 直接点击「Deploy」按钮
   - 等待 1-2 分钟，显示「Congratulations!」就成功了

4. **获取网址**
   - 部署成功后，Vercel 会给你一个网址，类似：
     `https://rxlens-你的用户名.vercel.app`
   - 点击「Visit」打开这个网址，确认应用能正常显示

### 第二步：手机添加到桌面

**iPhone 用户：**
1. 用 Safari 浏览器打开 Vercel 给你的网址
2. 点击底部的「分享」按钮（方框里有向上箭头）
3. 向下滑动，找到「添加到主屏幕」
4. 点击「添加」
5. 桌面会出现「处方镜 RxLens」图标，点击即可全屏使用

**Android 用户：**
1. 用 Chrome 浏览器打开网址
2. 点击右上角三个点「⋮」
3. 选择「添加到主屏幕」或「安装应用」
4. 桌面会出现图标，点击即可使用

**华为鸿蒙用户：**
1. 用华为浏览器打开网址
2. 点击底部「更多」（三个点）
3. 选择「添加到主屏幕」
4. 桌面会出现图标，点击即可全屏使用

---

## 三、常见问题

### Q1：GitHub Actions 打包失败了怎么办？

点击失败的 Actions 任务，查看错误信息。常见原因：
- 仓库里缺少 `src-tauri` 文件夹 → 确保上传了完整代码
- 第一次打包时间较长 → 再等一会儿，最多 30 分钟

### Q2：Vercel 部署后打开是空白页？

检查 `.env.production` 文件是否上传到 GitHub。如果需要云端同步功能，需要填写 Supabase 配置（可选）。

### Q3：手机添加到桌面后打开还是网页？

这是正常的！PWA 就是这样工作的，但它会：
- 全屏显示，没有浏览器地址栏
- 有独立的桌面图标
- 支持离线访问基础功能
- 体验和原生 App 几乎一样

### Q4：我想更新版本怎么办？

1. 在本地修改代码
2. 用 GitHub Desktop 或网页上传新代码
3. 创建新的 Release 标签（如 `v4.0.1`）
4. GitHub 会自动打包新版本
5. Vercel 会自动更新网页版

---

## 四、快速对照表

| 你想做什么 | 去哪里操作 |
|-----------|-----------|
| 上传代码 | GitHub 网站 或 GitHub Desktop |
| 下载电脑安装包 | GitHub → Releases |
| 查看打包进度 | GitHub → Actions |
| 部署手机网页版 | Vercel 网站 |
| 手机添加到桌面 | 手机浏览器 → 分享 → 添加到主屏幕 |

---

*就这么简单！不需要安装 Rust、不需要配置 Android SDK，GitHub 和 Vercel 会帮你搞定一切。*