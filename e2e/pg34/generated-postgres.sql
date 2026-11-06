-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "englishLevel" TEXT,
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "contentReviewer" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "departmentId" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "timezone" TEXT,
    "preferredLanguage" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordChangedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "code" TEXT,
    "parentId" TEXT,
    "organizationId" TEXT,
    "departmentId" TEXT,
    "managerId" TEXT,
    "teacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "courseType" TEXT NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "levelId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "completionRule" TEXT NOT NULL DEFAULT 'VIEW_AND_REQUIRED_ACTIVITIES',
    "minPracticeScore" INTEGER,
    "curriculumId" TEXT,
    "goal" TEXT,
    "durationWeeks" INTEGER,
    "sessionCount" INTEGER,
    "plannedHours" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "outcomes" TEXT,
    "imageUrl" TEXT,
    "icon" TEXT,
    "workflowStatus" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "goal" TEXT,
    "workflowStatus" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "objectives" TEXT,
    "durationMin" INTEGER,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "unitId" TEXT,
    "goal" TEXT,
    "workflowStatus" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "primarySkill" TEXT,
    "secondarySkill" TEXT,
    "difficulty" TEXT,
    "beginnerMode" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_content_blocks" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "contentItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "translation" TEXT,
    "pronunciation" TEXT,
    "phonetic" TEXT,
    "exampleSentence" TEXT,
    "audioUrl" TEXT,
    "imageUrl" TEXT,
    "partOfSpeech" TEXT,
    "levelCode" TEXT,
    "meaning" TEXT,
    "exampleTranslation" TEXT,
    "difficulty" TEXT,
    "topic" TEXT,
    "tags" TEXT,
    "relatedWords" TEXT,
    "synonyms" TEXT,
    "antonyms" TEXT,
    "archivedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grammar_content" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT,
    "patterns" TEXT,
    "examples" TEXT,
    "translation" TEXT,
    "commonMistakes" TEXT,
    "difficulty" TEXT,
    "levelCode" TEXT,
    "relatedVocabulary" TEXT,
    "practiceNote" TEXT,
    "archivedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grammar_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_lesson_progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "timeSpentSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "grammarId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "instructions" TEXT,
    "order" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "configuration" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_vocabulary" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "vocabularyId" TEXT NOT NULL,

    CONSTRAINT "activity_vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_attempts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "score" INTEGER,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attemptNumber" INTEGER NOT NULL,

    CONSTRAINT "activity_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_review" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "vocabularyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assignments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "courseId" TEXT,
    "levelId" TEXT,
    "moduleId" TEXT,
    "durationMinutes" INTEGER,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "maxAttempts" INTEGER,
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
    "randomizeOptions" BOOLEAN NOT NULL DEFAULT false,
    "showResults" BOOLEAN NOT NULL DEFAULT true,
    "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT true,
    "allowNavigation" BOOLEAN NOT NULL DEFAULT true,
    "blueprintId" TEXT,
    "secureMode" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'EASY',
    "points" INTEGER NOT NULL DEFAULT 1,
    "skill" TEXT,
    "levelId" TEXT,
    "lessonId" TEXT,
    "moduleId" TEXT,
    "grammarConceptId" TEXT,
    "vocabularyId" TEXT,
    "configuration" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempts" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "questionOrder" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "totalPoints" DOUBLE PRECISION,
    "percentage" INTEGER,
    "passed" BOOLEAN,
    "autoSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "timeSpentSec" INTEGER,

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT,
    "isCorrect" BOOLEAN,
    "pointsEarned" DOUBLE PRECISION,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_group_assignments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_group_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurrence_rules" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT,
    "title" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurrence_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT,
    "moduleId" TEXT,
    "lessonId" TEXT,
    "recurrenceId" TEXT,
    "title" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "markedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_changes" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_assignments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "type" TEXT NOT NULL,
    "lessonId" TEXT,
    "courseId" TEXT,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "allowLate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "textResponse" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "submittedAt" TIMESTAMP(3),
    "score" INTEGER,
    "feedback" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_notes" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "studentId" TEXT,
    "groupId" TEXT,
    "sessionId" TEXT,
    "content" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'TEACHER_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teaching_plans" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "courseId" TEXT,
    "moduleId" TEXT,
    "lessonId" TEXT,
    "sessionId" TEXT,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "plannedDurationMin" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teaching_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL DEFAULT 'SYSTEM',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "relatedType" TEXT,
    "relatedId" TEXT,
    "actionLabel" TEXT,
    "expiresAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "groupKey" TEXT,
    "eventCount" INTEGER NOT NULL DEFAULT 1,
    "acknowledgementRequired" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "critical" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_sessions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "levelAtTime" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'EASY',
    "lessonId" TEXT,
    "topic" TEXT,
    "showTranslation" BOOLEAN NOT NULL DEFAULT false,
    "state" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "groupId" TEXT,
    "sessionId" TEXT,
    "mode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "inputChars" INTEGER NOT NULL DEFAULT 0,
    "outputChars" INTEGER NOT NULL DEFAULT 0,
    "estimatedTokens" INTEGER,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feedback" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messageId" TEXT,
    "studentId" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "report" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generated_content" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "studentId" TEXT NOT NULL,
    "groupId" TEXT,
    "lessonId" TEXT,
    "kind" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_generated_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "lessonId" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_sessions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "lessonId" TEXT,
    "levelAtTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "turns" INTEGER NOT NULL DEFAULT 0,
    "recognizedCount" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "wordsPracticed" TEXT,
    "mistakeNotes" TEXT,
    "summary" TEXT,
    "aiSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_attempts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "targetText" TEXT NOT NULL,
    "recognizedText" TEXT,
    "understood" BOOLEAN NOT NULL,
    "provider" TEXT NOT NULL,
    "providerConfidence" DOUBLE PRECISION,
    "mistakeCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speech_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listening_exercises" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL DEFAULT 'PRE_A1',
    "topic" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "translation" TEXT,
    "questions" TEXT NOT NULL,
    "lessonId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SCRIPT',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listening_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listening_attempts" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "answers" TEXT NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listening_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_assets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "url" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tts_requests" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tts_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_recognition_requests" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speech_recognition_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speaking_assignments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "lessonId" TEXT,
    "levelCode" TEXT,
    "topic" TEXT NOT NULL,
    "instructions" TEXT,
    "targetVocabulary" TEXT,
    "targetGrammar" TEXT,
    "minAttempts" INTEGER NOT NULL DEFAULT 1,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "gradingMode" TEXT NOT NULL DEFAULT 'COMPLETION',
    "transcript" TEXT,
    "audioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "speaking_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speaking_submissions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "teacherNote" TEXT,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "speaking_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listening_assignments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "attemptsAllowed" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listening_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_voice_preferences" (
    "studentId" TEXT NOT NULL,
    "beginnerMode" BOOLEAN NOT NULL DEFAULT true,
    "speed" TEXT NOT NULL DEFAULT '0.75',
    "showTranslation" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_voice_preferences_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "voice_consents" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "storeAudio" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "voice_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_settings" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parentCode" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_items" (
    "id" TEXT NOT NULL,
    "skillCode" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "vocabularyId" TEXT,
    "grammarId" TEXT,
    "lessonId" TEXT,
    "levelCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_events" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "skillCode" TEXT,
    "knowledgeItemId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "payload" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excludedAt" TIMESTAMP(3),
    "excludeReason" TEXT,
    "excludedById" TEXT,

    CONSTRAINT "learning_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_skill_states" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillCode" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NEW',
    "estimateLabel" TEXT NOT NULL DEFAULT 'Not started',
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "difficultyBand" INTEGER NOT NULL DEFAULT 1,
    "lastEventAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_skill_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_knowledge_states" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "knowledgeItemId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NEW',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "incorrectAttempts" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3),
    "lastPracticedAt" TIMESTAMP(3),
    "lastCorrectAt" TIMESTAMP(3),
    "lastIncorrectAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "confidenceLabel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_knowledge_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_schedules" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "knowledgeItemId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "intervalIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_recommendations" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "skillCode" TEXT,
    "href" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "durationMin" INTEGER NOT NULL DEFAULT 5,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3),
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_learning_plans" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planDate" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "items" TEXT NOT NULL,
    "note" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_learning_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_learning_plans" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "days" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_learning_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_goals" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "groupId" TEXT,
    "authorId" TEXT,
    "text" TEXT NOT NULL,
    "skillCode" TEXT,
    "source" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adaptive_rules" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adaptive_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_learning_overrides" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT,
    "studentId" TEXT,
    "prioritySkill" TEXT,
    "requiredLabel" TEXT,
    "note" TEXT,
    "reason" TEXT,
    "durationDays" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_learning_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_learning_profiles" (
    "studentId" TEXT NOT NULL,
    "organizationId" TEXT,
    "targetLevelCode" TEXT,
    "levelStatus" TEXT NOT NULL DEFAULT 'UNCONFIRMED',
    "assignedTeacherId" TEXT,
    "assignedCourseId" TEXT,
    "assignedBookId" TEXT,
    "learningPace" TEXT NOT NULL DEFAULT 'STANDARD',
    "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 10,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_learning_profiles_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "level_access_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "levelCode" TEXT NOT NULL,
    "nameOverride" TEXT,
    "displayNameOverride" TEXT,
    "allowLowerLevelReview" BOOLEAN NOT NULL DEFAULT true,
    "allowAssignedHigherPreview" BOOLEAN NOT NULL DEFAULT true,
    "requireExplicitAssignment" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_access_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_student_assignments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "groupId" TEXT,
    "organizationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_student_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_course_assignments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "assignedById" TEXT,
    "accessType" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "edition" TEXT,
    "isbn" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "levelCode" TEXT,
    "description" TEXT,
    "coverStoragePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_versions" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_content_nodes" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "parentId" TEXT,
    "nodeType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "contentJson" TEXT,
    "mappedCourseId" TEXT,
    "mappedModuleId" TEXT,
    "mappedLessonId" TEXT,
    "mappedActivityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_content_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_learning_preferences" (
    "studentId" TEXT NOT NULL,
    "dailyMinutes" INTEGER NOT NULL DEFAULT 10,
    "lastSyncedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_learning_preferences_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "gamification_profiles" (
    "studentId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "learningLevel" INTEGER NOT NULL DEFAULT 1,
    "flaggedAt" TIMESTAMP(3),
    "flagReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_profiles_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "mascot_reaction_logs" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "reactionCode" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "displayedAt" TIMESTAMP(3),

    CONSTRAINT "mascot_reaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "metadata" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversalOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_levels" (
    "level" INTEGER NOT NULL,
    "xpRequired" INTEGER NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "learning_levels_pkey" PRIMARY KEY ("level")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "requirementType" TEXT NOT NULL,
    "requirementCount" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'PERSONAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_badges" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirementType" TEXT NOT NULL,
    "requirementCount" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_milestones" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_streaks" (
    "studentId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "longest" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NONE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_streaks_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "streak_freezes" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL,

    CONSTRAINT "streak_freezes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL,
    "groupId" TEXT,
    "createdById" TEXT,
    "requirementType" TEXT NOT NULL,
    "requirementCount" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "badgeCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_participants" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_challenges" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirementType" TEXT NOT NULL,
    "requirementCount" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_challenge_progress" (
    "id" TEXT NOT NULL,
    "groupChallengeId" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_challenge_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_settings" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_completion_rules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "rules" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_completion_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_completion_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "eligible" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archiveReason" TEXT,
    "evaluatedAt" TIMESTAMP(3),
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_completion_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Certificate of Completion',
    "footer" TEXT,
    "showScore" BOOLEAN NOT NULL DEFAULT false,
    "showLevel" BOOLEAN NOT NULL DEFAULT false,
    "publicScore" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_signatories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_signatories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_sequences" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "certificate_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "templateId" TEXT,
    "signatoryId" TEXT,
    "status" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3) NOT NULL,
    "downloadToken" TEXT NOT NULL,
    "pdfBytes" BYTEA NOT NULL,
    "pdfSha256" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "issuedById" TEXT,
    "automatic" BOOLEAN NOT NULL DEFAULT false,
    "supersedesId" TEXT,
    "supersededById" TEXT,
    "recertifiesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_versions" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_revocations" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_revocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_verifications" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT,
    "publicId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_overrides" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "requirementKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_approvals" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_settings" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_preferences" (
    "userId" TEXT NOT NULL,
    "notifyEligible" BOOLEAN NOT NULL DEFAULT true,
    "notifyIssued" BOOLEAN NOT NULL DEFAULT true,
    "notifyRevoked" BOOLEAN NOT NULL DEFAULT true,
    "notifyExpiring" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "snapshot" TEXT NOT NULL,
    "pdfBytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "push" BOOLEAN NOT NULL DEFAULT false,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_preferences" (
    "userId" TEXT NOT NULL,
    "quietStart" TEXT,
    "quietEnd" TEXT,
    "timezone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "templateKey" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 360,
    "groupWindowMinutes" INTEGER NOT NULL DEFAULT 1440,
    "channels" TEXT NOT NULL DEFAULT '["IN_APP"]',
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_notices" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userId" TEXT,
    "relatedId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'DIRECT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_revisions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "previousBody" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksum" TEXT,
    "storageProvider" TEXT DEFAULT 'local',
    "storageBucket" TEXT,
    "accessLevel" TEXT DEFAULT 'PRIVATE',
    "processingStatus" TEXT DEFAULT 'READY',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "announcementType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdById" TEXT NOT NULL,
    "publishAt" TIMESTAMP(3) NOT NULL,
    "expireAt" TIMESTAMP(3),
    "courseId" TEXT,
    "assignmentId" TEXT,
    "href" TEXT,
    "linkLabel" TEXT,
    "acknowledgementRequired" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_targets" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,

    CONSTRAINT "announcement_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_acknowledgements" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keyP256dh" TEXT,
    "auth" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_settings" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculums" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "levelCode" TEXT,
    "goal" TEXT,
    "durationWeeks" INTEGER,
    "sessionCount" INTEGER,
    "plannedHours" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "curriculums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_versions" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changeNote" TEXT,
    "status" TEXT NOT NULL,
    "authorId" TEXT,
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_versions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changeNote" TEXT,
    "status" TEXT NOT NULL,
    "authorId" TEXT,
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "vocabularyNote" TEXT,
    "grammarNote" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "workflowStatus" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_drafts" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "blocksJson" TEXT NOT NULL,
    "savedById" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "levelCode" TEXT,
    "difficulty" TEXT,
    "topic" TEXT,
    "primarySkill" TEXT,
    "secondarySkill" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'TEACHER',
    "aiLabeled" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changeNote" TEXT,
    "status" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TOPIC',

    CONSTRAINT "content_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_item_tags" (
    "itemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "content_item_tags_pkey" PRIMARY KEY ("itemId","tagId")
);

-- CreateTable
CREATE TABLE "content_item_usages" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "lessonId" TEXT,
    "placement" TEXT NOT NULL DEFAULT 'LESSON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_item_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_objectives" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_mappings" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "primarySkill" TEXT NOT NULL,
    "secondarySkill" TEXT,

    CONSTRAINT "skill_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_prerequisites" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "requiredType" TEXT NOT NULL,
    "requiredId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_prerequisites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_releases" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "releaseAt" TIMESTAMP(3),
    "afterType" TEXT,
    "afterId" TEXT,
    "released" BOOLEAN NOT NULL DEFAULT false,
    "releasedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_assignments" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reviews" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reason" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_comments" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_media" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "checksum" TEXT,
    "storageProvider" TEXT DEFAULT 'local',
    "storageBucket" TEXT,
    "accessLevel" TEXT DEFAULT 'RESTRICTED',
    "processingStatus" TEXT DEFAULT 'READY',
    "version" INTEGER NOT NULL DEFAULT 1,
    "replacedById" TEXT,
    "altText" TEXT,
    "uploadedById" TEXT NOT NULL,
    "organizationId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_metrics" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "studentId" TEXT,
    "eventType" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_quality_checks" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "issues" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_ai_drafts" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "labeled" BOOLEAN NOT NULL DEFAULT true,
    "providerUsed" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "lessonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_ai_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_overrides" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_settings" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "logoPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tehran',
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "passwordRequireUpper" BOOLEAN NOT NULL DEFAULT false,
    "passwordRequireLower" BOOLEAN NOT NULL DEFAULT false,
    "passwordRequireNumber" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireSpecial" BOOLEAN NOT NULL DEFAULT false,
    "passwordHistory" INTEGER NOT NULL DEFAULT 0,
    "passwordExpiryDays" INTEGER NOT NULL DEFAULT 0,
    "mfaMode" TEXT NOT NULL DEFAULT 'OPTIONAL',
    "lockoutThreshold" INTEGER NOT NULL DEFAULT 5,
    "lockoutMinutes" INTEGER NOT NULL DEFAULT 15,
    "progressiveDelay" BOOLEAN NOT NULL DEFAULT true,
    "dormantDays" INTEGER NOT NULL DEFAULT 60,
    "dormantAutoSuspend" BOOLEAN NOT NULL DEFAULT false,
    "sessionMaxDays" INTEGER NOT NULL DEFAULT 7,
    "identityEnabled" BOOLEAN NOT NULL DEFAULT true,
    "trainingJson" TEXT,
    "coursesJson" TEXT,
    "notificationsJson" TEXT,
    "aiJson" TEXT,
    "certificatesJson" TEXT,
    "gamificationJson" TEXT,
    "reportsJson" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "userId" TEXT NOT NULL,
    "preferredLanguage" TEXT,
    "timezone" TEXT,
    "learningPreferences" TEXT,
    "aiAssistance" BOOLEAN NOT NULL DEFAULT true,
    "showTranslations" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_organizations" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("userId","organizationId")
);

-- CreateTable
CREATE TABLE "user_departments" (
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_departments_pkey" PRIMARY KEY ("userId","departmentId")
);

-- CreateTable
CREATE TABLE "user_groups" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("userId","groupId")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseRole" TEXT NOT NULL,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL DEFAULT 'ORGANIZATION',
    "scopeId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temporary_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL DEFAULT 'ORGANIZATION',
    "scopeId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temporary_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "roleId" TEXT,
    "permissionKey" TEXT,
    "scopeType" TEXT NOT NULL DEFAULT 'ORGANIZATION',
    "scopeId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "accessRoleKey" TEXT,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT,
    "groupId" TEXT,
    "employeeCode" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "impersonatorId" TEXT,
    "supportId" TEXT,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "userId" TEXT,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_security_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "ipAddress" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "secretEnc" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_backup_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_reviews" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_review_decisions" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT,
    "permissionKey" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_review_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_access_sessions" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_access_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_blueprints" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assessmentType" TEXT NOT NULL,
    "courseId" TEXT,
    "levelId" TEXT,
    "moduleId" TEXT,
    "unitId" TEXT,
    "questionCount" INTEGER NOT NULL,
    "timeLimitMinutes" INTEGER,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "attemptLimit" INTEGER,
    "retakePolicy" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "secureMode" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_blueprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_blueprint_versions" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sections" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "objectives" TEXT NOT NULL DEFAULT '[]',
    "scoringConfig" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_blueprint_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_question_pools" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "difficulty" TEXT,
    "questionIds" TEXT NOT NULL,

    CONSTRAINT "assessment_question_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_variants" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "blueprintVersionId" TEXT,
    "label" TEXT NOT NULL,
    "questionIds" TEXT NOT NULL,
    "difficultyIndex" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank_meta" (
    "questionId" TEXT NOT NULL,
    "courseId" TEXT,
    "unitId" TEXT,
    "subskill" TEXT,
    "objective" TEXT,
    "topic" TEXT,
    "estimatedSeconds" INTEGER,
    "vocabularyTag" TEXT,
    "grammarTopic" TEXT,
    "workplaceRelevance" BOOLEAN NOT NULL DEFAULT false,
    "firefighterRelevance" BOOLEAN NOT NULL DEFAULT false,
    "dayWorkerRelevance" BOOLEAN NOT NULL DEFAULT false,
    "reviewerId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastReviewedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "reviewState" TEXT NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "question_bank_meta_pkey" PRIMARY KEY ("questionId")
);

-- CreateTable
CREATE TABLE "question_versions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempt_snapshots" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "assessmentVersion" TEXT NOT NULL,
    "blueprintVersionId" TEXT,
    "questionVersions" TEXT NOT NULL,
    "questionOrder" TEXT NOT NULL,
    "timeConfig" TEXT NOT NULL,
    "scoringConfig" TEXT NOT NULL,
    "rubricVersionId" TEXT,
    "attemptPolicy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_attempt_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_attempt_events" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_attempt_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_item_statistics" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "correctRate" DOUBLE PRECISION,
    "omissionRate" DOUBLE PRECISION,
    "avgResponseSec" DOUBLE PRECISION,
    "discrimination" DOUBLE PRECISION,
    "pointBiserial" DOUBLE PRECISION,
    "reliability" DOUBLE PRECISION,
    "sufficient" BOOLEAN NOT NULL,
    "note" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_item_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_distractor_statistics" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "selectedCount" INTEGER NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_distractor_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_quality_checks" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_diagnostic_profiles" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "skills" TEXT NOT NULL,
    "officialGrade" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_diagnostic_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_results" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptId" TEXT,
    "recommendedLevel" TEXT NOT NULL,
    "officialOverride" TEXT,
    "overrideById" TEXT,
    "overrideReason" TEXT,
    "appliedToProfile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adaptive_assessment_sessions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "attemptId" TEXT,
    "config" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adaptive_assessment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adaptive_assessment_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "correct" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adaptive_assessment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubrics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "courseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubric_versions" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "criteria" TEXT NOT NULL,
    "immutable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rubric_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_rubric_scores" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL DEFAULT '',
    "rubricVersionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "scores" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNDER_REVIEW',
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_rubric_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "writing_submissions" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "writing_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_speaking_submissions" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "audioPath" TEXT,
    "transcript" TEXT,
    "durationSec" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_speaking_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_accommodations" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "extraMinutes" INTEGER NOT NULL DEFAULT 0,
    "largerText" BOOLEAN NOT NULL DEFAULT false,
    "extraInstructions" TEXT,
    "audioReplays" INTEGER,
    "windowExtensionMinutes" INTEGER NOT NULL DEFAULT 0,
    "staffNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_accommodations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_retake_policies" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "waitDays" INTEGER,
    "countsAs" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_retake_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_review_queue" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_review_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_corrections" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "previousScore" DOUBLE PRECISION NOT NULL,
    "newScore" DOUBLE PRECISION NOT NULL,
    "previousPassed" BOOLEAN,
    "newPassed" BOOLEAN,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_report_snapshots" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filters" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "result" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_retention_policies" (
    "id" TEXT NOT NULL,
    "audioDays" INTEGER NOT NULL DEFAULT 365,
    "integrityDays" INTEGER NOT NULL DEFAULT 180,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "endpointUrl" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "syncSchedule" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastHealthAt" TIMESTAMP(3),
    "healthMessage" TEXT,
    "healthLatencyMs" INTEGER,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "retryLimit" INTEGER NOT NULL DEFAULT 3,
    "timeoutMs" INTEGER NOT NULL DEFAULT 8000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_credentials" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "requestMethod" TEXT,
    "endpoint" TEXT,
    "responseCode" INTEGER,
    "message" TEXT NOT NULL,
    "detailsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_jobs" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "payloadJson" TEXT,
    "resultJson" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_field_mappings" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "externalField" TEXT NOT NULL,
    "lmsField" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'INBOUND',
    "transformRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_client_credentials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT,
    "clientSecretHash" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "rateLimitPerMin" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_client_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "retryLimit" INTEGER NOT NULL DEFAULT 5,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastDeliveryAt" TIMESTAMP(3),
    "lastStatusCode" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "durationMs" INTEGER,
    "status" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_identity_links" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalSubjectId" TEXT NOT NULL,
    "externalEmail" TEXT,
    "attributesJson" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_identity_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_sync_mappings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "lmsEventType" TEXT NOT NULL,
    "lmsEventId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SYNCED',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_sync_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_data_import_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "filename" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "conflictStrategy" TEXT NOT NULL DEFAULT 'LMS_WINS',
    "isDryRun" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "previewJson" TEXT,
    "sourceDataJson" TEXT,
    "errorsJson" TEXT,
    "executedById" TEXT NOT NULL,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_data_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_inbound_receipts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payloadHash" TEXT NOT NULL,

    CONSTRAINT "webhook_inbound_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "subjectUserId" TEXT,
    "objectType" TEXT,
    "objectId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "lockedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "definitionJson" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "subjectUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_run_steps" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "stepType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "inputJson" TEXT,
    "outputJson" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_run_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_approvals" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "decidedById" TEXT,
    "reason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "workflow_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_idempotency_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeCode_key" ON "users"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_groupId_idx" ON "users"("groupId");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_departmentId_idx" ON "users"("departmentId");

-- CreateIndex
CREATE INDEX "users_lastName_firstName_idx" ON "users"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "users_status_lastLoginAt_idx" ON "users"("status", "lastLoginAt");

-- CreateIndex
CREATE UNIQUE INDEX "learning_groups_name_key" ON "learning_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "learning_groups_code_key" ON "learning_groups"("code");

-- CreateIndex
CREATE INDEX "learning_groups_status_idx" ON "learning_groups"("status");

-- CreateIndex
CREATE INDEX "learning_groups_teacherId_idx" ON "learning_groups"("teacherId");

-- CreateIndex
CREATE INDEX "learning_groups_organizationId_idx" ON "learning_groups"("organizationId");

-- CreateIndex
CREATE INDEX "learning_groups_departmentId_idx" ON "learning_groups"("departmentId");

-- CreateIndex
CREATE INDEX "learning_groups_parentId_idx" ON "learning_groups"("parentId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "levels_code_key" ON "levels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "levels_order_key" ON "levels"("order");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE INDEX "courses_levelId_status_idx" ON "courses"("levelId", "status");

-- CreateIndex
CREATE INDEX "courses_curriculumId_sortOrder_idx" ON "courses"("curriculumId", "sortOrder");

-- CreateIndex
CREATE INDEX "modules_courseId_order_idx" ON "modules"("courseId", "order");

-- CreateIndex
CREATE INDEX "lessons_moduleId_order_idx" ON "lessons"("moduleId", "order");

-- CreateIndex
CREATE INDEX "lessons_status_idx" ON "lessons"("status");

-- CreateIndex
CREATE INDEX "lessons_unitId_idx" ON "lessons"("unitId");

-- CreateIndex
CREATE INDEX "lesson_content_blocks_lessonId_order_idx" ON "lesson_content_blocks"("lessonId", "order");

-- CreateIndex
CREATE INDEX "vocabulary_lessonId_order_idx" ON "vocabulary"("lessonId", "order");

-- CreateIndex
CREATE INDEX "vocabulary_levelCode_idx" ON "vocabulary"("levelCode");

-- CreateIndex
CREATE INDEX "grammar_content_lessonId_order_idx" ON "grammar_content"("lessonId", "order");

-- CreateIndex
CREATE INDEX "student_lesson_progress_studentId_status_idx" ON "student_lesson_progress"("studentId", "status");

-- CreateIndex
CREATE INDEX "student_lesson_progress_lessonId_idx" ON "student_lesson_progress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "student_lesson_progress_studentId_lessonId_key" ON "student_lesson_progress"("studentId", "lessonId");

-- CreateIndex
CREATE INDEX "activities_lessonId_order_status_idx" ON "activities"("lessonId", "order", "status");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "activities"("type");

-- CreateIndex
CREATE INDEX "activities_grammarId_idx" ON "activities"("grammarId");

-- CreateIndex
CREATE INDEX "activity_vocabulary_vocabularyId_idx" ON "activity_vocabulary"("vocabularyId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_vocabulary_activityId_vocabularyId_key" ON "activity_vocabulary"("activityId", "vocabularyId");

-- CreateIndex
CREATE INDEX "activity_attempts_studentId_activityId_submittedAt_idx" ON "activity_attempts"("studentId", "activityId", "submittedAt");

-- CreateIndex
CREATE INDEX "activity_attempts_studentId_submittedAt_idx" ON "activity_attempts"("studentId", "submittedAt");

-- CreateIndex
CREATE INDEX "activity_attempts_activityId_idx" ON "activity_attempts"("activityId");

-- CreateIndex
CREATE INDEX "vocabulary_review_studentId_dueAt_idx" ON "vocabulary_review"("studentId", "dueAt");

-- CreateIndex
CREATE INDEX "vocabulary_review_status_idx" ON "vocabulary_review"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vocabulary_review_studentId_vocabularyId_key" ON "vocabulary_review"("studentId", "vocabularyId");

-- CreateIndex
CREATE INDEX "course_assignments_groupId_idx" ON "course_assignments"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "course_assignments_courseId_groupId_key" ON "course_assignments"("courseId", "groupId");

-- CreateIndex
CREATE INDEX "assessments_status_startAt_endAt_idx" ON "assessments"("status", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "assessments_courseId_status_idx" ON "assessments"("courseId", "status");

-- CreateIndex
CREATE INDEX "assessments_type_status_idx" ON "assessments"("type", "status");

-- CreateIndex
CREATE INDEX "assessments_createdById_idx" ON "assessments"("createdById");

-- CreateIndex
CREATE INDEX "questions_status_type_idx" ON "questions"("status", "type");

-- CreateIndex
CREATE INDEX "questions_skill_difficulty_idx" ON "questions"("skill", "difficulty");

-- CreateIndex
CREATE INDEX "questions_levelId_status_idx" ON "questions"("levelId", "status");

-- CreateIndex
CREATE INDEX "questions_lessonId_idx" ON "questions"("lessonId");

-- CreateIndex
CREATE INDEX "questions_createdById_idx" ON "questions"("createdById");

-- CreateIndex
CREATE INDEX "question_options_questionId_order_idx" ON "question_options"("questionId", "order");

-- CreateIndex
CREATE INDEX "assessment_questions_assessmentId_order_idx" ON "assessment_questions"("assessmentId", "order");

-- CreateIndex
CREATE INDEX "assessment_questions_questionId_idx" ON "assessment_questions"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_assessmentId_questionId_key" ON "assessment_questions"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "assessment_attempts_studentId_status_idx" ON "assessment_attempts"("studentId", "status");

-- CreateIndex
CREATE INDEX "assessment_attempts_assessmentId_status_idx" ON "assessment_attempts"("assessmentId", "status");

-- CreateIndex
CREATE INDEX "assessment_attempts_status_idx" ON "assessment_attempts"("status");

-- CreateIndex
CREATE INDEX "assessment_attempts_submittedAt_idx" ON "assessment_attempts"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempts_assessmentId_studentId_attemptNumber_key" ON "assessment_attempts"("assessmentId", "studentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "assessment_answers_attemptId_idx" ON "assessment_answers"("attemptId");

-- CreateIndex
CREATE INDEX "assessment_answers_questionId_idx" ON "assessment_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_answers_attemptId_questionId_key" ON "assessment_answers"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "teacher_group_assignments_teacherId_idx" ON "teacher_group_assignments"("teacherId");

-- CreateIndex
CREATE INDEX "teacher_group_assignments_groupId_idx" ON "teacher_group_assignments"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_group_assignments_teacherId_groupId_key" ON "teacher_group_assignments"("teacherId", "groupId");

-- CreateIndex
CREATE INDEX "recurrence_rules_groupId_status_idx" ON "recurrence_rules"("groupId", "status");

-- CreateIndex
CREATE INDEX "recurrence_rules_teacherId_idx" ON "recurrence_rules"("teacherId");

-- CreateIndex
CREATE INDEX "class_sessions_teacherId_scheduledStart_idx" ON "class_sessions"("teacherId", "scheduledStart");

-- CreateIndex
CREATE INDEX "class_sessions_groupId_scheduledStart_idx" ON "class_sessions"("groupId", "scheduledStart");

-- CreateIndex
CREATE INDEX "class_sessions_status_idx" ON "class_sessions"("status");

-- CreateIndex
CREATE INDEX "class_sessions_scheduledStart_idx" ON "class_sessions"("scheduledStart");

-- CreateIndex
CREATE INDEX "class_sessions_recurrenceId_scheduledStart_idx" ON "class_sessions"("recurrenceId", "scheduledStart");

-- CreateIndex
CREATE INDEX "attendance_records_studentId_status_idx" ON "attendance_records"("studentId", "status");

-- CreateIndex
CREATE INDEX "attendance_records_sessionId_idx" ON "attendance_records"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_sessionId_studentId_key" ON "attendance_records"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "attendance_changes_sessionId_createdAt_idx" ON "attendance_changes"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "attendance_changes_studentId_idx" ON "attendance_changes"("studentId");

-- CreateIndex
CREATE INDEX "attendance_changes_actorId_idx" ON "attendance_changes"("actorId");

-- CreateIndex
CREATE INDEX "class_assignments_groupId_status_idx" ON "class_assignments"("groupId", "status");

-- CreateIndex
CREATE INDEX "class_assignments_teacherId_status_idx" ON "class_assignments"("teacherId", "status");

-- CreateIndex
CREATE INDEX "class_assignments_dueAt_idx" ON "class_assignments"("dueAt");

-- CreateIndex
CREATE INDEX "class_assignments_lessonId_idx" ON "class_assignments"("lessonId");

-- CreateIndex
CREATE INDEX "assignment_submissions_studentId_status_idx" ON "assignment_submissions"("studentId", "status");

-- CreateIndex
CREATE INDEX "assignment_submissions_status_idx" ON "assignment_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_assignmentId_studentId_key" ON "assignment_submissions"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "teacher_notes_studentId_createdAt_idx" ON "teacher_notes"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "teacher_notes_groupId_createdAt_idx" ON "teacher_notes"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "teacher_notes_sessionId_idx" ON "teacher_notes"("sessionId");

-- CreateIndex
CREATE INDEX "teacher_notes_authorId_idx" ON "teacher_notes"("authorId");

-- CreateIndex
CREATE INDEX "teaching_plans_teacherId_plannedDate_idx" ON "teaching_plans"("teacherId", "plannedDate");

-- CreateIndex
CREATE INDEX "teaching_plans_groupId_plannedDate_idx" ON "teaching_plans"("groupId", "plannedDate");

-- CreateIndex
CREATE INDEX "teaching_plans_status_idx" ON "teaching_plans"("status");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_category_createdAt_idx" ON "notifications"("userId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_groupKey_idx" ON "notifications"("userId", "groupKey");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "ai_sessions_studentId_startedAt_idx" ON "ai_sessions"("studentId", "startedAt");

-- CreateIndex
CREATE INDEX "ai_sessions_status_idx" ON "ai_sessions"("status");

-- CreateIndex
CREATE INDEX "ai_sessions_lessonId_idx" ON "ai_sessions"("lessonId");

-- CreateIndex
CREATE INDEX "ai_messages_sessionId_createdAt_idx" ON "ai_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_studentId_createdAt_idx" ON "ai_usage"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_groupId_createdAt_idx" ON "ai_usage"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_createdAt_idx" ON "ai_usage"("createdAt");

-- CreateIndex
CREATE INDEX "ai_feedback_studentId_createdAt_idx" ON "ai_feedback"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_feedback_sessionId_idx" ON "ai_feedback"("sessionId");

-- CreateIndex
CREATE INDEX "ai_settings_scopeKey_idx" ON "ai_settings"("scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ai_settings_scopeKey_key_key" ON "ai_settings"("scopeKey", "key");

-- CreateIndex
CREATE INDEX "ai_generated_content_status_createdAt_idx" ON "ai_generated_content"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ai_generated_content_groupId_status_idx" ON "ai_generated_content"("groupId", "status");

-- CreateIndex
CREATE INDEX "ai_generated_content_studentId_idx" ON "ai_generated_content"("studentId");

-- CreateIndex
CREATE INDEX "ai_recommendations_studentId_createdAt_idx" ON "ai_recommendations"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "voice_sessions_studentId_startedAt_idx" ON "voice_sessions"("studentId", "startedAt");

-- CreateIndex
CREATE INDEX "voice_sessions_kind_status_idx" ON "voice_sessions"("kind", "status");

-- CreateIndex
CREATE INDEX "voice_sessions_lessonId_idx" ON "voice_sessions"("lessonId");

-- CreateIndex
CREATE INDEX "voice_messages_sessionId_createdAt_idx" ON "voice_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "speech_attempts_studentId_createdAt_idx" ON "speech_attempts"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "speech_attempts_sessionId_idx" ON "speech_attempts"("sessionId");

-- CreateIndex
CREATE INDEX "listening_exercises_status_levelCode_idx" ON "listening_exercises"("status", "levelCode");

-- CreateIndex
CREATE INDEX "listening_exercises_lessonId_idx" ON "listening_exercises"("lessonId");

-- CreateIndex
CREATE INDEX "listening_attempts_studentId_createdAt_idx" ON "listening_attempts"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "listening_attempts_exerciseId_idx" ON "listening_attempts"("exerciseId");

-- CreateIndex
CREATE INDEX "listening_attempts_assignmentId_idx" ON "listening_attempts"("assignmentId");

-- CreateIndex
CREATE INDEX "audio_assets_createdById_idx" ON "audio_assets"("createdById");

-- CreateIndex
CREATE INDEX "tts_requests_studentId_createdAt_idx" ON "tts_requests"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "tts_requests_createdAt_idx" ON "tts_requests"("createdAt");

-- CreateIndex
CREATE INDEX "speech_recognition_requests_studentId_createdAt_idx" ON "speech_recognition_requests"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "speech_recognition_requests_createdAt_idx" ON "speech_recognition_requests"("createdAt");

-- CreateIndex
CREATE INDEX "speaking_assignments_groupId_status_idx" ON "speaking_assignments"("groupId", "status");

-- CreateIndex
CREATE INDEX "speaking_assignments_teacherId_idx" ON "speaking_assignments"("teacherId");

-- CreateIndex
CREATE INDEX "speaking_assignments_dueAt_idx" ON "speaking_assignments"("dueAt");

-- CreateIndex
CREATE INDEX "speaking_submissions_studentId_status_idx" ON "speaking_submissions"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "speaking_submissions_assignmentId_studentId_key" ON "speaking_submissions"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "listening_assignments_groupId_status_idx" ON "listening_assignments"("groupId", "status");

-- CreateIndex
CREATE INDEX "listening_assignments_teacherId_idx" ON "listening_assignments"("teacherId");

-- CreateIndex
CREATE INDEX "listening_assignments_dueAt_idx" ON "listening_assignments"("dueAt");

-- CreateIndex
CREATE INDEX "voice_consents_studentId_acceptedAt_idx" ON "voice_consents"("studentId", "acceptedAt");

-- CreateIndex
CREATE INDEX "voice_settings_scopeKey_idx" ON "voice_settings"("scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "voice_settings_scopeKey_key_key" ON "voice_settings"("scopeKey", "key");

-- CreateIndex
CREATE UNIQUE INDEX "skills_code_key" ON "skills"("code");

-- CreateIndex
CREATE INDEX "skills_parentCode_idx" ON "skills"("parentCode");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_items_vocabularyId_key" ON "knowledge_items"("vocabularyId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_items_grammarId_key" ON "knowledge_items"("grammarId");

-- CreateIndex
CREATE INDEX "knowledge_items_skillCode_idx" ON "knowledge_items"("skillCode");

-- CreateIndex
CREATE INDEX "knowledge_items_lessonId_idx" ON "knowledge_items"("lessonId");

-- CreateIndex
CREATE INDEX "learning_events_studentId_observedAt_idx" ON "learning_events"("studentId", "observedAt");

-- CreateIndex
CREATE INDEX "learning_events_studentId_skillCode_idx" ON "learning_events"("studentId", "skillCode");

-- CreateIndex
CREATE UNIQUE INDEX "learning_events_studentId_eventType_sourceType_sourceId_key" ON "learning_events"("studentId", "eventType", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "student_skill_states_skillCode_state_idx" ON "student_skill_states"("skillCode", "state");

-- CreateIndex
CREATE UNIQUE INDEX "student_skill_states_studentId_skillCode_key" ON "student_skill_states"("studentId", "skillCode");

-- CreateIndex
CREATE INDEX "student_knowledge_states_studentId_nextReviewAt_idx" ON "student_knowledge_states"("studentId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "student_knowledge_states_studentId_state_idx" ON "student_knowledge_states"("studentId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "student_knowledge_states_studentId_knowledgeItemId_key" ON "student_knowledge_states"("studentId", "knowledgeItemId");

-- CreateIndex
CREATE INDEX "review_schedules_studentId_dueAt_idx" ON "review_schedules"("studentId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_schedules_studentId_knowledgeItemId_key" ON "review_schedules"("studentId", "knowledgeItemId");

-- CreateIndex
CREATE INDEX "learning_recommendations_studentId_status_priority_idx" ON "learning_recommendations"("studentId", "status", "priority");

-- CreateIndex
CREATE INDEX "daily_learning_plans_planDate_idx" ON "daily_learning_plans"("planDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_learning_plans_studentId_planDate_key" ON "daily_learning_plans"("studentId", "planDate");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_learning_plans_studentId_weekStart_key" ON "weekly_learning_plans"("studentId", "weekStart");

-- CreateIndex
CREATE INDEX "learning_goals_studentId_active_idx" ON "learning_goals"("studentId", "active");

-- CreateIndex
CREATE INDEX "learning_goals_groupId_active_idx" ON "learning_goals"("groupId", "active");

-- CreateIndex
CREATE INDEX "adaptive_rules_scopeKey_idx" ON "adaptive_rules"("scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "adaptive_rules_scopeKey_key_key" ON "adaptive_rules"("scopeKey", "key");

-- CreateIndex
CREATE INDEX "teacher_learning_overrides_groupId_active_idx" ON "teacher_learning_overrides"("groupId", "active");

-- CreateIndex
CREATE INDEX "teacher_learning_overrides_studentId_active_idx" ON "teacher_learning_overrides"("studentId", "active");

-- CreateIndex
CREATE INDEX "student_learning_profiles_organizationId_targetLevelCode_idx" ON "student_learning_profiles"("organizationId", "targetLevelCode");

-- CreateIndex
CREATE INDEX "student_learning_profiles_assignedTeacherId_idx" ON "student_learning_profiles"("assignedTeacherId");

-- CreateIndex
CREATE INDEX "level_access_policies_levelCode_active_idx" ON "level_access_policies"("levelCode", "active");

-- CreateIndex
CREATE UNIQUE INDEX "level_access_policies_organizationId_levelCode_key" ON "level_access_policies"("organizationId", "levelCode");

-- CreateIndex
CREATE INDEX "teacher_student_assignments_studentId_status_idx" ON "teacher_student_assignments"("studentId", "status");

-- CreateIndex
CREATE INDEX "teacher_student_assignments_organizationId_teacherId_idx" ON "teacher_student_assignments"("organizationId", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_student_assignments_teacherId_studentId_key" ON "teacher_student_assignments"("teacherId", "studentId");

-- CreateIndex
CREATE INDEX "student_course_assignments_courseId_active_idx" ON "student_course_assignments"("courseId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "student_course_assignments_studentId_courseId_key" ON "student_course_assignments"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "books_organizationId_status_levelCode_idx" ON "books"("organizationId", "status", "levelCode");

-- CreateIndex
CREATE UNIQUE INDEX "book_versions_bookId_version_key" ON "book_versions"("bookId", "version");

-- CreateIndex
CREATE INDEX "book_content_nodes_bookId_parentId_sortOrder_idx" ON "book_content_nodes"("bookId", "parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "book_content_nodes_nodeType_status_idx" ON "book_content_nodes"("nodeType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mascot_reaction_logs_sourceEventId_key" ON "mascot_reaction_logs"("sourceEventId");

-- CreateIndex
CREATE INDEX "mascot_reaction_logs_studentId_createdAt_idx" ON "mascot_reaction_logs"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "mascot_reaction_logs_studentId_displayedAt_idx" ON "mascot_reaction_logs"("studentId", "displayedAt");

-- CreateIndex
CREATE INDEX "xp_transactions_studentId_createdAt_idx" ON "xp_transactions"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "xp_transactions_studentId_sourceType_sourceId_ruleKey_key" ON "xp_transactions"("studentId", "sourceType", "sourceId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "badges_code_key" ON "badges"("code");

-- CreateIndex
CREATE INDEX "badges_active_category_idx" ON "badges"("active", "category");

-- CreateIndex
CREATE INDEX "student_badges_studentId_earnedAt_idx" ON "student_badges"("studentId", "earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "student_badges_studentId_badgeId_key" ON "student_badges"("studentId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_code_key" ON "milestones"("code");

-- CreateIndex
CREATE UNIQUE INDEX "student_milestones_studentId_milestoneId_key" ON "student_milestones"("studentId", "milestoneId");

-- CreateIndex
CREATE INDEX "streak_freezes_studentId_usedAt_idx" ON "streak_freezes"("studentId", "usedAt");

-- CreateIndex
CREATE INDEX "challenges_groupId_active_idx" ON "challenges"("groupId", "active");

-- CreateIndex
CREATE INDEX "challenges_scope_active_idx" ON "challenges"("scope", "active");

-- CreateIndex
CREATE INDEX "challenge_participants_studentId_idx" ON "challenge_participants"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_participants_challengeId_studentId_key" ON "challenge_participants"("challengeId", "studentId");

-- CreateIndex
CREATE INDEX "group_challenges_groupId_active_idx" ON "group_challenges"("groupId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "group_challenge_progress_groupChallengeId_key" ON "group_challenge_progress"("groupChallengeId");

-- CreateIndex
CREATE INDEX "gamification_settings_scopeKey_idx" ON "gamification_settings"("scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_settings_scopeKey_key_key" ON "gamification_settings"("scopeKey", "key");

-- CreateIndex
CREATE UNIQUE INDEX "course_completion_rules_courseId_key" ON "course_completion_rules"("courseId");

-- CreateIndex
CREATE INDEX "course_completion_records_courseId_status_idx" ON "course_completion_records"("courseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "course_completion_records_studentId_courseId_key" ON "course_completion_records"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "certificate_templates_active_idx" ON "certificate_templates"("active");

-- CreateIndex
CREATE INDEX "certificate_signatories_active_idx" ON "certificate_signatories"("active");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_sequences_prefix_year_key" ON "certificate_sequences"("prefix", "year");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_publicId_key" ON "certificates"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_downloadToken_key" ON "certificates"("downloadToken");

-- CreateIndex
CREATE INDEX "certificates_studentId_status_idx" ON "certificates"("studentId", "status");

-- CreateIndex
CREATE INDEX "certificates_courseId_status_idx" ON "certificates"("courseId", "status");

-- CreateIndex
CREATE INDEX "certificates_status_expiresAt_idx" ON "certificates"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_versions_certificateId_version_key" ON "certificate_versions"("certificateId", "version");

-- CreateIndex
CREATE INDEX "certificate_revocations_certificateId_idx" ON "certificate_revocations"("certificateId");

-- CreateIndex
CREATE INDEX "certificate_verifications_publicId_checkedAt_idx" ON "certificate_verifications"("publicId", "checkedAt");

-- CreateIndex
CREATE INDEX "requirement_overrides_studentId_courseId_requirementKey_act_idx" ON "requirement_overrides"("studentId", "courseId", "requirementKey", "active");

-- CreateIndex
CREATE INDEX "requirement_overrides_actorId_idx" ON "requirement_overrides"("actorId");

-- CreateIndex
CREATE INDEX "teacher_approvals_studentId_courseId_createdAt_idx" ON "teacher_approvals"("studentId", "courseId", "createdAt");

-- CreateIndex
CREATE INDEX "teacher_approvals_actorId_idx" ON "teacher_approvals"("actorId");

-- CreateIndex
CREATE INDEX "certification_settings_scopeKey_idx" ON "certification_settings"("scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "certification_settings_scopeKey_key_key" ON "certification_settings"("scopeKey", "key");

-- CreateIndex
CREATE INDEX "transcripts_studentId_createdAt_idx" ON "transcripts"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_category_key" ON "notification_preferences"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_key_key" ON "notification_templates"("key");

-- CreateIndex
CREATE INDEX "notification_templates_active_category_idx" ON "notification_templates"("active", "category");

-- CreateIndex
CREATE UNIQUE INDEX "notification_template_versions_templateId_version_key" ON "notification_template_versions"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "notification_rules_eventKey_key" ON "notification_rules"("eventKey");

-- CreateIndex
CREATE INDEX "notification_deliveries_userId_channel_status_idx" ON "notification_deliveries"("userId", "channel", "status");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_notices_dedupeKey_key" ON "scheduled_notices"("dedupeKey");

-- CreateIndex
CREATE INDEX "scheduled_notices_kind_sentAt_idx" ON "scheduled_notices"("kind", "sentAt");

-- CreateIndex
CREATE INDEX "conversations_updatedAt_idx" ON "conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "conversation_participants_userId_archivedAt_idx" ON "conversation_participants"("userId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON "conversation_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "message_revisions_messageId_createdAt_idx" ON "message_revisions"("messageId", "createdAt");

-- CreateIndex
CREATE INDEX "message_attachments_messageId_idx" ON "message_attachments"("messageId");

-- CreateIndex
CREATE INDEX "message_attachments_checksum_idx" ON "message_attachments"("checksum");

-- CreateIndex
CREATE INDEX "announcements_publishAt_expireAt_idx" ON "announcements"("publishAt", "expireAt");

-- CreateIndex
CREATE INDEX "announcements_createdById_idx" ON "announcements"("createdById");

-- CreateIndex
CREATE INDEX "announcement_targets_announcementId_idx" ON "announcement_targets"("announcementId");

-- CreateIndex
CREATE INDEX "announcement_targets_targetType_targetId_idx" ON "announcement_targets"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "announcement_acknowledgements_userId_idx" ON "announcement_acknowledgements"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_acknowledgements_announcementId_userId_key" ON "announcement_acknowledgements"("announcementId", "userId");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_revokedAt_idx" ON "push_subscriptions"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_userId_endpoint_key" ON "push_subscriptions"("userId", "endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "communication_settings_scopeKey_key_key" ON "communication_settings"("scopeKey", "key");

-- CreateIndex
CREATE INDEX "curriculums_status_sortOrder_idx" ON "curriculums"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_versions_curriculumId_version_key" ON "curriculum_versions"("curriculumId", "version");

-- CreateIndex
CREATE INDEX "course_versions_courseId_idx" ON "course_versions"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_versions_courseId_version_key" ON "course_versions"("courseId", "version");

-- CreateIndex
CREATE INDEX "units_moduleId_order_idx" ON "units"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_drafts_lessonId_key" ON "lesson_drafts"("lessonId");

-- CreateIndex
CREATE INDEX "content_items_kind_status_idx" ON "content_items"("kind", "status");

-- CreateIndex
CREATE INDEX "content_items_authorId_idx" ON "content_items"("authorId");

-- CreateIndex
CREATE INDEX "content_items_levelCode_topic_idx" ON "content_items"("levelCode", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_itemId_version_key" ON "content_versions"("itemId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "content_tags_name_key" ON "content_tags"("name");

-- CreateIndex
CREATE INDEX "content_item_usages_contentItemId_idx" ON "content_item_usages"("contentItemId");

-- CreateIndex
CREATE INDEX "content_item_usages_lessonId_idx" ON "content_item_usages"("lessonId");

-- CreateIndex
CREATE INDEX "learning_objectives_resourceType_resourceId_idx" ON "learning_objectives"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_mappings_resourceType_resourceId_key" ON "skill_mappings"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "content_prerequisites_resourceId_idx" ON "content_prerequisites"("resourceId");

-- CreateIndex
CREATE INDEX "content_prerequisites_requiredId_idx" ON "content_prerequisites"("requiredId");

-- CreateIndex
CREATE UNIQUE INDEX "content_prerequisites_resourceType_resourceId_requiredType__key" ON "content_prerequisites"("resourceType", "resourceId", "requiredType", "requiredId");

-- CreateIndex
CREATE UNIQUE INDEX "content_releases_resourceType_resourceId_key" ON "content_releases"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "content_assignments_targetType_targetId_idx" ON "content_assignments"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "content_assignments_resourceType_resourceId_idx" ON "content_assignments"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "content_reviews_resourceType_resourceId_createdAt_idx" ON "content_reviews"("resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "content_reviews_status_idx" ON "content_reviews"("status");

-- CreateIndex
CREATE INDEX "content_comments_resourceType_resourceId_idx" ON "content_comments"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "content_media_kind_archivedAt_idx" ON "content_media"("kind", "archivedAt");

-- CreateIndex
CREATE INDEX "content_media_uploadedById_idx" ON "content_media"("uploadedById");

-- CreateIndex
CREATE INDEX "content_media_checksum_idx" ON "content_media"("checksum");

-- CreateIndex
CREATE INDEX "content_media_organizationId_idx" ON "content_media"("organizationId");

-- CreateIndex
CREATE INDEX "content_metrics_resourceType_resourceId_eventType_idx" ON "content_metrics"("resourceType", "resourceId", "eventType");

-- CreateIndex
CREATE INDEX "content_metrics_studentId_createdAt_idx" ON "content_metrics"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "content_quality_checks_resourceType_resourceId_checkedAt_idx" ON "content_quality_checks"("resourceType", "resourceId", "checkedAt");

-- CreateIndex
CREATE INDEX "content_ai_drafts_authorId_status_idx" ON "content_ai_drafts"("authorId", "status");

-- CreateIndex
CREATE INDEX "content_overrides_resourceId_idx" ON "content_overrides"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "content_overrides_studentId_resourceType_resourceId_key" ON "content_overrides"("studentId", "resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "content_settings_scopeKey_key_key" ON "content_settings"("scopeKey", "key");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_settings_organizationId_key" ON "organization_settings"("organizationId");

-- CreateIndex
CREATE INDEX "departments_managerId_idx" ON "departments"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organizationId_code_key" ON "departments"("organizationId", "code");

-- CreateIndex
CREATE INDEX "teams_departmentId_idx" ON "teams"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_organizationId_code_key" ON "teams"("organizationId", "code");

-- CreateIndex
CREATE INDEX "user_groups_groupId_idx" ON "user_groups"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_category_idx" ON "permissions"("category");

-- CreateIndex
CREATE INDEX "roles_baseRole_idx" ON "roles"("baseRole");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organizationId_key_key" ON "roles"("organizationId", "key");

-- CreateIndex
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

-- CreateIndex
CREATE INDEX "user_roles_userId_endsAt_idx" ON "user_roles"("userId", "endsAt");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE INDEX "user_roles_scopeType_scopeId_idx" ON "user_roles"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "temporary_permissions_userId_endsAt_idx" ON "temporary_permissions"("userId", "endsAt");

-- CreateIndex
CREATE INDEX "temporary_permissions_permissionKey_idx" ON "temporary_permissions"("permissionKey");

-- CreateIndex
CREATE INDEX "delegations_toUserId_status_endsAt_idx" ON "delegations"("toUserId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "delegations_fromUserId_idx" ON "delegations"("fromUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_tokenHash_key" ON "user_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "user_invitations_email_idx" ON "user_invitations"("email");

-- CreateIndex
CREATE INDEX "user_invitations_expiresAt_idx" ON "user_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "user_sessions_userId_revokedAt_idx" ON "user_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "login_attempts_identifier_createdAt_idx" ON "login_attempts"("identifier", "createdAt");

-- CreateIndex
CREATE INDEX "login_attempts_userId_createdAt_idx" ON "login_attempts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "account_security_events_type_createdAt_idx" ON "account_security_events"("type", "createdAt");

-- CreateIndex
CREATE INDEX "account_security_events_userId_createdAt_idx" ON "account_security_events"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_methods_userId_type_key" ON "mfa_methods"("userId", "type");

-- CreateIndex
CREATE INDEX "mfa_backup_codes_userId_usedAt_idx" ON "mfa_backup_codes"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "mfa_challenges_userId_purpose_idx" ON "mfa_challenges"("userId", "purpose");

-- CreateIndex
CREATE INDEX "password_history_userId_createdAt_idx" ON "password_history"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "access_reviews_organizationId_status_idx" ON "access_reviews"("organizationId", "status");

-- CreateIndex
CREATE INDEX "access_review_decisions_reviewId_idx" ON "access_review_decisions"("reviewId");

-- CreateIndex
CREATE INDEX "access_review_decisions_userId_idx" ON "access_review_decisions"("userId");

-- CreateIndex
CREATE INDEX "support_access_sessions_actorId_idx" ON "support_access_sessions"("actorId");

-- CreateIndex
CREATE INDEX "support_access_sessions_targetUserId_idx" ON "support_access_sessions"("targetUserId");

-- CreateIndex
CREATE INDEX "import_batches_actorId_expiresAt_idx" ON "import_batches"("actorId", "expiresAt");

-- CreateIndex
CREATE INDEX "assessment_blueprints_status_assessmentType_idx" ON "assessment_blueprints"("status", "assessmentType");

-- CreateIndex
CREATE INDEX "assessment_blueprints_createdById_idx" ON "assessment_blueprints"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_blueprint_versions_blueprintId_version_key" ON "assessment_blueprint_versions"("blueprintId", "version");

-- CreateIndex
CREATE INDEX "assessment_question_pools_blueprintId_skill_idx" ON "assessment_question_pools"("blueprintId", "skill");

-- CreateIndex
CREATE INDEX "assessment_variants_blueprintId_idx" ON "assessment_variants"("blueprintId");

-- CreateIndex
CREATE INDEX "question_bank_meta_reviewState_idx" ON "question_bank_meta"("reviewState");

-- CreateIndex
CREATE INDEX "question_versions_questionId_idx" ON "question_versions"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_versions_questionId_version_key" ON "question_versions"("questionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_attempt_snapshots_attemptId_key" ON "assessment_attempt_snapshots"("attemptId");

-- CreateIndex
CREATE INDEX "assessment_attempt_events_attemptId_createdAt_idx" ON "assessment_attempt_events"("attemptId", "createdAt");

-- CreateIndex
CREATE INDEX "assessment_item_statistics_questionId_calculatedAt_idx" ON "assessment_item_statistics"("questionId", "calculatedAt");

-- CreateIndex
CREATE INDEX "assessment_distractor_statistics_questionId_calculatedAt_idx" ON "assessment_distractor_statistics"("questionId", "calculatedAt");

-- CreateIndex
CREATE INDEX "assessment_quality_checks_questionId_createdAt_idx" ON "assessment_quality_checks"("questionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_diagnostic_profiles_attemptId_key" ON "assessment_diagnostic_profiles"("attemptId");

-- CreateIndex
CREATE INDEX "assessment_diagnostic_profiles_studentId_idx" ON "assessment_diagnostic_profiles"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "placement_results_attemptId_key" ON "placement_results"("attemptId");

-- CreateIndex
CREATE INDEX "placement_results_studentId_createdAt_idx" ON "placement_results"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "adaptive_assessment_sessions_attemptId_key" ON "adaptive_assessment_sessions"("attemptId");

-- CreateIndex
CREATE INDEX "adaptive_assessment_sessions_studentId_assessmentId_idx" ON "adaptive_assessment_sessions"("studentId", "assessmentId");

-- CreateIndex
CREATE INDEX "adaptive_assessment_events_sessionId_createdAt_idx" ON "adaptive_assessment_events"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "rubrics_kind_status_idx" ON "rubrics"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rubric_versions_rubricId_version_key" ON "rubric_versions"("rubricId", "version");

-- CreateIndex
CREATE INDEX "assessment_rubric_scores_status_idx" ON "assessment_rubric_scores"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_rubric_scores_attemptId_questionId_key" ON "assessment_rubric_scores"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "writing_submissions_status_idx" ON "writing_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "writing_submissions_attemptId_questionId_key" ON "writing_submissions"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "assessment_speaking_submissions_status_idx" ON "assessment_speaking_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_speaking_submissions_attemptId_questionId_key" ON "assessment_speaking_submissions"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "assessment_accommodations_studentId_assessmentId_idx" ON "assessment_accommodations"("studentId", "assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_retake_policies_assessmentId_key" ON "assessment_retake_policies"("assessmentId");

-- CreateIndex
CREATE INDEX "assessment_review_queue_status_kind_idx" ON "assessment_review_queue"("status", "kind");

-- CreateIndex
CREATE INDEX "assessment_review_queue_attemptId_idx" ON "assessment_review_queue"("attemptId");

-- CreateIndex
CREATE INDEX "assessment_corrections_attemptId_idx" ON "assessment_corrections"("attemptId");

-- CreateIndex
CREATE INDEX "assessment_report_snapshots_createdAt_idx" ON "assessment_report_snapshots"("createdAt");

-- CreateIndex
CREATE INDEX "integration_connections_organizationId_category_status_idx" ON "integration_connections"("organizationId", "category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_organizationId_slug_key" ON "integration_connections"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "integration_credentials_connectionId_key_key" ON "integration_credentials"("connectionId", "key");

-- CreateIndex
CREATE INDEX "integration_logs_connectionId_createdAt_idx" ON "integration_logs"("connectionId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_logs_level_status_idx" ON "integration_logs"("level", "status");

-- CreateIndex
CREATE INDEX "integration_sync_jobs_connectionId_status_idx" ON "integration_sync_jobs"("connectionId", "status");

-- CreateIndex
CREATE INDEX "integration_field_mappings_connectionId_entityType_idx" ON "integration_field_mappings"("connectionId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "api_client_credentials_clientId_key" ON "api_client_credentials"("clientId");

-- CreateIndex
CREATE INDEX "api_client_credentials_clientId_isActive_idx" ON "api_client_credentials"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_organizationId_isActive_idx" ON "webhook_subscriptions"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "webhook_deliveries_subscriptionId_createdAt_idx" ON "webhook_deliveries"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "external_identity_links_organizationId_userId_idx" ON "external_identity_links"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "external_identity_links_organizationId_provider_externalSub_key" ON "external_identity_links"("organizationId", "provider", "externalSubjectId");

-- CreateIndex
CREATE INDEX "calendar_sync_mappings_userId_provider_idx" ON "calendar_sync_mappings"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_sync_mappings_userId_lmsEventType_lmsEventId_key" ON "calendar_sync_mappings"("userId", "lmsEventType", "lmsEventId");

-- CreateIndex
CREATE INDEX "external_data_import_batches_status_createdAt_idx" ON "external_data_import_batches"("status", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_inbound_receipts_organizationId_receivedAt_idx" ON "webhook_inbound_receipts"("organizationId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_inbound_receipts_organizationId_deliveryId_key" ON "webhook_inbound_receipts"("organizationId", "deliveryId");

-- CreateIndex
CREATE INDEX "workflow_events_organizationId_status_nextAttemptAt_idx" ON "workflow_events"("organizationId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "workflow_events_organizationId_eventType_occurredAt_idx" ON "workflow_events"("organizationId", "eventType", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_events_organizationId_idempotencyKey_key" ON "workflow_events"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "workflows_organizationId_status_idx" ON "workflows"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_organizationId_name_key" ON "workflows"("organizationId", "name");

-- CreateIndex
CREATE INDEX "workflow_versions_workflowId_status_idx" ON "workflow_versions"("workflowId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_versions_workflowId_version_key" ON "workflow_versions"("workflowId", "version");

-- CreateIndex
CREATE INDEX "workflow_runs_organizationId_status_createdAt_idx" ON "workflow_runs"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "workflow_runs_workflowId_createdAt_idx" ON "workflow_runs"("workflowId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_workflowId_versionId_eventId_key" ON "workflow_runs"("workflowId", "versionId", "eventId");

-- CreateIndex
CREATE INDEX "workflow_run_steps_runId_status_idx" ON "workflow_run_steps"("runId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_run_steps_runId_stepIndex_key" ON "workflow_run_steps"("runId", "stepIndex");

-- CreateIndex
CREATE INDEX "workflow_approvals_status_expiresAt_idx" ON "workflow_approvals"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_approvals_runId_stepIndex_key" ON "workflow_approvals"("runId", "stepIndex");

-- CreateIndex
CREATE INDEX "workflow_idempotency_records_workflowId_createdAt_idx" ON "workflow_idempotency_records"("workflowId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_idempotency_records_organizationId_key_key" ON "workflow_idempotency_records"("organizationId", "key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_groups" ADD CONSTRAINT "learning_groups_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "learning_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_groups" ADD CONSTRAINT "learning_groups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_groups" ADD CONSTRAINT "learning_groups_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_groups" ADD CONSTRAINT "learning_groups_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_groups" ADD CONSTRAINT "learning_groups_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levels" ADD CONSTRAINT "levels_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curriculums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_content_blocks" ADD CONSTRAINT "lesson_content_blocks_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary" ADD CONSTRAINT "vocabulary_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grammar_content" ADD CONSTRAINT "grammar_content_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_lesson_progress" ADD CONSTRAINT "student_lesson_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_lesson_progress" ADD CONSTRAINT "student_lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_grammarId_fkey" FOREIGN KEY ("grammarId") REFERENCES "grammar_content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_vocabulary" ADD CONSTRAINT "activity_vocabulary_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_vocabulary" ADD CONSTRAINT "activity_vocabulary_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_attempts" ADD CONSTRAINT "activity_attempts_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_review" ADD CONSTRAINT "vocabulary_review_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabulary_review" ADD CONSTRAINT "vocabulary_review_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_grammarConceptId_fkey" FOREIGN KEY ("grammarConceptId") REFERENCES "grammar_content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "vocabulary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "assessment_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_group_assignments" ADD CONSTRAINT "teacher_group_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_group_assignments" ADD CONSTRAINT "teacher_group_assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_group_assignments" ADD CONSTRAINT "teacher_group_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "recurrence_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_changes" ADD CONSTRAINT "attendance_changes_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_changes" ADD CONSTRAINT "attendance_changes_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "class_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_notes" ADD CONSTRAINT "teacher_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_notes" ADD CONSTRAINT "teacher_notes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_notes" ADD CONSTRAINT "teacher_notes_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_notes" ADD CONSTRAINT "teacher_notes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_plans" ADD CONSTRAINT "teaching_plans_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_plans" ADD CONSTRAINT "teaching_plans_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_plans" ADD CONSTRAINT "teaching_plans_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_plans" ADD CONSTRAINT "teaching_plans_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_plans" ADD CONSTRAINT "teaching_plans_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_plans" ADD CONSTRAINT "teaching_plans_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generated_content" ADD CONSTRAINT "ai_generated_content_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generated_content" ADD CONSTRAINT "ai_generated_content_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generated_content" ADD CONSTRAINT "ai_generated_content_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generated_content" ADD CONSTRAINT "ai_generated_content_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generated_content" ADD CONSTRAINT "ai_generated_content_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_messages" ADD CONSTRAINT "voice_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "voice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speech_attempts" ADD CONSTRAINT "speech_attempts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "voice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speech_attempts" ADD CONSTRAINT "speech_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_exercises" ADD CONSTRAINT "listening_exercises_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_attempts" ADD CONSTRAINT "listening_attempts_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "listening_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_attempts" ADD CONSTRAINT "listening_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tts_requests" ADD CONSTRAINT "tts_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speech_recognition_requests" ADD CONSTRAINT "speech_recognition_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_assignments" ADD CONSTRAINT "speaking_assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_assignments" ADD CONSTRAINT "speaking_assignments_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_submissions" ADD CONSTRAINT "speaking_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "speaking_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speaking_submissions" ADD CONSTRAINT "speaking_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_assignments" ADD CONSTRAINT "listening_assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_assignments" ADD CONSTRAINT "listening_assignments_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "listening_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_voice_preferences" ADD CONSTRAINT "student_voice_preferences_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_consents" ADD CONSTRAINT "voice_consents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "skills"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_grammarId_fkey" FOREIGN KEY ("grammarId") REFERENCES "grammar_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_skill_states" ADD CONSTRAINT "student_skill_states_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_knowledge_states" ADD CONSTRAINT "student_knowledge_states_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_knowledge_states" ADD CONSTRAINT "student_knowledge_states_knowledgeItemId_fkey" FOREIGN KEY ("knowledgeItemId") REFERENCES "knowledge_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_schedules" ADD CONSTRAINT "review_schedules_knowledgeItemId_fkey" FOREIGN KEY ("knowledgeItemId") REFERENCES "knowledge_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_recommendations" ADD CONSTRAINT "learning_recommendations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_learning_plans" ADD CONSTRAINT "daily_learning_plans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_learning_plans" ADD CONSTRAINT "weekly_learning_plans_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_learning_overrides" ADD CONSTRAINT "teacher_learning_overrides_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_learning_overrides" ADD CONSTRAINT "teacher_learning_overrides_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_learning_overrides" ADD CONSTRAINT "teacher_learning_overrides_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_learning_profiles" ADD CONSTRAINT "student_learning_profiles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_learning_profiles" ADD CONSTRAINT "student_learning_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_learning_profiles" ADD CONSTRAINT "student_learning_profiles_assignedTeacherId_fkey" FOREIGN KEY ("assignedTeacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_learning_profiles" ADD CONSTRAINT "student_learning_profiles_assignedCourseId_fkey" FOREIGN KEY ("assignedCourseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_learning_profiles" ADD CONSTRAINT "student_learning_profiles_assignedBookId_fkey" FOREIGN KEY ("assignedBookId") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_access_policies" ADD CONSTRAINT "level_access_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_student_assignments" ADD CONSTRAINT "teacher_student_assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_student_assignments" ADD CONSTRAINT "teacher_student_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_student_assignments" ADD CONSTRAINT "teacher_student_assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_student_assignments" ADD CONSTRAINT "teacher_student_assignments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_assignments" ADD CONSTRAINT "student_course_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_assignments" ADD CONSTRAINT "student_course_assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_assignments" ADD CONSTRAINT "student_course_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_versions" ADD CONSTRAINT "book_versions_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_content_nodes" ADD CONSTRAINT "book_content_nodes_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_content_nodes" ADD CONSTRAINT "book_content_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "book_content_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_content_nodes" ADD CONSTRAINT "book_content_nodes_mappedCourseId_fkey" FOREIGN KEY ("mappedCourseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_content_nodes" ADD CONSTRAINT "book_content_nodes_mappedModuleId_fkey" FOREIGN KEY ("mappedModuleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_content_nodes" ADD CONSTRAINT "book_content_nodes_mappedLessonId_fkey" FOREIGN KEY ("mappedLessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_content_nodes" ADD CONSTRAINT "book_content_nodes_mappedActivityId_fkey" FOREIGN KEY ("mappedActivityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_learning_preferences" ADD CONSTRAINT "student_learning_preferences_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_profiles" ADD CONSTRAINT "gamification_profiles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mascot_reaction_logs" ADD CONSTRAINT "mascot_reaction_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_milestones" ADD CONSTRAINT "student_milestones_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_milestones" ADD CONSTRAINT "student_milestones_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_streaks" ADD CONSTRAINT "learning_streaks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_freezes" ADD CONSTRAINT "streak_freezes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_challenges" ADD CONSTRAINT "group_challenges_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_challenge_progress" ADD CONSTRAINT "group_challenge_progress_groupChallengeId_fkey" FOREIGN KEY ("groupChallengeId") REFERENCES "group_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_completion_rules" ADD CONSTRAINT "course_completion_rules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_completion_records" ADD CONSTRAINT "course_completion_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_completion_records" ADD CONSTRAINT "course_completion_records_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_versions" ADD CONSTRAINT "certificate_versions_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_revocations" ADD CONSTRAINT "certificate_revocations_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "certificates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_overrides" ADD CONSTRAINT "requirement_overrides_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_approvals" ADD CONSTRAINT "teacher_approvals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_approvals" ADD CONSTRAINT "teacher_approvals_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_preferences" ADD CONSTRAINT "certificate_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_template_versions" ADD CONSTRAINT "notification_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_revisions" ADD CONSTRAINT "message_revisions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_revisions" ADD CONSTRAINT "message_revisions_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_targets" ADD CONSTRAINT "announcement_targets_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_acknowledgements" ADD CONSTRAINT "announcement_acknowledgements_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculums" ADD CONSTRAINT "curriculums_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curriculums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_versions" ADD CONSTRAINT "course_versions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_versions" ADD CONSTRAINT "course_versions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_drafts" ADD CONSTRAINT "lesson_drafts_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_item_tags" ADD CONSTRAINT "content_item_tags_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_item_tags" ADD CONSTRAINT "content_item_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "content_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_item_usages" ADD CONSTRAINT "content_item_usages_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_item_usages" ADD CONSTRAINT "content_item_usages_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_assignments" ADD CONSTRAINT "content_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_media" ADD CONSTRAINT "content_media_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_media" ADD CONSTRAINT "content_media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_media" ADD CONSTRAINT "content_media_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ai_drafts" ADD CONSTRAINT "content_ai_drafts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_overrides" ADD CONSTRAINT "content_overrides_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temporary_permissions" ADD CONSTRAINT "temporary_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temporary_permissions" ADD CONSTRAINT "temporary_permissions_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_security_events" ADD CONSTRAINT "account_security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_methods" ADD CONSTRAINT "mfa_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_backup_codes" ADD CONSTRAINT "mfa_backup_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_challenges" ADD CONSTRAINT "mfa_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_reviews" ADD CONSTRAINT "access_reviews_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_reviews" ADD CONSTRAINT "access_reviews_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_review_decisions" ADD CONSTRAINT "access_review_decisions_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "access_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_review_decisions" ADD CONSTRAINT "access_review_decisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_access_sessions" ADD CONSTRAINT "support_access_sessions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_access_sessions" ADD CONSTRAINT "support_access_sessions_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_blueprint_versions" ADD CONSTRAINT "assessment_blueprint_versions_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "assessment_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_question_pools" ADD CONSTRAINT "assessment_question_pools_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "assessment_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_variants" ADD CONSTRAINT "assessment_variants_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "assessment_blueprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_variants" ADD CONSTRAINT "assessment_variants_blueprintVersionId_fkey" FOREIGN KEY ("blueprintVersionId") REFERENCES "assessment_blueprint_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_meta" ADD CONSTRAINT "question_bank_meta_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adaptive_assessment_events" ADD CONSTRAINT "adaptive_assessment_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "adaptive_assessment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubric_versions" ADD CONSTRAINT "rubric_versions_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "rubrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_field_mappings" ADD CONSTRAINT "integration_field_mappings_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "integration_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_identity_links" ADD CONSTRAINT "external_identity_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "workflow_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_run_steps" ADD CONSTRAINT "workflow_run_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_approvals" ADD CONSTRAINT "workflow_approvals_runId_fkey" FOREIGN KEY ("runId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

