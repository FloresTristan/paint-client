"use client";

import React, { useEffect, useState, useCallback } from "react";

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE


// ── Types ──────────────────────────────────────────────────────────────────────

interface ServiceSummary {
  service: string;
  calls: number;
  errors: number;
  avg_duration_ms: number;
  total_duration_ms: number;
  cost_usd: number;
  tokens: number;
}

interface UsageTotals {
  calls: number;
  errors: number;
  avg_duration_ms: number;
  total_duration_ms: number;
  cost_usd: number;
  tokens: number;
}

interface UsageSummaryResponse {
  from: string;
  to: string;
  per_service: ServiceSummary[];
  totals: UsageTotals;
}

interface UsageEvent {
  id: string;
  ts: string;
  request_id: string | null;
  service: string;
  operation: string;
  status: string;
  duration_ms: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_usd: number | null;
  extra: Record<string, unknown>;
}

interface UsageEventsResponse {
  rows: UsageEvent[];
  total: number;
  page: number;
  page_size: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtUSD(usd: number | null | undefined): string {
  if (!usd) return "$0.00";
  return `$${Number(usd).toFixed(4)}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Date -> "YYYY-MM-DDTHH:mm" in *local time*
function toLocalDatetimeValue(d: Date): string {
  return (
    `${d.getFullYear()}-` +
    `${pad2(d.getMonth() + 1)}-` +
    `${pad2(d.getDate())}T` +
    `${pad2(d.getHours())}:` +
    `${pad2(d.getMinutes())}`
  );
}

// "YYYY-MM-DDTHH:mm" (treated as local time) -> ISO string (UTC)
function toISO(localDatetime: string): string {
  return new Date(localDatetime).toISOString();
}

const SERVICE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  moondream: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  pano:      { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400"   },
  streetview:{ bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400"  },
};

function ServiceBadge({ service }: { service: string }) {
  const c = SERVICE_COLORS[service] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {service}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "ok";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
      {status}
    </span>
  );
}

const PAGE_SIZE = 25;

// ── Component ──────────────────────────────────────────────────────────────────

export default function UsageDashboard() {
  // Date range
  const now = new Date();
  const pastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [fromDate, setFromDate] = useState(toLocalDatetimeValue(pastMonth));
  const [toDate, setToDate]     = useState(toLocalDatetimeValue(now));
  const [serviceFilter, setServiceFilter] = useState("");
  const [reqIdFilter, setReqIdFilter]     = useState("");
  const [reqIdDraft, setReqIdDraft]       = useState("");

  // Summary
  const [summary, setSummary]   = useState<UsageSummaryResponse | null>(null);
  const [sumLoading, setSumLoading] = useState(true);
  const [sumError, setSumError] = useState<string | null>(null);

  // Events
  const [events, setEvents]     = useState<UsageEventsResponse | null>(null);
  const [evtLoading, setEvtLoading] = useState(true);
  const [evtError, setEvtError] = useState<string | null>(null);
  const [page, setPage]         = useState(1);

  const buildSummaryParams = useCallback(() => {
    const p = new URLSearchParams();
    p.set("from", toISO(fromDate));
    p.set("to",   toISO(toDate));
    if (serviceFilter) p.set("service", serviceFilter);
    if (reqIdFilter)   p.set("request_id", reqIdFilter);
    return p.toString();
  }, [fromDate, toDate, serviceFilter, reqIdFilter]);

  const buildEventsParams = useCallback((pg: number) => {
    const p = new URLSearchParams();
    p.set("from", toISO(fromDate));
    p.set("to",   toISO(toDate));
    if (serviceFilter) p.set("service", serviceFilter);
    if (reqIdFilter)   p.set("request_id", reqIdFilter);
    p.set("page",      String(pg));
    p.set("page_size", String(PAGE_SIZE));
    return p.toString();
  }, [fromDate, toDate, serviceFilter, reqIdFilter]);

  const fetchSummary = useCallback(async () => {
    setSumLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/usage/summary?${buildSummaryParams()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSummary(await res.json());
      setSumError(null);
    } catch (e) {
      setSumError("Failed to load summary");
      setSummary(null);
    } finally {
      setSumLoading(false);
    }
  }, [buildSummaryParams]);

  const fetchEvents = useCallback(async (pg: number) => {
    setEvtLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/usage/events?${buildEventsParams(pg)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEvents(await res.json());
      setEvtError(null);
    } catch (e) {
      setEvtError("Failed to load events");
      setEvents(null);
    } finally {
      setEvtLoading(false);
    }
  }, [buildEventsParams]);

  console.log("summary", summary);
  console.log("events", events);

  // Initial load
  useEffect(() => {
    fetchSummary();
    fetchEvents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApply = () => {
    setReqIdFilter(reqIdDraft);
    setPage(1);
    fetchSummary();
    fetchEvents(1);
  };

  const onPageChange = (pg: number) => {
    setPage(pg);
    fetchEvents(pg);
  };

  const t = summary?.totals;
  const totalPages = events ? Math.ceil(events.total / PAGE_SIZE) : 1;

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-800">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Usage</h1>
          <p className="text-gray-600">Monitor API usage and resource consumption</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">From</label>
            <input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm text-gray-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">To</label>
            <input
              type="datetime-local"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm text-gray-700"
            />
          </div>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm text-gray-700"
          >
            <option value="">All Services</option>
            <option value="moondream">Moondream</option>
            <option value="pano">Pano</option>
            <option value="streetview">Streetview</option>
          </select>
          <input
            type="text"
            placeholder="Filter by request_id"
            value={reqIdDraft}
            onChange={(e) => setReqIdDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onApply(); }}
            className="border rounded px-3 py-2 text-sm text-gray-700 w-52"
          />
          <button
            onClick={onApply}
            disabled={sumLoading || evtLoading}
            className={`px-4 py-2 rounded text-white text-sm font-medium ${
              sumLoading || evtLoading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {sumLoading || evtLoading ? "Loading..." : "Apply Filters"}
          </button>
        </div>

        {/* Error banners */}
        {sumError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            ⚠ {sumError}
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <MetricCard title="Total Calls"    value={t?.calls ?? "—"}                       color="blue"   />
          <MetricCard title="Total Spend"    value={fmtUSD(t?.cost_usd)}                   color="purple" />
          <MetricCard title="Avg Duration"   value={fmtMs(t?.avg_duration_ms)}             color="green"  />
          <MetricCard title="Total Duration" value={fmtMs(t?.total_duration_ms)}           color="blue"   />
          <MetricCard title="Errors"         value={t?.errors ?? "—"} color={t?.errors ? "red" : "green"} />
        </div>

        {/* Per-Service Breakdown */}
        {summary && summary.per_service.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Per Service</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summary.per_service.map((svc) => {
                const maxCalls = Math.max(...summary.per_service.map(s => s.calls), 1);
                const pct = Math.round((svc.calls / maxCalls) * 100);
                const c = SERVICE_COLORS[svc.service] ?? { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-400" };
                return (
                  <div key={svc.service} className={`rounded-lg border p-4 ${c.bg}`}>
                    <div className="flex items-center justify-between mb-3">
                      <ServiceBadge service={svc.service} />
                      <span className="text-xs text-gray-500">{svc.calls} calls</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <Row label="Errors"         value={String(svc.errors)} />
                      <Row label="Avg Duration"   value={fmtMs(svc.avg_duration_ms)} />
                      <Row label="Total Duration" value={fmtMs(svc.total_duration_ms)} />
                      <Row label="Cost"           value={fmtUSD(svc.cost_usd)} />
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.dot} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Events Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold">Events Log</h3>
          </div>

          {evtError ? (
            <div className="p-6 text-red-600 text-sm">⚠ {evtError}</div>
          ) : evtLoading && !events ? (
            <div className="p-6 text-gray-400 text-sm">Loading events…</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Request ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Timestamp</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Service</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Operation</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Extra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {events?.rows.map((evt) => {
                      const ts = new Date(evt.ts);
                      const extraStr = Object.entries(evt.extra ?? {})
                        .map(([k, v]) => {
                          const val = typeof v === "string" && v.length > 30 ? "…" + v.slice(-20) : String(v);
                          return `${k}: ${val}`;
                        })
                        .join(" · ");
                      return (
                        <tr key={evt.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2 font-mono text-xs text-gray-500">
                            {evt.request_id ? evt.request_id.slice(0, 12) + "…" : "—"}
                          </td>
                          <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                            {ts.toLocaleDateString()} {ts.toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-2"><ServiceBadge service={evt.service} /></td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">{evt.operation}</td>
                          <td className="px-4 py-2"><StatusBadge status={evt.status} /></td>
                          <td className={`px-4 py-2 font-mono text-xs ${(evt.duration_ms ?? 0) > 10000 ? "text-amber-600" : "text-gray-600"}`}>
                            {fmtMs(evt.duration_ms)}
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-400 max-w-xs truncate">{extraStr}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {events && (
                <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, events.total)} of {events.total} events
                  </span>
                  <div className="flex items-center gap-1">
                    <PageBtn onClick={() => onPageChange(page - 1)} disabled={page <= 1}>← Prev</PageBtn>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                      return (
                        <PageBtn key={pg} onClick={() => onPageChange(pg)} active={pg === page}>
                          {pg}
                        </PageBtn>
                      );
                    })}
                    <PageBtn onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next →</PageBtn>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

function MetricCard({
  title,
  value,
  color = "blue",
}: {
  title: string;
  value: number | string;
  color?: "blue" | "red" | "green" | "purple";
}) {
  const colorClasses = {
    blue:   "bg-blue-50   text-blue-900   border-blue-200",
    red:    "bg-red-50    text-red-900    border-red-200",
    green:  "bg-green-50  text-green-900  border-green-200",
    purple: "bg-purple-50 text-purple-900 border-purple-200",
  };
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-sm font-medium mb-1 opacity-75">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded text-xs border transition-colors ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : disabled
          ? "text-gray-300 border-gray-200 cursor-default"
          : "text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600"
      }`}
    >
      {children}
    </button>
  );
}