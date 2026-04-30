"use client";

// import { useEffect, useState } from "react";

// import TabButton from "../../components/TabButton";
import ManageUniversity from "./universityManage";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function ManageUniversityPage() {
  // const ACTIVE_TAB_KEY = `activeTab_${
  //   typeof window !== "undefined" ? window.location.pathname : ""
  // }`;

  // const tabs = [{ id: "university", label: "Universities" }];

  // const [activeTab, setActiveTab] = useState<string>(() => {
  //   try {
  //     if (typeof window !== "undefined") {
  //       const hash = window.location.hash
  //         ? window.location.hash.replace(/^#/, "")
  //         : "";
  //       const valid = ["university", "faculty"];
  //       if (hash && valid.includes(hash)) return hash;
  //       const stored = localStorage.getItem(ACTIVE_TAB_KEY);
  //       if (stored && valid.includes(stored)) return stored;
  //     }
  //   } catch {
  //     // ignore
  //   }
  //   return "university";
  // });

  // useEffect(() => {
  //   try {
  //     // update hash without adding history entry
  //     if (typeof window !== "undefined") {
  //       window.history.replaceState(null, "", `#${activeTab}`);
  //     }
  //     localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  //   } catch {
  //     // ignore localStorage/window errors
  //   }
  // }, [ACTIVE_TAB_KEY, activeTab]);

  return (
    <ProtectedRoute roles={["system_admin", "Super_admin"]}>
      <div className="max-w-[1400px] h-full flex flex-col mx-auto">
        {/* <h1 className="font-extralight text-2xl">
          Manage Universities & Faculties
        </h1> */}

        {/* <div className="flex gap-3 mt-5 px-3 py-2 ">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              isActive={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
            />
          ))}
        </div>
        <hr /> */}
        <ManageUniversity />
        {/* {activeTab === "university" && <ManageUniversity />} */}
      </div>
    </ProtectedRoute>
  );
}

/* --- Reusable Components --- */
