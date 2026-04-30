import React from "react";
import { FaBullseye } from "react-icons/fa";

interface CategoryChartDataProps {
  name: string;
  cloCode?: string; // Support for both key naming conventions
  ploCode?: string;
  [key: string]: number | string | undefined;
}

interface summaryDataProps {
  students: { grade: string }[];
}

interface PerformanceTableProps {
  cloAveragesByGrade: CategoryChartDataProps[];
  getGradeColor: (grade: string) => string;
  title: string;
  summaryData?: summaryDataProps;
}

export const PerformanceTable = ({
  cloAveragesByGrade,
  getGradeColor,
  title,
}: PerformanceTableProps) => {
  const uniqueGrades = React.useMemo(() => {
    if (cloAveragesByGrade.length === 0) return [];
    const keys = Object.keys(cloAveragesByGrade[0]);
    return keys
      .filter((key) => key.startsWith("avg_grade_"))
      .map((key) => key.replace("avg_grade_", ""))
      .sort();
  }, [cloAveragesByGrade]);

  if (cloAveragesByGrade.length === 0) return null;

  // Helper to determine the cell background for a "heatmap" effect
  const getCellIntensity = (score: number) => {
    if (score >= 80) return "bg-emerald-50/50";
    if (score >= 50) return "bg-amber-50/50";
    return "bg-red-50/50";
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/40 transition-all duration-300">
      {/* Header Bar */}
      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg tracking-tight">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
            <FaBullseye className="text-white text-sm" />
          </div>
          {title}
        </h3>
        <div className="hidden md:flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> High
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Mid
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Low
          </div>
        </div>
      </div>

      <div className="overflow-auto max-h-[600px] relative no-scrollbar">
        <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
          <thead>
            <tr className="bg-white">
              {/* เพิ่ม sticky top-0 และ z-20 เพื่อให้อยู่เหนือคอลัมน์ซ้าย */}
              <th className="sticky top-0 left-0 z-30 bg-slate-50 p-6 text-[11px] font-black text-slate-400 uppercase border-b tracking-[0.2em] w-32 shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.1)]">
                Grade
              </th>
              {cloAveragesByGrade.map((item) => (
                <th
                  key={item.cloCode || item.ploCode || item.name}
                  // เพิ่ม sticky top-0 และ z-20
                  className="sticky top-0 z-20 bg-slate-50 p-6 border-b text-center group shadow-[0_2px_5px_-2px_rgba(0,0,0,0.1)]"
                >
                  <div className="flex flex-col gap-1 transition-transform group-hover:scale-105 duration-200">
                    <span className="text-sm font-black text-slate-800 tracking-tighter">
                      {(
                        item.cloCode ||
                        item.ploCode ||
                        item.name
                      ).toUpperCase()}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueGrades.map((grade) => (
              <tr
                key={grade}
                className="group hover:bg-slate-50/80 transition-all duration-150"
              >
                {/* Sticky Grade Label */}
                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 p-6 border-b border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <span
                    className="flex items-center justify-center w-12 py-1.5 rounded-xl text-white text-[11px] font-black shadow-lg"
                    style={{ backgroundColor: getGradeColor(grade) }}
                  >
                    {grade}
                  </span>
                </td>

                {cloAveragesByGrade.map((row, idx) => {
                  const score = Number(row[`avg_grade_${grade}`]) || 0;
                  return (
                    <td
                      key={row.cloCode || row.ploCode || idx}
                      className={`p-6 border-b border-slate-100 text-center transition-colors ${getCellIntensity(score)}`}
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className={`text-base font-mono font-black tracking-tight ${
                            score >= 80
                              ? "text-emerald-600"
                              : score >= 50
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {score.toFixed(2)}
                        </span>
                        {/* Progress underline */}
                        <div className="w-8 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              score >= 80
                                ? "bg-emerald-400"
                                : score >= 50
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                            }`}
                            style={{ width: `${Math.min(score, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerformanceTable;
