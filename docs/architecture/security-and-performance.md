# Security and Performance

## Security Requirements

**前端安全：**
- **CSP Headers**：`default-src 'self'; connect-src 'self' wss://your-domain.com`
- **XSS Prevention**：React 默认转义，避免 dangerouslySetInnerHTML
- **Secure Storage**：敏感数据（JWT Token）存储在 localStorage

**后端安全：**
- **Input Validation**：使用 Joi 或 Zod 验证所有输入
- **Rate Limiting**：express-rate-limit（100 req/15min per IP）
- **CORS Policy**：仅允许前端域名访问

**认证安全：**
- **Token Storage**：客户端 localStorage
- **Session Management**：JWT 无状态，过期时间 7 天
- **Password Policy**：最小长度 8 位，bcrypt salt rounds = 10

## Performance Optimization

**前端性能：**
- **Bundle Size Target**：< 500KB (gzipped)
- **Loading Strategy**：代码分割（React.lazy）
- **Caching Strategy**：静态资源缓存（Nginx `Cache-Control`）

**后端性能：**
- **Response Time Target**：< 100ms (API), < 50ms (WebSocket)
- **Database Optimization**：所有外键字段添加索引
- **Caching Strategy**：内存 Map 缓存 WebSocket 连接

**WebSocket 优化：**
- **连接池**：Map<endpoint_id, Set<WebSocket>>（O(1) 查找）
- **消息广播**：仅发送给在线客户端（readyState === OPEN）
- **心跳检测**：每 30 秒 ping/pong（可选）

---
