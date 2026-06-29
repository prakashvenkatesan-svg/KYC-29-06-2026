import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { getAdminUser, isAdminAuthenticated } from "../../services/adminAuth";

const RequireAdminAuth = ({ children }) => {
  const location = useLocation();

  if (!isAdminAuthenticated()) {
    return (
      <Navigate
        to='/admin/login'
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  const adminUser = getAdminUser();

  if (adminUser?.role === "rm") {
    if (location.pathname === "/admin/dashboard") {
      return <Navigate to='/admin/rm-dashboard' replace />;
    }

    if (location.pathname === "/admin/users") {
      return <Navigate to='/admin/rm-dashboard' replace />;
    }
  }

  return children;
};

export default RequireAdminAuth;
