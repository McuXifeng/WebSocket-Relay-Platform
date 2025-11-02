# WebSocket Relay Platform - 性能测试指南

本目录包含了 WebSocket Relay Platform 的性能测试套件,使用 [Artillery](https://www.artillery.io/) 进行 WebSocket 压力测试。

## 📁 目录结构

```
performance/
├── scenarios/                                  # 测试场景脚本
│   ├── single-endpoint-multi-connection.yml   # 场景1: 单端点多连接测试
│   ├── multi-endpoint-concurrent.yml          # 场景2: 多端点并发测试
│   ├── high-throughput.yml                    # 场景3: 高消息吞吐量测试
│   └── long-connection-stability.yml          # 场景4: 长连接稳定性测试
├── utils/                                      # 工具脚本
│   └── metrics-collector.ts                   # 性能指标收集工具 (待创建)
├── reports/                                    # 测试报告输出目录
├── config.ts                                   # 测试配置文件
└── README.md                                   # 本文件
```

## 🚀 快速开始

### 1. 前置条件

确保以下服务已启动:

```bash
# 启动 MySQL 数据库
# Windows: 启动 MySQL 服务
# macOS: brew services start mysql

# 启动 WebSocket Relay 后端服务
cd packages/backend
pnpm dev
```

### 2. 运行所有测试场景

```bash
# 从项目根目录运行
pnpm test:performance

# 或从 backend 目录运行
cd packages/backend
pnpm test:performance
```

### 3. 运行单个场景

```bash
cd packages/backend

# 场景 1: 单端点多连接测试 (约 7 分钟)
npx artillery run tests/performance/scenarios/single-endpoint-multi-connection.yml --output tests/performance/reports/single-endpoint.json

# 场景 2: 多端点并发测试 (约 7 分钟)
npx artillery run tests/performance/scenarios/multi-endpoint-concurrent.yml --output tests/performance/reports/multi-endpoint.json

# 场景 3: 高消息吞吐量测试 (约 7 分钟)
npx artillery run tests/performance/scenarios/high-throughput.yml --output tests/performance/reports/high-throughput.json

# 场景 4: 长连接稳定性测试 (约 61 分钟)
npx artillery run tests/performance/scenarios/long-connection-stability.yml --output tests/performance/reports/long-connection.json
```

### 4. 生成 HTML 报告

```bash
# 将 JSON 报告转换为 HTML 报告
npx artillery report tests/performance/reports/single-endpoint.json --output tests/performance/reports/single-endpoint.html

# 或使用简写
npx artillery report tests/performance/reports/*.json
```

## 📊 测试场景详解

### 场景 1: 单端点多连接测试

**目的**: 测试单个端点在不同并发连接数下的性能表现

**测试配置**:

- 端点数量: 1 个固定端点 (`perf-test-endpoint-1`)
- 并发连接数: 10 → 20 → 50 (逐步增加)
- 测试时长: 每阶段 2 分钟,共 7 分钟
- 消息频率: 每连接 1 msg/s

**预期指标**:

- p99 延迟 < 200ms
- 错误率 < 1%
- CPU 使用率 < 70% (50 连接时)

---

### 场景 2: 多端点并发测试

**目的**: 测试多个端点同时处理连接时的系统性能

**测试配置**:

- 端点数量: 10 → 50 → 100 个随机端点
- 每端点连接数: 5
- 总连接数: 50 → 250 → 500
- 测试时长: 每阶段 2 分钟,共 7 分钟
- 消息频率: 每连接 0.5 msg/s

**预期指标**:

- p99 延迟 < 300ms
- 错误率 < 2%
- 内存增长稳定,无泄漏

---

### 场景 3: 高消息吞吐量测试

**目的**: 测试系统在高频消息场景下的吞吐能力

**测试配置**:

- 固定连接数: 50
- 目标吞吐量: 100 msg/s → 500 msg/s → 1000 msg/s
- 测试时长: 每阶段 2 分钟,共 7 分钟
- 实现方式: 调整每连接消息发送频率

**预期指标**:

- p99 延迟 < 500ms (高负载下允许更高延迟)
- 错误率 < 5%
- 系统吞吐量达到目标值

---

### 场景 4: 长连接稳定性测试

**目的**: 测试系统长时间运行的稳定性和资源管理能力

**测试配置**:

- 并发连接数: 100
- 测试时长: 60 分钟
- 消息频率: 低频心跳 (每 10 秒 1 条)
- 额外测试: 20% 连接会经历断线重连

**预期指标**:

- p99 延迟 < 300ms
- 错误率 < 1%
- 无进程崩溃或重启
- 无内存泄漏 (内存使用稳定)

## 🔧 配置说明

### 环境变量

性能测试支持通过环境变量自定义配置:

```bash
# .env.test (推荐: 使用独立的测试数据库)
WS_SERVER_URL=ws://localhost:3001
TEST_DATABASE_URL=mysql://root:password@localhost:3306/websocket_relay_test
```

### 修改测试参数

编辑 `config.ts` 文件可调整测试参数:

```typescript
export const performanceTestConfig = {
  scenarios: {
    singleEndpoint: {
      connectionCounts: [10, 20, 50], // 修改并发连接数
      duration: 300, // 修改测试时长 (秒)
      messageRate: 1, // 修改消息频率
    },
    // ...
  },
};
```

或直接编辑 `scenarios/*.yml` 文件中的 `phases` 和 `scenarios` 配置。

## 📈 性能指标说明

Artillery 会自动收集以下关键指标:

| 指标名称                      | 说明                      | 目标值  |
| ----------------------------- | ------------------------- | ------- |
| `http.response_time.p50`      | 50% 消息延迟              | < 50ms  |
| `http.response_time.p95`      | 95% 消息延迟              | < 100ms |
| `http.response_time.p99`      | 99% 消息延迟              | < 200ms |
| `vusers.created`              | 创建的虚拟用户数 (连接数) | -       |
| `vusers.failed`               | 失败的连接数              | < 1%    |
| `websocket.messages_sent`     | 发送的消息总数            | -       |
| `websocket.messages_received` | 接收的消息总数            | -       |

## 🐛 故障排查

### 连接失败 (ECONNREFUSED)

**原因**: WebSocket 服务器未启动

**解决**:

```bash
cd packages/backend
pnpm dev
```

---

### 数据库错误

**原因**: 测试数据库未创建或连接失败

**解决**:

```bash
# 创建测试数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS websocket_relay_test;"

# 运行数据库迁移
cd packages/backend
DATABASE_URL="mysql://root:password@localhost:3306/websocket_relay_test" npx prisma db push
```

---

### 内存不足

**原因**: 并发连接数过高,超出系统资源限制

**解决**:

- 降低测试场景中的 `arrivalRate` 和 `maxVusers`
- 增加系统可用内存
- 分批运行测试场景

## 📝 添加自定义测试场景

1. 在 `scenarios/` 目录创建新的 YAML 文件:

```yaml
# my-custom-scenario.yml
config:
  target: 'ws://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: '我的自定义场景'

scenarios:
  - name: '自定义测试'
    engine: ws
    flow:
      - connect:
          target: '/ws/my-endpoint'
      - send:
          payload: '{"type":"test"}'
```

2. 运行自定义场景:

```bash
npx artillery run tests/performance/scenarios/my-custom-scenario.yml
```

## 📚 参考资料

- [Artillery 官方文档](https://www.artillery.io/docs)
- [Artillery WebSocket 引擎](https://www.artillery.io/docs/guides/guides/websocket-reference)
- [WebSocket Relay Platform 架构文档](../../../docs/architecture/)

---

**版本**: 1.0
**最后更新**: 2025-11-02
**维护者**: 米醋电子工作室
