/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useTranslation } from "next-i18next";
import LoadingOverlay from "@/components/LoadingOverlay";

// --- Types ---
interface PLO {
  id: number;
  code: string;
  name_en: string;
  name_th: string;
}

interface CLO {
  id: number;
  code: string;
  name_en: string;
}

// 🟢 FIX: Renamed prop to 'masterCourseId' to avoid confusion with Section ID
export default function CloPloMapping({
  masterCourseId,
  programId,
}: {
  masterCourseId: string | number; // This must be the MASTER Course ID (e.g. CS101), NOT Section ID
  programId: string | number;
}) {
  const { token } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const [loading, setLoading] = useState(false);

  // --- SELECTION STATES ---
  const [plos, setPlos] = useState<PLO[]>([]);
  const [clos, setClos] = useState<CLO[]>([]);
  const [mappingGrid, setMappingGrid] = useState<Record<string, number>>({});

  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());

  // --------------------------------------------------------
  // 1. DATA FETCHING
  // --------------------------------------------------------

  // A. Fetch PLOs
  useEffect(() => {
    if (!programId || !token) {
      setPlos([]);
      return;
    }
    setLoading(true);
    apiClient
      .get(`/plo?programId=${programId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setPlos(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
        showToast(t("Failed to load PLOs"), "error");
      });
  }, [programId, token, showToast, t]);

  // B. Fetch CLOs AND Existing Mappings
  useEffect(() => {
    // 🟢 FIX: Check for masterCourseId
    if (!masterCourseId || !token) {
      setClos([]);
      setMappingGrid({});
      return;
    }

    setLoading(true);

    Promise.all([
      // 🟢 FIX: Use masterCourseId for fetching
      apiClient.get(`/clo?courseId=${masterCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      apiClient.get(`/mapping/clo-plo/${masterCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([cloRes, mappingRes]) => {
        setClos(cloRes.data);

        const newGrid: Record<string, number> = {};
        const mappings = Array.isArray(mappingRes.data) ? mappingRes.data : [];

        mappings.forEach((m: any) => {
          newGrid[`${m.clo_id}_${m.plo_id}`] = m.weight;
        });

        setMappingGrid(newGrid);
        setChangedKeys(new Set());
      })
      .catch((err) => {
        console.error("Error loading matrix:", err);
        showToast(t("Failed to load matrix data"), "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [masterCourseId, token, showToast, t]); // 🟢 Depend on masterCourseId

  // --------------------------------------------------------
  // 3. VALIDATION & HANDLERS
  // --------------------------------------------------------

  const handleWeightChange = (cloId: number, ploId: number, val: string) => {
    if (val !== "" && isNaN(Number(val))) return;

    const key = `${cloId}_${ploId}`;

    setMappingGrid((prev) => ({
      ...prev,
      [key]: val === "" ? 0 : Number(val),
    }));

    setChangedKeys((prev) => new Set(prev).add(key));
  };

  const cloTotals = useMemo(() => {
    const totals: Record<number, number> = {};

    Object.keys(mappingGrid).forEach((key) => {
      const [cloIdStr] = key.split("_");
      const cloId = Number(cloIdStr);

      // 🟢 FIX: Explicitly cast to Number and handle NaN/undefined
      const rawValue = mappingGrid[key];
      const weight = Number(rawValue) || 0;

      if (clos.some((c) => c.id === cloId)) {
        // 🟢 FIX: Use parseFloat or Number to ensure mathematical addition
        const currentTotal = totals[cloId] || 0;
        totals[cloId] = Number((currentTotal + weight).toFixed(4));
      }
    });

    clos.forEach((clo) => {
      if (!(clo.id in totals)) {
        totals[clo.id] = 0;
      }
    });

    return totals;
  }, [mappingGrid, clos]);

  const isValidationSuccess = useMemo(() => {
    if (clos.length === 0) return true;
    return Object.values(cloTotals).every(
      (total) => Math.abs(total - 100) < 0.01,
    );
  }, [cloTotals, clos]);

  const handleSave = async () => {
    if (!token) return;

    if (changedKeys.size === 0) {
      showToast(t("No changes to save"), "success");
      return;
    }

    if (!isValidationSuccess) {
      showToast(t("validation_error_100_percent"), "error");
      return;
    }

    setLoading(true);

    const updates = Array.from(changedKeys).map((key) => {
      const [cloId, ploId] = key.split("_");
      return {
        clo_id: Number(cloId),
        plo_id: Number(ploId),
        weight: mappingGrid[key] || 0,
      };
    });

    try {
      await apiClient.post(
        "/mapping/clo-plo",
        { updates },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast(t("Mapping saved successfully!"), "success");
      setChangedKeys(new Set());
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || t("Failed to save"), "error");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------
  // 4. UI RENDER
  // --------------------------------------------------------
  return (
    <div className="mt-5 p-5">
      {loading && <LoadingOverlay />}
      <div className="bg-white p-4 shadow-md rounded-lg overflow-x-auto min-h-[300px] border border-gray-200 ">
        <div className="flex flex-col">
          {/* Save Button */}
          {masterCourseId && clos.length > 0 && plos.length > 0 && (
            <button
              onClick={handleSave}
              disabled={
                loading || !isValidationSuccess || changedKeys.size === 0
              }
              className={`px-6 py-2.5 max-w-[300px] rounded shadow transition disabled:opacity-50 font-medium mb-2.5 self-end flex items-center gap-2 justify-center
                ${
                  !isValidationSuccess
                    ? "bg-red-500 text-white cursor-not-allowed"
                    : changedKeys.size === 0
                      ? "bg-gray-300 text-gray-500"
                      : "bg-green-600 hover:bg-green-700 text-white"
                }`}
            >
              {loading ? t("Loading...") : t("Save Changes")}
            </button>
          )}

          {/* Matrix Content */}
          {masterCourseId && clos.length > 0 && plos.length > 0 && (
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-0 left-0 bg-gray-100 z-30 w-[100px] min-w-[70px] h-14 shadow-md">
                    <div className="relative w-full h-full">
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <line
                          x1="0"
                          y1="0"
                          x2="100%"
                          y2="100%"
                          stroke="#d1d5db"
                          strokeWidth="1"
                        />
                      </svg>
                      <div className="absolute top-2 right-3 text-xs font-bold text-gray-600">
                        PLO
                      </div>
                      <div className="absolute bottom-2 left-3 text-xs font-bold text-gray-600">
                        CLO
                      </div>
                    </div>
                  </th>

                  {plos.map((plo) => (
                    <th
                      key={plo.id}
                      className="border p-2 min-w-[70px] text-center bg-gray-50 hover:bg-gray-100 transition-colors"
                      title={lang === "th" ? plo.name_th : plo.name_en}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-800">
                          {plo.code}
                        </span>
                      </div>
                    </th>
                  ))}

                  <th className="border p-2 min-w-[90px] text-center bg-gray-200 font-extrabold text-gray-800 right-0 z-20 shadow-inner">
                    {t("Total (%)")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {clos.map((clo) => {
                  const total = cloTotals[clo.id] || 0;
                  const isTotalValid = Math.abs(total - 100) < 0.01;

                  return (
                    <tr
                      key={clo.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        !isTotalValid ? "border-t-2 border-red-400" : ""
                      }`}
                    >
                      <td
                        className="border p-3 font-bold left-0 bg-white z-10 shadow-sm"
                        title={clo.name_en}
                      >
                        {clo.code}
                      </td>

                      {plos.map((plo) => {
                        const key = `${clo.id}_${plo.id}`;
                        const weight = mappingGrid[key] || "";
                        const hasValue = Number(weight) > 0;
                        const isChanged = changedKeys.has(key);
                        const displayValue =
                          weight !== "" && weight !== undefined
                            ? Number(weight).toString()
                            : "";

                        return (
                          <td
                            key={plo.id}
                            className={`border p-1 text-center ${
                              hasValue ? "bg-blue-50/30" : ""
                            }`}
                          >
                            <input
                              type="text"
                              min="0"
                              max="100"
                              className={`w-full h-full text-center py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all 
                                ${
                                  hasValue
                                    ? "font-bold text-blue-700"
                                    : "text-gray-400"
                                }
                                ${
                                  isChanged
                                    ? "bg-yellow-50 ring-2 ring-yellow-200"
                                    : ""
                                }
                              `}
                              placeholder="-"
                              value={displayValue}
                              onChange={(e) =>
                                handleWeightChange(
                                  clo.id,
                                  plo.id,
                                  e.target.value,
                                )
                              }
                            />
                          </td>
                        );
                      })}

                      <td
                        className={`border p-3 text-center font-extrabold ${
                          isTotalValid
                            ? "bg-green-100 text-green-700"
                            : "bg-red-200 text-red-800"
                        }`}
                        title={
                          isTotalValid
                            ? "Total is 100%"
                            : `Error: Total is ${total}%. Must be 100%`
                        }
                      >
                        {parseFloat(total.toString())}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {!isValidationSuccess && (
                <tfoot>
                  <tr>
                    <td
                      colSpan={plos.length + 2}
                      className="p-2 text-center bg-red-50 text-red-700 font-semibold border-t-4 border-red-400"
                    >
                      ⚠️ {t("please ensure totals are 100 percent")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {!loading && masterCourseId && clos.length === 0 && (
            <div className="text-center text-red-400 py-10 bg-red-50 rounded-lg">
              {t("no_clos_found")}
            </div>
          )}
          {!loading && masterCourseId && plos.length === 0 && (
            <div className="text-center text-red-400 py-10 bg-red-50 rounded-lg">
              {t("no_plos_found")}
            </div>
          )}

          {!masterCourseId && (
            <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-400 font-medium">
                {t("select_course_section")}
              </p>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
