import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";

// Define the shape of your data
interface MappingData {
  ploCode: string;
  ploNameEn: string;
  ploNameTh: string;
  cloCode: string;
  cloNameEn: string;
  cloNameTh: string;
}

export function MappingTable() {
  const { t } = useTranslation("common");

  // Sample data for demonstration
  const [data, setData] = useState<MappingData[]>([]);

  useEffect(() => {
    // Fetch or generate your mapping data here
    const fetchData = async () => {
      // Replace with actual data fetching logic
      const sampleData: MappingData[] = [
        {
          ploCode: "PLO1",
          ploNameEn: "Program Learning Outcome 1",
          ploNameTh: "ผลลัพธ์การเรียนรู้ของโปรแกรม 1",
          cloCode: "CLO1",
          cloNameEn: "Course Learning Outcome 1",
          cloNameTh: "ผลลัพธ์การเรียนรู้ของหลักสูตร 1",
        },
        // Add more sample data as needed
      ];
      setData(sampleData);
    };

    fetchData();
  }, []);

  return (
    <div className="overflow-x-auto mt-5">
      <table className="border border-gray-300 w-full text-sm">
        {/* FIX: the <tr> must be INSIDE the <thead> */}
        <thead className="bg-gray-100 border-b border-gray-300">
          <tr>
            {/* FIX: Removed extra </th> closing tags that were here before the text */}
            <th className="text-left px-4 py-2 border-r border-gray-300">
              {t("PLO Code")}
            </th>
            <th className="text-left px-4 py-2 border-r border-gray-300">
              {t("PLO Name (EN)")}
            </th>
            <th className="text-left px-4 py-2 border-r border-gray-300">
              {t("PLO Name (TH)")}
            </th>
            <th className="text-left px-4 py-2 border-r border-gray-300">
              {t("CLO Code")}
            </th>
            <th className="text-left px-4 py-2 border-r border-gray-300">
              {t("CLO Name (EN)")}
            </th>
            <th className="text-left px-4 py-2 border-gray-300">
              {t("CLO Name (TH)")}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="px-4 py-2 border-r border-gray-300">
                {row.ploCode}
              </td>
              <td className="px-4 py-2 border-r border-gray-300">
                {row.ploNameEn}
              </td>
              <td className="px-4 py-2 border-r border-gray-300">
                {row.ploNameTh}
              </td>
              <td className="px-4 py-2 border-r border-gray-300">
                {row.cloCode}
              </td>
              <td className="px-4 py-2 border-r border-gray-300">
                {row.cloNameEn}
              </td>
              <td className="px-4 py-2 border-gray-300">{row.cloNameTh}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
