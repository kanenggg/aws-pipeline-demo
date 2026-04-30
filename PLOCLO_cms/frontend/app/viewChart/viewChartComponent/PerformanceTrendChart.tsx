
import React, { useMemo } from "react";
import {
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";

interface PerformanceTrendChartProps {
  chartData: any[];
  balanceData?: any[];
  visibleLines?: Record<string, boolean>;
  getGradeColor?: (grade: string) => string;
  xAxisKey: string;
  maxScoreKey?: string;
  minScoreKey?: string;
  allAvgKey?: string;
  maxScorePosKey: string;
  midScoreKey?: string;
  individualStudentData?: any[];
}

export const PerformanceTrendChart = ({
  chartData,
  balanceData,
  visibleLines,
  getGradeColor,
  xAxisKey,
  maxScoreKey,
  maxScorePosKey,
  minScoreKey,
  midScoreKey,
  allAvgKey,
  individualStudentData,
}: PerformanceTrendChartProps) => {
  // Extract unique grades to show individual grade radars if toggled
  const { t } = useTranslation("common");
  // 1. ดึงเกรดที่มีอยู่จริงจาก balanceData
  const uniqueGrades = useMemo(() => {
    if (!balanceData) return [];
    return balanceData.map((d) => d.grade);
  }, [balanceData]);

  // 2. รวมข้อมูลเพื่อให้ Radar ของเกรดแสดงผลบนแกนเดียวกับภาพรวม
  // เราจะนำค่าเฉลี่ยของแต่ละเกรดไปใส่ใน chartData เพื่อให้ Recharts วาดได้
  const finalChartData = useMemo(() => {
    return chartData.map((point) => {
      const updatedPoint = { ...point };

      uniqueGrades.forEach((grade) => {
        const gradeInfo = balanceData?.find((d) => d.grade === grade);
        // ค้นหาค่าคะแนนจาก ploScores, cloScores หรือ assignmentScores
        const scoreEntry =
          gradeInfo?.ploScores?.find((p: any) => p.label === point[xAxisKey]) ||
          gradeInfo?.cloScores?.find((c: any) => c.label === point[xAxisKey]) ||
          gradeInfo?.assignmentScores?.find(
            (a: any) => a.label === point[xAxisKey],
          );

        if (scoreEntry) {
          updatedPoint[`avg_grade_${grade}`] = scoreEntry.value;
        }
      });

      return updatedPoint;
    });
  }, [chartData, balanceData, uniqueGrades, xAxisKey]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={finalChartData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="5 5"
          vertical={false}
          stroke="#e2e8f0"
          // strokeOpacity={0.9}
        />
        <XAxis
          dataKey={xAxisKey}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          }}
          cursor={{
            stroke: "#e2e8f0",
            strokeWidth: 2,
            strokeDasharray: "5 5",
            fill: "transparent", // เปลี่ยนจาก fill เป็นเส้น stroke แทนจะดูสะอาดกว่า
          }}
          formatter={(value: number) => value.toFixed(2)}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={40}
          iconType="circle"
        />
        <Bar
          dataKey={maxScorePosKey}
          name={t("fullScore")}
          fill="#93e3f5"
          radius={[6, 6, 0, 0]}
          barSize={300}
        />
        {visibleLines?.maxScore && (
          <Line
            type="monotone"
            dataKey={maxScoreKey}
            name={t("maxScore")}
            stroke="#22c55e"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={2}
          />
        )}
        {visibleLines?.minScore && (
          <Line
            type="monotone"
            dataKey={minScoreKey}
            name={t("minScore")}
            stroke="#ef4444"
            strokeDasharray="5 5"
            dot={false}
            strokeWidth={2}
          />
        )}
        {visibleLines?.allAvg && (
          <Line
            type="monotone"
            dataKey={allAvgKey}
            name={t("averageScore")}
            stroke="#6366f1"
            strokeWidth={4}
            dot={{ r: 6, fill: "#6366f1" }}
          />
        )}
        {visibleLines?.midScore && (
          <Line
            type="monotone"
            name={t("medianScore")}
            dataKey={midScoreKey}
            stroke="#f59e0b"
            strokeDasharray="3 4 5 2"
            dot={false}
            strokeWidth={2}
          />
        )}
        {uniqueGrades.map(
          (grade) =>
            visibleLines?.[`avg_grade_${grade}`] && (
              <Line
                key={grade}
                name={`Grade ${grade}`}
                dataKey={`avg_grade_${grade}`}
                stroke={getGradeColor?.(grade)}
                fill={getGradeColor?.(grade)}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            ),
        )}
        {individualStudentData && (
          <Line
            type="monotone"
            dataKey={(dataPoint) => {
              const key = dataPoint[xAxisKey];
              const value = individualStudentData[key];
              return value ? Number(value) : 0;
            }}
            name={`${individualStudentData.Name}`}
            // 🎨 ปรับสไตล์ให้ Minimal และดู Premium (Slate Dark)
            stroke="#0f172a" // Slate 900 (สีน้ำเงินเกือบดำ)
            strokeWidth={4} // ปรับความหนาให้พอดี (หนากว่าเส้นเฉลี่ยเล็กน้อย)
            strokeLinecap="round"
            // ✨ ปรับ Dot ให้ดูสะอาดตาด้วยขอบขาวหนา
            dot={{
              r: 6,
              fill: "#0f172a",
              stroke: "#fff",
              strokeWidth: 2.5,
            }}
            // 🔥 ขยายเมื่อ Hover
            activeDot={{
              r: 8,
              strokeWidth: 0,
              fill: "#1e293b",
            }}
            // 🪄 Drop Shadow แบบเบาๆ (Subtle) เพื่อให้เส้นดูมีมิติ
            style={{
              filter: "drop-shadow(0px 3px 4px rgba(15, 23, 42, 0.2))",
            }}
            animationDuration={1000}
            animationEasing="ease-in-out"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
