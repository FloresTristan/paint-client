// Model-Agnostic Analytics Types

export interface ConditionBreakdownItem {
  condition: "needs-repaint" | "ok" | "unknown";
  count: number;
  avg_confidence: number | null;
  percentage: number;
}

export interface ConditionDistribution {
  breakdown: ConditionBreakdownItem[];
  total: number;
}

export interface ModelConditionStats {
  count: number;
  avg_confidence: number | null;
}

export interface ModelBreakdown {
  model: string;  // "moondream" | "gpt4v" | "claude" | etc.
  total: number;
  conditions: Record<string, ModelConditionStats>;
}

export interface GeographicSummary {
  postcode: string;
  city: string | null;
  total_properties: number;
  needs_work: number;
  needs_work_percent: number;
}

export interface ConfidenceBucket {
  bucket: "high (0.9-1.0)" | "medium (0.7-0.9)" | "low (0.5-0.7)" | "very low (<0.5)";
  count: number;
  percentage: number;
}

export interface ConfidenceStats {
  distribution: ConfidenceBucket[];
  total: number;
}

export interface TrendDataPoint {
  date: string;  // YYYY-MM-DD
  conditions: Record<string, number>;
  total: number;
}

export interface HumanValidationComparison {
  human_label: string;
  model_label: string;
  count: number;
  agrees: boolean;
}

export interface HumanValidationStats {
  comparisons: HumanValidationComparison[];
  total: number;
  agreement: number;
  agreement_percent: number;
}

export interface AnalyticsSummary {
  total_properties: number;
  condition_distribution: ConditionDistribution;
  model_breakdown: ModelBreakdown[];
  geographic_summary: GeographicSummary[];
  confidence_stats: ConfidenceStats;
  recent_trends: TrendDataPoint[];
  human_validation: HumanValidationStats;
}

// Chart-ready data types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface ModelComparisonChartData {
  model: string;
  ok: number;
  "needs-repaint": number;
  unknown: number;
}

export interface TrendChartData {
  date: string;
  ok: number;
  "needs-repaint": number;
  total: number;
}