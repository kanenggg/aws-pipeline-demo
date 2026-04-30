/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import DropdownSelect from "../../components/DropdownSelect";
import ProgramManagement from "./ProgramManagement";
import ProtectedRoute from "../../components/ProtectedRoute";

import { getUniversities, University } from "../../utils/universityApi";
import { getFaculties, Faculty } from "../../utils/facultyApi";
import { getPrograms, Program } from "../../utils/programApi";
import SearchBar from "@/components/SearchBar";

import { useAuth } from "../context/AuthContext";

interface Option {
  label: string;
  value: string;
}

export default function EditProgram() {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- 1. STATES ---
  const [selections, setSelections] = useState({
    university: "",
    faculty: "",
    program: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const [options, setOptions] = useState({
    universities: [] as Option[],
    faculties: [] as Option[],
    programs: [] as Option[],
  });

  const { user, token } = useAuth();
  const isInstructor = user?.role === "instructor";
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("edit_fix_filters");
    if (saved && token) {
      try {
        const parsed = JSON.parse(saved);
        setSelections(parsed);
      } catch (e) {
        console.error("Failed to parse saved filters:", e);
      }
    }
    setIsHydrated(true);
  }, [token]);

  useEffect(() => {
    if (selections.university || selections.faculty || selections.program) {
      localStorage.setItem("edit_fix_filters", JSON.stringify(selections));
    }
  });

  // --- 2. HANDLERS ---
  const updateSelections = (updates: Partial<typeof selections>) => {
    // Prevent updates if instructor is trying to change via logic
    if (isInstructor) return;
    setSelections((prev) => ({ ...prev, ...updates }));
  };

  const clearFilters = () => {
    // 🟢 ลบข้อมูลออกจาก localStorage ทันทีที่กดปุ่ม Clear
    localStorage.removeItem("edit_fix_filters");

    if (isInstructor) {
      setSearchTerm("");
      return;
    }

    // ล้างค่าใน State เพื่อให้ UI อัปเดตทันที
    setSelections({ university: "", faculty: "", program: "" });
    setSearchTerm("");
  };

  // --- 3. FETCH DATA EFFECTS ---

  // Load Universities
  useEffect(() => {
    if (!token) return;
    getUniversities(token)
      .then((data) => {
        // 🟢 ต้อง Format ข้อมูลให้เป็น Option[] ก่อนเก็บเข้า State
        const formatted = data.map((u: University) => ({
          label: lang === "th" ? u.name_th || u.name : u.name,
          value: String(u.id),
        }));
        setOptions((prev) => ({
          ...prev,
          universities: [{ label: t("all"), value: "" }, ...formatted],
        }));
      })
      .catch((err) => {
        console.error("Load Universities Error:", err);
        setOptions((p) => ({ ...p, universities: [] }));
      });
  }, [token, lang, t]); // เพิ่ม lang และ t เพื่อให้แปลภาษาทันทีที่เปลี่ยน

  // Load Faculties when University changes
  useEffect(() => {
    // 🟢 เคลียร์ค่าเก่าทิ้งทันทีที่เปลี่ยน University เพื่อป้องกันข้อมูลข้ามกัน
    if (!token || !selections.university) {
      setOptions((p) => ({ ...p, faculties: [], programs: [] }));
      return;
    }

    getFaculties(token, selections.university)
      .then((data) => {
        const formatted = data.map((f: Faculty) => ({
          label: lang === "th" ? f.name_th : f.name,
          value: String(f.id),
        }));
        setOptions((prev) => ({
          ...prev,
          faculties: [{ label: t("all"), value: "" }, ...formatted],
        }));
      })
      .catch(() => setOptions((p) => ({ ...p, faculties: [] })));
  }, [selections.university, token, lang, t]);

  // Load Programs when Faculty changes
  useEffect(() => {
    if (!token || !selections.faculty) {
      setOptions((p) => ({ ...p, programs: [] }));
      return;
    }

    getPrograms(token, selections.faculty)
      .then((data) => {
        // 🟢 1. กรองข้อมูลให้เหลือแค่ชื่อที่ไม่ซ้ำกัน (Deduplication)
        // ใช้ Map โดยยึด 'label' (ชื่อโปรแกรม) เป็น Key
        const uniqueMap = new Map();

        data.forEach((p: Program) => {
          const label =
            lang === "th" ? p.program_shortname_th : p.program_shortname_en;
          // หากยังไม่มีชื่อนี้ใน Map ให้เพิ่มเข้าไป (จะเก็บตัวแรกที่เจอ)
          if (!uniqueMap.has(label)) {
            uniqueMap.set(label, {
              label: label,
              value: String(p.program_code),
            });
          }
        });

        // 🟢 2. แปลง Map กลับเป็น Array ของ Options
        const formatted = Array.from(uniqueMap.values());

        setOptions((prev) => ({
          ...prev,
          programs: [{ label: t("all"), value: "" }, ...formatted],
        }));
      })
      .catch(() => setOptions((p) => ({ ...p, programs: [] })));
  }, [selections.faculty, token, lang, t]);

  // --- 4. RENDER ---
  return (
    <ProtectedRoute roles={["system_admin", "Super_admin"]}>
      <div className="max-w-[1400px] min-h-screen flex flex-col mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            {t("program information")}
          </h1>
          <div className="h-1.5 w-16 bg-orange-400 rounded-full" />
        </header>

        {/* Filter & Search Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 space-y-6">
          {/* Row 1: Search Bar (Full Width) */}
          <div className="w-full space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
              {t("search_program")}
            </label>
            <div className="relative group">
              <SearchBar
                placeholder={t("search_program_placeholder")}
                onSearch={(value) => setSearchTerm(value)}
              />
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Row 2: Cascading Filters */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[220px]">
                <DropdownSelect
                  label={t("university")}
                  value={selections.university}
                  onChange={(val) =>
                    updateSelections({
                      university: String(val),
                      faculty: "",
                      program: "",
                    })
                  }
                  options={options.universities}
                />
              </div>

              <div className="min-w-[220px]">
                <DropdownSelect
                  label={t("faculty")}
                  value={selections.faculty}
                  onChange={(val) =>
                    updateSelections({ faculty: String(val), program: "" })
                  }
                  options={options.faculties}
                  disabled={!selections.university}
                />
              </div>

              <div className="min-w-[220px]">
                <DropdownSelect
                  label={t("program")}
                  value={selections.program}
                  onChange={(val) => updateSelections({ program: String(val) })}
                  options={options.programs}
                  disabled={!selections.faculty}
                />
              </div>
            </div>

            <button
              onClick={clearFilters}
              className="h-[42px] flex items-center justify-center gap-2 px-6 text-sm font-bold text-slate-400 hover:text-orange-600 bg-white border border-slate-200 rounded-xl transition-all duration-200 hover:border-orange-200 hover:bg-orange-50 hover:shadow-md active:scale-95"
            >
              <span className="text-lg">↺</span>
              {t("clear")}
            </button>
          </div>
        </div>

        {/* Data Content */}
        <section className="flex-1 bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 overflow-hidden mb-8 p-1">
          {/* เช็ค isHydrated เพื่อป้องกันไม่ให้ตารางโหลดข้อมูล "ทั้งหมด" ขึ้นมาก่อนที่ค่าจาก LocalStorage จะถูกใส่ลงไป */}
          {isHydrated && (
            <ProgramManagement
              universityId={selections.university}
              facultyId={selections.faculty}
              programId={selections.program}
              searchTerm={searchTerm}
            />
          )}
        </section>
      </div>
    </ProtectedRoute>
  );
}
