"use client";

import React, { useMemo, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { AnalyticsSummary, ChartDataPoint } from "./types";

const COLORS: Record<string, string> = {
  "needs-repaint": "#ef4444", // red
  ok: "#22c55e", // green
  unknown: "#94a3b8", // gray
};

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE

type Filters = {
  postcode: string;
  model: string;
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // draft filters (what user is typing/selecting)
  const [draftFilters, setDraftFilters] = useState<Filters>({
    postcode: "",
    model: "",
  });

  // applied filters (what the API call uses)
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    postcode: "",
    model: "",
  });

  const isDirty = useMemo(
    () => JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters),
    [draftFilters, appliedFilters]
  );

  console.log("analytics data", data);

  const fetchAnalytics = async (filtersToUse: Filters) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtersToUse),
      });

      console.log("raw response", response);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      const result = await response.json();
      setData(result.summary);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // initial load once
  useEffect(() => {
    fetchAnalytics(appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApply = () => {
    setAppliedFilters(draftFilters);
    fetchAnalytics(draftFilters);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading analytics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">{error || "No data available"}</div>
      </div>
    );
  }

  // Prepare chart data
  const conditionPieData: ChartDataPoint[] =
    data.condition_distribution.breakdown.map((item) => ({
      name: item.condition,
      value: item.count,
      percentage: item.percentage,
    }));

  const modelComparisonData = data.model_breakdown.map((model) => ({
    model: model.model,
    "needs-repaint": model.conditions["needs-repaint"]?.count || 0,
    ok: model.conditions["ok"]?.count || 0,
    unknown: model.conditions["unknown"]?.count || 0,
  }));

  const trendData = data.recent_trends.map((trend) => ({
    date: trend.date,
    "needs-repaint": trend.conditions["needs-repaint"] || 0,
    ok: trend.conditions["ok"] || 0,
    total: trend.total,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-black/50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Paint Assessment Analytics
          </h1>
          <p className="text-gray-600">
            Model-agnostic insights across {data.total_properties} properties
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Filter by ZIP code"
            value={draftFilters.postcode}
            onChange={(e) =>
              setDraftFilters({ ...draftFilters, postcode: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") onApply();
            }}
            className="border rounded px-3 py-2"
          />
          <select
            value={draftFilters.model}
            onChange={(e) =>
              setDraftFilters({ ...draftFilters, model: e.target.value })
            }
            className="border rounded px-3 py-2"
          >
            <option value="">All Models</option>
            <option value="moondream">Moondream</option>
          </select>

          <button
            onClick={onApply}
            disabled={!isDirty || loading}
            className={`px-4 py-2 rounded text-white ${
              !isDirty || loading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Applying..." : "Apply Filters"}
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard title="Total Properties" value={data.total_properties} color="blue" />
          <MetricCard
            title="Needs Work"
            value={
              data.condition_distribution.breakdown.find((b) => b.condition === "needs-repaint")
                ?.count || 0
            }
            percentage={
              data.condition_distribution.breakdown.find((b) => b.condition === "needs-repaint")
                ?.percentage || 0
            }
            color="red"
          />
          <MetricCard
            title="Acceptable"
            value={data.condition_distribution.breakdown.find((b) => b.condition === "ok")?.count || 0}
            percentage={
              data.condition_distribution.breakdown.find((b) => b.condition === "ok")?.percentage || 0
            }
            color="green"
          />
          <MetricCard
            title="Model Accuracy"
            value={`${data.human_validation.agreement_percent}%`}
            subtitle={`${data.human_validation.total} validations`}
            color="purple"
          />
        </div>

        {/* Human Validation */}
        {data.human_validation && (
          <ChartCard title="Human Validation Analysis" className="mb-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                <div className="text-sm font-medium text-purple-700 mb-1">Overall Agreement</div>
                <div className="text-4xl font-bold text-purple-900">
                  {data.human_validation.agreement_percent}%
                </div>
                <div className="text-xs text-purple-600 mt-2">
                  {data.human_validation.agreement.toLocaleString()} of{" "}
                  {data.human_validation.total.toLocaleString()} matches
                </div>
              </div>

              {(() => {
                const rows = data.human_validation.comparisons ?? [];
                const falsePositive = rows
                  .filter((r) => r.human_label === "ok" && r.model_label === "needs-repaint")
                  .reduce((sum, r) => sum + r.count, 0);
                const falseNegative = rows
                  .filter((r) => r.human_label === "needs-repaint" && r.model_label === "ok")
                  .reduce((sum, r) => sum + r.count, 0);
                const fpRate = ((falsePositive / data.human_validation.total) * 100).toFixed(1);
                const fnRate = ((falseNegative / data.human_validation.total) * 100).toFixed(1);

                return (
                  <>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200">
                      <div className="text-sm font-medium text-orange-700 mb-1">False Positives</div>
                      <div className="text-4xl font-bold text-orange-900">{falsePositive}</div>
                      <div className="text-xs text-orange-600 mt-2">
                        {fpRate}% of total • Model over-flags
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-5 border border-rose-200">
                      <div className="text-sm font-medium text-rose-700 mb-1">False Negatives</div>
                      <div className="text-4xl font-bold text-rose-900">{falseNegative}</div>
                      <div className="text-xs text-rose-600 mt-2">
                        {fnRate}% of total • Model under-flags
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                <div className="text-sm font-medium text-blue-700 mb-1">Total Validations</div>
                <div className="text-4xl font-bold text-blue-900">
                  {data.human_validation.total.toLocaleString()}
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  Human-verified labels
                </div>
              </div>
            </div>

            {/* Confusion Matrix */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-gray-900 mb-3">Confusion Matrix</h4>
              {(() => {
                const rows = data.human_validation.comparisons ?? [];
                const labels = Array.from(new Set(rows.flatMap((r) => [r.human_label, r.model_label]))).sort();
                
                // Build matrix
                const matrix: Record<string, Record<string, number>> = {};
                labels.forEach((h) => {
                  matrix[h] = {};
                  labels.forEach((m) => {
                    matrix[h][m] = 0;
                  });
                });
                
                rows.forEach((r) => {
                  matrix[r.human_label][r.model_label] = r.count;
                });

                const maxCount = Math.max(...rows.map((r) => r.count));

                return (
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                      <div className="flex">
                        {/* Y-axis label */}
                        <div className="flex flex-col justify-center items-center pr-4">
                          <div className="text-xs font-semibold text-gray-700 transform -rotate-90 whitespace-nowrap">
                            Human Label
                          </div>
                        </div>
                        
                        {/* Matrix */}
                        <div>
                          {/* X-axis label */}
                          <div className="text-center mb-2">
                            <div className="text-xs font-semibold text-gray-700">Model Prediction</div>
                          </div>
                          
                          <table className="border-collapse">
                            <thead>
                              <tr>
                                <th className="border border-gray-300 bg-gray-100 p-2"></th>
                                {labels.map((label) => (
                                  <th key={label} className="border border-gray-300 bg-gray-100 p-2 text-xs font-semibold text-gray-700 min-w-[100px]">
                                    {label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {labels.map((humanLabel) => (
                                <tr key={humanLabel}>
                                  <td className="border border-gray-300 bg-gray-100 p-2 text-xs font-semibold text-gray-700 whitespace-nowrap">
                                    {humanLabel}
                                  </td>
                                  {labels.map((modelLabel) => {
                                    const count = matrix[humanLabel][modelLabel];
                                    const isCorrect = humanLabel === modelLabel;
                                    const intensity = maxCount > 0 ? count / maxCount : 0;
                                    
                                    let bgColor = "bg-gray-50";
                                    if (count > 0) {
                                      if (isCorrect) {
                                        bgColor = intensity > 0.7 ? "bg-green-200" : intensity > 0.4 ? "bg-green-100" : "bg-green-50";
                                      } else {
                                        bgColor = intensity > 0.7 ? "bg-red-200" : intensity > 0.4 ? "bg-red-100" : "bg-red-50";
                                      }
                                    }

                                    return (
                                      <td
                                        key={modelLabel}
                                        className={`border border-gray-300 p-3 text-center ${bgColor} transition-colors hover:ring-2 hover:ring-blue-400`}
                                      >
                                        <div className="text-lg font-bold text-gray-900">{count}</div>
                                        {count > 0 && (
                                          <div className="text-xs text-gray-600 mt-1">
                                            {((count / data.human_validation.total) * 100).toFixed(1)}%
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          
                          {/* Legend */}
                          <div className="flex items-center gap-6 mt-4 text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-green-100 border border-gray-300 rounded"></div>
                              <span>Correct predictions</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-red-100 border border-gray-300 rounded"></div>
                              <span>Incorrect predictions</span>
                            </div>
                            <div className="ml-auto text-gray-500">
                              Color intensity shows relative frequency
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Agreement Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Agreement Pie */}
              {(() => {
                const rows = data.human_validation.comparisons ?? [];
                const match = rows.filter((r) => r.agrees).reduce((s, r) => s + r.count, 0);
                const mismatch = rows.filter((r) => !r.agrees).reduce((s, r) => s + r.count, 0);

                const pieData = [
                  { name: "Agreement", value: match, color: "#22c55e" },
                  { name: "Disagreement", value: mismatch, color: "#ef4444" },
                ];

                return (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Agreement Distribution</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}

              {/* Error Type Breakdown */}
              {(() => {
                const rows = data.human_validation.comparisons ?? [];
                const pairData = rows
                  .filter((r) => !r.agrees)
                  .map((r) => ({
                    name: `${r.human_label} → ${r.model_label}`,
                    count: r.count,
                    fullLabel: `Human: "${r.human_label}" | Model: "${r.model_label}"`,
                  }))
                  .sort((a, b) => b.count - a.count);

                return (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Misclassifications</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={pairData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value: number) => [value, "Count"]}
                          labelFormatter={(label) => {
                            const item = pairData.find(d => d.name === label);
                            return item?.fullLabel || label;
                          }}
                        />
                        <Bar dataKey="count" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          </ChartCard>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Condition Distribution Pie */}
          <ChartCard title="Overall Condition Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={conditionPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {conditionPieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.name] ?? COLORS.unknown}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Confidence Distribution */}
          <ChartCard title="Model Confidence Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.confidence_stats.distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" angle={-15} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Model Comparison */}
        {modelComparisonData.length > 0 && (
          <ChartCard title="Model Comparison" className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={modelComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="ok" fill={COLORS.ok} />
                <Bar dataKey="needs-repaint" fill={COLORS["needs-repaint"]} />
                <Bar dataKey="unknown" fill={COLORS.unknown} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Trends */}
        {trendData.length > 0 && (
          <ChartCard title="30-Day Trend" className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="needs-repaint" stroke={COLORS["needs-repaint"]} strokeWidth={2} />
                <Line type="monotone" dataKey="ok" stroke={COLORS.ok} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Geographic Summary Table */}
        <ChartCard title="Geographic Breakdown" className="mb-6 text-black/60">
          <div className="overflow-x-auto text-black/50">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">ZIP Code</th>
                  <th className="px-4 py-2 text-left">City</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Needs Work</th>
                  <th className="px-4 py-2 text-right">% Needs Work</th>
                </tr>
              </thead>
              <tbody>
                {data.geographic_summary.map((geo, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{geo.postcode}</td>
                    <td className="px-4 py-2">{geo.city || "—"}</td>
                    <td className="px-4 py-2 text-right">{geo.total_properties}</td>
                    <td className="px-4 py-2 text-right">{geo.needs_work}</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`px-2 py-1 rounded ${
                          geo.needs_work_percent > 50
                            ? "bg-red-100 text-red-800"
                            : geo.needs_work_percent > 25
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {geo.needs_work_percent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  percentage,
  subtitle,
  color = "blue",
}: {
  title: string;
  value: number | string;
  percentage?: number;
  subtitle?: string;
  color?: "blue" | "red" | "green" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-900 border-blue-200",
    red: "bg-red-50 text-red-900 border-red-200",
    green: "bg-green-50 text-green-900 border-green-200",
    purple: "bg-purple-50 text-purple-900 border-purple-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-sm font-medium mb-1">{title}</div>
      <div className="text-3xl font-bold">
        {value}
        {percentage !== undefined && <span className="text-lg ml-2">({percentage}%)</span>}
      </div>
      {subtitle && <div className="text-xs mt-1 opacity-75">{subtitle}</div>}
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}