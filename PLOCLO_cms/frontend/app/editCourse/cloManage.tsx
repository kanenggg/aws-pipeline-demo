import { useTranslation } from "react-i18next";
import { Table, Column } from "../../components/Table";
import { useEffect, useState } from "react";
import PaginationControlButton from "../../components/PaignateControlButton";
import AddButton from "../../components/AddButton";

import { addClo, getCLOsPaginate, CLO } from "../../utils/cloApi";

import { useGlobalToast } from "@/app/context/ToastContext";
import { useAuth } from "../context/AuthContext";

import AlertPopup from "../../components/AlertPopup";
import FormEditPopup from "../../components/EditPopup";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "../../components/LoadingOverlay";
import { Trash2, BookOpen } from "lucide-react";

// --- Interfaces ---

interface ExcelCLORow {
  code?: string | number;
  nameEn?: string;
  nameTh?: string;
  clo_name?: string;
  clo_code?: string;
  [key: string]: unknown;
}

interface CLOManagementProps {
  universityId?: string;
  facultyId?: string;
  programId?: string;
  year?: string;
  semester?: string;
  section?: string;
  courseId?: string;
}

export default function CLOManagement({ courseId }: CLOManagementProps) {
  const { t, i18n } = useTranslation("common");
  const { showToast } = useGlobalToast();
  const lang = i18n.language;
  const { isLoggedIn, token } = useAuth();

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Data
  const [clos, setClos] = useState<Array<CLO>>([]);
  const [loading, setLoading] = useState(false);

  const [selectedCLO, setSelectedCLO] = useState<CLO | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  // const [cloToDelete, setCloToDelete] = useState<CLO | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedCloIds, setSelectedCloIds] = useState<number[]>([]);

  // --- CRUD Operations ---

  const handleAddclo = async (data: Record<string, unknown>) => {
    if (!token) return;
    if (!courseId) {
      showToast(
        t("Please select a Semester and Section to identify the course"),
        "error",
      );
      return;
    }
    try {
      await addClo(
        {
          code: String(data.code),
          name: String(data.nameEn),
          name_th: String(data.nameTh || ""),
          course_id: courseId, // Sending Master ID
        },
        token,
      );
      fetchCLOs();
      showToast(t("clo added successfully"), "success");
      setPage(1);
    } catch {
      showToast("Failed to add CLO", "error");
    }
  };

  const handleExcelUpload = async (rows: ExcelCLORow[]) => {
    if (!token || !courseId) return showToast("Select course first", "error");
    setLoading(true);

    try {
      const closToUpload: any[] = [];
      let skipCount = 0;

      rows.forEach((row) => {
        const code = String(row.code || row.clo_code || row.CLO_code || 
  "").trim();
        const nameEn = String(row.nameEn || row.CLO_engname || "").trim();
        const nameTh = String(row.nameTh || row.CLO_name || "").trim();

        if (!code || !nameEn) return;

        // 🟢 CHECK DUP: ตรวจสอบว่า Code นี้มีอยู่ในตารางปัจจุบันแล้วหรือยัง
        const isDuplicate = clos.some(
          (existing) => existing.code.toLowerCase() === code.toLowerCase(),
        );

        if (isDuplicate) {
          skipCount++;
          return; // ข้ามตัวนี้ไป ไม่ใส่ใน Array ที่จะส่ง
        }

        closToUpload.push({
          code,
          name: nameEn,
          name_th: nameTh || "",
          course_id: Number(courseId),
        });
      });

      if (closToUpload.length > 0) {
        await apiClient.post(
          "/clo/bulk",
          { clos: closToUpload },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        showToast(
          `Added ${closToUpload.length} new CLOs. (Skipped ${skipCount} duplicates)`,
          "success",
        );
        fetchCLOs();
      } else {
        showToast(
          `No new data added. (${skipCount} items already exist)`,
          "success",
        );
      }
    } catch  {
      showToast("Bulk upload failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCloIds.length === 0) return;
    setLoading(true);
    try {
      await apiClient.delete("/clo/bulk-delete", {
        data: { cloIds: selectedCloIds },
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(`Deleted ${selectedCloIds.length} items`, "success");
      setSelectedCloIds([]); // Clear selection
      fetchCLOs();
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setLoading(false);
      setShowDeletePopup(false);
    }
  };

  const cloColumns: Column<CLO>[] = [
    {
      header: (
        <input
          type="checkbox"
          checked={clos.length > 0 && selectedCloIds.length === clos.length}
          onChange={() => {
            if (selectedCloIds.length === clos.length) setSelectedCloIds([]);
            else setSelectedCloIds(clos.map((c) => c.id));
          }}
        />
      ) as any,
      accessor: "id",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedCloIds.includes(row.id)}
          onChange={() => {
            setSelectedCloIds((prev) =>
              prev.includes(row.id)
                ? prev.filter((id) => id !== row.id)
                : [...prev, row.id],
            );
          }}
        />
      ),
    },
    { header: "Code", accessor: "code" },
    lang === "en"
      ? { header: "CLO Name (EN)", accessor: "name" }
      : { header: "CLO Name (TH)", accessor: "name_th" },
    {
      header: "Actions",
      accessor: "id",
      actions: [
        {
          label: t("edit"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row: CLO) => {
            setSelectedCLO(row);
            setShowEditPopup(true);
          },
        },
        // {
        //   label: t("delete"),
        //   color: "red",
        //   hoverColor: "red",
        //   onClick: (row: CLO) => {
        //     setCloToDelete(row);
        //     setShowDeletePopup(true);
        //   },
        // },
      ],
    },
  ];

  const saveEdit = async () => {
    if (!selectedCLO) return;
    try {
      await apiClient.patch(
        `/clo/${selectedCLO.id}`,
        {
          code: selectedCLO.code,
          name: selectedCLO.name,
          name_th: selectedCLO.name_th,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchCLOs();
      showToast("CLO updated successfully", "success");
      setShowEditPopup(false);
      setSelectedCLO(null);
    } catch {
      showToast("Failed to update CLO", "error");
    }
  };

  // const confirmDelete = async () => {
  //   if (!cloToDelete) return;
  //   try {
  //     await apiClient.delete(`/clo/${cloToDelete.id}`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     fetchCLOs();
  //     showToast("CLO deleted successfully", "success");
  //   } catch {
  //     showToast("Failed to delete CLO", "error");
  //   } finally {
  //     setShowDeletePopup(false);
  //     setCloToDelete(null);
  //     setLoading(false);
  //   }
  // };

  // 🟢 FIX: Fetch Logic
  const fetchCLOs = () => {
    if (!isLoggedIn || !token) return;
    setLoading(true);
    const filters: Record<string, string> = {};

    // Prioritize specificCourseId (from dropdown) over prop courseId
    if (courseId) {
      filters.courseId = courseId;
    } else if (courseId) {
      filters.courseId = courseId;
    }

    getCLOsPaginate(token, page, limit, filters)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const total = res.total || 1;
        setClos(data);
        setTotalPages(Math.ceil(total / limit));
      })
      .catch((err) => {
        showToast("API CLO error: " + err.message, "error");
      })
      .finally(() => setLoading(false));
  };

  // Add specificCourseId to dependency array so table refreshes when selection changes
  useEffect(() => {
    fetchCLOs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token, page, courseId]);

  return (
    <div className="mt-5 p-5">
      {loading && <LoadingOverlay />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4 mb-6">
        {/* Left Side: Title & Counter */}
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-600">
            <BookOpen size={24} />{" "}
            {/* ต้อง import { BookOpen } from "lucide-react" */}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">
              {t("clo manage")}
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Course Learning Outcomes
            </p>
          </div>
        </div>

        {/* Right Side: Actions Group */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* 🔴 Bulk Delete Button: ปรับให้ดูเป็นปุ่มอันตรายแต่สะอาดตา */}
          {selectedCloIds.length > 0 && (
            <button
              onClick={() => setShowDeletePopup(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm animate-in fade-in slide-in-from-right-4"
            >
              <Trash2 size={14} />{" "}
              {/* ต้อง import { Trash2 } from "lucide-react" */}
              {t("Delete Selected")} ({selectedCloIds.length})
            </button>
          )}

          {/* 🔵 Add Button: ปรับให้เป็น Primary Action */}
          <div className="flex-1 md:flex-none">
            <AddButton
              buttonText={t("add new clo")}
              placeholderText={{
                code: "CLO Code (e.g., CLO1)",
                nameEn: "CLO Name (EN)",
                nameTh: "CLO Name (TH)",
              }}
              submitButtonText={{
                insert: t("insert clo"),
                upload: t("upload clo (excel)"),
              }}
              showAbbreviationInputs={false}
              onSubmit={handleAddclo}
              onSubmitExcel={handleExcelUpload}
            />
          </div>
        </div>
      </div>

      <hr className="my-3" />

      <Table<CLO> columns={cloColumns} data={clos} />

      {selectedCLO && showEditPopup && (
        <FormEditPopup
          title="Edit CLO"
          data={selectedCLO}
          fields={[
            { label: "CLO Code", key: "code", type: "text" },
            { label: "CLO Name (EN)", key: "name", type: "text" },
            { label: "CLO Name (TH)", key: "name_th", type: "text" },
          ]}
          onChange={(updated) => setSelectedCLO(updated)}
          onSave={saveEdit}
          onClose={() => {
            setShowEditPopup(false);
            setSelectedCLO(null);
          }}
        />
      )}

      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title="Delete CLO"
        message="Are you sure you want to delete this CLO?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleBulkDelete}
        onCancel={() => {
          setShowDeletePopup(false);
          setSelectedCloIds([]);
        }}
      />

      <div className="pt-4 flex justify-end">
        <PaginationControlButton
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
