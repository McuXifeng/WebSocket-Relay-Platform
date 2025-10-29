import { wss } from './websocket/server.js';

// eslint-disable-next-line no-console
console.log('WebSocket server is running on ws://localhost:3001');

// 优雅关闭处理
process.on('SIGINT', () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    // eslint-disable-next-line no-console
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down WebSocket server...');
  wss.close(() => {
    // eslint-disable-next-line no-console
    console.log('WebSocket server closed');
    process.exit(0);
  });
});
