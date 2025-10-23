import React, { useState, useEffect } from 'react';

type DefectCategory = {
  id: string;
  label: string;
  color: string;
};

export const DEFECT_CATEGORIES: DefectCategory[] = [
  { id: 'paint-defect', label: 'Paint Defects', color: 'bg-red-100 text-red-700 border-red-300' },
  { id: 'Delamination', label: 'Delamination', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'cracks', label: 'Cracks', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'dirt-algae-and-mold', label: 'Dirt, Algae, and Mold', color: 'bg-green-100 text-green-700 border-green-300' },
];

type HouseDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  houseId: number;
  address: string;
  lat: number;
  lon: number;
};

export default function HouseDrawer({ isOpen, onClose, houseId, address, lat, lon }: HouseDrawerProps) {
  const [selectedDefects, setSelectedDefects] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [savedData, setSavedData] = useState<{ defects: string[], comment: string } | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`house-${houseId}`);
    if (saved) {
      const data = JSON.parse(saved);
      setSelectedDefects(new Set(data.defects || []));
      setComment(data.comment || '');
      setSavedData(data);
    }
  }, [houseId]);

  const fetchMetadata = async () => {
    setMetadataLoading(true);
    setMetadataError(null);
    
    try {
      const response = await fetch('http://127.0.0.1:8080/streetview-metadata', {
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
  };

  const handleSave = () => {
    const data = {
      defects: Array.from(selectedDefects),
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`house-${houseId}`, JSON.stringify(data));
    setSavedData(data);
    alert('Notes saved successfully!');
  };

  const hasChanges = () => {
    if (!savedData) return selectedDefects.size > 0 || comment.trim().length > 0;
    
    const currentDefects = Array.from(selectedDefects).sort();
    const savedDefects = (savedData.defects || []).sort();
    
    return (
      JSON.stringify(currentDefects) !== JSON.stringify(savedDefects) ||
      comment.trim() !== (savedData.comment || '')
    );
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-10 bg-white overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex-1 pr-4">
            <h2 className="text-base font-semibold text-gray-800 truncate" title={address}>
              {address}
            </h2>
            <p className="text-xs text-gray-500">House ID: {houseId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
                    <div>Lat: {metadata.lat?.toFixed(6)}</div>
                    <div>Lon: {metadata.lon?.toFixed(6)}</div>
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

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Select Defects</h3>
            <div className="flex flex-wrap gap-2">
              {DEFECT_CATEGORIES.map((defect) => (
                <button
                  key={defect.id}
                  onClick={() => toggleDefect(defect.id)}
                  className={`px-2 py-1 text-xs font-medium rounded-full border-2 transition-all ${
                    selectedDefects.has(defect.id)
                      ? `${defect.color} border-opacity-100`
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {selectedDefects.has(defect.id) && '✓ '}
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

          {savedData && !hasChanges() && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {/* Saved {new Date(savedData.timestamp).toLocaleDateString()} */}
              </p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 flex gap-2 bg-gray-50">
          <button
            onClick={handleClear}
            disabled={selectedDefects.size === 0 && comment.trim().length === 0}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges()}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}