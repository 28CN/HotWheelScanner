# Hot Wheels Scanner | 风火轮扫描器

移动端优先的 AI 视觉辅助淘货 Web App，支持 iOS/Android 手机浏览器直接使用。

## 功能

- **快速扫雷模式** — 拍摄单辆 Hot Wheels 快速识别
- **深度盘点模式** — 多车平放合影批量识别
- **智能标签** — TH/STH、热门款、心愿单命中高亮
- **动态筛选** — 按估价、关注度、批次年份筛选
- **心愿单** — 本地保存关注车款，扫描时自动匹配
- **扫描历史** — 最近 50 次记录本地保存

## 技术栈

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Google Gemini 1.5 Flash (Vision)
- LocalStorage

## 快速开始

```bash
# 安装依赖
npm install

# 配置 API Key（复制示例文件后填入密钥）
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

在 `.env.local` 中设置：

```
GEMINI_API_KEY=你的密钥
```

API Key 获取：[Google AI Studio](https://aistudio.google.com/apikey)

手机测试：确保手机和电脑在同一 WiFi，访问 `http://<电脑IP>:3000`

## 部署

支持 Vercel / 任意 Node.js 托管。部署时在环境变量中配置 `GEMINI_API_KEY`。

```bash
npm run build
npm start
```

## 项目结构

```
src/
├── app/
│   ├── api/scan/route.ts   # Gemini 视觉 API
│   ├── page.tsx            # 扫描首页
│   ├── wishlist/page.tsx   # 心愿单
│   └── history/page.tsx    # 扫描历史
├── components/             # UI 组件
├── lib/storage.ts          # LocalStorage 工具
└── types/scan.ts           # 类型定义
```
