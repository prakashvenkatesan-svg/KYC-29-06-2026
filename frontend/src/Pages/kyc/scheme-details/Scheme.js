import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

import schemeexclamatory from "../../../assets/schemeexclamatory.png";
import graph from "../../../assets/graph.png";

import KycStepper from "../../../Components/kyc/KycStepper";
import KycInfoSection from "../../../Components/kyc/KycInfoSection";

const Scheme = () => {
  const navigate = useNavigate();

  const [showBrokeragePopup, setShowBrokeragePopup] = useState(false);
  const [showChargesPopup, setShowChargesPopup] = useState(false);

  const [selectedScheme, setSelectedScheme] = useState(() => {
    const savedScheme = localStorage.getItem("selected_scheme");
    return savedScheme || "";
  });

  const [schemeError, setSchemeError] = useState("");
  const [isSavingScheme, setIsSavingScheme] = useState(false);

  const handleSchemeSelect = (schemeValue) => {
    setSelectedScheme(schemeValue);
    setSchemeError("");

    const schemeSelections = {
      lifeTime: schemeValue === "lifeTime",
      annualCare: schemeValue === "annualCare",
    };

    localStorage.setItem("selected_scheme", schemeValue);

    // Keeping this for compatibility with your existing payment flow
    localStorage.setItem("scheme_selections", JSON.stringify(schemeSelections));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedScheme) {
      setSchemeError("Please select an account opening scheme.");
      return;
    }

    const applicationId = localStorage.getItem("application_id");

    if (!applicationId) {
      setSchemeError("Application ID is missing. Please restart the KYC process.");
      return;
    }

    const schemeSelections = {
      lifeTime: selectedScheme === "lifeTime",
      annualCare: selectedScheme === "annualCare",
    };

    try {
      setIsSavingScheme(true);
      setSchemeError("");

      await api.post("/scheme/save", {
        application_id: Number(applicationId),
        selectedScheme,
      });

      localStorage.setItem("selected_scheme", selectedScheme);
      localStorage.setItem("scheme_selections", JSON.stringify(schemeSelections));

      navigate("/payment-details");
    } catch (error) {
      setSchemeError(
        error?.response?.data?.message ||
          "Failed to save scheme selection. Please try again.",
      );
    } finally {
      setIsSavingScheme(false);
    }
  };

  return (
    <div className='container'>
      <KycStepper
        currentStep='scheme'
        completedSteps={["contact", "identify", "personal"]}
      />

      <div className='row scheme-page-row'>
        {/* Account Opening Scheme Card */}
        <div className='col-lg-6 mb-4'>
          <div className='scheme-card-new'>
            <h3 className='scheme-main-title'>Account Opening Charges</h3>

            <p className='scheme-sub-title'>Choose your Scheme</p>

            <div className='scheme-options-row' role='radiogroup'>
              {/* Scheme 1 */}
              <button
                type='button'
                className={`scheme-price-box scheme-one ${
                  selectedScheme === "lifeTime" ? "scheme-active" : ""
                }`}
                role='radio'
                aria-checked={selectedScheme === "lifeTime"}
                onClick={() => handleSchemeSelect("lifeTime")}
              >
                <span className='scheme-number'>1</span>

                <p className='scheme-label'>Scheme</p>
<p>Life Time Advantage</p>

                <h2 className='scheme-price'>
                  ₹ 2499 <span>+ GST</span>
                </h2>

                <p className='scheme-amc-text'>(No AMC)</p>

                {selectedScheme === "lifeTime" && (
                  <span className='scheme-selected-check'>✓</span>
                )}
              </button>

              {/* Scheme 2 */}
              <button
                type='button'
                className={`scheme-price-box scheme-two ${
                  selectedScheme === "annualCare" ? "scheme-active" : ""
                }`}
                role='radio'
                aria-checked={selectedScheme === "annualCare"}
                onClick={() => handleSchemeSelect("annualCare")}
              >
                <span className='scheme-number'>2</span>

                <p className='scheme-label'>Scheme</p>
<p>Annual Care</p>

                <h2 className='scheme-price'>
                  ₹ 1249 <span>+ GST</span>
                </h2>

                <p className='scheme-amc-text'>
                  (AMC : ₹499 + GST)
                  <br />
                  From 2nd Year Onwards
                </p>

                {selectedScheme === "annualCare" && (
                  <span className='scheme-selected-check'>✓</span>
                )}
              </button>
            </div>

            <div className='scheme-info-actions'>
              <button
                type='button'
                className='scheme-info-btn'
                onClick={() => setShowBrokeragePopup(true)}
              >
                <img
                  src={schemeexclamatory}
                  alt=''
                  className='scheme-info-icon'
                />
                Brokerage Plans
              </button>

              <button
                type='button'
                className='scheme-info-btn'
                onClick={() => setShowChargesPopup(true)}
              >
                <img
                  src={schemeexclamatory}
                  alt=''
                  className='scheme-info-icon'
                />
                Schedule of Charges
              </button>
            </div>

            {schemeError && (
              <p className='error-text scheme-error-text'>{schemeError}</p>
            )}
          </div>
        </div>

        {/* Trading Preference Card */}
        <div className='col-lg-6 mb-4'>
          <form className='trading-card' onSubmit={handleSubmit}>
            <h2 className='trading-title'>Choose your trading preferences</h2>

            <p className='trading-subtitle'>We’ll Customize your Experience</p>

            <div>
              <img src={graph} alt='Trading graph' className='graphimg' />
            </div>

            <span className='trading-content-text'>
              Equity, Mutual Funds, IPO, Bonds &amp; SLBM
              <br />
              (Stock Lending and Borrowing Mechanism)
            </span>

           <button className='scheme-proceed-btn' type='submit'>
              Proceed
            </button>

          </form>
        </div>
      </div>

      {/* Brokerage Popup */}
      {showBrokeragePopup && (
        <div
          className='popup-overlay'
          onClick={() => setShowBrokeragePopup(false)}
        >
          <div
            className='popup-card'
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className='popup-header'>
              Trading Account Tariff (Brokerage Plan)
            </h4>

            <div className='popup-content'>
              <h4>Brokerage</h4>

              <div className='brokerage-table'>
                <div className='table-row table-heading-row'>
                  <span>Segment</span>
                  <span>%</span>
                  <span>Minimum Paise per Share</span>
                </div>

                <div className='table-row'>
                  <span>Equity Cash Intraday</span>
                  <span>0.075%</span>
                  <span>0.01</span>
                </div>

                <div className='table-row'>
                  <span>Equity Cash Delivery</span>
                  <span>0.75%</span>
                  <span>0.01</span>
                </div>

                <div className='table-row'>
                  <span>Bond (Debt Segment)</span>
                  <span>0.75% for Sale Transaction</span>
                  <span>-</span>
                </div>
              </div>
            </div>

            <div className='popup-subcontent'>
              <div className='other-charges'>
                <h4 className='charges-title'>Other Charges</h4>

                <div className='charges-row'>
                  <span>Account Opening Charges:</span>
                  <span>
                    Rs.2499/- + GST for Resident Individuals, Non-Resident
                    Individuals (NRI), and Non-Individuals
                  </span>
                </div>

                <div className='charges-row'>
                  <span>Physical Contract Notes / Statements:</span>
                  <span>Rs.200 + GST (per instance)</span>
                </div>

                <div className='charges-row'>
                  <span>Cheque Bounce / Cheque Cancellation:</span>
                  <span>Rs.1000 + GST</span>
                </div>

                <div className='charges-row'>
                  <span>Interest on Delayed Payment:</span>
                  <span>24% Per Annum</span>
                </div>

                <div className='charges-row'>
                  <span>Profile Modifications:</span>
                  <span>Rs.25 + GST</span>
                </div>

                <div className='charges-row'>
                  <span>Payment Gateway Charges:</span>
                  <span>NIL</span>
                </div>

                <div className='charges-row'>
                  <span>Statutory Charges:</span>
                  <span>
                    GST, STT, CTT, Transaction Charges, SEBI, Stamp Duty, etc.
                    <br />
                    (Applicable as per Statutory Bodies)
                  </span>
                </div>

                <div className='charges-row'>
                  <span>GST 18%:</span>
                  <span>Brokerage, SEBI Charges and TOC</span>
                </div>
              </div>
            </div>

            <button
              type='button'
              className='popup-close'
              onClick={() => setShowBrokeragePopup(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Schedule of Charges Popup */}
      {showChargesPopup && (
        <div
          className='popup-overlay'
          onClick={() => setShowChargesPopup(false)}
        >
          <div
            className='popup-card large-popup'
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className='popup-header'>Schedule of Charges</h4>

            <div className='popup-body schedule-table'>
              <div className='schedule-header'>
                <span>Account Description</span>
                <span>Charges (Rs.)</span>
              </div>

              <div className='schedule-row'>
                <span>Account Opening:</span>
                <span>NIL</span>
              </div>

              <div className='schedule-row'>
                <span>Documentation Charges:</span>
                <span>NIL</span>
              </div>

              <div className='schedule-row'>
                <span>Custody:</span>
                <span>NIL</span>
              </div>

              <div className='schedule-row'>
                <span>Annual Maintenance Charges:</span>
                <span>NIL</span>
              </div>

              <div className='schedule-row'>
                <span>Transaction Charges (On Market):</span>
                <span>
                  Buy: NIL, Sell: Rs.30.00 per ISIN or 0.04% (whichever is
                  higher)
                </span>
              </div>

              <div className='schedule-row'>
                <span>Transaction Charges (Debt Segment On Market):</span>
                <span>Buy: Rs.100 per ISIN, Sell: Rs.100 per ISIN</span>
              </div>

              <div className='schedule-row'>
                <span>Transaction Charges (Off Market / Inter DP):</span>
                <span>
                  Buy: NIL, Sell: Rs.30.00 per ISIN or 0.04% (whichever is
                  higher)
                </span>
              </div>

              <div className='schedule-row'>
                <span>Dematerialisation:</span>
                <span>
                  Rs.150 per certificate + Rs.50 per request + courier charges
                  at actual
                </span>
              </div>

              <div className='schedule-row'>
                <span>Rematerialisation:</span>
                <span>
                  Rs.20 for every 100 securities + courier charges at actual
                </span>
              </div>

              <div className='schedule-row'>
                <span>Pledge and Unpledges:</span>
                <span>
                  Rs.50 per ISIN or 0.04% (whichever is higher) to Pledger
                </span>
              </div>

              <div className='schedule-row'>
                <span>Pledge Invocation (Pledgee):</span>
                <span>
                  Rs.50 per ISIN or 0.04% (whichever is higher) to Pledgee
                </span>
              </div>

              <div className='schedule-row'>
                <span>Margin Pledge and Unpledge:</span>
                <span>Rs.30 per ISIN</span>
              </div>

              <div className='schedule-row'>
                <span>Failed Instruction Charges:</span>
                <span>Rs.30 per ISIN</span>
              </div>

              <div className='schedule-row'>
                <span>DIS Booklet Charges:</span>
                <span>Rs.100 per booklet + courier charges at actual</span>
              </div>

              <div className='schedule-row'>
                <span>KYC Modification Charges:</span>
                <span>Rs.25 per instruction</span>
              </div>

              <div className='schedule-row'>
                <span>KRA Process Charges:</span>
                <span>Rs.35 for New KRA and Rs.35 for Modification KRA</span>
              </div>
            </div>

            <button
              type='button'
              className='popup-close'
              onClick={() => setShowChargesPopup(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <KycInfoSection />
    </div>
  );
};

export default Scheme;
