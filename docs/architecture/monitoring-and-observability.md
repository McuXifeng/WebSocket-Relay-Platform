# Monitoring and Observability

## Monitoring Stack

- **Frontend Monitoring:** 浏览器控制台 + 网络面板（MVP 阶段）
- **Backend Monitoring:** PM2 内置监控（CPU/内存）
- **Error Tracking:** Winston 结构化日志 + 文件输出
- **Performance Monitoring:** Nginx access logs

## Key Metrics

**前端指标：**
- Core Web Vitals（手动测试）
- JavaScript 错误（浏览器控制台）
- API 响应时间（Network 面板）
- 用户交互（手动观察）

**后端指标：**
- Request rate（Nginx access log 分析）
- Error rate（Winston error logs）
- Response time（API 响应时间）
- WebSocket 连接数（EndpointStats 表）

**数据库指标：**
- Query performance（Prisma 日志）
- Connection pool usage（MySQL status）
- Table sizes（MySQL information_schema）

## Logging Configuration

```typescript
// src/config/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
};

export default logger;
```

## PM2 Monitoring Commands

```bash
# 查看进程状态
pm2 status

# 查看实时日志
pm2 logs

# 查看详细监控
pm2 monit

# 重启服务
pm2 restart all

# 查看进程信息
pm2 info api-server
```

---
