import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FiClipboard, FiFileText, FiHome, FiLogOut, FiUsers } from "react-icons/fi";

import "../../App.css";
import "./admin.css";
import { clearAdminAuth, getAdminUser } from "../../services/adminAuth";
import Aionionlogo from "../../assets/Aionionlogo.png";

const getAdminNavItems = (role) => {
  if (role === "rm") {
    return [
      {
        to: "/admin/rm-dashboard",
        label: "RM Dashboard",
        icon: <FiUsers />,
      },
      {
        to: "/admin/applications",
        label: "Applications",
        icon: <FiClipboard />,
      },
    ];
  }

  return [
    {
      to: "/admin/dashboard",
      label: "Dashboard",
      icon: <FiHome />,
    },
    {
      to: "/admin/applications",
      label: "Applications",
      icon: <FiClipboard />,
    },
    {
      to: "/admin/applications",
      search: "?queue=compliance&review_status=under_review",
      label: "Compliance",
      icon: <FiFileText />,
    },
    {
      to: "/admin/rm-dashboard",
      label: "RM Dashboard",
      icon: <FiUsers />,
    },
    {
      to: "/admin/users",
      label: "User List",
      icon: <FiUsers />,
    },
  ];
};

const AdminLayout = ({ title, subtitle, actions, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const adminUser = getAdminUser();
  const adminNavItems = getAdminNavItems(adminUser?.role);
  const currentSearchParams = new URLSearchParams(location.search);
  const isComplianceQueue = currentSearchParams.get("queue") === "compliance";

  const isNavItemActive = (item) => {
    if (item.label === "Compliance") {
      return location.pathname === "/admin/applications" && isComplianceQueue;
    }

    if (item.label === "Applications") {
      return location.pathname.startsWith("/admin/applications") && !isComplianceQueue;
    }

    return location.pathname === item.to;
  };

  const handleLogout = () => {
    clearAdminAuth();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className='admin-shell'>
      <aside className='admin-sidebar'>
        <div className='admin-brand'>
          <div className='admin-brand-logo-wrap'>
            <img
              src={Aionionlogo}
              alt='Aionion Logo'
              className='admin-brand-logo'
            />
          </div>
          <div>
            <h2>AIONION Capital</h2>
            <p>Internal Console</p>
          </div>
        </div>

        <nav className='admin-nav'>
          {adminNavItems.map((item) => (
            <NavLink
              key={`${item.to}${item.search || ""}`}
              to={{
                pathname: item.to,
                search: item.search || "",
              }}
              className={() =>
                `admin-nav-link ${isNavItemActive(item) ? "is-active" : ""}`
              }
            >
              <span className='admin-nav-icon'>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className='admin-main'>
        <header className='admin-header'>
          <div>
            <p className='admin-eyebrow'>Demat Operations</p>
            <h1>{title}</h1>
            {subtitle ? <p className='admin-subtitle'>{subtitle}</p> : null}
          </div>

          <div className='admin-header-actions'>
            <div className='admin-user-chip'>
              <strong>{adminUser?.name || "Admin User"}</strong>
              <span>{adminUser?.email || "Signed in"}</span>
            </div>
            {actions}
            <button
              type='button'
              className='admin-button-ghost'
              onClick={handleLogout}
            >
              <FiLogOut />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <section className='admin-content'>{children}</section>
      </main>
    </div>
  );
};

export default AdminLayout;
