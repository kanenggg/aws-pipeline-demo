import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

interface GradeDistributionData {
  grade: string;
  count: number;
}

interface GradeDistributionChartProps {
  data: GradeDistributionData[];
}

export const GradeDistributionChart = ({
  data,
}: GradeDistributionChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm italic">
        No grade distribution data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 30, right: 30, left: 10, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#e2e8f0"
        />

        <XAxis
          dataKey="grade"
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          tick={{ fill: "#64748b", fontSize: 12 }}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#64748b", fontSize: 12 }}
          allowDecimals={false}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          }}
        />

        <Area
          type="monotone"
          dataKey="count"
          name="Number of Students"
          stroke="#10b981"
          strokeWidth={3}
          fill="url(#colorCount)"
          animationDuration={1500}
        >
          <LabelList
            dataKey="count"
            position="top"
            offset={15}
            fill="#065f46"
            style={{ fontWeight: "600", fontSize: "12px" }}
          />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
};
