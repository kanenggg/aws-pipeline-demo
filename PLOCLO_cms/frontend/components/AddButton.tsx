/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import FormPopup from "./FormPopup";

// 1. สร้าง Interface แบบ Generic <T> เพื่อรองรับ Row ของ Excel ทุกรูปแบบ
interface AddButtonProps<T> {
  // Dropdown options
  universityOptions?: { label: string; value: string }[];
  facultyOptions?: { label: string; value: string }[];
  programOptions?: { label: string; value: string }[];
  yearOptions?: { label: string; value: string }[];
  semesterOptions?: { label: string; value: string }[];
  sectionOptions?: { label: string; value: string }[];
  courseOptions?: { label: string; value: string }[];

  // Selected Values (รับมาจาก Parent ทั้งหมด ไม่ต้องเก็บ State เอง)
  selectedUniversity?: string;
  selectedFaculty?: string;
  selectedProgram?: string | number;
  selectedYear?: number | string;
  selectedSemester?: number | string;
  selectedSection?: string;
  selectedCourse?: string;

  disableUniversity?: boolean;
  disableFaculty?: boolean;

  // Handlers
  onUniversityChange?: (value: string | number) => void;
  onFacultyChange?: (value: string | number) => void;
  onProgramChange?: (value: string | number) => void;
  onYearChange?: (value: string | number) => void;
  onSemesterChange?: (value: string | number) => void;
  onSectionChange?: (value: string | number) => void;
  onCourseChange?: (value: string | number) => void;

  // Button / Labels
  buttonText?: string;
  placeholderText?: {
    code?: string;
    nameEn?: string;
    nameTh?: string;
    abbrEn?: string;
    abbrTh?: string;
    year?: string;
  };
  submitButtonText?: { insert?: string; upload?: string };

  // Submission Handlers
  onSubmit: (data: any) => void | Promise<void>;
  // 2. แก้ไขให้รับ T[] และรองรับ Promise (Async)
  onSubmitExcel?: (rows: T[]) => void | Promise<void>;

  // Toggles
  showAbbreviationInputs?: boolean;
  showCodeInput?: boolean;
  requiredFields?: string[];
}

// 3. ประกาศ Component แบบ Generic <T,>
export default function AddButton<T>({
  buttonText = "Button",
  placeholderText = {},
  submitButtonText = {},
  showAbbreviationInputs = true,
  showCodeInput = true,
  onSubmit,
  onSubmitExcel,
  universityOptions = [],
  facultyOptions = [],
  programOptions = [],
  yearOptions = [],
  semesterOptions = [],
  sectionOptions = [],
  courseOptions = [],
  selectedUniversity = "",
  selectedFaculty = "",
  selectedProgram = "",
  selectedYear = 0,
  selectedSemester = "",
  selectedSection = "",
  selectedCourse = "",
  onUniversityChange,
  onFacultyChange,
  onProgramChange,
  onYearChange,
  onSemesterChange,
  onSectionChange,
  onCourseChange,
  disableFaculty = false,
  disableUniversity = false,
  requiredFields = [],
}: AddButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  // --- Helper Handlers ---
  // ฟังก์ชันนี้จะรวมข้อมูลจาก FormPopup เข้ากับค่าที่เลือกใน Dropdown ก่อนส่งกลับไปที่ Parent
  const handleSubmitWithModalSelection = async (data: any) => {
    const payload = {
      ...data,
      university_id: selectedUniversity,
      faculty_id: selectedFaculty,
      program_id: selectedProgram,
      year: selectedYear,
      semester: selectedSemester,
      section: selectedSection,
      course: selectedCourse,
    };
    return onSubmit(payload);
  };

  // ฟังก์ชันจัดการ Excel: เพิ่ม faculty_id เข้าไปในแต่ละแถวโดยอัตโนมัติ
  const handleSubmitExcelWithModalSelection = async (rows: T[]) => {
    if (!onSubmitExcel) return;

    const facultyToUse = selectedFaculty;

    // Map ข้อมูลเพื่อใส่ faculty_id (ใช้การ cast type เพื่อความปลอดภัย)
    const rowsWithFaculty = rows.map((r) => ({
      ...(r as object),
      faculty_id: (r as any).faculty_id || facultyToUse,
    }));

    // ส่งข้อมูลที่ปรับปรุงแล้วกลับไปในรูปแบบ T[]
    return onSubmitExcel(rowsWithFaculty as unknown as T[]);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-orange-300 font-light text-white px-4 py-2 rounded hover:bg-orange-400 transition cursor-pointer"
        type="button"
      >
        {buttonText}
      </button>

      {isOpen && (
        <FormPopup
          onClose={() => setIsOpen(false)}
          // ส่ง Handler ที่เราห่อไว้ (Wrapper)
          onSubmit={handleSubmitWithModalSelection}
          onSubmitExcel={handleSubmitExcelWithModalSelection}
          // Pass Props ต่อไปให้ FormPopup โดยตรง
          placeholderText={placeholderText}
          submitButtonText={submitButtonText}
          showAbbreviationInputs={showAbbreviationInputs}
          showCodeInput={showCodeInput}
          // Values
          selectedUniversity={selectedUniversity}
          selectedFaculty={selectedFaculty}
          selectedProgram={selectedProgram}
          selectedYear={selectedYear}
          selectedSemester={selectedSemester}
          selectedSection={selectedSection}
          selectedCourse={selectedCourse}
          // Options
          universityOptions={universityOptions}
          facultyOptions={facultyOptions}
          programOptions={programOptions}
          yearOptions={yearOptions}
          semesterOptions={semesterOptions}
          sectionOptions={sectionOptions}
          courseOptions={courseOptions}
          requiredFields={requiredFields}
          // Disable Dropdowns if needed
          disableUniversity={disableUniversity}
          disableFaculty={disableFaculty}
          // Change Handlers (ส่งตรงจาก Parent ไป FormPopup เลย ไม่ต้องผ่าน Local State)
          onUniversityChange={onUniversityChange}
          onFacultyChange={onFacultyChange}
          onProgramChange={onProgramChange}
          onYearChange={onYearChange}
          onSemesterChange={onSemesterChange}
          onSectionChange={onSectionChange}
          onCourseChange={onCourseChange}
        />
      )}
    </>
  );
}
