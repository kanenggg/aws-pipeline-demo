import { useTranslation } from "next-i18next";
import React, { useEffect, useState } from "react";

export interface TableAction<T> {
  label: string;
  color?: "blue" | "red" | "green" | "gray";
  hoverColor?: "blue" | "red" | "green" | "gray";
  onClick: (row: T) => void;
}

export interface Column<T> {
  header: string;
  accessor: keyof T | string;
  className?: string; // Added to interface for consistency
  // Fix: render should receive the full row object
  render?: (row: T) => React.ReactNode;
  actions?: {
    label: string;
    color?: string;
    hoverColor?: string;
    onClick: (row: T) => void;
  }[];
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
}

export function Table<T>({ columns, data, className = "" }: TableProps<T>) {
  const [fontSize, setFontSize] = useState("text-sm");
  const { t } = useTranslation("common");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setFontSize("text-xs");
      else if (width < 1024) setFontSize("text-sm");
      else setFontSize("text-base");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getColorClasses = (
    color?: string,
    type: "bg" | "hoverBg" | "text" = "bg",
  ) => {
    switch (color) {
      case "red":
        return type === "bg"
          ? "bg-red-500"
          : type === "hoverBg"
            ? "hover:bg-red-600"
            : "text-red-500";
      case "blue":
        return type === "bg"
          ? "bg-blue-500"
          : type === "hoverBg"
            ? "hover:bg-blue-600"
            : "text-blue-500";
      case "green":
        return type === "bg"
          ? "bg-green-500"
          : type === "hoverBg"
            ? "hover:bg-green-600"
            : "text-green-500";
      case "gray":
        return type === "bg"
          ? "bg-gray-400"
          : type === "hoverBg"
            ? "hover:bg-gray-500"
            : "text-gray-700";
      default:
        return type === "bg"
          ? "bg-gray-400"
          : type === "hoverBg"
            ? "hover:bg-gray-500"
            : "text-gray-700";
    }
  };

  return (
    <div
      className={`overflow-x-auto mt-5 bg-white rounded-lg shadow-md border border-gray-200 ${className}`}
    >
      <table className={`w-full ${fontSize} border-separate border-spacing-0`}>
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={`
                  text-left px-5 py-3 font-semibold text-gray-600 uppercase tracking-wider 
                  sticky top-0 bg-gray-50 border-b-2 border-gray-200
                  /* Vertical Line Logic */
                  ${i !== columns.length - 1 ? "border-r border-gray-200" : ""}
                  ${col.className ?? ""}
                  ${i === 0 ? "rounded-tl-lg" : ""}
                  ${i === columns.length - 1 ? "rounded-tr-lg" : ""}
                `}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-8 text-gray-500 border-t font-light"
              >
                {t("no data available")}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors duration-150 hover:bg-orange-50"
              >
                {columns.map((col, colIndex) => {
                  // Common classes for all cells, including vertical borders
                  const cellClasses = `
                    px-5 py-3 align-middle border-b border-gray-100
                    ${colIndex !== columns.length - 1 ? "border-r border-gray-100" : ""}
                    ${col.className ?? ""}
                  `;

                  if (col.actions) {
                    return (
                      <td
                        key={colIndex}
                        className={`${cellClasses} whitespace-nowrap`}
                      >
                        <div className="flex gap-3 items-center">
                          {col.actions.map((action, i) => (
                            <button
                              key={i}
                              onClick={() => action.onClick(row)}
                              className={`
                                ${getColorClasses(action.color, "text")} 
                                ${action.hoverColor ? getColorClasses(action.hoverColor, "text") : "hover:text-gray-900"}
                                font-light text-sm p-0.5 cursor-pointer transition-all duration-150 hover:underline
                              `}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={colIndex}
                      className={`${cellClasses} text-gray-700 font-light`}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as any)[col.accessor]) || "-"}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
