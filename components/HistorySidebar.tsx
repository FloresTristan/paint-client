"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Home, RefreshCw, SquarePen } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { HistorySession } from "@/types/types";

const PAGE_SIZE = 20;

function formatDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString(undefined, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="px-3 py-2 rounded-lg animate-pulse">
          <div className="h-3.5 bg-gray-700 rounded w-3/4 mb-1.5" />
          <div className="h-3 bg-gray-800 rounded w-1/2" />
        </div>
      ))}
    </>
  );
}

interface HistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectSession: (postcode: string, sessionId: number) => void;
  onNewSession?: () => void;
  refreshKey?: number;
}

export default function HistorySidebar({
  isOpen,
  onToggle,
  onSelectSession,
  onNewSession,
  refreshKey,
}: HistorySidebarProps) {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);

  const fetchHistory = useCallback(async (reset: boolean) => {
    const currentOffset = reset ? 0 : offset;
    setLoading(true);
    setError(null);
    try {
      const data = await authFetch(
        `/history?limit=${PAGE_SIZE}&offset=${currentOffset}`
      );
      const rows: HistorySession[] = data?.data ?? [];
      setSessions((prev) => (reset ? rows : [...prev, ...rows]));
      setOffset(currentOffset + rows.length);
      setHasMore(rows.length === PAGE_SIZE);
    } catch {
      setError("Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    fetchHistory(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (refreshKey) fetchHistory(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handleSelect = (session: HistorySession) => {
    setActiveId(session.id);
    console.log("Selected session:", session);
    onSelectSession(session.postcode, session.id);
    if (window.innerWidth < 768) onToggle();
  };

  const handleNewSession = () => {
    setActiveId(null);
    onNewSession?.();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-700 flex-shrink-0">
        {isOpen && (
          <span className="text-sm font-semibold text-gray-200 tracking-wide">
            History
          </span>
        )}
        {isOpen && (
          <button
            onClick={handleNewSession}
            className="ml-auto mr-1 p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="New session"
            title="New session"
          >
            <SquarePen className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 transition-colors"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 thin-scrollbar min-h-0">
          {loading && sessions.length === 0 ? (
            <SessionSkeleton />
          ) : error ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-red-400 mb-2">{error}</p>
              <button
                onClick={() => fetchHistory(true)}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 mx-auto"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <Home className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No past searches yet.</p>
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeId === s.id
                    ? "bg-blue-600/20 text-blue-400"
                    : "hover:bg-gray-700/60 text-gray-300"
                }`}
              >
                <div className="text-sm font-medium truncate">{s.postcode}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatDate(s.started_at)}
                </div>
                {s.current_offset > 0 && (
                  <div className="text-xs text-gray-500">
                    Offset: {s.current_offset}
                  </div>
                )}
              </button>
            ))
          )}

          {hasMore && !loading && (
            <button
              onClick={() => fetchHistory(false)}
              className="w-full text-xs text-blue-400 hover:underline py-2 text-center"
            >
              Load more
            </button>
          )}
          {loading && sessions.length > 0 && (
            <div className="text-center py-2">
              <RefreshCw className="w-3 h-3 animate-spin text-gray-500 mx-auto" />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: spacer to reserve layout width (keeps main content from shifting under the fixed sidebar) */}
      <div
        aria-hidden="true"
        className={`hidden md:block flex-shrink-0 transition-[width] duration-200 ${
          isOpen ? "w-64" : "w-12"
        }`}
      />

      {/* Desktop: fixed sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 h-screen border-r border-gray-700 bg-gray-900 transition-[width] duration-200 overflow-hidden z-30 ${
          isOpen ? "w-64" : "w-12"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile: overlay drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <aside className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col h-screen">
            {sidebarContent}
          </aside>
          <div className="flex-1 bg-black/60" onClick={onToggle} />
        </div>
      )}

      {/* Mobile: FAB toggle when closed */}
      {!isOpen && (
        <button
          className="md:hidden fixed top-4 left-4 z-30 bg-gray-800 border border-gray-700 rounded-full p-2 shadow"
          onClick={onToggle}
          aria-label="Open history"
        >
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </button>
      )}
    </>
  );
}