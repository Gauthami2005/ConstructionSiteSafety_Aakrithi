import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { day: "Mon", violations: 12, high: 3, medium: 5, low: 4 },
  { day: "Tue", violations: 9, high: 2, medium: 3, low: 4 },
  { day: "Wed", violations: 15, high: 5, medium: 6, low: 4 },
  { day: "Thu", violations: 8, high: 2, medium: 2, low: 4 },
  { day: "Fri", violations: 14, high: 4, medium: 5, low: 5 },
  { day: "Sat", violations: 5, high: 1, medium: 2, low: 2 },
  { day: "Sun", violations: 3, high: 0, medium: 1, low: 2 },
];

function CustomTooltip(props: any) {
  const { active, payload } = props;
  if (active && payload && payload[0]) {
    return (
      <div className="glass-card-sm p-3 rounded-lg border border-neon-orange/50">
        <p className="text-white font-medium text-sm">{payload[0].payload.day}</p>
        <p className="text-neon-orange text-sm">
          {payload[0].payload.violations} violations
        </p>
        <p className="text-gray-400 text-xs mt-1">
          High: {payload[0].payload.high} | Medium: {payload[0].payload.medium}
        </p>
      </div>
    );
  }
  return null;
}

function BarChartComponent() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis
          dataKey="day"
          stroke="rgba(255, 255, 255, 0.5)"
          style={{ fontSize: "12px" }}
        />
        <YAxis
          stroke="rgba(255, 255, 255, 0.5)"
          style={{ fontSize: "12px" }}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(255, 122, 0, 0.1)" }}
        />
        <Bar
          dataKey="violations"
          fill="url(#colorGradient)"
          radius={[8, 8, 0, 0]}
          animationDuration={800}
        />
        <defs>
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF7A00" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#FF7A00" stopOpacity={0.2} />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyViolationsChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <h3 className="text-xl font-bold text-white mb-6">Daily Violations</h3>
      {isClient && <div className="w-full h-64"><BarChartComponent /></div>}

      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">Avg/Day</p>
          <p className="text-2xl font-bold text-neon-orange">9.1</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">Peak Day</p>
          <p className="text-2xl font-bold text-neon-orange">Wed (15)</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">This Week</p>
          <p className="text-2xl font-bold text-neon-orange">66</p>
        </div>
      </div>
    </div>
  );
}
