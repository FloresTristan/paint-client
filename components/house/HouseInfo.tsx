import { HouseData } from "../../types/types";

export default function HouseInfo({ house }: { house: HouseData }) {
  const assessment = house.defect_assessment || house.moondream_defects;
  const label = assessment?.label;

  const badge =
    label === "needs-repaint"
      ? { text: "Needs Repaint", cls: "bg-amber-100 text-amber-700" }
      : label === "ok"
      ? { text: "OK", cls: "bg-green-100 text-green-700" }
      : null;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between mb-1 gap-2">
        <h2
          className="font-semibold text-gray-800 truncate flex-1 text-sm"
          title={house.address}
        >
          {house.address}
        </h2>
        {badge && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
            {badge.text}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        {house.lat.toFixed(4)}, {house.lon.toFixed(4)}
      </p>

      {house.yolo_results && house.yolo_results.length > 0 ? (
        <ul className="space-y-1">
          {house.yolo_results.slice(0, 3).map((def, i) => (
            <li key={i} className="text-xs text-gray-600 flex justify-between">
              <span className="truncate mr-2">{def.type}</span>
              <span className="text-gray-400 shrink-0">
                {(def.confidence * 100).toFixed(1)}%
              </span>
            </li>
          ))}
          {house.yolo_results.length > 3 && (
            <li className="text-xs text-gray-400 italic">
              +{house.yolo_results.length - 3} more
            </li>
          )}
        </ul>
      ) : (
        <p className="text-xs text-gray-400 italic">No defects detected</p>
      )}
    </div>
  );
}
