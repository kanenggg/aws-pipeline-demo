// app/editProgram/[program_code]/EditProgramClient.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useTranslation } from "next-i18next";
import { getProgramsPaginated, Program } from "@/utils/programApi";
import { apiClient } from "@/utils/apiClient";

import LoadingOverlay from "@/components/LoadingOverlay";
import DropdownSelect from "@/components/DropdownSelect";
import FormEditPopup from "@/components/EditPopup";
import BreadCrumb from "@/components/BreadCrumb";
import AlertPopup from "@/components/AlertPopup";
import { FaCopy, FaEdit, FaTrash } from "react-icons/fa";

// Import Child Components
import AddPlo from "../AddPlo";
import AddStudent from "../AddStudent";

interface PaginatedResponse {
  data: Program[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Option {
  label: string;
  value: string;
}

async function fetchMatchingPrograms(
  token: string,
  programCode: string,
): Promise<PaginatedResponse> {
  const limit = 100;
  const page = 1;
  try {
    const response = await getProgramsPaginated(token, page, limit, {
      programId: programCode,
    });
    return response as PaginatedResponse;
  } catch (error) {
    console.error(`Error fetching matching programs:`, error);
    throw error;
  }
}

export default function EditProgramClient({
  programCode,
}: {
  programCode: string;
}) {
  const { token, isLoggedIn } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- State ---
  const [formData, setFormData] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicatePrograms, setDuplicatePrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | number>(
    "",
  );

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false); // New Popup State

  const [activeTab, setActiveTab] = useState<"plo" | "student">("plo");
  const [shouldCopyPlo, setShouldCopyPlo] = useState(false);

  // --- Dropdown Options ---
  const programOptions: Option[] = useMemo(() => {
    if (duplicatePrograms.length === 0) return [];
    return [...duplicatePrograms]
      .sort((a, b) => b.program_year - a.program_year)
      .map((p) => ({ label: `${p.program_year}`, value: String(p.id) }));
  }, [duplicatePrograms]);

  const viewModeOptions: Option[] = [
    { label: t("PLO"), value: "plo" },
    { label: t("student"), value: "student" },
  ];

  // --- 1. Initial Fetch ---
  useEffect(() => {
    if (!isLoggedIn || !token || !programCode) {
      setLoading(false);
      return;
    }
    fetchMatchingPrograms(token, programCode)
      .then((response) => {
        const matching = response.data || [];
        setDuplicatePrograms(matching);
        if (matching.length > 0) {
          const latest = [...matching].sort(
            (a, b) => b.program_year - a.program_year,
          )[0];
          setSelectedProgramId(String(latest.id));
        }
      })
      .catch(() => setError(t("Failed to load program data.")))
      .finally(() => setLoading(false));
  }, [isLoggedIn, token, programCode, t]);

  // --- 2. Sync Selection ---
  useEffect(() => {
    const selected = duplicatePrograms.find(
      (p) => String(p.id) === selectedProgramId,
    );
    setFormData(selected || null);
  }, [selectedProgramId, duplicatePrograms]);

  // --- Handlers ---

  const [targetDuplicateYear, setTargetDuplicateYear] = useState<number | null>(
    null,
  );

  const targetYear = useMemo(() => {
    let nextYear = Number(formData?.program_year || 0) + 1;
    while (duplicatePrograms.some((p) => Number(p.program_year) === nextYear)) {
      nextYear++;
    }
    return nextYear;
  }, [formData?.program_year, duplicatePrograms]);

  const triggerDuplicateConfirm = () => {
    if (!formData) return;

    setTargetDuplicateYear(targetYear);
    setShowDuplicateConfirm(true);
  };

  const handleDuplicateProgram = async () => {
    setShowDuplicateConfirm(false);
    if (!formData || !token) return;

    const payload = {
      program_code: formData.program_code,
      program_name_en: formData.program_name_en,
      program_name_th: formData.program_name_th,
      program_shortname_en: formData.program_shortname_en,
      program_shortname_th: formData.program_shortname_th,
      program_year: targetYear,
      faculty_id: formData.faculty_id,
      copy_from_id: shouldCopyPlo ? formData.id : null,
    };

    try {
      setLoading(true);
      await apiClient.post("/program/duplicate", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast(t("Program duplicated successfully!"), "success");
      const res = await fetchMatchingPrograms(token, programCode);
      const updated = res.data || [];
      setDuplicatePrograms(updated);

      const newVar = updated.find(
        (p: Program) => p.program_year === targetYear,
      );
      if (newVar) setSelectedProgramId(String(newVar.id));
    } catch {
      showToast(t("Failed to duplicate program."), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProgram = async () => {
    if (!formData || !token) return;
    try {
      await apiClient.patch(`/program/${formData.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Updated successfully", "success");
      setShowEditPopup(false);
      const res = await fetchMatchingPrograms(token, programCode);
      setDuplicatePrograms(res.data || []);
    } catch {
      showToast("Update failed", "error");
    }
  };

  const handleDeleteProgram = async () => {
    if (!formData || !token) return;
    try {
      setLoading(true);
      await apiClient.delete(`/program/${formData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Deleted successfully", "success");
      setShowDeleteConfirm(false);

      const res = await fetchMatchingPrograms(token, programCode);
      const updated = res.data || [];
      setDuplicatePrograms(updated);

      if (updated.length > 0) {
        const sorted = [...updated].sort(
          (a, b) => b.program_year - a.program_year,
        );
        setSelectedProgramId(String(sorted[0].id));
      } else {
        setSelectedProgramId("");
        setFormData(null);
      }
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingOverlay />;
  if (error || !formData)
    return <div className="p-10 text-red-500 font-bold">{error}</div>;

  return (
    <div className="p-5 md:p-8 min-h-screen bg-slate-50">
      <BreadCrumb
        items={[
          { label: t("manage programs"), href: "/editProgram" },
          {
            label:
              lang === "en"
                ? formData.program_shortname_en
                : formData.program_shortname_th,
            href: `/editProgram/${programCode}`,
          },
        ]}
      />


      <div className="mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold text-slate-800">
          {lang === "en"
            ? formData.program_shortname_en
            : formData.program_shortname_th}
          <span className="ml-3 text-orange-600 font-light tracking-tighter italic">
            {programCode}
          </span>
        </h1>
      </div>

      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 mb-8">
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg">
                <FaEdit />
              </div>
              <h2 className="text-lg font-extrabold text-slate-800">
                {t("Manage Program Variant")}
              </h2>
            </div>

            <div className="flex flex-wrap items-start gap-4">
              <div className="flex flex-col gap-2 p-4 bg-blue-50/50 border border-blue-100 rounded-3xl">
                <button
                  onClick={triggerDuplicateConfirm}
                  className="flex items-center gap-2 px-6 py-2.5 text-[11px] font-black uppercase tracking-wider text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 group"
                >
                  <FaCopy className="group-hover:rotate-12 transition-transform" />
                  {t("Duplicate to")} {targetYear}
                </button>
                <label className="flex items-center gap-2 px-1 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={shouldCopyPlo}
                    onChange={(e) => setShouldCopyPlo(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-[10px] font-black uppercase tracking-tight text-slate-400 group-hover:text-slate-600">
                    Copy PLOs
                  </span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditPopup(true)}
                  className="flex items-center gap-2 px-6 py-2.5 h-fit text-sm font-bold text-orange-700 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition-all"
                >
                  <FaEdit /> {t("edit")}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-6 py-2.5 h-fit text-sm font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-all"
                >
                  <FaTrash /> {t("delete")}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:w-80 flex flex-col gap-4 border-l border-slate-100 lg:pl-8 justify-center">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                {t("Program Year")}
              </label>
              <DropdownSelect
                value={selectedProgramId}
                options={programOptions}
                onChange={(v) => setSelectedProgramId(v)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                {t("View Mode")}
              </label>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {viewModeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setActiveTab(opt.value as Option)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === opt.value ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="transition-all duration-300">
        {activeTab === "student" && <AddStudent programId={formData.id} />}
        {activeTab === "plo" && <AddPlo programId={formData.id} />}
      </div>

      {/* POPUPS */}
      {showEditPopup && (
        <FormEditPopup
          title="Edit Program Details"
          data={formData}
          fields={[
            {
              label: t("Program Name (EN)"),
              key: "program_name_en",
              type: "text",
            },
            {
              label: t("Program Name (TH)"),
              key: "program_name_th",
              type: "text",
            },
            {
              label: t("Short Name (EN)"),
              key: "program_shortname_en",
              type: "text",
            },
            {
              label: t("Short Name (TH)"),
              key: "program_shortname_th",
              type: "text",
            },
          ]}
          onSave={handleSaveProgram}
          onChange={(updated) => setFormData(updated)}
          onClose={() => setShowEditPopup(false)}
        />
      )}

      <AlertPopup
        isOpen={showDuplicateConfirm}
        type="confirm"
        title={t("Confirm Duplication")}
        // 🟢 เปลี่ยนจาก +1 เป็น targetDuplicateYear ที่ดึงจาก State
        message={`${t("Confirm duplicate to year")} ${targetDuplicateYear}? ${
          shouldCopyPlo ? t("PLO data will be copied.") : ""
        }`}
        onConfirm={handleDuplicateProgram}
        onCancel={() => setShowDuplicateConfirm(false)}
      />

      <AlertPopup
        isOpen={showDeleteConfirm}
        type="confirm"
        title={t("Confirm Deletion")}
        message={t(
          "Are you sure? All associated data for this year will be lost.",
        )}
        onConfirm={handleDeleteProgram}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
