"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle, CheckCircle, Home, TrendingUp, User, Moon } from "lucide-react";
import type {
  AnalyticsData,
  ConditionChartData,
  DefectChartData,
  ComparisonData,
} from "./types";

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // User tagged data state
  const [userTaggedData, setUserTaggedData] = useState<any[]>([]);
  const [userTaggedLoading, setUserTaggedLoading] = useState(false);

  // ⭐ Filter state
  const [filters, setFilters] = useState({
    postcode: "",
    model: "all",
  });

  // ⭐ User tagged filters (postcode comes from main filters)
  const [userFilters, setUserFilters] = useState({
    address: "",
    is_house: "all",
    has_defects: "all",
    limit: 999999999,
  });

  // ============================================================
  // ⭐ Fetch analytics function (POST + normalization)
  // ============================================================
  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const response = await fetch("http://127.0.0.1:8080/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });

      const data = await response.json();
      const summary = data.summary || {};

      // ⭐ Normalize to avoid undefined errors
      setAnalytics({
        ...summary,
        conditions: summary.conditions || [],
        defects: summary.defects || [],
        human_vs_model_defects: summary.human_vs_model_defects || [],
        yolo_vs_moondream: summary.yolo_vs_moondream || [],
        yolo_false_positive_summary: summary.yolo_false_positive_summary || {},
        moondream_false_positive_summary: summary.moondream_false_positive_summary || {},
        moondream_human_agreement: summary.moondream_human_agreement || {},
        house_detection_summary: summary.house_detection_summary || {},
        model_correlation: summary.model_correlation || {},
      });
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  console.log({analytics})

  // ============================================================
  // ⭐ Fetch user tagged data (uses postcode from main filters)
  // ============================================================
  const fetchUserTagged = async () => {
    try {
      setUserTaggedLoading(true);

      const payload: any = {
        limit: userFilters.limit,
      };

      // Use postcode from main analytics filters
      if (filters.postcode) payload.postcode = filters.postcode;
      if (userFilters.address) payload.address = userFilters.address;
      if (userFilters.is_house !== "all") {
        payload.is_house = userFilters.is_house === "true";
      }
      if (userFilters.has_defects !== "all") {
        payload.has_defects = userFilters.has_defects === "true";
      }

      const response = await fetch("http://127.0.0.1:8080/get-user-tagged", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setUserTaggedData(result.data || []);
    } catch (err) {
      console.error("Error fetching user-tagged data:", err);
      setUserTaggedData([]);
    } finally {
      setUserTaggedLoading(false);
    }
  };

  // ============================================================
  // ⭐ Fetch both analytics and user tagged data together
  // ============================================================
  const fetchAllData = async () => {
    await Promise.all([fetchAnalytics(), fetchUserTagged()]);
  };

  // ⭐ Fetch once on startup only
  useEffect(() => {
    fetchAllData();
  }, []);

  // ============================================================
  // Render States
  // ============================================================
  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading analytics…</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Failed to load analytics</div>
      </div>
    );
  }

  // ============================================================
  // Safe calculations
  // ============================================================
  const totalAddresses =
    analytics.conditions?.reduce((sum, c) => sum + c.total, 0) || 0;

  const totalDefects =
    analytics.defects?.reduce((sum, d) => sum + d.occurrences, 0) || 0;

  const COLORS: Record<string, string> = {
    ok: "#10b981",
    "needs-repaint": "#f59e0b",
    error: "#ef4444",
    null: "#6b7280",
  };

  // ============================================================
  // Condition Chart
  // ============================================================
  const conditionChartData: ConditionChartData[] =
    analytics.conditions?.map((c) => {
      let name = "";
      let key = c.moondream_label; // may be null

      if (key === "ok") {
        name = "OK";
      } else if (key === "needs-repaint") {
        name = "Needs Repaint";
      } else if (key === "error") {
        name = "Error";
      } else if (key === null) {
        name = "Null"; // 👈 explicit NULL handling
        key = "null";      // 👈 so COLORS[key] works
      }

      return {
        name,
        key, // useful if your chart uses `fill={COLORS[item.key]}`
        value: c.total,
        percentage: ((c.total / totalAddresses) * 100).toFixed(1),
      };
    }) || [];

  // ============================================================
  // Defect charts
  // ============================================================
  const defectChartData: DefectChartData[] =
    analytics.defects?.map((d) => ({
      name: d.defect_type,
      occurrences: d.occurrences,
      confidence: (d.avg_confidence * 100).toFixed(1),
    })) || [];

  // ============================================================
  // YOLO vs Moondream Comparison
  // ============================================================
  const yoloMoondreamData: Record<string, ComparisonData> = {};

  (analytics.yolo_vs_moondream || []).forEach((item) => {
    if (!yoloMoondreamData[item.yolo_defect]) {
      yoloMoondreamData[item.yolo_defect] = {
        name: item.yolo_defect,
        ok: 0,
        "needs-repaint": 0,
        error: 0,
      };
    }
    yoloMoondreamData[item.yolo_defect][item.moondream_label] = item.total;
  });

  const comparisonChartData: ComparisonData[] = Object.values(
    yoloMoondreamData || {}
  );

  // ============================================================
  // User Tagged Stats
  // ============================================================
  const userTaggedStats = {
    total: userTaggedData.length,
    withDefects: userTaggedData.filter(d => d.defects && d.defects.length > 0).length,
    houses: userTaggedData.filter(d => d.is_house).length,
  };

  // ============================================================
  // UI START
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Paint Defect Analytics Dashboard
        </h1>

        {/* ============================================================ */}
        {/* ⭐ FILTER BAR (Analytics) */}
        {/* ============================================================ */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Filters</h3>
          <div className="flex gap-4 items-end">
            {/* Postcode */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600">Postcode</label>
              <input
                className="border rounded p-2 text-gray-600"
                value={filters.postcode}
                onChange={(e) =>
                  setFilters({ ...filters, postcode: e.target.value })
                }
                placeholder="e.g. 29161"
              />
            </div>

            {/* Model */}
            <div className="flex flex-col">
              <label className="text-sm text-gray-600">Model</label>
              <select
                className="border rounded p-2 text-gray-600"
                value={filters.model}
                onChange={(e) =>
                  setFilters({ ...filters, model: e.target.value })
                }
              >
                <option value="all">All Models</option>
                <option value="yolo">YOLO</option>
                <option value="moondream">Moondream</option>
                <option value="house">House Classifier</option>
              </select>
            </div>

            {/* APPLY FILTERS BUTTON */}
            <button
              onClick={fetchAllData}
              disabled={loading || userTaggedLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading || userTaggedLoading ? "Loading..." : "Apply Filters"}
            </button>
          </div>
        </div>

        <p className="text-gray-600 mb-8">
          Comprehensive analysis of AI model performance
        </p>

        {/* ============================================================ */}
        {/* Summary Cards */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Addresses</p>
                <p className="text-3xl font-bold text-gray-900">
                  {totalAddresses}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Defects</p>
                <p className="text-3xl font-bold text-gray-900">
                  {totalDefects}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Houses Detected</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.house_detection_summary?.model_detected || 0}
                </p>
              </div>
              <Home className="w-10 h-10 text-green-500" />
            </div>
          </div>

          {/* <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Model Correlation</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.model_correlation?.correlation?.toFixed(3) ||
                    "N/A"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.model_correlation?.interpretation}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-purple-500" />
            </div>
          </div> */}
        </div>

        {/* ============================================================ */}
        {/* ⭐ USER TAGGED SECTION */}
        {/* ============================================================ */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">User Tagged Data</h2>
          </div>

          {/* User Tagged Filters */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional User Tagged Filters</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600">Address</label>
                <input
                  className="border rounded p-2 text-gray-600"
                  value={userFilters.address}
                  onChange={(e) =>
                    setUserFilters({ ...userFilters, address: e.target.value })
                  }
                  placeholder="Street name"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-600">Is House</label>
                <select
                  className="border rounded p-2 text-gray-600"
                  value={userFilters.is_house}
                  onChange={(e) =>
                    setUserFilters({ ...userFilters, is_house: e.target.value })
                  }
                >
                  <option value="all">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-600">Has Defects</label>
                <select
                  className="border rounded p-2 text-gray-600"
                  value={userFilters.has_defects}
                  onChange={(e) =>
                    setUserFilters({ ...userFilters, has_defects: e.target.value })
                  }
                >
                  <option value="all">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              {/* <div className="flex flex-col">
                <label className="text-sm text-gray-600">Limit</label>
                <input
                  type="number"
                  className="border rounded p-2 text-gray-600"
                  value={userFilters.limit}
                  onChange={(e) =>
                    setUserFilters({ ...userFilters, limit: parseInt(e.target.value) || 100 })
                  }
                  min="1"
                />
              </div> */}
            </div>

            <button
              onClick={fetchUserTagged}
              disabled={userTaggedLoading}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {userTaggedLoading ? "Refreshing..." : "Refresh User Data"}
            </button>
          </div>

          {/* User Tagged Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Tagged</p>
              <p className="text-2xl font-bold text-indigo-600">{userTaggedStats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">With Defects</p>
              <p className="text-2xl font-bold text-orange-600">{userTaggedStats.withDefects}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Houses</p>
              <p className="text-2xl font-bold text-green-600">{userTaggedStats.houses}</p>
            </div>
          </div>

          {/* User Tagged Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Postcode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Is House</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Defects</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Moondream Label</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userTaggedData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No user-tagged data found
                      </td>
                    </tr>
                  ) : (
                    userTaggedData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-xs">
                          {item.img_path?.split('/').pop() || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.address || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.postcode || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          {item.is_house ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.defects && item.defects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.defects.map((defect: string, i: string) => (
                                <span key={i} className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                  {defect}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              No defects
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.moondream_label ? (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              item.moondream_label === 'ok' 
                                ? 'bg-green-100 text-green-800'
                                : item.moondream_label === 'needs-repaint'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.moondream_label}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Not set
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {item.comment || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Human vs YOLO Performance */}
        {/* ============================================================ */}
        {analytics.yolo_false_positive_summary?.accuracy_percent >= 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 7l6 6-6 6M13 7l6 6-6 6" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900">
                Human vs YOLO Performance
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">True Positives</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.yolo_false_positive_summary.true_positives || 0}
                </p>
                <p className="text-xs text-gray-500">YOLO: Defect • Human: Defect</p>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">True Negatives</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.yolo_false_positive_summary.true_negatives || 0}
                </p>
                <p className="text-xs text-gray-500">YOLO: OK • Human: OK</p>
              </div>

              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">False Positives</p>
                <p className="text-2xl font-bold text-orange-600">
                  {analytics.yolo_false_positive_summary.false_positives || 0}
                </p>
                <p className="text-xs text-gray-500">YOLO: Defect • Human: OK</p>
              </div>

              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">False Negatives</p>
                <p className="text-2xl font-bold text-red-600">
                  {analytics.yolo_false_positive_summary.false_negatives || 0}
                </p>
                <p className="text-xs text-gray-500">YOLO: OK • Human: Defect</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {analytics.yolo_false_positive_summary.accuracy_percent || 0}%
                </p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Precision</p>
                <p className="text-3xl font-bold text-purple-600">
                  {analytics.yolo_false_positive_summary.precision_percent || 0}%
                </p>
                <p className="text-xs text-gray-500">
                  When YOLO predicts a defect, how often it's correct
                </p>
              </div>

              <div className="text-center p-4 bg-pink-50 rounded-lg">
                <p className="text-sm text-gray-600">Recall</p>
                <p className="text-3xl font-bold text-pink-600">
                  {analytics.yolo_false_positive_summary.recall_percent || 0}%
                </p>
                <p className="text-xs text-gray-500">
                  How many actual defects YOLO catches
                </p>
              </div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Samples Evaluated</p>
              <p className="text-2xl font-bold text-gray-700">
                {analytics.yolo_false_positive_summary.total_samples || 0}
              </p>
              <p className="text-xs text-gray-500">
                Includes only human-tagged houses (ground truth)
              </p>
            </div>
          </div>
        )}


        {/* ============================================================ */}
        {/* Human vs Moondream Performance */}
        {/* ============================================================ */}
        {analytics.moondream_false_positive_summary?.accuracy_percent >= 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Moon className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Human vs Moondream Performance
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">True Positives</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.moondream_false_positive_summary.true_positives || 0}
                </p>
                <p className="text-xs text-gray-500">AI: Needs Repaint, Human: Needs Repaint</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">True Negatives</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.moondream_false_positive_summary.true_negatives || 0}
                </p>
                <p className="text-xs text-gray-500">AI: OK, Human: OK</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">False Positives</p>
                <p className="text-2xl font-bold text-orange-600">
                  {analytics.moondream_false_positive_summary.false_positives || 0}
                </p>
                <p className="text-xs text-gray-500">AI: Needs Repaint, Human: OK</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">False Negatives</p>
                <p className="text-2xl font-bold text-red-600">
                  {analytics.moondream_false_positive_summary.false_negatives || 0}
                </p>
                <p className="text-xs text-gray-500">AI: OK, Human: Needs Repaint</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-3xl font-bold text-purple-600">
                  {analytics.moondream_false_positive_summary.accuracy_percent || 0}%
                </p>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-gray-600">Precision</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {analytics.moondream_false_positive_summary.precision_percent || 0}%
                </p>
                <p className="text-xs text-gray-500">When AI says Needs Repaint, how often it's correct</p>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-lg">
                <p className="text-sm text-gray-600">Recall</p>
                <p className="text-3xl font-bold text-pink-600">
                  {analytics.moondream_false_positive_summary.recall_percent || 0}%
                </p>
                <p className="text-xs text-gray-500">How many actual defect cases AI catches</p>
              </div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Error Cases</p>
              <p className="text-2xl font-bold text-gray-600">
                {analytics.moondream_false_positive_summary.error_cases || 0}
              </p>
              <p className="text-xs text-gray-500">Images labeled as "errors" by Moondream</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Moondream vs Human Agreement */}
        {/* ============================================================ */}
        {analytics.moondream_human_agreement?.total_comparisons > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Moondream vs Human Label Agreement
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <p className="text-sm text-gray-600">Total Comparisons</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analytics.moondream_human_agreement.total_comparisons}
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <p className="text-sm text-gray-600">Matches</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.moondream_human_agreement.matches}
                </p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow">
                <p className="text-sm text-gray-600">Agreement Rate</p>
                <p className="text-3xl font-bold text-purple-600">
                  {analytics.moondream_human_agreement.agreement_percent}%
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 p-4 border-b">
                Detailed Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        AI Moondream Label
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Human Moondream Label
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.moondream_human_agreement.breakdown?.map((item, idx) => (
                      <tr key={idx} className={item.moondream_label === item.human_moondream_label ? "bg-green-50" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.moondream_label}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.human_moondream_label}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.moondream_label === item.human_moondream_label ? (
                            <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Match
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Mismatch
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Human vs Model Defect Table */}
        {/* ============================================================ */}
        {analytics.human_vs_model_defects?.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Human-Tagged vs YOLO-Detected Defects
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Human Tagged
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model Detected
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Match Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.human_vs_model_defects?.map((item, idx) => {
                    return (
                      <tr key={idx} className={item.match_status === "Match" ? "bg-green-50" : ""}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.human_defect || "None"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.model_defect || "None"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.match_status ==="Match" ? (
                            <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Match
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Mismatch
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* Charts Grid */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Condition Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Condition Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={conditionChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {conditionChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        COLORS[
                          analytics.conditions[index]?.moondream_label || 'null'
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Defect Types */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Defect Types by Occurrence
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={defectChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="occurrences" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Confidence */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Average Confidence by Defect Type
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={defectChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                <YAxis
                  label={{
                    value: "Confidence %",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Bar dataKey="confidence" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* YOLO vs Moondream */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              YOLO Defects vs Moondream Labels
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ok" stackId="a" fill={COLORS["ok"]} name="OK" />
                <Bar
                  dataKey="needs-repaint"
                  stackId="a"
                  fill={COLORS["needs-repaint"]}
                  name="Needs Repaint"
                />
                <Bar
                  dataKey="error"
                  stackId="a"
                  fill={COLORS["error"]}
                  name="Error"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Detailed Stats Table */}
        {/* ============================================================ */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Detailed Defect Statistics
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Defect Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Occurrences
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.defects?.map((defect, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {defect.defect_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {defect.occurrences}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(defect.avg_confidence * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {((defect.occurrences / totalDefects) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;