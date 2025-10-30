#!/bin/bash

# 测试设备数据历史查询API
echo "🧪 测试设备数据历史查询API"
echo "=========================================="

# 设置变量
ENDPOINT_ID="37935127-a03b-480d-8d0d-1ffe96abd74e"
DEVICE_ID="96344914-1a6a-4b3f-9458-1b6ea4396b21"
DATA_KEY="temperature"

# 获取Token (使用已有的admin用户)
echo "📝 登录获取Token..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取Token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Token获取成功: ${TOKEN:0:20}..."
echo ""

# 测试1: 查询最近1小时的历史数据（无聚合）
echo "测试1: 查询最近1小时历史数据（无聚合）"
START_TIME=$(date -u -v-1H '+%Y-%m-%dT%H:%M:%SZ')
END_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

echo "时间范围: $START_TIME ~ $END_TIME"

RESPONSE=$(curl -s -X GET \
  "http://localhost:3000/api/visualization/endpoints/${ENDPOINT_ID}/devices/${DEVICE_ID}/data/history?dataKey=${DATA_KEY}&startTime=${START_TIME}&endTime=${END_TIME}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "响应:"
echo "$RESPONSE" | python3 -m json.tool || echo "$RESPONSE"
echo ""
echo "=========================================="

# 测试2: 查询最近24小时的历史数据（按小时聚合）
echo "测试2: 查询最近24小时历史数据（按小时聚合）"
START_TIME=$(date -u -v-24H '+%Y-%m-%dT%H:%M:%SZ')
END_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

echo "时间范围: $START_TIME ~ $END_TIME"

RESPONSE=$(curl -s -X GET \
  "http://localhost:3000/api/visualization/endpoints/${ENDPOINT_ID}/devices/${DEVICE_ID}/data/history?dataKey=${DATA_KEY}&startTime=${START_TIME}&endTime=${END_TIME}&aggregation=hour" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "响应:"
echo "$RESPONSE" | python3 -m json.tool || echo "$RESPONSE"
echo ""
echo "=========================================="

echo "✅ 测试完成"
