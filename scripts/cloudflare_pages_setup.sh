#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="pawpaint"
REPO_OWNER="andrewdkennedy1"
REPO_NAME="PawPaint"
PRODUCTION_BRANCH="main"
CUSTOM_DOMAIN="pawpaint.catcafe.space"
ROOT_DOMAIN="catcafe.space"
ACCOUNT_ID_OVERRIDE="789fa1dfebe74fa42b413bdabcf303fb"

if [[ ! -f .env ]]; then
  echo "Missing .env with cloudflareapi token." >&2
  exit 1
fi

CLOUDFLARE_API_TOKEN=$(grep -E '^cloudflareapi=' .env | head -n1 | cut -d= -f2-)
CLOUDFLARE_EMAIL=$(grep -E '^cloudflareemail=' .env | head -n1 | cut -d= -f2-)
if [[ -z "${CLOUDFLARE_API_TOKEN}" ]]; then
  echo "cloudflareapi not found in .env" >&2
  exit 1
fi

api() {
  local method=$1
  local url=$2
  local data=${3-}

  local auth_headers=()
  if [[ -n "${CLOUDFLARE_EMAIL}" ]]; then
    auth_headers=(-H "X-Auth-Email: ${CLOUDFLARE_EMAIL}" -H "X-Auth-Key: ${CLOUDFLARE_API_TOKEN}")
  else
    auth_headers=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")
  fi

  if [[ -n "${data}" ]]; then
    curl -sS -X "${method}" \
      "${auth_headers[@]}" \
      -H "Content-Type: application/json" \
      --data "${data}" \
      "${url}"
  else
    curl -sS -X "${method}" \
      "${auth_headers[@]}" \
      "${url}"
  fi
}

ACCOUNT_ID="${ACCOUNT_ID_OVERRIDE}"

if [[ -z "${ACCOUNT_ID}" ]]; then
  ACCOUNT_ID=$(api GET "https://api.cloudflare.com/client/v4/accounts" | node -e '
const fs = require("fs");
const input = fs.readFileSync(0, "utf8");
const payload = JSON.parse(input || "{}");
if (!payload.success) process.exit(0);
const result = payload.result || [];
process.stdout.write(result.length ? result[0].id : "");
')
fi

if [[ -z "${ACCOUNT_ID}" ]]; then
  ACCOUNT_ID=$(api GET "https://api.cloudflare.com/client/v4/zones?name=${ROOT_DOMAIN}" | node -e '
const fs = require("fs");
const input = fs.readFileSync(0, "utf8");
const payload = JSON.parse(input || "{}");
if (!payload.success) process.exit(0);
const result = payload.result || [];
process.stdout.write(result.length ? result[0].account.id : "");
')
fi

if [[ -z "${ACCOUNT_ID}" ]]; then
  echo "Could not resolve Cloudflare account id from token. Ensure the token can read accounts or the ${ROOT_DOMAIN} zone." >&2
  exit 1
fi

echo "Using account: ${ACCOUNT_ID}"

PROJECT_URL="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}"
CREATE_URL="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects"

PROJECT_CHECK=$(api GET "${PROJECT_URL}" | node -e '
const fs = require("fs");
const input = fs.readFileSync(0, "utf8");
const payload = JSON.parse(input || "{}");
process.stdout.write(payload.success ? "ok" : "missing");
')

if [[ "${PROJECT_CHECK}" == "missing" ]]; then
  echo "Creating Pages project ${PROJECT_NAME} linked to GitHub..."
  CREATE_PAYLOAD=$(cat <<JSON
{
  "name": "${PROJECT_NAME}",
  "production_branch": "${PRODUCTION_BRANCH}",
  "source": {
    "type": "github",
    "config": {
      "owner": "${REPO_OWNER}",
      "repo_name": "${REPO_NAME}",
      "production_branch": "${PRODUCTION_BRANCH}",
      "deployments_enabled": true,
      "pr_comments_enabled": true
    }
  },
  "build_config": {
    "build_command": "npm run build",
    "destination_dir": "dist",
    "root_dir": ""
  }
}
JSON
)
  CREATE_RESULT=$(api POST "${CREATE_URL}" "${CREATE_PAYLOAD}")
  CREATE_OK=$(node -e '
const fs = require("fs");
const input = fs.readFileSync(0, "utf8");
const payload = JSON.parse(input || "{}");
process.stdout.write(payload.success ? "ok" : "fail");
' <<<"${CREATE_RESULT}")
  if [[ "${CREATE_OK}" != "ok" ]]; then
    echo "Project creation failed. Response:" >&2
    echo "${CREATE_RESULT}" >&2
    exit 1
  fi
else
  echo "Pages project ${PROJECT_NAME} already exists."
fi

echo "Adding custom domain ${CUSTOM_DOMAIN}..."
DOMAIN_URL="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/domains"
DOMAIN_PAYLOAD=$(cat <<JSON
{
  "name": "${CUSTOM_DOMAIN}"
}
JSON
)
DOMAIN_RESULT=$(api POST "${DOMAIN_URL}" "${DOMAIN_PAYLOAD}")
DOMAIN_OK=$(node -e '
const fs = require("fs");
const input = fs.readFileSync(0, "utf8");
const payload = JSON.parse(input || "{}");
process.stdout.write(payload.success ? "ok" : "fail");
' <<<"${DOMAIN_RESULT}")
if [[ "${DOMAIN_OK}" != "ok" ]]; then
  echo "Domain add failed. Response:" >&2
  echo "${DOMAIN_RESULT}" >&2
  exit 1
fi

echo "Done. Check Cloudflare Pages for build status and DNS verification."
