import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { conversationDetail, listConversations, teacherContacts } from "@/lib/communication/messages";
import { assignedGroupIds } from "@/lib/teaching/access";
import { prisma } from "@/lib/prisma";
import { MessageForm, MessageSearch, ReplyForm } from "@/components/communication/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages" };

export default async function TeacherMessagesPage({ searchParams: rawSearchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const searchParams = (await rawSearchParams) ?? {};
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const conversations = await listConversations(user);
  const contacts = await teacherContacts(user);
  const ids = await assignedGroupIds(user);
  const groups = await prisma.learningGroup.findMany({ where: ids === null ? { status: "ACTIVE" } : { id: { in: ids } }, select: { id: true, name: true } });
  const detail = searchParams.conversation ? await conversationDetail(user, searchParams.conversation).catch(() => null) : null;
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Messages</h1>
      <p className="mt-1 text-sm text-muted">You can message students in your groups. A group send creates a separate conversation for each student. Read receipts are off unless an administrator enables them.</p>
      <section className="mt-4"><MessageSearch /></section>
      <section className="mt-4 rounded-2xl border border-border p-4">
        <MessageForm contacts={contacts} groups={groups} />
      </section>
      <ul className="mt-4 space-y-2 text-sm">
        {conversations.map((item) => (
          <li key={item.id}><Link className="block rounded-xl border border-border px-3 py-2" href={`/teacher/messages?conversation=${item.id}`}>{item.with} · {item.unreadLabel} · {item.preview}</Link></li>
        ))}
        {conversations.length === 0 && <li className="text-muted">No messages yet.</li>}
      </ul>
      {detail && searchParams.conversation && (
        <section className="mt-4 text-sm">
          <h2 className="font-semibold">Conversation</h2>
          <ul className="mt-2 space-y-2">
            {detail.messages.map((message) => <li key={message.id} className="rounded-lg border border-border px-3 py-2">{message.sender}: {message.body} <span className="text-xs text-muted">{message.createdAt}{message.edited ? " · Edited" : ""}</span></li>)}
          </ul>
          <p className="mt-2 text-xs text-muted">{detail.participants.map((person) => `${person.name}: ${person.readLabel}`).join(". ")}</p>
          {detail.otherUserId && <ReplyForm recipientId={detail.otherUserId} />}
        </section>
      )}
    </div>
  );
}
