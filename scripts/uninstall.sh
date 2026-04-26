#!/usr/bin/env bash
set -euo pipefail

BINARY="lh"

# Candidate locations to search
CANDIDATES=(
  "${HOME}/.local/bin/lh"
  "/usr/local/bin/lh"
  "/usr/bin/lh"
  "${LOCALAPPDATA:-${HOME}/AppData/Local}/Programs/lh/lh.exe"
)

# Allow override via env
if [[ -n "${LH_INSTALL_DIR:-}" ]]; then
  CANDIDATES=("${LH_INSTALL_DIR}/${BINARY}" "${LH_INSTALL_DIR}/${BINARY}.exe")
fi

found=()

for candidate in "${CANDIDATES[@]}"; do
  if [[ -f "${candidate}" ]]; then
    found+=("${candidate}")
  fi
done

# Also check PATH
if command -v lh &>/dev/null; then
  lh_path="$(command -v lh)"
  # Add if not already in found list
  already=false
  for f in "${found[@]+"${found[@]}"}"; do
    [[ "${f}" == "${lh_path}" ]] && already=true && break
  done
  ${already} || found+=("${lh_path}")
fi

if [[ ${#found[@]} -eq 0 ]]; then
  echo "lh not found in any known location. Nothing to uninstall."
  exit 0
fi

for path in "${found[@]}"; do
  echo "Removing ${path} ..."
  rm -f "${path}"
  echo "✓ Removed ${path}"
done

echo ""
echo "lh has been uninstalled."