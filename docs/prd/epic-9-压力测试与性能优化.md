# Epic 9: 压力测试与性能优化 - Brownfield Enhancement

**Epic 目标：** 实现完整的压力测试体系和性能优化方案,确保系统能够在多用户、多端点、高并发场景下稳定运行,达到生产环境上线标准。通过系统化的性能测试识别瓶颈,执行针对性优化,建立持续的性能监控机制,将系统并发能力提升至50+端点、每端点10个连接、消息延迟<100ms、吞吐量>500msg/s,为大规模商用部署做好准备。

---

## Epic Description

### Existing System Context:

- **当前相关功能:**
  - 已实现 WebSocket 端点管理和消息转发核心功能（Epic 3）
  - 已实现基于内存 Map 的连接池管理（`Map<endpoint_id, Set<WebSocket>>`）
  - 已实现实时统计数据收集（连接数、消息数）- Story 3.5/3.6
  - 已实现心跳检测机制（30秒间隔）- Story 3.1
  - 已实现 IoT 设备数据可视化平台（Epic 6）
  - 已实现告警系统（Epic 6.5）
  - 当前系统设计目标: 10个并发端点、每端点5个连接、消息延迟<100ms

- **Technology stack:**
  - 后端: Node.js 20.x + Express 4.18 + TypeScript 5.3
  - WebSocket: ws 8.x (原生 Node.js WebSocket 库)
  - 数据库: MySQL 8.0 + Prisma 5.x ORM
  - 进程管理: PM2 5.x
  - 监控: PM2 内置监控 + Winston 日志
  - 测试: Jest 29.x

- **Integration points:**
  - WebSocket 服务器入口（`packages/backend/src/websocket/server.ts`）
  - 连接池管理（`packages/backend/src/websocket/connection-manager.ts`）
  - 消息广播路由（`packages/backend/src/websocket/message-router.ts`）
  - 统计数据更新服务（`packages/backend/src/services/stats.service.ts`）
  - Prisma 数据库模型（Endpoint, EndpointStats, DeviceData, AlertRule）

### Enhancement Details:

- **What's being added/changed:**

  1. **压力测试工具集成（Story 9.1）:**
     - 集成专业的 WebSocket 压力测试工具（Artillery、k6 或自定义 Node.js 脚本）
     - 在 `tests/performance/` 目录创建压力测试套件
     - 设计多层次测试场景:
       - 单端点多连接测试（10/20/50 连接）
       - 多端点并发测试（10/50/100 端点,每端点 5 连接）
       - 高消息吞吐量测试（100/500/1000 msg/s）
       - 长连接稳定性测试（持续 30-60 分钟）
     - 建立性能基线指标: 消息延迟(p50/p95/p99)、并发连接数、吞吐量、CPU/内存使用率

  2. **性能瓶颈分析与数据库优化（Story 9.2）:**
     - 使用 Node.js Profiler (`--prof`, `--inspect`) 和 MySQL Slow Query Log 识别瓶颈
     - 分析已知风险点:
       - 每条消息都触发数据库更新（stats.service.ts）
       - Prisma upsert 操作性能问题
       - 广播消息时的 Set 遍历效率
     - 优化统计更新策略:
       - 批量更新（每 N 秒或 N 条消息批量写入）
       - 异步队列（使用内存队列定期刷新）
       - 减少更新频率（关键统计实时,累计统计延迟）
     - 数据库优化: 添加索引、优化 Prisma 查询、配置连接池

  3. **WebSocket 性能优化与最终验证（Story 9.3）:**
     - 优化消息广播算法（connection-manager.ts, message-router.ts）
     - 减少不必要的 JSON 解析和序列化
     - 改进连接池清理逻辑,防止内存泄漏
     - 优化心跳检测机制（评估 30 秒间隔是否合理）
     - 配置生产环境性能参数（PM2 集群、Node.js 内存限制）
     - 执行最终压力测试: 50 端点 × 10 连接 × 1 小时稳定性测试

- **How it integrates:**
  - 压力测试脚本独立于主代码库,放置在 `tests/performance/` 目录
  - 性能优化主要修改现有服务文件(`stats.service.ts`),保持 API 兼容性
  - 数据库优化通过 Prisma 迁移实现,向后兼容
  - WebSocket 优化修改核心服务逻辑,但不改变 WebSocket 协议
  - 监控指标通过现有 Winston 日志和 PM2 监控收集

- **Success criteria:**
  - 建立自动化压力测试套件,可通过 `pnpm test:performance` 一键执行
  - 系统能支持 **50+ 并发端点**（5倍于当前 PRD 目标）
  - 系统能支持 **每端点 10 个连接**（2倍于当前 PRD 目标）
  - WebSocket 消息延迟 **p95 < 100ms**
  - 消息吞吐量 **> 500 msg/s**
  - 数据库查询响应时间 **平均 < 50ms**
  - 识别并优化至少 **3 个主要性能瓶颈**
  - CPU 使用率在峰值负载下 **< 70%**
  - 内存使用稳定,无明显内存泄漏
  - 形成完整的性能测试报告和优化建议文档

---

## Stories

### Story 9.1: 压力测试工具集成与性能基准测试

集成专业的 WebSocket 压力测试工具并设计多层次测试场景,建立当前系统的性能基线。

**关键任务:**
- 评估并选择压力测试工具（Artillery、k6、自定义 Node.js 脚本）
- 设计 4 种测试场景（单端点多连接、多端点并发、高吞吐量、长连接稳定性）
- 执行基准测试,收集关键指标（延迟、吞吐量、CPU/内存、数据库响应时间）
- 生成性能基准报告（`docs/performance/baseline-report.md`）

**验收标准:**
- 成功集成至少 1 个压力测试工具
- 创建至少 4 个不同的测试场景脚本
- 执行基准测试并收集所有关键指标
- 生成完整的基准性能报告
- 可通过 `pnpm test:performance` 一键运行测试

---

### Story 9.2: 性能瓶颈分析与数据库优化

使用性能分析工具识别系统瓶颈,并针对性地优化数据库查询和统计更新逻辑。

**关键任务:**
- 启用 Node.js Profiler、MySQL Slow Query Log、Prisma Query Performance Logs
- 分析 Story 9.1 测试结果,识别主要瓶颈
- 优化统计更新策略（批量更新/异步队列/减少频率）
- 数据库优化（添加索引、优化 Prisma 查询、配置连接池）
- 修改 `stats.service.ts` 实现优化的统计更新逻辑
- 重新运行压力测试,验证优化效果

**验收标准:**
- 识别并记录至少 3 个主要性能瓶颈
- 实现优化的统计更新策略（减少数据库写入 50% 以上）
- 数据库查询平均响应时间 < 50ms
- 添加必要的数据库索引（至少 2 个）
- 优化后的压测结果显示性能提升 30% 以上
- 生成瓶颈分析报告（`docs/performance/bottleneck-analysis.md`）

---

### Story 9.3: WebSocket 性能优化与最终验证

优化 WebSocket 连接管理和消息广播逻辑,并通过全面的压力测试验证系统已达到生产环境上线标准。

**关键任务:**
- 优化消息广播算法和连接池管理（connection-manager.ts, message-router.ts）
- 减少不必要的 JSON 解析和序列化
- 改进连接池清理逻辑,防止内存泄漏
- 优化心跳检测机制
- 配置生产环境性能参数（PM2 集群、Node.js 内存限制）
- 执行最终压力测试（50 端点 × 10 连接 × 1 小时）
- 生成完整的性能优化总结报告
- 更新部署文档,添加性能配置说明

**验收标准:**
- WebSocket 消息延迟 p95 < 100ms
- 支持至少 50 个并发端点,每端点 10 个连接（500 总连接）
- 消息吞吐量 > 500 msg/s
- 1 小时稳定性测试无崩溃、无内存泄漏
- CPU 使用率峰值 < 70%
- 生成完整的性能优化总结报告（`docs/performance/optimization-summary.md`）
- 更新 `docs/deployment.md`,添加性能配置章节

---

## Compatibility Requirements

- [x] **现有 API 保持不变:** 所有性能优化不修改 REST API 和 WebSocket 协议
- [x] **数据库 Schema 向后兼容:** 如有新增索引,通过 Prisma 迁移安全执行
- [x] **前端无需修改:** 性能优化完全在后端进行,前端 UI 无感知
- [x] **性能改进对用户透明:** 用户体验提升（更快的响应），但无需学习新功能
- [x] **测试环境隔离:** 压力测试使用独立的测试数据库,不影响开发环境

---

## Risk Mitigation

### Primary Risk

**风险:** 优化可能引入新的 Bug 或破坏现有功能

**缓解措施:**
- 所有优化前先建立性能基线和功能回归测试
- 使用 Git 分支开发,通过代码审查确保质量
- 优化后重新运行所有集成测试和 WebSocket 测试
- 保留原有逻辑的备份（通过注释或 Git 历史）
- 逐步上线: 先在测试环境验证,再部署到生产环境

**Rollback Plan:**
- 数据库优化: Prisma 迁移回退
- 代码优化: Git 回滚到优化前版本
- 配置优化: 恢复原有配置参数

---

### Secondary Risk

**风险:** 批量更新或异步队列可能导致统计数据短暂不准确

**缓解措施:**
- 文档中明确说明统计数据可能有秒级延迟
- 对于关键统计（如当前连接数），保持实时更新
- 对于累计统计（如消息总数），可容忍短暂延迟
- 配置合理的批量大小和刷新间隔（如 5 秒或 100 条消息）

---

## Definition of Done

- [x] 所有 3 个 Stories 完成,验收标准全部通过
- [x] 压力测试套件集成完成,可通过 npm 脚本一键运行
- [x] 性能优化实施完成,系统达到以下指标:
  - 支持 50+ 并发端点,每端点 10 个连接
  - WebSocket 消息延迟 p95 < 100ms
  - 消息吞吐量 > 500 msg/s
  - 数据库查询响应时间 < 50ms
  - CPU 峰值使用率 < 70%
- [x] 至少 3 个主要瓶颈已识别并优化
- [x] 所有现有功能通过回归测试,无功能退化
- [x] 完整的性能文档输出:
  - 基准测试报告（`docs/performance/baseline-report.md`）
  - 瓶颈分析报告（`docs/performance/bottleneck-analysis.md`）
  - 优化总结报告（`docs/performance/optimization-summary.md`）
- [x] 部署文档更新,包含性能配置说明
- [x] 代码通过 ESLint 和 Prettier 检查
- [x] 代码经过同行评审

---

## Architecture Notes

### 统计更新优化方案对比

**方案 A: 批量更新（推荐）**

```typescript
// stats.service.ts
class StatsBatchUpdater {
  private batch: Map<string, StatsUpdate> = new Map();
  private flushInterval: NodeJS.Timeout;

  constructor() {
    // 每 5 秒或累积 100 条更新时刷新
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  addUpdate(endpointId: string, action: 'connect' | 'disconnect' | 'message') {
    // 累积更新
    const existing = this.batch.get(endpointId) || { connect: 0, disconnect: 0, message: 0 };
    existing[action]++;
    this.batch.set(endpointId, existing);

    // 如果累积超过 100 条,立即刷新
    if (this.batch.size >= 100) {
      this.flush();
    }
  }

  async flush() {
    // 批量写入数据库
    const updates = Array.from(this.batch.entries());
    await prisma.$transaction(
      updates.map(([endpointId, stats]) =>
        prisma.endpointStats.update({
          where: { endpoint_id: endpointId },
          data: {
            current_connections: { increment: stats.connect - stats.disconnect },
            total_connections: { increment: stats.connect },
            total_messages: { increment: stats.message }
          }
        })
      )
    );
    this.batch.clear();
  }
}
```

**优势:**
- 大幅减少数据库写入次数（50-100倍）
- 使用 Prisma 事务确保数据一致性
- 实现简单,易于维护

**劣势:**
- 统计数据有秒级延迟（可接受）
- 进程崩溃时可能丢失未刷新的数据（风险较低）

---

**方案 B: 内存缓存 + 定期同步**

```typescript
// stats.service.ts
class StatsCache {
  private cache: Map<string, EndpointStats> = new Map();

  async getStats(endpointId: string): Promise<EndpointStats> {
    // 优先从缓存读取
    if (this.cache.has(endpointId)) {
      return this.cache.get(endpointId)!;
    }

    // 缓存未命中,从数据库读取
    const stats = await prisma.endpointStats.findUnique({
      where: { endpoint_id: endpointId }
    });
    this.cache.set(endpointId, stats);
    return stats;
  }

  updateCache(endpointId: string, action: 'connect' | 'disconnect' | 'message') {
    // 仅更新缓存,不写数据库
    const stats = this.cache.get(endpointId);
    if (stats) {
      if (action === 'connect') stats.current_connections++;
      // ...
    }
  }

  // 定期同步缓存到数据库
  async syncToDatabase() {
    for (const [endpointId, stats] of this.cache.entries()) {
      await prisma.endpointStats.update({
        where: { endpoint_id: endpointId },
        data: stats
      });
    }
  }
}
```

**优势:**
- 读取性能极高（直接从内存）
- 减少数据库读写次数

**劣势:**
- 内存占用增加
- 缓存一致性问题复杂
- 实现和维护成本高

---

### 性能监控指标收集

**关键指标:**

| 指标类别 | 指标名称 | 收集方式 | 目标值 |
|---------|---------|---------|-------|
| **WebSocket** | 消息延迟 (p50/p95/p99) | 压测工具 | p95 < 100ms |
| **WebSocket** | 并发连接数 | ConnectionManager | 500+ |
| **WebSocket** | 消息吞吐量 | 压测工具 | > 500 msg/s |
| **数据库** | 查询响应时间 | Prisma Logs | < 50ms |
| **数据库** | 慢查询数量 | MySQL Slow Query Log | 0 |
| **系统** | CPU 使用率 | PM2 监控 | < 70% |
| **系统** | 内存使用 | PM2 监控 | 稳定,无泄漏 |
| **系统** | 进程重启次数 | PM2 日志 | 0 |

**监控实现:**

```typescript
// monitoring.service.ts
import { performance } from 'perf_hooks';

export class PerformanceMonitor {
  // 记录消息处理延迟
  measureMessageLatency(startTime: number): number {
    const latency = performance.now() - startTime;
    logger.info('message_latency', { latency });
    return latency;
  }

  // 记录数据库查询时间
  async measureDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const result = await queryFn();
    const duration = performance.now() - start;
    logger.info('db_query', { name: queryName, duration });
    return result;
  }
}
```

---

## Validation Checklist

### Scope Validation:

- [x] Epic 包含 3 个 Story,符合 1-3 个故事的范围限制
- [x] 无重大架构变更,主要是性能优化和测试工具集成
- [x] 遵循现有技术栈和设计模式（Monorepo, Service 层, Prisma ORM）
- [x] 集成点清晰,影响范围可控

### Risk Assessment:

- [x] 对现有系统的风险较低（有完整的回归测试保护）
- [x] 回滚方案可行（通过 Git 回滚,数据库迁移可回退）
- [x] 测试方法明确（压力测试 + 集成测试 + 功能回归测试）
- [x] 团队具备必要知识（Node.js 性能优化, MySQL 优化, Prisma 最佳实践）

### Completeness Check:

- [x] Epic 目标明确：建立压力测试体系,执行性能优化,达到生产环境上线标准
- [x] Stories 涵盖所有需求点（测试工具集成、瓶颈分析、数据库优化、WebSocket 优化）
- [x] 成功标准可衡量（50+ 端点、10 连接/端点、p95 < 100ms、500+ msg/s）
- [x] 依赖项已识别（stats.service.ts, connection-manager.ts, message-router.ts）

---

## Success Metrics

**性能提升对比:**

| 指标 | 当前 PRD 目标 | Epic 9 目标 | 提升倍数 |
|-----|-------------|-----------|---------|
| 并发端点 | 10 个 | **50+ 个** | 5x |
| 每端点连接数 | 5 个 | **10 个** | 2x |
| 消息延迟 (p95) | < 100ms | **< 100ms** | 保持 |
| 消息吞吐量 | 未定义 | **> 500 msg/s** | 新增 |
| 数据库查询 | 未定义 | **< 50ms** | 新增 |
| CPU 使用率 | 未定义 | **< 70%** | 新增 |

**问题解决率:**
- 性能瓶颈识别: 100%（至少 3 个）
- 性能瓶颈优化: 100%（全部优化）
- 测试覆盖率: 100%（4 种测试场景全覆盖）
- 文档完整性: 100%（3 份性能报告）

---

## Roadmap

| Phase | Story | Priority | Estimated Effort |
|-------|-------|----------|------------------|
| Phase 1 | 9.1 - 压力测试工具集成与性能基准测试 | P0 | 6-8 小时 |
| Phase 2 | 9.2 - 性能瓶颈分析与数据库优化 | P0 | 8-12 小时 |
| Phase 3 | 9.3 - WebSocket 性能优化与最终验证 | P0 | 8-12 小时 |

**Total Estimated Effort:** 22-32 小时（约 3-4 个开发周期）

**Story 9.1 工作量分解:**
- 评估和集成压力测试工具: 2-3 小时
- 设计测试场景脚本: 2-3 小时
- 执行基准测试: 1-2 小时
- 生成基准报告: 1 小时

**Story 9.2 工作量分解:**
- 性能分析和瓶颈识别: 2-3 小时
- 设计优化方案: 2-3 小时
- 实现统计更新优化: 2-3 小时
- 数据库优化: 1-2 小时
- 验证测试和报告: 1-2 小时

**Story 9.3 工作量分解:**
- WebSocket 核心逻辑优化: 3-4 小时
- 连接池管理优化: 2-3 小时
- 生产环境配置: 1-2 小时
- 最终压力测试: 1-2 小时
- 总结报告和文档更新: 1-2 小时

---

## Change Log

| Date       | Version | Description                     | Author         |
|------------|---------|---------------------------------|----------------|
| 2025-11-02 | 1.0     | 初始创建 Epic 9（压力测试与性能优化） | Sarah (PO)     |

---

## Story Manager Handoff

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- **This is an enhancement to an existing system running:**
  - 后端: Node.js 20.x + Express 4.18 + TypeScript 5.3
  - WebSocket: ws 8.x
  - 数据库: MySQL 8.0 + Prisma 5.x ORM
  - 进程管理: PM2 5.x
  - 监控: PM2 内置监控 + Winston 日志

- **Integration points:**
  - WebSocket 服务器: `packages/backend/src/websocket/server.ts`
  - 连接池管理: `packages/backend/src/websocket/connection-manager.ts`
  - 消息路由: `packages/backend/src/websocket/message-router.ts`
  - 统计服务: `packages/backend/src/services/stats.service.ts`
  - 数据库模型: Endpoint, EndpointStats, DeviceData, AlertRule (Prisma)

- **Existing patterns to follow:**
  - Service 层模式: 所有业务逻辑通过 Service 层抽象
  - Prisma ORM: 所有数据库操作使用 Prisma
  - 错误处理: 统一的错误处理中间件
  - 测试策略: 单元测试 + 集成测试（Jest）

- **Critical compatibility requirements:**
  - 所有性能优化不修改 REST API 和 WebSocket 协议
  - 数据库 Schema 向后兼容（仅添加索引,不删除或修改字段）
  - 前端无需修改（性能优化完全在后端）
  - 压力测试使用独立的测试数据库

- **Each story must include verification that existing functionality remains intact:**
  - 功能回归测试验证现有端点管理、WebSocket 消息转发正常
  - WebSocket 集成测试验证端点隔离、设备管理功能不受影响
  - 性能优化前后的对比测试

The epic should maintain system integrity while delivering **5x 并发能力提升、完整的性能测试体系、针对性的性能优化、生产环境就绪的性能配置**."

---
