"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import HouseCard from "./HouseCard";
import { HouseData, FilterType } from "./types";
import SkeletonCard from "./SkeletonCard";
import { LoaderCircle, CheckCircle2, AlertCircle, Info, X } from "lucide-react";

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

export default function ZipcodeClient() {
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
      console.log({ resJson });

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

      if (status === "pending") {
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
      showSnackbar("Stream disconnected. Retrying connection...", "error", 3000);
    };

    return () => {
      source.close();
    };
  }, [jobId, showSnackbar]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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
    setResults([]);
    setJobId(null);
    setJobStatus("");
    setCurrentPage(1);
    resultsSeenIds.current.clear();

    try {
        const response = await fetch(`${API_BASE_URL}/postcode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postcode: zipCode, limit: requestedLimit }),
        });

        const raw = await response.text();
        console.log("postcode status:", response.status);
        console.log("postcode content-type:", response.headers.get("content-type"));
        console.log("postcode raw:", raw);

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

  return (
    <div className="min-h-screen flex flex-col items-center p-6 ">
      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />

      <h1 className="text-3xl font-semibold mb-6">Venture Studio Paint MVP</h1>

      <div className="absolute right-4 top-4 text-white flex gap-x-2 rounded-full text-xs cursor-pointer">
        <button
          onClick={() => (window.location.href = "/analytics")}
          disabled={loading}
          className="bg-green-600 text-white px-5 py-2 rounded-full disabled:bg-gray-400 hover:cursor-pointer"
        >
          Analytics
        </button>

        {/* <button
          onClick={() => clearCache()}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded-full disabled:bg-gray-400 hover:cursor-pointer"
        >
          Clear Cache
        </button> */}
      </div>

      <div className="flex gap-2 mb-6 mt-10">
        <button
          onClick={() => {
            setViewMode("pipeline");
            showSnackbar("Switched to Run Pipeline mode.", "info");
          }}
          className={`px-4 py-2 rounded-lg ${
            viewMode === "pipeline" ? "bg-blue-600 text-white" : "bg-black/50 text-white"
          }`}
        >
          Run Pipeline
        </button>

        <button
          onClick={() => {
            setViewMode("stored");
            showSnackbar("Switched to View Stored Results mode.", "info");
          }}
          className={`px-4 py-2 rounded-lg ${
            viewMode === "stored" ? "bg-blue-600 text-white" : "bg-black/50 text-white"
          }`}
        >
          View Stored Results
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Enter ZIP code"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2"
          disabled={loading}
        />
        <input
          type="number"
          placeholder="Limit"
          value={limit || 0}
          onChange={(e) =>
            setLimit(Math.min(parseInt(e.target.value) || 0, MAX_DISPLAY_LIMIT))
          }
          className="border border-gray-300 rounded-lg px-4 py-2"
          disabled={loading || viewMode === "stored"}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:bg-gray-400"
        >
          {loading ? <LoaderCircle className="animate-spin w-4 h-4" /> : "Search"}
        </button>
      </form>

      {limit > MAX_DISPLAY_LIMIT && (
        <p className="text-amber-600 text-sm mb-4">
          ⚠️ Limit capped at {MAX_DISPLAY_LIMIT} for performance
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 ${
                filter === "all" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"
              }`}
            >
              All ({counts.all})
            </button>

            <button
              onClick={() => setFilter("with-defects")}
              className={`px-4 py-2 ${
                filter === "with-defects"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
            >
              Needs Repaint ({counts.withDefects})
            </button>

            <button
              onClick={() => setFilter("without-defects")}
              className={`px-4 py-2 ${
                filter === "without-defects"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
            >
              Acceptable ({counts.withoutDefects})
            </button>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {paginatedResults.map((house) => (
              <HouseCard key={house.id} house={house} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (viewMode === "stored") fetchStoredResults(zipCode, 1);
                    setCurrentPage(1);
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border cursor-pointer hover:scale-105 transition-all duration-200 rounded-lg"
                >
                  First
                </button>

                <button
                  onClick={() => {
                    if (viewMode === "stored") fetchStoredResults(zipCode, currentPage - 1);
                    setCurrentPage((p) => Math.max(1, p - 1));
                  }}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-blue-600 text-white cursor-pointer hover:scale-105 transition-all duration-200 rounded-lg"
                >
                  Previous
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => {
                    if (viewMode === "stored") fetchStoredResults(zipCode, currentPage + 1);
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                  }}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-blue-600 text-white cursor-pointer hover:scale-105 transition-all duration-200 rounded-lg"
                >
                  Next
                </button>

                <button
                  onClick={() => {
                    if (viewMode === "stored") fetchStoredResults(zipCode, totalPages);
                    setCurrentPage(totalPages);
                  }}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border cursor-pointer hover:scale-105 transition-all duration-200 rounded-lg"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && results.length > 0 && filteredResults.length === 0 && (
        <p className="text-gray-500 mt-8">No houses match the selected filter.</p>
      )}
    </div>
  );
}