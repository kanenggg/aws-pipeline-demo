/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../../utils/apiClient";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useGlobalToast } from "@/app/context/ToastContext";
import AlertPopup from "../../components/AlertPopup";
import Table, { Column } from "../../components/Table";
import FormEditPopup from "../../components/EditPopup";
import LoadingOverlay from "@/components/LoadingOverlay";
import AddButton from "@/components/AddButton";
import { useTranslation } from "react-i18next";

interface User {
  code: string;
  nameEn: string;
  nameTh: string;
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export default function ManageAccount() {
  const { t, i18n } = useTranslation("common");
  const lang = i18n.language;
  const { token, isLoggedIn, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const { showToast } = useGlobalToast();
  const [activeTab, setActiveTab] = useState<string>("guest");

  const filteredUsers = useMemo(() => {
    if (activeTab === "all") return users;
    return users.filter((user) => user.role === activeTab);
  }, [users, activeTab]);

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await apiClient.get("/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
      setLoading(false);
    } catch {
      showToast("Cannot reach API. Check backend.", "error");
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    fetchUsers();
  }, [isLoggedIn, token]);

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await apiClient.delete(`/users/${userToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      showToast("User deleted successfully", "success");
    } catch {
      showToast("Cannot reach API. Check backend.", "error");
    } finally {
      setShowDeletePopup(false);
      setUserToDelete(null);
    }
  };

  const saveEdit = async () => {
    if (!selectedUser) return;
    try {
      const res = await apiClient.patch(
        `/users/${selectedUser.id}`,
        {
          username: selectedUser.username,
          email: selectedUser.email,
          role: selectedUser.role,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? res.data : u)),
      );
      fetchUsers();
      showToast("User updated successfully", "success");
      setShowEditPopup(false);
      setSelectedUser(null);
    } catch {
      showToast("Cannot reach API. Check backend.", "error");
    }
  };

  const handleAddUser = async (data: User) => {
    if (users.some((u) => u.email === data.nameEn)) {
      showToast("Email already exists", "error");
      return;
    }
    try {
      const payload = {
        username: data.code,
        email: data.nameEn,
        password: data.nameTh || null,
      };
      await apiClient.post("/users/register", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("User added successfully", "success");
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to add user";
      showToast(msg, "error");
    }
  };

  // ============================
  // COLUMNS DEFINITION (FIXED)
  // ============================
  const manageAccoutColumns: Column<User>[] = [
    { header: t("id"), accessor: "id" },
    { header: t("username"), accessor: "username" },
    { header: t("email_address"), accessor: "email" },
    // {
    //   header: "Created At",
    //   accessor: "created_at",
    //   // Custom rendering for the date
    //   render: (row) => (
    //     <span className="text-gray-600 font-light">
    //       {row.created_at
    //         ? format(new Date(row.created_at), "dd MMM yyyy HH:mm")
    //         : "-"}
    //     </span>
    //   ),
    // },
    {
      header: t("created_at"),
      accessor: "created_at",
      render: (row) => {
        if (!row.created_at) return "-";

        // Determine the locale based on your 'lang' variable
        const locale = lang === "th" ? "th-TH" : "en-GB";

        return (
          <span className="text-gray-600 font-light">
            {new Intl.DateTimeFormat(locale, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date(row.created_at))}
          </span>
        );
      },
    },
    {
      header: t("actions"),
      accessor: "id",
      actions: [
        {
          label: "Edit",
          color: "blue",
          onClick: (row: User) => {
            setSelectedUser({ ...row });
            setShowEditPopup(true);
          },
        },
        {
          label: "Delete",
          color: "red",
          onClick: (row: User) => {
            setUserToDelete(row);
            setShowDeletePopup(true);
          },
        },
      ],
    },
  ];

  const ROLES_TABS = [
    {
      id: "system_admin",
      label: t("admins"),
      color: "text-red-800",
      dot: "bg-red-700",
    },
    {
      id: "course_admin",
      label: t("course_admins"),
      color: "text-red-600",
      dot: "bg-red-500",
    },
    {
      id: "instructor",
      label: t("instructors"),
      color: "text-blue-600",
      dot: "bg-blue-500",
    },
    {
      id: "student",
      label: t("students"),
      color: "text-green-600",
      dot: "bg-green-500",
    },
    {
      id: "guest",
      label: t("guests"),
      color: "text-orange-600",
      dot: "bg-orange-500",
    },
  ];

  const visibleTabs = useMemo(() => {
    // Define which roles are allowed to see the "system_admin" tab
    const isSuperAdmin = user?.role === "Super_admin";

    return ROLES_TABS.filter((tab) => {
      if (tab.id === "system_admin") {
        return isSuperAdmin; // Only show if the logged-in user is a system_admin
      }
      return true; // Show all other tabs (instructor, student, etc.)
    });
  }, [user, ROLES_TABS]);

  if (!isLoggedIn) return <p>Please login first.</p>;

  return (
    <ProtectedRoute roles={["Super_admin", "system_admin"]}>
      <div className="max-w-[1400px] flex flex-col mx-auto">

        {loading && <LoadingOverlay />}
        <div className="p-5 md:p-8">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h1 className="text-3xl font-light text-gray-800">
              {t("accounts")}
            </h1>
            <AddButton
              buttonText={t("create_new_account")}
              placeholderText={{
                code: t("enter_username"),
                nameEn: t("email_address"),
                nameTh: t("enter_password"),
              }}
              showAbbreviationInputs={false}
              onSubmit={handleAddUser}
            />
          </div>

          {/* ROLE TABS NAVIGATION */}
          <div className="flex overflow-x-auto pb-4 mb-4 gap-2 items-center border-b border-gray-100">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-xl transition-all text-sm font-light flex items-center gap-2 whitespace-nowrap
                  ${activeTab === tab.id ? `bg-white ${tab.color} shadow-sm border border-gray-200` : "text-gray-400 hover:text-gray-600"}
                `}
              >
                <span
                  className={`w-2 h-2 rounded-full ${activeTab === tab.id ? tab.dot : "bg-gray-300"}`}
                />
                {tab.label}
                <span className="ml-1 text-xs opacity-60">
                  ({users.filter((u) => u.role === tab.id).length})
                </span>
              </button>
            ))}
          </div>

          {/* DATA TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {filteredUsers.length > 0 ? (
              <Table columns={manageAccoutColumns} data={filteredUsers} />
            ) : (
              <div className="p-20 text-center text-gray-400">
                No users found with role:{" "}
                <span className="font-bold">{activeTab}</span>
              </div>
            )}
          </div>

          {/* EDIT POPUP */}
          {/* EDIT POPUP */}
          {showEditPopup && selectedUser && (
            <FormEditPopup
              title="Edit User"
              data={selectedUser}
              fields={[
                { label: "Username", key: "username", type: "text" },
                { label: "Email", key: "email", type: "email" },
                {
                  label: "Role",
                  key: "role",
                  type: "select",
                  // 🟢 กรอง Option ตามสิทธิ์ของผู้ใช้ที่กำลังแก้
                  options: [
                    "system_admin",
                    "course_admin",
                    "instructor",
                    "student",
                    "guest",
                  ].filter((role) => {
                    // ถ้าไม่ใช่ Super_admin จะมองไม่เห็นตัวเลือก system_admin
                    if (
                      user?.role !== "Super_admin" &&
                      role === "system_admin"
                    ) {
                      return false;
                    }
                    return true;
                  }),
                },
              ]}
              onChange={(updated) => setSelectedUser(updated)}
              onSave={saveEdit}
              onClose={() => setShowEditPopup(false)}
            />
          )}

          {/* DELETE POPUP */}
          <AlertPopup
            isOpen={showDeletePopup}
            type="confirm"
            title="Delete User"
            message="Are you sure you want to delete this user?"
            confirmText="Delete"
            onConfirm={confirmDelete}
            onCancel={() => setShowDeletePopup(false)}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
