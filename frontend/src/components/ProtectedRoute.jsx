import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export function ProtectedRoute({ children, requiredRole = null }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Ładowanie</div>;

  if (!user) {
    return <Navigate to="/login"></Navigate>;
  }

  if (requiredRole && !user.roles.includes(requiredRole)) {
    return <div>Brak uprawnień (wymagana rola: {requiredRole})</div>;
  }

  return children;
}
