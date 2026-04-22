"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import HouseCard from "../components/house/HouseCard";
import { HouseData, FilterType } from "../types/types";
import SkeletonCard from "../components/house/SkeletonCard";
import { LoaderCircle, CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import AddUserModal from "@/components/auth/AddUserModal";

const ITEMS_PER_PAGE = 12;
const MAX_DISPLAY_LIMIT = 999999999999;

type SnackbarType = "info" | "success" | "error";

type SnackbarState = {
  open: boolean;
  message: string;
  type: SnackbarType;
};

function Snackbar({
  open,
  message,
  type,
  onClose,
}: {
  open: boolean;
  message: string;
  type: SnackbarType;
  onClose: () => void;
}) {
  if (!open) return null;

  const styles = {
    info: "bg-slate-900 text-white border-slate-700",
    success: "bg-green-600 text-white border-green-500",
    error: "bg-red-600 text-white border-red-500",
  };

  const Icon =
    type === "success" ? CheckCircle2 : type === "error" ? AlertCircle : Info;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={`min-w-[280px] max-w-[420px] rounded-xl border shadow-2xl px-4 py-3 flex items-start gap-3 ${styles[type]}`}
      >
        <Icon className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="flex-1 text-sm leading-5">{message}</div>
        <button
          onClick={onClose}
          className="opacity-80 hover:opacity-100 transition"
          aria-label="Close snackbar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function ZipcodeClient({
  pendingLoad,
  onPendingLoadConsumed,
  onSearchComplete,
}: {
  pendingLoad?: { postcode: string; sessionId: number } | null;
  onPendingLoadConsumed?: () => void;
  onSearchComplete?: () => void;
} = {}) {
  const [viewMode, setViewMode] = useState<"pipeline" | "stored">("pipeline");

  const [zipCode, setZipCode] = useState<string>("");
  const [limit, setLimit] = useState<number>(1);
  const [results, setResults] = useState<HouseData[]>([]);
  const [displayedResults, setDisplayedResults] = useState<HouseData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(null);
  const [initialResultsLength, setInitialResultsLength] = useState<number>(0);
  const pollingIntervalRef = useRef<number | null>(null);
  const resultsSeenIds = useRef<Set<number>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    type: "info",
  });
  const snackbarTimerRef = useRef<number | null>(null);

  const showSnackbar = useCallback(
    (message: string, type: SnackbarType = "info", duration = 2500) => {
      if (snackbarTimerRef.current) {
        window.clearTimeout(snackbarTimerRef.current);
      }

      setSnackbar({
        open: true,
        message,
        type,
      });

      snackbarTimerRef.current = window.setTimeout(() => {
        setSnackbar((prev) => ({ ...prev, open: false }));
      }, duration);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) {
        window.clearTimeout(snackbarTimerRef.current);
      }
    };
  }, []);

  const fetchStoredResults = async (postcode: string, page = 1) => {
    try {
      setLoading(true);
      setError(null);
      showSnackbar(`Loading stored results for ZIP ${postcode}...`, "info");

      const offset = (page - 1) * ITEMS_PER_PAGE;

      const response = await fetch(`${API_BASE_URL}/pipeline-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postcode,
          limit: 9999999,
          offset,
        }),
      });

      const resJson = await response.json();

      setResults(resJson.data || []);
      setCurrentPage(page);
      setLoading(false);

      showSnackbar(
        `Stored results loaded. Found ${(resJson.data || []).length} records.`,
        "success"
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load stored results.");
      setLoading(false);
      showSnackbar("Failed to load stored results.", "error", 3500);
    }
  };

  const filteredResults = useMemo(() => {
    if (filter === "all") return results;

    if (filter === "with-defects") {
      return results.filter((h) => {
        const assessment = h.defect_assessment || h.moondream_defects;
        if (!assessment) return false;
        return assessment.label === "needs-repaint";
      });
    }

    if (filter === "without-defects") {
      return results.filter((h) => {
        const assessment = h.defect_assessment || h.moondream_defects;
        return !assessment || assessment.label === "ok";
      });
    }

    if (filter === "with-house") {
      return results.filter((h) => h.imageUrl && h.imageUrl.trim() !== "");
    }

    if (filter === "no-house") {
      return results.filter((h) => !h.imageUrl || h.imageUrl.trim() === "");
    }

    return results;
  }, [results, filter]);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredResults.slice(startIndex, endIndex);
  }, [filteredResults, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
  }, [filteredResults]);

  const counts = useMemo(() => {
    const withDefects = results.filter((h) => {
      const assessment = h.defect_assessment || h.moondream_defects;
      return assessment && assessment.label === "needs-repaint";
    }).length;

    const withoutDefects = results.filter((h) => {
      const assessment = h.defect_assessment || h.moondream_defects;
      return !assessment || assessment.label === "ok";
    }).length;

    const withHouse = results.filter((h) => h.imageUrl && h.imageUrl.trim() !== "").length;
    const noHouse = results.filter((h) => !h.imageUrl || h.imageUrl.trim() === "").length;

    return {
      all: results.length,
      withDefects,
      withoutDefects,
      withHouse,
      noHouse,
    };
  }, [results]);

  useEffect(() => {
    if (!jobId) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    showSnackbar("Connecting to live stream...", "info");

    const source = new EventSource(`${API_BASE_URL}/job/${jobId}/stream`);
    eventSourceRef.current = source;

    source.addEventListener("update", (e) => {
      const statusData = JSON.parse(e.data);
      const status = statusData.status;

      setJobStatus(status || "unknown");

      if (status === "queued") {
        showSnackbar("Job queued. Waiting for processing to start...", "info");
      }

      if (status === "running") {
        if (statusData.partial?.length) {
          setResults(statusData.partial.slice(0, MAX_DISPLAY_LIMIT));
          showSnackbar(
            `Streaming results... ${statusData.partial.length} record(s) received so far.`,
            "info",
            2000
          );
        } else {
          showSnackbar("Pipeline is running...", "info", 2000);
        }
      }

      if (status === "completed") {
        if (statusData.data) {
          setResults(statusData.data.slice(0, MAX_DISPLAY_LIMIT));
        }

        setLoading(false);
        setJobId(null);
        setJobStatus("");
        showSnackbar("Pipeline completed successfully.", "success", 3500);
        onSearchComplete?.();
        source.close();
      }

      if (status === "failed") {
        setError(statusData.error || "Job failed");
        setLoading(false);
        setJobId(null);
        setJobStatus("");
        showSnackbar(statusData.error || "Job failed.", "error", 4000);
        source.close();
      }
    });

    source.onerror = () => {
      console.warn("SSE disconnected, browser will retry automatically");
      showSnackbar("Stream disconnected. Retrying connection...", "info", 3000);
    };

    return () => {
      source.close();
    };
  }, [jobId, showSnackbar]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    if (!pendingLoad) return;

    const { postcode, sessionId } = pendingLoad;
    setZipCode(postcode);
    setResults([]);
    setError(null);
    setPendingSessionId(sessionId);
    onPendingLoadConsumed?.();

    (async () => {
      try {
        const histRes = await fetch(`${API_BASE_URL}/history/${sessionId}`, {
          credentials: "include",
        });
        if (histRes.ok) {
          const histData = await histRes.json();
          const existing: HouseData[] = histData.results || [];
          const offset = histData.session?.current_offset ?? existing.length;
          setResults(existing);
          showSnackbar(
            `Session loaded — ${existing.length} result(s) so far. Adjust the limit and hit Search to continue from offset ${offset}.`,
            "info",
            5000
          );
        }
      } catch {
        showSnackbar("Session selected. Hit Search to continue.", "info");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLoad]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!zipCode.trim()) {
      setError("Please enter a ZIP code.");
      showSnackbar("Please enter a ZIP code.", "error");
      return;
    }

    if (viewMode === "stored") {
      fetchStoredResults(zipCode, 1);
      return;
    }

    const requestedLimit = Math.min(limit, MAX_DISPLAY_LIMIT);

    setLoading(true);
    setError(null);
    setJobId(null);
    setJobStatus("");
    setCurrentPage(1);
    resultsSeenIds.current.clear();

    const sessionToResume = pendingSessionId;
    if (!sessionToResume) setResults([]);

    try {
        const endpoint = sessionToResume
          ? `${API_BASE_URL}/history/${sessionToResume}/resume`
          : `${API_BASE_URL}/postcode`;

        const body = sessionToResume
          ? { limit: requestedLimit }
          : { postcode: zipCode, limit: requestedLimit };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        const raw = await response.text();

        let data: any = null;
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(`Expected JSON, got: ${raw.slice(0, 300)}`);
        }

        if (!response.ok) {
          throw new Error(data?.error || `Server error ${response.status}`);
        }

      if (data.cached && data.data) {
        const cachedData = data.data.slice(0, MAX_DISPLAY_LIMIT);
        setResults(cachedData);
        setInitialResultsLength(cachedData.length);
        cachedData.forEach((h: HouseData) => resultsSeenIds.current.add(h.id));

        showSnackbar(
          `Loaded ${cachedData.length} cached result(s). Continuing pipeline...`,
          "success",
          3000
        );
      }

      if (data.job_id) {
        setJobId(data.job_id);
        setJobStatus("pending");
        showSnackbar("Job submitted. Waiting for live updates...", "info", 3000);
      } else {
        setLoading(false);
        showSnackbar("Request finished.", "success");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to submit job.");
      setLoading(false);
      showSnackbar("Failed to submit job.", "error", 3500);
    }
  };

  const clearCache = async () => {
    try {
      showSnackbar("Clearing cache...", "info");

      await fetch(`${API_BASE_URL}/clear-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      setResults([]);
      setInitialResultsLength(0);
      showSnackbar("Cache cleared successfully.", "success");
    } catch (err) {
      console.error(err);
      setError("Failed to clear cache.");
      showSnackbar("Failed to clear cache.", "error", 3500);
    }
  };

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "with-defects", label: "Needs Repaint", count: counts.withDefects },
    { key: "without-defects", label: "Acceptable", count: counts.withoutDefects },
    { key: "with-house", label: "With House", count: counts.withHouse },
    { key: "no-house", label: "No House", count: counts.noHouse },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 ">
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />

      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-base font-semibold ">Venture Studio Paint MVP</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (window.location.href = "/analytics")}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-1.5 text-sm rounded-full disabled:bg-gray-300 hover:bg-green-700 transition-colors"
          >
            Analytics
          </button>
          <AddUserModal disabled={loading} />
          <LogoutButton
            disabled={loading}
            className="bg-red-600 text-white px-4 py-1.5 text-sm rounded-full hover:bg-red-700 transition-colors"
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-6 py-8">

        {/* View mode toggle */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => {
              setViewMode("pipeline");
              showSnackbar("Switched to Run Pipeline mode.", "info");
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "pipeline"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Run Pipeline
          </button>
          <button
            onClick={() => {
              setViewMode("stored");
              showSnackbar("Switched to View Stored Results mode.", "info");
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === "stored"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            View Stored Results
          </button>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter ZIP code"
            value={zipCode}
            onChange={(e) => { setZipCode(e.target.value); setPendingSessionId(null); }}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={loading}
          />
          <input
            type="number"
            placeholder="Limit"
            value={limit || 0}
            onChange={(e) =>
              setLimit(Math.min(parseInt(e.target.value) || 0, MAX_DISPLAY_LIMIT))
            }
            className="border border-gray-300 rounded-lg px-4 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={loading || viewMode === "stored"}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:bg-gray-400 hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {loading ? <LoaderCircle className="animate-spin w-4 h-4" /> : "Search"}
          </button>
        </form>

        {/* Job status pill */}
        {loading && jobStatus && (
          <div className="mb-4 flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700">
            <LoaderCircle className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span className="capitalize">Pipeline {jobStatus}…</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 w-full max-w-lg flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {limit > MAX_DISPLAY_LIMIT && (
          <p className="text-amber-600 text-sm mb-4">
            Warning: Limit capped at {MAX_DISPLAY_LIMIT} for performance
          </p>
        )}

        {/* Results area */}
        {results.length > 0 && (
          <>
            {/* Filter tabs */}
            <div className="flex gap-0 mb-2 border-b border-gray-200 w-full max-w-5xl overflow-x-auto">
              {filterTabs.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                    filter === key
                      ? "text-blue-600 border-b-2 border-blue-600 font-medium"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}{" "}
                  <span className={`text-xs ${filter === key ? "text-blue-500" : "text-gray-400"}`}>
                    ({count})
                  </span>
                </button>
              ))}
            </div>


            {/* Results summary */}
            <p className="text-xs text-gray-500 mb-4  w-full max-w-5xl">
              Showing {paginatedResults.length} of {filteredResults.length} results
              {filter !== "all" && ` — filtered from ${results.length} total`}
            </p>


            {/* Grid */}
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {paginatedResults.map((house) => (
                <HouseCard key={house.id} house={house} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => {
                    if (viewMode === "stored") fetchStoredResults(zipCode, 1);
                    setCurrentPage(1);
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => {
                    if (viewMode === "stored") fetchStoredResults(zipCode, currentPage - 1);
                    setCurrentPage((p) => Math.max(1, p - 1));
                  }}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => {
                    if (viewMode === "stored") fetchStoredResults(zipCode, currentPage + 1);
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                  }}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => {
                    if (viewMode === "stored") fetchStoredResults(zipCode, totalPages);
                    setCurrentPage(totalPages);
                  }}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Last
                </button>
              </div>
            )}
          </>
        )}

        {!loading && results.length > 0 && filteredResults.length === 0 && (
          <p className="text-gray-500 mt-8">No houses match the selected filter.</p>
        )}

      </div>
    </div>
  );
}
