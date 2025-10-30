#!/bin/bash

# 测试可视化API
# 使用文件避免Shell转义问题

# 登录获取Token
echo "=== 登录获取Token ==="
cat > /tmp/login.json << 'EOF'
{
  "username": "admin",
  "password": "Admin123!"
}
EOF

TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d @/tmp/login.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取Token"
  exit 1
fi

echo "✅ Token获取成功: ${TOKEN:0:20}..."
echo ""

# 测试获取所有卡片
echo "=== 测试 GET /api/visualization/cards ==="
CARDS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/visualization/cards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$CARDS_RESPONSE" | python3 -m json.tool
echo ""

# 清理临时文件
rm -f /tmp/login.json

echo "✅ 测试完成"
