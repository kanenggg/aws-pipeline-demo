/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState, use } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/utils/apiClient";
import { Table, Column } from "@/components/Table";
import { useGlobalToast } from "@/app/context/ToastContext";
import AlertPopup from "@/components/AlertPopup";
import FormEditPopup from "@/components/EditPopup";
import AddButton from "@/components/AddButton";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useTranslation } from "react-i18next";
import BreadCrumb from "@/components/BreadCrumb";

// --- Types ---
/* interface Users {
  id: number;
  email: string;
  username: string;
  role: string;
} 
*/

interface Instructor {
  id: number;
  full_thai_name: string;
  full_eng_name: string;
  email: string;
  phoneNum: string;
  faculty_id: number;
  nameTh?: string;
  nameEn?: string;
  abbrTh?: string;
  abbrEn?: string;
}

interface Faculty {
  id: number;
  name: string;
  name_th: string;
  university_id: number;
  university?: {
    id: number;
    name: string;
    name_th: string;
  };
}

interface PageProps {
  params: Promise<{
    universityId: string;
    facultyId: string;
  }>;
}

export default function FacultyInstructorPage({ params }: PageProps) {
  const { facultyId } = use(params);
  const { token } = useAuth();
  const { showToast } = useGlobalToast();
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;

  // --- User Selection State (Commented Out) ---
  /* const [systemUsers, setSystemUsers] = useState<Users[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState(""); 
  */

  // --- State ---
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit/Delete State
  const [selectedInstructor, setSelectedInstructor] =
    useState<Instructor | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [instructorToDelete, setInstructorToDelete] =
    useState<Instructor | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  // --- 1. Fetch Data ---
  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const facultyRes = await apiClient.get(`/faculty/${facultyId}`);
      setFaculty(facultyRes.data);

      const instructorRes = await apiClient.get(
        `/instructor?facultyId=${facultyId}`,
      );
      setInstructors(instructorRes.data);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && facultyId) fetchData();
  }, [token, facultyId]);

  // --- 2. Handlers ---
  const handleCreateInstructor = async (data: Instructor) => {
    if (!token) return;
    try {
      await apiClient.post("/instructor", {
        full_thai_name: data.nameEn,
        full_eng_name: data.nameTh,
        email: data.abbrEn,
        phoneNum: data.abbrTh,
        faculty_id: parseInt(facultyId),
      });
      showToast("Instructor created successfully", "success");
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to create instructor";
      showToast(msg, "error");
    }
  };

  const handleUpdateInstructor = async () => {
    if (!selectedInstructor) return;
    try {
      await apiClient.patch(`/instructor/${selectedInstructor.id}`, {
        full_thai_name: selectedInstructor.full_thai_name,
        full_eng_name: selectedInstructor.full_eng_name,
        email: selectedInstructor.email,
        phoneNum: selectedInstructor.phoneNum,
        faculty_id: parseInt(facultyId),
      });
      showToast("Instructor updated successfully", "success");
      setShowEditPopup(false);
      setSelectedInstructor(null);
      fetchData();
    } catch {
      showToast("Failed to update instructor", "error");
    }
  };

  const handleDeleteInstructor = async () => {
    if (!instructorToDelete) return;
    try {
      await apiClient.delete(`/instructor/${instructorToDelete.id}`);
      showToast("Instructor deleted successfully", "success");
      setShowDeletePopup(false);
      setInstructorToDelete(null);
      fetchData();
    } catch {
      showToast("Failed to delete instructor", "error");
    }
  };

  // --- User-to-Instructor Handlers (Commented Out) ---
  /* const fetchSystemUsers = async () => {
    try {
      const res = await apiClient.get(`/users?role=instructor`);
      setSystemUsers(res.data);
    } catch {
      showToast("Failed to fetch users", "error");
    }
  };

  const handleOpenUserModal = () => {
    fetchSystemUsers();
    setShowUserModal(true);
  };

  const handleAddFromUser = async (user: Users) => {
    if (!token) return;
    try {
      setLoading(true);
      await apiClient.post("/instructor", {
        full_thai_name: `${user.username} `,
        full_eng_name: `${user.username} `,
        email: user.email,
        phoneNum: "",
        faculty_id: parseInt(facultyId),
        user_id: user.id,
      });

      showToast("User added as instructor", "success");
      setShowUserModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Failed to add instructor", "error");
    } finally {
      setLoading(false);
    }
  }; 
  */

  // --- 3. Table Columns ---
  const columns: Column<Instructor>[] = [
    lang === "th"
      ? { header: t("name"), accessor: "full_thai_name" }
      : { header: t("name"), accessor: "full_eng_name" },

    { header: t("Email"), accessor: "email" },
    { header: t("Phone"), accessor: "phoneNum" },
    {
      header: t("Actions"),
      accessor: "id",
      actions: [
        {
          label: t("edit"),
          color: "blue",
          hoverColor: "blue",
          onClick: (row) => {
            setSelectedInstructor(row);
            setShowEditPopup(true);
          },
        },
        {
          label: t("delete"),
          color: "red",
          hoverColor: "red",
          onClick: (row) => {
            setInstructorToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  if (loading) return <LoadingOverlay />;

  return (
    <div className="p-8 min-h-screen bg-gray-50/50">
      <BreadCrumb
        items={[
          { label: t("manage universities"), href: "/manageUniversity" },
          {
            label:
              lang === "th"
                ? faculty?.university?.name_th || t("loading...")
                : faculty?.university?.name || t("loading..."),
            href: `/manageUniversity/${faculty?.university_id ?? ""}`,
          },
          {
            label:
              lang === "th"
                ? faculty?.name_th || t("loading...")
                : faculty?.name || t("loading..."),
          },
        ]}
      />


      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-light text-gray-800 tracking-tight">
            {t("Instructor Management")}
          </h1>
          <p className="text-gray-500 mt-1">
            {t("faculty")}:{" "}
            <span className="font-light text-orange-600">
              {lang === "th" ? faculty?.name_th : faculty?.name}
            </span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-light text-gray-700">
            {t("Instructors List")} ({instructors.length})
          </h2>

          <div className="flex gap-2">
            {/* --- Select from Users Button (Commented Out) --- */}
            {/* <button
              onClick={handleOpenUserModal}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              {t("Select from Users")}
            </button> 
            */}

            <AddButton
              buttonText={t("Add Instructor")}
              placeholderText={{
                nameEn: "Full Thai Name",
                nameTh: "Full English Name",
                abbrEn: "Email Address",
                abbrTh: "Phone (Optional)",
              }}
              submitButtonText={{
                insert: t("Add Instructor"),
                upload: t("Upload Excel"),
              }}
              showAbbreviationInputs={true}
              showCodeInput={false}
              onSubmit={handleCreateInstructor}
            />
          </div>
        </div>

        <div className="p-6">
          {instructors.length > 0 ? (
            <Table columns={columns} data={instructors} />
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-400 italic">
                No instructors found in this faculty.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- User Selection Modal (Commented Out) --- */}
      {/* {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{t("Select User to Add")}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <div className="p-4 border-b">
              <input
                type="text"
                placeholder={t("Search by name or email...")}
                className="w-full p-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20"
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left">
                <thead className="text-xs uppercase text-gray-400 font-bold border-b">
                  <tr>
                    <th className="pb-2">{t("Name")}</th>
                    <th className="pb-2">{t("Email")}</th>
                    <th className="pb-2 text-right">{t("Action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {systemUsers
                    .filter((u) => {
                      const isAlreadyInstructor = instructors.some(
                        (instructor) => instructor.email.toLowerCase() === u.email.toLowerCase()
                      );
                      const matchesSearch = u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        u.username.toLowerCase().includes(userSearchTerm.toLowerCase());
                      return !isAlreadyInstructor && matchesSearch;
                    })
                    .map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 group">
                        <td className="py-3 text-sm">{user.username}</td>
                        <td className="py-3 text-sm text-gray-500">{user.email}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleAddFromUser(user)}
                            className="text-orange-600 font-bold text-xs uppercase hover:underline"
                          >
                            {t("Select")}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )} 
      */}

      {/* Popups */}
      {showEditPopup && selectedInstructor && (
        <FormEditPopup
          title="Edit Instructor Details"
          data={selectedInstructor}
          fields={[
            { label: "Full Thai Name", key: "full_thai_name", type: "text" },
            { label: "Full English Name", key: "full_eng_name", type: "text" },
            { label: "Email", key: "email", type: "email" },
            { label: "Phone", key: "phoneNum", type: "text" },
          ]}
          onChange={setSelectedInstructor}
          onSave={handleUpdateInstructor}
          onClose={() => setShowEditPopup(false)}
        />
      )}

      <AlertPopup
        isOpen={showDeletePopup}
        title="Remove Instructor"
        message={`Are you sure you want to remove ${instructorToDelete?.full_thai_name} ${instructorToDelete?.full_eng_name}?`}
        onConfirm={handleDeleteInstructor}
        onCancel={() => setShowDeletePopup(false)}
      />
    </div>
  );
}
