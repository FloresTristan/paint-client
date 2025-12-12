export type HouseData = {
  id: number;
  address: string;
  lat: number;
  lon: number;
  postcode: string;
  imageUrl?: string;
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
      yolo_results?: { type: string; confidence: number }[];
    };
  };
}

export type FilterType = "all" | "with-defects" | "without-defects";

export type ImageData = {
  src: string;
  label?: string;
  angle?: string | number; // Changed to support both string and number
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