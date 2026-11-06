$ErrorActionPreference = 'Stop'
$identity = Invoke-RestMethod 'http://127.0.0.1:32145/api/state' -TimeoutSec 3 -ErrorAction SilentlyContinue
if ($identity -and $identity.app -ne 'poketoken-windows') { throw 'The port belongs to a different app.' }
$connection = Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort 32145 -State Listen -ErrorAction SilentlyContinue
if (-not $connection) { Write-Host 'PokeToken is not running.'; exit }
$appProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection[0].OwningProcess)"
if ($appProcess.Name -eq 'node.exe' -and $appProcess.CommandLine -match 'server\.mjs') {
    Stop-Process -Id $appProcess.ProcessId
    Write-Host 'PokeToken stopped. Your progress is saved.'
} else { throw 'The port belongs to a different app. Nothing was stopped.' }
