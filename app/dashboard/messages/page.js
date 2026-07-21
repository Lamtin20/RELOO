import { Suspense } from "react";
import MessagesPageClient from "./MessagesClient";

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="messages-shell messages-page--empty" />}>
      <MessagesPageClient />
    </Suspense>
  );
}
