"use client";

import React, { useState } from "react";

type Defect = {
  type: string;
  confidence: number;
};

type HouseData = {
  address: string;
  imageUrl: string;
  defects: Defect[];
};

export default function ZipcodeClient() {
  const [zipCode, setZipCode] = useState<string>("");
  const [results, setResults] = useState<HouseData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!zipCode.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(`/api/analyze-zipcode?zip=${encodeURIComponent(zipCode)}`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data: HouseData[] = await response.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">
        Property Defect Analyzer
      </h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Enter ZIP code"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </form>

      {loading && (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-4">
              <div className="bg-gray-200 h-48 rounded-md mb-3" />
              <div className="h-4 bg-gray-200 w-2/3 mb-2 rounded" />
              <div className="h-3 bg-gray-200 w-1/2 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}

      {!loading && results.length > 0 && (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((house, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <img
                src={house.imageUrl}
                alt={house.address}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h2 className="font-semibold text-gray-800 mb-2">
                  {house.address}
                </h2>
                {house.defects.length > 0 ? (
                  <ul className="space-y-1">
                    {house.defects.map((defect, dIdx) => (
                      <li
                        key={dIdx}
                        className="text-sm text-gray-600 flex justify-between"
                      >
                        <span>{defect.type}</span>
                        <span className="text-gray-400">
                          {(defect.confidence * 100).toFixed(1)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">No defects found</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
