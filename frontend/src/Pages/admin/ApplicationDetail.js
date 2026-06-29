import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import AdminLayout from "../../Components/admin/AdminLayout";
import api from "../../services/api";

const statusOptions = [
  "in_progress",
  "submitted",
  "verified",
  "completed",
  "rejected",
  "hold",
];

const reviewOptions = ["pending", "under_review", "approved", "rejected"];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const FieldGrid = ({ title, data, fields }) => (
  <div className='admin-detail-section'>
    <h2>{title}</h2>
    <div className='admin-key-value-grid'>
      {fields.map(({ key, label }) => (
        <div key={key} className='admin-key-value'>
          <label>{label}</label>
          <span>{data?.[key] || "-"}</span>
        </div>
      ))}
    </div>
  </div>
);

const ApplicationDetail = () => {
  const { id } = useParams();

  const [application, setApplication] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusForm, setStatusForm] = useState({
    application_status: "in_progress",
    review_status: "pending",
    reason: "",
    changed_by: "1",
  });
  const [remarkForm, setRemarkForm] = useState({
    admin_user_id: "1",
    note_type: "general",
    note: "",
  });
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fullName = useMemo(() => {
    if (!application?.personal_details) return "-";

    return [
      application.personal_details.first_name,
      application.personal_details.middle_name,
      application.personal_details.last_name,
    ]
      .filter(Boolean)
      .join(" ");
  }, [application]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      setError("");

      const [applicationResponse, logsResponse] = await Promise.all([
        api.get(`/admin/applications/${id}`),
        api.get(`/admin/applications/${id}/logs`),
      ]);

      const detail = applicationResponse.data?.data || null;
      setApplication(detail);
      setLogs(logsResponse.data?.data || []);

      if (detail) {
        setStatusForm((prev) => ({
          ...prev,
          application_status: detail.application_status || "in_progress",
          review_status: detail.review_status || "pending",
        }));
      }
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.message ||
          "Unable to load application details right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const handleStatusSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmittingStatus(true);
      setError("");
      setSuccess("");

      await api.patch(`/admin/applications/${id}/status`, {
        application_status: statusForm.application_status,
        review_status: statusForm.review_status,
        reason: statusForm.reason.trim() || null,
        changed_by: Number(statusForm.changed_by) || null,
      });

      setSuccess("Application status updated successfully.");
      setStatusForm((prev) => ({
        ...prev,
        reason: "",
      }));
      await fetchApplication();
    } catch (submitError) {
      setError(
        submitError.response?.data?.message ||
          "Unable to update application status right now.",
      );
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleRemarkSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmittingRemark(true);
      setError("");
      setSuccess("");

      await api.post(`/admin/applications/${id}/remarks`, {
        admin_user_id: Number(remarkForm.admin_user_id) || null,
        note_type: remarkForm.note_type,
        note: remarkForm.note.trim(),
      });

      setSuccess("Internal remark added successfully.");
      setRemarkForm((prev) => ({
        ...prev,
        note_type: "general",
        note: "",
      }));
      await fetchApplication();
    } catch (submitError) {
      setError(
        submitError.response?.data?.message ||
          "Unable to add a review remark right now.",
      );
    } finally {
      setSubmittingRemark(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      setError("");
      setSuccess("");

      const response = await api.get(`/admin/applications/${id}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const contentDisposition = response.headers["content-disposition"] || "";
      const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch?.[1] || `account_opening_${id}.pdf`;

      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      if (response.headers["x-pdf-warnings"]) {
        setSuccess(
          "PDF downloaded in test/incomplete mode. Some required production fields are still missing.",
        );
      } else {
        setSuccess("Application PDF downloaded successfully.");
      }
    } catch (downloadError) {
      setError(
        downloadError.response?.data?.message ||
          "Unable to generate the application PDF right now.",
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <AdminLayout
      title={`Application #${id}`}
      subtitle='Review the full onboarding payload, record internal remarks, and move the case through the maker-checker lifecycle.'
      actions={
        <>
          <button
            type='button'
            className='admin-button-secondary'
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? "Generating PDF..." : "Download PDF"}
          </button>
          <Link className='admin-button-ghost' to='/admin/applications'>
            Back to Queue
          </Link>
        </>
      }
    >
      {error ? <div className='admin-message error'>{error}</div> : null}
      {success ? <div className='admin-message success'>{success}</div> : null}

      {loading ? (
        <div className='admin-loading'>Loading application details...</div>
      ) : !application ? (
        <div className='admin-empty'>Application not found.</div>
      ) : (
        <div className='admin-detail-grid'>
          <div className='admin-stack'>
            <div className='admin-detail-section'>
              <h2>Summary</h2>
              <div className='admin-detail-meta'>
                <div className='admin-detail-meta-item'>
                  <label>Application Number</label>
                  <strong>{application.application_number || "-"}</strong>
                </div>
                <div className='admin-detail-meta-item'>
                  <label>Customer Name</label>
                  <strong>{fullName}</strong>
                </div>
                <div className='admin-detail-meta-item'>
                  <label>PAN</label>
                  <strong>{application.personal_details?.pan_number || "-"}</strong>
                </div>
                <div className='admin-detail-meta-item'>
                  <label>Current Step</label>
                  <strong>{application.current_step || "-"}</strong>
                </div>
                <div className='admin-detail-meta-item'>
                  <label>Application Status</label>
                  <span>{application.application_status || "-"}</span>
                </div>
                <div className='admin-detail-meta-item'>
                  <label>Review Status</label>
                  <span>{application.review_status || "-"}</span>
                </div>
                <div className='admin-detail-meta-item'>
                  <label>Client Code</label>
                  <strong>{application.client_code || "-"}</strong>
                </div>
                <div className='admin-detail-meta-item'>
                  <label>BOID</label>
                  <strong>{application.boid || "-"}</strong>
                </div>
                <div className='admin-detail-meta-item'>
                  <label>Trading Enabled</label>
                  <strong>{application.trading_enabled ? "Yes" : "No"}</strong>
                </div>
                <div className='admin-detail-meta-item'>
                  <label>Updated</label>
                  <strong>{formatDate(application.updated_at)}</strong>
                </div>
              </div>
            </div>

            <FieldGrid
              title='Contact Details'
              data={application.contact_details}
              fields={[
                { key: "mobile_number", label: "Mobile Number" },
                { key: "email", label: "Email" },
                { key: "dependency_type", label: "Dependency Type" },
                { key: "mobile_verified", label: "Mobile Verified" },
                { key: "email_verified", label: "Email Verified" },
              ]}
            />

            <FieldGrid
              title='Personal Details'
              data={application.personal_details}
              fields={[
                { key: "first_name", label: "First Name" },
                { key: "middle_name", label: "Middle Name" },
                { key: "last_name", label: "Last Name" },
                { key: "pan_number", label: "PAN Number" },
                { key: "dob", label: "Date of Birth" },
                { key: "gender", label: "Gender" },
              ]}
            />

            <FieldGrid
              title='Bank Details'
              data={application.bank_details}
              fields={[
                { key: "account_holder_name", label: "Account Holder" },
                { key: "bank_name", label: "Bank Name" },
                { key: "account_number", label: "Account Number" },
                { key: "ifsc_code", label: "IFSC Code" },
                { key: "account_type", label: "Account Type" },
              ]}
            />

            <div className='admin-detail-section'>
              <h2>Nominee Details</h2>
              {Array.isArray(application.nominee_details) &&
              application.nominee_details.length > 0 ? (
                <div className='admin-key-value-grid'>
                  {application.nominee_details.map((nominee) => (
                    <div key={nominee.id} className='admin-key-value'>
                      <label>{nominee.nominee_name || `Nominee ${nominee.id}`}</label>
                      <span>
                        Relation: {nominee.relationship || "-"}
                        <br />
                        Allocation: {nominee.allocation_percentage || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No nominee data found for this application.</p>
              )}
            </div>

            <div className='admin-detail-section'>
              <h2>KYC Process Trail</h2>
              {Array.isArray(application.kyc_process) &&
              application.kyc_process.length > 0 ? (
                <div className='admin-log-list'>
                  {application.kyc_process.map((step) => (
                    <div key={step.id} className='admin-log-item'>
                      <h4>{step.step_name}</h4>
                      <p>
                        Status: <strong>{step.step_status || "-"}</strong>
                      </p>
                      <p>Remarks: {step.remarks || "-"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No process trail found yet.</p>
              )}
            </div>

          </div>

          <div className='admin-stack'>
            <div className='admin-detail-section'>
              <h2>Update Review Status</h2>
              <form className='admin-stack' onSubmit={handleStatusSubmit}>
                <div className='admin-field'>
                  <label htmlFor='application_status'>Application Status</label>
                  <select
                    id='application_status'
                    value={statusForm.application_status}
                    onChange={(event) =>
                      setStatusForm((prev) => ({
                        ...prev,
                        application_status: event.target.value,
                      }))
                    }
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='admin-field'>
                  <label htmlFor='review_status'>Review Status</label>
                  <select
                    id='review_status'
                    value={statusForm.review_status}
                    onChange={(event) =>
                      setStatusForm((prev) => ({
                        ...prev,
                        review_status: event.target.value,
                      }))
                    }
                  >
                    {reviewOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='admin-field'>
                  <label htmlFor='status_reason'>Reason / internal note</label>
                  <textarea
                    id='status_reason'
                    className='admin-textarea'
                    value={statusForm.reason}
                    onChange={(event) =>
                      setStatusForm((prev) => ({
                        ...prev,
                        reason: event.target.value,
                      }))
                    }
                    placeholder='Why is this status being updated?'
                  />
                </div>

                <button
                  type='submit'
                  className='admin-button'
                  disabled={submittingStatus}
                >
                  {submittingStatus ? "Updating..." : "Save Status"}
                </button>
              </form>
            </div>

            <div className='admin-detail-section'>
              <h2>Add Review Remark</h2>
              <form className='admin-stack' onSubmit={handleRemarkSubmit}>
                <div className='admin-field'>
                  <label htmlFor='remark_type'>Comment Type</label>
                  <select
                    id='remark_type'
                    value={remarkForm.note_type}
                    onChange={(event) =>
                      setRemarkForm((prev) => ({
                        ...prev,
                        note_type: event.target.value,
                      }))
                    }
                  >
                    <option value='general'>General Comment</option>
                    <option value='maker'>Maker Comment</option>
                    <option value='checker'>Checker Comment</option>
                  </select>
                </div>

                <div className='admin-field'>
                  <label htmlFor='remark_note'>Remark</label>
                  <textarea
                    id='remark_note'
                    className='admin-textarea'
                    value={remarkForm.note}
                    onChange={(event) =>
                      setRemarkForm((prev) => ({
                        ...prev,
                        note: event.target.value,
                      }))
                    }
                    placeholder='Add an internal review note for this application'
                  />
                </div>

                <button
                  type='submit'
                  className='admin-button-secondary'
                  disabled={submittingRemark}
                >
                  {submittingRemark ? "Saving..." : "Save Remark"}
                </button>
              </form>
            </div>

            <div className='admin-detail-section'>
              <h2>Maker / Checker Comments</h2>
              {Array.isArray(application.review_notes) &&
              application.review_notes.length > 0 ? (
                <div className='admin-log-list'>
                  {application.review_notes.map((note) => (
                    <div key={`review-note-${note.id}`} className='admin-log-item'>
                      <h4>
                        {String(note.note_type || "general")
                          .charAt(0)
                          .toUpperCase() +
                          String(note.note_type || "general").slice(1)}{" "}
                        Comment
                      </h4>
                      <p>{note.note || "-"}</p>
                      <p>
                        By {note.admin_name || "System"} on{" "}
                        {formatDate(note.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No maker/checker comments recorded yet.</p>
              )}
            </div>

            <div className='admin-detail-section'>
              <h2>Audit Timeline</h2>
              {logs.length > 0 ? (
                <div className='admin-log-list'>
                  {logs.map((log) => (
                    <div key={`${log.log_type}-${log.id}`} className='admin-log-item'>
                      <h4>
                        {log.log_type === "status_change"
                          ? `Status changed to ${log.new_status || "-"}`
                          : "Review note added"}
                      </h4>
                      <p>{log.reason || "-"}</p>
                      <p>
                        By {log.actor_name || "System"} on {formatDate(log.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No internal logs recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ApplicationDetail;
