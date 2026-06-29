import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiLock, FiMail } from "react-icons/fi";

import api from "../../services/api";
import {
  getAdminDefaultRoute,
  isAdminAuthenticated,
  setAdminAuth,
} from "../../services/adminAuth";
import "../../Components/admin/admin.css";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate(getAdminDefaultRoute(), { replace: true });
    }
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      general: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      nextErrors.email = "Enter a valid email";
    }

    if (!formData.password) {
      nextErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);
      setErrors({});

      const response = await api.post("/admin/auth/login", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const authData = response.data?.data;

      if (!authData?.token || !authData?.user) {
        setErrors({
          general: "Admin login did not return a valid session.",
        });
        return;
      }

      setAdminAuth(authData);

      const redirectTo =
        location.state?.from || getAdminDefaultRoute(authData.user);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrors({
        general:
          error.response?.data?.message || "Unable to sign in right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='admin-login-shell'>
      <div className='admin-login-card'>
        <div className='admin-login-copy'>
          <p className='admin-eyebrow'>Internal Access</p>
          <h1>AIONION Operations Console</h1>
          <p>
            Sign in to review onboarding applications, update internal status,
            and move verified demat cases through the maker-checker queue.
          </p>
        </div>

        <form className='admin-login-form' onSubmit={handleSubmit}>
          <div className='admin-field'>
            <label htmlFor='admin_email'>Admin Email</label>
            <div className='admin-login-input'>
              <FiMail />
              <input
                id='admin_email'
                type='email'
                name='email'
                value={formData.email}
                onChange={handleChange}
                placeholder='ops@aionionglobal.com'
              />
            </div>
            {errors.email ? <span className='error-text'>{errors.email}</span> : null}
          </div>

          <div className='admin-field'>
            <label htmlFor='admin_password'>Password</label>
            <div className='admin-login-input'>
              <FiLock />
              <input
                id='admin_password'
                type='password'
                name='password'
                value={formData.password}
                onChange={handleChange}
                placeholder='Enter admin password'
              />
            </div>
            {errors.password ? (
              <span className='error-text'>{errors.password}</span>
            ) : null}
          </div>

          {errors.general ? (
            <div className='admin-message error'>{errors.general}</div>
          ) : null}

          <button type='submit' className='admin-button' disabled={loading}>
            {loading ? "Signing in..." : "Sign in to Admin"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
