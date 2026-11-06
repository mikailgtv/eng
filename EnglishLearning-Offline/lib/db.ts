/**
 * Offline SQLite storage — fully offline, no internet.
 * Tables: lessons_progress, vocabulary_bookmarks, quiz_attempts, exam_results, daily_goals, settings
 * Uses expo-sqlite (14.0.5) — works with airplane mode.
 */
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('englishbridge_offline.db');
  await initTables(db);
  return db;
}

async function initTables(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      lessonId TEXT PRIMARY KEY,
      status TEXT NOT NULL, -- NOT_STARTED | IN_PROGRESS | COMPLETED
      completedAt TEXT,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vocab_bookmarks (
      word TEXT PRIMARY KEY,
      translation TEXT,
      savedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      lessonId TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      answers TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exam_results (
      id TEXT PRIMARY KEY,
      examId TEXT NOT NULL,
      score INTEGER NOT NULL,
      total INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_goals (
      date TEXT PRIMARY KEY,
      goal INTEGER NOT NULL,
      completed INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// Progress helpers
export async function setLessonProgress(lessonId: string, status: string) {
  const d = await getDb();
  await d.runAsync(
    'INSERT OR REPLACE INTO lesson_progress (lessonId, status, completedAt, updatedAt) VALUES (?, ?, ?, ?)',
    [lessonId, status, status === 'COMPLETED' ? new Date().toISOString() : null, new Date().toISOString()]
  );
}

export async function getAllProgress() {
  const d = await getDb();
  return d.getAllAsync('SELECT * FROM lesson_progress');
}

// Bookmarks
export async function toggleBookmark(word: string, translation?: string) {
  const d = await getDb();
  const existing = await d.getFirstAsync('SELECT * FROM vocab_bookmarks WHERE word = ?', [word]);
  if (existing) {
    await d.runAsync('DELETE FROM vocab_bookmarks WHERE word = ?', [word]);
    return false;
  } else {
    await d.runAsync('INSERT INTO vocab_bookmarks (word, translation, savedAt) VALUES (?, ?, ?)', [word, translation ?? '', new Date().toISOString()]);
    return true;
  }
}

export async function getBookmarks() {
  const d = await getDb();
  return d.getAllAsync('SELECT * FROM vocab_bookmarks ORDER BY savedAt DESC');
}

// Daily goals & streaks
export async function saveDailyGoal(date: string, goal: number, completed: number) {
  const d = await getDb();
  await d.runAsync('INSERT OR REPLACE INTO daily_goals (date, goal, completed) VALUES (?, ?, ?)', [date, goal, completed]);
}

// Export / backup (local file)
export async function exportProgressToJson() {
  const d = await getDb();
  const progress = await d.getAllAsync('SELECT * FROM lesson_progress');
  const bookmarks = await d.getAllAsync('SELECT * FROM vocab_bookmarks');
  const exams = await d.getAllAsync('SELECT * FROM exam_results');
  const payload = { exportedAt: new Date().toISOString(), progress, bookmarks, exams, note: 'EnglishBridge offline backup — local only, not synced' };
  return JSON.stringify(payload, null, 2);
}

// Clear with confirmation (caller must show dialog)
export async function clearAllProgress() {
  const d = await getDb();
  await d.execAsync('DELETE FROM lesson_progress; DELETE FROM vocab_bookmarks; DELETE FROM quiz_attempts; DELETE FROM exam_results; DELETE FROM daily_goals;');
}
