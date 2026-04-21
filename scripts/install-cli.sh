#!/usr/bin/env bash

set -euo pipefail

OWNER="LetPeopleWork"
REPO="lighthouse-clients"
INSTALL_DIR="${HOME}/.local/bin"

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

asset=""
extract_cmd=""

if [[ "${os}" == "linux" ]]; then
  asset="lighthouse-linux-${arch}.tar.gz"
  extract_cmd="tar -xzf"
elif [[ "${os}" == "darwin" ]]; then
  asset="lighthouse-darwin-${arch}.tar.gz"
  extract_cmd="tar -xzf"
elif [[ "${os}" == "msys" || "${os}" == "mingw" || "${os}" == "cygwin" ]]; then
  asset="lighthouse-windows-${arch}.zip"
  extract_cmd="unzip -o"
else
  echo "Unsupported operating system: ${os}"
  exit 1
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

download_url="https://github.com/${OWNER}/${REPO}/releases/latest/download/${asset}"
archive_path="${tmp_dir}/${asset}"

echo "Downloading ${download_url}"
curl -fsSL "${download_url}" -o "${archive_path}"

mkdir -p "${INSTALL_DIR}"

if [[ "${asset}" == *.zip ]]; then
  ${extract_cmd} "${archive_path}" -d "${tmp_dir}"
  cp "${tmp_dir}/lighthouse.exe" "${INSTALL_DIR}/lighthouse.exe"
  echo "Installed ${INSTALL_DIR}/lighthouse.exe"
else
  ${extract_cmd} "${archive_path}" -C "${tmp_dir}"
  cp "${tmp_dir}/lighthouse" "${INSTALL_DIR}/lighthouse"
  chmod +x "${INSTALL_DIR}/lighthouse"
  echo "Installed ${INSTALL_DIR}/lighthouse"
fi

echo "Add ${INSTALL_DIR} to PATH if needed."