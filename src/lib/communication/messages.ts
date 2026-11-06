/**
 * Direct messages. Student-to-student is off unless an administrator enables it.
 * Group sends become separate direct conversations so students do not see each other's replies.
 * Phase 30: uses storage abstraction for attachments with checksum and secure pipeline.
 */
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { fullName } from "@/lib/utils";
import { assignedGroupIds, assertGroupAccess } from "@/lib/teaching/access";
import type { SessionUser } from "@/types";
import { sanitizeMessage } from "@/lib/communication/sanitize";
import { communicationSettings } from "@/lib/communication/settings";
import { notifyUsers } from "@/lib/teaching/notify";
import { formatInZone, zoneName } from "@/lib/communication/rules";
import { getStorageAdapter, getStorageProvider, getStorageRoot } from "@/lib/storage";
import { secureUpload } from "@/lib/storage/service";
import { validateObjectKey } from "@/lib/storage/keys";

export async function canMessage(sender: SessionUser, recipientId: string) {
  if (sender.id === recipientId) return false;
  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient || recipient.status !== "ACTIVE") return false;
  const settings = await communicationSettings();
  if (sender.role === "ADMIN") return true;
  if (sender.role === "TEACHER") {
    if (recipient.role !== "STUDENT" || !recipient.groupId) return false;
    const ids = await assignedGroupIds(sender);
    return ids === null || ids.includes(recipient.groupId);
  }
  if (sender.role === "STUDENT") {
    if (recipient.role === "STUDENT") return settings.studentToStudent && sender.groupId === recipient.groupId;
    if (recipient.role !== "TEACHER") return false;
    if (!sender.groupId) return false;
    const group = await prisma.learningGroup.findUnique({ where: { id: sender.groupId }, select: { teacherId: true } });
    if (group?.teacherId === recipient.id) return true;
    const link = await prisma.teacherGroupAssignment.findFirst({ where: { teacherId: recipient.id, groupId: sender.groupId } });
    return Boolean(link);
  }
  return false;
}

export async function sendMessage(sender: SessionUser, input: { recipientId: string; body: string }) {
  const body = sanitizeMessage(input.body);
  if (body.length < 1) throw new ApiError(400, "Enter a message.");
  if (!(await canMessage(sender, input.recipientId))) throw new ApiError(404, "That person is not available for messages.");
  const conversation = await findOrCreateDirect(sender.id, input.recipientId);
  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: sender.id, body },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  const { audit } = await import("@/lib/audit");
  await audit({ actorId: sender.id, action: "MESSAGE_SENT", entityType: "COMMUNICATION", entityId: message.id, metadata: { conversationId: conversation.id, recipientId: input.recipientId } });
  await notifyUsers([input.recipientId], {
    type: "MESSAGE",
    category: "MESSAGE",
    title: "New message",
    body: `${fullName(sender)} sent you a message.`,
    href: messageHref(await recipientRole(input.recipientId), conversation.id),
    source: "MESSAGE",
    relatedType: "CONVERSATION",
    relatedId: conversation.id,
    actionLabel: "Open message",
    groupKey: `message:${conversation.id}`,
  });
  return { conversationId: conversation.id, messageId: message.id };
}

async function recipientRole(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role ?? "STUDENT";
}

function messageHref(role: string, conversationId: string) {
  if (role === "ADMIN") return `/admin/notifications?conversation=${conversationId}`;
  if (role === "TEACHER") return `/teacher/messages?conversation=${conversationId}`;
  return `/student/messages?conversation=${conversationId}`;
}

async function findOrCreateDirect(a: string, b: string) {
  const existing = await prisma.conversation.findFirst({
    where: {
      kind: "DIRECT",
      AND: [
        { participants: { some: { userId: a } } },
        { participants: { some: { userId: b } } },
      ],
    },
    include: { participants: true },
  });
  if (existing && existing.participants.length === 2) return existing;
  return prisma.conversation.create({
    data: {
      kind: "DIRECT",
      createdById: a,
      participants: { create: [{ userId: a }, { userId: b }] },
    },
    include: { participants: true },
  });
}

export async function sendToGroup(sender: SessionUser, groupId: string, body: string) {
  await assertGroupAccess(sender, groupId);
  const students = await prisma.user.findMany({ where: { groupId, role: "STUDENT", status: "ACTIVE" }, select: { id: true, firstName: true, lastName: true } });
  const sent: string[] = [];
  const skipped: string[] = [];
  for (const student of students) {
    try {
      await sendMessage(sender, { recipientId: student.id, body });
      sent.push(fullName(student));
    } catch {
      skipped.push(fullName(student));
    }
  }
  const { audit } = await import("@/lib/audit");
  await audit({ actorId: sender.id, action: "GROUP_MESSAGE_SENT", entityType: "COMMUNICATION", entityId: groupId, metadata: { sent: sent.length, skipped: skipped.length } });
  return { sent, skipped };
}

export async function listConversations(viewer: SessionUser) {
  const settings = await communicationSettings();
  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId: viewer.id, archivedAt: null },
    include: {
      conversation: {
        include: {
          participants: { include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
    take: 30,
  });
  return memberships.map((membership) => {
    const other = membership.conversation.participants.find((person) => person.userId !== viewer.id);
    const latest = membership.conversation.messages[0];
    const unread = latest && latest.senderId !== viewer.id && (!membership.lastReadAt || latest.createdAt > membership.lastReadAt);
    return {
      id: membership.conversationId,
      with: other ? fullName(other.user) : "Conversation",
      role: other?.user.role ?? "",
      preview: latest?.deletedAt ? "This message was removed." : latest?.body ?? "No message yet.",
      unread: Boolean(unread),
      unreadLabel: unread ? "Unread" : "Read",
      updatedAt: formatInZone(membership.conversation.updatedAt, zoneName()),
      readReceipts: settings.readReceipts,
    };
  });
}

export async function conversationDetail(viewer: SessionUser, conversationId: string) {
  const membership = await prisma.conversationParticipant.findFirst({ where: { conversationId, userId: viewer.id } });
  if (!membership) throw new ApiError(404, "Conversation not found.");
  const settings = await communicationSettings();
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { sender: { select: { id: true, firstName: true, lastName: true } }, attachments: true, revisions: { orderBy: { createdAt: "asc" } } },
  });
  await prisma.conversationParticipant.update({ where: { id: membership.id }, data: { lastReadAt: new Date() } });
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });
  const other = participants.find((person) => person.userId !== viewer.id);
  return {
    id: conversationId,
    otherUserId: other?.userId ?? null,
    readReceipts: settings.readReceipts,
    participants: participants.map((person) => ({
      name: fullName(person.user),
      readAt: settings.readReceipts && person.userId !== viewer.id ? person.lastReadAt?.toISOString() ?? null : null,
      readLabel: settings.readReceipts && person.userId !== viewer.id ? (person.lastReadAt ? "Read" : "Sent") : "Sent",
    })),
    messages: messages.map((message) => ({
      id: message.id,
      mine: message.senderId === viewer.id,
      sender: fullName(message.sender),
      body: message.deletedAt ? "This message was removed." : message.body,
      removed: Boolean(message.deletedAt),
      edited: Boolean(message.editedAt),
      editedAt: message.editedAt ? formatInZone(message.editedAt) : null,
      createdAt: formatInZone(message.createdAt),
      history: message.revisions.map((revision) => ({ at: formatInZone(revision.createdAt), previous: message.senderId === viewer.id ? revision.previousBody : "An earlier version is stored." })),
      attachments: message.attachments.map((file) => ({ id: file.id, fileName: file.fileName, sizeBytes: file.sizeBytes })),
    })),
  };
}

export async function editMessage(viewer: SessionUser, messageId: string, body: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.senderId !== viewer.id || message.deletedAt) throw new ApiError(404, "Message not found.");
  const settings = await communicationSettings();
  if (Date.now() - message.createdAt.getTime() > settings.messageEditMinutes * 60 * 1000) {
    throw new ApiError(409, "The edit period for this message has ended.");
  }
  const next = sanitizeMessage(body);
  if (!next) throw new ApiError(400, "Enter a message.");
  await prisma.messageRevision.create({ data: { messageId, previousBody: message.body, editorId: viewer.id } });
  await prisma.message.update({ where: { id: messageId }, data: { body: next, editedAt: new Date() } });
  const { audit } = await import("@/lib/audit");
  await audit({ actorId: viewer.id, action: "MESSAGE_EDITED", entityType: "COMMUNICATION", entityId: messageId, metadata: { conversationId: message.conversationId } });
  return { id: messageId, edited: true };
}

export async function deleteMessage(viewer: SessionUser, messageId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId }, include: { conversation: { include: { participants: true } } } });
  if (!message) throw new ApiError(404, "Message not found.");
  const participant = message.conversation.participants.some((person) => person.userId === viewer.id);
  if (!participant || (message.senderId !== viewer.id && viewer.role !== "ADMIN")) throw new ApiError(404, "Message not found.");
  await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
  const { audit } = await import("@/lib/audit");
  await audit({ actorId: viewer.id, action: "MESSAGE_DELETED", entityType: "COMMUNICATION", entityId: messageId, metadata: { conversationId: message.conversationId } });
  return { id: messageId, deleted: true };
}

export async function searchMessages(viewer: SessionUser, query: { q?: string; from?: string; to?: string; date?: string; category?: string }) {
  if (query.category && query.category !== "MESSAGE") return [];
  if (query.q && query.q.trim().length < 2) throw new ApiError(400, "Enter at least 2 characters.");
  const memberships = await prisma.conversationParticipant.findMany({ where: { userId: viewer.id }, select: { conversationId: true } });
  const ids = memberships.map((item) => item.conversationId);
  const messages = await prisma.message.findMany({
    where: {
      conversationId: { in: ids },
      deletedAt: null,
      ...(query.q ? { body: { contains: query.q.trim() } } : {}),
      ...(query.from ? { sender: { OR: [{ firstName: { contains: query.from } }, { lastName: { contains: query.from } }] } } : {}),
      ...(query.to ? { conversation: { participants: { some: { userId: { not: viewer.id }, user: { OR: [{ firstName: { contains: query.to } }, { lastName: { contains: query.to } }] } } } } } : {}),
      ...(query.date ? { createdAt: { gte: new Date(query.date), lt: new Date(new Date(query.date).getTime() + 86400000) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { sender: { select: { firstName: true, lastName: true } } },
  });
  return messages.map((message) => ({
    id: message.id,
    conversationId: message.conversationId,
    sender: fullName(message.sender),
    body: message.body,
    createdAt: formatInZone(message.createdAt),
  }));
}

export async function saveAttachment(viewer: SessionUser, messageId: string, file: { name: string; type: string; bytes: Buffer }) {
  const message = await prisma.message.findUnique({ where: { id: messageId }, include: { conversation: { include: { participants: true } } } });
  if (!message || message.senderId !== viewer.id) throw new ApiError(404, "Message not found.");
  const settings = await communicationSettings();
  if (file.bytes.length > settings.maxAttachmentBytes) throw new ApiError(400, "That file is larger than the allowed size.");

  let uploaded;
  try {
    uploaded = await secureUpload({
      actorId: viewer.id,
      category: "message_attachment",
      file,
      resourceType: "messages",
      resourceId: message.conversationId,
      auditAction: "MESSAGE_ATTACHMENT_ADDED",
      auditEntityType: "COMMUNICATION",
      auditEntityId: messageId,
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, err instanceof Error ? err.message : "Upload failed");
  }

  const provider = getStorageProvider();
  let row;
  try {
    row = await prisma.messageAttachment.create({
      data: {
        messageId,
        fileName: uploaded.fileName,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType || file.type || "application/octet-stream",
        sizeBytes: uploaded.sizeBytes,
        storagePath: uploaded.key,
        checksum: uploaded.checksumSha256,
        storageProvider: provider,
        storageBucket: uploaded.bucket || null,
        accessLevel: uploaded.accessLevel,
        processingStatus: "READY",
        version: 1,
      },
    });
  } catch {
    const adapter = getStorageAdapter();
    await adapter.delete(uploaded.key).catch(() => {});
    console.error(`[storage] message_attachment metadata save failed, orphan cleaned key=${uploaded.key}`);
    throw new ApiError(500, "Failed to save attachment metadata");
  }

  return { id: row.id, fileName: uploaded.fileName };
}

export async function readAttachment(viewer: SessionUser, attachmentId: string) {
  const file = await prisma.messageAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      message: {
        include: {
          conversation: { include: { participants: { include: { user: { select: { organizationId: true } } } } } },
          sender: { select: { organizationId: true } },
        },
      },
    },
  });
  if (!file || !file.message.conversation.participants.some((person) => person.userId === viewer.id)) throw new ApiError(404, "File not found.");

  // Tenant isolation: viewer org must match sender org
  const viewerUser = await prisma.user.findUnique({ where: { id: viewer.id }, select: { organizationId: true } });
  const senderOrg = file.message.sender?.organizationId;
  // Fail closed when the sender's tenant is unknown in a multi-tenant deployment.
  const unknownTenant = !senderOrg && (await prisma.organization.count()) > 1;
  if (unknownTenant || (viewerUser?.organizationId && senderOrg && viewerUser.organizationId !== senderOrg)) {
    const { grantsFor } = await import("@/lib/identity/permissions");
    const grants = await grantsFor(viewer.id);
    const isSuperAdmin = grants.some(g => g.roleKey === "SUPER_ADMIN");
    if (!isSuperAdmin) {
      throw new ApiError(404, "File not found.");
    }
  }

  const adapter = getStorageAdapter();
  let bytes: Buffer;
  try {
    if (file.storagePath.includes("/") || file.checksum) {
      try {
        validateObjectKey(file.storagePath);
      } catch {
        throw new ApiError(404, "File not found.");
      }
      const result = await adapter.download(file.storagePath);
      bytes = result.bytes;
      if (file.checksum && result.metadata.checksumSha256 && result.metadata.checksumSha256 !== file.checksum) {
        console.error(`[storage] checksum mismatch attachment id=${file.id}`);
        throw new ApiError(500, "File integrity check failed");
      }
    } else {
      const legacyRoot = path.join(getStorageRoot(), "messages");
      const legacyPath = path.join(legacyRoot, path.basename(file.storagePath));
      if (!legacyPath.startsWith(legacyRoot)) throw new ApiError(404, "File not found.");
      bytes = await readFile(legacyPath);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(404, "File not found.");
  }

  const hash = createHash("sha256").update(bytes).digest("hex");
  return { bytes, fileName: file.fileName, mimeType: file.mimeType, hash };
}

export async function teacherContacts(viewer: SessionUser) {
  if (viewer.role === "STUDENT") {
    if (!viewer.groupId) return [];
    const group = await prisma.learningGroup.findUnique({ where: { id: viewer.groupId }, include: { teacher: true, teacherLinks: { include: { teacher: true } } } });
    const contacts = new Map<string, { id: string; name: string }>();
    for (const teacher of [group?.teacher, ...(group?.teacherLinks.map((link) => link.teacher) ?? [])]) {
      if (!teacher) continue;
      contacts.set(teacher.id, { id: teacher.id, name: fullName(teacher) });
    }
    return [...contacts.values()];
  }
  const ids = await assignedGroupIds(viewer);
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", status: "ACTIVE", ...(ids ? { groupId: { in: ids } } : {}) },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, groupId: true },
  });
  return students.map((student) => ({ id: student.id, name: fullName(student), groupId: student.groupId }));
}
