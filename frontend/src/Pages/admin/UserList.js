import React, { useEffect, useState } from "react";

import AdminLayout from "../../Components/admin/AdminLayout";
import api from "../../services/api";
import { getAdminUser } from "../../services/adminAuth";

const roleOptions = ["", "admin", "maker", "checker", "rm"];
const activeOptions = ["", "true", "false"];

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const UserList = () => {
  const adminUser = getAdminUser();
  const canCreateUsers = adminUser?.role === "admin";
  const [filters, setFilters] = useState({
    q: "",
    role: "",
    is_active: "",
  });
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    is_active: true,
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchUsers = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (activeFilters.q.trim()) params.q = activeFilters.q.trim();
      if (activeFilters.role) params.role = activeFilters.role;
      if (activeFilters.is_active) params.is_active = activeFilters.is_active;

      const response = await api.get("/admin/users", { params });
      setUsers(response.data?.data || []);
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.message || "Unable to load internal users right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCreateForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
    setSuccess("");
  };

  const handleClear = () => {
    const cleared = {
      q: "",
      role: "",
      is_active: "",
    };

    setFilters(cleared);
    fetchUsers(cleared);
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    try {
      setCreatingUser(true);
      setError("");
      setSuccess("");

      await api.post("/admin/users", {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        is_active: createForm.is_active,
      });

      setSuccess("Internal user created successfully.");
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "admin",
        is_active: true,
      });
      await fetchUsers();
    } catch (createError) {
      setError(
        createError.response?.data?.message ||
          "Unable to create internal user right now.",
      );
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <AdminLayout
      title='User List'
      subtitle='Manage and review internal users such as admins, makers, checkers, and relationship managers.'
      actions={
        <button type='button' className='admin-button-secondary' onClick={handleClear}>
          Clear Filters
        </button>
      }
    >
      {canCreateUsers ? (
        <div className='admin-panel'>
          <h2>Create Internal User</h2>
          <p>
            Add admins, makers, checkers, or relationship managers using the
            existing admin login system.
          </p>
          <form className='admin-filter-bar' onSubmit={handleCreateUser}>
            <div className='admin-field'>
              <label htmlFor='create-user-name'>Name</label>
              <input
                id='create-user-name'
                name='name'
                type='text'
                value={createForm.name}
                onChange={handleCreateFormChange}
                placeholder='Internal user name'
              />
            </div>

            <div className='admin-field'>
              <label htmlFor='create-user-email'>Email</label>
              <input
                id='create-user-email'
                name='email'
                type='email'
                value={createForm.email}
                onChange={handleCreateFormChange}
                placeholder='user@company.com'
              />
            </div>

            <div className='admin-field'>
              <label htmlFor='create-user-role'>Role</label>
              <select
                id='create-user-role'
                name='role'
                value={createForm.role}
                onChange={handleCreateFormChange}
              >
                {roleOptions
                  .filter(Boolean)
                  .map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
              </select>
            </div>

            <div className='admin-field'>
              <label htmlFor='create-user-password'>Password</label>
              <input
                id='create-user-password'
                name='password'
                type='password'
                value={createForm.password}
                onChange={handleCreateFormChange}
                placeholder='Minimum 6 characters'
              />
            </div>

            <div className='admin-field'>
              <label htmlFor='create-user-active'>Account Active</label>
              <select
                id='create-user-active'
                name='is_active'
                value={String(createForm.is_active)}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    is_active: event.target.value === "true",
                  }))
                }
              >
                <option value='true'>Active</option>
                <option value='false'>Inactive</option>
              </select>
            </div>

            <button type='submit' className='admin-button' disabled={creatingUser}>
              {creatingUser ? "Creating..." : "Create User"}
            </button>
          </form>
        </div>
      ) : null}

      {success ? <div className='admin-message success'>{success}</div> : null}
      <div className='admin-panel'>
        <div className='admin-filter-bar'>
          <div className='admin-field'>
            <label htmlFor='user-search'>Search</label>
            <input
              id='user-search'
              name='q'
              type='text'
              value={filters.q}
              onChange={handleFilterChange}
              placeholder='Name or email'
            />
          </div>

          <div className='admin-field'>
            <label htmlFor='user-role'>Role</label>
            <select
              id='user-role'
              name='role'
              value={filters.role}
              onChange={handleFilterChange}
            >
              {roleOptions.map((option) => (
                <option key={option || "all"} value={option}>
                  {option || "All roles"}
                </option>
              ))}
            </select>
          </div>

          <div className='admin-field'>
            <label htmlFor='user-active'>Account Status</label>
            <select
              id='user-active'
              name='is_active'
              value={filters.is_active}
              onChange={handleFilterChange}
            >
              {activeOptions.map((option) => (
                <option key={option || "all"} value={option}>
                  {option === "" ? "All users" : option === "true" ? "Active" : "Inactive"}
                </option>
              ))}
            </select>
          </div>

          <button type='button' className='admin-button' onClick={() => fetchUsers()}>
            Apply
          </button>
        </div>
      </div>

      {error ? <div className='admin-message error'>{error}</div> : null}

      <div className='admin-table-wrap'>
        <div className='admin-table-header'>
          <h2 className='admin-table-title'>Internal User Directory</h2>
          <p className='admin-table-subtitle'>
            Email is the login identity. RM users can later be assigned to applications from
            the operations workflow.
          </p>
        </div>

        {loading ? (
          <div className='admin-loading'>Loading users...</div>
        ) : users.length === 0 ? (
          <div className='admin-empty'>No internal users matched the current filters.</div>
        ) : (
          <table className='admin-table'>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Assigned Applications</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name || "-"}</strong>
                  </td>
                  <td>{user.email || "-"}</td>
                  <td>
                    <span className={`admin-badge review-${user.role === "rm" ? "approved" : "pending"}`}>
                      {user.role || "-"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge application-${
                        user.is_active ? "verified" : "rejected"
                      }`}
                    >
                      {user.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td>{user.assigned_application_count ?? 0}</td>
                  <td>{formatDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
};

export default UserList;
