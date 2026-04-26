#!/usr/bin/env bash
set -euo pipefail

OWNER="LetPeopleWork"
REPO="lighthouse-clients"
BINARY="lh"

# --- Determine install dir ---
if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR="${HOME}/.local/bin"
fi

# Allow override via env
INSTALL_DIR="${LH_INSTALL_DIR:-${INSTALL_DIR}}"

# --- Detect OS and arch ---
os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"

case "${arch}" in
  x86_64|amd64) arch="x64" ;;
  aarch64|arm64) arch="arm64" ;;
  *)
    echo "Unsupported architecture: ${arch}"
    exit 1
    ;;
esac

case "${os}" in
  linux)
    asset="${BINARY}-linux-${arch}.tar.gz"
    extract_cmd="tar -xzf"
    ;;
  darwin)
    asset="${BINARY}-darwin-${arch}.tar.gz"
    extract_cmd="tar -xzf"
    ;;
  msys*|mingw*|cygwin*)
    asset="${BINARY}-windows-${arch}.zip"
    extract_cmd="unzip -o"
    BINARY="${BINARY}.exe"
    INSTALL_DIR="${LOCALAPPDATA:-${HOME}/AppData/Local}/Programs/lh"
    ;;
  *)
    echo "Unsupported operating system: ${os}"
    exit 1
    ;;
esac

# --- Download ---
tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

download_url="https://github.com/${OWNER}/${REPO}/releases/latest/download/${asset}"
archive_path="${tmp_dir}/${asset}"

echo "Downloading ${download_url} ..."
curl -fsSL "${download_url}" -o "${archive_path}"

# --- Extract and install ---
mkdir -p "${INSTALL_DIR}"

if [[ "${asset}" == *.zip ]]; then
  ${extract_cmd} "${archive_path}" -d "${tmp_dir}"
  cp "${tmp_dir}/${BINARY}" "${INSTALL_DIR}/${BINARY}"
else
  ${extract_cmd} "${archive_path}" -C "${tmp_dir}"
  cp "${tmp_dir}/lh" "${INSTALL_DIR}/lh"
  chmod +x "${INSTALL_DIR}/lh"
fi

echo "✓ Installed lh to ${INSTALL_DIR}/${BINARY}"

# --- PATH hint ---
if [[ ":${PATH}:" != *":${INSTALL_DIR}:"* ]]; then
  echo ""
  echo "⚠  ${INSTALL_DIR} is not in your PATH."
  echo "   Add this to your shell config (~/.bashrc, ~/.zshrc, config.fish, etc.):"
  echo ""
  if [[ "${SHELL}" == *fish ]]; then
    echo "   fish_add_path ${INSTALL_DIR}"
  else
    echo "   export PATH=\"\$PATH:${INSTALL_DIR}\""
  fi
  echo ""
fi

echo "Run 'lh' to get started."
echo "To uninstall: curl -fsSL https://github.com/${OWNER}/${REPO}/releases/latest/download/uninstall.sh | bash"