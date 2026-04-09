import React, { useState, useEffect } from 'react';
import { DefectCategory, HouseDrawerProps } from './types';

export const DEFECT_CATEGORIES: DefectCategory[] = [
  { id: 'paint-defect', label: 'Paint Defects', color: 'bg-red-100 text-red-700 border-red-300' },
  { id: 'Delamination', label: 'Delamination', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'cracks', label: 'Cracks', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'dirt-algae-and-mold', label: 'Dirt, Algae, and Mold', color: 'bg-green-100 text-green-700 border-green-300' },
];

export default function HouseDrawer({ isOpen, onClose, houseId, postcode, images, address, lat, lon }: HouseDrawerProps) {
  const [selectedDefects, setSelectedDefects] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [isHouse, setIsHouse] = useState(true);
  const [savedData, setSavedData] = useState<{ defects: string[], comment: string, isHouse: boolean } | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const API_BASE_URL= process.env.NEXT_PUBLIC_API_BASE

  useEffect(() => {
    const hasHouseLabel = images.label?.toLowerCase() === 'house';
    
    const saved = localStorage.getItem(`house-${houseId}`);
    if (saved) {
      const data = JSON.parse(saved);
      setSelectedDefects(new Set(data.defects || []));
      setComment(data.comment || '');
      setIsHouse(data.isHouse !== undefined ? data.isHouse : hasHouseLabel);
      setSavedData(data);
    } else {
      setIsHouse(hasHouseLabel);
    }
  }, [houseId, images]);

  console.log("images", {images})

  const fetchMetadata = async () => {
    setMetadataLoading(true);
    setMetadataError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/streetview-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat, lon }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setMetadataError('No Street View available for this location');
        } else {
          setMetadataError(result.message || 'Failed to fetch metadata');
        }
        setMetadataLoading(false);
        return;
      }

      setMetadata(result.data);
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setMetadataError('Network error while fetching metadata');
    } finally {
      setMetadataLoading(false);
    }
  };

  const toggleDefect = (defectId: string) => {
    const newSelected = new Set(selectedDefects);
    if (newSelected.has(defectId)) {
      newSelected.delete(defectId);
    } else {
      newSelected.add(defectId);
    }
    setSelectedDefects(newSelected);
  };

  const handleClear = () => {
    setSelectedDefects(new Set());
    setComment('');
    const hasHouseLabel = images.label?.toLowerCase() === 'house';
    setIsHouse(hasHouseLabel);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    const data = {
      defects: Array.from(selectedDefects),
      comment: comment.trim(),
      isHouse: isHouse,
      timestamp: new Date().toISOString(),
    };

    const payload = {
      address: address,
      postcode: postcode,
      img_path: images.src,
      is_house: isHouse,
      defects: Array.from(selectedDefects),
      comment: comment.trim() || null,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/user-tagged-defects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save data');
      }

      // Save to localStorage as backup
      localStorage.setItem(`house-${houseId}`, JSON.stringify(data));
      setSavedData(data);
      
      alert('✅ Notes saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save data');
      
      // Still save to localStorage as fallback
      localStorage.setItem(`house-${houseId}`, JSON.stringify(data));
      setSavedData(data);
      
      alert('⚠️ Saved locally but failed to sync with server. Please try again later.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    const hasHouseLabel = images.label?.toLowerCase() === 'house';
    
    if (!savedData) {
      return selectedDefects.size > 0 || 
             comment.trim().length > 0 || 
             isHouse !== hasHouseLabel;
    }
    
    const currentDefects = Array.from(selectedDefects).sort();
    const savedDefects = (savedData.defects || []).sort();
    
    return (
      JSON.stringify(currentDefects) !== JSON.stringify(savedDefects) ||
      comment.trim() !== (savedData.comment || '') ||
      isHouse !== savedData.isHouse
    );
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-10 bg-white overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          <div className="flex-1 pr-4 w-[80%] ">
            <h2 className="text-base font-semibold text-gray-800 truncate " title={address}>
              {address}
            </h2>
            <p className="text-xs text-gray-500">House ID: {houseId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 w-[10%] flex justify-center cursor-pointer transition-colors flex-shrink-0"
            aria-label="Close drawer"
          >
            <svg className="w-10 h-10 p-2 hover:bg-gray-300 duration-300 transition-all rounded-4xl" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Street View Metadata Section */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Street View Info</h3>
              {!metadata && !metadataLoading && (
                <button
                  onClick={fetchMetadata}
                  className="text-xs px-3 py-1 bg-blue-600 cursor-pointer text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Fetch Metadata
                </button>
              )}
            </div>
            
            {metadataLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading metadata...</span>
              </div>
            )}

            {metadataError && (
              <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                {metadataError}
              </div>
            )}

            {metadata && !metadataLoading && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 font-medium ${
                      metadata.status === 'OK' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metadata.status}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setMetadata(null);
                      setMetadataError(null);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>

                {metadata.capture_date && (
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-500">Capture Date:</span>
                    <span className="ml-2 text-gray-700 font-medium">{metadata.capture_date}</span>
                  </div>
                )}

                <div className="bg-gray-50 rounded p-2">
                  <div className="text-xs text-gray-500 mb-1">Coordinates</div>
                  <div className="text-xs text-gray-700">
                    <div>Lat: {metadata.lat?.toFixed(7)}</div>
                    <div>Lon: {metadata.lon?.toFixed(7)}</div>
                  </div>
                </div>

                {metadata.pano_id && (
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs text-gray-500 mb-1">Panorama ID</div>
                    <div className="text-xs text-gray-700 font-mono break-all">
                      {metadata.pano_id}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!metadata && !metadataLoading && !metadataError && (
              <p className="text-xs text-gray-500 italic">
                Click "Fetch Metadata" to load Street View information
              </p>
            )}
          </div>

          {/* House Type Toggle */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Image Type</h3>
            <button
              onClick={() => setIsHouse(!isHouse)}
              className={`px-2 py-1 text-xs rounded-full border-1 cursor-pointer transition-all ${
                isHouse
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {isHouse ? 'House' : 'Not a House'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              {isHouse 
                ? 'This image contains a house' 
                : 'This image does not contain a house (click to mark as house)'}
            </p>
          </div>

          {/* Defects Section */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Select Defects</h3>
            <div className="flex flex-wrap gap-2">
              {DEFECT_CATEGORIES.map((defect) => (
                <button
                  key={defect.id}
                  onClick={() => toggleDefect(defect.id)}
                  className={`px-2 py-1 text-xs font-medium rounded-full border-2 cursor-pointer transition-all ${
                    selectedDefects.has(defect.id)
                      ? `${defect.color} border-opacity-100`
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {defect.label}
                </button>
              ))}
            </div>
            {selectedDefects.size > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {selectedDefects.size} defect{selectedDefects.size !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Comments</h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add notes about this property..."
              className="w-full h-24 px-3 py-2 text-sm border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Save Error Message */}
          {saveError && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {saveError}
              </p>
            </div>
          )}

          {savedData && !hasChanges() && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                All changes saved
              </p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 flex gap-2 bg-gray-50">
          <button
            onClick={handleClear}
            disabled={selectedDefects.size === 0 && comment.trim().length === 0 && !hasChanges()}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges() || saving}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}