#!/bin/bash

PORT=${1:-3000}

echo "Cleaning up port $PORT..."

# For Windows (Git Bash)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    powershell.exe -ExecutionPolicy Bypass -File "./scripts/kill-port.ps1" -Port $PORT
# For Unix-like systems
else
    # Find and kill process using the port
    PID=$(lsof -ti:$PORT)
    if [ ! -z "$PID" ]; then
        echo "Killing process $PID on port $PORT..."
        kill -9 $PID
        echo "Port $PORT is now free."
    else
        echo "Port $PORT is already free."
    fi
fi

exit 0
