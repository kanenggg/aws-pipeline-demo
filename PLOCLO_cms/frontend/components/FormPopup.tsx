/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import * as XLSX from "xlsx";
import DropdownSelect from "./DropdownSelect";

// Interface for the Manual Input Form
interface FormData {
  code: string;
  nameEn: string;
  nameTh: string;
  abbrEn: string;
  abbrTh: string;
  year: string;
  [key: string]: string; // Allow dynamic access for validation loop
}

// 1. Make Props Generic <T> to match AddButton
interface FormPopupProps<T> {
  requiredFields?: string[];
  fieldMap?: Record<string, string>;
  facultyOptions?: { label: string; value: string }[];
  programOptions?: { label: string; value: string }[];
  universityOptions?: { label: string; value: string }[];
  yearOptions?: { label: string; value: string }[];
  semesterOptions?: { label: string; value: string }[];
  sectionOptions?: { label: string; value: string }[];
  courseOptions?: { label: string; value: string }[];

  selectedUniversity?: string;
  selectedYear?: number | string;
  selectedFaculty?: string;
  selectedProgram?: string | number;
  selectedSemester?: number | string;
  selectedSection?: number | string;
  selectedCourse?: string;

  onUniversityChange?: (value: string | number) => void;
  onFacultyChange?: (value: string | number) => void;
  onProgramChange?: (value: string | number) => void;
  onYearChange?: (value: string | number) => void;
  onSemesterChange?: (value: string | number) => void;
  onSectionChange?: (value: string | number) => void;
  onCourseChange?: (value: string | number) => void;

  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void> | void;

  disableUniversity?: boolean;
  disableFaculty?: boolean;

  // 2. Update onSubmitExcel to accept T[]
  onSubmitExcel?: (rows: T[]) => Promise<void> | void;

  placeholderText: Partial<FormData>;
  submitButtonText?: {
    insert?: string;
    upload?: string;
  };
  showAbbreviationInputs?: boolean;
  showYearInput?: boolean;
  showCodeInput?: boolean;
}

// 3. Add <T,> to the component definition
export default function FormPopup<T>({
  onClose,
  onSubmit,
  onSubmitExcel,
  placeholderText,
  submitButtonText = {},
  showAbbreviationInputs = true,
  showCodeInput = true,
  // showYearInput = false, // Unused in current logic, but kept in props
  facultyOptions = [],
  programOptions = [],
  universityOptions = [],
  yearOptions = [],
  semesterOptions = [],
  sectionOptions = [],
  courseOptions = [],
  selectedUniversity = "",
  selectedYear = 0,
  selectedFaculty = "",
  selectedProgram = "",
  selectedSemester = "",
  selectedSection = "",
  selectedCourse = "",
  onFacultyChange,
  onProgramChange,
  onUniversityChange,
  onYearChange,
  onSemesterChange,
  onCourseChange,
  onSectionChange,
  disableFaculty = false,
  disableUniversity = false,
  requiredFields = [],
  fieldMap = {},
}: FormPopupProps<T>) {
  const {
    code = "",
    nameEn = "",
    nameTh = "",
    abbrEn = "",
    abbrTh = "",
  } = placeholderText;

  const { insert = "Insert", upload = "Upload" } = submitButtonText;

  const [formData, setFormData] = useState<FormData>({
    code: "",
    nameEn: "",
    nameTh: "",
    abbrEn: "",
    abbrTh: "",
    year: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Sync year prop to formData
  useEffect(() => {
    if (
      selectedYear !== undefined &&
      selectedYear !== null &&
      String(selectedYear) !== "0"
    ) {
      setFormData((prev) => ({ ...prev, year: String(selectedYear) }));
    }
  }, [selectedYear]);

  // Disable background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    requiredFields.forEach((internalKey) => {
      const propKey = fieldMap[internalKey] || internalKey;
      const value = formData[propKey];
      if (!value || String(value).trim() === "") {
        newErrors[propKey] = "This field is required.";
      }
    });
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to submit form");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 4. Convert to JSON and Cast to T[]
      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (onSubmitExcel) {
        // Cast rows (any[]) to T[] to satisfy the strict generic type
        await onSubmitExcel(rows as T[]);
        onClose();
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed!");
    } finally {
      // Optional: Clear the input value so the same file can be selected again
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative z-10 bg-white p-8 rounded-2xl shadow-2xl w-[90%] max-w-3xl transition-all max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-end mb-6 border-b pb-3">
          <X
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 cursor-pointer transition-colors"
          />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Dropdown Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {universityOptions.length > 0 && onUniversityChange && (
              <DropdownSelect
                value={selectedUniversity}
                onChange={onUniversityChange}
                options={universityOptions}
                disabled={disableUniversity}
                // label="University"
              />
            )}

            {facultyOptions.length > 0 && onFacultyChange && (
              <DropdownSelect
                value={selectedFaculty}
                onChange={onFacultyChange}
                options={facultyOptions}
                disabled={disableFaculty || !selectedUniversity}
                // label="Faculty"
              />
            )}

            {yearOptions.length > 0 && onYearChange && (
              <DropdownSelect
                value={selectedYear}
                onChange={onYearChange}
                options={yearOptions}
                disabled={!selectedFaculty}
                // label="Year"
              />
            )}

            {programOptions.length > 0 && onProgramChange && (
              <DropdownSelect
                value={selectedProgram}
                onChange={onProgramChange}
                options={programOptions}
                disabled={!selectedYear}
                // label="Program"
              />
            )}

            {courseOptions.length > 0 && onCourseChange && (
              <DropdownSelect
                value={selectedCourse}
                onChange={onCourseChange}
                options={courseOptions}
                disabled={!selectedProgram}
                // label="Course"
              />
            )}

            {semesterOptions.length > 0 && onSemesterChange && (
              <DropdownSelect
                value={selectedSemester}
                onChange={onSemesterChange}
                options={semesterOptions}
                disabled={!selectedProgram}
                // label="Semester"
              />
            )}

            {sectionOptions.length > 0 && onSectionChange && (
              <DropdownSelect
                value={selectedSection}
                onChange={onSectionChange}
                options={sectionOptions}
                disabled={!selectedSemester}
                // label="Section"
              />
            )}
          </div>

          {showCodeInput && (
            <div>
              {[{ name: "code", placeholder: code }].map(
                ({ name, placeholder }) => (
                  <div key={name}>
                    <input
                      type="text"
                      name={name}
                      placeholder={placeholder}
                      value={formData[name]}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 rounded-lg border font-light ${
                        errors[name] ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    />
                    {errors[name] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors[name]}
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          )}

          {/* Input Fields */}
          <div className="grid grid-cols-1 gap-4">
            {[
              { name: "nameEn", placeholder: nameEn },
              { name: "nameTh", placeholder: nameTh },
            ].map(({ name, placeholder }) => (
              <div key={name}>
                <input
                  type="text"
                  name={name}
                  placeholder={placeholder}
                  value={formData[name]}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border font-light ${
                    errors[name] ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                />
                {errors[name] && (
                  <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Abbreviation Fields */}
          {showAbbreviationInputs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "abbrEn", placeholder: abbrEn },
                { name: "abbrTh", placeholder: abbrTh },
              ].map(({ name, placeholder }) => (
                <div key={name}>
                  <input
                    type="text"
                    name={name}
                    placeholder={placeholder}
                    value={formData[name]}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-lg border font-light ${
                      errors[name] ? "border-red-500" : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  />
                  {errors[name] && (
                    <p className="text-red-500 text-sm mt-1">{errors[name]}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col md:flex-row justify-end gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-5 py-2.5 bg-blue-500 text-white rounded-lg font-light hover:bg-blue-600 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Submitting..." : insert}
            </button>

            {/* Excel Upload Button */}
            {onSubmitExcel && (
              <label className="w-full md:w-auto px-5 py-2.5 bg-green-500 text-white rounded-lg font-light hover:bg-green-600 cursor-pointer text-center transition">
                {upload}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
