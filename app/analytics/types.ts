export interface Condition {
  moondream_label: string;
  total: number;
}

export interface Defect {
  defect_type: string;
  occurrences: number;
  avg_confidence: number;
}

export interface YoloFalsePositiveSummary {
  false_positives: number;
  true_positives: number;
  false_negatives: number;
  true_negatives: number;
  accuracy_percent: number;
  precision_percent: number;
  recall_percent: number;
  total_samples: number;
}

export interface MoondreamFalsePositiveSummary {
  false_positives: number;
  true_positives: number;
  false_negatives: number;
  true_negatives: number;
  error_cases: number;
  total_samples: number;
  accuracy_percent: number;
  precision_percent: number;
  recall_percent: number;
}

export interface MoondreamHumanAgreement {
  breakdown: Array<{
    moondream_label: string;
    human_moondream_label: string;
    total: number;
  }>;
  total_comparisons: number;
  matches: number;
  agreement_percent: number;
}

export interface HouseDetectionSummary {
  model_detected: number;
  human_detected: number;
  agreement: number;
  agreement_percent: number;
}

export interface YoloVsMoondream {
  moondream_label: string;
  yolo_defect: string;
  total: number;
}

export interface ModelCorrelation {
  total_samples: number;
  correlation: number | null;
  interpretation: string;
}

export interface AnalyticsData {
  conditions: Condition[];
  defects: Defect[];
  human_vs_model_defects: any[];
  yolo_false_positive_summary: YoloFalsePositiveSummary;
  moondream_false_positive_summary: MoondreamFalsePositiveSummary;
  moondream_human_agreement: MoondreamHumanAgreement;
  house_detection_summary: HouseDetectionSummary;
  yolo_vs_moondream: YoloVsMoondream[];
  model_correlation: ModelCorrelation;
}

export interface ConditionChartData {
  name: string;
  value: number;
  percentage: string;
  [key: string]: string | number;
}

export interface DefectChartData {
  name: string;
  occurrences: number;
  confidence: string;
  [key: string]: string | number;
}

export interface ComparisonData {
  name: string;
  ok: number;
  'needs-repaint': number;
  error: number;
  [key: string]: string | number;
}