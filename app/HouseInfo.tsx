import { HouseData } from "./types";

export default function HouseInfo({ house }: { house: HouseData }) {
  return (
    <div className="p-4">
      <h2 className="font-semibold text-gray-800 mb-2 truncate" title={house.address}>
        {house.address}
      </h2>

      <div className="text-sm text-gray-600 mb-1">
        <strong>Lat:</strong> {house.lat.toFixed(6)}
      </div>
      <div className="text-sm text-gray-600 mb-3">
        <strong>Lon:</strong> {house.lon.toFixed(6)}
      </div>

      {house.defects && house.defects.length > 0 ? (
        <ul className="space-y-1">
          {house.defects.slice(0, 3).map((def, i) => (
            <li
              key={i}
              className="text-sm text-gray-600 flex justify-between"
            >
              <span className="truncate mr-2">{def.type}</span>
              <span className="text-gray-400 flex-shrink-0">
                {(def.confidence * 100).toFixed(1)}%
              </span>
            </li>
          ))}
          {house.defects.length > 3 && (
            <li className="text-xs text-gray-400 italic">
              +{house.defects.length - 3} more
            </li>
          )}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic">
          No defects detected
        </p>
      )}
    </div>
  );
}