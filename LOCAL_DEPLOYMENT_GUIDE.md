# 特步AI生图助手 - 本地部署指南

## 📋 准备工作

### 1. 需要的软件

| 软件 | 版本 | 下载地址 | 说明 |
|------|------|----------|------|
| Node.js | v18+ | https://nodejs.org/ | 选择 LTS 版本 |
| pnpm | 最新版 | https://pnpm.io/ | 包管理器 |
| Git | 最新版 | https://git-scm.com/ | 代码版本控制 |
| VS Code | 最新版 | https://code.visualstudio.com/ | 代码编辑器（推荐） |

---

## 🛠️ 第一步：安装 Node.js

### Windows 用户
1. 打开 https://nodejs.org/
2. 点击 **LTS** 版本的 **Download for Windows (.msi)**
3. 双击下载的 `.msi` 文件
4. 一路点击 **Next** 即可
5. 安装完成后，打开 **命令提示符**（CMD）或 **PowerShell**

### Mac 用户
1. 打开 https://nodejs.org/
2. 点击 **LTS** 版本的 **Download for macOS (.pkg)**
3. 双击下载的 `.pkg` 文件
4. 一路点击 **继续** 即可

### 验证安装
打开终端（Windows 按 Win+R，输入 `cmd` 回车），输入：

```bash
node -v
```

应该显示类似 `v18.x.x` 或更高版本。

---

## 📦 第二步：安装 pnpm

在终端中输入：

```bash
# Windows / Mac 通用命令
npm install -g pnpm
```

验证安装：

```bash
pnpm -v
```

应该显示版本号。

---

## 📁 第三步：获取项目代码

### 方法 A：克隆 Git 仓库（如果你有仓库地址）

```bash
git clone <你的仓库地址>
cd xtep-ai-assistant
```

### 方法 B：手动下载（如果没有仓库）

1. 在 VS Code 中打开项目文件夹
2. 或者解压我给你的项目压缩包到任意位置
3. 进入项目文件夹

---

## ⚙️ 第四步：安装依赖

在项目文件夹中，打开终端，输入：

```bash
pnpm install
```

等待安装完成，可能需要 1-3 分钟。

---

## 🔑 第五步：配置 API Key

### 创建环境变量文件

1. 在项目根目录找到 `.env` 文件
2. 如果没有，找到 `.env.example` 文件，复制一份命名为 `.env`

### 填写 API Key

编辑 `.env` 文件，添加：

```env
# Google API Key（用于 Gemini 多模态模型）
GOOGLE_API_KEY=这里填入你的Google API Key

# 示例：
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxx
```

### 如何获取 Google API Key

1. 打开 https://aistudio.google.com/
2. 登录你的 Google 账号
3. 点击左下角 **Get API Key**
4. 点击 **Create API Key**
5. 复制生成的 Key

---

## 🗄️ 第六步：配置数据库（可选，当前使用远程数据库）

当前项目已经连接了远程数据库，可以直接使用。

如果你想使用本地数据库，参考下方 **"可选：本地数据库配置"**。

---

## 🚀 第七步：启动项目

### 开发模式（推荐）

```bash
pnpm dev
```

等待启动，应该看到类似：

```
▲ Next.js 16.1.1
- Local: http://localhost:3000
- Network: http://192.168.x.x:3000

Ready
```

打开浏览器访问 **http://localhost:3000**

---

## 📱 第八步：登录测试

### 1. 访问管理后台
浏览器打开：http://localhost:3000/admin/login

### 2. 管理员登录
```
用户名：admin
密码：admin123
```

### 3. 查看/编辑用户
找到 `user001` 用户，确认 API Key 已配置（或者直接使用全局的 `GOOGLE_API_KEY`）

### 4. 返回首页登录
访问：http://localhost:3000

点击 **登录体验**，输入：
```
用户ID：user001
密码：123456
```

### 5. 开始使用
在输入框输入：
```
帮我生成特步X160的电商平面营销设计图
```

点击发送，等待图片生成！

---

## 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 运行生产版本 |
| `pnpm lint` | 代码检查 |

---

## ❓ 常见问题

### Q1: 端口被占用
如果 3000 端口被占用，命令会提示：
```
Error: listen EADDRINUSE :::3000
```
解决方法：
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <进程ID> /F

# Mac
lsof -i :3000
kill -9 <进程ID>
```

### Q2: 安装依赖失败
```bash
# 清除缓存重试
pnpm store prune
rm -rf node_modules
pnpm install
```

### Q3: API 调用失败
1. 检查 `.env` 文件是否正确配置
2. 检查 API Key 是否有效
3. 检查网络是否能访问 https://generativelanguage.googleapis.com

### Q4: 图片不显示
生成的图片保存在 `public/chat-images` 目录，确保目录存在。

---

## 📊 可选：本地数据库配置

### 使用 SQLite（简单，无需安装）

1. 安装 sqlite3：
```bash
pnpm add sqlite3
```

2. 修改 `.env`：
```env
DATABASE_URL=./data/app.db
```

3. 创建数据目录：
```bash
mkdir -p data
```

---

## 📊 可选：使用 Docker（进阶）

如果你有 Docker：

```bash
# 构建镜像
docker build -t xtep-ai .

# 运行
docker run -p 3000:3000 -e GOOGLE_API_KEY=你的Key xtep-ai
```

---

## 🎉 成功标志

看到类似输出说明成功：

```
✅ API Key 配置正确
✅ 成功连接到 Google Gemini
✅ 图片生成成功
```

---

## 📞 获取帮助

如果遇到问题：
1. 查看终端错误信息
2. 打开浏览器开发者工具（F12）查看 Console
3. 查看 Network 标签页中的请求状态

---

**祝你玩得开心！** 🎨
