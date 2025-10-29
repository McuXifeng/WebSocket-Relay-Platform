#!/bin/bash

echo "=== 测试登录流程 ==="
echo ""

# 1. 登录获取 token
echo "1. 登录获取 token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

echo "登录响应:"
echo "$LOGIN_RESPONSE" | jq '.'

# 提取 token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，未获取到 token"
  exit 1
fi

echo ""
echo "✅ Token 获取成功: ${TOKEN:0:20}..."

# 2. 测试 /auth/me API (模拟页面刷新时的验证)
echo ""
echo "2. 测试 /auth/me API (验证 token)..."
ME_RESPONSE=$(curl -s -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN")

echo "验证响应:"
echo "$ME_RESPONSE" | jq '.'

# 检查是否成功获取用户信息
USERNAME=$(echo "$ME_RESPONSE" | jq -r '.data.user.username // empty')

if [ -z "$USERNAME" ]; then
  echo "❌ Token 验证失败，未获取到用户信息"
  exit 1
fi

echo ""
echo "✅ Token 验证成功，用户: $USERNAME"

# 3. 测试获取端点列表
echo ""
echo "3. 测试获取端点列表..."
ENDPOINTS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/endpoints \
  -H "Authorization: Bearer $TOKEN")

echo "端点列表响应:"
echo "$ENDPOINTS_RESPONSE" | jq '.'

echo ""
echo "=== 测试完成 ==="
