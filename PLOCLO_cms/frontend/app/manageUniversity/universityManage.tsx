"use client";

import React, { useState, useEffect } from "react";
import {
  createUniversity,
  getUniversities,
  University,
  CreateUniversityPayload,
} from "../../utils/universityApi";
import { useGlobalToast } from "@/app/context/ToastContext";
import { useAuth } from "../context/AuthContext";
import AddButton from "../../components/AddButton";
import { Table, Column } from "../../components/Table";
import { apiClient } from "../../utils/apiClient";
import FormEditPopup from "../../components/EditPopup";
import AlertPopup from "../../components/AlertPopup";
import { useRouter } from "next/navigation";
import LoadingOverlay from "../../components/LoadingOverlay";

import { useTranslation } from "next-i18next";

export default function ManageUniversity() {
  const router = useRouter();
  const { token, isLoggedIn } = useAuth();
  const { showToast } = useGlobalToast();
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] =
    useState<University | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [universityToDelete, setUniversityToDelete] =
    useState<University | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const { t } = useTranslation("common");
  const [loading, setLoading] = useState(true);

  // Function to refresh data safely
  const fetchUniversities = async () => {
    if (!token) return;
    try {
      const data = await getUniversities(token);
      setUniversities(data);
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUniversity = async (data: Record<string, unknown>) => {
    if (!token) return;
    try {
      const payload: CreateUniversityPayload = {
        name: String(data.nameEn || ""),
        name_th: String(data.nameTh || ""),
        abbreviation: String(data.abbrEn || ""),
        abbreviation_th: String(data.abbrTh || ""),
      };
      await createUniversity(token!, payload as CreateUniversityPayload);
      showToast("University created successfully", "success");
      setLoading(true);
      fetchUniversities(); // Refresh instead of reload
    } catch {
      showToast("Failed to create university", "error");
    }
  };

  const confirmDelete = async () => {
    if (!universityToDelete || !token) return;

    try {
      await apiClient.delete(`/university/${universityToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("University deleted successfully", "success");
      setUniversities((prev) =>
        prev.filter((uni) => uni.id !== universityToDelete.id),
      );
    } catch {
      showToast("Failed to delete university", "error");
    } finally {
      setShowDeletePopup(false);
      setUniversityToDelete(null);
    }
  };

  const saveEdit = async () => {
    if (!selectedUniversity || !token) return;

    try {
      const res = await apiClient.patch(
        `/university/${selectedUniversity.id}`,
        {
          name: selectedUniversity.name,
          name_th: selectedUniversity.name_th,
          abbreviation: selectedUniversity.abbreviation,
          abbreviation_th: selectedUniversity.abbreviation_th,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUniversities((prev) =>
        prev.map((uni) => (uni.id === selectedUniversity.id ? res.data : uni)),
      );
      showToast("University updated successfully", "success");
    } catch {
      showToast("Failed to update university", "error");
    } finally {
      setShowEditPopup(false);
      setSelectedUniversity(null);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    fetchUniversities();
  }, [isLoggedIn, token]);

  const universityColumn: Column<University>[] = [
    {
      header: t("university name (en)"),
      accessor: "name",
    },
    {
      header: t("university name (th)"),
      accessor: "name_th",
    },
    {
      header: t("abbreviation (en)"),
      accessor: "abbreviation",
    },
    {
      header: t("abbreviation (th)"),
      accessor: "abbreviation_th",
    },
    {
      header: t("actions"),
      accessor: "id",
      actions: [
        {
          label: t("view details"), // Changed text slightly for clarity
          color: "gray",
          hoverColor: "gray",
          onClick: (row: University) => {
            // 💡 REDIRECT TO THE NEW DYNAMIC PAGE
            router.push(`/manageUniversity/${row.id}`);
            setLoading(true);
          },
        },
        {
          label: t("edit"), // Retaining a separate edit button for clarity
          color: "blue",
          hoverColor: "blue",
          onClick: (row: University) => {
            setSelectedUniversity({ ...row });
            setShowEditPopup(true);
          },
        },
        {
          label: t("delete"), // Retaining a separate edit button for clarity
          color: "red",
          hoverColor: "red",
          onClick: (row: University) => {
            setUniversityToDelete({ ...row });
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  return (
    // 1. Relative Container for Local Loading Overlay
    <div className="p-5 md:p-8">
      {/* 2. Loading Overlay (Rendered conditionally on local component data fetch) */}
      {loading && <LoadingOverlay />}

      {/* Header and Actions Row */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-semibold text-gray-800 tracking-tight">
          {t("university management")}
        </h1>

        <AddButton
          buttonText={t("add university")} // Capitalized for better button text
          placeholderText={{
            nameEn: t("university name (en)"),
            nameTh: t("university name (th)"),
            abbrEn: t("abbreviation (en)"),
            abbrTh: t("abbreviation (th)"),
          }}
          submitButtonText={{
            insert: t("create university"),
            upload: t("upload universities excel"),
          }}
          requiredFields={["nameEn", "nameTh", "abbrEn", "abbrTh"]}
          onSubmit={handleUniversity}
          onSubmitExcel={() => {}}
          showCodeInput={false}
        />
      </div>

      {/* Separator */}
      <hr className="my-5 border-gray-200" />

      {/* Main Data Table */}
      <Table<University> columns={universityColumn} data={universities} />

      {/* Edit Popup */}
      {showEditPopup && selectedUniversity && (
        <FormEditPopup
          title="Edit University"
          data={selectedUniversity}
          fields={[
            { label: t("university name (en)"), key: "name", type: "text" }, // Added (EN) for clarity
            { label: t("university name (th)"), key: "name_th", type: "text" },
            {
              label: t("abbreviation (en)"),
              key: "abbreviation",
              type: "text",
            },
            {
              label: t("abbreviation (th)"),
              key: "abbreviation_th",
              type: "text",
            },
          ]}
          onChange={(updated) => setSelectedUniversity(updated)}
          onSave={saveEdit}
          onClose={() => setShowEditPopup(false)}
        />
      )}

      {/* Delete Popup */}
      <AlertPopup
        isOpen={showDeletePopup}
        type="confirm"
        title="Confirm Deletion" // More generic title
        message="Are you sure you want to delete this university and ALL associated data (Faculties, Programs, Courses)? This action cannot be undone." // Emphasized CASCADE delete warning
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeletePopup(false);
          setUniversityToDelete(null);
        }}
      />

    </div>
  );
}
