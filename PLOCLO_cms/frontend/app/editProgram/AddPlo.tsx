/* eslint-disable @typescript-eslint/no-explicit-any */
import AddButton from "../../components/AddButton";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { Table, Column } from "../../components/Table";
import { useEffect, useState } from "react";
import { addPlo } from "../../utils/ploApi";
import PaginationControlButton from "../../components/PaignateControlButton";

import { useGlobalToast } from "../context/ToastContext";
import FormEditPopup from "../../components/EditPopup";
import AlertPopup from "../../components/AlertPopup";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "../../components/LoadingOverlay";
import { GraduationCap, Trash2 } from "lucide-react";

interface AddPloProps {
  programId?: string;
}

interface PLOPayload {
  code: string;
  name: string;
  engname: string;
  program_id: number;
}

interface Plo {
  id: number;
  name: string;
  engname: string;
  code: string;
  program_shortname_en: string;
  program_shortname_th: string;
  program_year: string;
  program_id: number;
  year: string;
}

export default function AddPlo({ programId }: AddPloProps) {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn, initialized } = useAuth();

  const [plos, setPlos] = useState<Plo[]>([]);
  const [loadingPlos, setLoadingPlos] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  const [selectedPlo, setSelectedPlo] = useState<Plo | null>(null);
  const [ploToDelete, setPloToDelete] = useState<Plo | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [selectedPloIds, setSelectedPloIds] = useState<number[]>([]);

  const { showToast } = useGlobalToast();

  const fetchPlos = async () => {
    if (!initialized) return; // wait for auth context to load

    try {
      setLoadingPlos(true);

      const res = await apiClient.get("/plo/paginate", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page,
          limit,
          programId: programId || "",
        },
      });

      setPlos(res.data.data);
      setTotalPages(res.data.pagination.totalPages || 1);
    } catch {
      showToast("Failed to fetch PLOs", "error");
    } finally {
      setLoadingPlos(false);
    }
  };

  // ฟังก์ชันสำหรับเพิ่ม PLO จาก Excel
  const handleAddPloExcel = async (rows: any[]) => {
    if (!initialized)
      return showToast("Auth context not initialized.", "error");
    if (!isLoggedIn || !token)
      return showToast("Please log in again.", "error");
    if (!programId) return showToast("Please select a program first.", "error");

    setLoadingPlos(true);

    // 1. ระบุ Type ให้กับ Array เพื่อป้องกัน Error "implicitly has an 'any[]' type"
    const plosToUpload: PLOPayload[] = [];
    const errorDetails: string[] = [];
    let skipCount = 0;

    rows.forEach((row, i) => {
      // ดึงข้อมูลโดยรองรับหัวคอลัมน์หลายรูปแบบจาก Excel
      const code = String(row.code || row.Code || row.PLO_code || "").trim();
      const nameTh = String(
        row.nameTh || row.name || row["ชื่อไทย"] || row.PLO_name || "",
      ).trim();
      const nameEn = String(
        row.nameEn || row.engname || row["ชื่ออังกฤษ"] || row.PLO_engname || "",
      ).trim();

      // 2. Validation เบื้องต้นก่อนรวบรวมข้อมูล
      if (!code || !nameTh || !nameEn) {
        errorDetails.push(`แถวที่ ${i + 1}: ข้อมูลไม่ครบถ้วน`);
        return;
      }

      // 3. ตรวจสอบข้อมูลซ้ำกับ State 'plos' ปัจจุบัน (ใช้ Interface Plo ที่คุณส่งมา)
      const isDuplicate = (plos as Plo[]).some(
        (p) => p.code.toLowerCase() === code.toLowerCase(),
      );

      if (isDuplicate) {
        skipCount++;
        return;
      }

      // 4. สร้าง Payload ที่สะอาดตามที่ Backend ต้องการ
      plosToUpload.push({
        code,
        name: nameTh,
        engname: nameEn,
        program_id: Number(programId),
      });
    });

    // 5. ส่งข้อมูลไปยัง Backend รอบเดียว (Bulk)
    if (plosToUpload.length > 0) {
      try {
        const response = await apiClient.post(
          "/plo/bulk",
          { plos: plosToUpload },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        showToast(
          `สำเร็จ: เพิ่ม ${response.data.inserted} รายการ ${
            skipCount > 0 ? `(ข้ามรายการซ้ำในระบบ ${skipCount} รายการ)` : ""
          }`,
          "success",
        );

        fetchPlos();
        setPage(1);
      } catch (err: any) {
        const errMsg = err.response?.data?.error || "Bulk upload failed";
        showToast(`เกิดข้อผิดพลาด: ${errMsg}`, "error");
      } finally {
        setLoadingPlos(false);
      }
    } else {
      setLoadingPlos(false);
      showToast(
        `ไม่มีข้อมูลใหม่ที่จะเพิ่ม (${skipCount} รายการมีอยู่แล้ว)`,
        "success",
      );
    }

    if (errorDetails.length > 0) {
      console.warn("Invalid Rows:", errorDetails);
    }
  };

  // ฟังก์ชันสำหรับเพิ่ม PLO
  const handleAddPlo = async (data: Record<string, unknown>) => {
    if (!initialized) return; // wait for auth context to load
    if (!isLoggedIn || !token) {
      showToast(
        "You are logged out or token expired. Please log in again.",
        "error",
      );
      return;
    }

    if (!data.code || !data.nameTh || !data.nameEn) {
      showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return;
    }

    try {
      await addPlo(
        {
          code: String(data.code),
          name: String(data.nameTh), // Thai name
          engname: String(data.nameEn), // English name
          program_id: String(programId), // Use the modal-selected program
        },
        token,
      );

      fetchPlos();
      showToast(t("PLO added successfully!"), "success");
      setPage(1);
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast("Error: " + err.message, "error");
      } else {
        showToast("Unexpected error occurred while adding PLO.", "error");
      }
    }
  };

  // const confirmDelete = async () => {
  //   if (!ploToDelete || !token) return;

  //   try {
  //     await apiClient.delete(`/plo/${ploToDelete.id}`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     showToast("PLO deleted successfully", "success");
  //     setPlos((prev) => prev.filter((plo) => plo.id !== ploToDelete.id));
  //   } catch {
  //     showToast("Failed to delete PLO", "error");
  //   } finally {
  //     fetchPlos();
  //     setShowDeletePopup(false);
  //     setPloToDelete(null);
  //   }
  // };

  const handleBulkDelete = async () => {
    if (selectedPloIds.length === 0 || !token) return;

    setLoadingPlos(true);
    try {
      await apiClient.delete("/plo/bulk-delete", {
        data: { ploIds: selectedPloIds }, // ส่งใน data สำหรับ DELETE request
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast(`ลบ PLO สำเร็จ ${selectedPloIds.length} รายการ`, "success");
      setSelectedPloIds([]); // ล้างค่าที่เลือก
      fetchPlos(); // รีเฟรชข้อมูล
    } catch {
      showToast("ไม่สามารถลบข้อมูลแบบกลุ่มได้", "error");
    } finally {
      setLoadingPlos(false);
      setShowDeletePopup(false);
    }
  };

  const saveEdit = async () => {
    if (!selectedPlo || !token) return;

    try {
      await apiClient.patch(
        `/plo/${selectedPlo.id}`,
        {
          code: selectedPlo.code,
          name: selectedPlo.name,
          engname: selectedPlo.engname,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchPlos();
      showToast("PLO updated successfully", "success");
    } catch {
      showToast("Failed to update PLO", "error");
    } finally {
      setSelectedPlo(null);
    }
  };

  const ploColumns: Column<Plo>[] = [
    {
      header: (
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          checked={plos.length > 0 && selectedPloIds.length === plos.length}
          onChange={() => {
            if (selectedPloIds.length === plos.length) setSelectedPloIds([]);
            else setSelectedPloIds(plos.map((p) => p.id));
          }}
        />
      ) as any,
      accessor: "id",
      render: (row) => (
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          checked={selectedPloIds.includes(row.id)}
          onChange={() => {
            setSelectedPloIds((prev) =>
              prev.includes(row.id)
                ? prev.filter((id) => id !== row.id)
                : [...prev, row.id],
            );
          }}
        />
      ),
    },
    { header: t("code"), accessor: "code" },
    lang === "en"
      ? { header: "Description", accessor: "engname" }
      : { header: "รายละเอียด", accessor: "name" },
    // lang === "en"
    //   ? {
    //       header: "Program",
    //       accessor: "program_shortname_en",
    //       render: (v) => v || "-",
    //     }
    //   : {
    //       header: "ชื่อโปรแกรม",
    //       accessor: "program_shortname_th",
    //       render: (v) => v || "-",
    //     },
    {
      header: t("actions"),
      accessor: "id",
      actions: [
        {
          label: t("edit"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row: Plo) => {
            setSelectedPlo(row);
            setShowEditPopup(true);
          },
        },
        // {
        //   label: t("delete"),
        //   color: "red",
        //   hoverColor: "red",
        //   onClick: (row: Plo) => {
        //     setPloToDelete(row);
        //     setShowDeletePopup(true);
        //   },
        // },
      ],
    },
  ];

  useEffect(() => {
    fetchPlos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token, page, programId]);

  return (
    <div className="p-5 md:p-8 min-h-screen">
      {loadingPlos && <LoadingOverlay />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8 gap-4">
        {/* ฝั่งซ้าย: Title & Badge */}
        <div className="flex items-center gap-4">
          <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-600">
            <GraduationCap size={28} />{" "}
            {/* อย่าลืม import { GraduationCap } from "lucide-react" */}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">
              {t("plo management")}
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Program Learning Outcomes
            </p>
          </div>
        </div>

        {/* ฝั่งขวา: Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* 🔴 ปุ่ม Delete Selected: แสดงเฉพาะเมื่อมีการเลือก */}
          {selectedPloIds.length > 0 && (
            <button
              onClick={() => setShowDeletePopup(true)} // แนะนำให้เปิด Popup ยืนยันก่อนลบจริง
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm animate-in fade-in slide-in-from-right-2"
            >
              <Trash2 size={14} />{" "}
              {/* อย่าลืม import { Trash2 } from "lucide-react" */}
              {t("Delete Selected")} ({selectedPloIds.length})
            </button>
          )}

          {/* 🔵 ปุ่ม AddButton: ตัว Action หลัก */}
          <div className="flex-1 md:flex-none">
            <AddButton
              buttonText={t("create new plo")}
              placeholderText={{
                code: t("plo code"),
                nameEn: t("plo name (en)"),
                nameTh: t("plo name (th)"),
              }}
              showAbbreviationInputs={false}
              submitButtonText={{
                insert: t("insert plo"),
                upload: t("upload plo (excel)"),
              }}
              onSubmit={handleAddPlo}
              onSubmitExcel={handleAddPloExcel}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-xl">
        <Table<Plo> columns={ploColumns} data={plos} />
        <div className="pt-4 flex justify-end">
          <PaginationControlButton
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Edit PLO Popup */}
      {showEditPopup && selectedPlo && (
        <FormEditPopup
          title={t("edit plo")}
          data={selectedPlo}
          fields={[
            { label: "PLO Code", key: "code", type: "text" },
            { label: "PLO Name (TH)", key: "name", type: "text" },
            { label: "PLO Name (EN)", key: "engname", type: "text" },
          ]}
          onClose={() => {
            setShowEditPopup(false);
            setSelectedPlo(null);
          }}
          onChange={(updated) => setSelectedPlo(updated)}
          onSave={saveEdit}
        />
      )}

      {/* Delete PLO Popup */}
      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title="Delete PLO"
        message="Are you sure you want to delete this PLO?"
        onConfirm={handleBulkDelete}
        onCancel={() => {
          setShowDeletePopup(false);
          setPloToDelete(null);
        }}
      />
    </div>
  );
}
