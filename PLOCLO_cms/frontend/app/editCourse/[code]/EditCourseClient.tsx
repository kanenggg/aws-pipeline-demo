"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Calculator,
  UserPlus,
  Trash2,
  Edit3,
  Copy,
} from "lucide-react"; // Assuming you use lucide-react based on your icons
import { useAuth } from "@/app/context/AuthContext";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useTranslation } from "react-i18next";
import { Course, getCoursePaginate } from "@/utils/courseApi";
import { apiClient } from "@/utils/apiClient";

import LoadingOverlay from "@/components/LoadingOverlay";
import DropdownSelect from "@/components/DropdownSelect";
import FormEditPopup from "@/components/EditPopup";
import BreadCrumb from "@/components/BreadCrumb";

// ... [Keep imports for Mappings/Components] ...
import CLOManagement from "../cloManage";
import AddStudentCourse from "../addStudentCourse";
import CloPloMapping from "../cloploMapping";
import AssignmentMapping from "../assignmentMapping";
import AssignmentCloMapping from "../assignmentCloMapping";
import ScoreMapping from "../scoreMapping";
import GradeSetting from "../gradeSetting";
import ScoreCalculated from "../scoreCalculatedforGrade";
import AlertPopup from "@/components/AlertPopup";
import { useRouter } from "next/navigation";
import AssignmentCateWeight from "../assignmentCateWeight";

// --- Interfaces ---
interface PaginatedResponse {
  data: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ... [Keep fetchMatchingCourses function] ...
async function fetchMatchingCourses(
  token: string,
  courseCode: string,
): Promise<PaginatedResponse> {
  const limit = 10;
  const page = 1;
  try {
    const res = await getCoursePaginate(token, page, limit, {
      courseCode: courseCode,
    });

    // 🟢 กรองข้อมูลเพื่อให้เหลือเฉพาะวิชาที่รหัสตรงกับ courseCode เท่านั้น
    const exactMatches = (res.data || []).filter(
      (c: Course) => String(c.code) === String(courseCode),
    );

    return {
      ...res,
      data: exactMatches,
    } as unknown as PaginatedResponse;
  } catch {
    console.error("Error fetching courses");
    throw new Error("Error fetching courses");
  }
}

export default function EditCourseClient({
  courseCode,
}: {
  courseCode: string;
}) {
  const router = useRouter();
  const { isLoggedIn, token } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- State ---
  const [formData, setFormData] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCourses, setDuplicateCourses] = useState<Course[]>([]);
  const [viewMode, setViewMode] = useState<"setup" | "grading">("setup");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  // ... [Keep existing visibility states] ...
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showStudentTable, setShowStudentTable] = useState(false);
  const [showCloPloMappingTable, setShowCloPloMappingTable] = useState(false);
  const [showAssignmentTable, setShowAssignmentTable] = useState(false);
  const [showCloTable, setShowCloTable] = useState(true);
  const [showAssignmentCloMappingTable, setShowAssignmentCloMappingTable] =
    useState(false);
  const [showScoreMappingTable, setShowScoreMappingTable] = useState(false);
  const [showGradeSettingTable, setShowGradeSettingTable] = useState(false);
  const [showScoreCalculatedTable, setShowScoreCalculatedTable] =
    useState(false);
  const [showAssignmentCateWeightTable, setShowAssignmentCateWeightTable] =
    useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [, setCourseToDelete] = useState<Course | null>(null);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);

  // ... [Keep Fetch Matching Variants useEffect] ...
  useEffect(() => {
    if (!isLoggedIn || !token || !courseCode) {
      setLoading(false);
      return;
    }
    fetchMatchingCourses(token, courseCode)
      .then((response) => {
        const matching = response.data || [];
        setDuplicateCourses(matching);
        if (matching.length > 0) {
          const latest = matching.sort((a, b) => {
            if (Number(b.year) !== Number(a.year))
              return Number(b.year) - Number(a.year);
            if (Number(b.semester) !== Number(a.semester))
              return Number(b.semester) - Number(a.semester);
            return Number(a.section) - Number(b.section);
          })[0];
          setSelectedSectionId(String(latest.id));
        } else {
          setError(t("Course data not found."));
        }
      })
      .catch(() => setError(t("Failed to load course data.")))
      .finally(() => setLoading(false));
  }, [isLoggedIn, token, courseCode, t]);

  // ... [Keep Sync Selection useEffect] ...
  useEffect(() => {
    const selected = duplicateCourses.find(
      (c) => String(c.id) === selectedSectionId,
    );
    setLoading(false);
    setFormData(selected || null);
  }, [selectedSectionId, duplicateCourses]);

  // ... [Keep SETUP_TABS, GRADING_TABS, handleTabChange, handleModeChange] ...
  const SETUP_TABS = [
    {
      id: "clo",
      label: t("clo"),
      color: "text-blue-600",
      dot: "bg-blue-500",
      state: showCloTable,
    },
    {
      id: "student",
      label: t("student"),
      color: "text-emerald-600",
      dot: "bg-emerald-500",
      state: showStudentTable,
    },
    {
      id: "mapping",
      label: t("CLO–PLO Mapping"),
      color: "text-violet-600",
      dot: "bg-violet-500",
      state: showCloPloMappingTable,
    },
    {
      id: "assignment-weight",
      label: t("assessment-category-weights"),
      color: "text-cyan-600",
      dot: "bg-cyan-500",
      state: showAssignmentCateWeightTable,
    },
    {
      id: "assignment",
      label: t("assessment"),
      color: "text-amber-600",
      dot: "bg-amber-500",
      state: showAssignmentTable,
    },
    {
      id: "assignment-clo-mapping",
      label: t("Assessment–CLO Mapping"),
      color: "text-rose-600",
      dot: "bg-rose-500",
      state: showAssignmentCloMappingTable,
    },

    // {
    //   id: "grade-setting",
    //   label: t("Grade Setting"),
    //   color: "text-pink-600",
    //   dot: "bg-pink-500",
    //   state: showGradeSettingTable,
    // },
  ];

  const GRADING_TABS = [
    {
      id: "grade-setting",
      label: t("Grade Setting"),
      color: "text-pink-600",
      dot: "bg-pink-500",
      state: showGradeSettingTable,
    },
    {
      id: "score-mapping",
      label: t("Score Mapping"),
      color: "text-gray-600",
      dot: "bg-gray-500",
      state: showScoreMappingTable,
    },
    {
      id: "score-calculated",
      label: t("Score Calculated"),
      color: "text-green-600",
      dot: "bg-green-500",
      state: showScoreCalculatedTable,
    },
  ];

  const currentTabs = viewMode === "setup" ? SETUP_TABS : GRADING_TABS;
  const activeTabObj = currentTabs.find((t) => t.state) || currentTabs[0];

  const handleTabChange = (tabId: string) => {
    setShowCloTable(false);
    setShowStudentTable(false);
    setShowCloPloMappingTable(false);
    setShowAssignmentTable(false);
    setShowAssignmentCloMappingTable(false);
    setShowScoreMappingTable(false);
    setShowGradeSettingTable(false);
    setShowScoreCalculatedTable(false);
    setShowAssignmentCateWeightTable(false);

    if (tabId === "clo") setShowCloTable(true);
    if (tabId === "student") setShowStudentTable(true);
    if (tabId === "mapping") setShowCloPloMappingTable(true);
    if (tabId === "assignment") setShowAssignmentTable(true);
    if (tabId === "assignment-clo-mapping")
      setShowAssignmentCloMappingTable(true);
    if (tabId === "score-mapping") setShowScoreMappingTable(true);
    if (tabId === "grade-setting") setShowGradeSettingTable(true);
    if (tabId === "score-calculated") setShowScoreCalculatedTable(true);
    if (tabId === "assignment-weight") setShowAssignmentCateWeightTable(true);
  };

  const handleModeChange = (mode: "setup" | "grading") => {
    setViewMode(mode);
    if (mode === "setup") {
      handleTabChange("clo");
    } else {
      handleTabChange("grade-setting");
    }
  };

  // --- Handlers ---

  const handleDuplicateSection = async () => {
    if (!formData || !token) return;

    // 1. คำนวณเลข Section ถัดไปจากข้อมูลล่าสุดใน State
    const existingSectionsInTerm = duplicateCourses.filter(
      (c) =>
        String(c.year) === String(formData.year) &&
        String(c.semester) === String(formData.semester),
    );

    const maxSection = Math.max(
      ...existingSectionsInTerm.map((c) => Number(c.section)),
      0,
    );
    const nextSection = String(maxSection + 1);

    setLoading(true);
    try {
      const { ...payload } = formData;
      const res = await apiClient.post(
        "/course",
        {
          ...payload,
          section: nextSection,
          year: formData.year,
          semester: formData.semester,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // 🟢 2. ดึงข้อมูลใหม่จาก Server ทันที
      const response = await fetchMatchingCourses(token, courseCode);
      const updatedList = response.data || [];

      // 🟢 3. หาข้อมูลของเซกชันที่เพิ่งสร้างเสร็จ (จาก Response ของ Backend: res.data.data)
      const newSectionData = updatedList.find(
        (c) => String(c.id) === String(res.data.data.id),
      );

      if (newSectionData) {
        // 🟢 4. บังคับอัปเดต State ทุกตัวพร้อมกันเพื่อให้ React Render รอบเดียว
        setDuplicateCourses(updatedList);

        // 🟢 5. สำคัญมาก: สลับปีการศึกษา/เทอมใน Dropdown ให้ตรงกับตัวที่เพิ่งสร้าง
        setSelectedTerm(`${newSectionData.year}-${newSectionData.semester}`);

        // 🟢 6. ตั้งค่า ID และข้อมูลแสดงผลให้เป็นตัวใหม่ล่าสุด
        setSelectedSectionId(String(newSectionData.id));
        setFormData(newSectionData);

        // แสดง Toast แจ้งเตือนหลังจาก UI เปลี่ยนแล้ว
        showToast(`${t("Created Section")} ${nextSection}`, "success");
      }
    } catch (err) {
      console.error("Duplicate Error:", err);
      showToast(t("Failed to duplicate section"), "error");
    } finally {
      // 🟢 7. ปิด LoadingOverlay โดยห้ามใช้ window.location.reload()
      setLoading(false);
    }
  };

  const deleteCourseVariant = async () => {
    if (!formData || !token) return;

    const sectionIdToDelete = formData.id;
    const isLastSection = duplicateCourses.length === 1;

    setLoading(true);

    try {
      if (isLastSection) {
        // 🟢 กรณีเป็น Section สุดท้าย: ใช้ API ตัวที่ลบทั้งวิชา
        await apiClient.delete(`/course`, {
          params: { id: sectionIdToDelete }, // ส่ง id ของ section ไปเพื่อให้ backend หา courseId
          headers: { Authorization: `Bearer ${token}` },
        });

        showToast(
          t("Deleted the last section, course has been removed"),
          "success",
        );
        setFormData(null);

        // กลับไปหน้าหลักทันที
        setTimeout(() => {
          router.push("/editCourse");
        }, 1500);
      } else {
        // 🔵 กรณีไม่ใช่ Section สุดท้าย: ลบเฉพาะ Section ปัจจุบัน (ใช้ API ลบปกติ)
        await apiClient.delete(`/course/${sectionIdToDelete}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // ดึงข้อมูลใหม่เพื่อหาตัวที่จะแสดงต่อไป
        const response = await fetchMatchingCourses(token, courseCode);
        const matching = response.data || [];
        setDuplicateCourses(matching);

        // เลือก Section ที่เหลืออยู่ขึ้นมาแสดง
        const nextVariant = matching
          .filter((c) => c.id !== sectionIdToDelete)
          .sort((a, b) => b.id - a.id)[0];

        if (nextVariant) {
          setSelectedSectionId(String(nextVariant.id));
        }

        showToast(t("Course variant deleted successfully"), "success");
      }

      setShowDeletePopup(false);
    } catch (err) {
      console.error(err);
      showToast(t("Failed to delete"), "error");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 NEW: Handler to remove instructor (Optional but good UX)

  const [selectedTerm, setSelectedTerm] = useState<string>(""); // Format: "Year-Semester"
  const termOptions = useMemo(() => {
    const terms = duplicateCourses.map((c) => ({
      year: c.year,
      semester: c.semester,
    }));
    // Remove duplicates
    const uniqueTerms = terms.filter(
      (value, index, self) =>
        index ===
        self.findIndex(
          (t) => t.year === value.year && t.semester === value.semester,
        ),
    );

    return uniqueTerms
      .sort(
        (a, b) =>
          Number(b.year) - Number(a.year) ||
          Number(b.semester) - Number(a.semester),
      )
      .map((t) => ({
        label: `${t.year} / ${t.semester}`,
        value: `${t.year}-${t.semester}`,
      }));
  }, [duplicateCourses]);

  const sectionOptions = useMemo(() => {
    const [year, semester] = selectedTerm.split("-");
    return duplicateCourses
      .filter((c) => String(c.year) === year && String(c.semester) === semester)
      .sort((a, b) => Number(a.section) - Number(b.section))
      .map((c) => ({
        label: `${t("section")} ${c.section}`,
        value: String(c.id),
      }));
  }, [selectedTerm, duplicateCourses, t]);

  useEffect(() => {
    if (duplicateCourses.length > 0 && !selectedTerm) {
      const latest = [...duplicateCourses].sort(
        (a, b) => Number(b.year) - Number(a.year),
      )[0];
      setSelectedTerm(`${latest.year}-${latest.semester}`);
      setSelectedSectionId(String(latest.id));
    }
  }, [duplicateCourses]);

  // --- Render ---
  if (error || !formData) return <LoadingOverlay />;

  if (!loading && !formData && duplicateCourses.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-400 italic">Selecting course data...</p>
        <button
          onClick={() => window.location.reload()}
          className="text-blue-600 underline"
        >
          Reload if stuck
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* --- TOP NAVIGATION --- */}
      <div className="px-5 md:px-8 py-6">
        <BreadCrumb
          items={[
            { label: t("manage courses"), href: "/editCourse" },
            {
              label:
                lang === "en" ? formData.name || "" : formData.name_th || "",
              href: `/editCourse/${courseCode}`,
            },
          ]}
        />
      </div>

      <div className="px-5 md:px-8 space-y-6">
        {loading && <LoadingOverlay />}
  

        {/* --- MAIN HEADER CARD --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 ">
          {/* Top Row: Title & Management Actions */}
          <div className="p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start gap-6 bg-white">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 text-[11px] font-bold uppercase tracking-wider border border-orange-100">
                  ID: {formData.course_id}
                </span>
                <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                  {lang === "en" ? formData.name : formData.name_th}
                  <span className="ml-3 font-medium text-orange-500 text-2xl md:text-3xl">
                    ({formData.code})
                  </span>
                </h1>
              </div>

              {/* Primary Admin Actions directly under the title for easy reach */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setLoading(true);
                    router.push(
                      `/editCourse/${courseCode}/instructors?courseId=${formData?.course_id}`,
                    );
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-all shadow-sm"
                >
                  <UserPlus size={16} />
                  {t("Manage Instructors")}
                </button>
                <button
                  onClick={() => setShowEditPopup(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <Edit3 size={16} />
                  {t("Course Settings")}
                </button>
              </div>
            </div>

            {/* View Controls: Filters moved to the right to act as "Selectors" */}
            {/* 1. เพิ่ม flex-wrap เพื่อให้ Dropdown ตกลงมาบรรทัดใหม่ได้ในมือถือ และปรับ gap ให้สมดุล */}
            <div className="flex flex-wrap md:flex-row gap-6 w-full lg:w-auto p-4 relative z-50">
              {/* Academic Year Dropdown */}
              {/* 2. ใช้ min-w เพื่อรักษาขนาด และลบ z-10 ออกจากอันที่สองเพื่อให้สิทธิ์การลอย (z-index) อยู่ที่ Container หลักอันเดียว */}
              <div className="flex-1 min-w-[160px] md:flex-none md:w-[180px] relative">
                <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">
                  {t("Academic Year / Term")}
                </label>
                <DropdownSelect
                  value={selectedTerm}
                  options={termOptions}
                  onChange={(value) => {
                    setSelectedTerm(String(value));
                    const [y, s] = String(value).split("-");
                    const firstSec = duplicateCourses.find(
                      (c) => String(c.year) === y && String(c.semester) === s,
                    );
                    if (firstSec) setSelectedSectionId(String(firstSec.id));
                  }}
                />
              </div>

              {/* Section Dropdown */}
              <div className="flex-1 min-w-[140px] md:flex-none md:w-[160px] relative">
                <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">
                  {t("Section")}
                </label>
                <DropdownSelect
                  value={selectedSectionId}
                  options={sectionOptions}
                  onChange={(value) => {
                    setLoading(true);
                    setSelectedSectionId(String(value));
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer Row: Low-frequency actions (Duplicate/Delete) */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end items-center gap-3">
            {/* แก้ไขในส่วน Footer Row ของ Main Header Card */}
            <button
              onClick={() => setShowDuplicatePopup(true)} // 🟢 เปลี่ยนจาก handleDuplicateSection เป็นการเปิด Popup
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-blue-600 transition-all"
            >
              <Copy size={14} />
              {t("Duplicate Section")}
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <button
              onClick={() => setShowDeletePopup(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-red-600 transition-all"
            >
              <Trash2 size={14} />
              {t("Delete")}
            </button>
          </div>
        </div>

        {/* --- NAVIGATION CONTROLS --- */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 sticky top-4 z-20 mt-6">
          {/* 1. Switcher: Course Setup vs Grading */}
          <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-gray-200 flex w-full lg:w-auto">
            <button
              onClick={() => handleModeChange("setup")}
              className={`flex-1 lg:px-8 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200
      ${viewMode === "setup" ? "bg-gray-900 text-white shadow-md scale-[1.02]" : "text-gray-500 hover:bg-gray-100"}`}
            >
              <BookOpen size={18} />
              {t("Course Setup")}
            </button>
            <button
              onClick={() => handleModeChange("grading")}
              className={`flex-1 lg:px-8 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200
      ${viewMode === "grading" ? "bg-emerald-600 text-white shadow-md scale-[1.02]" : "text-gray-500 hover:bg-gray-100"}`}
            >
              <Calculator size={18} />
              {t("Grading & Scores")}
            </button>
          </div>

          {/* 2. Tab Selector: Dynamic Tabs */}
          <div className="p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200 flex min-w-[100px] lg:w-auto overflow-x-auto no-scrollbar shadow-lg">
            <div className="flex gap-1">
              {currentTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
            px-6 py-2.5  rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap
            ${
              activeTabObj.id === tab.id
                ? "bg-white text-blue-600 shadow-sm scale-[1.02]"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
            }
          `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="transition-all duration-300 ease-in-out">
          {/* Wrapper for all tables to ensure consistent styling.
            If you want them separate, keep the logic, but this wrapper
            helps standardization.
          */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
            {/* Tip: Add a Header inside the individual components (CLOManagement, etc.)
                or render a generic title here based on activeTabObj.label 
             */}

            <div className="p-6">
              {showCloTable && formData && (
                <CLOManagement courseId={String(formData.course_id)} />
              )}
              {showStudentTable && formData && (
                <AddStudentCourse
                  masterCourseId={String(formData.course_id)}
                  programId={formData.program_id}
                  sectionId={String(formData.id)}
                />
              )}
              {showCloPloMappingTable && (
                <CloPloMapping
                  masterCourseId={String(formData.course_id)}
                  programId={formData.program_id}
                />
              )}
              {showAssignmentTable && (
                <AssignmentMapping sectionId={String(formData.id)} />
              )}
              {showAssignmentCloMappingTable && (
                <AssignmentCloMapping
                  sectionId={String(formData.id)}
                  courseId={String(formData.course_id)}
                />
              )}
              {showScoreMappingTable && (
                <ScoreMapping
                  masterCourseId={String(formData.course_id)}
                  sectionId={String(formData.id)}
                />
              )}
              {showGradeSettingTable && formData && (
                <GradeSetting masterCourseId={String(formData.course_id)} />
              )}
              {showScoreCalculatedTable && formData && (
                <ScoreCalculated
                  masterCourseId={String(formData.course_id)}
                  sectionId={String(formData.id)}
                />
              )}
              {showAssignmentCateWeightTable && formData && (
                <AssignmentCateWeight sectionId={String(formData.id)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- POPUPS --- */}

      {/* --- Other Popups (Keep as is) --- */}
      {showEditPopup && formData && (
        <FormEditPopup
          title={t("Edit Course")}
          data={formData}
          fields={[
            { label: t("Course Name (EN)"), key: "name", type: "text" },
            { label: t("Course Name (TH)"), key: "name_th", type: "text" },
          ]}
          onSave={() => {}}
          onChange={(updated) => setFormData(updated)}
          onClose={() => setShowEditPopup(false)}
        />
      )}

      <AlertPopup
        title={t("confirm duplication")}
        type="confirm"
        message={`${t("Are you sure you want to duplicate this course content to a new section?")} ${t("This will create a new section with the same course structure.")}`}
        isOpen={showDuplicatePopup}
        onCancel={() => setShowDuplicatePopup(false)}
        onConfirm={() => {
          setShowDuplicatePopup(false);
          handleDuplicateSection(); // 🔵 รันฟังก์ชันคัดลอกจริงเมื่อกดยืนยัน
        }}
      />

      <AlertPopup
        title={t("confirm deletion")}
        type="confirm"
        message={`${t("Are you sure you want to delete the section")} ${formData?.section || ""} ${t("This action cannot be undone.")}`}
        isOpen={showDeletePopup}
        onCancel={() => {
          setShowDeletePopup(false);
          setCourseToDelete(null);
        }}
        onConfirm={deleteCourseVariant}
      />
    </div>
  );
}
