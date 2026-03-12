import { useEffect, useState } from "react";

interface RainySite {
  siteLocation: string;
  firstRainAt?: string;
  probability?: number;
  rainVolumeMm?: number;
}

export function RainyLocations({ hours = 6 }: { hours?: number }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<RainySite[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`/api/weather/rainy-sites?hours=${hours}`);
        const data = await resp.json();
        setLocations(Array.isArray(data.locations) ? data.locations : []);
      } catch (e) {
        console.error(e);
        setError("Failed to load weather data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [hours]);

  return (
    <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Rain Predicted (next {hours}h)</h3>
        <span className="text-xs text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10">OpenWeather</span>
      </div>
      {loading ? (
        <p className="text-gray-400">Loading forecast…</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : locations.length === 0 ? (
        <p className="text-gray-400">No rain predicted for tracked site locations.</p>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => (
            <li key={loc.siteLocation} className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{loc.siteLocation}</span>
                <span className="text-xs text-neon-orange font-semibold">{loc.rainVolumeMm ? `${loc.rainVolumeMm} mm` : loc.probability ? `${Math.round((loc.probability || 0) * 100)}%` : "Rain"}</span>
              </div>
              {loc.firstRainAt && (
                <p className="text-xs text-gray-400 mt-1">First rain at {new Date(loc.firstRainAt).toLocaleString()}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}