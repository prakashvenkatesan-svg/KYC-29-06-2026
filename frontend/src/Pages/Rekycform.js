import { React, useState } from "react";

import { useNavigate, useLocation } from "react-router-dom";


import { IoArrowBack } from "react-icons/io5";

import Aionionlogo from "../assets/Aionionlogo.png";
import otp from "../assets/otp.png";

const Rekycform = () => {
  const navigate = useNavigate();
  const [activeBtn, setActiveBtn] = useState("general");

  return (
    <div className='Form-container'>
      <div className='Form-card'>
        <div className='back-btn' onClick={() => navigate("/investor")}>
          <IoArrowBack style={{ marginRight: "3px", color: "#000000" }} />
          Back
        </div>

        <div className='logo-container'>
          <img src={Aionionlogo} alt='Logo' className='navbar-logo' />
        </div>
        <div className='logo-section'>
          <h2>AIONION CAPITAL MARKET SERVICES PVT. LTD.</h2>
        </div>

        <div className='toggle-wrapper'>
          <button
            className={
              activeBtn === "general" ? "toggle-btn active" : "toggle-btn"
            }
            onClick={() => setActiveBtn("general")}
          >
            General ReKYC
          </button>

          <button
            className={
              activeBtn === "bank" ? "toggle-btn active" : "toggle-btn"
            }
            onClick={() => setActiveBtn("bank")}
          >
            Bank Modification
          </button>
        </div>

        <input
          type='text'
          placeholder='Enter your Trading / Client Code'
          className='input-field'
        />

        <button className='submit-btn'>
          <img src={otp} alt='otp' className='btn-icon' />
          Send OTP
        </button>
      </div>
    </div>
  );
};

export default Rekycform;
