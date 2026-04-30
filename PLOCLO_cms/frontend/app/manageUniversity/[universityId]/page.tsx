"use client";

import React, { useEffect, useState, use } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  CreateFacultyPayload,
  createFaculty,
  getFaculties,
  Faculty,
} from "@/utils/facultyApi";
import { getUniversityById, University } from "@/utils/universityApi";
import { Table, Column } from "@/components/Table"; // Ensure @/components/Table resolves correctly
import { useGlobalToast } from "@/app/context/ToastContext";
import AlertPopup from "@/components/AlertPopup";
import FormEditPopup from "@/components/EditPopup";
import { apiClient } from "@/utils/apiClient";
import AddButton from "@/components/AddButton";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useRouter } from "next/navigation";
import BreadCrumb from "@/components/BreadCrumb";

import { useTranslation } from "next-i18next";

interface UniversityDetailPageProps {
  // Next.js passes 'params' as a Promise, but the object contains these properties
  params: {
    universityId: string;
  };
}

interface ResolvedParams {
  universityId: string;
}

export default function UniversityDetailPage({
  params,
}: UniversityDetailPageProps) {
  // 💡 FIX FOR NEXT.JS WARNING: Use React.use() to unwrap the params Promise
  // This will suspend the component until the route parameters are fully resolved.
  const resolvedParams = use(params as unknown as Promise<ResolvedParams>);
  const { universityId } = resolvedParams;
  const router = useRouter();

  const { token } = useAuth();
  const { showToast } = useGlobalToast();

  const [university, setUniversity] = useState<University | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [showEditFacultyPopup, setShowEditFacultyPopup] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState<Faculty | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch specific university details
      const uniData = await getUniversityById(token, universityId);
      setUniversity(uniData);

      // Fetch faculties associated with this university ID
      // NOTE: Ensure getFaculties API accepts the universityId for filtering
      const facultyData = await getFaculties(token, universityId);
      setFaculties(facultyData);
    } catch (err) {
      showToast("Failed to load university details or faculties.", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- 1. Fetch University Details and Faculties ---
  useEffect(() => {
    if (!token || !universityId) return;
    fetchData();
  }, [token, universityId, showToast]);

  const handleFaculty = async (data: Record<string, unknown>) => {
    if (!token) return;

    try {
      const payload: CreateFacultyPayload = {
        name: String(data.nameEn || ""),
        name_th: String(data.nameTh || ""),
        university_id: Number(universityId),
        abbreviation: String(data.abbrEn || ""),
        abbreviation_th: String(data.abbrTh || ""),
      };
      await createFaculty(token!, payload as CreateFacultyPayload);
      setLoading(true);
      fetchData();
      showToast("Faculty created successfully", "success");
    } catch {
      showToast("Failed to create faculty. Check backend.", "error");
    }
  };

  const saveEdit = async () => {
    if (!token || !selectedFaculty) return;

    try {
      await apiClient.patch(
        `/faculty/${selectedFaculty.id}`,
        {
          name: selectedFaculty.name,
          name_th: selectedFaculty.name_th,
          abbreviation: selectedFaculty.abbreviation,
          abbreviation_th: selectedFaculty.abbreviation_th,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      fetchData();
      showToast("Faculty updated successfully", "success");
      setSelectedFaculty(null);
      setShowEditFacultyPopup(false);
    } catch {
      showToast("Failed to update faculty. Check backend.", "error");
    }
  };

  const confirmDelete = async () => {
    if (!facultyToDelete || !token) return;
    try {
      await apiClient.delete(`/faculty/${facultyToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
      showToast("Faculty deleted successfully", "success");
    } catch {
      showToast("Failed to delete faculty. Check backend.", "error");
    } finally {
      setShowDeletePopup(false);
      setFacultyToDelete(null);
    }
  };

  // --- 2. Define Faculty Table Columns ---
  // You can customize the actions/rendering here (e.g., add 'View Faculty Programs')
  const facultyColumns: Column<Faculty>[] = [
    { header: "Faculty Name", accessor: "name" },
    { header: "Faculty Name (TH)", accessor: "name_th" },
    { header: "Abbreviation", accessor: "abbreviation", className: "w-32" },
    {
      header: "actions",
      accessor: "id",
      actions: [
        {
          label: t("instructor"),
          color: "green",
          hoverColor: "green",
          // 3. Update the OnClick to match your folder structure
          onClick: (row: Faculty) => {
            // NOTE: matches 'manageUniversity/[id]/faculty/[id]/instructor'
            setLoading(true);
            router.push(
              `/manageUniversity/${universityId}/faculty/${row.id}/instructor`,
            );
          },
        },
        {
          label: t("edit"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row: Faculty) => {
            setSelectedFaculty({ ...row });
            setShowEditFacultyPopup(true);
          },
        },
        {
          label: t("delete"),
          color: "red",
          hoverColor: "red",
          onClick: (row: Faculty) => {
            setFacultyToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  if (loading) return <LoadingOverlay />;
  if (!university)
    return (
      <div className="p-8 text-center text-red-500">University not found.</div>
    );

  // --- 3. Render the Page ---
  return (
    <div className="p-8">
      <BreadCrumb
        items={[
          { label: t("manage universities"), href: "/manageUniversity" },
          {
            label:
              lang === "th"
                ? university.name_th || university.name
                : university.name,
          },
        ]}
      />


      {/* UNIVERSITY DETAILS SECTION (The "Top Data") */}
      <div className="bg-white p-6 rounded-xl shadow-xl mb-8 border-l-4 border-orange-500">
        <h1 className="text-3xl font-light text-gray-800 mb-2">
          {university.name} ({university.abbreviation})
        </h1>
        <p className="text-xl font-light text-gray-600 mb-4">
          {university.name_th} ({university.abbreviation_th})
        </p>
        <hr className="my-4" />
        {/* <p className="text-sm text-gray-500">University ID: {university.id}</p> */}

        {/* Add an Edit Button here if needed */}
      </div>

      {/* FACULTY LIST SECTION */}
      <div className="mt-10">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-light text-gray-800 mb-4">
            Faculties ({faculties.length})
          </h2>
          <AddButton
            buttonText={t("add faculty")}
            placeholderText={{
              nameEn: t("faculty name (en)"),
              nameTh: t("faculty name (th)"),
              abbrEn: t("abbreviation (en)"),
              abbrTh: t("abbreviation (th)"),
            }}
            submitButtonText={{
              insert: t("create faculty"),
              upload: t("upload faculties excel"),
            }}
            onSubmit={handleFaculty}
            selectedUniversity={universityId}
            showCodeInput={false}
          />
        </div>

        {faculties.length > 0 ? (
          <Table<Faculty> columns={facultyColumns} data={faculties} />
        ) : (
          <div className="text-center p-6 border rounded-lg font-light bg-gray-50 text-gray-500">
            No faculties found for this university.
          </div>
        )}

        {/* You could place an Add New Faculty button here */}
        {showEditFacultyPopup && selectedFaculty && (
          <FormEditPopup
            title="Edit Faculty"
            data={selectedFaculty}
            fields={[
              { label: "Faculty Name (EN)", key: "name", type: "text" },
              { label: "Faculty Name (TH)", key: "name_th", type: "text" },
              { label: "Abbreviation (EN)", key: "abbreviation", type: "text" },
              {
                label: "Abbreviation (TH)",
                key: "abbreviation_th",
                type: "text",
              },
            ]}
            onSave={saveEdit}
            onClose={() => {
              setShowEditFacultyPopup(false);
              setSelectedFaculty(null);
            }}
            onChange={(updated) => setSelectedFaculty(updated)}
          />
        )}

        <AlertPopup
          isOpen={showDeletePopup}
          title="Confirm Delete"
          message={`Are you sure you want to delete the faculty "${facultyToDelete?.name}"?`}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeletePopup(false)}
        />
      </div>
    </div>
  );
}
