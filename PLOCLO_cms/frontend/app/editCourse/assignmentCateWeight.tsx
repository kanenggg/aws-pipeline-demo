"use client";

import { useEffect, useState, useMemo } from "react";
import { useGlobalToast } from "@/app/context/ToastContext";
import { apiClient } from "@/utils/apiClient";
import { Trash2, Plus, Save, Loader2 } from "lucide-react";
import DropdownSelect from "@/components/DropdownSelect";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

// 1. นิยาม Interface สำหรับโครงสร้างข้อมูล
interface WeightEntry {
  id?: number; // Optional เพราะรายการที่เพิ่ง Add ในหน้าเว็บจะยังไม่มี ID
  category: string;
  maxWeight: number;
}

export default function AssignmentCateWeight({
  sectionId,
}: {
  sectionId: string;
}) {
  const { showToast } = useGlobalToast();
  const { t } = useTranslation("common");
  const { token } = useAuth();

  // 2. เปลี่ยน State จาก Record เป็น Array ของ WeightEntry
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [initialWeights, setInitialWeights] = useState<WeightEntry[]>([]); // 🟢 เพิ่มตัวนี้
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedCat, setSelectedCat] = useState<string | number>("");
  const [inputWeight, setInputWeight] = useState<string>("");

  const CATEGORIES = [
    { value: "quiz", label: t("Quiz") },
    { value: "presentation", label: t("Presentation") },
    { value: "midtermExam", label: t("Midterm") },
    { value: "finalExam", label: t("Final") },
    { value: "assignment", label: t("Assignments") },
    { value: "project", label: t("Project") },
  ];

  const fetchData = async () => {
    if (!sectionId) return;
    try {
      setLoading(true);
      const res = await apiClient.get("/assignment/categoriesWeights", {
        params: { sectionId },
      });

      // Map ข้อมูลให้ตรงกับ Interface
      const mappedData: WeightEntry[] = res.data.map((item: any) => ({
        id: item.id,
        category: item.category,
        maxWeight: parseFloat(item.maxWeight),
      }));

      setWeights(mappedData);
      setInitialWeights(mappedData);
    } catch (error) {
      console.error("Failed to fetch weights", error);
      showToast("Failed to load weight settings", "error");
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch ข้อมูลและเก็บ ID ไว้ด้วย
  useEffect(() => {
    fetchData();
  }, [sectionId]);

  const hasChanges = useMemo(() => {
    if (weights.length !== initialWeights.length) return true;

    // ตรวจสอบว่ามีรายการใดที่ค่า maxWeight หรือ category เปลี่ยนไปหรือไม่
    return weights.some((w) => {
      const initial = initialWeights.find((iw) => iw.category === w.category);
      if (!initial) return true; // เป็นรายการที่เพิ่มมาใหม่
      return initial.maxWeight !== w.maxWeight;
    });
  }, [weights, initialWeights]);

  // 4. ฟังก์ชันเพิ่มรายการ (Client-side)
  const handleAddEntry = () => {
    const val = parseFloat(inputWeight);
    if (!selectedCat) {
      showToast("Please select a category", "error");
      return;
    }
    if (isNaN(val) || val <= 0) {
      showToast("Please enter a valid weight", "error");
      return;
    }

    // ตรวจสอบไม่ให้เลือก Category ซ้ำ
    if (weights.some((w) => w.category === selectedCat)) {
      showToast("This category already exists", "error");
      return;
    }

    setWeights((prev) => [
      ...prev,
      { category: String(selectedCat), maxWeight: val },
    ]);
    setInputWeight("");
    setSelectedCat("");
  };

  // 5. 🛠️ ฟังก์ชันลบที่แก้ไขแล้ว (Delete by ID)
  const handleRemove = async (category: string, id?: number) => {
    // ถ้ามี ID แสดงว่าข้อมูลอยู่ใน Database แล้ว ให้ส่ง Delete Request
    if (id) {
      try {
        await apiClient.delete(`/assignment/categoriesWeights/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Removed from database", "success");
      } catch {
        showToast("Failed to delete from server", "error");
        return; // หยุดทำงานถ้าลบใน DB ไม่สำเร็จ
      }
    }

    // ลบออกจาก UI State (ใช้ category เป็นตัวอ้างอิง)
    setWeights((prev) => prev.filter((w) => w.category !== category));
  };

  const handleSave = async () => {
    const total = weights.reduce((sum, item) => sum + item.maxWeight, 0);

    if (total > 100) {
      showToast("Total weight cannot exceed 100%.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        section_id: Number(sectionId),
        weights: weights.map((w) => ({
          category: w.category,
          maxWeight: w.maxWeight,
        })),
      };

      await apiClient.post("/assignment/categoriesWeights/bulk", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Weights saved successfully!", "success");

      // Refresh data เพื่อเอา ID ใหม่จาก DB
      const res = await apiClient.get("/assignment/categoriesWeights", {
        params: { sectionId },
      });
      setWeights(
        res.data.map((item: any) => ({
          id: item.id,
          category: item.category,
          maxWeight: parseFloat(item.maxWeight),
        })),
      );
    } catch {
      showToast("Failed to save weights.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-400 animate-pulse">
        Loading settings...
      </div>
    );

  const totalWeight = weights.reduce((a, b) => a + b.maxWeight, 0);

  return (
    <div className="p-8 max-w-2xl mx-auto bg-white shadow-2xl rounded-[2rem] border border-slate-100 mt-10">


      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          Assignment <span className="text-blue-600">Weights</span>
        </h1>
        <p className="text-sm text-slate-400 font-medium">
          Define how each assessment category contributes to the final grade.
        </p>
      </div>

      {/* --- Section: Add New Entry --- */}
      <div className="bg-slate-50 p-5 rounded-[1.5rem] mb-8 border border-slate-100 flex flex-col gap-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          Add Assessment Category
        </label>
        <div className="flex flex-wrap md:flex-nowrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <DropdownSelect
              options={CATEGORIES}
              value={selectedCat}
              onChange={(v) => setSelectedCat(v)}
            />
          </div>
          <div className="relative">
            <input
              type="number"
              placeholder="Weight"
              value={inputWeight}
              onChange={(e) => setInputWeight(e.target.value)}
              className="w-28 h-[42px] px-4 border border-slate-200 rounded-xl outline-none focus:border-blue-400 transition-all font-bold text-slate-700"
            />
            <span className="absolute right-4 top-2.5 text-slate-300 font-bold">
              %
            </span>
          </div>
          <button
            onClick={handleAddEntry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-[42px] rounded-xl transition-all flex items-center gap-2 font-bold shadow-lg shadow-blue-100 active:scale-95 shrink-0"
          >
            <Plus size={18} strokeWidth={3} /> {t("add")}
          </button>
        </div>
      </div>

      {/* --- Section: List Display --- */}
      <div className="space-y-3 min-h-[150px]">
        <div className="flex justify-between items-center px-2 mb-4">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            Active Categories
          </h3>
          <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {weights.length}
          </span>
        </div>

        {weights.length === 0 ? (
          <div className="text-center py-12 text-slate-300 italic border-2 border-dashed border-slate-50 rounded-[1.5rem]">
            No assessment categories defined yet.
          </div>
        ) : (
          weights.map((item) => (
            <div
              key={item.category}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600 font-bold uppercase text-xs shadow-inner">
                  {item.category.substring(0, 5)}
                </div> */}
                <div>
                  <span className="font-bold text-slate-700 capitalize text-sm tracking-tight">
                    {item.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <span className="text-[18px] font-black text-slate-800">
                    {item.maxWeight}
                    <span className="text-[12px] ml-0.5 text-slate-400">%</span>
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(item.category, item.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- Footer: Save & Summary --- */}
      <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
            Usage Intensity
          </p>
          <p
            className={`text-2xl font-black ${totalWeight > 100 ? "text-red-500" : "text-emerald-500"}`}
          >
            {totalWeight}%{" "}
            <span className="text-sm text-slate-300 font-medium">/ 100%</span>
          </p>
        </div>
        <button
          onClick={handleSave}
          // 🟢 เพิ่มเงื่อนไข !hasChanges เข้าไป
          disabled={saving || weights.length === 0 || !hasChanges}
          className={`flex items-center gap-2 px-10 py-3 rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95
        ${
          !hasChanges || saving
            ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
            : "bg-slate-900 hover:bg-black text-white"
        }`}
        >
          {saving ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          {saving ? "SAVING..." : hasChanges ? "SAVE CHANGES" : "NO CHANGES"}
        </button>
      </div>
    </div>
  );
}
