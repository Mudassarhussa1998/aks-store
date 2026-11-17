"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";

import { useCart, type CartItem } from "../cart/cart-store";
import { ArrowUpIcon, ChatIcon, CloseIcon, TrashIcon } from "../ui/icons";

type Message = { role: "user" | "assistant"; content: string; error?: boolean; signIn?: boolean };
type Action = { type: "add_to_cart"; item: CartItem } | { type: "clear_cart" } | { type: "sign_in_required"; reason: string };

// Set when a guest leaves to sign in from the chat, so the chat reopens and answers their saved question.
const RESUME_KEY = "velenzay_chat_resume";
// Pages that are part of signing in: the chat waits until the shopper is past them.
const AUTH_PAGES = ["/login", "/register", "/verify", "/complete-profile", "/forgot-password", "/auth"];

function storage(action: "get" | "set" | "remove") {
  try {
    if (action === "get") return sessionStorage.getItem(RESUME_KEY) === "1";
    if (action === "set") sessionStorage.setItem(RESUME_KEY, "1");
    else sessionStorage.removeItem(RESUME_KEY);
  } catch {
    // storage blocked: the question is still saved; they can reopen the chat themselves
  }
  return false;
}

const SUGGESTIONS = ["Where is my order?", "Compare your blankets", "Bedsheets under Rs 5,000", "What is your return policy?"];

/** Safe, tiny markdown: **bold**, [links](/p/...), "- " bullets and line breaks, rendered as React nodes. */
function Inline({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i} className="font-semibold"><Inline text={bold[1]} onNavigate={onNavigate} /></strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link && link[2].startsWith("/") && !link[2].startsWith("//")) {
      return (
        <Link key={i} href={link[2]} onClick={onNavigate} className="font-medium text-forest underline underline-offset-2">
          {link[1]}
        </Link>
      );
    }
    return <Fragment key={i}>{link ? link[1] : part}</Fragment>;
  });
}

function Markdown({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={blocks.length} className="my-1 flex list-disc flex-col gap-1 pl-5">
        {bullets.map((b, i) => <li key={i}><Inline text={b} onNavigate={onNavigate} /></li>)}
      </ul>,
    );
    bullets = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    blocks.push(
      <p key={blocks.length} className={heading ? "font-semibold" : undefined}>
        <Inline text={heading ? heading[1] : line} onNavigate={onNavigate} />
      </p>,
    );
  }
  flush();
  return <div className="flex flex-col gap-2">{blocks}</div>;
}

export function ChatWidget() {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  // Back from signing in to answer a saved question: reload the chat and open it. Signing in navigates without
  // remounting this widget, so this runs on every page change rather than only on first load.
  const pathname = usePathname();
  useEffect(() => {
    if (AUTH_PAGES.some((p) => pathname.startsWith(p)) || !storage("get")) return;
    storage("remove");
    const t = setTimeout(() => {
      setLoaded(false);
      setOpen(true);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);

  const resume = useEffectEvent((prompt: string) => send(prompt));

  // Load the saved conversation the first time the panel opens.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    fetch("/api/assistant")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { signedIn: boolean; messages: Message[]; resumePrompt: string | null } | null) => {
        if (cancelled || !data) return;
        setSignedIn(data.signedIn);
        setMessages(data.messages.map(({ role, content }) => ({ role, content })));
        if (data.resumePrompt) resume(data.resumePrompt); // the question they asked before signing in
      })
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    if (window.matchMedia("(min-width: 640px)").matches) field.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function applyActions(actions: Action[]) {
    for (const a of actions) {
      if (a.type === "add_to_cart") cart.add(a.item);
      if (a.type === "clear_cart") cart.clear();
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, cart: cart.items.map(({ variantId, quantity }) => ({ variantId, quantity })) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; actions?: Action[]; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error || "Something went wrong. Please try again.");
      applyActions(data.actions ?? []);
      const signIn = (data.actions ?? []).some((a) => a.type === "sign_in_required");
      setMessages((m) => [...m, { role: "assistant", content: data.reply!, signIn }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  async function startOver() {
    if (busy) return;
    await fetch("/api/assistant", { method: "DELETE" });
    setMessages([]);
  }

  const closeOnPhone = () => {
    if (!window.matchMedia("(min-width: 640px)").matches) setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!open) setLoaded(false); // reload: they may have signed in or out since it was last open
          setOpen(!open);
        }}
        aria-label={open ? "Close shopping assistant" : "Open shopping assistant"}
        aria-expanded={open}
        className={`fixed right-4 bottom-4 z-50 flex h-14 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-white shadow-[0_12px_32px_-8px_rgba(30,58,52,0.6)] transition hover:-translate-y-0.5 sm:right-6 sm:bottom-6 ${open ? "max-sm:hidden" : ""}`}
      >
        {open ? <CloseIcon size={20} /> : <ChatIcon size={20} />}
        <span className="max-sm:hidden">{open ? "Close" : "Ask Velenzay"}</span>
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Velenzay shopping assistant"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white animate-rise sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[min(640px,calc(100vh-128px))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-line sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]"
        >
          <header className="flex items-center gap-3 bg-forest px-4 py-3.5 text-white">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 font-semibold">V</span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold">Velenzay Assistant</h2>
              <p className="truncate text-xs text-white/70">Products, orders and delivery help</p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={startOver} aria-label="Start a new chat" title="New chat" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/15">
                <TrashIcon size={18} />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/15">
              <CloseIcon size={20} />
            </button>
          </header>

          <div ref={list} className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-sand/50 px-4 py-5" aria-live="polite">
            {loaded && messages.length === 0 && (
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl rounded-bl-md bg-white p-4 text-[14.5px] leading-relaxed shadow-sm">
                  <p className="font-semibold">Assalam-o-Alaikum! 👋</p>
                  <p className="mt-1 text-body">
                    I can help you find and compare products, add them to your cart, and check or cancel your orders.
                  </p>
                  {!signedIn && (
                    <p className="mt-2 text-[13px] text-muted">
                      <Link href="/login" onClick={closeOnPhone} className="font-medium text-forest underline underline-offset-2">Sign in</Link>{" "}
                      to see your orders and wishlist. Guests can check an order with its number and phone.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-line-strong bg-white px-3.5 py-2 text-[13px] font-medium hover:border-forest hover:text-forest">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!loaded && messages.length === 0 && <p className="py-8 text-center text-sm text-muted">Loading…</p>}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <p key={i} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-forest px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap text-white">
                  {m.content}
                </p>
              ) : (
                <div
                  key={i}
                  className={`max-w-[90%] self-start rounded-2xl rounded-bl-md px-4 py-3 text-[14.5px] leading-relaxed shadow-sm ${m.error ? "bg-sale-soft text-sale" : "bg-white text-ink"}`}
                >
                  <Markdown text={m.content} onNavigate={closeOnPhone} />
                  {m.signIn && !signedIn && (
                    <Link
                      href={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
                      onClick={() => {
                        storage("set");
                        setOpen(false); // don't cover the sign-in form (the panel is full-screen on phones)
                      }}
                      className="mt-3 flex items-center justify-center rounded-xl bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:text-white"
                    >
                      Sign in to continue
                    </Link>
                  )}
                </div>
              ),
            )}
            {busy && (
              <div className="flex gap-1.5 self-start rounded-2xl rounded-bl-md bg-white px-4 py-4 shadow-sm" aria-label="Assistant is typing">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-forest/60" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-line bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-white py-1.5 pr-1.5 pl-4 focus-within:border-forest">
              <textarea
                ref={field}
                rows={1}
                value={input}
                maxLength={2000}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about products or your order…"
                aria-label="Message"
                className="max-h-[120px] flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-muted sm:text-[14.5px]"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest text-white transition disabled:opacity-30"
              >
                <ArrowUpIcon size={18} />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted">AI assistant · it can make mistakes, so check details before you order.</p>
          </form>
        </section>
      )}
    </>
  );
}
