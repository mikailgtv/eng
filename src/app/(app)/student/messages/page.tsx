import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { conversationDetail, listConversations, teacherContacts } from "@/lib/communication/messages";
import { MessageForm, MessageSearch, ReplyForm } from "@/components/communication/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages" };

export default async function StudentMessagesPage({ searchParams: rawSearchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const searchParams = (await rawSearchParams) ?? {};
  const user = await requirePageUser(["STUDENT"]);
  const conversations = await listConversations(user);
  const contacts = await teacherContacts(user);
  const detail = searchParams.conversation ? await conversationDetail(user, searchParams.conversation).catch(() => null) : null;
  const recipientId = detail?.otherUserId ?? "";
  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-2xl font-semibold">Messages</h1>
      <p className="mt-1 text-sm text-muted">You can message your assigned teacher. Student-to-student private messages are off unless an administrator enables them.</p>
      <section className="mt-4 rounded-2xl border border-border p-4">
        <h2 className="font-semibold">Search your messages</h2>
        <MessageSearch />
      </section>
      <section className="mt-4 rounded-2xl border border-border p-4">
        <h2 className="font-semibold">New message</h2>
        <div className="mt-2"><MessageForm contacts={contacts} /></div>
      </section>
      <ul className="mt-4 space-y-2">
        {conversations.map((item) => (
          <li key={item.id}>
            <Link className="block rounded-xl border border-border px-3 py-3 text-sm" href={`/student/messages?conversation=${item.id}`}>
              <span className="font-medium">{item.with}</span>
              <span className="mt-1 block">{item.unreadLabel}. {item.preview}</span>
              <span className="text-xs text-muted">{item.updatedAt}</span>
            </Link>
          </li>
        ))}
        {conversations.length === 0 && <li className="text-sm text-muted">No messages yet.</li>}
      </ul>
      {detail && (
        <section className="mt-4 rounded-2xl border border-border p-4">
          <h2 className="font-semibold">Conversation</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {detail.messages.map((message) => (
              <li key={message.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium">{message.mine ? "You" : message.sender}</p>
                <p>{message.body}</p>
                <p className="text-xs text-muted">{message.createdAt}{message.edited ? ` · Edited ${message.editedAt}` : ""}{message.removed ? " · Removed" : ""}</p>
              </li>
            ))}
          </ul>
          {recipientId && <ReplyForm recipientId={recipientId} />}
        </section>
      )}
    </div>
  );
}
