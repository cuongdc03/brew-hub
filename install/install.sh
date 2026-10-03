#!/bin/bash
set -e

REPO="cuongdc03/brew-hub"
APP_NAME="brew-hub.app"
INSTALL_DIR="/Applications"

echo "🍺 Downloading Brew Hub for macOS..."

ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    DMG_ARCH="aarch64"
else
    DMG_ARCH="x64"
fi

LATEST_TAG=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_TAG" ]; then
    LATEST_TAG="v0.1.2"
fi

VERSION="${LATEST_TAG#v}"
DMG_NAME="brew-hub_${VERSION}_${DMG_ARCH}.dmg"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/$DMG_NAME"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "⬇️  Fetching $DMG_NAME from $LATEST_TAG..."
curl -sL "$DOWNLOAD_URL" -o "$TMP_DIR/brew-hub.dmg"

echo "💿 Mounting installer..."
MOUNT_POINT="$TMP_DIR/mount"
mkdir -p "$MOUNT_POINT"
hdiutil attach "$TMP_DIR/brew-hub.dmg" -mountpoint "$MOUNT_POINT" -nobrowse -quiet

echo "📦 Installing to $INSTALL_DIR..."
rm -rf "$INSTALL_DIR/$APP_NAME"
cp -R "$MOUNT_POINT/$APP_NAME" "$INSTALL_DIR/"

echo "🛡️  Configuring macOS Gatekeeper authorization..."
xattr -cr "$INSTALL_DIR/$APP_NAME"

echo "⏏️  Cleaning up..."
hdiutil detach "$MOUNT_POINT" -quiet

echo "✅ Brew Hub was successfully installed to $INSTALL_DIR!"
echo "🚀 You can now launch Brew Hub from Spotlight or Applications."
