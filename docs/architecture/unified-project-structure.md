# Unified Project Structure

```
websocket-relay-platform/
├── .github/
│   └── workflows/
│       ├── ci.yaml
│       └── deploy.yaml
├── packages/
│   ├── frontend/               # React 前端
│   │   ├── public/
│   │   ├── src/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   ├── backend/                # Express + WebSocket 后端
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── middleware/
│   │   │   ├── websocket/
│   │   │   ├── prisma/
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   └── ws-server.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/                 # 共享类型和工具
│       ├── src/
│       │   ├── types/
│       │   └── utils/
│       └── package.json
├── infrastructure/             # 部署配置
│   ├── nginx/
│   ├── pm2/
│   └── scripts/
├── docs/
│   ├── prd.md
│   ├── architecture.md
│   └── deployment.md
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---
