-- Phase 57 — daily goals for learners (persisted preferences, distinct from minutes)
-- Minimal justified schema change: learner-chosen goal type/value/enable stored in StudentLearningPreference.
-- Existing dailyMinutes retained for backwards compat; new columns default to 1 LESSON goal enabled.
ALTER TABLE "student_learning_preferences" ADD COLUMN "dailyGoalType" TEXT NOT NULL DEFAULT 'LESSONS';
ALTER TABLE "student_learning_preferences" ADD COLUMN "dailyGoalValue" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "student_learning_preferences" ADD COLUMN "dailyGoalEnabled" BOOLEAN NOT NULL DEFAULT 1;
