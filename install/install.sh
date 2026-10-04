#!/bin/bash
set -eo pipefail

REPO="cuongdc03/brew-hub"
APP_NAME="brew-hub.app"
INSTALL_DIR="/Applications"

echo "🍺 Installing Brew Hub for macOS..."

ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    DMG_ARCH="aarch64"
elif [ "$ARCH" = "x86_64" ]; then
    DMG_ARCH="x64"
else
    echo "❌ Unsupported architecture: $ARCH (macOS Apple Silicon or Intel required)" >&2
    exit 1
fi

echo "🔍 Discovering latest release from $REPO..."
LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null | grep '"tag_name":' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/' || true)

if [ -z "$LATEST_TAG" ]; then
    # Try GitHub redirect location header for releases/latest
    LATEST_TAG=$(curl -fsSI "https://github.com/$REPO/releases/latest" 2>/dev/null | grep -i '^location:' | sed -E 's/.*tag\/(.*)/\1/' | tr -d '\r\n' || true)
fi

if [ -z "$LATEST_TAG" ]; then
    # Fallback to tags API
    LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/tags" 2>/dev/null | grep '"name":' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/' || true)
fi

if [ -z "$LATEST_TAG" ]; then
    LATEST_TAG="v0.1.2"
fi

VERSION="${LATEST_TAG#v}"
DMG_NAME="brew-hub_${VERSION}_${DMG_ARCH}.dmg"
DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/$DMG_NAME"

TMP_DIR=$(mktemp -d)
MOUNT_POINT="$TMP_DIR/mount"

cleanup() {
    if mount | grep -q "$MOUNT_POINT"; then
        hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
    fi
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

echo "⬇️  Downloading $DMG_NAME ($LATEST_TAG)..."
if ! curl -fsSL "$DOWNLOAD_URL" -o "$TMP_DIR/brew-hub.dmg"; then
    echo "❌ Failed to download $DOWNLOAD_URL" >&2
    echo "Please visit https://github.com/$REPO/releases to download the DMG manually." >&2
    exit 1
fi

# Optional SHA-256 checksum verification
CHECKSUM_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/${DMG_NAME}.sha256"
if curl -fsSL -o "$TMP_DIR/checksum.sha256" "$CHECKSUM_URL" 2>/dev/null; then
    echo "🔒 Verifying SHA-256 checksum..."
    EXPECTED_SHA=$(awk '{print $1}' "$TMP_DIR/checksum.sha256")
    ACTUAL_SHA=$(shasum -a 256 "$TMP_DIR/brew-hub.dmg" | awk '{print $1}')
    if [ "$EXPECTED_SHA" != "$ACTUAL_SHA" ]; then
        echo "❌ Checksum verification failed!" >&2
        echo "Expected: $EXPECTED_SHA" >&2
        echo "Actual:   $ACTUAL_SHA" >&2
        exit 1
    fi
    echo "Checksum verified: $ACTUAL_SHA"
fi

echo "💿 Mounting DMG archive..."
mkdir -p "$MOUNT_POINT"
if ! hdiutil attach "$TMP_DIR/brew-hub.dmg" -mountpoint "$MOUNT_POINT" -nobrowse -quiet; then
    echo "❌ Failed to mount DMG installer. The download file may be corrupt." >&2
    exit 1
fi

echo "📦 Installing to $INSTALL_DIR..."
rm -rf "$INSTALL_DIR/$APP_NAME"
cp -R "$MOUNT_POINT/$APP_NAME" "$INSTALL_DIR/"

echo "🛡️  Configuring macOS Gatekeeper authorization..."
xattr -cr "$INSTALL_DIR/$APP_NAME"

echo "✅ Brew Hub ($LATEST_TAG) was successfully installed to $INSTALL_DIR/$APP_NAME!"
echo "🚀 You can now launch Brew Hub from Spotlight or Applications."
