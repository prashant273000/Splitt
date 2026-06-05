#!/usr/bin/env bash
# Splitt V1 smoke test
# Usage: bash smoke.sh
# Prereq: backend running on :3000, jq installed (brew install jq)

command -v jq &>/dev/null || { echo "Install jq first: brew install jq"; exit 1; }

BASE="http://localhost:3000"
API="$BASE/api/v1"
DEV_JAR=$(mktemp)
ALICE_JAR=$(mktemp)
PASS=0
FAIL=0

ok()   { ((PASS++)); printf '\033[32m✓\033[0m %s\n' "$1"; }
err()  { ((FAIL++)); printf '\033[31m✗\033[0m %s\n  → %s\n' "$1" "$2"; }
h1()   { printf '\n\033[1m── %s ──\033[0m\n' "$1"; }

on_exit() {
  rm -f "$DEV_JAR" "$ALICE_JAR"
  printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
}
trap on_exit EXIT

# macOS / Linux date portability
next_hour() { date -v+1H -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+1 hour"    +"%Y-%m-%dT%H:%M:%SZ"; }
in_30min()  { date -v+30M -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+30 minutes" +"%Y-%m-%dT%H:%M:%SZ"; }
in_2hrs()   { date -v+2H  -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+2 hours"   +"%Y-%m-%dT%H:%M:%SZ"; }

DEPARTURE=$(next_hour)
EARLIEST=$(in_30min)
LATEST=$(in_2hrs)

# ── 1. Health ──────────────────────────────────────────────────────────────────
h1 "1. Health"
R=$(curl -sf "$BASE/health") || { err "backend not responding" "is it running on :3000?"; exit 1; }
echo "$R" | jq .
[[ $(echo "$R" | jq -r '.ok') == "true" ]]   && ok "ok=true"      || err "/health ok" "$R"
[[ $(echo "$R" | jq -r '.db') == "connected" ]] && ok "db=connected" || err "/health db" "$R"

# ── 2. Dev login (two users) ───────────────────────────────────────────────────
h1 "2. Dev login"
DEV_R=$(curl -sf -c "$DEV_JAR" -X POST "$API/auth/dev-login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@iiitdmj.ac.in","name":"Dev User"}')
echo "Dev: $(echo "$DEV_R" | jq .)"
DEV_ID=$(echo "$DEV_R" | jq -r '.id')
[[ -n "$DEV_ID" && "$DEV_ID" != "null" ]] && ok "Dev logged in" || err "Dev login" "$DEV_R"

ALICE_R=$(curl -sf -c "$ALICE_JAR" -X POST "$API/auth/dev-login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@iiitdmj.ac.in","name":"Alice"}')
echo "Alice: $(echo "$ALICE_R" | jq .)"
ALICE_ID=$(echo "$ALICE_R" | jq -r '.id')
[[ -n "$ALICE_ID" && "$ALICE_ID" != "null" ]] && ok "Alice logged in" || err "Alice login" "$ALICE_R"

# ── 3. GET /auth/me ────────────────────────────────────────────────────────────
h1 "3. GET /auth/me"
ME=$(curl -sf -b "$DEV_JAR" "$API/auth/me")
echo "$ME" | jq .
[[ $(echo "$ME" | jq -r '.email') == "dev@iiitdmj.ac.in" ]] && ok "returns correct user" || err "/auth/me" "$ME"

# ── 4. POST /rides ─────────────────────────────────────────────────────────────
h1 "4. POST /rides (Dev posts a ride)"
RIDE_R=$(curl -sf -b "$DEV_JAR" -X POST "$API/rides" \
  -H 'Content-Type: application/json' \
  -d "{
    \"direction\":    \"FROM_CAMPUS\",
    \"otherPoint\":   \"RAILWAY_STATION\",
    \"departureTime\":\"$DEPARTURE\",
    \"seatsTotal\":   4,
    \"farePerHead\":  50,
    \"notes\":        \"smoke test\"
  }")
echo "$RIDE_R" | jq .
RIDE_ID=$(echo "$RIDE_R" | jq -r '.id')
[[ -n "$RIDE_ID" && "$RIDE_ID" != "null" ]] && ok "ride created ($RIDE_ID)" || err "POST /rides" "$RIDE_R"
[[ $(echo "$RIDE_R" | jq -r '.seatsAvailable') == "3" ]] \
  && ok "seatsAvailable=3 (poster holds 1 of 4)" \
  || err "seatsAvailable should be 3" "$RIDE_R"

# ── 5. GET /rides/mine ─────────────────────────────────────────────────────────
h1 "5. GET /rides/mine"
MINE=$(curl -sf -b "$DEV_JAR" "$API/rides/mine")
echo "$MINE" | jq .
[[ $(echo "$MINE" | jq 'length') -ge 1 ]] && ok "returned ≥1 ride" || err "/rides/mine" "$MINE"

# ── 6. POST /intents ───────────────────────────────────────────────────────────
h1 "6. POST /intents (Alice — window covers ride departure)"
INTENT_R=$(curl -sf -b "$ALICE_JAR" -X POST "$API/intents" \
  -H 'Content-Type: application/json' \
  -d "{
    \"direction\":   \"FROM_CAMPUS\",
    \"otherPoint\":  \"RAILWAY_STATION\",
    \"earliestTime\":\"$EARLIEST\",
    \"latestTime\":  \"$LATEST\"
  }")
echo "$INTENT_R" | jq .
INTENT_ID=$(echo "$INTENT_R" | jq -r '.id')
[[ -n "$INTENT_ID" && "$INTENT_ID" != "null" ]] && ok "intent created ($INTENT_ID)" || err "POST /intents" "$INTENT_R"

# ── 7. GET /matches ────────────────────────────────────────────────────────────
h1 "7. GET /matches (both users see the same match)"
DEV_M=$(curl -sf -b "$DEV_JAR" "$API/matches")
echo "Dev:" && echo "$DEV_M" | jq .
MATCH_ID=$(echo "$DEV_M" | jq -r --arg rid "$RIDE_ID" 'map(select(.rideId==$rid)) | .[0].id')
[[ -n "$MATCH_ID" && "$MATCH_ID" != "null" ]] \
  && ok "Dev sees match ($MATCH_ID)" \
  || err "Dev sees no match for ride $RIDE_ID" "$DEV_M"

ALICE_M=$(curl -sf -b "$ALICE_JAR" "$API/matches")
echo "Alice:" && echo "$ALICE_M" | jq .
ALICE_MATCH_ID=$(echo "$ALICE_M" | jq -r --arg iid "$INTENT_ID" 'map(select(.intentId==$iid)) | .[0].id')
[[ "$ALICE_MATCH_ID" == "$MATCH_ID" ]] \
  && ok "Alice sees same match ID" \
  || err "Match ID mismatch (dev=$MATCH_ID alice=$ALICE_MATCH_ID)"

# ── 8. Confirm — poster side ───────────────────────────────────────────────────
h1 "8. POST /matches/:id/confirm — poster (Dev)"
C1=$(curl -sf -b "$DEV_JAR" -X POST "$API/matches/$MATCH_ID/confirm" \
  -H 'Content-Type: application/json')
echo "$C1" | jq .
[[ $(echo "$C1" | jq -r '.posterConfirmed') == "true"  ]] && ok "posterConfirmed=true"   || err "posterConfirmed" "$C1"
[[ $(echo "$C1" | jq -r '.seekerConfirmed') == "false" ]] && ok "seekerConfirmed still false" || err "seekerConfirmed state" "$C1"

# ── 9. Confirm — seeker side ───────────────────────────────────────────────────
h1 "9. POST /matches/:id/confirm — seeker (Alice)"
C2=$(curl -sf -b "$ALICE_JAR" -X POST "$API/matches/$MATCH_ID/confirm" \
  -H 'Content-Type: application/json')
echo "$C2" | jq .
[[ $(echo "$C2" | jq -r '.posterConfirmed') == "true" && \
   $(echo "$C2" | jq -r '.seekerConfirmed') == "true" ]] \
  && ok "both sides confirmed" || err "full confirmation" "$C2"

# ── 10. Seat count ─────────────────────────────────────────────────────────────
h1 "10. Seat count after mutual confirmation"
RD=$(curl -sf -b "$DEV_JAR" "$API/rides/$RIDE_ID")
SEATS=$(echo "$RD" | jq -r '.seatsAvailable')
echo "seatsAvailable = $SEATS  (expected 2: 4 total − 1 poster − 1 Alice)"
[[ "$SEATS" == "2" ]] && ok "seat decremented correctly" || err "expected 2, got $SEATS"

# ── 11. GET /users/:id ────────────────────────────────────────────────────────
h1 "11. GET /users/:id (Alice's public profile)"
PROF=$(curl -sf -b "$DEV_JAR" "$API/users/$ALICE_ID")
echo "$PROF" | jq .
[[ $(echo "$PROF" | jq -r '.name') == "Alice" ]] && ok "name=Alice"  || err "profile name"  "$PROF"
[[ $(echo "$PROF" | jq 'has("email")') == "false" ]] && ok "no email leaked" || err "email leaked!" "$PROF"
[[ $(echo "$PROF" | jq 'has("phone")') == "false" ]] && ok "no phone leaked" || err "phone leaked!" "$PROF"

# ── 12. Reject a match ────────────────────────────────────────────────────────
h1 "12. Reject a match (new ride + intent, then poster rejects)"
RIDE2_R=$(curl -sf -b "$DEV_JAR" -X POST "$API/rides" \
  -H 'Content-Type: application/json' \
  -d "{\"direction\":\"FROM_CAMPUS\",\"otherPoint\":\"RAILWAY_STATION\",\"departureTime\":\"$DEPARTURE\",\"seatsTotal\":3,\"farePerHead\":40}")
RIDE2_ID=$(echo "$RIDE2_R" | jq -r '.id')

INTENT2_R=$(curl -sf -b "$ALICE_JAR" -X POST "$API/intents" \
  -H 'Content-Type: application/json' \
  -d "{\"direction\":\"FROM_CAMPUS\",\"otherPoint\":\"RAILWAY_STATION\",\"earliestTime\":\"$EARLIEST\",\"latestTime\":\"$LATEST\"}")
INTENT2_ID=$(echo "$INTENT2_R" | jq -r '.id')

MATCHES2=$(curl -sf -b "$DEV_JAR" "$API/matches")
MATCH2_ID=$(echo "$MATCHES2" | jq -r --arg rid "$RIDE2_ID" 'map(select(.rideId==$rid)) | .[0].id')
if [[ -n "$MATCH2_ID" && "$MATCH2_ID" != "null" ]]; then
  REJ=$(curl -sf -b "$DEV_JAR" -X DELETE "$API/matches/$MATCH2_ID")
  [[ $(echo "$REJ" | jq -r '.ok') == "true" ]] && ok "match rejected" || err "reject match" "$REJ"
else
  err "second match not found" "ride=$RIDE2_ID intent=$INTENT2_ID"
fi

# ── 13. Cancel ride ───────────────────────────────────────────────────────────
h1 "13. DELETE /rides/:id (cancel)"
CR=$(curl -sf -b "$DEV_JAR" -X DELETE "$API/rides/$RIDE2_ID")
echo "$CR" | jq .
[[ $(echo "$CR" | jq -r '.ok') == "true" ]] && ok "ride cancelled" || err "cancel ride" "$CR"

# ── 14. Cancel intent ─────────────────────────────────────────────────────────
h1 "14. DELETE /intents/:id (cancel)"
CI=$(curl -sf -b "$ALICE_JAR" -X DELETE "$API/intents/$INTENT2_ID")
echo "$CI" | jq .
[[ $(echo "$CI" | jq -r '.ok') == "true" ]] && ok "intent cancelled" || err "cancel intent" "$CI"

# ── 15. SSE stream ────────────────────────────────────────────────────────────
h1 "15. GET /events (SSE — 2-second sample)"
SSE_OUT=$(curl -s -b "$DEV_JAR" --max-time 2 "$API/events" 2>&1 || true)
[[ "$SSE_OUT" == *": connected"* ]] && ok "SSE sends initial heartbeat" || err "no SSE heartbeat" "$SSE_OUT"

# ── 16. Error cases ───────────────────────────────────────────────────────────
h1 "16. Error cases"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$ALICE_JAR" -X POST "$API/rides" \
  -H 'Content-Type: application/json' -d '{"direction":"FROM_CAMPUS"}')
[[ "$S" == "400" ]] && ok "incomplete body → 400" || err "expected 400, got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$ALICE_JAR" "$API/rides/nonexistent-id")
[[ "$S" == "404" ]] && ok "unknown ride id → 404" || err "expected 404, got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" -b "$ALICE_JAR" -X DELETE "$API/rides/$RIDE_ID")
[[ "$S" == "403" ]] && ok "non-owner cancel → 403" || err "expected 403, got $S"

S=$(curl -s -o /dev/null -w "%{http_code}" "$API/auth/me")
[[ "$S" == "401" ]] && ok "no cookie → 401" || err "expected 401, got $S"

# ── 17. Logout ────────────────────────────────────────────────────────────────
h1 "17. Logout"
LO=$(curl -sf -b "$DEV_JAR" -c "$DEV_JAR" -X POST "$API/auth/logout")
[[ $(echo "$LO" | jq -r '.ok') == "true" ]] && ok "logout" || err "logout" "$LO"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────────────────"
echo "NOT tested (requires a DEPARTED ride — manual steps below):"
echo "  POST /ratings"
echo ""
echo "  How to test ratings:"
echo "  1. Create a ride with departureTime = 1 min from now"
echo "  2. Have a second user join/confirm the match"
echo "  3. Wait up to 60s for the cron job to set status=DEPARTED"
echo "  4. POST /api/v1/ratings with {toUserId, rideId, thumbsUp: true}"
echo "────────────────────────────────────────────────────────"
