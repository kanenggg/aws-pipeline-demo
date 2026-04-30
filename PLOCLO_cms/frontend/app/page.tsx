"use client";

import { useAuth } from "./context/AuthContext";
import LoginForm from "../components/LoginForm";
import { useTranslation } from "react-i18next";
import LoadingOverlay from "../components/LoadingOverlay";
import { useState } from "react";

export default function HomePage() {
  const { isLoggedIn, user } = useAuth();
  const { t } = useTranslation("common");
  const [loading, ] = useState(false);

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      {!isLoggedIn ? (
        <>
          <LoginForm />
        </>
      ) : (
        <>
          <h1 className="text-4xl font-light mb-4">
            {t("welcome")}, {user?.username || "User"} 👋
          </h1>
          <p className="text-gray-600 font-light text-xl">{t("you are logged in")}</p>
        </>
      )}
    </div>
  );
}
