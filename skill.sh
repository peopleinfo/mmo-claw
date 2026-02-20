#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="${ROOT_DIR}/skills"
TEMPLATE_FILE="${SKILLS_DIR}/_template/SKILL.md"

usage() {
  cat <<'EOF'
Usage:
  ./skill.sh create <name> [--desc "<description>"]
  ./skill.sh list
  ./skill.sh validate
  ./skill.sh help
EOF
}

slugify() {
  local raw="$1"
  printf '%s' "${raw,,}" | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g'
}

ensure_base() {
  mkdir -p "${SKILLS_DIR}/_template"

  if [[ ! -f "${TEMPLATE_FILE}" ]]; then
    cat > "${TEMPLATE_FILE}" <<'EOF'
---
name: template-skill
description: Replace with a clear trigger-aware description.
---

# template-skill

## Workflow

1. Replace this template with concrete steps.
2. Keep instructions concise and procedural.
3. Put long details in references files.
EOF
  fi
}

create_skill() {
  local raw_name="${1:-}"
  local desc="${2:-TODO: add a clear trigger-aware description.}"

  if [[ -z "${raw_name}" ]]; then
    echo "Error: skill name is required."
    usage
    exit 1
  fi

  local skill_name
  skill_name="$(slugify "${raw_name}")"

  if [[ -z "${skill_name}" ]]; then
    echo "Error: invalid skill name '${raw_name}'."
    exit 1
  fi

  local skill_dir="${SKILLS_DIR}/${skill_name}"
  if [[ -e "${skill_dir}" ]]; then
    echo "Error: skill already exists at ${skill_dir}."
    exit 1
  fi

  mkdir -p "${skill_dir}/agents" "${skill_dir}/scripts" "${skill_dir}/references" "${skill_dir}/assets"

  cat > "${skill_dir}/SKILL.md" <<EOF
---
name: ${skill_name}
description: ${desc}
---

# ${skill_name}

## Workflow

1. Add concrete execution steps for this skill.
2. Add deterministic scripts in \`scripts/\` when repetition exists.
3. Keep detailed docs in \`references/\`.
EOF

  cat > "${skill_dir}/agents/openai.yaml" <<EOF
interface:
  display_name: ${skill_name}
  short_description: ${desc}
  default_prompt: Use the ${skill_name} workflow to complete this task.
EOF

  echo "Created skill: ${skill_dir}"
}

list_skills() {
  ensure_base
  local found=0

  while IFS= read -r skill_path; do
    found=1
    basename "${skill_path}"
  done < <(find "${SKILLS_DIR}" -mindepth 1 -maxdepth 1 -type d ! -name "_template" | sort)

  if [[ "${found}" -eq 0 ]]; then
    echo "No skills found."
  fi
}

validate_skill_dir() {
  local dir="$1"
  local file="${dir}/SKILL.md"
  local ok=0

  if [[ ! -f "${file}" ]]; then
    echo "FAIL: missing SKILL.md in ${dir}"
    return 1
  fi

  if grep -q '^name: [a-z0-9-]\+$' "${file}" && grep -q '^description: ' "${file}"; then
    ok=1
  fi

  if [[ "${ok}" -eq 1 ]]; then
    echo "OK: $(basename "${dir}")"
    return 0
  fi

  echo "FAIL: invalid frontmatter in ${file}"
  return 1
}

validate_skills() {
  ensure_base
  local status=0
  local has_skills=0

  while IFS= read -r skill_path; do
    has_skills=1
    if ! validate_skill_dir "${skill_path}"; then
      status=1
    fi
  done < <(find "${SKILLS_DIR}" -mindepth 1 -maxdepth 1 -type d ! -name "_template" | sort)

  if [[ "${has_skills}" -eq 0 ]]; then
    echo "No skills to validate."
  fi

  return "${status}"
}

main() {
  ensure_base

  local cmd="${1:-help}"
  shift || true

  case "${cmd}" in
    create)
      local name="${1:-}"
      shift || true
      local desc="TODO: add a clear trigger-aware description."

      while [[ $# -gt 0 ]]; do
        case "$1" in
          --desc)
            desc="${2:-}"
            shift 2
            ;;
          *)
            echo "Error: unknown option '$1'."
            usage
            exit 1
            ;;
        esac
      done

      create_skill "${name}" "${desc}"
      ;;
    list)
      list_skills
      ;;
    validate)
      validate_skills
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      echo "Error: unknown command '${cmd}'."
      usage
      exit 1
      ;;
  esac
}

main "$@"
