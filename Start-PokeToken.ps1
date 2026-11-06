param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$appUrl = 'http://127.0.0.1:32145'
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'data') | Out-Null
try { $running = Invoke-RestMethod "$appUrl/api/state" -TimeoutSec 2 } catch { $running = $null }
if ($running -and $running.app -ne 'poketoken-windows') { throw 'Port 32145 is used by another app.' }
if (-not $running) {
    $nodePath = (Get-Command node -ErrorAction Stop).Source
    Start-Process -FilePath $nodePath -ArgumentList 'server.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'data/server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'data/error.log')
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        Start-Sleep -Milliseconds 500
        try { $running = Invoke-RestMethod "$appUrl/api/state" -TimeoutSec 1; break } catch {}
    }
    if (-not $running) { throw 'Could not start PokeToken. Check data/error.log.' }
}
if (-not $NoBrowser) { Start-Process $appUrl }
