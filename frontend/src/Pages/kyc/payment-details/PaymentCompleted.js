import React, { useState } from "react";

import axios from "axios";

import { useNavigate } from "react-router-dom";

import Congratulations from "../../../assets/Congratulations.png";

import KycStepper from "../../../Components/kyc/KycStepper";
import { toast } from "react-toastify";
const PaymentCompleted = () => {
  const navigate = useNavigate();

  // STATES
  const [checked, setChecked] = useState(false);
  const [clientCodeGenerated, setClientCodeGenerated] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // GET LOCAL STORAGE DATA
  const email = localStorage.getItem("email");

  const panNumber = localStorage.getItem("panNumber");

  // SUBMIT FUNCTION
  const handleSubmit = async () => {
    // CONSENT VALIDATION
    // if (!checked) {
    //   setError("Please accept the consent");

    //   return;
    // }

    // EMAIL VALIDATION
    if (!email) {
      setError("Email not found");

      return;
    }

    // PAN VALIDATION
    if (!panNumber) {
      setError("PAN number not found");

      return;
    }

    try {
      setLoading(true);

      setError("");

      // DEBUG LOGS
      console.log("EMAIL:", email);

      console.log("PAN:", panNumber);

      console.log("CALLING API...");

      // API CALL
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "https://57yp657i65.execute-api.ap-south-1.amazonaws.com/staging/api"}/client/generate-client-code`,
        {
          email,
          panNumber,
        },
      );

      console.log("API RESPONSE:", response.data);

      if (response.data.success) {
        toast.success(
          "Client code successfully created",
        );
      }
      setClientCodeGenerated(true);
    } catch (error) {
      console.log("API ERROR:", error.response?.data || error.message);

      setError(error.response?.data?.message || "Mail sending failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container'>
      <KycStepper
        currentStep='complete'
        completedSteps={["contact", "identify", "personal", "scheme"]}
      />

      <div className='Payment-card'>
        <img
          src={Congratulations}
          alt='Congratulations'
          className='Congratulationimg'
        />

        <h3 className='text-center'>Congratulations</h3>

        <p className='text-center'>You have successfully created account</p>

        {/* <p>Your Client Code Sent to your Registered Mail id, Please check </p> */}

        {/* <label className='trading-option'>
          <input
            type='checkbox'
            checked={checked}
            onChange={(e) => {
              setChecked(e.target.checked);

              if (e.target.checked) {
                setError("");
              }
            }}
          />

          <span>You have Successfully Created your account,</span>
        </label> */}

        {error && (
          <p
            style={{
              color: "red",
              marginTop: "10px",
            }}
          >
            {error}
          </p>
        )}

        {/* BUTTON */}
        <button
          type='button'
          className='submit-btn'
          onClick={() => {
            if (clientCodeGenerated) {
              navigate("/esign");
            } else {
              handleSubmit();
            }
          }}
          disabled={loading}
        >
          {loading
            ? "Please Wait..."
            : clientCodeGenerated
              ? "Continue"
              : "Generate Client Code"}
        </button>
      </div>
    </div>
  );
};

export default PaymentCompleted;
