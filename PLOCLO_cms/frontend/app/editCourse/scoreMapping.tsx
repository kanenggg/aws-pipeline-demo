import { Student } from "@/utils/studentApi";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "@/utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Save } from "lucide-react";
import * as XLSX from "xlsx";

interface Assignment {
  id: number;
  section_id: number;
  name: string;
  maxScore: number;
  weight: number;
  category: string;
}

interface ExcelScoreRow {
  "Student Code": string | number;
  "Student Name"?: string; // Optional, used for human verification
  [assignmentName: string]: string | number | undefined; // Dynamic keys for assignment names
}

interface StudentScore {
  student_id: number;
  section_id: number;
  assignment_id: number;
  score: number;
}

export default function ScoreMapping({
  masterCourseId,
  sectionId,
}: {
  masterCourseId: string | number;
  sectionId?: string | number;
}) {
  const { token } = useAuth();
  const { showToast } = useGlobalToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [scoreGrid, setScoreGrid] = useState<
    Record<string, number | undefined>
  >({});

  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentRes, assignRes, scoreRes] = await Promise.all([
          apiClient.get(`/studentOnCourse?sectionId=${sectionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiClient.get(`/assignment?sectionId=${sectionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          apiClient.get(`/score?sectionId=${sectionId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setStudents(studentRes.data);
        setAssignments(assignRes.data);

        const grid: Record<string, number> = {};
        if (Array.isArray(scoreRes.data)) {
          scoreRes.data.forEach((s: StudentScore) => {
            grid[`${s.student_id}_${s.assignment_id}`] = s.score;
          });
        }
        setScoreGrid(grid);
        setChangedKeys(new Set());
      } catch (err) {
        console.error(err);
        showToast("Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [masterCourseId, sectionId, token]);

  const sortedAssignments = useMemo(() => {
    // 1. กำหนดลำดับความสำคัญของหมวดหมู่ (Category)
    const categoryOrder: Record<string, number> = {
      presentation: 1,
      assignment: 2,
      midtermExam: 3,
      finalExam: 4,
      project: 5,
      quiz: 6,
    };

    // 2. ลำดับ Keyword ในชื่อ (กรณี Category เหมือนกัน แต่อยากเช็ค Keyword ในชื่อต่อ)
    const keywordOrder = [
      "presentation",
      "assignment",
      "midterm",
      "final",
      "project",
      "quiz",
    ];

    const getKeywordScore = (name: string) => {
      const lowerName = name.toLowerCase();
      const index = keywordOrder.findIndex((keyword) =>
        lowerName.includes(keyword),
      );
      return index === -1 ? 999 : index;
    };

    // 3. แปลงเลขโรมันเป็นตัวเลขเพื่อให้เรียงลำดับได้ถูกต้อง
    const romanMap: Record<string, number> = {
      i: 1,
      ii: 2,
      iii: 3,
      iv: 4,
      v: 5,
      vi: 6,
      vii: 7,
      viii: 8,
      ix: 9,
      x: 10,
      xi: 11,
      xii: 12,
    };

    const normalizeName = (name: string) => {
      return name
        .toLowerCase()
        .replace(/\b(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/g, (match) => {
          // ใช้ padStart(2, '0') เพื่อให้ "10" เรียงต่อจาก "09" ได้ถูกต้อง
          return romanMap[match].toString().padStart(2, "0");
        });
    };

    // 4. เริ่มการเรียงลำดับแบบหลายชั้น
    return [...assignments].sort((a, b) => {
      // ชั้นที่ 1: เรียงตาม Category (เช่น Presentation ขึ้นก่อน Assignment)
      const catA = categoryOrder[a.category] || 99;
      const catB = categoryOrder[b.category] || 99;
      if (catA !== catB) return catA - catB;

      // ชั้นที่ 2: เรียงตาม Keyword ที่ปรากฏในชื่อ (ถ้ามี)
      const scoreA = getKeywordScore(a.name);
      const scoreB = getKeywordScore(b.name);
      if (scoreA !== scoreB) return scoreA - scoreB;

      // ชั้นที่ 3: เรียงตามชื่อแบบ Natural Sort (รองรับทั้งตัวเลขและเลขโรมัน)
      const normA = normalizeName(a.name);
      const normB = normalizeName(b.name);
      return normA.localeCompare(normB, undefined, { numeric: true });
    });
  }, [assignments]);

  const handleScoreChange = (
    studentId: number,
    assignId: number,
    val: string,
    maxScore: number,
  ) => {
    // 🟢 FIX: Define the key here (combining studentId and assignId)
    const key = `${studentId}_${assignId}`;

    if (val !== "" && isNaN(Number(val))) return;

    if (val !== "" && Number(val) > maxScore) {
      showToast(`Score cannot exceed ${Number(maxScore).toFixed(2)}`, "error");
      return;
    }

    setScoreGrid((prev) => ({
      ...prev,
      [key]: val === "" ? undefined : Number(val),
    }));

    setChangedKeys((prev) => new Set(prev).add(key));
  };

  const handleSave = async () => {
    if (!token || changedKeys.size === 0) return;

    setLoading(true);

    // 🟢 ดึงข้อมูลการอัปเดต โดยแนบ sectionId เข้าไปด้วย
    const updates = Array.from(changedKeys).map((key) => {
      const [studentId, assignId] = key.split("_");
      return {
        student_id: Number(studentId),
        assignment_id: Number(assignId),
        score: scoreGrid[key] ?? 0,
        section_id: Number(sectionId), // 👈 เพิ่มฟิลด์นี้เพื่อให้ Backend นำไปสร้าง/อัปเดต
      };
    });

    try {
      await apiClient.post(
        "/score", // แก้ไข URL ตามที่คุณตั้งค่าไว้ใน Backend
        { updates, sectionId: Number(sectionId) }, // แนบไปทั้งในรายตัวและเป็นส่วนกลาง
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast("Scores saved successfully!", "success");
      setChangedKeys(new Set()); // ล้างรายการที่เปลี่ยนแปลง
    } catch (err) {
      console.error("Save error:", err);
      showToast("Failed to save scores", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<ExcelScoreRow>(sheet);

      const newGrid = { ...scoreGrid };
      const newChangedKeys = new Set(changedKeys);
      let importCount = 0;
      let skipCount = 0;

      jsonData.forEach((row) => {
        // 1. ค้นหานิสิต: ใช้ trim() เพื่อตัดช่องว่างที่อาจติดมาใน Excel
        const excelStudentCode = String(
          row["student_code"] || row["Student Code"] || "",
        ).trim();

        const student = students.find(
          (s) => String(s.student_code).trim() === excelStudentCode,
        );

        if (!student) return;
        const studentId = student.student_id || student.id;

        Object.keys(row).forEach((columnName) => {
          // 2. ค้นหา Assignment: เปรียบเทียบแบบ Case-Insensitive และตัดช่องว่าง
          const assignment = assignments.find(
            (a) =>
              a.name.toLowerCase().trim() === columnName.toLowerCase().trim(),
          );

          if (assignment) {
            const scoreValue = row[columnName];
            const numericScore =
              scoreValue === "" || scoreValue === null
                ? undefined
                : Number(scoreValue);

            if (
              numericScore !== undefined &&
              !isNaN(numericScore) &&
              numericScore <= assignment.maxScore
            ) {
              const key = `${studentId}_${assignment.id}`;

              // 3. ตรวจสอบค่าเดิม: ใช้ Number() เพื่อให้แน่ใจว่าเป็นตัวเลขทั้งคู่ก่อนเทียบ
              const existingScore =
                newGrid[key] !== undefined ? Number(newGrid[key]) : undefined;

              if (existingScore !== numericScore) {
                newGrid[key] = numericScore;
                newChangedKeys.add(key);
                importCount++;
              } else {
                skipCount++;
              }
            }
          }
        });
      });

      setScoreGrid(newGrid);
      setChangedKeys(newChangedKeys);

      if (importCount > 0) {
        showToast(
          `นำเข้าข้อมูลใหม่/อัปเดต ${importCount} รายการ (ข้ามข้อมูลที่เหมือนเดิม ${skipCount} รายการ)`,
          "success",
        );
      } else {
        showToast("ไม่พบข้อมูลที่มีการเปลี่ยนแปลงในไฟล์ Excel", "error");
      }

      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden mt-8 relative min-h-[400px]">
      {loading && <LoadingOverlay />}


      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
          Student Scores
        </h3>
        <div className="flex items-center gap-3">
          {/* Hidden Input */}
          <input
            type="file"
            id="excel-upload"
            className="hidden"
            accept=".xlsx, .xls"
            onChange={handleExcelImport}
          />

          {/* Trigger Button */}
          <label
            htmlFor="excel-upload"
            className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 256 256"
            >
              <path d="M224,48V208a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM208,48H48V208H208V48Z"></path>
            </svg>
            Import Excel
          </label>

          <button
            onClick={handleSave}
            disabled={loading || changedKeys.size === 0}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              changedKeys.size === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
            }`}
          >
            <Save size={16} />
            Save Scores
          </button>
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase font-black tracking-widest">
            <tr>
              {/* FIX 1: Sticky Header 
                  - Added 'bg-white' (Solid color, not transparent)
                  - Increased 'z-30' (Highest priority to stay on top)
              */}
              <th className="p-4 border-b w-64 sticky left-0 bg-white z-30 shadow-md border-r">
                Student
              </th>
              {sortedAssignments.map((assign, index) => (
                <th
                  key={assign.id}
                  className="p-2 border-b text-center min-w-[150px] border-r bg-gray-50"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-[14px]">
                      {assign.name}
                    </span>
                    <span className="font-medium">{index + 1}</span>
                    <span className="text-[9px] text-red-400">
                      Max: {Number(assign.maxScore).toFixed(2)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {students.length > 0 ? (
              students.map((student, index) => {
                const studentId =
                  (student as Student).student_id ||
                  (student as Student).id ||
                  0;

                const rowKey = `row-${studentId}-${index}`;

                return (
                  <tr
                    key={rowKey}
                    className="group hover:bg-blue-50/30 transition-all"
                  >
                    {/* FIX 2: Sticky Body Cell 
                        - Added 'bg-white' (Solid background is crucial!)
                        - Added 'z-20' (Higher than scrolling cells)
                        - Added 'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' (Optional: nice shadow on the right edge)
                    */}
                    <td className="p-4 font-bold text-gray-700 sticky left-0 bg-white border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-20">
                      <div className="flex flex-col w-[200px]">
                        <span>
                          {student.first_name} {student.last_name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {student.student_code}
                        </span>
                      </div>
                    </td>

                    {sortedAssignments.map((assign) => {
                      const key = `${studentId}_${assign.id}`;
                      const rawScore = scoreGrid[key];
                      const hasValue = rawScore !== undefined;
                      const inputValue = hasValue ? rawScore : "";
                      const isChanged = changedKeys.has(key);

                      return (
                        <td
                          key={assign.id}
                          className={`p-1 border-r text-center ${
                            isChanged ? "bg-yellow-50" : ""
                          }`}
                        >
                          <input
                            type="text"
                            min="0"
                            max={assign.maxScore}
                            className={`w-full h-full text-center py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent font-medium 
                            ${hasValue ? "text-blue-700" : "text-gray-400"}
                            ${
                              isChanged
                                ? "ring-2 ring-yellow-200 bg-yellow-50"
                                : ""
                            }
                            `}
                            placeholder="-"
                            value={inputValue}
                            onChange={(e) =>
                              handleScoreChange(
                                studentId,
                                assign.id,
                                e.target.value,
                                assign.maxScore,
                              )
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={sortedAssignments.length + 1}
                  className="p-10 text-center text-gray-400 italic"
                >
                  No students found in this course.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
