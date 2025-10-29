/**
 * Jest 测试环境设置文件
 * 在所有测试运行前执行，配置测试专用环境
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mysql://root:password@localhost:3306/websocket_relay_test';

// 可选：设置其他测试专用的环境变量
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.API_PORT = '3000';
process.env.WS_PORT = '3001';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.LOG_LEVEL = 'error'; // 测试时减少日志输出

console.log('🧪 Test environment initialized');
console.log(`📊 Test database: ${process.env.DATABASE_URL}`);
