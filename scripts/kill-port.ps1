param(
    [Parameter(Mandatory=$true)]
    [int]$Port
)

Write-Host "Checking port $Port..." -ForegroundColor Yellow

try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

    if ($connections) {
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

            if ($process) {
                Write-Host "Killing process $($process.Name) (PID: $processId) on port $Port..." -ForegroundColor Red
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Host "Process killed successfully." -ForegroundColor Green
            }
        }

        # Wait for port to be released
        Start-Sleep -Seconds 1
        Write-Host "Port $Port is now free." -ForegroundColor Green
    } else {
        Write-Host "Port $Port is already free." -ForegroundColor Green
    }
} catch {
    Write-Host "Port $Port is free or no process found." -ForegroundColor Green
}

exit 0
