import React from "react";
import { IoArrowBack } from "react-icons/io5";
import { useNavigate, useLocation } from "react-router-dom";



import Aionionlogo from "../assets/Aionionlogo.png";
import profileicon from "../assets/profileicon.png";

const Accountcloserform = () => {
  const navigate = useNavigate();

  return (
    <div className='Form-container'>
      <div className='Form-card'>
        <div className='back-btn' onClick={() => navigate("/investor")}>
          <IoArrowBack style={{ marginRight: "3px", color: "#000000" }} /> Back
        </div>

        <div className='logo-container'>
          <img src={Aionionlogo} alt='Logo' className='navbar-logo' />
        </div>
        <div className='logo-section'>
          <h2>AIONION CAPITAL MARKET SERVICES PVT. LTD.</h2>
          <h3 className='title'>Account Closure</h3>
        </div>

        <input
          type='text'
          placeholder='Enter your Client ID'
          className='input-field'
        />

        <select className='input-field'>
          <option>--Select Reason for Closure--</option>
          <option>Not Interested in Trading</option>
          <option>Not Happy with services</option>
          <option>Not Holding/Not Required</option>
          <option>Transfer to my Demat Account</option>
          <option>Transmission request</option>
          <option>Account Transfer</option>
          <option>Transfer to other DP</option>
          <option>Violation With Agreement With DP</option>
          <option>Non Payment Of Dues</option>
          <option>Violation Of Provision By BO</option>
          <option>Termination Of DP</option>
          <option>Suspension Of DP</option>
          <option>Close Because Of DP Closure</option>
          <option>Other</option>
        </select>

        <button className='submit-btn'>
          <img
            src={profileicon}
            alt='profileicon'
            className='profileicon-btn'
          />
          Check Eligibility
        </button>

        <div className='note-section'>
          <p>
            <strong>Note :</strong>
          </p>
          <ul>
            <li>This link is for individual account only.</li>
            <li>
              Client will be able to close the demat account without mandatory
              giving any reasons.
            </li>
            <li>
              This eligibility will ensure whether account's holding and ledger
              is free or not.
            </li>
            <li>
              Client would have to upload the scanned copy of request form
              digitally signed.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Accountcloserform;
