import React, { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";

interface PerformanceBalanceChartProps {
  chartData: any[];
  visibleLines?: Record<string, boolean>;
  getGradeColor?: (grade: string) => string;
  xAxisKey: string; // e.g., "cloCode"
  maxScoreKey?: string; // e.g., "max"
  minScoreKey?: string; // e.g., "min"
  allAvgKey?: string; // e.g., "mean"
  maxScorePosKey: string; // e.g., "maxCloScore"
  balanceData?: any[];
  midScoreKey?: string; // e.g., "median"
  individualStudentData?: any[]; // ข้อมูลของนักเรียนแต่ละคนสำหรับแสดงเส้นเฉพาะ
}

export const PerformanceBalanceChart = ({
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
}: PerformanceBalanceChartProps) => {
  // Extract unique grades to show individual grade radars if toggled
  const { t } =useTranslation("common");
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
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={finalChartData}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis
          dataKey={xAxisKey} // This will now correctly use "cloCode" or "ploCode"
          tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, "auto"]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
          }}
          formatter={(value: number) => value.toFixed(2)}
        />

        {/* Background Radar: Total Possible Score */}
        <Radar
          name={t("fullScore")}
          dataKey={maxScorePosKey}
          stroke="#94a3b8"
          fill="#cbd5e1"
          fillOpacity={0.1}
          isAnimationActive={false}
        />

        {/* Dynamic Radars based on Visibility */}
        {visibleLines?.maxScore && maxScoreKey && (
          <Radar
            name={t("maxScore")}
            dataKey={maxScoreKey} // Maps to "max"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.1}
          />
        )}

        {visibleLines?.minScore && minScoreKey && (
          <Radar
            name={t("minScore")}
            dataKey={minScoreKey} // Maps to "min"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.1}
          />
        )}

        {visibleLines?.allAvg && allAvgKey && (
          <Radar
            name={t("averageScore")}
            dataKey={allAvgKey} // Maps to "mean"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        )}
        {visibleLines?.midScore && midScoreKey && (
          <Radar
            name={t("medianScore")}
            dataKey={midScoreKey} // Maps to "median"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        )}
        {/* Individual Grade Radars */}
        {uniqueGrades.map(
          (grade) =>
            visibleLines?.[`avg_grade_${grade}`] && (
              <Radar
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
          <Radar
            name={`${individualStudentData.Name}`}
            dataKey={(dataPoint) => {
              const key = dataPoint[xAxisKey];
              const value = individualStudentData[key];
              return value ? Number(value) : 0;
            }}
            // 🎨 ใช้สี Slate-800 เพื่อให้ดู Minimal และไม่ซ้ำกับเฉดสีอื่นที่มีอยู่
            stroke="#1e293b" // Slate 800 (เกือบดำแต่ซอฟต์กว่า)
            strokeWidth={2.5} // ความหนาพอดีๆ ไม่ให้ดูเทอะทะ
            fill="#334155" // Slate 700
            fillOpacity={0.15} // จางมากเพื่อให้ยังเห็น Grid และเส้นค่าเฉลี่ยด้านหลัง
            // ✨ ปรับ Dot ให้เล็กลงและสะอาดตา
            dot={{
              r: 3,
              fill: "#1e293b",
              stroke: "#fff",
              strokeWidth: 1.5,
            }}
            activeDot={{
              r: 5,
              fill: "#0f172a", // Slate 900 เมื่อชี้
            }}
            animationDuration={1000}
          />
        )}
        <Legend verticalAlign="bottom" height={36} iconType="circle" />
      </RadarChart>
    </ResponsiveContainer>
  );
};
