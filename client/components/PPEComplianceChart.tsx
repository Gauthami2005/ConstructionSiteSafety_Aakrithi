import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { week: "Week 1", helmet: 94, vest: 92, gloves: 88, bootsFeet: 90 },
  { week: "Week 2", helmet: 96, vest: 94, gloves: 91, bootsFeet: 92 },
  { week: "Week 3", helmet: 98, vest: 96, gloves: 94, bootsFeet: 95 },
  { week: "Week 4", helmet: 97, vest: 95, gloves: 92, bootsFeet: 93 },
  { week: "Week 5", helmet: 99, vest: 97, gloves: 95, bootsFeet: 96 },
  { week: "Week 6", helmet: 100, vest: 99, gloves: 97, bootsFeet: 98 },
];

function CustomTooltip(props: any) {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    return (
      <div className="glass-card-sm p-3 rounded-lg border border-neon-cyan/50">
        <p className="text-white font-medium text-sm">{payload[0].payload.week}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function LineChartComponent() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis
          dataKey="week"
          stroke="rgba(255, 255, 255, 0.5)"
          style={{ fontSize: "12px" }}
        />
        <YAxis
          stroke="rgba(255, 255, 255, 0.5)"
          style={{ fontSize: "12px" }}
          domain={[80, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "12px" }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="helmet"
          stroke="#39FF14"
          strokeWidth={2}
          dot={{ fill: "#39FF14", r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={1000}
          name="Helmet"
        />
        <Line
          type="monotone"
          dataKey="vest"
          stroke="#00FFFF"
          strokeWidth={2}
          dot={{ fill: "#00FFFF", r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={1000}
          name="Safety Vest"
        />
        <Line
          type="monotone"
          dataKey="gloves"
          stroke="#FF7A00"
          strokeWidth={2}
          dot={{ fill: "#FF7A00", r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={1000}
          name="Gloves"
        />
        <Line
          type="monotone"
          dataKey="bootsFeet"
          stroke="#A78BFA"
          strokeWidth={2}
          dot={{ fill: "#A78BFA", r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={1000}
          name="Safety Boots"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PPEComplianceChart() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
      <h3 className="text-xl font-bold text-white mb-6">PPE Compliance Rate</h3>
      {isClient && <div className="w-full h-64"><LineChartComponent /></div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">Helmet</p>
          <p className="text-2xl font-bold text-neon-green">100%</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">Safety Vest</p>
          <p className="text-2xl font-bold text-neon-cyan">99%</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">Gloves</p>
          <p className="text-2xl font-bold text-neon-orange">97%</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-1">Safety Boots</p>
          <p className="text-2xl font-bold text-purple-400">98%</p>
        </div>
      </div>
    </div>
  );
}
