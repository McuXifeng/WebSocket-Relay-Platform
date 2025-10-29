# Epic 6: IoT 设备数据可视化平台 - Brownfield Enhancement

**Epic 目标：** 构建完整的IoT设备数据可视化平台，实现设备数据的采集、解析、存储和可视化展示。提供设备数据实时监控、历史数据查询、数据导出、设备控制等功能，对标主流物联网云平台（如阿里云IoT、腾讯云IoT、AWS IoT）的核心可视化能力。此 Epic 完成后，平台将从单纯的消息中继服务升级为功能完整的IoT数据管理平台，支持设备数据的全生命周期管理。

---

## Epic Description

### Existing System Context:

- **当前相关功能:**
  - 已实现WebSocket消息转发（支持DIRECT、JSON、CUSTOM_HEADER三种模式）
  - 已实现设备标识和管理（Device表存储设备信息）
  - 已实现消息历史存储（Message表存储所有消息记录）
  - 已实现端点详情页（显示实时统计和消息历史）
  - 消息转发为 **透明转发**，后端不解析消息内容，不影响转发性能

- **Technology stack:**
  - 前端: React 18.2 + TypeScript 5.3 + Ant Design 5.x + Vite
  - 后端: Node.js 20.x + Express 4.18 + TypeScript 5.3 + Prisma 5.x + MySQL 8.0
  - WebSocket: ws 8.x
  - 可视化库: 待选择（推荐：Apache ECharts 5.x 或 Ant Design Charts）
  - 其他: date-fns, nanoid, axios

- **Integration points:**
  - WebSocket消息路由逻辑（message-router.ts, server.ts）
  - 端点详情页面（EndpointDetailPage.tsx）
  - 设备管理逻辑（Device表、设备标识协议）
  - 消息存储逻辑（Message表、message.service.ts）
  - Prisma 数据库模型（Endpoint, Device, Message）

### Enhancement Details:

- **What's being added/changed:**

  1. **数据模型扩展（Story 6.1）:**
     - 新增 `DeviceData` 数据表，存储设备上报的结构化数据
     - 支持多种数据类型：数值（number）、字符串（string）、布尔（boolean）、JSON对象
     - 数据记录关联设备ID、时间戳、数据键值对

  2. **数据采集和解析（Story 6.1）:**
     - 后端异步解析WebSocket消息中的设备数据（JSON格式）
     - 提取设备数据字段（如温度、湿度、电压等）并存储到DeviceData表
     - **不影响消息转发**：数据解析为异步操作，与消息转发逻辑解耦
     - 支持设备数据协议定义（灵活的JSON Schema）

  3. **数值量可视化展示（Story 6.1 - MVP版本）:**
     - 在端点详情页添加"设备数据"Tab页
     - 展示所有已识别设备的最新数据（数值卡片形式）
     - 支持数据单位配置（°C、%、V、A等）
     - 实时更新（WebSocket推送或定时刷新）

  4. **实时数据流图表可视化（Story 6.2 - 未来）:**
     - 折线图展示数值型数据的时间序列
     - 柱状图展示离散型数据
     - 支持多设备数据对比
     - 支持时间范围选择（最近1小时、24小时、7天）

  5. **数据历史查询和导出（Story 6.3 - 未来）:**
     - 按时间范围筛选设备数据
     - 支持导出为CSV或JSON格式
     - 支持数据聚合（按小时、天统计平均值、最大值、最小值）

  6. **设备控制和指令下发（Story 6.4 - 未来）:**
     - 通过WebSocket向设备发送控制指令
     - 指令历史记录和状态追踪
     - 支持批量控制多个设备

- **How it integrates:**
  - 数据解析逻辑集成到 `message-router.ts` 的异步存储流程中
  - 新增 `device-data.service.ts` 处理数据解析和存储
  - 新增 REST API 端点获取设备数据（`GET /api/endpoints/:id/device-data`）
  - 前端在端点详情页添加新的Tab页展示设备数据
  - 使用 ECharts 或 Ant Design Charts 进行数据可视化

- **Success criteria:**
  - 设备上报的JSON数据能够被正确解析并存储到数据库
  - 数据解析和存储不影响消息转发的性能和延迟
  - 端点详情页能够展示所有设备的最新数据（数值卡片）
  - 用户可以实时查看设备数据变化
  - 数据历史查询和导出功能满足数据分析需求（未来）
  - 设备控制指令能够成功下发并执行（未来）

---

## Stories

### Story 6.1: IoT数据可视化MVP版本 - 数值量展示 ⭐ **当前优先级**

**目标：** 实现IoT设备数据的基础可视化功能，包括数据模型扩展、JSON数据解析存储、前端数值卡片展示。

**关键实现点:**
- **数据模型扩展：** 创建 `DeviceData` 表（包含字段：id, device_id, data_key, data_value, data_type, unit, timestamp）
- **数据解析逻辑：** 在 `message-router.ts` 的消息存储后，异步解析JSON数据并提取设备数据字段
- **数据协议定义：** 设备上报数据格式：`{ "type": "data", "deviceId": "xxx", "data": { "temperature": 25.5, "humidity": 60 } }`
- **REST API：** 新增 `GET /api/endpoints/:id/devices/:deviceId/data` 获取设备最新数据
- **前端展示：** 在端点详情页添加"设备数据"Tab，使用Ant Design Statistic卡片展示数值量
- **实时更新：** 使用定时刷新（每5秒）或WebSocket推送更新数据

**技术要点:**
- 数据解析异步执行，使用 `saveDeviceDataAsync()` 函数，不阻塞消息转发
- 支持多种数据类型（number, string, boolean）
- 自动识别数据单位（根据数据键名推断，如 "temperature" → "°C"）

**验收标准:**
- 设备上报数据后，DeviceData表中有新记录
- 端点详情页"设备数据"Tab显示所有设备的最新数据
- 数据卡片显示数值、单位、更新时间
- 消息转发性能不受影响（延迟 < 100ms）

---

### Story 6.2: 实时数据流可视化 - 图表展示 📊 **未来Story**

**目标：** 使用折线图、柱状图等图表展示设备数据的时间序列变化，支持实时数据流更新和多设备对比。

**关键实现点:**
- 集成 ECharts 或 Ant Design Charts 可视化库
- 实现折线图组件（展示数值型数据的时间序列）
- 支持时间范围选择（最近1小时、24小时、7天）
- 支持多设备数据对比（同一图表显示多条曲线）
- 实时数据流更新（WebSocket推送新数据点）

**技术要点:**
- 后端API支持时间范围查询：`GET /api/endpoints/:id/devices/:deviceId/data?startTime=xxx&endTime=xxx&dataKey=temperature`
- 前端使用 React Hooks 管理图表数据和实时更新
- 图表配置支持自适应缩放和数据聚合（数据点过多时自动采样）

---

### Story 6.3: 数据历史查询和导出 📥 **未来Story**

**目标：** 提供设备数据的历史查询功能，支持按时间范围筛选、数据聚合统计、导出CSV/JSON格式。

**关键实现点:**
- 前端添加"数据历史"页面（独立路由或端点详情页的子Tab）
- 支持时间范围选择器（日期范围、自定义时间）
- 支持数据聚合统计（按小时/天统计平均值、最大值、最小值）
- 支持导出为CSV或JSON格式（包含时间戳、设备ID、数据键值对）
- 表格展示历史数据，支持排序和分页

**技术要点:**
- 后端API：`GET /api/endpoints/:id/devices/:deviceId/data/history?startTime=xxx&endTime=xxx&aggregation=hour`
- 数据聚合使用MySQL聚合函数（AVG, MAX, MIN）
- 导出功能使用前端库（如 `papaparse` 生成CSV）

---

### Story 6.4: 设备控制和指令下发 🎛️ **未来Story**

**目标：** 实现设备控制功能，允许用户通过WebSocket向设备发送控制指令（如开关灯、调节温度），并追踪指令执行状态。

**关键实现点:**
- 定义设备控制协议：`{ "type": "control", "deviceId": "xxx", "command": "setLight", "params": { "state": "on" } }`
- 后端WebSocket服务器支持向指定设备发送控制指令（点对点消息）
- 前端添加"设备控制"界面（按钮、开关、滑块等控制组件）
- 指令历史记录（存储到 `ControlCommand` 表）
- 指令状态追踪（pending, success, failed, timeout）

**技术要点:**
- WebSocket消息路由逻辑扩展，支持指定目标设备ID
- 控制指令需要设备响应确认（ACK机制）
- 超时处理（5秒内未收到ACK则标记为失败）

---

### Story 6.5: 设备数据告警系统 🚨 **未来Story**

**目标：** 实现设备数据告警功能，当设备数据超过阈值时自动触发告警通知（邮件、WebSocket推送）。

**关键实现点:**
- 定义告警规则（数据键、阈值、比较运算符）
- 后端定时检查设备数据是否触发告警
- 告警通知（前端WebSocket推送、邮件通知）
- 告警历史记录和状态管理

---

### Story 6.6: 设备分组和批量管理 📂 **未来Story**

**目标：** 支持设备分组管理，批量查看、控制、导出多个设备的数据。

**关键实现点:**
- 设备分组功能（DeviceGroup表）
- 批量查看设备数据（聚合视图）
- 批量控制设备（同时向多个设备发送指令）

---

## Technical Architecture

### Data Model

```prisma
// DeviceData 模型 - 存储设备上报的结构化数据
model DeviceData {
  id         String   @id @default(uuid())
  device_id  String   // 外键：关联Device表
  data_key   String   @db.VarChar(100) // 数据键（如 "temperature", "humidity"）
  data_value String   @db.Text          // 数据值（支持数值、字符串、JSON）
  data_type  String   @db.VarChar(20)   // 数据类型（number, string, boolean, json）
  unit       String?  @db.VarChar(20)   // 数据单位（如 "°C", "%", "V"）
  timestamp  DateTime @default(now())   // 数据时间戳

  device Device @relation(fields: [device_id], references: [id], onDelete: Cascade)

  @@index([device_id, data_key, timestamp])
  @@map("device_data")
}

// 扩展 Device 模型
model Device {
  // ... 现有字段
  data DeviceData[] // 新增：设备数据记录
}
```

### Data Protocol

**设备上报数据格式（JSON）：**
```json
{
  "type": "data",
  "deviceId": "device-001",
  "timestamp": 1698765432000,
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "voltage": 3.3,
    "status": "online"
  }
}
```

**后端解析逻辑：**
1. 检测消息类型为 `"data"`
2. 提取 `deviceId` 和 `data` 对象
3. 遍历 `data` 对象的键值对
4. 为每个键值对创建 `DeviceData` 记录
5. 推断数据类型和单位

### API Endpoints

```typescript
// 获取设备最新数据
GET /api/endpoints/:endpointId/devices/:deviceId/data
Response: {
  deviceId: string;
  deviceName: string;
  lastUpdate: string;
  data: [
    { key: "temperature", value: 25.5, type: "number", unit: "°C", timestamp: "2025-10-29T10:00:00Z" },
    { key: "humidity", value: 60, type: "number", unit: "%", timestamp: "2025-10-29T10:00:00Z" }
  ]
}

// 获取设备数据历史（Story 6.3）
GET /api/endpoints/:endpointId/devices/:deviceId/data/history?startTime=xxx&endTime=xxx&dataKey=temperature
Response: {
  deviceId: string;
  dataKey: string;
  records: [
    { timestamp: "2025-10-29T10:00:00Z", value: 25.5 },
    { timestamp: "2025-10-29T11:00:00Z", value: 26.0 }
  ]
}

// 发送设备控制指令（Story 6.4）
POST /api/endpoints/:endpointId/devices/:deviceId/control
Request: {
  command: "setLight",
  params: { state: "on" }
}
Response: {
  commandId: string;
  status: "pending"
}
```

---

## Risk Assessment

### Primary Risks

1. **数据解析性能风险**
   - **风险：** 大量设备同时上报数据，数据解析和存储可能影响数据库性能
   - **缓解：** 使用异步批量插入（批量upsert），数据解析不阻塞消息转发

2. **数据存储容量风险**
   - **风险：** 设备数据高频上报（如每秒一次），数据库容量快速增长
   - **缓解：** 实施数据保留策略（只保留最近30天的原始数据，历史数据聚合存储）

3. **WebSocket消息协议兼容性风险**
   - **风险：** 新增设备数据协议可能与现有消息格式冲突
   - **缓解：** 设备数据协议使用独立的 `"type": "data"` 标识，不影响现有消息类型

### Mitigation Plan

- 数据解析和存储完全异步，使用消息队列（可选：Redis）解耦
- 数据库索引优化（device_id + data_key + timestamp 复合索引）
- 数据聚合和归档任务（定时任务清理旧数据）

---

## Roadmap

| Phase | Story | Priority | Estimated Effort |
|-------|-------|----------|------------------|
| Phase 1 (MVP) | 6.1 - 数值量展示 | ⭐ P0 | 8-12 小时 |
| Phase 2 | 6.2 - 图表可视化 | P1 | 12-16 小时 |
| Phase 3 | 6.3 - 数据历史查询和导出 | P1 | 8-10 小时 |
| Phase 4 | 6.4 - 设备控制指令下发 | P2 | 12-16 小时 |
| Phase 5 | 6.5 - 告警系统 | P2 | 10-14 小时 |
| Phase 6 | 6.6 - 设备分组管理 | P3 | 8-12 小时 |

**Total Estimated Effort:** 58-80 小时（约 2-3 个开发周期）

---

## Success Metrics

- **功能完整性：** 所有MVP功能（Story 6.1）正常工作，设备数据正确展示
- **性能指标：** 数据解析不影响消息转发延迟（< 100ms），数据存储延迟 < 500ms
- **用户体验：** 设备数据可视化界面直观易用，数据更新及时（< 5秒）
- **数据准确性：** 设备上报的数据与数据库存储的数据100%一致

---

## Change Log

| Date       | Version | Description                             | Author             |
|------------|---------|-----------------------------------------|--------------------|
| 2025-10-29 | 1.0     | 初始创建 Epic 6（IoT数据可视化平台）     | Sarah (PO)         |

---

## Next Steps

1. ✅ **立即开始：** Story 6.1 - IoT数据可视化MVP版本（数值量展示）
2. **未来规划：** Story 6.2-6.6 根据用户反馈和业务需求优先级调整

---

## Reference

- **主流IoT平台对标：**
  - 阿里云IoT平台：设备数据可视化、规则引擎、告警系统
  - 腾讯云IoT平台：实时数据流、历史数据查询、设备控制
  - AWS IoT Core：设备影子、数据流分析、远程控制

- **技术参考：**
  - Apache ECharts 官方文档：https://echarts.apache.org/
  - Ant Design Charts：https://charts.ant.design/
  - Prisma数据建模：https://www.prisma.io/docs/concepts/components/prisma-schema
