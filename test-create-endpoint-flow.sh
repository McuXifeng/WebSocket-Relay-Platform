#!/bin/bash

# Story 2.6 - 创建端点功能测试脚本

echo "🧪 Story 2.6: 创建端点功能测试"
echo "================================"
echo ""

# 1. 登录获取 Token
echo "📝 步骤 1: 登录获取 Token..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")
echo "✅ Token 获取成功"
echo ""

# 2. 获取当前端点列表
echo "📝 步骤 2: 获取当前端点列表..."
ENDPOINTS_BEFORE=$(curl -s -X GET "http://localhost:3000/api/endpoints" \
  -H "Authorization: Bearer $TOKEN")
COUNT_BEFORE=$(echo $ENDPOINTS_BEFORE | python3 -c "import sys, json; print(len(json.load(sys.stdin)['data']['endpoints']))")
echo "✅ 当前端点数量: $COUNT_BEFORE"
echo ""

# 3. 创建新端点（输入名称）
echo "📝 步骤 3: 创建新端点（输入名称: '前端测试端点'）..."
CREATE_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/endpoints" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"前端测试端点"}')

ENDPOINT_ID=$(echo $CREATE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['endpoint']['endpoint_id'])")
ENDPOINT_NAME=$(echo $CREATE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['endpoint']['name'])")
WS_URL=$(echo $CREATE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['endpoint']['websocket_url'])")

echo "✅ 端点创建成功:"
echo "   - ID: $ENDPOINT_ID"
echo "   - 名称: $ENDPOINT_NAME"
echo "   - WebSocket URL: $WS_URL"
echo ""

# 4. 创建新端点（不输入名称，使用默认值）
echo "📝 步骤 4: 创建新端点（不输入名称，使用默认值）..."
CREATE_RESPONSE_2=$(curl -s -X POST "http://localhost:3000/api/endpoints" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}')

ENDPOINT_ID_2=$(echo $CREATE_RESPONSE_2 | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['endpoint']['endpoint_id'])")
ENDPOINT_NAME_2=$(echo $CREATE_RESPONSE_2 | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['endpoint']['name'])")

echo "✅ 端点创建成功:"
echo "   - ID: $ENDPOINT_ID_2"
echo "   - 名称: $ENDPOINT_NAME_2"
echo ""

# 5. 再次获取端点列表验证刷新
echo "📝 步骤 5: 再次获取端点列表验证刷新..."
ENDPOINTS_AFTER=$(curl -s -X GET "http://localhost:3000/api/endpoints" \
  -H "Authorization: Bearer $TOKEN")
COUNT_AFTER=$(echo $ENDPOINTS_AFTER | python3 -c "import sys, json; print(len(json.load(sys.stdin)['data']['endpoints']))")
echo "✅ 更新后端点数量: $COUNT_AFTER"
echo ""

# 6. 测试端点数量上限（创建 5 个端点后再创建）
REMAINING=$((5 - COUNT_AFTER))
if [ $REMAINING -gt 0 ]; then
  echo "📝 步骤 6: 创建剩余端点直到达到上限..."
  for i in $(seq 1 $REMAINING); do
    curl -s -X POST "http://localhost:3000/api/endpoints" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{\"name\":\"测试端点 $i\"}" > /dev/null
    echo "   ✅ 已创建端点 $i"
  done
  echo ""
fi

echo "📝 步骤 7: 测试端点数量上限错误..."
LIMIT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/endpoints" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"超限端点"}')

ERROR_CODE=$(echo $LIMIT_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('error', {}).get('code', 'N/A'))" 2>/dev/null || echo "N/A")
ERROR_MSG=$(echo $LIMIT_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('error', {}).get('message', 'N/A'))" 2>/dev/null || echo "N/A")

if [ "$ERROR_CODE" = "ENDPOINT_LIMIT_REACHED" ]; then
  echo "✅ 端点数量上限错误测试通过:"
  echo "   - 错误码: $ERROR_CODE"
  echo "   - 错误消息: $ERROR_MSG"
else
  echo "❌ 端点数量上限错误测试失败 (错误码: $ERROR_CODE)"
fi
echo ""

echo "🎉 所有 API 测试完成！"
echo ""
echo "📌 接下来请手动测试前端界面:"
echo "   1. 打开浏览器访问: http://localhost:5173"
echo "   2. 使用账号登录: admin / admin123"
echo "   3. 点击「创建端点」按钮"
echo "   4. 测试以下场景:"
echo "      - 输入端点名称并创建"
echo "      - 不输入名称直接创建"
echo "      - 验证 Modal 打开/关闭"
echo "      - 验证成功提示消息"
echo "      - 验证列表刷新"
echo "      - 达到上限后测试错误提示"
