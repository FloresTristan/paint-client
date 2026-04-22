
export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">

      {/* Image area — matches h-48 */}
      <div className="relative w-full h-48 bg-gray-200 animate-pulse" />

      {/* HouseInfo body */}
      <div className="p-4 animate-pulse">

        {/* Address — matches font-semibold truncate */}
        <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-4" />

        {/* Lat */}
        <div className="h-3 bg-gray-200 rounded-full w-1/2 mb-2" />

        {/* Lon */}
        <div className="h-3 bg-gray-200 rounded-full w-1/2 mb-4" />

        {/* Defect rows — mimics the 3-item ul */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="h-3 bg-gray-200 rounded-full w-2/5" />
            <div className="h-3 bg-gray-200 rounded-full w-10" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-3 bg-gray-200 rounded-full w-1/3" />
            <div className="h-3 bg-gray-200 rounded-full w-10" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-3 bg-gray-200 rounded-full w-2/5" />
            <div className="h-3 bg-gray-200 rounded-full w-10" />
          </div>
        </div>

      </div>
    </div>
  );
}