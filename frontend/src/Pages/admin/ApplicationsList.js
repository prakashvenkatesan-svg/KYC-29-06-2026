import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import AdminLayout from "../../Components/admin/AdminLayout";
import api from "../../services/api";
import { getAdminUser } from "../../services/adminAuth";

const statusOptions = [
  "",
  "in_progress",
  "submitted",
  "verified",
  "completed",
  "rejected",
  "hold",
];

const reviewOptions = ["", "pending", "under_review", "approved", "rejected"];
const assignmentOptions = ["", "assigned", "unassigned"];

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

const ApplicationsList = () => {
  const adminUser = getAdminUser();
  const isRmUser = adminUser?.role === "rm";
  const [searchParams, setSearchParams] = useSearchParams();
  const isComplianceQueue = searchParams.get("queue") === "compliance";

  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    application_status: searchParams.get("application_status") || "",
    review_status: searchParams.get("review_status") || "",
    assignment_state: searchParams.get("assignment_state") || "",
  });
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchApplications = async (activeFilters) => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (activeFilters.q.trim()) params.q = activeFilters.q.trim();
      if (activeFilters.application_status) {
        params.application_status = activeFilters.application_status;
      }
      if (activeFilters.review_status) {
        params.review_status = activeFilters.review_status;
      }
      if (activeFilters.assignment_state && !isRmUser) {
        params.assignment_state = activeFilters.assignment_state;
      }

      const response = await api.get("/admin/applications", { params });
      setApplications(response.data?.data || []);
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.message ||
          "Unable to load applications right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(filters);
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApplyFilters = () => {
    const nextParams = {};

    if (isComplianceQueue) nextParams.queue = "compliance";

    if (filters.q.trim()) nextParams.q = filters.q.trim();
    if (filters.application_status) {
      nextParams.application_status = filters.application_status;
    }
    if (filters.review_status) {
      nextParams.review_status = filters.review_status;
    }
    if (filters.assignment_state && !isRmUser) {
      nextParams.assignment_state = filters.assignment_state;
    }

    setSearchParams(nextParams);
    fetchApplications(filters);
  };

  const handleClearFilters = () => {
    const cleared = {
      q: "",
      application_status: "",
      review_status: isComplianceQueue ? "under_review" : "",
      assignment_state: "",
    };

    setFilters(cleared);
    setSearchParams(
      isComplianceQueue
        ? { queue: "compliance", review_status: "under_review" }
        : {},
    );
    fetchApplications(cleared);
  };

  return (
    <AdminLayout
      title={
        isRmUser
          ? "My Applications"
          : isComplianceQueue
            ? "Compliance Queue"
            : "Applications Queue"
      }
      subtitle={
        isRmUser
          ? "Review only the applications assigned to you, track onboarding progress, and keep customer follow-up moving."
          : isComplianceQueue
            ? "Focus on applications that need compliance review, document follow-up, and approval decisions."
          : "Search and review customer applications before moving them through operations and account activation."
      }
      actions={
        <button
          type='button'
          className='admin-button-secondary'
          onClick={handleClearFilters}
        >
          Clear Filters
        </button>
      }
    >
      <div className='admin-panel'>
        <div className='admin-filter-bar'>
          <div className='admin-field'>
            <label htmlFor='q'>Search</label>
            <input
              id='q'
              name='q'
              type='text'
              value={filters.q}
              onChange={handleFilterChange}
              placeholder='Application number, PAN, mobile, email, customer name'
            />
          </div>

          <div className='admin-field'>
            <label htmlFor='application_status'>Application Status</label>
            <select
              id='application_status'
              name='application_status'
              value={filters.application_status}
              onChange={handleFilterChange}
            >
              {statusOptions.map((option) => (
                <option key={option || "all"} value={option}>
                  {option ? option.replaceAll("_", " ") : "All statuses"}
                </option>
              ))}
            </select>
          </div>

          <div className='admin-field'>
            <label htmlFor='review_status'>Review Status</label>
            <select
              id='review_status'
              name='review_status'
              value={filters.review_status}
              onChange={handleFilterChange}
            >
              {reviewOptions.map((option) => (
                <option key={option || "all"} value={option}>
                  {option ? option.replaceAll("_", " ") : "All review states"}
                </option>
              ))}
            </select>
          </div>

          {isRmUser ? (
            <div className='admin-field'>
              <label>Assignment</label>
              <input type='text' value='Showing only applications assigned to you' readOnly />
            </div>
          ) : (
            <div className='admin-field'>
              <label htmlFor='assignment_state'>Assignment</label>
              <select
                id='assignment_state'
                name='assignment_state'
                value={filters.assignment_state}
                onChange={handleFilterChange}
              >
                {assignmentOptions.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option === ""
                      ? "All applications"
                      : option === "assigned"
                        ? "Claimed"
                        : "Unclaimed"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type='button'
            className='admin-button'
            onClick={handleApplyFilters}
          >
            Apply
          </button>
        </div>
      </div>

      {error ? <div className='admin-message error'>{error}</div> : null}

      <div className='admin-table-wrap'>
        <div className='admin-table-header'>
          <h2 className='admin-table-title'>
            {isRmUser
              ? "Assigned RM Applications"
              : isComplianceQueue
                ? "Compliance Review Queue"
                : "Application Review Queue"}
          </h2>
          <p className='admin-table-subtitle'>
            {isRmUser
              ? "Focus on customer contact, document follow-up, and the next onboarding step for your assigned cases."
              : isComplianceQueue
                ? "Open an application and jump straight to compliance documents for upload, review, and approval."
              : "Prioritize under-review and pending applications to keep the demat onboarding pipeline moving."}
          </p>
        </div>

        {loading ? (
          <div className='admin-loading'>Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className='admin-empty'>No applications matched the current filters.</div>
        ) : (
          <table className='admin-table'>
            <thead>
              <tr>
                <th>Application</th>
                <th>Contact</th>
                <th>Current Step</th>
                <th>Status</th>
                <th>Review</th>
                {!isRmUser ? <th>Assigned RM</th> : null}
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
                  {!isRmUser ? (
                    <td>
                      <div>{application.assigned_rm_name || "-"}</div>
                      <div>{application.assigned_rm_email || "-"}</div>
                    </td>
                  ) : null}
                  <td>{formatDate(application.updated_at)}</td>
                  <td>
                    <div className='admin-inline-actions'>
                      <Link
                        className='admin-inline-link'
                        to={`/admin/applications/${application.id}`}
                      >
                        View
                      </Link>
                      <Link
                        className='admin-inline-link admin-inline-link-secondary'
                        to={`/admin/applications/${application.id}#compliance-documents`}
                      >
                        Compliance
                      </Link>
                    </div>
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

export default ApplicationsList;
