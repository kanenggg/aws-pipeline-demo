import { useTranslation } from "next-i18next";
import React from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

const PaginationControlButton: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
}) => {
  const { t } = useTranslation("common");

  return (
    <div className="flex justify-center items-center mt-4 gap-3">
      {/* Previous Button */}
      <button
        className={`
                px-4 py-2 
                border border-gray-300 rounded-lg 
                text-sm font-light
                transition-all duration-200 
                shadow-sm 
                
                ${
                  page === 1
                    ? "text-gray-400 bg-gray-50 cursor-not-allowed" // Disabled state
                    : "bg-white text-gray-700 hover:bg-orange-500 hover:text-white hover:shadow-md" // Active state
                }
            `}
        disabled={page === 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        {t("previous")}
      </button>

      {/* Page Indicator */}
      <span className="flex items-center text-sm text-gray-600 font-light whitespace-nowrap">
        {t("page")} {/* Current Page Number - Highlighted */}
        <span className="px-2 font-light text-lg text-orange-600 mx-1">
          {page}
        </span>
        {t("of")} {totalPages}
      </span>

      {/* Next Button */}
      <button
        className={`
                px-4 py-2 
                border border-gray-300 rounded-lg 
                text-sm font-light
                transition-all duration-200 
                shadow-sm 
                
                ${
                  page === totalPages
                    ? "text-gray-400 bg-gray-50 cursor-not-allowed" // Disabled state
                    : "bg-white text-gray-700 hover:bg-orange-500 hover:text-white hover:shadow-md" // Active state
                }
            `}
        disabled={page === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        {t("next")}
      </button>
    </div>
  );
};

export default PaginationControlButton;
