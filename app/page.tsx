"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import ZipcodeClient from "./ZipcodeClient";
import HistorySidebar from "@/components/HistorySidebar";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingLoad, setPendingLoad] = useState<{
    postcode: string;
    sessionId: number;
  } | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);

  const handleSelectSession = (postcode: string, sessionId: number) => {
    setPendingLoad({ postcode, sessionId });
  };

  const handleNewSession = () => {
    setPendingLoad(null);
    setSessionKey((k) => k + 1);
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <HistorySidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((p) => !p)}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          refreshKey={historyRefreshKey}
        />
        <main className="flex-1 min-w-0">
          <ZipcodeClient
            key={sessionKey}
            pendingLoad={pendingLoad}
            onPendingLoadConsumed={() => setPendingLoad(null)}
            onSearchComplete={() => setHistoryRefreshKey((k) => k + 1)}
          />
        </main>
      </div>
    </AuthGuard>
  );
}
