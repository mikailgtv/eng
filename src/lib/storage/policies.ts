/**
 * Phase 30 — File type policies by resource category
 * Each policy defines allowed extensions, MIME types, max size, access level, and signature checks.
 */

export type ResourceCategory =
  | "profile_avatar"
  | "textbook_document"
  | "course_document"
  | "lesson_image"
  | "lesson_attachment"
  | "lesson_audio"
  | "assignment_submission"
  | "teacher_feedback"
  | "certificate"
  | "audio_recording"
  | "speaking_practice"
  | "listening_audio"
  | "message_attachment"
  | "content_media"
  | "admin_import"
  | "book_cover";

export interface FilePolicy {
  category: ResourceCategory;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  maxBytes: number;
  accessLevel: "PUBLIC" | "PRIVATE" | "RESTRICTED";
  requireMagicCheck: boolean;
  description: string;
}

const MB = 1024 * 1024;

export const FILE_POLICIES: Record<ResourceCategory, FilePolicy> = {
  profile_avatar: {
    category: "profile_avatar",
    allowedExtensions: ["png", "jpg", "jpeg", "webp"],
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    maxBytes: 2 * MB,
    accessLevel: "PUBLIC",
    requireMagicCheck: true,
    description: "User profile avatars, public if explicitly intended",
  },
  textbook_document: {
    category: "textbook_document",
    allowedExtensions: ["pdf", "docx", "epub"],
    allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/epub+zip"],
    maxBytes: 50 * MB,
    accessLevel: "RESTRICTED",
    requireMagicCheck: true,
    description: "Licensed textbook files, access per course policy",
  },
  course_document: {
    category: "course_document",
    allowedExtensions: ["pdf", "docx", "pptx", "xlsx"],
    allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    maxBytes: 20 * MB,
    accessLevel: "RESTRICTED",
    requireMagicCheck: true,
    description: "Course materials",
  },
  lesson_image: {
    category: "lesson_image",
    allowedExtensions: ["png", "jpg", "jpeg", "webp", "gif"],
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    maxBytes: 5 * MB,
    accessLevel: "RESTRICTED",
    requireMagicCheck: true,
    description: "Lesson illustrations, private by default unless explicitly public",
  },
  lesson_attachment: {
    category: "lesson_attachment",
    allowedExtensions: ["pdf", "docx", "png", "jpg", "jpeg", "mp3", "mp4"],
    allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "audio/mpeg", "video/mp4"],
    maxBytes: 15 * MB,
    accessLevel: "RESTRICTED",
    requireMagicCheck: true,
    description: "Lesson attachments",
  },
  lesson_audio: {
    category: "lesson_audio",
    allowedExtensions: ["mp3", "wav", "m4a", "ogg"],
    allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/x-m4a"],
    maxBytes: 20 * MB,
    accessLevel: "RESTRICTED",
    requireMagicCheck: true,
    description: "Listening lesson audio",
  },
  assignment_submission: {
    category: "assignment_submission",
    allowedExtensions: ["pdf", "docx", "png", "jpg", "jpeg", "mp3", "wav", "m4a"],
    allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "audio/mpeg", "audio/wav", "audio/mp4"],
    maxBytes: 10 * MB,
    accessLevel: "PRIVATE",
    requireMagicCheck: true,
    description: "Student assignment submissions, private",
  },
  teacher_feedback: {
    category: "teacher_feedback",
    allowedExtensions: ["pdf", "docx", "png", "jpg", "mp3"],
    allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "audio/mpeg"],
    maxBytes: 10 * MB,
    accessLevel: "RESTRICTED",
    requireMagicCheck: true,
    description: "Teacher feedback attachments, restricted to student + teachers",
  },
  certificate: {
    category: "certificate",
    allowedExtensions: ["pdf"],
    allowedMimeTypes: ["application/pdf"],
    maxBytes: 5 * MB,
    accessLevel: "PRIVATE",
    requireMagicCheck: true,
    description: "Certificates, access through authorized viewing/verification",
  },
  audio_recording: {
    category: "audio_recording",
    allowedExtensions: ["mp3", "wav", "m4a", "ogg", "webm"],
    allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm"],
    maxBytes: 10 * MB,
    accessLevel: "PRIVATE",
    requireMagicCheck: true,
    description: "Voice recordings, private by default",
  },
  speaking_practice: {
    category: "speaking_practice",
    allowedExtensions: ["mp3", "wav", "m4a", "ogg", "webm"],
    allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/webm"],
    maxBytes: 8 * MB,
    accessLevel: "PRIVATE",
    requireMagicCheck: true,
    description: "Speaking practice recordings",
  },
  listening_audio: {
    category: "listening_audio",
    allowedExtensions: ["mp3", "wav", "m4a", "ogg"],
    allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg"],
    maxBytes: 20 * MB,
    accessLevel: "RESTRICTED",
    requireMagicCheck: true,
    description: "Listening exercises audio",
  },
  message_attachment: {
    category: "message_attachment",
    allowedExtensions: ["pdf", "docx", "xlsx", "png", "jpg", "jpeg", "webp", "gif", "mp3", "wav", "m4a", "ogg"],
    allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/png", "image/jpeg", "image/webp", "image/gif", "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg"],
    maxBytes: 5 * MB,
    accessLevel: "PRIVATE",
    requireMagicCheck: true,
    description: "Message attachments, private to conversation participants",
  },
  content_media: {
    category: "content_media",
    allowedExtensions: ["png", "jpg", "jpeg", "webp", "gif", "mp3", "wav", "m4a", "ogg", "mp4", "webm", "pdf", "docx"],
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "video/mp4", "video/webm", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    maxBytes: 8 * MB,
    accessLevel: "RESTRICTED",
    requireMagicCheck: true,
    description: "Course/lesson media library",
  },
  admin_import: {
    category: "admin_import",
    allowedExtensions: ["csv", "xlsx", "json"],
    allowedMimeTypes: ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/json"],
    maxBytes: 10 * MB,
    accessLevel: "RESTRICTED",
    requireMagicCheck: false,
    description: "Administrative imports, restricted to admins",
  },
  book_cover: {
    category: "book_cover",
    allowedExtensions: ["png", "jpg", "jpeg", "webp"],
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    maxBytes: 3 * MB,
    accessLevel: "PUBLIC",
    requireMagicCheck: true,
    description: "Book cover images",
  },
};

export function getPolicy(category: ResourceCategory): FilePolicy {
  const p = FILE_POLICIES[category];
  if (!p) throw new Error(`Unknown file category: ${category}`);
  return p;
}

export const BLOCKED_EXTENSIONS = new Set([
  "exe", "js", "sh", "html", "htm", "svg", "bat", "cmd", "msi", "dll", "app", "com", "scr", "vbs", "ps1", "jar", "apk", "iso",
]);

export function isBlockedExtension(ext: string): boolean {
  return BLOCKED_EXTENSIONS.has(ext.toLowerCase());
}
