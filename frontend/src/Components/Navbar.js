import { useNavigate, useLocation, NavLink } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import Aionionlogo from "../assets/Aionionlogo.png";
import "../Style.css";

const Navbar = () => {
  const navigate = useNavigate();

  const location = useLocation();

  const showLogoOnly = [
    "/numberregistration",
    "/numberotp",
    "/emailverify",
    "/emailotp",
    "/panverify",
    "/kra-details",
    "/digilocker-details",
    "/digilocker-success",
    "/income-details",
    "/photoverify",
    "/bankdetails",
    "/bankproof",
    "/personaldetails",
    "/nomination",
    "/percentage-allocation",
    "/no-nomination",
    "/schemedetail",
    "/payment-details",
    "/payment-completed",
    "/esign",
    "/uploadsignature",
    "/uploadpancard",
    "/kyc-complete",
  ].includes(location.pathname);

  const closeMenu = () => {
    const menu = document.getElementById("navbarNav");
    if (menu && menu.classList.contains("show")) {
      menu.classList.remove("show");
    }
  };

  return (
    <div className='Navbar'>
      <div className='container p-0'>
        <nav className='navbar navbar-expand-xxl navbar-light custom-navbar'>
          {showLogoOnly ? (
            <>
              <img
                src={Aionionlogo}
                alt='Logo'
                className='navbar-logo'
                style={{ cursor: "pointer" }}
                onClick={() => {
                  navigate("/");
                  closeMenu();
                }}
              />
            </>
          ) : (
            <>
              {/* Logo */}
              <img
                src={Aionionlogo}
                alt='Logo'
                className='navbar-logo'
                style={{ cursor: "pointer" }}
                onClick={() => {
                  navigate("/");
                  closeMenu();
                }}
              />

              {/* Mobile Toggle */}
              <button
                className='navbar-toggler'
                type='button'
                data-bs-toggle='collapse'
                data-bs-target='#navbarNav'
                aria-controls='navbarNav'
                aria-expanded='false'
                aria-label='Toggle navigation'
              >
                <span className='navbar-toggler-icon'></span>
              </button>

              {/* Navbar Menu */}
              <div className='collapse navbar-collapse' id='navbarNav'>
                <ul className='navbar-nav ms-auto'>
                  <li className='nav-item'>
                    <NavLink to='/' className='nav-link' onClick={closeMenu}>
                      Home
                    </NavLink>
                  </li>

                  <li className='nav-item'>
                    <NavLink
                      to='/about'
                      className='nav-link'
                      onClick={closeMenu}
                    >
                      About us
                    </NavLink>
                  </li>

                  <li className='nav-item'>
                    <NavLink
                      to='/investor'
                      className='nav-link'
                      onClick={closeMenu}
                    >
                      Investor Support
                    </NavLink>
                  </li>

                  <li className='nav-item'>
                    <NavLink
                      to='/contact'
                      className='nav-link'
                      onClick={closeMenu}
                    >
                      Contact us
                    </NavLink>
                  </li>

                  <li className='nav-item'>
                    <NavLink
                      to='/privacy'
                      className='nav-link'
                      onClick={closeMenu}
                    >
                      Privacy Policy
                    </NavLink>
                  </li>

                  <li className='nav-item'>
                    <NavLink
                      to='/more'
                      className='nav-link'
                      onClick={closeMenu}
                    >
                      More
                    </NavLink>
                  </li>
                </ul>

                <div className='navbar-button'>
                  <button
                    type='button'
                    className='Registerbtn'
                    onClick={() => {
                      navigate("/numberregistration");
                      closeMenu();
                    }}
                  >
                    Register
                  </button>

                  <button
                    type='button'
                    className='loginbtn'
                    onClick={() => {
                      navigate("/login");
                      closeMenu();
                    }}
                  >
                    Login
                  </button>
                </div>
              </div>
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

export default Navbar;
