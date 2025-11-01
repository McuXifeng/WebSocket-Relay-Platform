# SMTP 邮件通知配置指南

## 概述

WebSocket Relay Platform 的告警系统支持通过 SMTP 邮件发送告警通知。本文档说明如何配置 SMTP 服务器以启用邮件通知功能。

## 环境变量配置

在 `packages/backend/.env` 文件中配置以下环境变量：

```bash
# SMTP Email Configuration (optional - if not set, only WebSocket notifications will be sent)
# SMTP server host (e.g., smtp.gmail.com, smtp.qq.com, smtp.163.com)
SMTP_HOST=smtp.gmail.com

# SMTP server port (common: 587 for TLS, 465 for SSL, 25 for unencrypted)
SMTP_PORT=587

# SMTP security (true for TLS, false for unencrypted)
SMTP_SECURE=false

# SMTP authentication username (usually your email address)
SMTP_USER=your-email@gmail.com

# SMTP authentication password (use app-specific password for Gmail)
SMTP_PASSWORD=your-app-specific-password

# Email sender address (usually same as SMTP_USER)
SMTP_FROM_EMAIL=your-email@gmail.com

# Email sender display name
SMTP_FROM_NAME=WebSocket Relay Alert System

# Alert debounce time (in minutes) - same rule won't trigger again within this period
ALERT_DEBOUNCE_MINUTES=5

# Alert history retention period (in days) - older alerts will be auto-deleted
ALERT_RETENTION_DAYS=30
```

## 支持的 SMTP 服务器配置

### 1. Gmail (推荐用于开发测试)

**步骤 1: 启用两步验证**
- 访问 Google 账户设置: https://myaccount.google.com/security
- 启用"两步验证"

**步骤 2: 生成应用专用密码**
- 访问: https://myaccount.google.com/apppasswords
- 选择"邮件"和"其他（自定义名称）"
- 输入名称（如"WebSocket Relay"）
- 复制生成的16位密码

**配置示例：**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop  # 16位应用专用密码
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=WebSocket Relay Alert System
```

**注意事项：**
- Gmail 每天发送限制：500封（免费账户）
- 使用应用专用密码，不要使用 Google 账户密码
- 推荐用于开发和测试环境

### 2. QQ 邮箱 (国内用户推荐)

**步骤 1: 开启 SMTP 服务**
- 登录 QQ 邮箱
- 进入"设置" → "账户"
- 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
- 开启"SMTP服务"
- 生成授权码（16位）

**配置示例：**
```bash
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-qq-email@qq.com
SMTP_PASSWORD=abcdefghijklmnop  # QQ邮箱授权码
SMTP_FROM_EMAIL=your-qq-email@qq.com
SMTP_FROM_NAME=WebSocket Relay Alert System
```

**注意事项：**
- 使用授权码，不要使用 QQ 密码
- 发送限制：每天约500封
- 适合国内生产环境

### 3. 163 网易邮箱

**步骤 1: 开启 SMTP 服务**
- 登录 163 邮箱
- 进入"设置" → "POP3/SMTP/IMAP"
- 开启"SMTP服务"
- 设置授权密码

**配置示例：**
```bash
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true  # 163邮箱使用SSL
SMTP_USER=your-email@163.com
SMTP_PASSWORD=your-auth-code  # 授权密码
SMTP_FROM_EMAIL=your-email@163.com
SMTP_FROM_NAME=WebSocket Relay Alert System
```

### 4. Outlook / Hotmail

**配置示例：**
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password  # Outlook账户密码
SMTP_FROM_EMAIL=your-email@outlook.com
SMTP_FROM_NAME=WebSocket Relay Alert System
```

### 5. 自建 SMTP 服务器

如果您有自建的 SMTP 服务器（如 Postfix, Sendmail），可以直接配置：

```bash
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=alert@your-domain.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=alert@your-domain.com
SMTP_FROM_NAME=WebSocket Relay Alert System
```

## SMTP 端口说明

| 端口 | 加密方式 | SMTP_SECURE 值 | 说明 |
|------|----------|----------------|------|
| 25   | 无加密   | false          | 传统SMTP端口，部分ISP可能封锁 |
| 587  | TLS/STARTTLS | false      | **推荐**，现代SMTP标准端口 |
| 465  | SSL      | true           | 传统SSL端口，部分邮箱使用 |

**推荐配置：**
- 优先使用端口 **587** + `SMTP_SECURE=false`（STARTTLS）
- 如果邮箱要求SSL，使用端口 **465** + `SMTP_SECURE=true`

## 邮件通知测试

### 1. 启动后端服务

```bash
cd packages/backend
pnpm dev
```

### 2. 创建测试告警规则

通过前端UI或API创建一个告警规则：

```bash
curl -X POST http://localhost:3000/api/alert-rules \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpointId": "your-endpoint-id",
    "deviceId": "your-device-id",
    "ruleName": "温度过高测试",
    "dataKey": "temperature",
    "operator": ">",
    "threshold": "30",
    "alertLevel": "warning",
    "enabled": true
  }'
```

### 3. 触发告警

向设备发送数据，使其超过阈值：

```bash
# 向WebSocket发送设备数据
{
  "type": "device_data",
  "deviceId": "your-device-id",
  "data": {
    "temperature": 35  # 超过阈值30
  }
}
```

### 4. 检查邮件

- 告警触发后，系统会自动发送邮件通知到配置的邮箱
- 邮件主题：`[WebSocket Relay Alert] ${告警级别} - ${规则名称}`
- 邮件内容包含：设备名称、数据键、触发值、阈值、告警时间

## 故障排除

### 问题 1: 邮件未发送

**可能原因：**
- SMTP 配置错误（主机、端口、用户名、密码）
- 防火墙阻止 SMTP 端口
- 邮箱服务商限制

**解决方法：**
1. 检查后端日志：`packages/backend/logs/error.log`
2. 确认 SMTP 配置是否正确
3. 尝试使用 telnet 测试 SMTP 连接：
   ```bash
   telnet smtp.gmail.com 587
   ```

### 问题 2: 邮件被标记为垃圾邮件

**可能原因：**
- 发件人地址未验证
- 邮件内容触发垃圾邮件过滤器

**解决方法：**
1. 确保 `SMTP_FROM_EMAIL` 与 `SMTP_USER` 一致
2. 配置 SPF 和 DKIM 记录（自建服务器）
3. 将发件人添加到邮箱白名单

### 问题 3: SMTP 认证失败

**可能原因：**
- 使用了账户密码而非应用专用密码（Gmail）
- 授权码错误（QQ、163）
- 未开启 SMTP 服务

**解决方法：**
1. Gmail: 使用应用专用密码
2. QQ/163: 使用授权码
3. 确认邮箱已开启 SMTP 服务

## 日志示例

**成功发送邮件：**
```
2025-10-31 15:30:00 [INFO]: [Alert] 告警触发成功 { ruleId: 'xxx', deviceId: 'yyy', ... }
2025-10-31 15:30:01 [INFO]: [Alert] 邮件通知发送成功 { alertId: 'zzz', recipient: 'user@example.com' }
```

**SMTP 连接失败：**
```
2025-10-31 15:30:00 [ERROR]: [Alert] SMTP 连接失败 { error: 'ECONNREFUSED', host: 'smtp.example.com', port: 587 }
```

**邮件发送失败：**
```
2025-10-31 15:30:00 [ERROR]: [Alert] 邮件发送失败 { error: '535 Authentication failed', recipient: 'user@example.com' }
```

## 生产环境建议

### 1. 使用专用邮箱

- 创建专门的告警邮箱（如 `alert@your-domain.com`）
- 不要使用个人邮箱
- 确保有足够的发送配额

### 2. 配置邮件发送限制

- 设置合理的告警防抖时间（默认5分钟）
- 避免短时间内发送大量邮件导致账户被封

### 3. 监控邮件发送状态

- 定期检查 `logs/error.log` 中的 SMTP 错误
- 监控邮件发送成功率
- 设置备用 SMTP 服务器（可选）

### 4. 安全建议

- 使用环境变量存储 SMTP 密码，不要硬编码
- 使用应用专用密码或授权码，不要使用账户密码
- 定期更换 SMTP 密码
- 限制 SMTP 用户的权限（仅发送邮件）

## 禁用邮件通知

如果只需要 WebSocket 通知，可以不配置 SMTP 环境变量：

```bash
# 仅保留以下配置
ALERT_DEBOUNCE_MINUTES=5
ALERT_RETENTION_DAYS=30

# 不设置 SMTP 相关变量
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASSWORD=
```

系统会自动检测 SMTP 配置，如果未配置则只发送 WebSocket 通知，不会尝试发送邮件。

## 参考资源

- [Nodemailer 官方文档](https://nodemailer.com/)
- [Gmail SMTP 设置](https://support.google.com/mail/answer/7126229)
- [QQ 邮箱 SMTP 设置](https://service.mail.qq.com/cgi-bin/help?subtype=1&&id=28&&no=1001256)
- [163 邮箱 SMTP 设置](http://help.163.com/09/1223/14/5R7P6CJ600753VB8.html)
