# Abre um túnel HTTPS gratuito da Cloudflare apontando para o frontend local (porta 3000)
# Uso: powershell -ExecutionPolicy Bypass -File scripts/tunel_cloudflare.ps1

$ErrorActionPreference = "Stop"

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    $localExe = Join-Path $PSScriptRoot "..\.local\cloudflared.exe"
    if (-not (Test-Path $localExe)) {
        New-Item -ItemType Directory -Force -Path (Split-Path $localExe) | Out-Null
        Write-Host "Baixando cloudflared oficial para .local/cloudflared.exe..." -ForegroundColor Cyan
        Invoke-WebRequest `
            -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" `
            -OutFile $localExe
    }
    $bin = $localExe
} else {
    $bin = $cloudflared.Source
}

Write-Host "Iniciando túnel HTTPS Cloudflare para http://127.0.0.1:3000 ..." -ForegroundColor Green
Write-Host "Dica: se outro computador for acessar a API também, abra outro túnel para http://127.0.0.1:8000 e configure NEXT_PUBLIC_API_URL." -ForegroundColor Yellow
& $bin tunnel --url http://127.0.0.1:3000
