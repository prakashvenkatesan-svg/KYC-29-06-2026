import { useNavigate, useLocation } from "react-router-dom";



import Navbar from "../Navbar.js";

const hideNavbarRoutes = [
  "/numberregistration",
  "/otp",
  "/dematdetails",
  "/personaldetails",
  "/bankdetails",
  "/applicationdetails",
  "/esigndetails",
  "/kyccomplete",
];

const Layout = () => {
  return <>{!hideNavbarRoutes.includes(location.pathname) && <Navbar />}</>;
};

export default Layout;
