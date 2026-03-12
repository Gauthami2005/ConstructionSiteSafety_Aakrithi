import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low" | "critical" | "warning" | "watch" | "ok";
  time: string;
  location?: string;
  worker_id?: string;
  worker_name?: string;
  score?: number;
  reasons?: string[];
  recommended_actions?: string[];
}

// Map risk alert levels to severity
function mapAlertLevelToSeverity(alertLevel: string): "high" | "medium" | "low" {
  switch (alertLevel) {
    case "critical":
      return "high";
    case "warning":
      return "high";
    case "watch":
      return "medium";
    case "ok":
      return "low";
    default:
      return "medium";
  }
}

// Format time ago
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function getSeverityBadge(severity: string) {
  const severityMap: Record<string, { emoji: string; bg: string; text: string }> = {
    high: { emoji: "🔴", bg: "bg-red-500/20", text: "text-red-400" },
    medium: { emoji: "🟡", bg: "bg-yellow-500/20", text: "text-yellow-400" },
    low: { emoji: "🟢", bg: "bg-green-500/20", text: "text-green-400" },
    critical: { emoji: "🔴", bg: "bg-red-500/20", text: "text-red-400" },
    warning: { emoji: "🟠", bg: "bg-orange-500/20", text: "text-orange-400" },
    watch: { emoji: "🟡", bg: "bg-yellow-500/20", text: "text-yellow-400" },
    ok: { emoji: "🟢", bg: "bg-green-500/20", text: "text-green-400" },
  };
  return severityMap[severity] || severityMap.medium;
}

// Helper function to create alert from data
function createAlertFromData(alertData: any): Alert | null {
  if (!alertData) {
    console.warn("AlertFeed: No alert data provided");
    return null;
  }

  // Validate required fields
  if (!alertData.alert_level || alertData.score === undefined) {
    console.warn("AlertFeed: Missing required alert data fields", alertData);
    return null;
  }

  // Create alert from risk score data
  const alertLevel = alertData.alert_level || "ok";
  const severity = mapAlertLevelToSeverity(alertLevel);
  
  const title = alertLevel === "critical" 
    ? `Critical Risk: ${alertData.worker_name || "Worker"}`
    : alertLevel === "warning"
    ? `Warning: ${alertData.worker_name || "Worker"}`
    : alertLevel === "watch"
    ? `Watch: ${alertData.worker_name || "Worker"}`
    : `Worker Check: ${alertData.worker_name || "Worker"}`;

  const description = alertData.reasons && Array.isArray(alertData.reasons) 
    ? alertData.reasons.join(". ") 
    : `Risk score: ${alertData.score}/100`;

  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    title,
    description,
    severity,
    time: formatTimeAgo(alertData.timestamp || new Date().toISOString()),
    worker_id: alertData.worker_id,
    worker_name: alertData.worker_name,
    score: alertData.score,
    reasons: alertData.reasons,
    recommended_actions: alertData.recommended_actions,
  };
}

// Load alerts from localStorage
function loadAlertsFromStorage(): Alert[] {
  try {
    const stored = localStorage.getItem("construction-site-alerts");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Filter out alerts older than 24 hours and format time
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return parsed
        .filter((alert: any) => {
          try {
            // If time is ISO string, parse it directly
            if (alert.time && !alert.time.includes("ago")) {
              const alertTime = new Date(alert.time).getTime();
              return alertTime > oneDayAgo;
            }
            // For "X ago" format, keep the alert (assume it's recent)
            return true;
          } catch {
            // If parsing fails, keep the alert
            return true;
          }
        })
        .map((alert: any) => {
          // Format time if it's an ISO string
          if (alert.time && !alert.time.includes("ago")) {
            return {
              ...alert,
              time: formatTimeAgo(alert.time),
            };
          }
          return alert;
        });
    }
  } catch (error) {
    console.error("Error loading alerts from storage:", error);
  }
  return [];
}

// Save alerts to localStorage
function saveAlertsToStorage(alerts: Alert[]) {
  try {
    localStorage.setItem("construction-site-alerts", JSON.stringify(alerts));
  } catch (error) {
    console.error("Error saving alerts to storage:", error);
  }
}

export function AlertFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch alerts from server on mount
  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/workers/alerts');
      const data = await response.json();
      
      if (data.alerts && Array.isArray(data.alerts)) {
        // Convert server alerts to local Alert format
        const serverAlerts: Alert[] = data.alerts.map((alertData: any) => ({
          id: alertData.id,
          title: alertData.alertLevel === "critical" 
            ? `Critical Risk: ${alertData.workerName}`
            : alertData.alertLevel === "warning"
            ? `Warning: ${alertData.workerName}`
            : alertData.alertLevel === "watch"
            ? `Watch: ${alertData.workerName}`
            : `Worker Check: ${alertData.workerName}`,
          description: alertData.riskReasons && Array.isArray(alertData.riskReasons) 
            ? alertData.riskReasons.join(". ") 
            : `Risk score: ${alertData.riskScore}/100`,
          severity: mapAlertLevelToSeverity(alertData.alertLevel),
          time: formatTimeAgo(alertData.timestamp),
          worker_id: alertData.workerId,
          worker_name: alertData.workerName,
          score: alertData.riskScore,
          reasons: alertData.riskReasons,
          recommended_actions: alertData.recommendedActions,
        }));
        
        setAlerts(serverAlerts);
      }
    } catch (error) {
      console.error("Error fetching alerts from server:", error);
      // Fallback to localStorage
      const stored = loadAlertsFromStorage();
      setAlerts(stored);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Listen for new alert events
    const handleNewAlert = (event: Event) => {
      console.log("AlertFeed: Received newAlert event", event);
      const customEvent = event as CustomEvent;
      const alertData = customEvent.detail;
      console.log("AlertFeed: Alert data:", alertData);

      const newAlert = createAlertFromData(alertData);
      if (!newAlert) {
        return;
      }

      console.log("AlertFeed: Creating new alert:", newAlert);

      // Add to beginning of alerts array (newest first)
      setAlerts((prev) => {
        const updated = [newAlert, ...prev].slice(0, 50); // Keep last 50 alerts
        console.log("AlertFeed: Updated alerts array, total alerts:", updated.length, "New alert added:", newAlert.title);
        // Save to localStorage
        saveAlertsToStorage(updated);
        return updated;
      });
    };

    // Also listen for storage events (cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "construction-site-alerts") {
        console.log("AlertFeed: Storage changed, reloading alerts");
        const stored = loadAlertsFromStorage();
        setAlerts(stored);
      }
    };

    console.log("AlertFeed: Setting up event listener for 'newAlert'");
    
    // Add event listener with capture phase to catch events
    window.addEventListener("newAlert", handleNewAlert as EventListener, true);
    document.addEventListener("newAlert", handleNewAlert as EventListener, true);
    window.addEventListener("storage", handleStorageChange);

    console.log("AlertFeed: Component mounted, listening for alerts on window and document");

    return () => {
      console.log("AlertFeed: Cleaning up event listeners");
      window.removeEventListener("newAlert", handleNewAlert as EventListener, true);
      document.removeEventListener("newAlert", handleNewAlert as EventListener, true);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Save alerts to localStorage whenever they change
  useEffect(() => {
    saveAlertsToStorage(alerts);
  }, [alerts]);

  return (
    <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neon-orange animate-pulse"></div>
          Live Alert Feed
        </h3>
        <span className="text-xs text-gray-400 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          Real-time
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <p>Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No alerts yet. Alerts will appear here when workers are registered.</p>
          </div>
        ) : (
          alerts.map((alert, index) => {
            const severity = getSeverityBadge(alert.severity);
            const displaySeverity = alert.severity === "critical" 
              ? "Critical" 
              : alert.severity === "warning"
              ? "Warning"
              : alert.severity === "watch"
              ? "Watch"
              : alert.severity === "ok"
              ? "OK"
              : alert.severity === "high"
              ? "High"
              : alert.severity === "medium"
              ? "Medium"
              : "Low";

            return (
              <div
                key={alert.id}
                className="group relative p-4 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-300 animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  {/* Severity Badge */}
                  <div
                    className={`text-xl pt-0.5 flex-shrink-0 ${severity.emoji.length > 1 ? "text-2xl" : ""}`}
                  >
                    {severity.emoji}
                  </div>

                  {/* Alert Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-white">{alert.title}</h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {alert.score !== undefined && (
                          <span className="text-xs font-bold text-neon-orange">
                            {alert.score}/100
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${severity.text}`}>
                          {displaySeverity}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{alert.description}</p>
                    {alert.recommended_actions && alert.recommended_actions.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">Actions:</p>
                        <ul className="text-xs text-gray-400 list-disc list-inside">
                          {alert.recommended_actions.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {alert.time}
                      </span>
                      {alert.worker_id && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>ID: {alert.worker_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hover action */}
                <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[20px] border-t-[20px] border-l-transparent border-t-neon-orange/30 rounded-tl group-hover:border-t-neon-orange/50 transition-colors opacity-0 group-hover:opacity-100"></div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-6 border-t border-white/10 text-center">
        <button 
          onClick={() => {
            // Test alert dispatch
            const testAlert = {
              worker_id: "TEST-001",
              worker_name: "Test Worker",
              alert_level: "warning",
              score: 65,
              reasons: ["Test alert for debugging"],
              recommended_actions: ["This is a test alert"],
              timestamp: new Date().toISOString(),
            };
            console.log("Manually dispatching test alert:", testAlert);
            window.dispatchEvent(new CustomEvent("newAlert", { detail: testAlert }));
          }}
          className="text-neon-cyan hover:text-neon-orange text-sm font-medium transition-colors duration-300 mr-4"
        >
          Test Alert
        </button>
        <button className="text-neon-cyan hover:text-neon-orange text-sm font-medium transition-colors duration-300">
          View All Alerts →
        </button>
      </div>
    </div>
  );
}
