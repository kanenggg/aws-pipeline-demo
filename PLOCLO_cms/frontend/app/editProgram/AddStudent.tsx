"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useGlobalToast } from "@/app/context/ToastContext";
import { apiClient } from "../../utils/apiClient";

import { Column, Table } from "../../components/Table";
import AddButton from "../../components/AddButton";
import FormEditPopup from "../../components/EditPopup";
import AlertPopup from "../../components/AlertPopup";
import LoadingOverlay from "../../components/LoadingOverlay";
import { Trash2, Users } from "lucide-react";

interface Student {
  id: number;
  student_code: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function AddStudent({
  programId,
}: {
  programId?: string | number;
}) {
  const { t } = useTranslation("common");
  const { token, isLoggedIn, initialized } = useAuth();
  const { showToast } = useGlobalToast();

  const [loadingStudent, setLoadingStudent] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]); // สำหรับ Bulk Delete

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  // 1. Fetch Data
  const fetchStudents = async () => {
    if (!initialized || !isLoggedIn || !token || !programId) return;
    try {
      setLoadingStudent(true);
      const res = await apiClient.get("/student", {
        headers: { Authorization: `Bearer ${token}` },
        params: { programId },
      });
      setStudents(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch {
      showToast(t("Failed to load student data."), "error");
    } finally {
      setLoadingStudent(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [isLoggedIn, token, programId]);

  // 2. Multi-select Logic
  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  };

  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // 3. Actions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || !token) return;
    try {
      setLoadingStudent(true);
      await apiClient.delete("/student/bulk-delete", {
        data: { studentIds: selectedIds },
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(
        `Deleted ${selectedIds.length} students successfully!`,
        "success",
      );
      setSelectedIds([]);
      fetchStudents();
    } catch {
      showToast("Failed to delete students", "error");
    } finally {
      setLoadingStudent(false);
      setShowDeletePopup(false);
    }
  };

  const saveEdit = async () => {
    if (!selectedStudent || !token) return;
    try {
      setLoadingStudent(true);
      await apiClient.patch(`/student/${selectedStudent.id}`, selectedStudent, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Student updated successfully!", "success");
      setShowEditPopup(false);
      fetchStudents();
    } catch {
      showToast("Update failed", "error");
    } finally {
      setLoadingStudent(false);
    }
  };

  // 4. Excel & Manual Add (Bulk)
  const handleAddStudentBulk = async (rows: any[]) => {
    if (!token || !programId) return;
    setLoadingStudent(true);

    const studentsToUpload = rows
      .map((row) => {
        let firstName = row.first_name || "";
        let lastName = row.last_name || "";

        if (row.student_name) {
          const parts = String(row.student_name).trim().split(/\s+/);
          firstName = parts[0];
          lastName = parts.slice(1).join(" ");
        }

        return {
          student_code: String(row.student_id || row.student_code || "").trim(),
          first_name: firstName,
          last_name: lastName,
          email: String(row.email || "").trim(),
          program_id: Number(programId),
        };
      })
      .filter((s) => s.student_code && s.first_name);

    try {
      await apiClient.post(
        "/student/bulk",
        { students: studentsToUpload },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast(
        `Successfully added ${studentsToUpload.length} students`,
        "success",
      );
      fetchStudents();
    } catch {
      showToast("Bulk add failed", "error");
    } finally {
      setLoadingStudent(false);
    }
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      // แปลงเป็น String ก่อนเปรียบเทียบเพื่อความปลอดภัย
      const codeA = String(a.student_code || "");
      const codeB = String(b.student_code || "");

      return codeA.localeCompare(codeB, undefined, { numeric: true });
    });
  }, [students]);

  // 5. Columns Definition
  const studentColumns: Column<Student>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={
            students.length > 0 && selectedIds.length === students.length
          }
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
      ) as any,
      accessor: "id",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={() => handleCheckboxChange(row.id)}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
      ),
    },
    { header: t("Student Code"), accessor: "student_code" },
    {
      header: t("Full Name"),
      accessor: "first_name",
      render: (row) => `${row.first_name} ${row.last_name}`,
    },
    { header: t("Email"), accessor: "email" },
    {
      header: t("Actions"),
      accessor: "id",
      actions: [
        {
          label: t("Edit"),
          color: "blue",
          onClick: (row) => {
            setSelectedStudent(row);
            setShowEditPopup(true);
          },
        },
      ],
    },
  ];

  return (
    <div className="p-6 md:p-10 min-h-screen bg-slate-50/50 font-kanit">
      {loadingStudent && <LoadingOverlay />}


      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-600">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">
              {t("Student Management")}
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Total Enrolled:{" "}
              <span className="text-indigo-600">{students.length}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowDeletePopup(true)}
              className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
            >
              <Trash2 size={14} /> {t("Delete Selected")} ({selectedIds.length})
            </button>
          )}

          <AddButton
            buttonText={t("Create New Student")}
            placeholderText={{
              code: t("ID"),
              nameEn: "Full Name",
              nameTh: "Email",
            }}
            submitButtonText={{
              insert: t("Insert"),
              upload: t("Upload Excel"),
            }}
            showAbbreviationInputs={false}
            onSubmit={(data: any) => handleAddStudentBulk([data])} // Reuse bulk for single
            onSubmitExcel={handleAddStudentBulk}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <Table<Student> columns={studentColumns} data={sortedStudents} />
      </div>

      {/* Popups */}
      {showEditPopup && selectedStudent && (
        <FormEditPopup
          title={t("Edit Student")}
          data={selectedStudent}
          fields={[
            { label: "Student ID", key: "student_code", type: "text" },
            { label: "First Name", key: "first_name", type: "text" },
            { label: "Last Name", key: "last_name", type: "text" },
            { label: "Email", key: "email", type: "text" },
          ]}
          onChange={setSelectedStudent}
          onClose={() => setShowEditPopup(false)}
          onSave={saveEdit}
        />
      )}

      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title={t("Confirm Deletion")}
        message={
          selectedIds.length > 0
            ? `Are you sure you want to delete ${selectedIds.length} students?`
            : t("Are you sure you want to delete this student?")
        }
        onConfirm={selectedIds.length > 0 ? handleBulkDelete : () => {}}
        onCancel={() => setShowDeletePopup(false)}
      />
    </div>
  );
}
