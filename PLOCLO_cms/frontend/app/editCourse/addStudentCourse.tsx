"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/utils/apiClient";
import { useGlobalToast } from "../context/ToastContext";
import { Column, Table } from "@/components/Table";
import { useTranslation } from "react-i18next";
import LoadingOverlay from "@/components/LoadingOverlay";
import AlertPopup from "@/components/AlertPopup";
import { useAuth } from "../context/AuthContext";
import * as XLSX from "xlsx";
import { Upload, Plus, Users, Trash2 } from "lucide-react";

interface Student {
  id: number;
  student_code: string;
  first_name: string;
  last_name: string;
}

interface StudentCourse {
  id: number;
  student_code: string;
  student_id: number;
  first_name: string;
  last_name: string;
  assignedAt: string;
}

export default function AddStudentCourse({
  masterCourseId,
  programId,
  sectionId,
}: {
  masterCourseId: string | number;
  programId: string | number;
  sectionId: string;
}) {
  const [allProgramStudents, setAllProgramStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<StudentCourse[]>([]);
  const [studentsInAnySection, setStudentsInAnySection] = useState<
    { id: number }[]
  >([]);
  const [showAlertPopup, setShowAlertPopup] = useState(false);

  // Selection states
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]); // For adding
  const [selectedEnrolledIds, setSelectedEnrolledIds] = useState<number[]>([]); // For deleting

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { showToast } = useGlobalToast();
  const { t } = useTranslation("common");
  const { token } = useAuth();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const programRes = await apiClient.get(`/student?programId=${programId}`);
      const sectionRes = await apiClient.get(
        `/studentOnCourse?sectionId=${sectionId}`,
      );
      const courseRes = await apiClient.get(
        `/studentOnCourse?courseId=${masterCourseId}`,
      );

      setAllProgramStudents(programRes.data);
      setEnrolledStudents(sectionRes.data);
      setStudentsInAnySection(courseRes.data);

      // Clear selections on reload
      setSelectedEnrolledIds([]);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  }, [programId, sectionId, masterCourseId]);

  useEffect(() => {
    if (programId && sectionId && masterCourseId) loadData();
  }, [programId, sectionId, masterCourseId, loadData]);

  // Filter Logic
  const availableStudents = allProgramStudents
    .filter((student) => {
      const isAlreadyInCourse = studentsInAnySection.some(
        (enrolled) => enrolled.id === student.id,
      );
      return !isAlreadyInCourse;
    })
    // 🟢 เพิ่มการ Sort ตามรหัสนิสิต (student_code)
    .sort((a, b) =>
      a.student_code.localeCompare(b.student_code, undefined, {
        numeric: true,
      }),
    );

  // --- BULK ADD ---
  const handleAddSelected = async () => {
    if (selectedCandidates.length === 0) return;
    setLoading(true);
    try {
      const response = await apiClient.post("/studentOnCourse/bulk", {
        sectionId: parseInt(sectionId),
        studentIds: selectedCandidates,
      });
      showToast(
        response.data.message || "Students added successfully",
        "success",
      );
      setSelectedCandidates([]);
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast("Failed to add students", "error");
    } finally {
      setLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [invalidCodes, setInvalidCodes] = useState<string[]>([]);
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  // 🟢 ฟังก์ชันสำหรับ Import จาก Excel พร้อมระบบ Skip และ Alert
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const validStudentIds: number[] = [];
        const missingFromProgram: string[] = [];
        let skipCount = 0;  

        data.forEach((row) => {
          const code = String(
            row.student_id || row["รหัสนิสิต"] || row.student_code || "",
          ).trim();
          if (!code) return;

          // 1. ตรวจสอบว่ารหัสนิสิตนี้มีตัวตนอยู่ใน Program นี้หรือไม่
          const studentInfo = allProgramStudents.find(
            (s) => s.student_code === code,
          );

          if (!studentInfo) {
            // กรณีไม่มีรหัสนี้ในระบบเลย (แจ้งเตือน)
            missingFromProgram.push(code);
          } else {
            // 2. ถ้ามีตัวตน ตรวจสอบต่อว่า "ลงทะเบียนวิชานี้ไปหรือยัง" (ไม่ว่าจะ Section ไหน)
            const isAlreadyInCourse = studentsInAnySection.some(
              (enrolled) => enrolled.id === studentInfo.id,
            );

            if (isAlreadyInCourse) {
              // กรณีมีอยู่แล้วในคอร์ส (ข้ามไปเงียบๆ)
              skipCount++;
            } else {
              // กรณีเป็นนิสิตใหม่ที่ยังไม่เคยลงวิชานี้ (เพิ่มเข้า List)
              validStudentIds.push(studentInfo.id);
            }
          }
        });

        // 3. จัดการแสดงผล Alert สำหรับรหัสที่ไม่มีในระบบ (แต่ยังยอมให้เพิ่มคนอื่นๆ ต่อได้)
        if (missingFromProgram.length > 0) {
          setInvalidCodes(missingFromProgram);
          setShowErrorPopup(true);
          // เราจะไม่ return ตรงนี้เพื่อให้ validStudentIds ที่เหลือทำงานต่อได้
        }

        // 4. ส่งข้อมูลเฉพาะนิสิตที่ผ่านเงื่อนไข (มีในระบบ และ ยังไม่เคยลงวิชานี้)
        if (validStudentIds.length > 0) {
          await apiClient.post("/studentOnCourse/bulk", {
            sectionId: parseInt(sectionId),
            studentIds: validStudentIds,
          });

          showToast(
            `Added ${validStudentIds.length} new students. (Skipped ${skipCount} already enrolled)`,
            "success",
          );
          await loadData();
        } else if (missingFromProgram.length === 0) {
          showToast(
            `No new students to add. (${skipCount} were already in the course)`,
            "error",
          );
        }
      } catch (err) {
        console.error("Excel processing error", err);
        showToast("Failed to process Excel file", "error");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- BULK DELETE ---
  const handleBulkDelete = async () => {
    if (selectedEnrolledIds.length === 0 || !token) return;

    setLoading(true);
    try {
      // Calls the new POST endpoint for bulk delete
      // ✅ วิธีที่ถูกต้องสำหรับ Axios Delete พร้อม Request Body
      await apiClient.delete(`/studentOnCourse/bulk-delete`, {
        data: {
          sectionId: parseInt(sectionId),
          studentIds: selectedEnrolledIds,
        },
        headers: { Authorization: `Bearer ${token}` }, // อย่าลืมใส่ Token หากจำเป็น
      });

      showToast("Students removed successfully", "success");
      await loadData();
    } catch (err) {
      console.error("Failed to remove students", err);
      showToast("Failed to remove students", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- TABLE COLUMNS ---
  const StudentColumns: Column<StudentCourse>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={
            enrolledStudents.length > 0 &&
            selectedEnrolledIds.length === enrolledStudents.length
          }
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedEnrolledIds(enrolledStudents.map((s) => s.student_id));
            } else {
              setSelectedEnrolledIds([]);
            }
          }}
          className="cursor-pointer w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
        />
      ) as unknown as string, // Cast only if your interface strictly requires 'string'
      accessor: "student_id",
      // Fix 2: Adjust signature from (_: any, row: any) to (row: StudentCourse)
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedEnrolledIds.includes(row.student_id)}
          onChange={() => {
            setSelectedEnrolledIds((prev) =>
              prev.includes(row.student_id)
                ? prev.filter((id) => id !== row.student_id)
                : [...prev, row.student_id],
            );
          }}
          className="cursor-pointer w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
        />
      ),
    },
    { header: t("Student ID"), accessor: "student_code" },
    { header: t("First Name"), accessor: "first_name" },
    { header: t("Last Name"), accessor: "last_name" },
  ];

  return (
    <div className="p-4 space-y-6">
      {loading && <LoadingOverlay />}

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm gap-4 transition-all hover:shadow-md">
        {/* Left Side: Title & Counter */}
        <div className="flex items-center gap-4">
          <div className="bg-orange-500/10 p-3 rounded-2xl">
            <Users className="text-orange-600 w-6 h-6" />{" "}
            {/* แนะนำให้ import Users จาก lucide-react */}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">
              {t("Students in this Course")}
            </h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Currently Enrolled:{" "}
              <span className="text-orange-600">{enrolledStudents.length}</span>{" "}
              Members
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* 1. Delete Action (Show only when selected) */}
          {selectedEnrolledIds.length > 0 && (
            <button
              onClick={() => setShowAlertPopup(true)}
              className="group flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-sm active:scale-95"
            >
              <Trash2 size={16} className="group-hover:animate-pulse" />
              {t("delete")} ({selectedEnrolledIds.length})
            </button>
          )}

          <div className="h-8 w-px bg-slate-100 hidden sm:block mx-1" />

          {/* 2. Import Excel Action */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-sm active:scale-95 group"
          >
            <Upload
              size={16}
              className="group-hover:-translate-y-1 transition-transform"
            />
            Import Excel
          </button>

          {/* 3. Primary Enroll Action */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white hover:bg-orange-600 px-6 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all shadow-lg shadow-slate-200 active:scale-95 group"
          >
            <Plus
              size={18}
              strokeWidth={3}
              className="group-hover:rotate-90 transition-transform duration-300"
            />
            {t("Enroll Students")}
          </button>
        </div>
      </div>

      <Table columns={StudentColumns} data={enrolledStudents} />

      {/* MODAL POPUP (Same as before, just mapped to selectedCandidates) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">Select Students to Add</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white border-b z-10">
                  <tr>
                    <th className="p-2 w-10">
                      <input
                        type="checkbox"
                        checked={
                          availableStudents.length > 0 &&
                          selectedCandidates.length === availableStudents.length
                        }
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedCandidates(
                              availableStudents.map((s) => s.id),
                            );
                          else setSelectedCandidates([]);
                        }}
                      />
                    </th>
                    <th className="p-2 text-sm font-semibold text-gray-600">
                      ID
                    </th>
                    <th className="p-2 text-sm font-semibold text-gray-600">
                      Name
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {availableStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(s.id)}
                          onChange={() => {
                            setSelectedCandidates((prev) =>
                              prev.includes(s.id)
                                ? prev.filter((id) => id !== s.id)
                                : [...prev, s.id],
                            );
                          }}
                        />
                      </td>
                      <td className="p-2 text-sm">{s.student_code}</td>
                      <td className="p-2 text-sm">
                        {s.first_name} {s.last_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {availableStudents.length === 0 && (
                <div className="text-center py-10 text-gray-500 italic">
                  No available students found.
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelected}
                disabled={loading || selectedCandidates.length === 0}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold disabled:bg-gray-300"
              >
                {loading
                  ? "Adding..."
                  : `Add ${selectedCandidates.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT POPUP FOR DELETE CONFIRMATION */}
      {showAlertPopup && (
        <AlertPopup
          isOpen={showAlertPopup}
          type="confirm"
          title={t("Confirm Deletion")}
          message={t(
            "Are you sure you want to delete the selected students from this section?",
          )}
          confirmText={t("Delete")}
          cancelText={t("Cancel")}
          onConfirm={() => {
            setShowAlertPopup(false);
            handleBulkDelete();
          }}
          onCancel={() => setShowAlertPopup(false)}
        />
      )}

      {showErrorPopup && (
        <AlertPopup
          isOpen={showErrorPopup}
          type="error"
          title="Students Not Found"
          message={`The following student codes do not exist in the current program: ${invalidCodes.join(", ")}. Please add them to the program system first.`}
          onConfirm={() => setShowErrorPopup(false)}
        />
      )}
    </div>
  );
}
