/**
 * Bundled curriculum — offline, no network.
 * Source: prisma/curriculum/*.ts → assets/curriculum.json (71K, 1 course, 6 modules, 25 lessons)
 * Legally owned by project (original educational content).
 */
import curriculum from '../assets/curriculum.json';

export type Vocab = { word: string; translation?: string; pronunciation?: string; phonetic?: string; exampleSentence?: string };
export type Grammar = { title: string; explanation?: string; patterns: string[]; examples: string[] };
export type Block =
  | { type: 'TEXT'; text: string }
  | { type: 'HEADING'; text: string; level?: 2 | 3 }
  | { type: 'EXAMPLE'; items: { text: string; note?: string }[]; intro?: string }
  | { type: 'TIP'; text: string }
  | { type: 'WARNING'; text: string }
  | { type: 'QUESTION'; prompt: string; answer: string; hint?: string }
  | { type: 'GRAMMAR'; title: string; explanation?: string; patterns: string[]; examples: string[] }
  | { type: 'VOCABULARY'; intro?: string };

export type Lesson = {
  title: string;
  description: string;
  objectives: string[];
  durationMin: number;
  blocks: Block[];
  vocabulary?: Vocab[];
  grammar?: Grammar;
  audio?: string; // local asset path: assets/audio/*.mp3
};

export type Module = { title: string; description: string; lessons: Lesson[] };
export type Course = { code: string; title: string; description: string; levelCode: string; modules: Module[] };

export const courses = curriculum as Course[];

export function getAllLessons(): (Lesson & { id: string; moduleTitle: string })[] {
  const out: any[] = [];
  courses.forEach(course => {
    course.modules.forEach((mod, mi) => {
      mod.lessons.forEach((lesson, li) => {
        out.push({ ...lesson, id: `${course.code}-${mi}-${li}`, moduleTitle: mod.title });
      });
    });
  });
  return out;
}

export function getLessonById(id: string) {
  return getAllLessons().find(l => l.id === id) ?? null;
}

// Audio mapping for listening — bundled offline
export const bundledAudio: Record<string, any> = {
  'hello-1': require('../assets/audio/hello-1.mp3'),
  'hello-2': require('../assets/audio/hello-2.mp3'),
  'myname-1': require('../assets/audio/myname-1.mp3'),
  'numbers-1': require('../assets/audio/numbers-1.mp3'),
  'colors-1': require('../assets/audio/colors-1.mp3'),
  'days-1': require('../assets/audio/days-1.mp3'),
  'family-1': require('../assets/audio/family-1.mp3'),
  'questions-1': require('../assets/audio/questions-1.mp3'),
};
