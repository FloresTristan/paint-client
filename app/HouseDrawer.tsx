import React, { useState, useEffect, useMemo } from 'react';
import { DefectCategory, HouseDrawerProps } from './types';

export const DEFECT_CATEGORIES: DefectCategory[] = [
  { id: 'paint-defect', label: 'Paint Defects', color: 'bg-red-100 text-red-700 border-red-300' },
  { id: 'Delamination', label: 'Delamination', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'cracks', label: 'Cracks', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'dirt-algae-and-mold', label: 'Dirt, Algae, and Mold', color: 'bg-green-100 text-green-700 border-green-300' },
];

// Moondream Label options
const MOONDREAM_LABELS = [
  { value: 'ok', label: 'Ok', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'needs-repaint', label: 'Needs Repaint', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'error', label: 'Error', color: 'bg-amber-100 text-amber-700 border-amber-300' },
] as const;

type MoondreamLabel = 'ok' | 'needs-repaint' | 'error' | null;

export default function HouseDrawer({ isOpen, onClose, houseId, postcode, images, address, lat, lon, houseData }: HouseDrawerProps) {
  const [selectedDefects, setSelectedDefects] = useState<Set<string>>(new Set());
  const [moondreamLabel, setMoondreamLabel] = useState<MoondreamLabel>(null);
  const [comment, setComment] = useState('');
  const [isHouse, setIsHouse] = useState(true);
  const [savedData, setSavedData] = useState<{ 
    defects: string[], 
    comment: string, 
    isHouse: boolean,
    moondreamLabel: MoondreamLabel 
  } | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Get AI results for current angle
  const getCurrentAngleAI = () => {
    if (!houseData?.results) return null;
    if (images.angle === undefined || images.angle === null) return null;
    
    // Convert angle to string to match object keys
    const angleKey = String(images.angle);
    const result = houseData.results[angleKey];
    
    console.log('Looking for angle:', angleKey, 'Found result:', result);
    return result;
  };

  const currentAngleAI = getCurrentAngleAI();

  // Memoize AI detected defects to prevent infinite re-renders (YOLO only)
  const aiDetectedDefects = useMemo(() => {
    const detected = new Set<string>();
    
    if (currentAngleAI?.yolo_results) {
      console.log('YOLO results:', currentAngleAI.yolo_results);
      
      currentAngleAI.yolo_results.forEach((result: any) => {
        // Map YOLO types to our defect categories
        const type = result.type?.toLowerCase();
        console.log('Processing YOLO type:', type);
        
        // Handle different variations of the same defect
        if (type === 'cracks') detected.add('cracks');
        if (type === 'delamination') detected.add('Delamination');
        if (type?.includes('paint')) detected.add('paint-defect');

        // Handle dirt/algae/mold variations
        if (type?.includes('dirt') || type?.includes('algae') || type?.includes('mold')) {
          console.log('Matched dirt/algae/mold defect');
          detected.add('dirt-algae-and-mold');
        }
      });
    }

    console.log('Final detected defects:', Array.from(detected));
    return detected;
  }, [currentAngleAI]); // Only recalculate when currentAngleAI changes

  // Handle house type changes
  const handleHouseTypeChange = (newIsHouse: boolean) => {
    if (newIsHouse === isHouse) return; // No change
    
    if (newIsHouse) {
      // Switching to "House" - restore AI detected defects and Moondream label
      setIsHouse(true);
      setSelectedDefects(new Set(aiDetectedDefects));
      
      // Auto-select Moondream label if AI detected one
      const aiMoondreamLabel = currentAngleAI?.moondream_results?.label;
      if (aiMoondreamLabel && MOONDREAM_LABELS.some(label => label.value === aiMoondreamLabel)) {
        setMoondreamLabel(aiMoondreamLabel as MoondreamLabel);
      }
    } else {
      // Switching to "Not a House" - clear all defects and Moondream label
      setIsHouse(false);
      setSelectedDefects(new Set());
      setMoondreamLabel(null);
    }
  };

  // Handle moondream label selection
  const handleMoondreamLabelSelect = (label: MoondreamLabel) => {
    setMoondreamLabel(label === moondreamLabel ? null : label);
  };

  useEffect(() => {
    const hasHouseLabel = images.label?.toLowerCase() === 'house';
    
    const saved = localStorage.getItem(`house-${houseId}-angle-${images.angle}`);
    if (saved) {
      const data = JSON.parse(saved);
      setSelectedDefects(new Set(data.defects || []));
      setComment(data.comment || '');
      setMoondreamLabel(data.moondreamLabel || null);
      setIsHouse(data.isHouse !== undefined ? data.isHouse : hasHouseLabel);
      setSavedData(data);
    } else {
      setIsHouse(hasHouseLabel);
      // Auto-select defects that YOLO detected (not Moondream)
      setSelectedDefects(new Set(aiDetectedDefects));
      
      // Auto-select Moondream label if AI detected one
      const aiMoondreamLabel = currentAngleAI?.moondream_results?.label;
      if (aiMoondreamLabel && MOONDREAM_LABELS.some(label => label.value === aiMoondreamLabel)) {
        setMoondreamLabel(aiMoondreamLabel as MoondreamLabel);
      } else {
        setMoondreamLabel(null);
      }
      
      setComment('');
    }
  }, [houseId, images.angle, aiDetectedDefects, currentAngleAI]); // Added currentAngleAI dependency

  console.log("images", {images})
  console.log("angle", images.angle)
  console.log("houseData", {houseData})
  console.log("AI Detected Defects:", aiDetectedDefects)

  // Helper function to get icons for defects
  const getDefectIcon = (defectId: string, isSelected: boolean) => {
    const baseClass = `w-4 h-4 ${isSelected ? 'text-current' : 'text-gray-400'}`;
    
    switch (defectId) {
      case 'paint-defect':
        return (
          <svg className={baseClass} fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        );
      case 'Delamination':
        return (
          <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        );
      case 'cracks':
        return (
          <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'dirt-algae-and-mold':
        return (
          <svg className={baseClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className={baseClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

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
    // Don't allow defect selection if it's not a house
    if (!isHouse) return;
    
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
    setMoondreamLabel(null);
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
      moondreamLabel: moondreamLabel,
      timestamp: new Date().toISOString(),
    };

    const payload = {
      address: address,
      postcode: postcode,
      img_path: images.src,
      angle: images.angle,
      is_house: isHouse,
      defects: Array.from(selectedDefects),
      comment: comment.trim() || null,
      moondream_label: moondreamLabel, // Add the new field
    };

    try {
      const response = await fetch('http://127.0.0.1:8080/user-tagged-defects', {
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
      localStorage.setItem(`house-${houseId}-angle-${images.angle}`, JSON.stringify(data));
      setSavedData(data);
      
      alert('✅ Notes saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save data');
      
      // Still save to localStorage as fallback
      localStorage.setItem(`house-${houseId}-angle-${images.angle}`, JSON.stringify(data));
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
             moondreamLabel !== null ||
             isHouse !== hasHouseLabel;
    }
    
    const currentDefects = Array.from(selectedDefects).sort();
    const savedDefects = (savedData.defects || []).sort();
    
    return (
      JSON.stringify(currentDefects) !== JSON.stringify(savedDefects) ||
      comment.trim() !== (savedData.comment || '') ||
      moondreamLabel !== savedData.moondreamLabel ||
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
            <p className="text-xs text-gray-500">
              House ID: {houseId} {images.angle !== undefined && `• Angle: ${images.angle}°`}
            </p>
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
          {/* AI Detection Section */}
          {currentAngleAI && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 7H7v6h6V7z" />
                    <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 010-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                  </svg>
                  AI Analysis
                </h3>
              </div>

              <div className="space-y-2">
                {/* YOLO Results */}
                {currentAngleAI?.yolo_results && currentAngleAI.yolo_results?.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-purple-900 mb-2">YOLO Detection:</div>
                    {currentAngleAI.yolo_results.map((result: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-purple-700 font-medium">{result.type}</span>
                        <span className="text-purple-600">
                          {(result.confidence * 100).toFixed(1)}% confidence
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Moondream Results */}
                {currentAngleAI.moondream_results && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs font-medium text-blue-900 mb-2">
                      Moondream Assessment:
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        currentAngleAI.moondream_results.label === 'ok' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {currentAngleAI.moondream_results.label?.toUpperCase()}
                      </span>
                      <span className="text-xs text-blue-600">
                        {(currentAngleAI.moondream_results.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    {currentAngleAI.moondream_results.raw && (
                      <p className="text-xs text-blue-700 leading-relaxed">
                        {currentAngleAI.moondream_results.raw}
                      </p>
                    )}
                  </div>
                )}

                {/* Auto-detection Notice (YOLO only) */}
                {isHouse && aiDetectedDefects.size > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Defect tags have been auto-selected based on YOLO detection</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No AI Data Message */}
          {!currentAngleAI && (
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">No AI analysis available for this angle</p>
              </div>
            </div>
          )}

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

          {/* NEW: Moondream Label Section */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Moondream Label</h3>
            <div className="grid grid-cols-3 gap-2">
              {MOONDREAM_LABELS.map((labelOption) => {
                const isSelected = moondreamLabel === labelOption.value;
                const isAIDetected = currentAngleAI?.moondream_results?.label === labelOption.value;
                
                return (
                  <button
                    key={labelOption.value}
                    onClick={() => handleMoondreamLabelSelect(labelOption.value)}
                    className={`p-2 text-sm font-medium rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between group relative ${
                      isSelected
                        ? `${labelOption.color} border-opacity-100 shadow-sm transform scale-[1.02]`
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    } ${isAIDetected ? 'ring-2 ring-purple-300' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      {labelOption.label}
                    </span>
                    
                    {/* Selection Indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-current border-current' 
                        : 'bg-white border-gray-300 group-hover:border-gray-400'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* AI Detection Badge */}
                    {isAIDetected && (
                      <div className="absolute -top-1 -right-1">
                        <div className="bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Auto-selection notice for Moondream Label */}
            {currentAngleAI?.moondream_results?.label && moondreamLabel === currentAngleAI.moondream_results.label && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Moondream label has been auto-selected based on AI assessment</span>
                </div>
              </div>
            )}
            
            {/* Helper text */}
            <p className="text-xs text-gray-500 mt-2">
              Select the overall condition assessment for this property
            </p>
          </div>

          {/* House Type Toggle */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Image Type</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleHouseTypeChange(true)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border-2 cursor-pointer transition-all flex items-center gap-2 ${
                  isHouse
                    ? 'bg-blue-100 text-blue-700 border-blue-400 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
              >
                <svg className={`w-4 h-4 ${isHouse ? 'text-blue-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                House
              </button>
              <button
                onClick={() => handleHouseTypeChange(false)}
                className={`px-3 py-2 text-sm font-medium rounded-lg border-2 cursor-pointer transition-all flex items-center gap-2 ${
                  !isHouse
                    ? 'bg-red-100 text-red-700 border-red-400 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
              >
                <svg className={`w-4 h-4 ${!isHouse ? 'text-red-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Not a House
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {isHouse 
                ? '✓ This image contains a house - defect tagging enabled' 
                : '✗ This image does not contain a house - defect tagging disabled'}
            </p>
          </div>

          {/* Defects Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Select Defects</h3>
              {selectedDefects.size > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {selectedDefects.size} selected
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {DEFECT_CATEGORIES.map((defect) => {
                const isSelected = selectedDefects.has(defect.id);
                const isAIDetected = aiDetectedDefects.has(defect.id);
                
                return (
                  <button
                    key={defect.id}
                    onClick={() => toggleDefect(defect.id)}
                    className={`p-3 text-sm font-medium rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between group relative ${
                      isSelected
                        ? `${defect.color} border-opacity-100 shadow-sm transform scale-[1.02]`
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    } ${isAIDetected ? 'ring-2 ring-purple-300' : ''} ${
                      !isHouse ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={!isHouse}
                  >
                    <span className="flex items-center gap-2">
                      {/* Defect Icon */}
                      {getDefectIcon(defect.id, isSelected)}
                      {defect.label}
                    </span>
                    
                    {/* Selection Indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-current border-current' 
                        : 'bg-white border-gray-300 group-hover:border-gray-400'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* AI Detection Badge (YOLO only) */}
                    {isAIDetected && isHouse && (
                      <div className="absolute -top-1 -right-1">
                        <div className="bg-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Disabled state message */}
            {!isHouse && (
              <div className="mt-3 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Defect tagging is disabled when image is marked as "Not a House"</span>
                </div>
              </div>
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
            disabled={selectedDefects.size === 0 && comment.trim().length === 0 && moondreamLabel === null && !hasChanges()}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
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