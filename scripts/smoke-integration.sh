#!/usr/bin/env bash
# Runs the integration smoke against a Lighthouse image, with whatever `lh` is first on PATH.
#   scripts/smoke-integration.sh ghcr.io/letpeoplework/lighthouse:latest
# It starts the image as a container on https://127.0.0.1:8443, seeds the demo data, checks the CLI
# against it and removes the container again, pass or fail.
#   LIGHTHOUSE_SMOKE_CONTAINER  the container's name (default lighthouse-smoke)
#   LIGHTHOUSE_SMOKE_PORT       the host port it listens on (default 8443)
#   LIGHTHOUSE_SMOKE_LICENSE_FILE  a premium licence to import, so the archived Deliveries can be checked;
#                                  without one that check is skipped
set -euo pipefail

image="${1:?usage: $0 <lighthouse-image>}"
container="${LIGHTHOUSE_SMOKE_CONTAINER:-lighthouse-smoke}"
port="${LIGHTHOUSE_SMOKE_PORT:-8443}"
license_file="${LIGHTHOUSE_SMOKE_LICENSE_FILE:-}"
url="https://127.0.0.1:$port"

# The smoke container is a published release, which would send usage data to the real analytics
# project. Nothing from a smoke run may ever land there.
export DO_NOT_TRACK=1

step() { printf '\n== %s ==\n' "$*"; }

# Loading a scenario while Lighthouse is still updating the data it replaces answers 409; the update
# finishes within seconds, so a conflict is retried. Any other failure fails the smoke at once.
load_scenario() {   # load_scenario <scenario id>
  local status attempt
  for attempt in 1 2 3 4 5 6; do
    status=$(curl --silent --insecure -o /dev/null -w '%{http_code}' -X POST "$url/api/v1/demo/scenarios/$1/load")
    case "$status" in
      2??) return 0 ;;
      409) echo "Scenario $1 load conflicted with an update in progress (attempt $attempt); retrying."; sleep 5 ;;
      *) echo "FAIL: loading demo scenario $1 answered HTTP $status"; exit 1 ;;
    esac
  done
  echo "FAIL: loading demo scenario $1 still conflicted after $attempt attempts"; exit 1
}

cleanup() {
  local status=$?
  if [ "$status" -ne 0 ]; then
    step "Lighthouse container logs (smoke failed against $image)"
    docker logs "$container" || true
  fi
  step "Cleanup"
  docker rm -f "$container" >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT

step "lh under test: $(command -v lh)"

step "Start Lighthouse (SQLite mode) from $image"
docker rm -f "$container" >/dev/null 2>&1 || true
docker run -d --name "$container" \
  -p "$port:443" \
  -e Database__Provider=sqlite \
  -e "Database__ConnectionString=Data Source=lighthouse.db" \
  -e UsageData__CollectorBaseUrl=http://127.0.0.1:9 \
  "$image"

step "Wait for Lighthouse to become ready"
echo "Waiting for Lighthouse health endpoint..."
timeout 90 bash -c \
  "until curl --silent --fail --insecure $url/api/v1/version/current; do sleep 2; done"
echo ""
echo "Lighthouse is ready."

step "Seed demo scenario 2"
load_scenario 2
echo "Demo data seeded."

step "Connect CLI to Lighthouse"
lh connection connect \
  --mode server \
  --url "$url" \
  --insecure

step "Wait for demo data to be processed"
echo "Waiting for teams to appear in API..."
timeout 60 bash -c \
  'until lh team list --json 2>/dev/null | grep -q "Team Zenith"; do sleep 2; done'
echo "Teams are ready."

step "Verify teams (Team Zenith and Team Voyager)"
TEAMS=$(lh team list --json)
echo "$TEAMS"
grep -q "Team Zenith" <<<"$TEAMS" || { echo "FAIL: Team Zenith not found in team list"; exit 1; }
grep -q "Team Voyager" <<<"$TEAMS" || { echo "FAIL: Team Voyager not found in team list"; exit 1; }
echo "Teams assertion: PASS"

step "Verify portfolios (Project Orion)"
PORTFOLIOS=$(lh portfolio list --json)
echo "$PORTFOLIOS"
grep -q "Project Orion" <<<"$PORTFOLIOS" || { echo "FAIL: Project Orion not found in portfolio list"; exit 1; }
echo "Portfolio assertion: PASS"

# Reads the DO_NOT_TRACK refusal under DO_NOT_TRACK, then lifts DO_NOT_TRACK for one lh call at a time.
# The container's collector is a dead address, and no command that reports an event runs while the
# answer is on. "allows usage data" holds only on a Lighthouse image that lists the sources it labels.
step "Verify usage-data status (never sends)"
all=""
expect_line() {   # expect_line <fixed text> <command…>; prints, checks the exit code and the text
  local expected="$1"; shift
  local out status=0
  out=$("$@" 2>&1) || status=$?
  printf '%s\n' "$out"; all+="$out"$'\n'
  [ "$status" -eq 0 ] || { echo "FAIL: exit $status from: $*"; exit 1; }
  grep -qF -- "$expected" <<<"$out" || { echo "FAIL: '$expected' not in: $*"; exit 1; }
}
answer="Usage data from lh to $url:"
dnt="DO_NOT_TRACK is set, so lh sends no usage data whatever is stored."
expect_line "$dnt" lh config usage-data
expect_line "$dnt" lh config usage-data on
expect_line "$answer not asked yet (off)" env -u DO_NOT_TRACK lh config usage-data
expect_line "This Lighthouse allows usage data." env -u DO_NOT_TRACK lh config usage-data
expect_line "$answer on." env -u DO_NOT_TRACK lh config usage-data on
token=$(jq -r '.answers[] | .token // empty' ~/.config/lighthouse-clients/usage-data.json) \
  || { echo "FAIL: the usage data file is missing or not JSON"; exit 1; }
[ -n "$token" ] || { echo "FAIL: on stored no token"; exit 1; }
expect_line "$answer off. Nothing more is sent." env -u DO_NOT_TRACK lh config usage-data off
expect_line "$answer off" env -u DO_NOT_TRACK lh config usage-data
! grep -qF -- "$token" <<<"$all" || { echo "FAIL: the consent token was printed"; exit 1; }
echo "Usage-data status: PASS"

# Each line checks that --pretty prints words only the readable view prints (the generic view prints
# wire names), and that --json is still the facts, without those words.
step "Verify --pretty views"
expect_pretty() {   # expect_pretty <anchor> <json-mode: facts|"exact:<line>"> <lh args…>
  local anchor="$1" mode="$2" pretty json; shift 2
  pretty=$(lh "$@");        printf '%s\n' "$pretty"
  grep -qF -- "$anchor" <<<"$pretty" || { echo "FAIL: '$anchor' not in: lh $* (generic view?)"; exit 1; }
  json=$(lh "$@" --json)
  case "$mode" in
    exact:*) [ "$json" = "${mode#exact:}" ] || { echo "FAIL: lh $* --json changed: $json"; exit 1; } ;;
    *) jq -e . >/dev/null <<<"$json" || { echo "FAIL: lh $* --json is not JSON"; exit 1; }
       ! grep -qF -- "$anchor" <<<"$json" || { echo "FAIL: pretty wording leaked into lh $* --json"; exit 1; } ;;
  esac
}
ZENITH=$(lh team list --json | jq -r '.[] | select(.name == "Team Zenith") | .id')
[ -n "$ZENITH" ] || { echo "FAIL: Team Zenith has no id in lh team list --json"; exit 1; }

echo "Waiting for Team Zenith's forecast to answer..."
deadline=$((SECONDS + 120))
until lh forecast manual --team-id "$ZENITH" --remaining 10 --json 2>/dev/null \
    | jq -e '.whenForecasts | length > 0' >/dev/null 2>&1; do
  [ "$SECONDS" -lt "$deadline" ] || { echo "FAIL: Team Zenith's forecast never answered"; exit 1; }
  sleep 3
done
expect_pretty "When will 10 Work Items be done?" facts forecast manual --team-id "$ZENITH" --remaining 10
expect_pretty "Predictability Score" facts metrics team --id "$ZENITH"
echo "lh metrics team --pretty prints $(lh metrics team --id "$ZENITH" | wc -l) lines (one screen is 30; advisory)"
expect_pretty "SLE Risk" facts metrics team --id "$ZENITH" --metrics sleRisk
expect_pretty "Throughput Process Behaviour Chart" facts metrics team --id "$ZENITH" --metrics processBehaviorChart
expect_pretty "Last Updated" facts team list
expect_pretty "Deliveries per Portfolio:" facts portfolio list
echo "Waiting for Project Orion to take in its Features..."
deadline=$((SECONDS + 120))
until ORION_FEATURE=$(lh portfolio list --json 2>/dev/null \
    | jq -er '.[] | select(.name == "Project Orion") | .features[0].id'); do
  [ "$SECONDS" -lt "$deadline" ] || { echo "FAIL: Project Orion has no Feature in lh portfolio list --json"; exit 1; }
  sleep 3
done
expect_pretty "Forecasted Start" facts feature get --ids "$ORION_FEATURE"
expect_pretty "Refresh queued:" "exact:Team refreshed: $ZENITH" team refresh --id "$ZENITH"
expect_pretty "Work Tracking Systems" facts worktracking list
expect_pretty "Lighthouse v" facts version get
expect_pretty "is reachable." "exact:success" health check

# Scenario 0 replaces scenario 2, so these lines stay last; later checks go above them.
load_scenario 0
APOLLO=$(lh portfolio list --json | jq -r '.[] | select(.name == "Project Apollo") | .id')
[ -n "$APOLLO" ] || { echo "FAIL: Project Apollo has no id in lh portfolio list --json"; exit 1; }
echo "Waiting for Project Apollo's Delivery to take in its Features..."
deadline=$((SECONDS + 120))
until lh delivery list --portfolio-id "$APOLLO" --json 2>/dev/null \
    | jq -e 'any(.active[]; (.features | length) > 0)' >/dev/null 2>&1; do
  [ "$SECONDS" -lt "$deadline" ] || { echo "FAIL: Project Apollo's Delivery never took in its Features"; exit 1; }
  sleep 3
done
expect_pretty "Delivery Date" facts delivery list --portfolio-id "$APOLLO"
echo "--pretty views: PASS"

# Demo data seeds no archived Delivery, so Apollo's is archived once every check on it is done. Archiving
# is a premium feature, and a Lighthouse older than archiving has no such endpoint; either way the check
# is skipped with a notice rather than failed.
step "Verify an archived Delivery"
if [ -n "$license_file" ]; then
  curl --fail --silent --show-error --insecure -o /dev/null \
    -F "file=@$license_file;type=application/json" "$url/api/v1/license/import"
  echo "Premium licence imported."
fi
ARCHIVED=$(lh delivery list --portfolio-id "$APOLLO" --json | jq -er '.active[0].id') \
  || { echo "FAIL: Project Apollo has no active Delivery to archive"; exit 1; }
archive_status=$(curl --silent --insecure -o /dev/null -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json' -d '{}' "$url/api/v1/deliveries/$ARCHIVED/archive")
case "$archive_status" in
  2??)
    expect_pretty "Archived Deliveries" facts delivery list --portfolio-id "$APOLLO"
    lh delivery list --portfolio-id "$APOLLO" --json \
      | jq -e --argjson id "$ARCHIVED" 'any(.archived[]; .id == $id) and all(.active[]; .id != $id)' >/dev/null \
      || { echo "FAIL: Delivery $ARCHIVED is not under .archived in lh delivery list --json"; exit 1; }
    echo "Archived Delivery: PASS" ;;
  403) echo "::notice title=Archived check skipped::archiving needs a premium licence (set LIGHTHOUSE_SMOKE_LICENSE_FILE); archived check skipped." ;;
  404) echo "::notice title=Archived check skipped::this Lighthouse has no archive endpoint; archived check skipped." ;;
  *) echo "FAIL: archiving Delivery $ARCHIVED answered HTTP $archive_status"; exit 1 ;;
esac

step "Integration smoke against $image: PASS"
