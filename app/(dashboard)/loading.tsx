export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="text-digimon-green font-pixel text-lg animate-pulse">
        CARGANDO...
      </div>
      <div className="w-32 h-4 border-4 border-digimon-green relative overflow-hidden">
        <div className="bg-digimon-green h-full w-1/3 animate-ping" />
      </div>
    </div>
  );
}
