import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AdminLayout from "../../Components/admin/AdminLayout";
import api from "../../services/api";

const metricCards = [
  {
    key: "total_applications",
    label: "Total Applications",
    note: "All demat onboarding cases in the system",
  },
  {
    key: "in_progress_applications",
    label: "In Progress",
    note: "Applicants still moving through the flow",
  },
  {
    key: "pending_reviews",
    label: "Pending Reviews",
    note: "Ready for internal operations review",
  },
  {
    key: "today_users",
    label: "Today Users",
    note: "Internal users created today",
  },
  {
    key: "claimed_applications",
    label: "Claimed",
    note: "Applications already assigned to an RM",
  },
  {
    key: "unclaimed_applications",
    label: "Unclaimed",
    note: "Applications still waiting for assignment",
  },
  {
    key: "verified_applications",
    label: "Verified",
    note: "Operationally verified applications",
  },
  {
    key: "completed_applications",
    label: "Completed",
    note: "Fully processed and activation-ready",
  },
  {
    key: "rejected_applications",
    label: "Rejected",
    note: "Cases rejected or sent back",
  },
];

const buildMetricLink = (cardKey) => {
  if (cardKey === "claimed_applications") {
    return "/admin/applications?assignment_state=assigned";
  }

  if (cardKey === "unclaimed_applications") {
    return "/admin/applications?assignment_state=unassigned";
  }

  return null;
};

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/admin/metrics");
        setMetrics(response.data?.data || null);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            "Unable to load admin metrics right now.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return (
    <AdminLayout
      title='Admin Dashboard'
      subtitle='Track the onboarding pipeline, pending internal reviews, and overall demat account processing health.'
      actions={
        <Link className='admin-button' to='/admin/applications'>
          Open Application Queue
        </Link>
      }
    >
      {error ? <div className='admin-message error'>{error}</div> : null}

      {loading ? (
        <div className='admin-loading'>Loading dashboard metrics...</div>
      ) : (
        <>
          <div className='admin-card-grid'>
            {metricCards.map((card) => {
              const metricLink = buildMetricLink(card.key);

              if (metricLink) {
                return (
                  <Link key={card.key} className='admin-stat-card' to={metricLink}>
                    <h3>{card.label}</h3>
                    <strong>{metrics?.[card.key] ?? 0}</strong>
                    <span>{card.note}</span>
                  </Link>
                );
              }

              return (
                <div key={card.key} className='admin-stat-card'>
                  <h3>{card.label}</h3>
                  <strong>{metrics?.[card.key] ?? 0}</strong>
                  <span>{card.note}</span>
                </div>
              );
            })}
          </div>

          <div className='admin-panel'>
            <h2>Recommended Internal Flow</h2>
            <p>
              Review pending applications first, capture remarks for any mismatch,
              and only move verified cases to completed once PAN, KRA or
              DigiLocker, bank, nominee, and eSign steps are fully ready.
            </p>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default Dashboard;
