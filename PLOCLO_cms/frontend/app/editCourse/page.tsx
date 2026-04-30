/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import DropdownSelect from "../../components/DropdownSelect";
import CourseManagement from "./courseManage";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../context/AuthContext";

import { getUniversities, University } from "../../utils/universityApi";
import { getFaculties, Faculty } from "../../utils/facultyApi";
import { getPrograms, Program } from "../../utils/programApi";
import { apiClient } from "../../utils/apiClient";
import SearchBar from "@/components/SearchBar";
import LoadingOverlay from "@/components/LoadingOverlay";

interface Option {
  label: string;
  value: string;
}

export default function EditCourse() {
  const { t, i18n } = useTranslation("common");
  const { user, token } = useAuth();
  const lang = i18n.language;
  const isInstructor = user?.role === "instructor";

  // --- 1. STATES ---
  const [selections, setSelections] = useState({
    university: "",
    faculty: "",
    program: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [isInitialized, setIsInitialized] = useState(false); // Flag to prevent double fetch
  const [loading, setLoading] = useState(true);

  const [options, setOptions] = useState({
    universities: [] as Option[],
    faculties: [] as Option[],
    programs: [] as Option[],
  });

  const allLabel = t("all");
  const [isHydrated, setIsHydrated] = useState(false); // Flag to check if localStorage has been loaded

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
    setIsHydrated(true); // Mark as hydrated after attempting to load from localStorage
  }, [token]);

  useEffect(() => {
    if (selections.university || selections.faculty || selections.program) {
      localStorage.setItem("edit_fix_filters", JSON.stringify(selections));
    }
  }, [selections]);

  // --- 2. HANDLERS ---
  const updateSelections = (updates: Partial<typeof selections>) => {
    if (isInstructor && (updates.university || updates.faculty)) return;
    setSelections((prev) => ({ ...prev, ...updates }));
  };

  const handleClear = () => {
    localStorage.removeItem("edit_fix_filters");
    if (isInstructor) {
      setSelections((prev) => ({ ...prev })); 
      setSearchTerm("");
    } else {
      setSelections({ university: "", faculty: "", program: "" });
      setSearchTerm("");
    }
  };

  // --- 3. INITIALIZATION LOGIC ---
  useEffect(() => {
    if (!token) return;

    const initialize = async () => {
      try {
        setLoading(true);

        // 1. Fetch Universities for all roles first
        const uniData = await getUniversities(token);
        const formattedUni = uniData.map((u: University) => ({
          label: lang === "th" ? u.name_th : u.name,
          value: String(u.id),
        }));

        if (isInstructor && user?.email) {
          // 2. Instructor Path: Map Email -> Faculty -> University
          const instructorRes = await apiClient.get(
            `/instructor/email/${user.email}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const facultyId = instructorRes.data?.faculty_id;

          const facultyRes = await apiClient.get(`/faculty/${facultyId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const facultyData = facultyRes.data;

          // Load faculty list immediately so the dropdown has the name
          const facultiesData = await getFaculties(
            token,
            String(facultyData.university_id),
          );
          const formattedFacs = facultiesData.map((f: Faculty) => ({
            label: lang === "th" ? f.name_th : f.name,
            value: String(f.id),
          }));

          setOptions({
            universities: [{ label: allLabel, value: "" }, ...formattedUni],
            faculties: formattedFacs,
            programs: [],
          });

          // Set selections before releasing the initialization flag
          setSelections({
            university: String(facultyData.university_id),
            faculty: String(facultyData.id),
            program: "",
          });
        } else {
          // 3. Admin/Super Admin Path
          setOptions((prev) => ({
            ...prev,
            universities: [{ label: allLabel, value: "" }, ...formattedUni],
          }));
        }
      } catch (err) {
        console.error("Initialization failed:", err);
      } finally {
        setIsInitialized(true); // Now we allow cascading effects and CourseManagement to mount
        setLoading(false);
      }
    };

    initialize();
  }, [token, user?.email, user?.role, lang, allLabel]);

  // --- 4. CASCADING EFFECTS (Guarded by isInitialized) ---

  // Load Faculties
  useEffect(() => {
    if (!token || !selections.university || isInstructor || !isInitialized)
      return;

    getFaculties(token, selections.university)
      .then((data) => {
        const formatted = data.map((f: Faculty) => ({
          label: lang === "th" ? f.name_th : f.name,
          value: String(f.id),
        }));
        setOptions((prev) => ({
          ...prev,
          faculties: [{ label: allLabel, value: "" }, ...formatted],
        }));
      })
      .catch(() => setOptions((prev) => ({ ...prev, faculties: [] })));
  }, [selections.university, isInitialized, lang, allLabel]);

  // Load Programs
  useEffect(() => {
    if (!token || !selections.faculty || !isInitialized) return;

    getPrograms(token, selections.faculty)
      .then((data) => {
        const uniquePrograms = Array.from(
          new Map(data.map((p: Program) => [p.program_code, p])).values(),
        );

        const formatted = (uniquePrograms as Program[]).map((p) => ({
          label:
            lang === "th" ? p.program_shortname_th : p.program_shortname_en,
          value: String(p.program_code),
        }));

        setOptions((prev) => ({
          ...prev,
          programs: [{ label: allLabel, value: "" }, ...formatted],
        }));
      })
      .catch(() => setOptions((prev) => ({ ...prev, programs: [] })));
  }, [selections.faculty, isInitialized, lang, allLabel]);

  // --- 5. RENDER ---

  // Loading Screen to prevent flickering
  if (!isInitialized || loading) {
    return <LoadingOverlay />;
  }

  return (
    <ProtectedRoute
      roles={["system_admin", "Super_admin", "instructor", "course_admin"]}
    >
      <div className="max-w-[1400px] min-h-screen flex flex-col mx-auto p-6 space-y-6 bg-[#fcfcfd]">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            {t("course information")}
          </h1>
          <div className="h-1.5 w-16 bg-orange-400 rounded-full" />
        </header>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 space-y-6">
          <div className="w-full space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
              {t("search_course")}
            </label>
            <SearchBar
              placeholder={t("search_course_placeholder")}
              onSearch={(value) => setSearchTerm(value)}
            />
          </div>

          <div className="border-t border-slate-100" />

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
                  disabled={isInstructor}
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
                  disabled={isInstructor || !selections.university}
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
              onClick={handleClear}
              className="h-[42px] flex items-center justify-center gap-2 px-6 text-sm font-bold text-slate-400 hover:text-orange-600 bg-white border border-slate-200 rounded-xl transition-all duration-200 hover:border-orange-200 hover:bg-orange-50 hover:shadow-md active:scale-95"
            >
              <span className="text-lg">↺</span>
              {t("clear")}
            </button>
          </div>
        </div>

        <section className="flex-1 bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200/60 overflow-hidden mb-8 p-1">
          {/* 🟢 CourseManagement will now mount ONLY with correct initial IDs */}
          {isHydrated && (
            <CourseManagement
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
