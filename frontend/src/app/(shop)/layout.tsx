import { Suspense } from "react";

import { ChatWidget } from "@/components/assistant/chat-widget";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      {/* The widget reads the current URL, so it renders after the page shell instead of holding up prerendering. */}
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense>
    </>
  );
}
