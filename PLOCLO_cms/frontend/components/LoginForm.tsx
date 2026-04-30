"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../app/context/AuthContext";
import { apiClient } from "../utils/apiClient";
import { useTranslation } from "react-i18next";
import { useGlobalToast } from "@/app/context/ToastContext";
import axios from "axios";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginForm() {
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggedIn } = useAuth();
  const router = useRouter();
  const { showToast } = useGlobalToast();

  const handleSuccess = async (response: any) => {
    try {
      // 1. ส่ง Google Credential ไปที่ Backend
      const res = await apiClient.post("users/auth/google/verify", {
        token: response.credential,
      });

      // 2. จัดการเมื่อ Login สำเร็จ
      if (res.data.token) {
        await login(res.data.token);
        showToast("Google Login Success!", "success");

        // ใช้ replace เพื่อป้องกันการกดย้อนกลับมาหน้า Login
        router.replace("/");
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);

      // 3. 🛡️ จัดการ Error ตามรหัสสถานะ (Status Code) จาก Backend
      const statusCode = err.response?.status;

      const backendMessage = err.response?.data?.message;

      if (statusCode === 409) {
        // กรณี Username ซ้ำ (Duplicate Username)
        showToast(
          backendMessage || "Username already exists. Please contact admin.",
          "error",
        );
      } else if (statusCode === 400) {
        // กรณี Token มีปัญหา
        showToast("Invalid Google account session.", "error");
      } else if (statusCode === 500) {
        // กรณี Backend Crash
        showToast("Server error. Please try again later.", "error");
      } else {
        // กรณีอื่นๆ (เช่น Network พัง)
        showToast("Failed to authenticate with Google.", "error");
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await apiClient.post("/users/login", { email, password });
      await login(res.data.token);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        showToast(err.response.data?.error || "Login failed", "error");
      } else {
        showToast("An unknown error occurred", "error");
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn) router.replace("/");
  }, [isLoggedIn, router]);

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-screen  p-4">
      <form
        className="w-full max-w-sm p-8 bg-white rounded-3xl shadow-xl border border-gray-100"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <h2 className="text-3xl font-light text-center text-orange-600 mb-8">
          {t("login")}
        </h2>

        {/* Email Field */}
        <div className="mb-6">
          <label className="block text-sm font-light text-gray-700 mb-1">
            {t("email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("enter_email")}
            required
            className="w-full px-4 py-2.5 border font-light border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
          />
        </div>

        {/* Password Field */}
        <div className="mb-8 relative">
          <label className="block text-sm font-light text-gray-700 mb-1">
            {t("password")}
          </label>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("enter_password")}
            required
            className="w-full px-4 py-2.5 pr-12 border font-light border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
          />
          <button
            type="button"
            className="absolute right-3 top-[37px] text-gray-400 hover:text-orange-500"
            onClick={() => setShowPassword((p) => !p)}
          >
            {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
          </button>
        </div>

        {/* Standard Login Button */}
        <button
          type="submit"
          className="w-full py-3 bg-orange-500 font-light text-white rounded-xl hover:bg-orange-600 transition-all shadow-md mb-6"
        >
          {t("sign_in")}
        </button>

        {/* Divider */}
        <div className="relative flex items-center mb-6">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm uppercase">
            {t("or")}
          </span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* Google Login Button Wrapper */}
        <div className="flex justify-center w-full overflow-hidden">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => showToast("Google Login Failed", "error")}
            useOneTap
            theme="outline"
            shape="pill"
            width="100%"
          />
        </div>
      </form>
    </div>
  );
}
