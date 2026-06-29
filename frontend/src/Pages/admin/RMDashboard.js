import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AdminLayout from "../../Components/admin/AdminLayout";
import api from "../../services/api";
import { getAdminUser } from "../../services/adminAuth";

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const Badge = ({ value, type }) => (
  <span className={`admin-badge ${type}-${value || "pending"}`}>
    {String(value || "pending").replaceAll("_", " ")}
  </span>
);

const RMDashboard = () => {
  const adminUser = getAdminUser();
  const isRmUser = adminUser?.role === "rm";
  const [selectedRmId, setSelectedRmId] = useState(isRmUser ? adminUser.id : "");
  const [rmUsers, setRmUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async (rmId) => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (rmId) params.rm_id = rmId;

      const response = await api.get("/admin/rm/dashboard", { params });
      const data = response.data?.data || {};

      setMetrics(data.selected_rm || null);
      setRmUsers(data.rm_users || []);
      setApplications(data.applications || []);
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.message || "Unable to load RM dashboard right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedRmId);
  }, []);

  const handleApply = () => {
    fetchDashboard(selectedRmId);
  };

  return (
    <AdminLayout
      title='RM Dashboard'
      subtitle={
        isRmUser
          ? "Track your assigned applications, follow up with customers, and keep onboarding moving toward approval."
          : "Review RM-assigned applications and monitor relationship-manager follow-up across the onboarding pipeline."
      }
      actions={
        <button type='button' className='admin-button' onClick={handleApply}>
          Refresh RM View
        </button>
      }
    >
      <div className='admin-panel'>
        <div className='admin-filter-bar'>
          <div className='admin-field'>
            <label htmlFor='rm-select'>Relationship Manager</label>
            <select
              id='rm-select'
              value={selectedRmId}
              onChange={(event) => setSelectedRmId(event.target.value)}
              disabled={isRmUser}
            >
              <option value=''>All RM users</option>
              {rmUsers.map((rmUser) => (
                <option key={rmUser.id} value={rmUser.id}>
                  {rmUser.name} ({rmUser.email})
                </option>
              ))}
            </select>
          </div>

          {isRmUser ? null : (
            <button type='button' className='admin-button' onClick={handleApply}>
              Apply
            </button>
          )}
        </div>
      </div>

      {error ? <div className='admin-message error'>{error}</div> : null}

      <div className='admin-card-grid'>
        <div className='admin-stat-card'>
          <h3>Selected RM</h3>
          <strong>{metrics?.name || (isRmUser ? adminUser?.name : "All RM users")}</strong>
          <span>{metrics?.email || (isRmUser ? adminUser?.email : "Combined pipeline view")}</span>
        </div>
        <div className='admin-stat-card'>
          <h3>{isRmUser ? "My Total Applications" : "Total Assigned"}</h3>
          <strong>{metrics?.total_assigned_applications ?? applications.length}</strong>
          <span>
            {isRmUser
              ? "Applications currently assigned to you"
              : "Applications currently mapped to this RM view"}
          </span>
        </div>
        <div className='admin-stat-card'>
          <h3>Pending Follow-up</h3>
          <strong>{metrics?.pending_reviews ?? 0}</strong>
          <span>Cases waiting on your customer follow-up or next action</span>
        </div>
        <div className='admin-stat-card'>
          <h3>In Progress</h3>
          <strong>{metrics?.in_progress_applications ?? 0}</strong>
          <span>Applications still moving through onboarding</span>
        </div>
        <div className='admin-stat-card'>
          <h3>Completed</h3>
          <strong>{metrics?.completed_applications ?? 0}</strong>
          <span>Applications successfully finished in the pipeline</span>
        </div>
        <div className='admin-stat-card'>
          <h3>Rejected</h3>
          <strong>{metrics?.rejected_applications ?? 0}</strong>
          <span>Applications that need closure, correction, or escalation</span>
        </div>
      </div>

      <div className='admin-table-wrap'>
        <div className='admin-table-header'>
          <h2 className='admin-table-title'>
            {isRmUser ? "My Assigned Applications" : "RM Application View"}
          </h2>
          <p className='admin-table-subtitle'>
            {isRmUser
              ? "Use this view to manage your assigned cases, collect customer updates, and keep each application moving to the next step."
              : "Use this view to follow application progress, collect customer updates, and prepare cases before the maker-checker stage is expanded later."}
          </p>
        </div>

        {loading ? (
          <div className='admin-loading'>Loading RM applications...</div>
        ) : applications.length === 0 ? (
          <div className='admin-empty'>
            No applications are currently assigned to this RM selection.
          </div>
        ) : (
          <table className='admin-table'>
            <thead>
              <tr>
                <th>Application</th>
                <th>Contact</th>
                <th>Current Step</th>
                <th>Status</th>
                <th>Review</th>
                <th>Next Action</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <strong>{application.application_number || `APP-${application.id}`}</strong>
                    <br />
                    <span>{application.client_code || "Client code pending"}</span>
                  </td>
                  <td>
                    <div>{application.mobile_number || "-"}</div>
                    <div>{application.email || "-"}</div>
                  </td>
                  <td>{application.current_step || "-"}</td>
                  <td>
                    <Badge value={application.application_status} type='application' />
                  </td>
                  <td>
                    <Badge value={application.review_status} type='review' />
                  </td>
                  <td>
                    {application.review_status === "pending"
                      ? "Follow up with customer"
                      : application.review_status === "under_review"
                        ? "Await operations update"
                        : application.application_status === "completed"
                          ? "No action"
                          : application.application_status === "rejected"
                            ? "Resolve and resubmit"
                            : "Keep progress moving"}
                  </td>
                  <td>{formatDate(application.updated_at)}</td>
                  <td>
                    <Link className='admin-inline-link' to={`/admin/applications/${application.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default RMDashboard;
