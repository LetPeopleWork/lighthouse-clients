#!/usr/bin/env bash
set -euo pipefail

# Zips every skills/<name>/ folder into <out-dir>/<name>-skill.zip, with SKILL.md at the root of the zip.
# A folder's evals/ stays out: the cases and fixtures are for the maintainer, not for the assistant that
# installs the skill. Each zip is checked after it is written, so the release can never ship one that is
# missing its SKILL.md or carries its evals.
#
# Usage: scripts/pack-skills.sh <out-dir>

readonly SKILL_FILE="SKILL.md"
readonly EVALS_DIR="evals"
readonly ZIP_SUFFIX="-skill.zip"

fail() {
  local message="$1"
  echo "pack-skills: ${message}" >&2
  exit 1
}

# The value of `name:` in the frontmatter block that opens the file, or nothing when there is none.
frontmatter_name() {
  local skill_file="$1"
  awk '
    NR == 1 { if ($0 != "---") exit; next }
    $0 == "---" { exit }
    /^name:/ { sub(/^name:[[:space:]]*/, ""); sub(/[[:space:]]+$/, ""); print; exit }
  ' "${skill_file}"
  return 0
}

pack_folder() {
  local folder="$1"
  local out_dir="$2"
  local name
  name="$(basename "${folder}")"
  local zip_path="${out_dir}/${name}${ZIP_SUFFIX}"

  [[ -f "${folder}/${SKILL_FILE}" ]] || fail "skills/${name} has no ${SKILL_FILE}"
  local declared
  declared="$(frontmatter_name "${folder}/${SKILL_FILE}")"
  [[ "${declared}" == "${name}" ]] \
    || fail "skills/${name}/${SKILL_FILE} is named '${declared}', but the folder ships as '${name}'"

  rm -f "${zip_path}"
  (cd "${folder}" && zip -qr -X "${zip_path}" . -x "${EVALS_DIR}/*")

  local entries
  entries="$(unzip -Z1 "${zip_path}")"
  if ! grep -qx "${SKILL_FILE}" <<<"${entries}"; then
    rm -f "${zip_path}"
    fail "${name}${ZIP_SUFFIX} has no ${SKILL_FILE} at its root"
  fi
  if grep -q "^${EVALS_DIR}/" <<<"${entries}"; then
    rm -f "${zip_path}"
    fail "${name}${ZIP_SUFFIX} carries ${EVALS_DIR}/"
  fi

  echo "${name}${ZIP_SUFFIX}:"
  local entry
  while IFS= read -r entry; do
    echo "  ${entry}"
  done <<<"${entries}"
  return 0
}

[[ $# -eq 1 ]] || fail "usage: scripts/pack-skills.sh <out-dir>"

# Resolved before any cd, so a relative out-dir means the caller's directory, not a skill folder.
mkdir -p "$1"
out_dir="$(cd "$1" && pwd)"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

shopt -s nullglob
folders=("${repo_root}"/skills/*/)
shopt -u nullglob
[[ ${#folders[@]} -gt 0 ]] || fail "no skill folders under skills/"

for folder in "${folders[@]}"; do
  pack_folder "${folder%/}" "${out_dir}"
done
