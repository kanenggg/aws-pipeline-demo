"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import LoadingOverlay from "./LoadingOverlay";
import Navbar from "./Navbar";
import { useAuth } from "../app/context/AuthContext";

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { isLoggedIn, initialized } = useAuth();

  // 🟢 1. สร้าง State สำหรับเปิด/ปิด Navbar ที่นี่
  const [isNavbarOpen, setIsNavbarOpen] = useState(true);

  const [currentPath, setCurrentPath] = useState(pathname);

  useEffect(() => {
    if (pathname !== currentPath) {
      setLoading(false);
      setCurrentPath(pathname);
    }
  }, [pathname, currentPath]);

  const protectedRoutes = [
    "/editCourse",
    "/editProgram",
    "/manageAccount",
    "/viewChart",
    "/manageUniversity",
  ];

  useEffect(() => {
    if (initialized && !isLoggedIn && protectedRoutes.includes(pathname)) {
      router.replace("/");
    }
  }, [initialized, isLoggedIn, pathname, router]);

  if (!initialized) return null;

  return (
    <div className="flex min-h-screen bg-white">
      {loading && <LoadingOverlay />}

      {/* 🟢 2. Sidebar Container: ขยับตามสถานะ isNavbarOpen */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 
          ${isNavbarOpen ? "w-52" : "w-0 -translate-x-full md:translate-x-0 md:w-20"}`}
      >
        {/* ส่ง State และ Function ไปให้ Navbar */}
        <Navbar
          isLoggedIn={isLoggedIn}
          setLoading={setLoading}
          isOpen={isNavbarOpen}
          setIsOpen={setIsNavbarOpen}
        />
      </aside>

      {/* 🟢 3. Main Content: ปรับ Margin-Left ตามความกว้าง Sidebar */}
      <main
        className={`flex-1 p-6 transition-all duration-300 min-w-0
          ${isNavbarOpen ? "ml-52" : "ml-0 md:ml-20"}`}
      >
        {children}
      </main>
    </div>
  );
}
