#!/usr/bin/env bash
# ==============================================================================
# TestCraft - Global Installer for Unix / Linux / macOS
# Installs ValidateKaro & testcraft to system PATH (/usr/local/bin or ~/.local/bin)
# ==============================================================================

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$REPO_DIR/ValidateKaro" "$REPO_DIR/validatekaro" "$REPO_DIR/testcraft"

# Check destination directory
TARGET_DIR="/usr/local/bin"
if [ ! -w "$TARGET_DIR" ]; then
    TARGET_DIR="$HOME/.local/bin"
    mkdir -p "$TARGET_DIR"
fi

echo "Installing ValidateKaro and testcraft to $TARGET_DIR..."

ln -sf "$REPO_DIR/ValidateKaro" "$TARGET_DIR/ValidateKaro"
ln -sf "$REPO_DIR/validatekaro" "$TARGET_DIR/validatekaro"
ln -sf "$REPO_DIR/testcraft" "$TARGET_DIR/testcraft"

echo ""
echo "✔ Installation Complete!"
echo "You can now run 'ValidateKaro' from ANY directory on your machine:"
echo "    cd /any/random/folder"
echo "    ValidateKaro"
echo "    ValidateKaro my_script.py"
