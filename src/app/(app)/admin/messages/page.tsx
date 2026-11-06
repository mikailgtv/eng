import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { conversationDetail, listConversations, teacherContacts } from "@/lib/communication/messages";
import { MessageForm, ReplyForm } from "@/components/communication/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessagesPage({ searchParams: rawSearchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const searchParams = (await rawSearchParams) ?? {};
  const user = await requirePageUser(["ADMIN"]);
  const conversations = await listConversations(user);
  const contacts = await teacherContacts(user);
  const detail = searchParams.conversation ? await conversationDetail(user, searchParams.conversation).catch(() => null) : null;
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-xl font-semibold">Messages</h1>
      <p className="mt-1 text-sm text-muted">Administrators can message active users. This page does not show another student's private conversation unless you are a participant.</p>
      <p className="mt-2 text-sm"><Link className="underline" href="/admin/notifications">Communication hub</Link></p>
      <section className="mt-4"><MessageForm contacts={contacts} /></section>
      <ul className="mt-4 space-y-2 text-sm">
        {conversations.map((item) => <li key={item.id}><Link className="underline" href={`/admin/messages?conversation=${item.id}`}>{item.with} · {item.unreadLabel}</Link></li>)}
        {conversations.length === 0 && <li className="text-muted">No messages yet.</li>}
      </ul>
      {detail?.otherUserId && (
        <section className="mt-4 text-sm">
          {detail.messages.map((message) => <p key={message.id}>{message.sender}: {message.body}</p>)}
          <ReplyForm recipientId={detail.otherUserId} />
        </section>
      )}
    </div>
  );
}
