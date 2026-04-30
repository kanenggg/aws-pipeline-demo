import { apiClient } from "@/utils/apiClient";
import React, { useState, useEffect, useCallback } from "react";
import { useGlobalToast } from "@/app/context/ToastContext";
import LoadingOverLay from "@/components/LoadingOverlay";
import { Save } from "lucide-react";

interface GradeLevel {
  id?: number;
  grade: string;
  score: number | ""; // Allow empty string for input field
}

// Define the standard grades you want to control
const DEFAULT_GRADES = ["A", "B+", "B", "C+", "C", "D+", "D"];

export default function GradeSetting({
  masterCourseId,
}: {
  masterCourseId: string | number;
}) {
  // masterCourseId represents a specific course
  const { showToast } = useGlobalToast();
  const [loading, setLoading] = useState(false);

  // Initialize with default grades having empty scores
  const [gradeSettings, setGradeSettings] = useState<GradeLevel[]>(
    DEFAULT_GRADES.map((g) => ({ grade: g, score: "" })),
  );

  // 1. Fetch Existing Data
  const fetchGradeSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`grade/settings/${masterCourseId}`);
      const fetchedData: GradeLevel[] = res.data;

      // Merge fetched data with our default list
      const mergedGrades = DEFAULT_GRADES.map((symbol) => {
        const existing = fetchedData.find((g) => g.grade === symbol);
        return {
          grade: symbol,
          score: existing ? existing.score : "", // Use existing score or empty
        };
      });

      setGradeSettings(mergedGrades);
    } catch (error) {
      console.error("Error fetching grade settings:", error);
      showToast("Failed to load settings.", "error");
    } finally {
      setLoading(false);
    }
  }, [masterCourseId, showToast]);

  useEffect(() => {
    if (masterCourseId) fetchGradeSettings();
  }, [masterCourseId, fetchGradeSettings]);

  // 2. Handle Input Changes
  const handleScoreChange = (gradeSymbol: string, val: string) => {
    // Only allow numbers or empty string
    if (val !== "" && isNaN(Number(val))) return;

    setGradeSettings((prev) =>
      prev.map((item) =>
        item.grade === gradeSymbol
          ? { ...item, score: val === "" ? "" : parseFloat(val) }
          : item,
      ),
    );
  };

  // 3. Save Function (Filters out empty inputs)
  const handleSave = async () => {
    setLoading(true);
    try {
      const parsedCourseId = parseInt(masterCourseId.toString());

      // Filter: Only include grades that actually have a number value
      const validSettings = gradeSettings
        .filter((g) => g.score !== "") // Remove blanks
        .map((g) => ({
          grade: g.grade,
          score: Number(g.score),
        }));

      if (validSettings.length === 0) {
        showToast("Please enter at least one score.", "error");
        setLoading(false);
        return;
      }

      const payload = {
        courseId: parsedCourseId,
        settings: validSettings,
      };

      // Calls the "Replace All" endpoint
      await apiClient.post("grade/settings", payload);

      showToast("Grade settings saved successfully!", "success");

      // Optional: Refresh data to be sure
      fetchGradeSettings();
    } catch (error) {
      console.error(error);
      showToast("Failed to save grade settings.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-lg max-w-2xl mx-auto mt-8">
      {loading && <LoadingOverLay />}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Grade Cutoff Settings
        </h2>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all"
        >
          <Save size={18} />
          Save Changes
        </button>
      </div>

      <div className="overflow-hidden border border-gray-200 rbounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-8 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest w-1/2">
                Grade Symbol
              </th>
              <th className="px-8 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest w-1/2">
                Min Score Requirement
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {gradeSettings.map((item) => (
              <tr
                key={item.grade}
                className="hover:bg-blue-50/30 transition-colors"
              >
                {/* Grade Symbol */}
                <td className="px-8 py-4 whitespace-nowrap">
                  <span
                    className={`text-lg font-bold px-3 py-1 rounded-md ${
                      item.grade === "A"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.grade}
                  </span>
                </td>

                {/* Input Field */}
                <td className="px-8 py-3 whitespace-nowrap">
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-gray-400 font-medium text-sm">
                      &ge;
                    </span>
                    <input
                      type="text"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="-"
                      className={`block w-full pl-8 pr-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                        item.score !== ""
                          ? "border-blue-300 bg-blue-50/50 font-bold"
                          : "border-gray-200"
                      }`}
                      value={item.score}
                      onChange={(e) =>
                        handleScoreChange(item.grade, e.target.value)
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}

            {/* Read-only row for F */}
            <tr className="bg-red-50/30">
              <td className="px-8 py-4 whitespace-nowrap">
                <span className="text-lg font-bold px-3 py-1 rounded-md bg-red-100 text-red-700">
                  F
                </span>
              </td>
              <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-red-400 italic">
                Less than{" "}
                {gradeSettings.reduce((min, item) => {
                  if (item.score === "") return min;
                  return Math.min(min, Number(item.score));
                }, 100)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-400 text-right">
        * Empty fields will be ignored (not saved).
      </div>
    </div>
  );
}
