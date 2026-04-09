// Model-agnostic defect assessment
export interface DefectAssessment {
  model: string;  // "moondream" | "gpt4v" | "claude" | etc.
  label: "needs-repaint" | "ok";
  confidence: number;
  raw?: string | null;
}

// Legacy Moondream-specific (kept for backward compatibility)
export interface MoondreamDefects {
  label: "needs-repaint" | "ok";
  confidence: number;
  raw?: string | null;
}

export type HouseData = {
  id: number;
  address: string;
  lat: number;
  lon: number;
  postcode: string;
  imageUrl?: string;
  
  // New unified field (preferred)
  defect_assessment?: DefectAssessment;
  
  // Legacy fields (deprecated but kept for backward compatibility)
  moondream_defects?: MoondreamDefects;
  yolo_results?: { type: string; confidence: number }[];
  
  results?: {
    [key: string]: {
      confidence: number | null;
      image: string;
      label: string;
      moondream_results?: {
        confidence: number;
        label: string;
        raw: string;
      };
      defect_assessment?: DefectAssessment;
      yolo_results?: { type: string; confidence: number }[];
    };
  };
  
  // Additional fields
  image_source?: "static" | "pano";
  metrics?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export type FilterType = 
  | "all" 
  | "with-defects" 
  | "without-defects" 
  | "with-house" 
  | "no-house";

export type ImageData = {
  src: string;
  label?: string;
  angle?: string | number;
};

export type ImageLightboxProps = {
  images: ImageData[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  houseId: number;
  postcode: string;
  address: string;
  lat: number;
  lon: number;
  houseData: HouseData;
};

export type DefectCategory = {
  id: string;
  label: string;
  color: string;
};

export type HouseDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  houseId: number;
  postcode: string;
  images: ImageData;
  address: string;
  lat: number;
  lon: number;
  houseData: HouseData;
};