import { Suspense } from "react";
import MessagesPageClient from "./MessagesClient";
import {MessagesWorkspace} from '@/components/support/MessagesWorkspace';

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="messages-shell messages-page--empty" />}>
      <MessagesWorkspace><MessagesPageClient /></MessagesWorkspace>
    </Suspense>
  );
}
