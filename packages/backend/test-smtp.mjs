/**
 * 测试 SMTP 连接和邮件发送
 */
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testSmtp() {
  console.log('========================================');
  console.log('SMTP 连接和邮件发送测试');
  console.log('========================================\n');

  console.log('[1/3] 读取 SMTP 配置...');
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  console.log('配置信息:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Secure: ${config.secure}`);
  console.log(`  User: ${config.auth.user}`);
  console.log(`  Pass: ${config.auth.pass ? '***已设置***' : '未设置'}\n`);

  if (!config.host || !config.auth.user || !config.auth.pass) {
    console.error('❌ SMTP 配置不完整');
    return;
  }

  console.log('[2/3] 创建邮件传输器...');
  let transporter;
  try {
    transporter = nodemailer.createTransport(config);
    console.log('✅ 传输器创建成功\n');
  } catch (error) {
    console.error('❌ 传输器创建失败:', error.message);
    return;
  }

  console.log('[3/3] 发送测试邮件...');
  const mailOptions = {
    from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    to: '3531313387@qq.com',
    subject: '[测试] WebSocket Relay 告警系统邮件测试',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>测试邮件</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>这是一封测试邮件</h2>
  <p>如果您收到这封邮件，说明 SMTP 配置正确。</p>
  <p>发送时间: ${new Date().toLocaleString('zh-CN')}</p>
</body>
</html>
    `.trim(),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ 邮件发送成功！');
    console.log(`   MessageID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    console.log('\n========================================');
    console.log('🎉 SMTP 测试通过！');
    console.log('========================================');
    console.log('\n请检查邮箱: 3531313387@qq.com');
  } catch (error) {
    console.error('\n❌ 邮件发送失败:');
    console.error(`   错误类型: ${error.name}`);
    console.error(`   错误信息: ${error.message}`);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    if (error.command) {
      console.error(`   SMTP命令: ${error.command}`);
    }
    console.error('\n可能的原因:');
    console.error('  1. SMTP 服务器地址或端口错误');
    console.error('  2. 用户名或密码错误');
    console.error('  3. 网络连接问题');
    console.error('  4. SMTP 服务器拒绝连接');
  }
}

testSmtp()
  .catch((e) => console.error('测试失败:', e))
  .finally(() => process.exit(0));
