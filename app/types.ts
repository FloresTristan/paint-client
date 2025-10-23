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
};