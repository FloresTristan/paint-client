export type HouseData = {
  id: number;
  address: string;
  lat: number;
  lon: number;
  postcode: string;
  imageUrl?: string;
  defects?: { type: string; confidence: number }[];
  results?: {
    [key: string]: {
      confidence: number | null;
      image: string;
      label: string;
    };
  };
}

export type FilterType = "all" | "with-defects" | "without-defects";

export type ImageData = {
  src: string;
  label?: string;
  angle?: string;
};

export type ImageLightboxProps = {
  images: ImageData[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  houseId: number;
  address: string;
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
  address: string;
};