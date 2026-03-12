import { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle, Activity, Zap } from "lucide-react";
import { UploadStatsResponse } from "@shared/api";

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "orange" | "green" | "cyan" | "red";
  trend?: string;
}

function getColorClasses(color: string) {
  const colorMap: Record<string, { text: string; bg: string; border: string }> = {
    orange: {
      text: "text-neon-orange",
      bg: "from-neon-orange/20 to-transparent",
      border: "border-neon-orange/20",
    },
    red: {
      text: "text-red-500",
      bg: "from-red-500/20 to-transparent",
      border: "border-red-500/20",
    },
    green: {
      text: "text-neon-green",
      bg: "from-neon-green/20 to-transparent",
      border: "border-neon-green/20",
    },
    cyan: {
      text: "text-neon-cyan",
      bg: "from-neon-cyan/20 to-transparent",
      border: "border-neon-cyan/20",
    },
  };
  return colorMap[color];
}

export function StatCards() {
  const [totalUploads, setTotalUploads] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUploadStats = async () => {
      try {
        const response = await fetch("/api/upload/stats");
        const data: UploadStatsResponse = await response.json();
        setTotalUploads(data.totalUploads);
      } catch (error) {
        console.error("Error fetching upload stats:", error);
        setTotalUploads(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUploadStats();
  }, []);

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const stats: StatCard[] = [
    {
      label: "Total Uploads",
      value: isLoading ? "..." : formatNumber(totalUploads),
      icon: <TrendingUp className="w-6 h-6" />,
      color: "orange",
      trend: totalUploads > 0 ? "Active uploads" : "No uploads yet",
    },
    {
      label: "Violations Detected",
      value: "34",
      icon: <AlertTriangle className="w-6 h-6" />,
      color: "red",
      trend: "-8% from last week",
    },
    {
      label: "Risk Score",
      value: "24%",
      icon: <Activity className="w-6 h-6" />,
      color: "green",
      trend: "Low risk",
    },
    {
      label: "Active Sites",
      value: "12",
      icon: <Zap className="w-6 h-6" />,
      color: "cyan",
      trend: "Fully operational",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      {stats.map((stat, index) => {
        const colors = getColorClasses(stat.color);
        return (
          <div
            key={stat.label}
            className="glass-card-sm p-6 group hover:border-white/20 transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} rounded-xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`${colors.text} transition-transform group-hover:scale-110 duration-300`}>
                  {stat.icon}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
                <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                {stat.trend && (
                  <p className={`text-xs ${colors.text}`}>{stat.trend}</p>
                )}
              </div>
            </div>

            {/* Icon glow background */}
            <div className={`absolute top-6 right-6 w-12 h-12 bg-gradient-to-br ${colors.bg} rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10`}></div>
          </div>
        );
      })}
    </div>
  );
}
