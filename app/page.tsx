"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import HouseCard from "./HouseCard";
import { HouseData, FilterType } from "./types";

const ITEMS_PER_PAGE = 12;
const MAX_DISPLAY_LIMIT = 999999999999;

export default function ZipcodeClient() {
  const [zipCode, setZipCode] = useState<string>("");
  const [limit, setLimit] = useState<number>(10);
  const [results, setResults] = useState<HouseData[]>([]);
  const [displayedResults, setDisplayedResults] = useState<HouseData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const pollingIntervalRef = useRef<number | null>(null);
  const resultsSeenIds = useRef<Set<number>>(new Set());

  const filteredResults = useMemo(() => {
    if (filter === "all") return results;
    
    if (filter === "with-defects") {
      return results.filter(house => house.defects && house.defects.length > 0);
    }
    
    if (filter === "without-defects") {
      return results.filter(house => !house.defects || house.defects.length === 0);
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
    const withDefects = results.filter(house => house.defects && house.defects.length > 0).length;
    const withoutDefects = results.filter(house => !house.defects || house.defects.length === 0).length;
    
    return {
      all: results.length,
      withDefects,
      withoutDefects
    };
  }, [results]);

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8080/job/${jobId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.statusText}`);
      }

      const statusData = await response.json();
      const status = statusData.status || statusData.state;
      setJobStatus(status || "unknown");

      if (status === "running" && statusData.partial) {
        if (statusData.partial.length > 0) {
          setResults(statusData.partial.slice(0, MAX_DISPLAY_LIMIT));
        }
      } else if (status === "completed" || status === "success" || status === "done") {
        let finalData = null;
        
        if (Array.isArray(statusData.result) && statusData.result.length === 2) {
          finalData = statusData.result[0];
        } else {
          finalData = statusData.data || statusData.result || statusData.results;
        }
        
        if (finalData && Array.isArray(finalData)) {
          setResults(finalData.slice(0, MAX_DISPLAY_LIMIT));
        }
        
        setLoading(false);
        setJobId(null);
        setJobStatus("");
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else if (status === "failed" || status === "error") {
        setError(statusData.error || statusData.message || "Job failed");
        setLoading(false);
        setJobId(null);
        setJobStatus("");
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error("Error polling job status:", err);
      setError("Failed to fetch job status");
      setLoading(false);
      setJobId(null);
      setJobStatus("");
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (jobId) {
      pollJobStatus(jobId);
      
      pollingIntervalRef.current = window.setInterval(() => {
        pollJobStatus(jobId);
      }, 2000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [jobId, pollJobStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!zipCode.trim()) {
      setError("Please enter a ZIP code.");
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
      const response = await fetch("http://127.0.0.1:8080/postcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ "postcode": zipCode, "limit": requestedLimit }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      if (responseData.cached && responseData.data) {
        const cachedData = responseData.data.slice(0, MAX_DISPLAY_LIMIT);
        setResults(cachedData);
        cachedData.forEach((house: HouseData) => resultsSeenIds.current.add(house.id));
      }
      
      if (responseData.job_id) {
        setJobId(responseData.job_id);
        setJobStatus("pending");
      } else if (!responseData.data) {
        throw new Error("Invalid response from server");
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to submit job. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 ">
      <h1 className="text-3xl font-semibold mb-6">
        Venture Studio Paint MVP
      </h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Enter ZIP code"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          disabled={loading}
        />
        <input
          type="number"
          placeholder="Limit"
          value={limit || 0}
          onChange={(e) => setLimit(Math.min(parseInt(e.target.value) || 0, MAX_DISPLAY_LIMIT))}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          disabled={loading}
          max={MAX_DISPLAY_LIMIT}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Processing..." : "Search"}
        </button>
      </form>

      {limit > MAX_DISPLAY_LIMIT && (
        <p className="text-amber-600 text-sm mb-4">
          ⚠️ Limit capped at {MAX_DISPLAY_LIMIT} for performance
        </p>
      )}

      {loading && jobId && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 w-full max-w-md">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Status: {jobStatus} {results.length > 0 && `(${results.length} loaded)`}
              </p>
              <p className="text-xs text-blue-700">Job ID: {jobId}</p>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === "all"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setFilter("with-defects")}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === "with-defects"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            With Defects ({counts.withDefects})
          </button>
          <button
            onClick={() => setFilter("without-defects")}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === "without-defects"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Without Defects ({counts.withoutDefects})
          </button>
        </div>
      )}

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {loading && results.length > 0 && (
        <div className="w-full mb-4 text-center">
          <div className="inline-block bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-sm text-blue-600 font-medium">
              Loading... ({results.length}/{limit} properties) - Page {currentPage}/{totalPages}
            </span>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {paginatedResults.map((house) => (
              <HouseCard key={house.id} house={house} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  Last
                </button>
              </div>
              <div className="text-xs text-gray-500">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredResults.length)} of {filteredResults.length} properties
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