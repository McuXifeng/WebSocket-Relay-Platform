/**
 * PM2 配置文件
 * 用于生产环境部署和性能监控
 *
 * 使用方法:
 * - 启动: pm2 start ecosystem.config.cjs
 * - 监控: pm2 monit
 * - 查看日志: pm2 logs
 * - 停止: pm2 stop all
 *
 * 注意: 使用 .cjs 扩展名以支持 CommonJS (PM2 不支持 ESM)
 */

module.exports = {
  apps: [
    {
      // 应用配置
      name: 'websocket-relay-backend',
      script: './dist/server.js', // 编译后的入口文件
      cwd: __dirname,

      // 实例配置
      instances: 1, // 单实例模式 (WebSocket 连接池在内存中,暂不支持多实例)
      exec_mode: 'fork', // fork 模式 (vs cluster 模式)

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_test: {
        NODE_ENV: 'test',
        PORT: 3001,
      },

      // 性能监控配置
      monitoring: true, // 启用 PM2 内置监控
      max_memory_restart: '500M', // 内存超过 500MB 自动重启 (防止内存泄漏)

      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      merge_logs: true, // 合并集群日志
      time: true, // 日志中包含时间戳

      // 进程管理
      autorestart: true, // 自动重启
      watch: false, // 不监听文件变化 (生产环境禁用)
      max_restarts: 10, // 最大重启次数 (防止无限重启循环)
      min_uptime: '10s', // 最小运行时间 (低于此时间的重启视为异常)
      restart_delay: 4000, // 重启延迟 (毫秒)

      // 进程守护
      kill_timeout: 5000, // 优雅关闭超时时间 (毫秒)
      listen_timeout: 3000, // 端口监听超时时间 (毫秒)
      shutdown_with_message: false,

      // 集群模式高级配置 (未来如果切换到多实例)
      // instances: 'max', // 使用所有 CPU 核心
      // exec_mode: 'cluster',
      // instance_var: 'INSTANCE_ID',
    },

    // 可选: 性能测试专用进程
    {
      name: 'websocket-relay-perf-test',
      script: './dist/server.js',
      cwd: __dirname,

      // 仅在性能测试时启动
      autorestart: false,
      instances: 1,
      exec_mode: 'fork',

      env_perf_test: {
        NODE_ENV: 'test',
        PORT: 3001,
        DATABASE_URL: 'mysql://root:password@localhost:3306/websocket_relay_test',
      },

      // 性能测试时放宽资源限制
      max_memory_restart: '1G',
      monitoring: true,

      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS Z',
      error_file: './logs/pm2-perf-test-error.log',
      out_file: './logs/pm2-perf-test-out.log',
    },
  ],

  // 部署配置 (可选)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/websocket-relay-platform.git',
      path: '/var/www/websocket-relay',
      'post-deploy':
        'pnpm install && pnpm build && pm2 reload ecosystem.config.cjs --env production',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
};
