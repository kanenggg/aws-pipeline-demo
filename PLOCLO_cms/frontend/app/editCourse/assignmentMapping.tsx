"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useGlobalToast } from "@/app/context/ToastContext";
import { apiClient } from "../../utils/apiClient";
import LoadingOverlay from "@/components/LoadingOverlay";
import FormEditPopup from "@/components/EditPopup";
import AlertPopup from "@/components/AlertPopup";
import DropdownSelect from "@/components/DropdownSelect";
import { Calculator, RefreshCcw, Trash2, Edit3, Info, Upload } from "lucide-react";

interface Assignment {
  id: number;
  name: string;
  category: string;
  maxScore: number;
  weight: number;
  createdAt: string;
}

interface CategoryWeight {
  category: string;
  maxWeight: number;
}

export default function AssignmentMapping({
  sectionId,
}: {
  sectionId: string | number;
}) {
  const { token } = useAuth();
  const { showToast } = useGlobalToast();
  const { t } = useTranslation("common");

  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categoryConfigs, setCategoryConfigs] = useState<CategoryWeight[]>([]);

  // Input States
  const [newAssignName, setNewAssignName] = useState("");
  const [newAssignCategory, setNewAssignCategory] = useState<string | number>(
    "",
  );
  const [newAssignMaxScore, setNewAssignMaxScore] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editFormData, setEditFormData] = useState<Assignment | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<number | null>(
    null,
  );

  // 1. Fetch ทั้งรายการงาน และ การตั้งค่าเพดานคะแนน (Category Weights)
  const fetchData = async () => {
    if (!sectionId || !token) return;
    setLoading(true);
    try {
      const [assignRes, configRes] = await Promise.all([
        apiClient.get(`/assignment?sectionId=${sectionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get("/assignment/categoriesWeights", {
          params: { sectionId },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setAssignments(assignRes.data);
      setCategoryConfigs(configRes.data);
    } catch {
      showToast("Failed to fetch data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sectionId, token]);

  // 2. 🧮 ฟังก์ชันหลักในการคำนวณ Weight ใหม่ทั้งหมด (Auto-split logic)
  const handleRecalculateWeights = async () => {
    if (assignments.length === 0 || categoryConfigs.length === 0) return;
    setLoading(true);
    try {
      // คำนวณน้ำหนักใหม่สำหรับทุกงานในเครื่องก่อนส่งไป Server
      const updatedList = assignments.map((assign) => {
        const config = categoryConfigs.find(
          (c) => c.category === assign.category,
        );
        if (!config) return { id: assign.id, weight: 0 };

        // คะแนนเต็มรวมของหมวดหมู่นี้
        const totalMaxInCat = assignments
          .filter((a) => a.category === assign.category)
          .reduce((sum, a) => sum + Number(a.maxScore), 0);

        // สูตร: (คะแนนงานนี้ / คะแนนรวมหมวด) * น้ำหนักเพดานหมวด
        const newWeight =
          totalMaxInCat > 0
            ? (Number(assign.maxScore) / totalMaxInCat) *
              Number(config.maxWeight)
            : 0;

        return { id: assign.id, weight: Number(newWeight.toFixed(2)) };
      });

      // สั่ง Update ทีละรายการ (หรือใช้ Bulk Patch ถ้า API รองรับ)
      await Promise.all(
        updatedList.map((item) =>
          apiClient.patch(
            `/assignment/${item.id}`,
            { weight: item.weight },
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
        ),
      );

      showToast("Weights auto-distributed by score proportion!", "success");
      fetchData(); // รีโหลดข้อมูลล่าสุด
    } catch {
      showToast("Failed to recalculate weights", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !sectionId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target?.result;
        const XLSX = await import("xlsx");
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        // 🟢 ปรับปรุงการ Map ข้อมูลให้ปลอดภัยขึ้น
        const payload = data
          .filter((row) => row.Description || row.description) // ข้ามแถวที่ไม่มีชื่อ
          .map((row) => {
            // ตรวจสอบ Category ให้ตรงกับ Enum ที่ Backend รับได้
            const rawCat = String(row.category);

            return {
              section_id: Number(sectionId),
              name: String(row.Description || row.description).trim(),
              // ป้องกันปัญหาเว้นวรรคหรือตัวพิมพ์ใหญ่เล็ก
              category: rawCat.trim(),
              maxScore: isNaN(Number(row.maxScore))
                ? 100
                : Number(row.maxScore),
              weight: 0,
              description: "",
            };
          });

        await apiClient.post(
          "/assignment/bulk",
          { assignments: payload },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        showToast(`Imported ${payload.length} tasks successfully!`, "success");
        await handleRecalculateWeights();
        fetchData();
      } catch (err: any) {
        // 🔴 แสดง Error Message จาก Server เพื่อให้รู้สาเหตุที่แท้จริง
        const serverError =
          err.response?.data?.error || "Internal Server Error";
        showToast(`Upload failed: ${serverError}`, "error");
        console.error("Server Side Error:", err.response?.data);
      } finally {
        setLoading(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddAssignment = async () => {
    if (!newAssignName.trim() || !newAssignCategory || !newAssignMaxScore) {
      showToast("Please complete all fields", "error");
      return;
    }

    // ตรวจสอบว่าหมวดนี้มีการตั้งค่า Max Weight ไว้หรือยัง
    const hasConfig = categoryConfigs.some(
      (c) => c.category === newAssignCategory,
    );
    if (!hasConfig) {
      showToast("Please set weight limit for this category first!", "error");
      return;
    }

    try {
      setLoading(true);
      await apiClient.post(
        "/assignment",
        {
          section_id: Number(sectionId),
          name: newAssignName.trim(),
          maxScore: Number(newAssignMaxScore),
          category: newAssignCategory,
          weight: 0, // ส่ง 0 ไปก่อน แล้วค่อยสั่ง Recalculate
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // setNewAssignName("");
      // setNewAssignMaxScore("");
      // await handleRecalculateWeights(); // 🟢 คำนวณกระจายน้ำหนักใหม่ทันที
    } catch {
      showToast("Failed to add assignment", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    try {
      setLoading(true);
      await apiClient.patch(
        `/assignment/${editFormData.id}`,
        {
          name: editFormData.name,
          maxScore: Number(editFormData.maxScore),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setShowEditPopup(false);
      // await handleRecalculateWeights(); // 🟢 คำนวณใหม่หากมีการแก้ Max Score
    } catch {
      showToast("Update failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number | null) => {
    if (!id) return;
    try {
      setLoading(true);
      await apiClient.delete(`/assignment/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowDeletePopup(false);
      // await handleRecalculateWeights();
      fetchData();
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const sortedAssignments = useMemo(() => {
    const categoryOrder: Record<string, number> = {
      presentation: 1,
      assignment: 2,
      midtermExam: 3,
      finalExam: 4,
      project: 5,
      quiz: 6,
    };

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
          return romanMap[match].toString().padStart(2, "0");
        });
    };

    // นำ assignments มากรองตาม Filter ก่อนแล้วค่อย Sort
    const dataToTable = assignments.filter(
      (a) => activeFilter === "all" || a.category === activeFilter,
    );

    return [...dataToTable].sort((a, b) => {
      const catA = categoryOrder[a.category] || 99;
      const catB = categoryOrder[b.category] || 99;
      if (catA !== catB) return catA - catB;

      const scoreA = getKeywordScore(a.name);
      const scoreB = getKeywordScore(b.name);
      if (scoreA !== scoreB) return scoreA - scoreB;

      const normA = normalizeName(a.name);
      const normB = normalizeName(b.name);
      return normA.localeCompare(normB, undefined, { numeric: true });
    });
  }, [assignments, activeFilter]); // 🟢 อย่าลืมใส่ activeFilter ใน Dependency

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 font-kanit">

      {loading && <LoadingOverlay />}

      {/* 1. Dashboard Header */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-[2.5rem] text-white flex flex-col lg:flex-row justify-between items-center gap-6 shadow-2xl shadow-slate-200">
        {/* Left Side: Brand & Description */}
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-3xl shadow-xl shadow-blue-500/20">
            <Calculator className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase leading-none">
              Auto-Weight <span className="text-blue-400">Mapping</span>
            </h1>
            <p className="text-slate-400 text-[10px] md:text-xs mt-2 font-medium max-w-xs leading-relaxed">
              Proportional weight distribution based on category max scores.
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons Group */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* 🟢 Import Excel: ปรับให้เป็น Secondary Action */}
          <label className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3.5 rounded-2xl text-[10px] font-black tracking-[0.15em] transition-all cursor-pointer active:scale-95 group">
            <Upload
              size={14}
              className="group-hover:-translate-y-0.5 transition-transform"
            />
            IMPORT EXCEL
            <input
              type="file"
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
            />
          </label>

          {/* 🔵 Re-distribute: ปรับให้เป็น Primary Action */}
          <button
            onClick={handleRecalculateWeights}
            className="flex-1 lg:flex-none group flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 px-8 py-3.5 rounded-2xl text-[10px] font-black tracking-[0.15em] transition-all active:scale-95 shadow-lg shadow-blue-900/20"
          >
            <RefreshCcw
              size={14}
              className="group-hover:rotate-180 transition-transform duration-700 ease-in-out"
            />
            RE-DISTRIBUTE WEIGHTS
          </button>
        </div>
      </div>

      {/* 2. Create Form Section */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddAssignment();
          }}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="md:w-1/4">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">
              Category
            </label>
            <DropdownSelect
              options={categoryConfigs.map((c) => ({
                value: c.category,
                label: t(
                  c.category.charAt(0).toUpperCase() + c.category.slice(1),
                ),
              }))}
              value={newAssignCategory}
              onChange={setNewAssignCategory}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">
              Assignment Name
            </label>
            <input
              type="text"
              className="w-full h-[42px] border border-slate-200 px-4 rounded-xl outline-none focus:border-blue-400 transition-all font-medium"
              value={newAssignName}
              onChange={(e) => setNewAssignName(e.target.value)}
              placeholder="e.g. Lab 1, Project Phase 1"
            />
          </div>
          <div className="w-full md:w-32">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 text-center tracking-widest">
              Max Score
            </label>
            <input
              type="number"
              className="w-full h-[42px] border border-slate-200 rounded-xl text-center font-bold text-slate-700"
              value={newAssignMaxScore}
              onChange={(e) => setNewAssignMaxScore(e.target.value)}
              placeholder="100"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto px-10 bg-blue-600 text-white font-black h-[42px] rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            + {t("add")}
          </button>
        </form>
      </div>

      {/* 3. Table & List Section */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              Assignment Repository
            </h3>
            <div className="flex bg-slate-200/50 p-1 rounded-xl">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-1 rounded-lg text-[10px] font-black transition-all ${activeFilter === "all" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}
              >
                ALL
              </button>
              {categoryConfigs.map((c) => (
                <button
                  key={c.category}
                  onClick={() => setActiveFilter(c.category)}
                  className={`px-4 py-1 rounded-lg text-[10px] font-black transition-all ${activeFilter === c.category ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}
                >
                  {c.category.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full">
            <Info size={14} strokeWidth={3} />
            <span className="text-[9px] font-black uppercase">
              Weights sum to category limit
            </span>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="text-[10px] font-black uppercase text-slate-400 tracking-tighter bg-slate-50/30">
            <tr>
              <th className="p-5 text-center w-16">#</th>
              <th className="p-5">Task Details</th>
              <th className="p-5 text-center">Base Score</th>
              <th className="p-5 text-center">Calculated Weight</th>
              <th className="p-5 text-right px-10">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sortedAssignments.length > 0 ? (
              sortedAssignments.map((a, idx) => (
                <tr
                  key={a.id}
                  className="group hover:bg-blue-50/20 transition-all"
                >
                  <td className="p-5 text-center text-slate-300 font-bold text-xs">
                    {idx + 1}
                  </td>
                  <td className="p-5">
                    <div className="font-bold text-slate-700">{a.name}</div>
                    <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-0.5">
                      {a.category}
                    </div>
                  </td>
                  <td className="p-5 text-center">
                    <span className="font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                      {a.maxScore}
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-sm font-black text-slate-800">
                        {a.weight}%
                      </span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(a.weight / 20) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-right px-10">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditFormData(a);
                          setShowEditPopup(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setAssignmentToDelete(a.id);
                          setShowDeletePopup(true);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="p-20 text-center text-slate-300 font-medium italic"
                >
                  No assignments found for this criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Popups */}
      {showEditPopup && editFormData && (
        <FormEditPopup
          title="Adjust Assignment"
          data={editFormData}
          fields={[
            { label: "Task Name", key: "name", type: "text" },
            {
              label: "Max Score (Affects Weight)",
              key: "maxScore",
              type: "number",
            },
          ]}
          onSave={handleSaveEdit}
          onChange={setEditFormData}
          onClose={() => setShowEditPopup(false)}
        />
      )}

      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title="Remove Task"
        message="This will delete the assignment and redistribute weights in this category."
        onConfirm={() => handleDelete(assignmentToDelete)}
        onCancel={() => setShowDeletePopup(false)}
      />
    </div>
  );
}
