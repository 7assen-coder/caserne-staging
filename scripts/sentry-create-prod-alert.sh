#!/usr/bin/env bash
# Create a production Issue alert (email) in Sentry via API.
# Requires: SENTRY_AUTH_TOKEN (org token with alerts:write), SENTRY_ORG (slug).
# Optional: SENTRY_PROJECTS="polyspace-backend,polyspace-frontend"  SENTRY_ALERT_EMAIL=ops@example.com
#
# Create a token: https://sentry.io/settings/account/api/auth-tokens/
#   scopes: event:read, project:read, org:read, alerts:write
set -euo pipefail

ORG="${SENTRY_ORG:?set SENTRY_ORG (org slug)}"
TOKEN="${SENTRY_AUTH_TOKEN:?set SENTRY_AUTH_TOKEN}"
EMAIL="${SENTRY_ALERT_EMAIL:-}"
PROJECTS_CSV="${SENTRY_PROJECTS:-polyspace-backend,polyspace-frontend}"
NAME="${SENTRY_ALERT_NAME:-Production new issues (email)}"

if [[ -z "$EMAIL" ]]; then
  echo "Set SENTRY_ALERT_EMAIL to the ops inbox that should receive alerts." >&2
  exit 1
fi

IFS=',' read -r -a PROJECT_SLUGS <<< "$PROJECTS_CSV"
PROJECT_IDS=()
for slug in "${PROJECT_SLUGS[@]}"; do
  slug="$(echo "$slug" | xargs)"
  id="$(curl -fsS -H "Authorization: Bearer ${TOKEN}" \
    "https://sentry.io/api/0/projects/${ORG}/${slug}/" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')"
  PROJECT_IDS+=("$id")
  echo "Resolved project ${slug} -> ${id}"
done

# Issue alert: new issues in environment:production → email
# API: https://docs.sentry.io/api/alerts/create-an-issue-alert-rule-for-a-project/
# Create once per project (same filter/action).
for i in "${!PROJECT_SLUGS[@]}"; do
  slug="$(echo "${PROJECT_SLUGS[$i]}" | xargs)"
  body="$(python3 - <<PY
import json
print(json.dumps({
  "name": "${NAME}",
  "owner": None,
  "environment": "production",
  "actionMatch": "any",
  "filterMatch": "all",
  "frequency": 30,
  "conditions": [
    {"id": "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition"}
  ],
  "filters": [
    {
      "id": "sentry.rules.filters.tagged_event.TaggedEventFilter",
      "key": "environment",
      "match": "eq",
      "value": "production"
    }
  ],
  "actions": [
    {
      "id": "sentry.mail.actions.NotifyEmailAction",
      "targetType": "Member",
      "targetIdentifier": "${EMAIL}"
    }
  ]
}))
PY
)"
  # Prefer Member email action; if org uses MailAction differently, fall back to IssueOwners + note.
  echo "Creating alert on ${slug}…"
  code="$(curl -sS -o /tmp/sentry-alert-out.json -w '%{http_code}' \
    -X POST \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "https://sentry.io/api/0/projects/${ORG}/${slug}/rules/")"
  echo "HTTP ${code}"
  python3 -c "import json; print(json.load(open('/tmp/sentry-alert-out.json')))" 2>/dev/null | head -c 400 || cat /tmp/sentry-alert-out.json | head -c 400
  echo
done

echo "Done. Confirm under Sentry → Alerts (environment=production)."
