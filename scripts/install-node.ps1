$msi = 'https://nodejs.org/dist/v26.3.0/node-v26.3.0-x64.msi'
$out = Join-Path $env:TEMP 'node-lts.msi'
Write-Host "Downloading to: $out"
Invoke-WebRequest -Uri $msi -OutFile $out -UseBasicParsing
Write-Host "Downloaded"
$arg = @('/i', $out, '/qn', '/norestart')
Write-Host "Running msiexec with args: $arg"
Start-Process -FilePath msiexec -ArgumentList $arg -Verb RunAs -Wait
Write-Host "Installer finished"
# Try to verify
try { Write-Host "node:"; node -v } catch { Write-Host "node_not_found" }
try { Write-Host "npm:"; npm -v } catch { Write-Host "npm_not_found" }
