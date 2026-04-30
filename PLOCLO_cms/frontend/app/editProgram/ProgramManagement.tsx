"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  addProgram,
  bulkUploadPrograms,
  getProgramsPaginated,
  Program,
} from "../../utils/programApi";
import { Column, Table } from "../../components/Table";
import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";
import { Faculty, getFaculties } from "../../utils/facultyApi";
import { getUniversities, University } from "../../utils/universityApi";
import PaginationControlButton from "../../components/PaignateControlButton";
import { useGlobalToast } from "@/app/context/ToastContext";
import LoadingOverlay from "../../components/LoadingOverlay";
import axios from "axios";

import FormEditPopup from "../../components/EditPopup";
import AlertPopup from "../../components/AlertPopup";
import { apiClient } from "../../utils/apiClient";

import { useRouter } from "next/navigation";

interface ProgramManagementProps {
  universityId?: string;
  facultyId?: string;
  programId?: string;
  year?: string;
  searchTerm?: string;
}

export default function ProgramManagement({
  universityId,
  facultyId,
  programId,
  year,
  searchTerm = "",
}: ProgramManagementProps) {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn } = useAuth();
  const router = useRouter();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [universityOptions, setUniversityOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [facultyOptions, setFacultyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [yearOptions, setYearOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10; // You can make this configurable if needed

  const { showToast } = useGlobalToast();
  // Fetch universities
  useEffect(() => {
    if (!isLoggedIn || !token) return;

    const loadUniversities = async () => {
      try {
        const data = await getUniversities(token);
        if (data.length === 0) {
          setUniversityOptions([{ label: t("No data available"), value: "" }]);
        } else {
          setUniversityOptions([
            { label: t("please select a university"), value: "" },
            ...data.map((u: University) => ({
              label: u.name,
              value: String(u.id),
            })),
          ]);
        }
      } catch {
        showToast("API university error", "error");
      }
    };
    loadUniversities();
  }, [isLoggedIn, token, t, showToast]);

  // // Fetch faculties for selected university (use parent universityId)
  useEffect(() => {
    if (!isLoggedIn || !token || !selectedUniversity) {
      setSelectedFaculty("");
      setFacultyOptions([{ label: t("please select a faculty"), value: "" }]);
      return;
    }

    const fetchFaculties = async () => {
      try {
        const data = await getFaculties(token, selectedUniversity);

        const filteredFaculties = data.filter(
          (f: Faculty) => String(f.university_id) === selectedUniversity,
        );

        if (filteredFaculties.length === 0) {
          setFacultyOptions([{ label: t("No data available"), value: "" }]);
          return;
        }

        setFacultyOptions([
          { label: t("please select a faculty"), value: "" },
          ...filteredFaculties.map((f: Faculty) => ({
            label: f.name,
            value: String(f.id),
          })),
        ]);
      } catch {
        showToast("API faculty error", "error");
      }
    };
    fetchFaculties();
  }, [isLoggedIn, token, t, selectedUniversity, showToast]);

  useEffect(() => {
    const currentYear = new Date().getFullYear() + 543; // Thai year
    const years: { label: string; value: string }[] = [];

    years.push({ label: t("please select a year"), value: "" });

    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push({ label: String(y), value: String(y) });
    }

    setYearOptions(years);
  }, [t]);

  const fetchPrograms = useCallback(async () => {
    if (!isLoggedIn || !token) return;

    setLoading(true);
    try {
      const data = await getProgramsPaginated(token, page, limit, {
        universityId,
        facultyId,
        programId,
        year,
      });

      const programData = data.data || data;
      if (Array.isArray(programData)) {
        // ใช้ Map เพื่อกรองโปรแกรมที่ซ้ำกัน
        const uniqueProgramsMap = new Map();
        programData.forEach((p: Program) => {
          if (!uniqueProgramsMap.has(p.program_code)) {
            uniqueProgramsMap.set(p.program_code, p);
          }
        });

        const uniqueList = Array.from(uniqueProgramsMap.values());
        setPrograms(uniqueList);
      } else {
        setPrograms([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      showToast(t("Error fetching programs"), "error");
    } finally {
      setLoading(false);
    }
  }, [
    isLoggedIn,
    token,
    page,
    universityId,
    facultyId,
    programId,
    year,
    t,
    showToast,
  ]);

  const resetSelection = () => {
    setSelectedFaculty("");
    setSelectedUniversity("");
    setSelectedYear("");
  };

  // Add single program
  const handleAddProgram = async (data: Record<string, unknown>) => {
    const facultyToUse =
      (data && (data as any).faculty_id) || selectedFaculty || facultyId;
    const universityToUse =
      (data && (data as any).university_id) ||
      selectedUniversity ||
      universityId;

    if (!facultyToUse) {
      showToast("Please select a faculty before adding a program", "error");
      return;
    }
    try {
      const payload: any = {
        program_code: String((data as any).code),
        faculty_id: facultyToUse,
        program_name_en: String((data as any).nameEn),
        program_name_th: String((data as any).nameTh),
        program_shortname_en: String((data as any).abbrEn),
        program_shortname_th: String((data as any).abbrTh),
        program_year: parseInt(String((data as any).year)),
      };
      if (universityToUse) payload.university_id = universityToUse;
      await addProgram(payload as any, token!);
      resetSelection();
      fetchPrograms();
      showToast(t("Program added successfully!"), "success");
      setPage(1);
    } catch (err) {
      if (err instanceof Error) {
        showToast("Failed to add program: " + err.message, "error");
      } else if (typeof err === "string") {
        showToast("Failed to add program: " + err, "error");
      } else {
        showToast("Failed to add program: An unknown error occurred", "error");
      }
    }
  };

  // Bulk upload programs from Excel

  // ... inside your component

  const handleFileUpload = async (mappedRows: any[]) => {
    // 1. Determine Faculty
    const facultyToUse =
      mappedRows.length > 0
        ? mappedRows[0].faculty_id
        : selectedFaculty || facultyId;

    if (!facultyToUse) {
      showToast("Please select a faculty before uploading", "error");
      return;
    }

    setLoading(true);

    try {
      // 2. DATA TRANSFORMATION (Crucial Step)
      // We must ensure the keys match exactly what the backend expects.
      // We also use String() and parseInt() to prevent type errors.

      const formattedRows = mappedRows.map((row) => ({
        program_code: String(
          row.program_code || row["code"] || row["Program Code"],
        ),
        program_name_en: String(row.program_name_en || row["nameEn"]),
        program_name_th: String(row.program_name_th || row["nameTh"]),
        program_shortname_en: String(row.program_shortname_en || row["abbrEn"]),
        program_shortname_th: String(row.program_shortname_th || row["abbrTh"]),
        // Convert year to number safely
        program_year: parseInt(String(row.program_year || row["year"]), 10),
        faculty_id: facultyToUse,
      }));

      // Debug: Check your console to see if the data looks correct before sending

      await bulkUploadPrograms(formattedRows, token!);
      resetSelection();
      fetchPrograms();
      showToast("Programs uploaded successfully!", "success");
      setPage(1);
    } catch (err: any) {
      console.error("Full Error Object:", err);

      if (axios.isAxiosError(err)) {
        // Log the server response to see the REAL error message

        const errorMsg = err.response?.data?.error || "Upload failed";
        showToast(errorMsg, "error");
      } else {
        showToast("An unexpected error occurred", "error");
      }
    }
  };

  const programColumns: Column<Program>[] = [
    { header: t("code"), accessor: "program_code" },
    lang === "en"
      ? { header: "Name", accessor: "program_name_en" }
      : { header: "ชื่อหลักสูตร", accessor: "program_name_th" },
    lang === "en"
      ? { header: "Abbrev.", accessor: "program_shortname_en" }
      : { header: "ชื่อย่อ", accessor: "program_shortname_th" },
    // {
    //   header: t("year"),
    //   accessor: "program_year",
    //   render: (value: any) => (lang === "en" ? Number(value) - 543 : value),
    // },
    {
      header: t("actions"),
      accessor: "program_code",
      actions: [
        {
          label: t("view details"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row: Program) => {
            router.push(`editProgram/${row.program_code}`);
            setLoading(true);
          },
        },
        // {
        //   label: t("edit"),
        //   color: "blue",
        //   hoverColor: "blue",
        //   onClick: (row: Program) => {
        //     setSelectedProgram(row);
        //     setShowEditPopup(true);
        //   },
        // },
        // {
        //   label: t("delete"),
        //   color: "red",
        //   hoverColor: "red",
        //   onClick: (row: Program) => {
        //     setProgramToDelete(row);
        //     setShowDeletePopup(true);
        //   },
        // },
      ],
    },
  ];

  const saveEdit = async () => {
    if (!selectedProgram || !token) return;

    try {
      const res = await apiClient.patch(
        `/program/${selectedProgram.id}`,
        {
          program_code: selectedProgram.program_code,
          program_name_en: selectedProgram.program_name_en,
          program_name_th: selectedProgram.program_name_th,
          program_shortname_en: selectedProgram.program_shortname_en,
          program_shortname_th: selectedProgram.program_shortname_th,
          program_year: selectedProgram.program_year,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setPrograms((prev) =>
        prev.map((prog) => (prog.id === selectedProgram.id ? res.data : prog)),
      );
      showToast("Program updated successfully", "success");
    } catch {
      showToast("Failed to update program", "error");
    } finally {
      setShowEditPopup(false);
      setSelectedProgram(null);
    }
  };

  // const confirmDelete = async () => {
  //   if (!programToDelete || !token) return;

  //   try {
  //     await apiClient.delete(`/program/${programToDelete.id}`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     setPrograms((prev) =>
  //       prev.filter((prog) => prog.id !== programToDelete.id),
  //     );
  //     showToast("Program deleted successfully", "success");
  //   } catch (err) {
  //     if (err instanceof Error) {
  //       showToast("Failed to delete program: " + err.message, "error");
  //     } else if (typeof err === "string") {
  //       showToast("Failed to delete program: " + err, "error");
  //     } else {
  //       showToast(
  //         "Failed to delete program: An unknown error occurred",
  //         "error",
  //       );
  //     }
  //   } finally {
  //     setShowDeletePopup(false);
  //     setProgramToDelete(null);
  //   }
  // };

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const filteredCourses = useMemo(() => {
    // 1. กรองข้อมูลตาม Search Term ก่อน
    const searched = programs.filter((course) => {
      const term = searchTerm.toLowerCase();
      return (
        course.program_name_en?.toLowerCase().includes(term) ||
        course.program_code?.toLowerCase().includes(term) ||
        course.program_name_th?.toLowerCase().includes(term)
      );
    });

    // 2. กำจัดตัวซ้ำ (Deduplication) โดยยึดตาม course.program_code
    // ถ้าตัวไหน code ซ้ำกัน จะเหลือแค่ตัวเดียว
    const uniqueData = Array.from(
      new Map(searched.map((item) => [item.program_code, item])).values(),
    );
    setTotalPages(Math.ceil(uniqueData.length / limit) || 1);

    return uniqueData;
  }, [programs, searchTerm]);

  return (
    <div className="p-5 md:p-8">
      {loading && <LoadingOverlay />}
     
      {/* HEADER & ACTIONS */}
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-light text-gray-800">
          {t("program management")}
        </h1>
        {/* The AddButton component handles all program creation/upload */}
        <AddButton
          buttonText={t("create new program")}
          placeholderText={{
            code: t("program code"),
            nameEn: t("program name (en)"),
            nameTh: t("program name (th)"),
            abbrEn: t("program abbreviation (en)"),
            abbrTh: t("program abbreviation (th)"),
            year: t("year"),
          }}
          submitButtonText={{
            insert: t("insert program"),
            upload: t("upload program (excel)"),
          }}
          onSubmit={handleAddProgram}
          onSubmitExcel={handleFileUpload}
          facultyOptions={facultyOptions}
          universityOptions={universityOptions}
          yearOptions={yearOptions}
          selectedFaculty={selectedFaculty}
          selectedUniversity={selectedUniversity}
          selectedYear={selectedYear}
          onFacultyChange={(value) => setSelectedFaculty(String(value))}
          onUniversityChange={(value) => setSelectedUniversity(String(value))}
          onYearChange={(value) => setSelectedYear(String(value))}
        />
      </div>
      {/* FILTERING CONTROLS */}
      {/* DATA TABLE SECTION */}
      <div className="bg-white p-4 rounded-lg shadow-xl">
        <Table<Program> columns={programColumns} data={filteredCourses} />
        {/* Pagination Controls */}
        <div className="pt-4 flex justify-end">
          <PaginationControlButton
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
      {/* POPUPS (Keep these at the bottom, they will overlay the main content) */}
      {showEditPopup && selectedProgram && (
        <FormEditPopup
          title={t("Edit Program")}
          data={selectedProgram}
          fields={[
            // ... your fields ...
            { label: t("Program Code"), key: "program_code", type: "text" },
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
              label: t("Abbreviation (EN)"),
              key: "program_shortname_en",
              type: "text",
            },
            {
              label: t("Abbreviation (TH)"),
              key: "program_shortname_th",
              type: "text",
            },
            { label: t("Year"), key: "program_year", type: "number" },
          ]}
          onChange={(update) => {
            setSelectedProgram(update);
          }}
          onClose={() => {
            setShowEditPopup(false);
            setSelectedProgram(null);
          }}
          onSave={saveEdit}
        />
      )}
      {/* <AlertPopup
        title={t("confirm deletion")}
        type="confirm"
        message={`${t("Are you sure you want to delete the program")} "${
          programToDelete?.program_shortname_en || ""
        }" ${t("This action cannot be undone.")}`}
        isOpen={showDeletePopup}
        onCancel={() => {
          setShowDeletePopup(false);
          setProgramToDelete(null);
        }}
        onConfirm={confirmDelete}
      /> */}
    </div>
  );
}
