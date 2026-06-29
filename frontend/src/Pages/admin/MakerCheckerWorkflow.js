import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import AdminLayout from "../../Components/admin/AdminLayout";
import api from "../../services/api";

const queueCards = [
  {
    key: "pending",
    title: "Pending Review",
    review_status: "pending",
    note: "Fresh applications waiting for internal review.",
  },
  {
    key: "under_review",
    title: "Under Review",
    review_status: "under_review",
    note: "Cases currently being checked by operations.",
  },
  {
    key: "approved",
    title: "Approved",
    review_status: "approved",
    note: "Reviewed cases that can move toward activation.",
  },
  {
    key: "rejected",
    title: "Rejected",
    review_status: "rejected",
    note: "Cases sent back or rejected by the team.",
  },
];

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const renderFullName = (application) => {
  const names = [
    application.first_name,
    application.middle_name,
    application.last_name,
  ].filter(Boolean);

  return names.length ? names.join(" ") : "-";
};

const Badge = ({ value, type }) => (
  <span className={`admin-badge ${type}-${value || "pending"}`}>
    {String(value || "pending").replaceAll("_", " ")}
  </span>
);

const MakerCheckerWorkflow = () => {
  const [applications, setApplications] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/admin/applications");
        setApplications(response.data?.data || []);
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.message ||
            "Unable to load the maker-checker queue right now.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const groupedApplications = useMemo(() => {
    return queueCards.reduce((accumulator, queue) => {
      accumulator[queue.key] = applications.filter(
        (application) => application.review_status === queue.review_status,
      );
      return accumulator;
    }, {});
  }, [applications]);

  const activeQueue = queueCards.find((queue) => queue.key === selectedQueue);
  const visibleApplications = groupedApplications[selectedQueue] || [];

  return (
    <AdminLayout
      title='Maker / Checker Workflow'
      subtitle='Organize internal review work by queue state so your operations team can clear pending demat cases in the right order.'
      actions={
        <Link className='admin-button-secondary' to='/admin/applications'>
          Open Full Queue
        </Link>
      }
    >
      {error ? <div className='admin-message error'>{error}</div> : null}

      {loading ? (
        <div className='admin-loading'>Loading workflow queues...</div>
      ) : (
        <>
          <div className='admin-card-grid'>
            {queueCards.map((queue) => {
              const count = groupedApplications[queue.key]?.length || 0;

              return (
                <button
                  key={queue.key}
                  type='button'
                  className={`admin-stat-card admin-queue-card ${
                    selectedQueue === queue.key ? "is-selected" : ""
                  }`}
                  onClick={() => setSelectedQueue(queue.key)}
                >
                  <h3>{queue.title}</h3>
                  <strong>{count}</strong>
                  <span>{queue.note}</span>
                </button>
              );
            })}
          </div>

          <div className='admin-panel'>
            <h2>{activeQueue?.title || "Queue"}</h2>
            <p>
              {activeQueue?.note ||
                "Select a queue to review the matching onboarding cases."}
            </p>
          </div>

          <div className='admin-table-wrap'>
            <div className='admin-table-header'>
              <h2 className='admin-table-title'>Workflow Queue</h2>
              <p className='admin-table-subtitle'>
                Review cases, inspect their current step, and open the
                application detail page to approve, hold, or reject.
              </p>
            </div>

            {visibleApplications.length === 0 ? (
              <div className='admin-empty'>
                No applications are currently in the selected queue.
              </div>
            ) : (
              <table className='admin-table'>
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Customer</th>
                    <th>Current Step</th>
                    <th>Application Status</th>
                    <th>Review Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleApplications.map((application) => (
                    <tr key={application.id}>
                      <td>
                        <strong>
                          {application.application_number || `APP-${application.id}`}
                        </strong>
                        <br />
                        <span>{application.pan_number || "-"}</span>
                      </td>
                      <td>{renderFullName(application)}</td>
                      <td>{application.current_step || "-"}</td>
                      <td>
                        <Badge
                          value={application.application_status}
                          type='application'
                        />
                      </td>
                      <td>
                        <Badge
                          value={application.review_status}
                          type='review'
                        />
                      </td>
                      <td>{formatDate(application.updated_at)}</td>
                      <td>
                        <div className='admin-inline-actions'>
                          <Link
                            className='admin-inline-link'
                            to={`/admin/applications/${application.id}`}
                          >
                            Review Case
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default MakerCheckerWorkflow;
