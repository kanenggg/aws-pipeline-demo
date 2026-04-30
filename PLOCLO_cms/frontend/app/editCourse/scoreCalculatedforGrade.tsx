"use client";

import React, { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/utils/apiClient";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useToast } from "@/components/Toast";
import { Calculator } from "lucide-react";
import { GradeDistributionChart } from "../viewChart/viewChartComponent/gradeDistributionChart";
import { useAuth } from "../context/AuthContext";

// --- Interfaces ---
interface StudentResult {
  student_id: number;
  student_code: string;
  first_name: string;
  last_name: string;
  categoryScores: Record<string, number>;
  totalScore: number;
  grade: string;
}

export default function ScoreCalculated({
  masterCourseId,
  sectionId,
}: {
  masterCourseId: string | number;
  sectionId: string | number;
}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const { ToastElement, showToast } = useToast();
  const [processedData, setProcessedData] = useState<StudentResult[]>([]);

  // 1. Fetch Summary Data
  useEffect(() => {
    if (!masterCourseId || !sectionId) return;

    const fetchSummary = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(
          `/reports/summary?sectionId=${sectionId}&masterCourseId=${masterCourseId}`,
        );
        setProcessedData(res.data);
      } catch (err) {
        console.error(err);
        showToast("Failed to load grade summary", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [masterCourseId, sectionId, showToast]);

  // 🟢 2. Sort Data by Student Code
  const sortedData = useMemo(() => {
    return [...processedData].sort((a, b) =>
      (a.student_code || "").localeCompare(b.student_code || "", undefined, {
        numeric: true, // Handles codes like "1", "2", "10" correctly
        sensitivity: "base",
      }),
    );
  }, [processedData]);

  // 3. Determine Active Categories
  const activeCategories = useMemo(() => {
    if (sortedData.length === 0) return [];
    return Object.keys(sortedData[0].categoryScores);
  }, [sortedData]);

  const formatCategory = (cat: string) => {
    const map: Record<string, string> = {
      assignment: "Assignment",
      quiz: "Quiz",
      project: "Project",
      presentation: "Presentation",
      midtermExam: "Midterm",
      finalExam: "Final",
    };
    return map[cat] || cat;
  };

  const getGradeColor = (grade: string) => {
    const g = grade.toUpperCase();
    if (g.startsWith("A")) return "bg-green-100 text-green-700";
    if (g.startsWith("B")) return "bg-blue-100 text-blue-700";
    if (g.startsWith("C")) return "bg-yellow-100 text-yellow-700";
    if (g.startsWith("D")) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  useEffect(() => {
    try {
      const res = apiClient.get("/calculation/ass-clo/gradeSummary", {
        headers: { Authorization: `Bearer ${token}` },
        params: { courseId: masterCourseId },
      });
      res.then((response) => {
        setGradeSummaryData(response.data);
      });
    } catch (err) {
      console.error(err);
    }
  },[token, masterCourseId]);

  const [gradeSummaryData, setGradeSummaryData] = useState<any>(null);

  const formattedGradeData = useMemo(() => {
    const grades = gradeSummaryData || {};
    return Object.entries(grades)
      .map(([grade, details]: [string, any]) => ({
        grade,
        count: details.count,
      }))
      .sort((a, b) => {
        const order = ["A", "B+", "B", "C+", "C", "D+", "D", "F"];
        return order.indexOf(a.grade) - order.indexOf(b.grade);
      });
  }, [gradeSummaryData]);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden mt-8 relative min-h-[400px]">
      {loading && <LoadingOverlay />}
      <ToastElement />

      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <div className="flex items-center gap-2">
          <Calculator className="text-blue-600" size={20} />
          <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
            Calculated Scores & Grades
          </h3>
        </div>
      </div>

      <div className="h-[400px]">
        <GradeDistributionChart data={formattedGradeData} />
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black tracking-widest">
            <tr>
              <th className="p-4 border-b w-64 sticky left-0 bg-white z-30 shadow-md border-r">
                Student
              </th>
              {activeCategories.map((cat) => (
                <th
                  key={cat}
                  className="p-4 border-b text-center min-w-[100px] border-r"
                >
                  {formatCategory(cat)}
                </th>
              ))}
              <th className="p-4 border-b text-center min-w-[80px] bg-blue-50 text-blue-800 border-r border-blue-100">
                Total
              </th>
              <th className="p-4 border-b text-center min-w-[80px] bg-green-50 text-green-800">
                Grade
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {sortedData.length > 0
              ? sortedData.map((data) => (
                  <tr
                    key={data.student_id}
                    className="group hover:bg-blue-50/30 transition-all"
                  >
                    <td className="p-4 font-bold text-gray-700 sticky left-0 bg-white border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-20">
                      <div className="flex flex-col w-[200px]">
                        <span>
                          {data.first_name} {data.last_name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {data.student_code}
                        </span>
                      </div>
                    </td>

                    {activeCategories.map((cat) => (
                      <td
                        key={cat}
                        className="p-4 text-center border-r text-gray-600 font-medium"
                      >
                        {data.categoryScores[cat] > 0
                          ? data.categoryScores[cat].toFixed(2)
                          : "-"}
                      </td>
                    ))}

                    <td className="p-4 text-center font-black text-blue-700 bg-blue-50/30 border-r border-blue-100">
                      {data.totalScore.toFixed(2)}
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black ${getGradeColor(data.grade)}`}
                      >
                        {data.grade}
                      </span>
                    </td>
                  </tr>
                ))
              : !loading && (
                  <tr>
                    <td
                      colSpan={activeCategories.length + 3}
                      className="p-10 text-center text-gray-400 italic"
                    >
                      No student summary found for this section.
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
