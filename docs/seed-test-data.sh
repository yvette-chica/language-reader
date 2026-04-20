#!/usr/bin/env bash
# Creates a test user, course, and lesson, then saves the auth token to .token
# Usage: bash docs/seed-test-data.sh [audio_url]
#
# Optionally pass an audio URL as $1 and it will be set on the lesson.
# Example: bash docs/seed-test-data.sh "https://example.com/audio.mp3"

set -e  # exit on any error

BASE_URL="http://localhost:3001"
TOKEN_FILE=".token"

EMAIL="test@example.com"
PASSWORD="password123"

echo "--- Registering user ($EMAIL) ---"
REGISTER=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

echo "$REGISTER"

TOKEN=$(echo "$REGISTER" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || true)

if [ -z "$TOKEN" ]; then
  echo ""
  echo "Registration failed (user may already exist). Trying login..."
  LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
  echo "$LOGIN"
  TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || true)
fi

if [ -z "$TOKEN" ]; then
  echo "Could not get a token. Aborting."
  exit 1
fi

echo "$TOKEN" > "$TOKEN_FILE"
echo ""
echo "Token saved to $TOKEN_FILE"

echo ""
echo "--- Creating course ---"
COURSE=$(curl -s -X POST "$BASE_URL/api/courses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Test Course", "language": "de"}')

echo "$COURSE"

COURSE_ID=$(echo "$COURSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2 || true)

echo ""
echo "--- Creating lesson (course $COURSE_ID) ---"

# Build the lesson body — include audio_url if one was passed as an argument
if [ -n "$1" ]; then
  LESSON_BODY="{\"title\": \"Test Lesson\", \"type\": \"podcast\", \"audio_url\": \"$1\"}"
else
  LESSON_BODY='{"title": "Test Lesson", "type": "podcast"}'
fi

LESSON=$(curl -s -X POST "$BASE_URL/api/courses/$COURSE_ID/lessons" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$LESSON_BODY")

echo "$LESSON"

LESSON_ID=$(echo "$LESSON" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2 || true)

echo ""
echo "================================================"
echo "Done!"
echo "  Token file : $TOKEN_FILE"
echo "  Course ID  : $COURSE_ID"
echo "  Lesson ID  : $LESSON_ID"
echo ""
echo "To transcribe with Whisper:"
echo "  curl -s -X POST $BASE_URL/api/courses/$COURSE_ID/lessons/$LESSON_ID/transcript/whisper \\"
echo "    -H \"Authorization: Bearer \$(cat $TOKEN_FILE)\""
echo "================================================"
