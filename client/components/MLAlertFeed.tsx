import React, { useEffect, useState, useCallback } from "react";
import type { MlAlertEntry, MlAlertsResponse } from "@shared/api";
import { RefreshCw, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

export default function MLAlertFeed(): JSX.Element {
  const [alerts, setAlerts] = useState<MlAlertEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const loadAlerts = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      
      const resp = await fetch("/api/ml/alerts");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      
      const data: MlAlertsResponse = await resp.json();
      const sortedAlerts = (data?.alerts || []).sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setAlerts(sortedAlerts);
      setLastRefreshedAt(new Date());
      setError(null);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      if (isManual) {
        // Add a small artificial delay so the user can see the "Refreshing" state
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  }, []);

  useEffect(() => {
    loadAlerts(false);
    const id = setInterval(() => loadAlerts(false), 5000); // poll every 5s
    return () => clearInterval(id);
  }, [loadAlerts]);

  return (
    <div className="glass-card p-6 border border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-neon-orange/5 blur-3xl -z-10"></div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-orange/10 flex items-center justify-center border border-neon-orange/20">
            <RefreshCw className={`w-5 h-5 text-neon-orange ${isRefreshing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Live PPE Alerts</h3>
            <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
              <Clock className="w-3 h-3" />
              Last Updated: {lastRefreshedAt.toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => loadAlerts(true)} 
          disabled={isRefreshing}
          className="group relative flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-50 overflow-hidden"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!isRefreshing && alerts.length === 0 && !error && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-gray-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-gray-300 font-bold uppercase tracking-wider text-sm">No Alerts Detected</p>
            <p className="text-gray-500 text-xs max-w-[200px]">Ensure the AI model is running on your webcam feed.</p>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {alerts.map((a) => (
          <div 
            key={a.id} 
            className={`p-4 rounded-xl border transition-all duration-300 animate-slide-up ${
              a.level === "critical" 
                ? "bg-red-500/10 border-red-500/20 hover:border-red-500/40" 
                : a.level === "warning"
                ? "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40"
                : "bg-neon-cyan/5 border-neon-cyan/20 hover:border-neon-cyan/40"
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    a.level === "critical" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : 
                    a.level === "warning" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" : 
                    "bg-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.8)]"
                  }`}></span>
                  <span className="text-sm font-black text-white uppercase tracking-wider">
                    {a.level || "Watch"}
                  </span>
                </div>
                <p className="text-gray-300 text-sm font-medium leading-relaxed">
                  {a.message || `Detected PPE violations: ${a.classes.join(", ")}`}
                </p>
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap bg-white/5 px-2 py-1 rounded">
                {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div className="flex items-center gap-3 pt-3 border-t border-white/5">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <Clock className="w-3 h-3 text-neon-orange" />
                {a.siteLocation || "Live Webcam"}
              </div>
              {a.classes && a.classes.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                  {a.classes.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-gray-400 uppercase font-black tracking-tighter">
                      {c.replace("no_", "")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}