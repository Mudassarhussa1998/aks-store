import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { api, ApiError } from "@/lib/api";
import { getToken } from "@/lib/session";

/*
 * The chat widget talks to the shopping assistant through this route, never to the API directly.
 * Identity is added here on the server: the shopper's sign-in token comes from its httpOnly cookie and the
 * conversation id from another httpOnly cookie, so page scripts can't read or forge either one.
 */

const CHAT_COOKIE = "velenzay_chat";
const CHAT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/assistant",
  maxAge: 60 * 60 * 24 * 7,
} as const;

type Reply = { conversation_id: string; reply: string; actions: { type: string }[] };
type Conversation = {
  conversation_id: string | null;
  signed_in: boolean;
  resume_prompt: string | null;
  messages: { role: "user" | "assistant"; content: string; created_at: string }[];
};

function failure(e: unknown) {
  if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
  return Response.json({ error: "The assistant is unavailable right now. Please try again." }, { status: 502 });
}

async function identity() {
  const jar = await cookies();
  return { token: await getToken(), conversationId: jar.get(CHAT_COOKIE)?.value ?? null, jar };
}

export async function GET() {
  const { token, conversationId, jar } = await identity();
  try {
    const convo = await api<Conversation>("/assistant/conversation", { token, query: { conversation_id: conversationId }, cache: "no-store" });
    if (!convo.conversation_id && !convo.resume_prompt) jar.delete({ name: CHAT_COOKIE, path: CHAT_COOKIE_OPTIONS.path });
    return Response.json({ signedIn: convo.signed_in, messages: convo.messages, resumePrompt: convo.resume_prompt });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { message?: unknown; cart?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!message) return Response.json({ error: "Type a message first." }, { status: 400 });
  // Only ids and quantities are passed on; the API looks up real prices and stock itself.
  const cart = (Array.isArray(body?.cart) ? body.cart : [])
    .slice(0, 50)
    .map((l: { variantId?: unknown; quantity?: unknown }) => ({ variant_id: Number(l?.variantId), quantity: Number(l?.quantity) }))
    .filter((l) => Number.isInteger(l.variant_id) && Number.isInteger(l.quantity) && l.quantity >= 1 && l.quantity <= 20);

  const { token, conversationId, jar } = await identity();
  try {
    const out = await api<Reply>("/assistant/chat", {
      method: "POST",
      token,
      body: { message, cart, conversation_id: conversationId },
      cache: "no-store",
    });
    jar.set(CHAT_COOKIE, out.conversation_id, CHAT_COOKIE_OPTIONS);
    // An order was placed or cancelled: refresh cached stock on product pages.
    if (out.actions.some((a) => a.type === "stock_changed")) revalidateTag("catalog", "max");
    return Response.json({ reply: out.reply, actions: out.actions.filter((a) => a.type !== "stock_changed") });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE() {
  const { token, conversationId, jar } = await identity();
  try {
    await api("/assistant/conversation", { method: "DELETE", token, query: { conversation_id: conversationId } });
  } catch (e) {
    return failure(e);
  }
  jar.delete({ name: CHAT_COOKIE, path: CHAT_COOKIE_OPTIONS.path });
  return new Response(null, { status: 204 });
}
