import React, { useState, useEffect, useCallback } from 'react';
import HouseDrawer from './HouseDrawer';

type ImageData = {
  src: string;
  label?: string;
  angle?: string;
};

type ImageLightboxProps = {
  images: ImageData[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  houseId: number;
  address: string;
  lat: number;
  lon: number;
};

export default function ImageLightbox({ 
  images, 
  initialIndex = 0, 
  isOpen, 
  onClose,
  houseId,
  address,
  lat,
  lon
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setImageError(false);
  }, [initialIndex, isOpen]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setImageError(false);
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setImageError(false);
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToNext, goToPrevious]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
        onClick={onClose}
        >
        {/* Close button */}
        <button
            onClick={onClose}
            className="absolute top-4 left-4 text-white hover:text-gray-300 transition-colors z-50"
            aria-label="Close lightbox"
        >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        {/* Notes / Drawer toggle */}
        <button
            onClick={(e) => {
            e.stopPropagation();
            setDrawerOpen(!drawerOpen);
            }}
            className="absolute top-4 right-4 text-black hover:text-gray-300 transition-colors z-50 flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg"
            aria-label="Toggle notes"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-sm font-medium">Notes</span>
        </button>

        {/* 👇 Wrap the image and navigation in a flex container that shifts left */}
        <div
            className={`relative flex flex-col items-center justify-center w-full max-w-7xl transition-all duration-300 ${
            drawerOpen ? 'mr-[420px]' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Navigation buttons */}
            {images.length > 1 && (
            <>
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-black rounded-full p-3 transition-all z-40"
                aria-label="Previous image"
                >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                </button>

                <button
                onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-black rounded-full p-3 transition-all z-40"
                aria-label="Next image"
                >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                </button>
            </>
            )}

            {/* Image */}
            {!imageError ? (
            <img
                src={currentImage.src}
                alt={`${currentImage.label || `Image ${currentIndex + 1}`}`}
                className="w-full h-full object-contain max-h-[85vh]"
                onError={() => setImageError(true)}
            />
            ) : (
            <div className="w-full h-96 flex items-center justify-center text-white text-lg bg-gray-800 rounded">
                Image failed to load
            </div>
            )}

            {/* Caption */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
            <div className="text-center">
                <div className="text-sm font-medium">
                {currentImage.angle && `${currentImage.angle} - `}
                {currentImage.label || `Image ${currentIndex + 1}`}
                </div>
                {images.length > 1 && (
                <div className="text-xs text-gray-300 mt-1">
                    {currentIndex + 1} / {images.length}
                </div>
                )}
            </div>
            </div>

            {/* Footer tip */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-white text-xs opacity-70">
            Press ESC to close • Arrow keys to navigate
            </div>
        </div>

        {/* Drawer Sidebar */}
        <div
            className={`fixed top-0 right-0 h-full w-[420px] transform transition-transform duration-300 ease-in-out z-50 ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
            <HouseDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            houseId={houseId}
            address={address}
            lat={lat}
            lon={lon}
            />
        </div>
    </div>

  );
}