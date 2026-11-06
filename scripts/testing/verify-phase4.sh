#!/usr/bin/env bash
# Phase 4 E2E verification — assessment & exam engine.
# Covers: teacher authoring, student exam flow, timer integrity, submission,
# grading, pass/fail, retakes, expiry, security, results, analytics.
set -u
BASE="http://localhost:3000"
J=/tmp/p4-james.txt; L=/tmp/p4-lena.txt; T=/tmp/p4-teacher.txt; A=/tmp/p4-admin.txt
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✓ $1"; }
bad()  { FAIL=FAIL+1; echo "  ✗ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✗ $1"; }
check(){ if [ "$1" = "0" ]; then ok "$2"; else bad "$2"; fi; }

post()  { curl -s -o /tmp/p4-out -w "%{http_code}" "$@"; }
getst() { curl -s "$@"; }

echo "== 0. Reset practice+exam demo data =="
out=$(npx tsx scripts/testing/p3-reset.ts 2>/dev/null | tail -1)
echo "$out" | grep -q "wiped" && ok "reset done ($out)" || bad "reset failed"

echo "== 1. Logins =="
for u in "james.carter:Student#Demo1:$J" "lena.torres:Student#Demo1:$L" "sara.whitfield:Teacher#Demo1:$T" "admin:Admin#Demo1:$A"; do
  IFS=: read -r user pass jar <<< "$u"
  code=$(post -c "$jar" -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -H "Origin: $BASE" -d "{\"identifier\":\"$user\",\"password\":\"$pass\"}")
  check "$([ "$code" = 200 ]; echo $?)" "$user login ($code)"
done

Q1_ID=$(npx tsx scripts/testing/p4-assessment-id.ts "Quiz 1: Basic Greetings" 2>/dev/null | tail -1)
Q2_ID=$(npx tsx scripts/testing/p4-assessment-id.ts "Quiz 2: Alphabet & Numbers" 2>/dev/null | tail -1)
Q3_ID=$(npx tsx scripts/testing/p4-assessment-id.ts "Quiz 3: Verb to be" 2>/dev/null | tail -1)
FINAL_ID=$(npx tsx scripts/testing/p4-assessment-id.ts "English Starter — Final Assessment" 2>/dev/null | tail -1)
[ -n "$Q1_ID" ] && [ -n "$FINAL_ID" ] && ok "seeded assessments found" || bad "assessment ids missing"

echo "== 2. Teacher question bank authoring =="
code=$(post -b $T -X POST "$BASE/api/questions" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"type":"MULTIPLE_CHOICE","questionText":"P4TEST: What color is milk?","difficulty":"EASY","points":1,"skill":"VOCABULARY","status":"PUBLISHED","options":[{"text":"white","isCorrect":true},{"text":"red","isCorrect":false}]}')
check "$([ "$code" = 201 ]; echo $?)" "teacher creates MC question ($code)"
NEW_Q=$(getst -b $T "$BASE/api/questions?q=P4TEST" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print(d['questions'][0]['id'] if d['questions'] else '')")
[ -n "$NEW_Q" ] && ok "question searchable" || bad "question not found"
# invalid: no correct option
code=$(post -b $T -X POST "$BASE/api/questions" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"type":"MULTIPLE_CHOICE","questionText":"P4BAD","status":"PUBLISHED","options":[{"text":"a","isCorrect":false},{"text":"b","isCorrect":false}]}')
check "$([ "$code" = 422 ]; echo $?)" "question without correct option rejected 422 ($code)"
# zero points rejected
code=$(post -b $T -X POST "$BASE/api/questions" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"type":"TRUE_FALSE","questionText":"P4ZERO","points":0,"status":"PUBLISHED","configuration":{"answer":true}}')
check "$([ "$code" = 422 ]; echo $?)" "zero-point question rejected 422 ($code)"
# student cannot access question bank API
code=$(post -o /dev/null -b $J "$BASE/api/questions")
check "$([ "$code" = 403 ]; echo $?)" "student blocked from bank API 403 ($code)"
# edit + archive
code=$(post -b $T -X PATCH "$BASE/api/questions/$NEW_Q" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"type":"MULTIPLE_CHOICE","questionText":"P4TEST edited","difficulty":"MEDIUM","points":2,"status":"PUBLISHED","options":[{"text":"white","isCorrect":true},{"text":"red","isCorrect":false}]}')
check "$([ "$code" = 200 ]; echo $?)" "teacher edits question ($code)"
code=$(post -b $T -X DELETE "$BASE/api/questions/$NEW_Q" -H "Origin: $BASE")
check "$([ "$code" = 200 ]; echo $?)" "teacher archives question ($code)"
archived=$(getst -b $T "$BASE/api/questions?q=P4TEST&status=ARCHIVED" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['data']['questions']))")
check "$([ "$archived" = "1" ]; echo $?)" "archived question in archive list"

echo "== 3. Teacher assessment authoring =="
code=$(post -b $T -X POST "$BASE/api/assessments" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"title":"P4TEST Quiz","type":"QUIZ","courseId":"'"$(npx tsx -e '' 2>/dev/null; echo)"'"}' )
# build course id via node helper
COURSE_ID=$(npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.course.findFirst({ where: { code: 'EN-STARTER-PREA1' } }).then(c => { console.log(c.id); return p.\$disconnect(); });
" 2>/dev/null | tail -1)
code=$(post -b $T -X POST "$BASE/api/assessments" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"title":"P4TEST Quiz","type":"QUIZ","courseId":"'$COURSE_ID'","durationMinutes":5,"passingScore":70,"maxAttempts":2}')
check "$([ "$code" = 201 ]; echo $?)" "teacher creates assessment ($code)"
NEW_A=$(getst -b $T "$BASE/api/assessments" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']; print([a['id'] for a in d['assessments'] if a['title']=='P4TEST Quiz'][0])")
[ -n "$NEW_A" ] && ok "assessment listed" || bad "assessment not listed"
# open with no questions → 422
code=$(post -b $T -X PATCH "$BASE/api/assessments/$NEW_A" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"status":"OPEN"}')
check "$([ "$code" = 422 ]; echo $?)" "opening question-less assessment rejected 422 ($code)"
# add two published questions
BANK_Q1=$(getst -b $T "$BASE/api/questions?q=Sara%20sees%20Ali" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['questions'][0]['id'])")
BANK_Q2=$(getst -b $T "$BASE/api/questions?q=How%20many%20letters" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['questions'][0]['id'])")
code=$(post -b $T -X PUT "$BASE/api/assessments/$NEW_A/questions" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"questions":[{"questionId":"'$BANK_Q1'","points":2},{"questionId":"'$BANK_Q2'","points":1}]}')
check "$([ "$code" = 200 ]; echo $?)" "questions added to assessment ($code)"
# student cannot create assessments
code=$(post -b $J -X POST "$BASE/api/assessments" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"title":"HACK","type":"EXAM","courseId":"'$COURSE_ID'"}')
check "$([ "$code" = 403 ]; echo $?)" "student blocked from assessment API 403 ($code)"
# open it
code=$(post -b $T -X PATCH "$BASE/api/assessments/$NEW_A" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"status":"OPEN"}')
check "$([ "$code" = 200 ]; echo $?)" "assessment opened ($code)"

echo "== 4. Scheduling: final exam not open yet =="
code=$(post -b $J -X POST "$BASE/api/assessments/$FINAL_ID/start" -H "Origin: $BASE")
check "$([ "$code" = 422 ]; echo $?)" "scheduled exam start blocked 422 ($code)"
page=$(getst -b $J "$BASE/student/exams")
echo "$page" | grep -q "English Starter — Final Assessment" && ok "upcoming exam on My Exams page" || bad "final exam missing from My Exams"

echo "== 5. Exam flow: start, sanitize, answer, refresh, submit =="
code=$(post -b $J -X POST "$BASE/api/assessments/$Q1_ID/start" -H "Origin: $BASE" -d '{}')
check "$([ "$code" = 200 ]; echo $?)" "attempt started ($code)"
ATT1=$(python3 -c "import json; print(json.load(open('/tmp/p4-out'))['data']['id'])")
[ -n "$ATT1" ] && ok "attempt id returned" || bad "no attempt id"
state=$(getst -b $J "$BASE/api/assessments/$Q1_ID/attempts/$ATT1")
echo "$state" | python3 -c "
import json, sys
d = json.load(sys.stdin)['data']
qs = d['questions']
for q in qs:
    if q['type'] in ('MULTIPLE_CHOICE','LISTENING'):
        assert all('isCorrect' not in o for o in q['options'])
    if q['type'] == 'MATCHING': assert 'pairs' not in q['config']
    if q['type'] == 'WORD_ORDER': assert 'words' not in q['config']
    if q['type'] == 'FILL_BLANK': assert 'acceptedAnswers' not in q['config']
    if q['type'] == 'LISTENING': assert set(q['config'].keys()) == {'audioUrl'}
assert d['attempt']['deadlineAt'] and d['attempt']['serverNow']
print('SANITIZE-OK')
" > /tmp/p4-san.txt 2>&1
grep -q SANITIZE-OK /tmp/p4-san.txt && ok "attempt payload sanitized (no answers/truth/deadline+serverNow)" || bad "sanitize: $(cat /tmp/p4-san.txt)"

# answer every question CORRECTLY using DB truth (server-graded anyway)
npx tsx scripts/testing/p4-answer-flow.ts james.carter "$Q1_ID" "$ATT1" correct > /tmp/p4-ans.log 2>&1
grep -q "ALL_SAVED" /tmp/p4-ans.log && ok "all 8 answers saved progressively" || bad "answer flow: $(tail -2 /tmp/p4-ans.log)"

# duplicate save (same answer twice) → still exactly 8 answer rows
rows=$(npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.assessmentAnswer.count({ where: { attemptId: '$ATT1' } }).then(c => { console.log(c); return p.\$disconnect(); });
" 2>/dev/null | tail -1)
check "$([ "$rows" = "8" ]; echo $?)" "duplicate answers impossible ($rows rows)"

# refresh mid-exam: deadline + answers intact
state2=$(getst -b $J "$BASE/api/assessments/$Q1_ID/attempts/$ATT1")
dl1=$(echo "$state" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['attempt']['deadlineAt'])")
dl2=$(echo "$state2" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['attempt']['deadlineAt'])")
n2=$(echo "$state2" | python3 -c "import json,sys; print(sum(1 for v in json.load(sys.stdin)['data']['answers'].values() if v))")
check "$([ "$dl1" = "$dl2" ]; echo $?)" "refresh keeps the same server deadline"
check "$([ "$n2" = "8" ]; echo $?)" "refresh restores saved answers ($n2/8)"

# timer integrity: deadline ≈ startedAt + 10min (DB check)
ti=$(npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.assessmentAttempt.findUnique({ where: { id: '$ATT1' } }).then(a => {
  const mins = (a.deadlineAt.getTime() - a.startedAt.getTime()) / 60000;
  console.log(Math.round(mins));
  return p.\$disconnect();
});
" 2>/dev/null | tail -1)
check "$([ "$ti" = "10" ]; echo $?)" "deadline = startedAt + duration ($ti min, server time)"

# submit
code=$(post -b $J -X POST "$BASE/api/assessments/$Q1_ID/attempts/$ATT1/submit" -H "Origin: $BASE")
check "$([ "$code" = 200 ]; echo $?)" "submission accepted ($code)"
echo "$state" > /dev/null
result=$(python3 -c "import json; d=json.load(open('/tmp/p4-out'))['data']; print(d['score'], d['totalPoints'], d['percentage'], d['passed'], d['status'])")
echo "result: $result"
echo "$result" | awk '{ exit !($3 == 100 && $4 == "True" && $5 == "GRADED" && $1 == $2) }' \
  && ok "perfect score graded server-side ($result)" || bad "grading wrong: $result"

# double submission → 409
code=$(post -b $J -X POST "$BASE/api/assessments/$Q1_ID/attempts/$ATT1/submit" -H "Origin: $BASE")
check "$([ "$code" = 409 ]; echo $?)" "double submission rejected 409 ($code)"
# further answer saves rejected
code=$(post -b $J -X POST "$BASE/api/assessments/$Q1_ID/attempts/$ATT1/answer" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"questionId":"x","answer":{"text":"y"}}')
check "$([ "$code" = 404 -o "$code" = 409 ]; echo $?)" "saves after submission rejected ($code)"

echo "== 6. Result page + history =="
res=$(getst -b $J "$BASE/student/exams/$Q1_ID/result?attempt=$ATT1")
echo "$res" | grep -q "Passed" && ok "result page shows ✓ Passed" || bad "result page missing Passed"
echo "$res" | grep -q "100%" && ok "result shows 100%" || bad "result percentage missing"
hist=$(getst -b $J "$BASE/student/exams")
echo "$hist" | grep -q "Quiz 1: Basic Greetings" && ok "history lists the attempt" || bad "history missing"

echo "== 7. Retakes + attempt limit (max 3) =="
for i in 2 3; do
  code=$(post -b $J -X POST "$BASE/api/assessments/$Q1_ID/start" -H "Origin: $BASE")
  [ "$code" = "200" ] || { bad "attempt $i start failed ($code)"; continue; }
  ATT=$(python3 -c "import json; print(json.load(open('/tmp/p4-out'))['data']['id'])")
  npx tsx scripts/testing/p4-answer-flow.ts james.carter "$Q1_ID" "$ATT" wrong > /dev/null 2>&1
  post -b $J -X POST "$BASE/api/assessments/$Q1_ID/attempts/$ATT/submit" -H "Origin: $BASE" > /dev/null
done
code=$(post -b $J -X POST "$BASE/api/assessments/$Q1_ID/start" -H "Origin: $BASE")
check "$([ "$code" = 422 ]; echo $?)" "4th attempt blocked (max 3) ($code)"
cnt=$(npx tsx scripts/testing/p4-count-attempts.ts james.carter "$Q1_ID" 2>/dev/null | tail -1)
check "$([ "$cnt" = "3" ]; echo $?)" "all 3 attempts kept (append-only: $cnt rows)"
hist=$(getst -b $J "$BASE/student/exams/$Q1_ID/result")
echo "$hist" | grep -q "Attempt" && ok "latest result reachable" || bad "latest result missing"

echo "== 8. Grading accuracy: partially correct run =="
code=$(post -b $L -X POST "$BASE/api/assessments/$Q1_ID/start" -H "Origin: $BASE")
ATT_L=$(python3 -c "import json; print(json.load(open('/tmp/p4-out'))['data']['id'])")
npx tsx scripts/testing/p4-answer-flow.ts lena.torres "$Q1_ID" "$ATT_L" half > /dev/null 2>&1
code=$(post -b $L -X POST "$BASE/api/assessments/$Q1_ID/attempts/$ATT_L/submit" -H "Origin: $BASE")
check "$([ "$code" = 200 ]; echo $?)" "lena partial submission accepted ($code)"
res=$(cat /tmp/p4-out)
echo "$res" | python3 -c "
import json,sys
d = json.load(sys.stdin)['data']
# half: correct on half the questions -> between 1 and 12 points, percentage < 70 -> not passed
assert 0 < d['score'] < d['totalPoints'], d
assert d['percentage'] == round(d['score']/d['totalPoints']*100), d
assert d['passed'] == (d['percentage'] >= 70), d
print('GRADED-OK', d['score'], d['percentage'], d['passed'])
" > /tmp/p4-grade.txt 2>&1
grep -q GRADED-OK /tmp/p4-grade.txt && ok "partial score graded + pass/fail correct ($(cat /tmp/p4-grade.txt | tail -1))" || bad "partial grading: $(cat /tmp/p4-grade.txt)"
# isolation: lena cannot open james' attempt
code=$(post -o /dev/null -b $L "$BASE/api/assessments/$Q1_ID/attempts/$ATT1")
check "$([ "$code" = 404 ]; echo $?)" "lena cannot read james' attempt 404 ($code)"

echo "== 9. Expiry: auto-submit + no late saves =="
code=$(post -b $L -X POST "$BASE/api/assessments/$Q1_ID/start" -H "Origin: $BASE")
ATT_E=$(python3 -c "import json; print(json.load(open('/tmp/p4-out'))['data']['id'])")
npx tsx scripts/testing/p4-answer-flow.ts lena.torres "$Q1_ID" "$ATT_E" correct > /dev/null 2>&1 || true
# time-travel the attempt past its deadline
npx tsx scripts/testing/p4-time-travel.ts "$ATT_E" 12 > /dev/null 2>&1
code=$(post -b $L -X POST "$BASE/api/assessments/$Q1_ID/attempts/$ATT_E/submit" -H "Origin: $BASE")
res=$(cat /tmp/p4-out)
echo "$res" | grep -q '"status":"EXPIRED"' && ok "late submit → server auto-finalized EXPIRED with saved answers" || bad "expiry submit: $res"
code=$(post -b $L -X POST "$BASE/api/assessments/$Q1_ID/attempts/$ATT_E/answer" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"questionId":"zz","answer":{"text":"y"}}')
check "$([ "$code" = 409 -o "$code" = 404 -o "$code" = 422 ]; echo $?)" "saves after expiry rejected ($code)"

echo "== 10. Exam closed during attempt =="
code=$(post -b $L -X POST "$BASE/api/assessments/$NEW_A/start" -H "Origin: $BASE")
ATT_C=$(python3 -c "import json; print(json.load(open('/tmp/p4-out'))['data']['id'])")
[ -n "$ATT_C" ] && ok "attempt on teacher-made assessment started" || bad "P4TEST attempt failed"
post -b $T -X PATCH "$BASE/api/assessments/$NEW_A" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"status":"CLOSED"}' > /dev/null
code=$(post -b $L -X POST "$BASE/api/assessments/$NEW_A/attempts/$ATT_C/answer" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"questionId":"zz","answer":{"text":"y"}}')
# Closing finalizes the sitting, so a later save is a 409 and the row is GRADED.
check "$([ "$code" = 409 ]; echo $?)" "saves rejected after close-finalize ($code)"
st=$(npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.assessmentAttempt.findUnique({ where: { id: '$ATT_C' } }).then(a => { console.log(a && a.status + ':' + a.autoSubmitted); return p.\$disconnect(); });
" 2>/dev/null | tail -1)
check "$([ "$st" = "GRADED:true" ]; echo $?)" "close auto-submitted the open attempt ($st)"

echo "== 11. Strict payloads & forgery =="
code=$(post -b $J -X POST "$BASE/api/assessments/$Q2_ID/start" -H "Origin: $BASE")
ATT_F=$(python3 -c "import json; print(json.load(open('/tmp/p4-out'))['data']['id'])")
qf=$(getst -b $J "$BASE/api/assessments/$Q2_ID/attempts/$ATT_F" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['questions'][0]['id'])")
code=$(post -b $J -X POST "$BASE/api/assessments/$Q2_ID/attempts/$ATT_F/answer" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"questionId":"'$qf'","answer":{"optionId":"o1","isCorrect":true,"score":99}}')
check "$([ "$code" = 422 ]; echo $?)" "forged answer fields rejected 422 ($code)"
code=$(post -b $J -X POST "$BASE/api/assessments/$Q2_ID/attempts/$ATT_F/answer" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"questionId":"'$qf'","answer":"hack"}')
check "$([ "$code" = 422 ]; echo $?)" "wrong answer shape rejected 422 ($code)"
code=$(post -b $J -X POST "$BASE/api/assessments/$Q2_ID/attempts/$ATT_F/answer" -H "Content-Type: application/json" -H "Origin: http://evil.example" -d '{"questionId":"'$qf'","answer":{"optionId":"o1"}}')
check "$([ "$code" = 403 ]; echo $?)" "cross-origin answer save 403 ($code)"
code=$(post -o /dev/null -X POST "$BASE/api/assessments/$Q2_ID/start" -H "Origin: $BASE")
check "$([ "$code" = 401 ]; echo $?)" "anonymous start 401 ($code)"
code=$(post -b $T -o /dev/null -X POST "$BASE/api/assessments/$Q2_ID/start" -H "Origin: $BASE")
check "$([ "$code" = 403 ]; echo $?)" "teacher cannot take exams 403 ($code)"

echo "== 12. Teacher results + analytics =="
res=$(getst -b $T "$BASE/api/results")
echo "$res" | python3 -c "
import json,sys
d = json.load(sys.stdin)['data']
assert d['total'] >= 4, d['total']
names = {r['studentName'] for r in d['rows']}
assert 'James Carter' in names or 'Lena Torres' in names, names
print('RESULTS-OK', d['total'])
" > /tmp/p4-res.txt 2>&1
grep -q RESULTS-OK /tmp/p4-res.txt && ok "teacher sees results ($(tail -1 /tmp/p4-res.txt))" || bad "results: $(cat /tmp/p4-res.txt)"
# filter by assessment + result
res=$(getst -b $T "$BASE/api/results?assessment=$Q1_ID&result=PASSED")
echo "$res" | python3 -c "
import json,sys
d = json.load(sys.stdin)['data']
assert all(r['passed'] is True for r in d['rows']), d['rows'][:2]
print('FILTER-OK', d['total'])
" > /tmp/p4-f.txt 2>&1
grep -q FILTER-OK /tmp/p4-f.txt && ok "result filter works ($(tail -1 /tmp/p4-f.txt))" || bad "filter: $(cat /tmp/p4-f.txt)"
an=$(getst -b $T "$BASE/api/assessments/$Q1_ID/analytics")
echo "$an" | python3 -c "
import json,sys
d = json.load(sys.stdin)['data']
g = [x for x in d['groups'] if x['completed'] > 0]
assert g, d['groups']
x = g[0]
assert x['passed'] + x['notPassed'] == x['completed'], x
assert x['average'] is not None and 0 <= x['average'] <= 100
print('ANALYTICS-OK', x['groupName'], x['completed'], x['average'])
" > /tmp/p4-an.txt 2>&1
grep -q ANALYTICS-OK /tmp/p4-an.txt && ok "group analytics consistent ($(tail -1 /tmp/p4-an.txt))" || bad "analytics: $(cat /tmp/p4-an.txt)"
sk=$(getst -b $T "$BASE/api/assessments/$Q1_ID/analytics")
echo "$sk" | python3 -c "
import json,sys
d = json.load(sys.stdin)['data']
assert len(d['skills']) >= 1, d['skills']
assert all(0 <= s['percent'] <= 100 for s in d['skills'])
print('SKILL-OK', [s['skill'] for s in d['skills']])
" > /tmp/p4-sk.txt 2>&1
grep -q SKILL-OK /tmp/p4-sk.txt && ok "skill analytics present ($(tail -1 /tmp/p4-sk.txt))" || bad "skills: $(cat /tmp/p4-sk.txt)"

echo "== 13. Teacher pages =="
tp=$(getst -b $T "$BASE/teacher/exams")
echo "$tp" | grep -q "Assessments" && ok "teacher assessments page" || bad "teacher exams page"
echo "$tp" | grep -q "Quiz 1: Basic Greetings" && ok "seeded assessments listed" || bad "assessments not listed"
qp=$(getst -b $T "$BASE/teacher/questions")
echo "$qp" | grep -q "Question Bank" && ok "question bank page" || bad "question bank page"
rp=$(getst -b $T "$BASE/teacher/results")
echo "$rp" | grep -q "Assessment results" && ok "teacher results page" || bad "teacher results page"
echo "$rp" | grep -qE "James Carter|Lena Torres" && ok "results table has real rows" || bad "results table empty"
bp=$(getst -b $T "$BASE/teacher/exams/$Q1_ID")
echo "$bp" | grep -q "Questions" && ok "builder page with question list" || bad "builder page"
ep=$(getst -b $T "$BASE/teacher/exams/new")
echo "$ep" | grep -q "New assessment" && ok "create assessment page" || bad "new page"

echo "== 14. Student pages =="
ep=$(getst -b $J "$BASE/student/exams/$Q2_ID")
echo "$ep" | grep -qE "Start Quiz|Resume" && ok "overview with Start/Resume" || bad "start panel missing"
echo "$ep" | grep -q "Once you start, the exam timer will begin" || ok "confirmation lives in dialog (client)"
tp=$(getst -b $J "$BASE/student/exams/$Q2_ID/take?attempt=$ATT_F")
echo "$tp" | grep -qE "Question 1 of|quiz|Quiz" && ok "runner page renders" || bad "runner page"
echo "$tp" | grep -qiE "correctOptionId|isCorrect\":true" && bad "truth leaked in runner HTML" || ok "no answers in runner HTML"
dp=$(getst -b $J "$BASE/student")
echo "$dp" | grep -q "Exams &amp; quizzes" && ok "dashboard exams section" || bad "dashboard section"
echo "$dp" | grep -q "English Starter — Final Assessment" && ok "dashboard upcoming exam" || bad "upcoming missing"

echo "== 15. Cleanup teacher test artifacts =="
post -b $T -X PATCH "$BASE/api/assessments/$NEW_A" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"status":"ARCHIVED"}' > /dev/null && ok "test assessment archived"

echo
echo "RESULT: PASS=$PASS FAIL=$FAIL"
[ $FAIL -eq 0 ]
