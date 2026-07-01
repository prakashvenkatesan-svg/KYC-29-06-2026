import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../../services/api";
import KycStepper from "../../../Components/kyc/KycStepper";

import instructionIcon from "../../../assets/instructionIcon.png";

import person from "../../../assets/person.png";
import identityproof from "../../../assets/identityproof.png";
import aadhaarproof from "../../../assets/aadhaarproof.png";
import pefproof from "../../../assets/pefproof.png";

import standingiconcolor from "../../../assets/standingiconcolor.png";
import standingiconwhite from "../../../assets/standingiconwhite.png";
import phone from "../../../assets/phone.png";
import email from "../../../assets/email.png";

const EMPTY_STANDING_INSTRUCTIONS = {
  depositoryCredit: "",
  pledgeInstructions: "",
  accountStatementRequirement: "",
  electronicTransactionStatement: "",
  shareEmailWithRta: "",
  annualReport: "",
  dividendInterestEcs: "",
  contractNote: "",
  trustFacility: "",
  disAtAccountOpening: "",
};

const normalizeGenderLabel = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (normalized === "M" || normalized === "MALE") return "Male";
  if (normalized === "F" || normalized === "FEMALE") return "Female";
  if (normalized === "T" || normalized === "TRANSGENDER") return "Transgender";

  return String(value || "").trim();
};

const PersonalDetails = () => {
  const navigate = useNavigate();

  const [showDdpiInfoPopup, setShowDdpiInfoPopup] = useState(false);
  const [showPepPopup, setShowPepPopup] = useState(false);
  const [showStandingPopup, setShowStandingPopup] = useState(false);

  const [formData, setFormData] = useState({
    fatherName: "",
    motherName: "",
    gender: "",
    maritalStatus: "",
    education: "",
    annualIncome: "",
    tradingExperience: "",
    politicallyExposed: "",
    occupation: "",
    citizenOfIndia: "",
    netWorth: "",
    runningAccountAuthorization: "",
    countryOfBirth: "",
    ddpi: "No",
    aadhaarAddress: "",
    incomeDeclarationAccepted: false,
    rightsAccepted: false,
  });
  const [lockedFields, setLockedFields] = useState({
    fatherName: false,
    gender: false,
    aadhaarAddress: false,
  });

  const [applicationId, setApplicationId] = useState(
    () => localStorage.getItem("application_id") || "",
  );
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDdpiPopup, setShowDdpiPopup] = useState(false);

  const [standingInstructions, setStandingInstructions] = useState(
    EMPTY_STANDING_INSTRUCTIONS,
  );

  const [standingErrors, setStandingErrors] = useState({});
  const [standingCompleted, setStandingCompleted] = useState(false);
  const [mainFormError, setMainFormError] = useState("");

  useEffect(() => {
    const savedApplicationId = localStorage.getItem("application_id");
    setApplicationId(savedApplicationId || "");

    setFormData((prev) => ({
      ...prev,
      ddpi: "Yes",
    }));
    localStorage.setItem("ddpi", "Yes");

    const storedAadhaarAddressPrefill =
      localStorage.getItem("aadhaar_address_prefill") || "";
    const storedFatherNamePrefill =
      localStorage.getItem("father_name_prefill") || "";
    const storedGenderPrefill = localStorage.getItem("gender_prefill") || "";

    if (storedAadhaarAddressPrefill.trim()) {
      setFormData((prev) => ({
        ...prev,
        aadhaarAddress: storedAadhaarAddressPrefill.trim(),
      }));
      setLockedFields((prev) => ({
        ...prev,
        aadhaarAddress: true,
      }));
    }

    if (storedFatherNamePrefill.trim()) {
      setFormData((prev) => ({
        ...prev,
        fatherName: storedFatherNamePrefill.trim(),
      }));
      setLockedFields((prev) => ({
        ...prev,
        fatherName: true,
      }));
    }

    if (storedGenderPrefill.trim()) {
      setFormData((prev) => ({
        ...prev,
        gender: normalizeGenderLabel(storedGenderPrefill),
      }));
      setLockedFields((prev) => ({
        ...prev,
        gender: true,
      }));
    }
  }, []);

  useEffect(() => {
    if (!applicationId) {
      return;
    }

    let ignore = false;

    const loadAadhaarAddressPrefill = async () => {
      try {
        const response = await api.get(
          `/personal-details/prefill/${applicationId}`,
        );
        const fetchedAddress = String(
          response.data?.data?.aadhaar_address || "",
        ).trim();
        const fetchedFatherName = String(
          response.data?.data?.father_name || "",
        ).trim();
        const fetchedGender = normalizeGenderLabel(
          response.data?.data?.gender || "",
        );

        if (ignore) {
          return;
        }

        setFormData((prev) => {
          const nextData = { ...prev };
          let hasChanges = false;

          if (fetchedAddress && !String(prev.aadhaarAddress || "").trim()) {
            nextData.aadhaarAddress = fetchedAddress;
            hasChanges = true;
            setLockedFields((previous) => ({
              ...previous,
              aadhaarAddress: true,
            }));
          }

          if (fetchedFatherName && !String(prev.fatherName || "").trim()) {
            nextData.fatherName = fetchedFatherName;
            hasChanges = true;
            setLockedFields((previous) => ({
              ...previous,
              fatherName: true,
            }));
          }

          if (fetchedGender && !String(prev.gender || "").trim()) {
            nextData.gender = fetchedGender;
            hasChanges = true;
            setLockedFields((previous) => ({
              ...previous,
              gender: true,
            }));
          }

          return hasChanges ? nextData : prev;
        });
      } catch (error) {
        console.log(
          "Unable to prefill personal details:",
          error.response?.data || error.message,
        );
      }
    };

    loadAadhaarAddressPrefill();

    return () => {
      ignore = true;
    };
  }, [applicationId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      general: "",
    }));

    if (name === "politicallyExposed" && value === "Yes") {
      setShowPepPopup(true);
    }
  };

  const handlePepPopupClose = () => {
    setShowPepPopup(false);
    navigate("/");
  };

  const handleStandingInstructionChange = (field, value) => {
    setStandingInstructions((previous) => ({
      ...previous,
      [field]: value,
    }));

    setStandingCompleted(false);
    setMainFormError("");

    setStandingErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  const validateStandingInstructions = () => {
    const errors = {};

    if (!standingInstructions.depositoryCredit) {
      errors.depositoryCredit = "Please select Yes or No.";
    }

    if (!standingInstructions.pledgeInstructions) {
      errors.pledgeInstructions = "Please select Yes or No.";
    }

    if (!standingInstructions.accountStatementRequirement) {
      errors.accountStatementRequirement =
        "Please select account statement requirement.";
    }

    if (!standingInstructions.electronicTransactionStatement) {
      errors.electronicTransactionStatement = "Please select Yes or No.";
    }

    if (!standingInstructions.shareEmailWithRta) {
      errors.shareEmailWithRta = "Please select Yes or No.";
    }

    if (!standingInstructions.annualReport) {
      errors.annualReport = "Please select annual report preference.";
    }

    if (!standingInstructions.dividendInterestEcs) {
      errors.dividendInterestEcs = "Please select Yes or No.";
    }

    if (!standingInstructions.contractNote) {
      errors.contractNote = "Please select contract note preference.";
    }

    if (!standingInstructions.trustFacility) {
      errors.trustFacility = "Please select Yes or No.";
    }

    if (!standingInstructions.disAtAccountOpening) {
      errors.disAtAccountOpening = "Please select Yes or No.";
    }

    setStandingErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleStandingSubmit = () => {
    const isValid = validateStandingInstructions();

    if (!isValid) {
      return;
    }

    setStandingCompleted(true);
    setShowStandingPopup(false);

    setMainFormError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fatherName.trim()) {
      newErrors.fatherName = "Father's name is required";
    }

    if (!formData.motherName.trim()) {
      newErrors.motherName = "Mother's name is required";
    }

    if (!formData.gender.trim()) {
      newErrors.gender = "Gender is required";
    }

    if (!formData.maritalStatus) {
      newErrors.maritalStatus = "Marital status is required";
    }

    if (!formData.education) {
      newErrors.education = "Education is required";
    }

    if (!formData.tradingExperience) {
      newErrors.tradingExperience = "Trading experience is required";
    }

    if (!formData.politicallyExposed) {
      newErrors.politicallyExposed = "Please select politically exposed status";
    }

    if (!formData.occupation) {
      newErrors.occupation = "Occupation is required";
    }

    if (!formData.citizenOfIndia) {
      newErrors.citizenOfIndia = "Please select citizenship";
    }

    if (!formData.netWorth) {
      newErrors.netWorth = "Net worth is required";
    }

    if (!formData.runningAccountAuthorization) {
      newErrors.runningAccountAuthorization =
        "Running account authorization is required";
    }

    if (!formData.countryOfBirth.trim()) {
      newErrors.countryOfBirth = "Country of birth is required";
    }

    if (!formData.aadhaarAddress.trim()) {
      newErrors.aadhaarAddress = "Aadhaar address is required";
    }

    if (!formData.incomeDeclarationAccepted) {
      newErrors.incomeDeclarationAccepted = "Please accept income declaration";
    }

    if (!formData.rightsAccepted) {
      newErrors.rightsAccepted = "Please accept rights and obligations";
    }

    if (!applicationId) {
      newErrors.general =
        "Application ID missing. Please restart registration.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. First validate all Personal Details input fields.
    // If any field is empty, show input field errors only.
    const isPersonalDetailsValid = validateForm();

    if (!isPersonalDetailsValid) {
      setMainFormError("");
      return;
    }

    // 2. Only after Personal Details are valid,
    // validate Standing Instructions.
    const isStandingInstructionsValid = validateStandingInstructions();

    // Customer must select every standing instruction
    // and click popup Submit before final form submit.
    if (!isStandingInstructionsValid || !standingCompleted) {
      setStandingCompleted(false);

      setMainFormError(
        isStandingInstructionsValid
          ? "Please click Submit in Standing Instructions before submitting the Personal Details form."
          : "Please complete all mandatory Standing Instructions before submitting the Personal Details form.",
      );

      setShowStandingPopup(true);
      return;
    }

    try {
      setLoading(true);
      setMainFormError("");

      const payload = {
        application_id: Number(applicationId),
        ...formData,

        standingInstructions: {
          ...standingInstructions,
        },

        standing_instruction_completed: true,
      };

      const response = await api.post("/personal-details/save", payload);

      if (!response.data?.success) {
        setErrors((prev) => ({
          ...prev,
          general: response.data?.message || "Failed to save personal details",
        }));
        return;
      }

      const ddpiResponse = await api.post("/ddpi/select", {
        application_id: Number(applicationId),
        ddpi_selected: formData.ddpi === "Yes",
      });

      if (!ddpiResponse.data?.success) {
        setErrors((prev) => ({
          ...prev,
          general:
            ddpiResponse.data?.message || "Failed to update DDPI selection",
        }));
        return;
      }

      localStorage.setItem("personal_details_completed", "true");
      localStorage.setItem("ddpi", formData.ddpi);
      localStorage.setItem("aadhaarAddress", formData.aadhaarAddress);

      navigate("/nomination");
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        general:
          error.response?.data?.message ||
          "Failed to save personal details. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container py-4'>
      <KycStepper
        currentStep='personal'
        completedSteps={["contact", "identify"]}
      />

      <div className='personal-card'>
        <form onSubmit={handleSubmit}>
          <div className='row g-3'>
            <h3 className='text-center'>Personal Details</h3>

            <div className='col-12 col-md-6'>
              <div className='row g-3'>
                <div className='col-12'>
                  <div className='floating-group'>
                    <input
                      type='text'
                      name='fatherName'
                      className='floating-input'
                      placeholder='Enter Your father name'
                      value={formData.fatherName}
                      onChange={handleChange}
                      readOnly={lockedFields.fatherName}
                    />
                    <label>
                      Father's Name <span>*</span>
                    </label>
                  </div>
                  {errors.fatherName && (
                    <p className='error-text'>{errors.fatherName}</p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group'>
                    <input
                      type='text'
                      name='gender'
                      className='floating-input'
                      placeholder='Enter Your Gender'
                      value={formData.gender}
                      onChange={handleChange}
                      readOnly={lockedFields.gender}
                    />
                    <label>
                      Gender <span>*</span>
                    </label>
                  </div>
                  {errors.gender && (
                    <p className='error-text'>{errors.gender}</p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group'>
                    <select
                      name='education'
                      className='floating-select'
                      value={formData.education}
                      onChange={handleChange}
                    >
                      <option value='' disabled hidden>
                        Select Your Education
                      </option>
                      <option value='10th'>10th</option>
                      <option value='12th'>12th</option>
                      <option value='Graduate'>Graduate</option>
                      <option value='Post Graduate'>Post Graduate</option>
                    </select>
                    <label>
                      Education <span>*</span>
                    </label>
                  </div>
                  {errors.education && (
                    <p className='error-text'>{errors.education}</p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group'>
                    <select
                      name='tradingExperience'
                      className='floating-select'
                      value={formData.tradingExperience}
                      onChange={handleChange}
                    >
                      <option value='' disabled hidden>
                        Select Your Experience
                      </option>
                      <option value='Less than 1 Year'>Less than 1 Year</option>
                      <option value='1-2 years'>1-2 years</option>
                      <option value='2-5 years'>2-5 years</option>
                      <option value='5-10 years'>5-10 years</option>
                      <option value='10-20 years'>10-20 years</option>
                      <option value='More than 20 years'>
                        More than 20 years
                      </option>
                    </select>
                    <label>
                      Trading Experience (in years) <span>*</span>
                    </label>
                  </div>
                  {errors.tradingExperience && (
                    <p className='error-text'>{errors.tradingExperience}</p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group'>
                    <select
                      name='occupation'
                      className='floating-select'
                      value={formData.occupation}
                      onChange={handleChange}
                    >
                      <option value='' disabled hidden>
                        Select Your Occupation
                      </option>
                      <option value='Private Sector'>Private Sector</option>
                      <option value='Public Sector'>Public Sector</option>
                      <option value='Agriculturist'>Agriculturist</option>
                      <option value='Government Service'>
                        Government Service
                      </option>
                      <option value='Professional'>Professional</option>
                      <option value='Business'>Business</option>
                      <option value='Retired'>Salaried</option>
                      <option value='Student'>Student</option>
                      <option value='Other'>Other</option>
                    </select>
                    <label>
                      Occupation <span>*</span>
                    </label>
                  </div>
                  {errors.occupation && (
                    <p className='error-text'>{errors.occupation}</p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group'>
                    <select
                      name='netWorth'
                      className='floating-select'
                      value={formData.netWorth}
                      onChange={handleChange}
                    >
                      <option value='' disabled hidden>
                        Select Your Net Worth
                      </option>
                      <option value='Below 1,00,000'>Below 1,00,000</option>
                      <option value='1,00,000 - 5,00,000'>
                        1,00,000 - 5,00,000
                      </option>
                      <option value='5,00,000 - 10,00,000'>
                        5,00,000 - 10,00,000
                      </option>
                      <option value='10,00,000 - 25,00,000'>
                        10,00,000 - 25,00,000
                      </option>
                      <option value='Above 25,00,000'>Above 25,00,000</option>
                    </select>
                    <label>
                      Net worth (in Rupees) <span>*</span>
                    </label>
                  </div>
                  {errors.netWorth && (
                    <p className='error-text'>{errors.netWorth}</p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group'>
                    <input
                      type='text'
                      name='countryOfBirth'
                      className='floating-input'
                      placeholder='Enter country of birth'
                      value={formData.countryOfBirth}
                      onChange={handleChange}
                    />
                    <label>
                      Country code of birth <span>*</span>
                    </label>
                  </div>
                  {errors.countryOfBirth && (
                    <p className='error-text'>{errors.countryOfBirth}</p>
                  )}
                </div>
              </div>
            </div>

            <div className='col-12 col-md-6'>
              <div className='row g-3'>
                <div className='col-12'>
                  <div className='floating-group'>
                    <input
                      type='text'
                      name='motherName'
                      className='floating-input'
                      placeholder='Enter the Mother Name'
                      value={formData.motherName}
                      onChange={handleChange}
                    />
                    <label>
                      Mother's Name <span>*</span>
                    </label>
                  </div>
                  {errors.motherName && (
                    <p className='error-text'>{errors.motherName}</p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group'>
                    <select
                      name='maritalStatus'
                      className='floating-select'
                      value={formData.maritalStatus}
                      onChange={handleChange}
                    >
                      <option value='' disabled hidden>
                        Select Marital Status
                      </option>
                      <option value='Single'>Single</option>
                      <option value='Married'>Married</option>
                    </select>
                    <label>
                      Marital Status <span>*</span>
                    </label>
                  </div>
                  {errors.maritalStatus && (
                    <p className='error-text'>{errors.maritalStatus}</p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group'>
                    <select
                      name='politicallyExposed'
                      className='floating-select'
                      value={formData.politicallyExposed}
                      onChange={handleChange}
                    >
                      <option value='' disabled hidden>
                        Select Politically Exposed
                      </option>
                      <option value='Yes'>Yes</option>
                      <option value='No'>No</option>
                    </select>
                    <label>
                      Politically Exposed <span>*</span>
                    </label>
                  </div>
                  {errors.politicallyExposed && (
                    <p className='error-text'>{errors.politicallyExposed}</p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group'>
                    <select
                      name='citizenOfIndia'
                      className='floating-select'
                      value={formData.citizenOfIndia}
                      onChange={handleChange}
                    >
                      <option value='' disabled hidden>
                        Select citizenship
                      </option>
                      <option value='Yes'>Yes</option>
                      <option value='No'>No</option>
                    </select>
                    <label>
                      Are you a citizen of India ? <span>*</span>
                    </label>
                  </div>
                  {errors.citizenOfIndia && (
                    <p className='error-text'>{errors.citizenOfIndia}</p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group'>
                    <select
                      name='runningAccountAuthorization'
                      className='floating-select'
                      value={formData.runningAccountAuthorization}
                      onChange={handleChange}
                    >
                      <option value='' disabled hidden>
                        Select Running Account Authorization
                      </option>
                      <option value='Yes'>Yes</option>
                      <option value='No'>No</option>
                    </select>
                    <label>
                      Running Account Authorization <span>*</span>
                    </label>
                  </div>
                  {errors.runningAccountAuthorization && (
                    <p className='error-text'>
                      {errors.runningAccountAuthorization}
                    </p>
                  )}
                </div>

                <div className='col-12'>
                  <div className='floating-group ddpi-floating-group'>
                    <select
                      id='ddpi'
                      name='ddpi'
                      className='floating-select'
                      value={formData.ddpi}
                      onChange={handleChange}
                    >
                      <option value='' disabled hidden>
                        Select DDPI Option
                      </option>
                      <option value='Yes'>Yes</option>
                      <option value='No'>No</option>
                    </select>

                    <label htmlFor='ddpi'>
                      Do you wish to execute DDPI (Demat Debit Pledge
                      Instructions)? <span>*</span>
                    </label>

                    <div className='d-flex gap-2 mt-2'>
                      <img
                        src={instructionIcon}
                        alt='DDPI information'
                        className='instructionIconimg'
                        onClick={() => setShowDdpiInfoPopup(true)}
                        title='DDPI Instructions'
                      />
                      <p>DDPI Instruction</p>
                    </div>
                  </div>

                  {errors.ddpi && <p className='error-text'>{errors.ddpi}</p>}
                </div>
              </div>
            </div>

            <div className='col-12 col-md-6 mt-4'>
              <div className='address-title'>Address Details</div>

              <div className='floating-group mt-3'>
                <textarea
                  name='aadhaarAddress'
                  className='floating-textarea'
                  rows='4'
                  placeholder=' '
                  value={formData.aadhaarAddress}
                  onChange={handleChange}
                  readOnly={lockedFields.aadhaarAddress}
                />
                <label>
                  Address Details <span>*</span>
                </label>
              </div>
              {errors.aadhaarAddress && (
                <p className='error-text'>{errors.aadhaarAddress}</p>
              )}
            </div>
          </div>

          {errors.general && (
            <p className='error-text mt-3'>{errors.general}</p>
          )}

          {mainFormError && <p className='error-text mt-3'>{mainFormError}</p>}

          <button
            type='button'
            className='standing-instruction-trigger d-flex align-items-center'
            onClick={() => setShowStandingPopup(true)}
          >
            <img
              src={standingiconcolor}
              alt='Standing instruction'
              className='iconimage'
            />

            <p className='mb-0' standing-title>
              Standing Instruction
              {standingCompleted && (
                <span className='standing-completed-text'>Completed</span>
              )}
            </p>
          </button>

          <p className='mt-3'>
            <span className='required'>*</span> Above data may be shared with
            other Aionion group entities for providing other financial services,
            in case need be.
          </p>

          <div className='d-flex gap-3'>
            <input
              type='checkbox'
              id='incomeDeclaration'
              name='incomeDeclarationAccepted'
              className='checkbox'
              checked={formData.incomeDeclarationAccepted}
              onChange={handleChange}
            />
            <label htmlFor='incomeDeclaration'>
              I hereby confirm that my annual income and networth information is
              not older than one year.
            </label>
          </div>
          {errors.incomeDeclarationAccepted && (
            <p className='error-text'>{errors.incomeDeclarationAccepted}</p>
          )}

          <p className='mt-3 rights-oblig'>Rights and Obligations</p>

          <div className='d-flex gap-3'>
            <input
              type='checkbox'
              id='rightsObligations'
              name='rightsAccepted'
              className='checkbox'
              checked={formData.rightsAccepted}
              onChange={handleChange}
            />
            <label
              htmlFor='rightsObligations'
              className='personal-details-right-obli'
            >
              I further confirm having read and understood the contents of the
              “Rights and Obligations” document(s) and “Risk Disclosure
              Document” MITC. I / We do hereby agree to be bound by such
              provisions as outlined in these documents.
            </label>
          </div>
          {errors.rightsAccepted && (
            <p className='error-text'>{errors.rightsAccepted}</p>
          )}

          <button
            type='submit'
            className='mt-4 personal-submit-button'
            disabled={loading}
          >
            {loading ? "Saving..." : "Submit"}
          </button>
        </form>

        {showDdpiInfoPopup && (
          <div className='popup-overlay'>
            <div className='popup-card-result ddpi-info-popup'>
              <button
                type='button'
                className='popup-close-result'
                onClick={() => setShowDdpiInfoPopup(false)}
              >
                ×
              </button>

              <div className='popup-icon'>
                <img src={instructionIcon} alt='DDPI information' />
              </div>

              <h4 className='popup-title'>What is DDPI?</h4>

              <p className='popup-message ddpi-popup-message'>
                DDPI stands for{" "}
                <strong>Demat Debit and Pledge Instruction</strong>. DDPI is a
                permission to process share sales from your demat account. It
                makes selling shares easier, as you do not need to enter CDSL
                TPIN and OTP every time you sell shares.
              </p>
            </div>
          </div>
        )}

        {showPepPopup && (
          <div className='popup-overlay'>
            <div className='popup-card-result'>
              <button
                type='button'
                className='popup-close-result'
                onClick={handlePepPopupClose}
              >
                ×
              </button>

              <div className='popup-icon'>
                <img src={person} alt='person' className='headerimg' />
              </div>

              <h4 className='popup-title'>Manual KYC Required</h4>

              <p className='popup-message'>
                As you have selected{" "}
                <strong>"Politically Exposed Person - Yes"</strong>, you are
                required to complete Manual KYC.
              </p>

              <div className='proof-box'>
                <p className='proof-heading'>Documents Required</p>

                <div className='sample'>
                  <div className='d-flex gap-2'>
                    <img
                      src={identityproof}
                      alt='identity-proof'
                      className='proofimage'
                    />
                    <p className='proof-text'>
                      {" "}
                      Identity Proof (Aadhaar / PAN)
                    </p>
                  </div>

                  <div className='d-flex gap-2'>
                    <img
                      src={aadhaarproof}
                      alt='identity-proof'
                      className='proofimage'
                    />
                    <p className='proof-text'> Address Proof</p>
                  </div>

                  <div className='d-flex gap-2'>
                    <img
                      src={pefproof}
                      alt='identity-proof'
                      className='proofimage'
                    />
                    <p className='proof-text'>PEP Declaration</p>
                  </div>
                </div>
              </div>

              <p className='popup-contact-text'>
                Please contact our helpline for Manual KYC.
              </p>

              <div className='popup-help-row'>
                <img src={phone} alt='lockicon' className='popup-help-icon' />
                <span>(+91) 92402 62108</span>
              </div>

              <div className='popup-help-row'>
                <img src={email} alt='lockicon' className='popup-help-icon' />
                <span>clientcare@aionioncapital.com</span>
              </div>
            </div>
          </div>
        )}

        {showStandingPopup && (
          <div className='standing-popup-overlay'>
            <div className='standing-popup-card'>
              <div className='standing-popup-header'>
                <div className='d-flex align-items-center gap-2'>
                  <img
                    src={standingiconwhite}
                    alt='standingiconwhite'
                    className='iconimage-white'
                  />
                  <h4 className='mb-0'>
                    <span className='mandatory-star'>*</span> Standing
                    Instructions
                  </h4>
                </div>
              </div>

              <div className='standing-popup-body'>
                {/* Depository Credit */}
                <div className='standing-row'>
                  <div className='standing-question'>
                    I/We instruct the DP to receive each and every Depository
                    credit in my/our account.
                    {standingErrors.depositoryCredit && (
                      <small className='standing-error'>
                        {standingErrors.depositoryCredit}
                      </small>
                    )}
                  </div>

                  <div className='standing-options'>
                    <label>
                      <input
                        type='radio'
                        name='depositoryCredit'
                        checked={
                          standingInstructions.depositoryCredit === "Yes"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "depositoryCredit",
                            "Yes",
                          )
                        }
                      />
                      Yes
                    </label>

                    <label>
                      <input
                        type='radio'
                        name='depositoryCredit'
                        checked={standingInstructions.depositoryCredit === "No"}
                        onChange={() =>
                          handleStandingInstructionChange(
                            "depositoryCredit",
                            "No",
                          )
                        }
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* Pledge Instructions */}
                <div className='standing-row'>
                  <div className='standing-question'>
                    I/We would like to instruct the DP to accept all the pledge
                    instructions in my/our account without any further
                    instruction from my end.
                    {standingErrors.pledgeInstructions && (
                      <small className='standing-error'>
                        {standingErrors.pledgeInstructions}
                      </small>
                    )}
                  </div>

                  <div className='standing-options'>
                    <label>
                      <input
                        type='radio'
                        name='pledgeInstructions'
                        checked={
                          standingInstructions.pledgeInstructions === "Yes"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "pledgeInstructions",
                            "Yes",
                          )
                        }
                      />
                      Yes
                    </label>

                    <label>
                      <input
                        type='radio'
                        name='pledgeInstructions'
                        checked={
                          standingInstructions.pledgeInstructions === "No"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "pledgeInstructions",
                            "No",
                          )
                        }
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* Account Statement */}
                <div className='standing-row'>
                  <div className='standing-question'>
                    Account Statement Requirement (as per SEBI Regulation)
                    {standingErrors.accountStatementRequirement && (
                      <small className='standing-error'>
                        {standingErrors.accountStatementRequirement}
                      </small>
                    )}
                  </div>

                  <div className='standing-options standing-options-grid'>
                    {["Daily", "Weekly", "Fortnightly", "Monthly"].map(
                      (item) => (
                        <label key={item}>
                          <input
                            type='radio'
                            name='accountStatementRequirement'
                            checked={
                              standingInstructions.accountStatementRequirement ===
                              item
                            }
                            onChange={() =>
                              handleStandingInstructionChange(
                                "accountStatementRequirement",
                                item,
                              )
                            }
                          />
                          {item}
                        </label>
                      ),
                    )}
                  </div>
                </div>

                {/* Electronic Transaction Statement */}
                <div className='standing-row'>
                  <div className='standing-question'>
                    I/We request you to send Electronic Transaction-cum-Holding
                    Statement to the email ID.
                    {standingErrors.electronicTransactionStatement && (
                      <small className='standing-error'>
                        {standingErrors.electronicTransactionStatement}
                      </small>
                    )}
                  </div>

                  <div className='standing-options'>
                    <label>
                      <input
                        type='radio'
                        name='electronicTransactionStatement'
                        checked={
                          standingInstructions.electronicTransactionStatement ===
                          "Yes"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "electronicTransactionStatement",
                            "Yes",
                          )
                        }
                      />
                      Yes
                    </label>

                    <label>
                      <input
                        type='radio'
                        name='electronicTransactionStatement'
                        checked={
                          standingInstructions.electronicTransactionStatement ===
                          "No"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "electronicTransactionStatement",
                            "No",
                          )
                        }
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* Share Email With RTA */}
                <div className='standing-row'>
                  <div className='standing-question'>
                    I/We would like to share the email ID with RTA.
                    {standingErrors.shareEmailWithRta && (
                      <small className='standing-error'>
                        {standingErrors.shareEmailWithRta}
                      </small>
                    )}
                  </div>

                  <div className='standing-options'>
                    <label>
                      <input
                        type='radio'
                        name='shareEmailWithRta'
                        checked={
                          standingInstructions.shareEmailWithRta === "Yes"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "shareEmailWithRta",
                            "Yes",
                          )
                        }
                      />
                      Yes
                    </label>

                    <label>
                      <input
                        type='radio'
                        name='shareEmailWithRta'
                        checked={
                          standingInstructions.shareEmailWithRta === "No"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "shareEmailWithRta",
                            "No",
                          )
                        }
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* Annual Report */}
                <div className='standing-row'>
                  <div className='standing-question'>
                    I/We would like to receive the Annual Report.
                    {standingErrors.annualReport && (
                      <small className='standing-error'>
                        {standingErrors.annualReport}
                      </small>
                    )}
                  </div>

                  <div className='standing-options standing-options-grid'>
                    {[
                      "Physical",
                      "Electronic",
                      "Both Physical and Electronic",
                    ].map((item) => (
                      <label key={item}>
                        <input
                          type='radio'
                          name='annualReport'
                          checked={standingInstructions.annualReport === item}
                          onChange={() =>
                            handleStandingInstructionChange(
                              "annualReport",
                              item,
                            )
                          }
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Dividend ECS */}
                <div className='standing-row'>
                  <div className='standing-question'>
                    I/We wish to receive dividend/interest directly into my/our
                    account as given below through ECS.
                    {standingErrors.dividendInterestEcs && (
                      <small className='standing-error'>
                        {standingErrors.dividendInterestEcs}
                      </small>
                    )}
                  </div>

                  <div className='standing-options'>
                    <label>
                      <input
                        type='radio'
                        name='dividendInterestEcs'
                        checked={
                          standingInstructions.dividendInterestEcs === "Yes"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "dividendInterestEcs",
                            "Yes",
                          )
                        }
                      />
                      Yes
                    </label>

                    <label>
                      <input
                        type='radio'
                        name='dividendInterestEcs'
                        checked={
                          standingInstructions.dividendInterestEcs === "No"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "dividendInterestEcs",
                            "No",
                          )
                        }
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* Contract Note */}
                <div className='standing-row'>
                  <div className='standing-question'>
                    Whether you wish to receive contract note through.
                    {standingErrors.contractNote && (
                      <small className='standing-error'>
                        {standingErrors.contractNote}
                      </small>
                    )}
                  </div>

                  <div className='standing-options'>
                    {["Physical", "Electronic"].map((item) => (
                      <label key={item}>
                        <input
                          type='radio'
                          name='contractNote'
                          checked={standingInstructions.contractNote === item}
                          onChange={() =>
                            handleStandingInstructionChange(
                              "contractNote",
                              item,
                            )
                          }
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>

                {/* TRUST Facility */}
                <div className='standing-row'>
                  <div className='standing-question'>
                    I/We wish to avail the TRUST facility using the Mobile
                    number registered for SMS Alert Facility.
                    {standingErrors.trustFacility && (
                      <small className='standing-error'>
                        {standingErrors.trustFacility}
                      </small>
                    )}
                  </div>

                  <div className='standing-options'>
                    <label>
                      <input
                        type='radio'
                        name='trustFacility'
                        checked={standingInstructions.trustFacility === "Yes"}
                        onChange={() =>
                          handleStandingInstructionChange(
                            "trustFacility",
                            "Yes",
                          )
                        }
                      />
                      Yes
                    </label>

                    <label>
                      <input
                        type='radio'
                        name='trustFacility'
                        checked={standingInstructions.trustFacility === "No"}
                        onChange={() =>
                          handleStandingInstructionChange("trustFacility", "No")
                        }
                      />
                      No
                    </label>
                  </div>
                </div>

                {/* DIS */}
                <div className='standing-row'>
                  <div className='standing-question'>
                    Whether you wish to receive DIS at the time of account
                    opening.
                    {standingErrors.disAtAccountOpening && (
                      <small className='standing-error'>
                        {standingErrors.disAtAccountOpening}
                      </small>
                    )}
                  </div>

                  <div className='standing-options'>
                    <label>
                      <input
                        type='radio'
                        name='disAtAccountOpening'
                        checked={
                          standingInstructions.disAtAccountOpening === "Yes"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "disAtAccountOpening",
                            "Yes",
                          )
                        }
                      />
                      Yes
                    </label>

                    <label>
                      <input
                        type='radio'
                        name='disAtAccountOpening'
                        checked={
                          standingInstructions.disAtAccountOpening === "No"
                        }
                        onChange={() =>
                          handleStandingInstructionChange(
                            "disAtAccountOpening",
                            "No",
                          )
                        }
                      />
                      No
                    </label>
                  </div>
                </div>
              </div>

              <div className='standing-popup-footer'>
                <button
                  type='button'
                  className='standing-submit-btn'
                  onClick={handleStandingSubmit}
                >
                  Submit
                </button>

                <button
                  type='button'
                  className='standing-clear-btn'
                  onClick={() => {
                    setStandingInstructions(EMPTY_STANDING_INSTRUCTIONS);
                    setStandingErrors({});
                    setStandingCompleted(false);
                    setMainFormError("");
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalDetails;
