"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import HouseCard from "./HouseCard";
import { HouseData, FilterType } from "./types";

const ITEMS_PER_PAGE = 12;
const MAX_DISPLAY_LIMIT = 999999999999;

export default function ZipcodeClient() {
  const [viewMode, setViewMode] = useState<"pipeline" | "stored">("pipeline"); // ⭐ ADDED

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

  // ⭐ ADDED — fetch stored pipeline results
  const fetchStoredResults = async (postcode: string, page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * ITEMS_PER_PAGE;

      const response = await fetch("http://127.0.0.1:8080/pipeline-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postcode,
          limit: 9999999,
          offset
        }),
      });

      const resJson = await response.json();
      console.log({resJson})
      setResults(resJson.data || []);
      setCurrentPage(page);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to load stored results.");
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (filter === "all") return results;
    if (filter === "with-defects") {
      return results.filter(h => h.yolo_results && h.yolo_results.length > 0);
    }
    if (filter === "without-defects") {
      return results.filter(h => !h.yolo_results || h.yolo_results.length === 0);
    }
    if (filter === "with-house") {
      return results.filter(h => h.imageUrl && h.imageUrl.trim() !== "");
    }
    if (filter === "no-house") {
      return results.filter(h => !h.imageUrl || h.imageUrl.trim() === "");
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
    const withDefects = results.filter(h => h.yolo_results && h.yolo_results.length > 0).length;
    const withoutDefects = results.filter(h => !h.yolo_results || h.yolo_results.length === 0).length;
    return {
      all: results.length,
      withDefects,
      withoutDefects
    };
  }, [results]);

  // your entire pollJobStatus is unchanged
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8080/job/${jobId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error(`Failed to fetch job status`);

      const statusData = await response.json();
      const status = statusData.status || statusData.state;
      setJobStatus(status || "unknown");

      if (status === "running" && statusData.partial?.length) {
        setResults(statusData.partial.slice(0, MAX_DISPLAY_LIMIT));
      } 
      else if (["completed", "success", "done"].includes(status)) {
        let finalData = Array.isArray(statusData.result)
          ? statusData.result[0]
          : statusData.data || statusData.result || statusData.results;

        if (finalData && Array.isArray(finalData)) {
          setResults(finalData.slice(0, MAX_DISPLAY_LIMIT));
        }

        setLoading(false);
        setJobId(null);
        setJobStatus("");

        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      } 
      else if (["failed", "error"].includes(status)) {
        setError(statusData.error || statusData.message || "Job failed");
        setLoading(false);
        setJobId(null);
        setJobStatus("");

        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch job status");
      setLoading(false);
      setJobId(null);
      setJobStatus("");
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    }
  }, []);

  useEffect(() => {
    if (jobId) {
      pollJobStatus(jobId);
      pollingIntervalRef.current = window.setInterval(() => pollJobStatus(jobId), 5000);
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [jobId, pollJobStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // ⭐ UPDATED handleSubmit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!zipCode.trim()) {
      setError("Please enter a ZIP code.");
      return;
    }

    if (viewMode === "stored") {
      fetchStoredResults(zipCode, 1);
      return;
    }

    // pipeline mode below
    const requestedLimit = Math.min(limit, MAX_DISPLAY_LIMIT);

    setLoading(true);
    setError(null);
    setResults([]);
    setJobId(null);
    setJobStatus("");
    setCurrentPage(1);
    resultsSeenIds.current.clear();

    try {
      const response = await fetch("http://127.0.0.1:8080/postcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode: zipCode, limit: requestedLimit }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(`Server error`);

      if (data.cached && data.data) {
        const cachedData = data.data.slice(0, MAX_DISPLAY_LIMIT);
        setResults(cachedData);
        setInitialResultsLength(cachedData.length);
        cachedData.forEach((h: HouseData) => resultsSeenIds.current.add(h.id));
      }

      if (data.job_id) {
        setJobId(data.job_id);
        setJobStatus("pending");
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to submit job.");
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      await fetch("http://127.0.0.1:8080/clear-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setResults([]);
      setInitialResultsLength(0);
    } catch (err) {
      console.error(err);
      setError("Failed to clear cache.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 ">

      <h1 className="text-3xl font-semibold mb-6">
        Venture Studio Paint MVP
      </h1>

      {/* ⭐ Your analytics & clear cache buttons restored */}
      <div className="absolute right-4 top-4 text-white flex gap-x-2 rounded-full text-xs cursor-pointer">
        <button
          onClick={() => (window.location.href = "/analytics")}
          disabled={loading}
          className="bg-green-600 text-white px-5 py-2 rounded-full disabled:bg-gray-400"
        >
          Analytics
        </button>

        <button
          onClick={() => clearCache()}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded-full disabled:bg-gray-400"
        >
          Clear Cache
        </button>
      </div>

      {/* ⭐ Mode Toggle */}
      <div className="flex gap-2 mb-6 mt-10">
        <button
          onClick={() => setViewMode("pipeline")}
          className={`px-4 py-2 rounded-lg ${
            viewMode === "pipeline" ? "bg-blue-600 text-white" : "bg-black/50 text-white"
          }`}
        >
          Run Pipeline
        </button>

        <button
          onClick={() => setViewMode("stored")}
          className={`px-4 py-2 rounded-lg ${
            viewMode === "stored" ? "bg-blue-600 text-white" : "bg-black/50 text-white"
          }`}
        >
          View Stored Results
        </button>
      </div>

      {/* Search Form */}
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
          onChange={(e) => setLimit(Math.min(parseInt(e.target.value) || 0, MAX_DISPLAY_LIMIT))}
          className="border border-gray-300 rounded-lg px-4 py-2"
          disabled={loading || viewMode === "stored"} // ⭐ Stored mode doesn't need limit input
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg disabled:bg-gray-400"
        >
          {loading ? "Processing..." : "Search"}
        </button>
      </form>

      {limit > MAX_DISPLAY_LIMIT && (
        <p className="text-amber-600 text-sm mb-4">
          ⚠️ Limit capped at {MAX_DISPLAY_LIMIT} for performance
        </p>
      )}

      {/* RESULTS DISPLAY — your full original UI section preserved */}
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
              With Defects ({counts.withDefects})
            </button>

            <button
              onClick={() => setFilter("without-defects")}
              className={`px-4 py-2 ${
                filter === "without-defects"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600"
              }`}
            >
              Without Defects ({counts.withoutDefects})
            </button>
          </div>

          {/* Cards */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {paginatedResults.map((house) => (
              <HouseCard key={house.id} house={house} />
            ))}
          </div>

          {/* ⭐ Updated Pagination to support both stored + pipeline */}
          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="flex items-center gap-2">

                {/* FIRST */}
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

                {/* PREV */}
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

                {/* NEXT */}
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

                {/* LAST */}
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
