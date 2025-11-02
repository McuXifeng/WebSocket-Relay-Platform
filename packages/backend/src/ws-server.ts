import { wss } from './websocket/server.js';
import { statsBatchUpdater } from './services/stats-batch-updater.js';

// eslint-disable-next-line no-console
console.log('WebSocket server is running on ws://localhost:3001');

// 优雅关闭处理
// Story 9.2: 在进程退出前刷新所有未提交的统计数据
process.on('SIGINT', () => {
  void (async () => {
    // eslint-disable-next-line no-console
    console.log('Shutting down WebSocket server...');

    // 先关闭批量更新器，刷新未提交的数据
    await statsBatchUpdater.shutdown();

    wss.close(() => {
      // eslint-disable-next-line no-console
      console.log('WebSocket server closed');
      process.exit(0);
    });
  })();
});

process.on('SIGTERM', () => {
  void (async () => {
    // eslint-disable-next-line no-console
    console.log('Shutting down WebSocket server...');

    // 先关闭批量更新器，刷新未提交的数据
    await statsBatchUpdater.shutdown();

    wss.close(() => {
      // eslint-disable-next-line no-console
      console.log('WebSocket server closed');
      process.exit(0);
    });
  })();
});
