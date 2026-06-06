# RxLens v4.0.0 全平台构建脚本 (PowerShell)
# 支持：Windows (.exe) / PWA Web

$ErrorActionPreference = "Stop"

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$VERSION = "4.0.0"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  处方镜 RxLens v${VERSION} 全平台构建" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 构建前端
Write-Host "[1/3] 构建前端 (Next.js)..." -ForegroundColor Yellow
Set-Location $PROJECT_ROOT
npm run build

# 2. 检查 Tauri CLI
Write-Host ""
Write-Host "[2/3] 检查 Tauri CLI..." -ForegroundColor Yellow
$tauriCli = Get-Command cargo-tauri -ErrorAction SilentlyContinue
if (-not $tauriCli) {
    Write-Host "正在安装 Tauri CLI..." -ForegroundColor DarkGray
    cargo install tauri-cli --version '^2.0.0'
}

# 3. 构建 Windows 桌面端
Write-Host ""
Write-Host "[3/3] 构建 Windows 安装包 (.exe)..." -ForegroundColor Yellow
cargo tauri build --target x86_64-pc-windows-msvc

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  构建完成" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "构建产物目录:" -ForegroundColor White
Write-Host "  Windows: src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\" -ForegroundColor DarkGray
Write-Host ""
Write-Host "其他平台构建说明:" -ForegroundColor White
Write-Host "  macOS:   需在 macOS 环境运行 cargo tauri build" -ForegroundColor DarkGray
Write-Host "  Android: 需配置 Android SDK 后运行 cargo tauri android build" -ForegroundColor DarkGray
Write-Host "  鸿蒙:    实验性适配，请参见 MANUAL.md" -ForegroundColor DarkGray
Write-Host ""
