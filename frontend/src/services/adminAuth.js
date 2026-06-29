const ADMIN_TOKEN_KEY = "adminToken";
const ADMIN_USER_KEY = "adminUser";

export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY) || "";

export const getAdminUser = () => {
  const raw = localStorage.getItem(ADMIN_USER_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const getAdminDefaultRoute = (user = getAdminUser()) => {
  if (user?.role === "rm") {
    return "/admin/rm-dashboard";
  }

  return "/admin/dashboard";
};

export const setAdminAuth = ({ token, user }) => {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  }
};

export const clearAdminAuth = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
};

export const isAdminAuthenticated = () => Boolean(getAdminToken());
