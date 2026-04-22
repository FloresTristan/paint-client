import React, {useState} from "react";
import ImageLightbox from "./ImageLightbox";
import { HouseData } from "../../types/types";
import HouseInfo from "./HouseInfo";
import { Expand } from "lucide-react";

export default function HouseCard({ house }: { house: HouseData }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const allImages = React.useMemo(() => {
    const images: { src: string; label?: string; angle?: string }[] = [];

    if (house.results) {
      Object.entries(house.results).forEach(([angle, result]) => {
        if (result.image) {
          images.push({
            src: result.image,
            label: result.label,
            angle: `${angle}`
          });
        }
      });
    }

    return images;
  }, [house]);

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === allImages.length - 1 ? 0 : prev + 1
    );
    setImageError(false);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? allImages.length - 1 : prev - 1
    );
    setImageError(false);
  };

  if (allImages.length === 0) {
    return (
      <>
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all hover:scale-105 duration-150">
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
            No Images Available
          </div>
          <HouseInfo house={house} />
        </div>
      </>
    );
  }

  const currentImage = allImages[currentImageIndex];

  const getImageSrc = (src: string) =>
    src.startsWith("http://") || src.startsWith("https://")
      ? src
      : `http://localhost:8080/${src}`;

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all hover:scale-105 duration-150">
        <div
          className="relative w-full h-48 overflow-hidden bg-gray-100 cursor-pointer"
          onClick={() => setLightboxOpen(true)}
        >
          {!imageError ? (
            <img
              src={getImageSrc(currentImage.src)}
              alt={`${house.address} - ${currentImage.label || `Image ${currentImageIndex + 1}`}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              Image failed to load
            </div>
          )}

          {allImages.length > 1 && !imageError && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all"
                aria-label="Previous image"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-all"
                aria-label="Next image"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Angle + label — top left */}
          <div className="absolute top-2 left-2 bg-black/55 text-white text-xs px-2 py-0.5 rounded max-w-[60%] truncate">
            {currentImage.angle && `${currentImage.angle}°`}{currentImage.label && ` · ${currentImage.label}`}
          </div>

          {/* Image counter — bottom center */}
          {allImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {currentImageIndex + 1} / {allImages.length}
            </div>
          )}

          {/* Expand icon — bottom right */}
          <div className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded transition-colors">
            <Expand className="w-3.5 h-3.5" />
          </div>
        </div>

        <HouseInfo house={house} />
      </div>

      <ImageLightbox
        images={allImages}
        initialIndex={currentImageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        houseId={house.id}
        postcode={house.postcode}
        address={house.address}
        lat={house.lat}
        lon={house.lon}
        houseData={house}
      />
    </>
  );
}
