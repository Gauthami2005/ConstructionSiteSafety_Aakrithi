import React, { useEffect, useState } from "react";
import type { MlAlertEntry, MlAlertsResponse } from "@shared/api";

export default function MLAlertFeed(): JSX.Element {
  const [alerts, setAlerts] = useState<MlAlertEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const resp = await fetch("/api/ml/alerts");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: MlAlertsResponse = await resp.json();
      setAlerts((data?.alerts || []).sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1)));
      setError(null);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts(false);
    const id = setInterval(() => loadAlerts(false), 3000); // poll every 3s
    return () => clearInterval(id);
  }, []);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Live PPE Alerts (ML)</h3>
        <button 
          onClick={() => loadAlerts(true)} 
          disabled={loading}
          className="px-3 py-1 rounded bg-neon-orange text-black font-semibold disabled:opacity-50 hover:scale-105 transition-transform"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && <div className="text-sm text-gray-300">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      {!loading && alerts.length === 0 && !error && (
        <div className="text-sm text-gray-300">No ML alerts yet. Click Capture and Analyze to start.</div>
      )}

      <ul className="space-y-2">
        {alerts.map((a) => (
          <li key={a.id} className="rounded border border-white/10 p-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">{a.message ?? `Detected: ${a.classes.join(", ")}`}</span>
              <span className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-300 mt-1">
              <span className={`inline-block px-2 py-0.5 rounded ${a.level === "critical" ? "bg-red-600" : a.level === "warning" ? "bg-yellow-500" : "bg-blue-500"} text-black font-semibold`}>{a.level ?? "watch"}</span>
              {a.siteLocation && <span className="ml-2">Location: {a.siteLocation}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}