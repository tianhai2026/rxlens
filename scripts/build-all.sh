#!/bin/bash
# RxLens v4.0.0 全平台构建脚本
# 支持：Windows (.exe) / macOS (.dmg) / Android (.apk) / PWA Web
# 鸿蒙 (.hap) 为实验性，需等待 Tauri 官方支持

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VERSION="4.0.0"

echo "========================================"
echo "  处方镜 RxLens v${VERSION} 全平台构建"
echo "========================================"
echo ""

# 1. 构建前端
echo "[1/4] 构建前端 (Next.js)..."
cd "$PROJECT_ROOT"
npm run build

# 2. 检查 Tauri CLI
echo ""
echo "[2/4] 检查 Tauri CLI..."
if ! command -v cargo-tauri &> /dev/null; then
    echo "正在安装 Tauri CLI..."
    cargo install tauri-cli --version '^2.0.0'
fi

# 3. 桌面端构建
echo ""
echo "[3/4] 构建桌面端..."

# Windows (需在 Windows 或交叉编译环境)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    echo "  -> 构建 Windows 安装包 (.exe)..."
    cargo tauri build --target x86_64-pc-windows-msvc
fi

# macOS (需在 macOS 环境)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  -> 构建 macOS 安装包 (.dmg)..."
    cargo tauri build --target aarch64-apple-darwin
    cargo tauri build --target x86_64-apple-darwin
fi

# Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "  -> 构建 Linux 安装包 (.AppImage / .deb)..."
    cargo tauri build
fi

# 4. 移动端构建（需对应 SDK）
echo ""
echo "[4/4] 构建移动端..."

# Android
if command -v java &> /dev/null && [ -n "$ANDROID_HOME" ]; then
    echo "  -> 构建 Android 安装包 (.apk)..."
    cargo tauri android build
else
    echo "  ⚠️ 跳过 Android 构建（未配置 Android SDK）"
fi

# 鸿蒙 OpenHarmony（实验性）
echo ""
echo "  鸿蒙 HarmonyOS (.hap)"
echo "  ⚠️ 实验性适配，当前需手动通过 DevEco Studio 构建"
echo "  请参见 MANUAL.md 鸿蒙安装指南"

# 输出构建产物
echo ""
echo "========================================"
echo "  构建完成"
echo "========================================"
echo ""
echo "构建产物目录:"
echo "  Windows: src-tauri/target/release/bundle/nsis/"
echo "  macOS:   src-tauri/target/release/bundle/dmg/"
echo "  Linux:   src-tauri/target/release/bundle/appimage/"
echo "  Android: src-tauri/gen/android/app/build/outputs/apk/"
echo "  鸿蒙:    dist/ohos/ (需手动构建 .hap)"
echo ""
