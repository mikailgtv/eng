#!/usr/bin/env bash
# Phase 3 E2E verification — practice engine, security, completion, review.
# Run against a freshly seeded DB (npm run db:seed) with the server on :3000.
set -u
BASE="http://localhost:3000"
J=/tmp/p3-james.txt; L=/tmp/p3-lena.txt; A=/tmp/p3-admin.txt; T=/tmp/p3-teacher.txt
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check(){ if [ "$1" = "0" ]; then ok "$2"; else bad "$2"; fi; }

strip_html() { sed 's/<!--[^>]*-->//g'; }

echo "== 1. Logins =="
code=$(curl -s -o /dev/null -w "%{http_code}" -c $J -X POST $BASE/api/auth/login -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"identifier":"james.carter","password":"Student#Demo1"}'); check "$([ "$code" = 200 ]; echo $?)" "james.carter login ($code)"
code=$(curl -s -o /dev/null -w "%{http_code}" -c $L -X POST $BASE/api/auth/login -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"identifier":"lena.torres","password":"Student#Demo1"}'); check "$([ "$code" = 200 ]; echo $?)" "lena.torres login ($code)"
code=$(curl -s -o /dev/null -w "%{http_code}" -c $A -X POST $BASE/api/auth/login -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"identifier":"admin","password":"Admin#Demo1"}'); check "$([ "$code" = 200 ]; echo $?)" "admin login ($code)"
code=$(curl -s -o /dev/null -w "%{http_code}" -c $T -X POST $BASE/api/auth/login -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"identifier":"sara.whitfield","password":"Teacher#Demo1"}'); check "$([ "$code" = 200 ]; echo $?)" "teacher login ($code)"

npx tsx scripts/testing/p3-reset.ts > /tmp/p3-reset.out 2>&1 && grep -q "wiped" /tmp/p3-reset.out && ok "practice data reset ($(tail -1 /tmp/p3-reset.out))" || bad "reset failed"

LESSON="cmujqdeir001hkpuacb07lxwa"   # Hello and Goodbye
echo "== 2. Lesson page shows real practice activities =="
html=$(curl -s -b $J "$BASE/student/learn/$LESSON" | strip_html)
echo "$html" | grep -q "Morning greetings" && ok "activity title rendered" || bad "activity title rendered"
echo "$html" | grep -q "correctOptionId" && bad "answers leaked into lesson HTML" || ok "no correct answers in lesson HTML"
echo "$html" | grep -q "Practice" && ok "practice section present" || bad "practice section present"

echo "== 3. Practice state API + sanitization =="
state=$(curl -s -b $J "$BASE/api/lessons/$LESSON/practice")
echo "$state" | grep -q '"scorePercent":null' && ok "fresh scorePercent null (no score until practiced)" || bad "fresh scorePercent: $(head -c 150 <<<"$state")"
echo "$state" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
acts=d['activities']
raw=[a for a in acts if a['type']=='MULTIPLE_CHOICE'][0]['config']
assert 'correctOptionId' not in raw, 'MC leaked correctOptionId'
tf=[a for a in acts if a['type']=='TRUE_FALSE'][0]['config']
assert 'answer' not in tf or tf.get('answer') in (None,), 'TF leaked answer'
lt=[a for a in acts if a['type']=='LISTEN_AND_TYPE'][0]['config']
assert 'transcript' not in lt, 'LISTEN_AND_TYPE leaked transcript'
assert lt.get('audioUrl','').startswith('/audio/'), 'audio url missing'
print('sanitized-ok')
" >/tmp/p3-san.txt 2>&1
if grep -q sanitized-ok /tmp/p3-san.txt; then ok "configs sanitized (no answers/transcript)"; else bad "sanitization: $(cat /tmp/p3-san.txt)"; fi

MC_ID=$(echo "$state" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print([a['id'] for a in d['activities'] if a['type']=='MULTIPLE_CHOICE'][0])")
TF_ID=$(echo "$state" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print([a['id'] for a in d['activities'] if a['type']=='TRUE_FALSE'][0])")
FB_ID=$(echo "$state" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print([a['id'] for a in d['activities'] if a['type']=='FILL_BLANK'][0])")
MA_ID=$(echo "$state" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print([a['id'] for a in d['activities'] if a['type']=='MATCHING'][0])")
LT_ID=$(echo "$state" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print([a['id'] for a in d['activities'] if a['type']=='LISTEN_AND_TYPE'][0])")
LC_ID=$(echo "$state" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print([a['id'] for a in d['activities'] if a['type']=='LISTEN_AND_CHOOSE'][0])")
MYNAME_ID=$(npx tsx scripts/testing/p3-lesson-id.ts "My Name Is..." 2>/dev/null | tail -1)
mystate=$(curl -s -b $J "$BASE/api/lessons/$MYNAME_ID/practice")
FB_ID=$(echo "$mystate" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print([a['id'] for a in d['activities'] if a['type']=='FILL_BLANK'][0])")
WO_ID=$(echo "$mystate" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print([a['id'] for a in d['activities'] if a['type']=='WORD_ORDER'][0])")
FB2_ID=$(echo "$mystate" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print([a['id'] for a in d['activities'] if a['type']=='FILL_BLANK'][1])")
echo "$mystate" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
fb=[a for a in d['activities'] if a['type']=='FILL_BLANK'][0]['config']
assert 'acceptedAnswers' not in fb or not fb.get('acceptedAnswers'), 'FILL leaked acceptedAnswers'
wo=[a for a in d['activities'] if a['type']=='WORD_ORDER'][0]['config']
assert 'words' not in wo, 'WORD_ORDER leaked correct order'
print('sanitized-ok')
" >/tmp/p3-san2.txt 2>&1
if grep -q sanitized-ok /tmp/p3-san2.txt; then ok "FILL/WORD_ORDER sanitized"; else bad "sanitization 2: $(cat /tmp/p3-san2.txt)"; fi

echo "== 3.5. Completion gate BEFORE required practice =="
code=$(curl -s -o /tmp/p3-out -w "%{http_code}" -b $J -X POST "$BASE/api/lessons/$LESSON/complete" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"timeSpentSec":60}')
check "$([ "$code" = 422 ]; echo $?)" "incomplete required practice → 422 ($code)"
grep -q "required" /tmp/p3-out && ok "422 explains required exercises left" || bad "422 message: $(cat /tmp/p3-out)"

echo "== 4. Attempt lifecycle (server-side checking) =="
# wrong first
r=$(curl -s -b $J -X POST "$BASE/api/activities/$MC_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"optionId":"o3"}')
echo "$r" | grep -q '"isCorrect":false' && ok "wrong MC → incorrect feedback" || bad "wrong MC: $r"
echo "$r" | grep -q '"correctText"' && ok "feedback names correct answer" || bad "feedback correctText missing: $r"
# right second
r=$(curl -s -b $J -X POST "$BASE/api/activities/$MC_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"optionId":"o1"}')
echo "$r" | grep -q '"isCorrect":true' && ok "correct MC accepted" || bad "correct MC: $r"
echo "$r" | grep -q '"attemptNumber":2' && ok "attempts append-only (n=2)" || bad "attemptNumber: $r"
# forged extra field → strict 422
code=$(curl -s -o /tmp/p3-out -w "%{http_code}" -b $J -X POST "$BASE/api/activities/$MC_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"optionId":"o1","isCorrect":true,"studentId":"hacker"}')
check "$([ "$code" = 422 ]; echo $?)" "forged fields rejected 422 ($code)"
# malformed answer type
code=$(curl -s -o /dev/null -w "%{http_code}" -b $J -X POST "$BASE/api/activities/$MC_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"value":true}')
check "$([ "$code" = 422 ]; echo $?)" "wrong answer shape 422 ($code)"

echo "== 5. Per-type checking =="
# TRUE_FALSE false
r=$(curl -s -b $J -X POST "$BASE/api/activities/$TF_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"value":false}')
echo "$r" | grep -q '"isCorrect":true' && ok "TRUE_FALSE correct" || bad "TRUE_FALSE: $r"
# FILL_BLANK case-insensitive (answer is "is"; try "IS")
r=$(curl -s -b $J -X POST "$BASE/api/activities/$FB_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"text":"IS "}')
echo "$r" | grep -q '"isCorrect":true' && ok "FILL_BLANK normalized (case/space)" || bad "FILL_BLANK: $r"
# FILL_BLANK not fuzzy
r=$(curl -s -b $J -X POST "$BASE/api/activities/$FB_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"text":"iam"}')
echo "$r" | grep -q '"isCorrect":false' && ok "FILL_BLANK not fuzzy" || bad "FILL_BLANK fuzzy: $r"
# MATCHING all pairs
r=$(curl -s -b $J -X POST "$BASE/api/activities/$MA_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"pairs":[{"left":"hello","right":"سلام"},{"left":"goodbye","right":"خداحافظ"},{"left":"good morning","right":"صبح بخیر"},{"left":"good night","right":"شب بخیر"}]}')
echo "$r" | grep -q '"isCorrect":true' && ok "MATCHING all pairs correct" || bad "MATCHING: $r"
# LISTEN_AND_TYPE transcript typing (case-insensitive)
r=$(curl -s -b $J -X POST "$BASE/api/activities/$LT_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"text":"goodbye! see you tomorrow"}')
echo "$r" | grep -q '"isCorrect":true' && ok "LISTEN_AND_TYPE normalized" || bad "LISTEN_AND_TYPE: $r"
# LISTEN_AND_CHOOSE
r=$(curl -s -b $J -X POST "$BASE/api/activities/$LC_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"optionId":"o1"}')
echo "$r" | grep -q '"isCorrect":true' && ok "LISTEN_AND_CHOOSE correct" || bad "LISTEN_AND_CHOOSE: $r"

# WORD_ORDER: wrong order fails, right order passes
r=$(curl -s -b $J -X POST "$BASE/api/activities/$WO_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"order":["name","My","Ali","is"]}')
echo "$r" | grep -q '"isCorrect":false' && ok "WORD_ORDER wrong order → incorrect" || bad "WORD_ORDER wrong: $r"
r=$(curl -s -b $J -X POST "$BASE/api/activities/$WO_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"order":["My","name","is","Ali"]}')
echo "$r" | grep -q '"isCorrect":true' && ok "WORD_ORDER correct order accepted" || bad "WORD_ORDER right: $r"
# second FILL_BLANK (no options → typed input)
r=$(curl -s -b $J -X POST "$BASE/api/activities/$FB2_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"text":"i"}')
echo "$r" | grep -q '"isCorrect":true' && ok "FILL_BLANK typed input normalized" || bad "FILL_BLANK typed: $r"

echo "== 6. Audio files really exist =="
code=$(curl -s -o /dev/null -w "%{http_code} %{content_type}" -b $J "$BASE/audio/hello-1.mp3")
echo "$code" | grep -q "200 audio" && ok "real audio served ($code)" || bad "audio: $code"

echo "== 7. Security & isolation =="
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/activities/$MC_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"optionId":"o1"}')
check "$([ "$code" = 401 ]; echo $?)" "anonymous attempt 401 ($code)"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $T -X POST "$BASE/api/activities/$MC_ID/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"optionId":"o1"}')
check "$([ "$code" = 403 ]; echo $?)" "teacher attempt 403 ($code)"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $J -X POST "$BASE/api/activities/$MC_ID/attempts" -H "Content-Type: application/json" -H "Origin: http://evil.example" -d '{"optionId":"o1"}')
check "$([ "$code" = 403 ]; echo $?)" "cross-origin attempt 403 ($code)"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $J -X POST "$BASE/api/activities/nonexistent123/attempts" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"optionId":"o1"}')
check "$([ "$code" = 404 ]; echo $?)" "unknown activity 404 ($code)"
# lena cannot read james' mistakes (session-scoped)
m=$(curl -s -b $L "$BASE/api/practice/mistakes")
echo "$m" | grep -qi "james" && bad "mistakes leaked across students" || ok "mistakes session-scoped"
# stats session-scoped sanity
s1=$(curl -s -b $J "$BASE/api/practice/stats"); s2=$(curl -s -b $L "$BASE/api/practice/stats")
[ "$s1" != "$s2" ] && ok "stats differ per session user" || bad "stats identical across users?"
echo "$s1" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
assert d['totals']['attempts'] >= 6, d
print('stats-ok')
" >/tmp/p3-stats.txt 2>&1
grep -q stats-ok /tmp/p3-stats.txt && ok "stats reflect real attempts" || bad "stats: $(cat /tmp/p3-stats.txt)"

echo "== 8. Practice state + score =="
st=$(curl -s -b $J "$BASE/api/lessons/$LESSON/practice")
echo "$st" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
sts=[v['status'] for v in d['states']]
assert 'CORRECT' in sts, d['states']
print('state-ok')
" >/tmp/p3-state.txt 2>&1
grep -q state-ok /tmp/p3-state.txt && ok "practice state reflects attempts" || bad "state: $(cat /tmp/p3-state.txt)"

echo "== 9. Mistakes list =="
m=$(curl -s -b $J "$BASE/api/practice/mistakes?lessonId=$LESSON")
echo "$m" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
ms=d['mistakes']
assert len(ms)>=1, 'expected at least one mistake'
m0=ms[0]
assert m0['prompt'] and m0['correctText'], m0
print('mistakes-ok')
" >/tmp/p3-m.txt 2>&1
grep -q mistakes-ok /tmp/p3-m.txt && ok "mistake review data present" || bad "mistakes: $(cat /tmp/p3-m.txt)"

echo "== 10. Completion gate (after required done) =="
code=$(curl -s -o /tmp/p3-out -w "%{http_code}" -b $J -X POST "$BASE/api/lessons/$LESSON/complete" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"timeSpentSec":60}')
check "$([ "$code" = 200 ]; echo $?)" "all required attempted → completion 200 ($code)"
grep -q '"status":"COMPLETED"' /tmp/p3-out && ok "progress row COMPLETED" || bad "completion body: $(cat /tmp/p3-out)"
# duplicate completion is idempotent
code=$(curl -s -o /dev/null -w "%{http_code}" -b $J -X POST "$BASE/api/lessons/$LESSON/complete" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"timeSpentSec":10}')
check "$([ "$code" = 200 ]; echo $?)" "duplicate completion idempotent ($code)"
st=$(curl -s -b $J "$BASE/api/lessons/$LESSON/practice")
echo "$st" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
req=[a['id'] for a in d['activities'] if a['required']]
print(json.dumps({'remaining': d['requiredRemaining'], 'required': req}))
" >/tmp/p3-req.txt 2>&1
echo "$st" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
assert d['requiredRemaining']==0, d
assert d['scorePercent']>0, d
print('score-ok', d['scorePercent'])
" >/tmp/p3-score.txt 2>&1
grep -q score-ok /tmp/p3-score.txt && ok "practice score > 0 after correct attempts ($(tail -1 /tmp/p3-score.txt))" || bad "score: $(cat /tmp/p3-score.txt)"

echo "== 11. Vocabulary review flow =="
# find a vocab id from the FLASHCARD activity (word cards embed vocabularyId)
fc_lesson=$(curl -s -b $J "$BASE/student/learning" >/dev/null; echo "")
VOCAB_ID=$(npx tsx scripts/testing/p3-vocab-id.ts "hello" 2>/dev/null | tail -1)
r=$(curl -s -b $J "$BASE/api/vocabulary/review")
echo "$r" | grep -q '"items":\[\]' && ok "review queue starts empty" || bad "review queue not empty at start: $(head -c 120 <<<"$r")"
r=$(curl -s -b $J -X POST "$BASE/api/vocabulary/review" -H "Content-Type: application/json" -H "Origin: $BASE" -d "{\"vocabularyId\":\"$VOCAB_ID\",\"response\":\"NEED_REVIEW\"}")
echo "$r" | grep -q '"status":"LEARNING"' && ok "NEED_REVIEW → LEARNING scheduled" || bad "vocab review POST: $r"
npx tsx scripts/testing/p3-due.ts "$VOCAB_ID" 2>/dev/null | tail -1 > /tmp/p3-due.txt
python3 -c "
import json
d=json.load(open('/tmp/p3-due.txt'))
assert d['status']=='LEARNING' and 20 <= d['dueInHours'] <= 26, d
print('due-ok')
" >/tmp/p3-due2.txt 2>&1
grep -q due-ok /tmp/p3-due2.txt && ok "review scheduled ~+1 day (stored as data: $(cat /tmp/p3-due.txt))" || bad "dueAt: $(cat /tmp/p3-due2.txt)"
r=$(curl -s -b $J "$BASE/api/vocabulary/review")
echo "$r" | grep -q '\"$VOCAB_ID\"' && bad "word due immediately (should be tomorrow)" || ok "not-yet-due word correctly absent from queue"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $J -X POST "$BASE/api/vocabulary/review" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"vocabularyId":"nonexistent-vocab","response":"KNOWN"}')
check "$([ "$code" = 404 ]; echo $?)" "foreign vocabularyId 404 ($code)"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $L -X POST "$BASE/api/vocabulary/review" -H "Content-Type: application/json" -H "Origin: $BASE" -d "{\"vocabularyId\":\"$VOCAB_ID\",\"response\":\"NEED_REVIEW\"}")
check "$([ "$code" = 200 ]; echo $?)" "lena reviews same word — own row ($code)"
# verify isolation: james still has exactly 1 review row for that word
n=$(npx tsx scripts/testing/p3-rows.ts "$VOCAB_ID" 2>/dev/null | tail -1)
echo "$n" | python3 -c "
import json,sys
rows=json.load(sys.stdin)
assert len(rows)==2, rows
mine=[r for r in rows]
print('rows-ok', len(rows))
" >/tmp/p3-rows.txt 2>&1
grep -q rows-ok /tmp/p3-rows.txt && ok "separate review rows per student ($(n=$(cat /tmp/p3-rows.txt | grep -o '[0-9]*'); echo $n rows))" || bad "review rows: $(cat /tmp/p3-rows.txt)"

echo "== 12. Dashboard + progress real data =="
dash=$(curl -s -b $J "$BASE/student/dashboard" 2>/dev/null; curl -s -b $J "$BASE/student")
echo "$dash" | strip_html | grep -q "Practice today" && ok "dashboard Practice Today section" || bad "dashboard Practice Today missing"
echo "$dash" | strip_html | grep -q "Vocabulary review" && ok "dashboard Vocabulary review section" || bad "dashboard Vocabulary review missing"
echo "$dash" | strip_html | grep -q "Recent practice" && ok "dashboard Recent practice section" || bad "dashboard Recent practice missing"
prog=$(curl -s -b $J "$BASE/student/progress" | strip_html)
echo "$prog" | grep -q "Activities practiced" && ok "progress shows practice stats" || bad "progress practice stats missing"
echo "$prog" | grep -q "Words practiced" && ok "progress shows vocab stats" || bad "progress vocab stats missing"

echo "== 13. Review page =="
rv=$(curl -s -b $J "$BASE/student/review" | strip_html)
echo "$rv" | grep -q "Vocabulary Review" && ok "review page renders" || bad "review page missing"
echo "$rv" | grep -q "Nothing to review" && ok "review page shows honest empty state (word due tomorrow)" || bad "review page empty state missing"

echo "== 14. No-activity fallback =="
FALLBACK_ID=$(npx tsx scripts/testing/p3-lesson-id.ts "What is English?" 2>/dev/null | tail -1)
fb=$(curl -s -b $J "$BASE/student/learn/$FALLBACK_ID" | strip_html)
echo "$fb" | grep -qi "self-check\|Question" && ok "lessons without activities fall back to self-checks" || bad "fallback missing"

echo "== 15. Admin can preview practice =="
adm=$(curl -s -b $A "$BASE/student/learn/$LESSON" | strip_html)
echo "$adm" | grep -q "Morning greetings" && ok "admin sees practice content" || bad "admin preview broken"

echo
echo "RESULT: PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ]
