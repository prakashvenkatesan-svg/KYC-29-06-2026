    import React, { useEffect, useState } from "react";
    import { useNavigate } from "react-router-dom";

    import KycStepper from "../../../Components/kyc/KycStepper";
    import api from "../../../services/api";

    import editicon from "../../../assets/editicon.png";
    import deleteicon from "../../../assets/deleteicon.png";

import phoneicon from "../../../assets/nominee-phone.png";
import emailicon from "../../../assets/nominee-mail.png";
import aadhaaricon from "../../../assets/nominee-aadhaar.png";
import panicon from "../../../assets/nominee-pancard.png";
import addressicon from "../../../assets/nominee-address.png";

const MAX_NOMINEES = 5;

const formatDobInput = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;

  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
};

const parseDisplayDob = (value) => {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(value || "").trim());

  if (!match) return null;

  const [, day, month, year] = match;
  const isoValue = `${year}-${month}-${day}`;
  const parsedDate = new Date(`${isoValue}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return null;

  if (
    parsedDate.getDate() !== Number(day) ||
    parsedDate.getMonth() + 1 !== Number(month) ||
    parsedDate.getFullYear() !== Number(year)
  ) {
    return null;
  }

  return {
    isoValue,
    parsedDate,
  };
};

    const createEmptyNominee = (allocation = "") => ({
      id: `nominee-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      nomineeName: "",
      dob: "",
      mobile: "",
      email: "",
      relation: "",
      gender: "",
      nomineeProofType: "",
      aadhaar: "",
      pan: "",
      nomineeAddress: "",
      sameAddress: false,
      nomineeAllocation: allocation,
    });

    const getAutoSplitNominees = (nomineeList = []) => {
      if (!nomineeList.length) {
        return [];
      }

      const count = nomineeList.length;
      const base = Math.floor(100 / count);
      const remainder = 100 % count;

      return nomineeList.map((nominee, index) => ({
        ...nominee,
        nomineeAllocation: String(base + (index < remainder ? 1 : 0)),
      }));
    };

    const Nomination = () => {
      const navigate = useNavigate();

      const [nomination, setNomination] = useState("Yes");
      const [applicationId, setApplicationId] = useState("");

      const [savedNominees, setSavedNominees] = useState([]);

      const [draftNominee, setDraftNominee] = useState(() =>
        createEmptyNominee(""),
      );

      const [editingNomineeId, setEditingNomineeId] = useState(null);
      const [showNomineeForm, setShowNomineeForm] = useState(true);

      const [personalAddress, setPersonalAddress] = useState("");
      const [aadhaarFocused, setAadhaarFocused] = useState(false);

      const [rightsAccepted, setRightsAccepted] = useState(false);
      const [showNomineeNames, setShowNomineeNames] = useState(false);
      const [showNomineeYesNo, setShowNomineeYesNo] = useState(false);

      const [errors, setErrors] = useState({});
      const [allocationError, setAllocationError] = useState("");
      const [loading, setLoading] = useState(false);

      /*
        true  = equal allocation is applied and percentage inputs are locked.
        false = user can manually type each nominee percentage.
      */
      const [isAutoSplitApplied, setIsAutoSplitApplied] = useState(false);

      useEffect(() => {
        const savedApplicationId = localStorage.getItem("application_id");

        if (!savedApplicationId) {
          navigate("/numberregistration");
          return;
        }

        setApplicationId(savedApplicationId);
      }, [navigate]);

      useEffect(() => {
        setPersonalAddress(localStorage.getItem("aadhaarAddress") || "");
      }, []);

      const maskAadhaarNumber = (value = "") => {
        if (!value) return "";

        const cleanValue = value.replace(/\D/g, "").slice(0, 12);

        if (cleanValue.length <= 4) {
          return cleanValue;
        }

        return `XXXXXXXX${cleanValue.slice(-4)}`;
      };

      const getAllocationTotal = (nomineeList = []) => {
        return nomineeList.reduce((total, nominee) => {
          return total + Number(nominee.nomineeAllocation || 0);
        }, 0);
      };

      const getRawWorkingNominees = (draftOverride = draftNominee) => {
        if (!showNomineeForm) {
          return savedNominees;
        }

        if (editingNomineeId) {
          return savedNominees.map((nominee) =>
            nominee.id === editingNomineeId ? draftOverride : nominee,
          );
        }

        return [...savedNominees, draftOverride];
      };

      const getWorkingNominees = () => {
        return getRawWorkingNominees();
      };

      /*
        Saves a complete nominee list back into:
        - saved nominee cards
        - the currently active nominee form
      */
      const updateWorkingNominees = (updatedNominees = []) => {
        if (!showNomineeForm) {
          setSavedNominees(updatedNominees);
          return;
        }

        if (editingNomineeId) {
          const updatedDraft = updatedNominees.find(
            (nominee) => nominee.id === editingNomineeId,
          );

          setSavedNominees(updatedNominees);
          setDraftNominee(updatedDraft || createEmptyNominee(""));
          return;
        }

        setSavedNominees(updatedNominees.slice(0, -1));
        setDraftNominee(
          updatedNominees[updatedNominees.length - 1] ||
            createEmptyNominee(""),
        );
      };

      const workingNominees = getWorkingNominees();
      const totalAllocation = getAllocationTotal(workingNominees);

      /*
        While Nominee 2 or Nominee 3 form is open:
        - only previous nominee cards are displayed
        - current nominee is shown as form
      */
      const cardNominees = !showNomineeForm
        ? savedNominees
        : editingNomineeId
          ? workingNominees.filter((nominee) => nominee.id !== editingNomineeId)
          : workingNominees.slice(0, savedNominees.length);

      const currentNomineeNumber = editingNomineeId
        ? savedNominees.findIndex((nominee) => nominee.id === editingNomineeId) + 1
        : savedNominees.length + 1;

      const canAddAnotherNominee = workingNominees.length < MAX_NOMINEES;

      const canDeleteCurrentForm =
        savedNominees.length > 0 || Boolean(editingNomineeId);

      const handleNominationChange = (value) => {
        setNomination(value);

        if (value === "No") {
          navigate("/no-nomination");
          return;
        }

        if (!showNomineeForm && savedNominees.length === 0) {
          setDraftNominee(createEmptyNominee(""));
          setShowNomineeForm(true);
        }
      };

      const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        let updatedValue = type === "checkbox" ? checked : value;

        if (name === "nomineeName") {
          updatedValue = value.replace(/[^A-Za-z\s.]/g, "");
        }

        if (name === "mobile") {
          updatedValue = value.replace(/\D/g, "").slice(0, 10);
        }

        if (name === "aadhaar") {
          updatedValue = value.replace(/\D/g, "").slice(0, 12);
        }

        if (name === "pan") {
          updatedValue = value
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 10);
        }

        if (name === "dob") {
          updatedValue = formatDobInput(value);
        }

        if (name === "sameAddress") {
          const savedAddress =
            personalAddress || localStorage.getItem("aadhaarAddress") || "";

          if (checked && !savedAddress.trim()) {
            setDraftNominee((previous) => ({
              ...previous,
              sameAddress: false,
              nomineeAddress: "",
            }));

            setErrors((previous) => ({
              ...previous,
              nomineeAddress:
                "Personal address not found. Please enter nominee address manually.",
            }));

            return;
          }

          setDraftNominee((previous) => ({
            ...previous,
            sameAddress: checked,
            nomineeAddress: checked ? savedAddress : "",
          }));

          setErrors((previous) => ({
            ...previous,
            nomineeAddress: "",
            general: "",
          }));

          return;
        }

        setDraftNominee((previous) => ({
          ...previous,
          [name]: updatedValue,
        }));

        setErrors((previous) => ({
          ...previous,
          [name]: "",
          general: "",
        }));
      };

      const handleDocChange = (event) => {
        const nomineeProofType = event.target.value;

        setDraftNominee((previous) => ({
          ...previous,
          nomineeProofType,
          aadhaar: "",
          pan: "",
        }));

        setAadhaarFocused(false);

        setErrors((previous) => ({
          ...previous,
          nomineeProofType: "",
          aadhaar: "",
          pan: "",
          general: "",
        }));
      };

      const handleAllocationChange = (event) => {
        if (isAutoSplitApplied) {
          return;
        }

        const value = event.target.value.replace(/\D/g, "").slice(0, 3);

        if (value !== "" && Number(value) > 100) {
          return;
        }

        // Manual mode: changes only this nominee.
        setDraftNominee((previous) => ({
          ...previous,
          nomineeAllocation: value,
        }));

        setErrors((previous) => ({
          ...previous,
          nomineeAllocation: "",
          general: "",
        }));

        setAllocationError("");
      };

      const handleSavedNomineeAllocationChange = (nomineeId, value) => {
        if (isAutoSplitApplied) {
          return;
        }

        const allocation = value.replace(/\D/g, "").slice(0, 3);

        if (allocation !== "" && Number(allocation) > 100) {
          return;
        }

        setSavedNominees((previous) =>
          previous.map((nominee) =>
            nominee.id === nomineeId
              ? {
                  ...nominee,
                  nomineeAllocation: allocation,
                }
              : nominee,
          ),
        );

        setErrors((previous) => ({
          ...previous,
          [nomineeId]: "",
          general: "",
        }));

        setAllocationError("");
      };

      const validateCurrentNominee = () => {
        const newErrors = {};

        const nameRegex = /^[A-Za-z\s.]+$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

        if (!draftNominee.nomineeName.trim()) {
          newErrors.nomineeName = "Nominee name is required";
        } else if (!nameRegex.test(draftNominee.nomineeName.trim())) {
          newErrors.nomineeName = "Only letters are allowed";
        }

        if (!draftNominee.dob) {
          newErrors.dob = "Date of birth is required";
        } else {
          const parsedDob = parseDisplayDob(draftNominee.dob);
          const today = new Date();

          if (!parsedDob) {
            newErrors.dob = "Enter date of birth in DD-MM-YYYY format";
          } else if (parsedDob.parsedDate > today) {
            newErrors.dob = "Date of birth cannot be in the future";
          }
        }

        if (!draftNominee.mobile) {
          newErrors.mobile = "Mobile number is required";
        } else if (draftNominee.mobile.length !== 10) {
          newErrors.mobile = "Mobile number must be 10 digits";
        }

        if (!draftNominee.email.trim()) {
          newErrors.email = "Email is required";
        } else if (!emailRegex.test(draftNominee.email.trim())) {
          newErrors.email = "Enter a valid email address";
        }

        if (!draftNominee.relation) {
          newErrors.relation = "Relation is required";
        }

        if (!draftNominee.gender) {
          newErrors.gender = "Gender is required";
        }

        if (!draftNominee.nomineeProofType) {
          newErrors.nomineeProofType = "Please choose nominee proof type";
        }

        if (draftNominee.nomineeProofType === "Aadhaar") {
          if (!draftNominee.aadhaar) {
            newErrors.aadhaar = "Aadhaar number is required";
          } else if (draftNominee.aadhaar.length !== 12) {
            newErrors.aadhaar = "Aadhaar number must be 12 digits";
          }
        }

        if (draftNominee.nomineeProofType === "PAN") {
          if (!draftNominee.pan) {
            newErrors.pan = "PAN number is required";
          } else if (!panRegex.test(draftNominee.pan)) {
            newErrors.pan = "Enter a valid PAN number";
          }
        }

        if (!draftNominee.nomineeAddress.trim()) {
          newErrors.nomineeAddress = "Address is required";
        }

        const allocation = Number(draftNominee.nomineeAllocation);

        if (
          draftNominee.nomineeAllocation === "" ||
          Number.isNaN(allocation) ||
          allocation < 1 ||
          allocation > 100
        ) {
          newErrors.nomineeAllocation =
            "Nominee allocation must be between 1% and 100%";
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
      };

      const validateFinalAllocation = (nomineeList) => {
        if (!nomineeList.length) {
          setAllocationError("Please add at least one nominee.");
          return false;
        }

        const invalidAllocation = nomineeList.some((nominee) => {
          const allocation = Number(nominee.nomineeAllocation);

          return (
            nominee.nomineeAllocation === "" ||
            Number.isNaN(allocation) ||
            allocation < 1 ||
            allocation > 100
          );
        });

        if (invalidAllocation) {
          setAllocationError(
            "Every nominee allocation must be between 1% and 100%.",
          );
          return false;
        }

        const total = getAllocationTotal(nomineeList);

        if (total !== 100) {
          setAllocationError(
            `Total nominee allocation must be exactly 100%. Current total: ${total}%.`,
          );
          return false;
        }

        setAllocationError("");
        return true;
      };

      const commitCurrentNominee = () => {
        if (!validateCurrentNominee()) {
          return null;
        }

        const nomineeToSave = {
          ...draftNominee,
          nomineeName: draftNominee.nomineeName.trim(),
          email: draftNominee.email.trim().toLowerCase(),
          nomineeAddress: draftNominee.nomineeAddress.trim(),
        };

        if (editingNomineeId) {
          return savedNominees.map((nominee) =>
            nominee.id === editingNomineeId ? nomineeToSave : nominee,
          );
        }

        return [...savedNominees, nomineeToSave];
      };

      /*
        Saves current form in frontend only,
        then opens next nominee form.
      */
      const handleAddAnotherNominee = () => {
        let updatedNominees = savedNominees;

        if (showNomineeForm) {
          const committedNominees = commitCurrentNominee();

          if (!committedNominees) {
            return;
          }

          updatedNominees = committedNominees;
        }

        if (updatedNominees.length >= MAX_NOMINEES) {
          setSavedNominees(updatedNominees);

          setErrors((previous) => ({
            ...previous,
            general: "Maximum 5 nominees can be added.",
          }));

          return;
        }

        // A new nominee means the old equal distribution is no longer final.
        setIsAutoSplitApplied(false);

        setSavedNominees(updatedNominees);

        // New nominee starts blank for manual allocation.
        setDraftNominee(createEmptyNominee(""));
        setEditingNomineeId(null);
        setShowNomineeForm(true);

        setErrors({});
        setAllocationError("");
        setAadhaarFocused(false);
      };

      /*
        Apply equal allocation:
        2 nominees -> 50 / 50
        3 nominees -> 34 / 33 / 33
        4 nominees -> 25 / 25 / 25 / 25
        5 nominees -> 20 each
      */
      const handleAutoSplit = () => {
        const nomineeList = getRawWorkingNominees();

        if (!nomineeList.length) {
          return;
        }

        const autoSplitNominees = getAutoSplitNominees(nomineeList);

        updateWorkingNominees(autoSplitNominees);
        setIsAutoSplitApplied(true);
        setAllocationError("");
        setErrors({});
      };

      /*
        Unlock percentage fields for manual allocation.
        Existing auto-split values remain visible until the user changes them.
      */
      const handleRemoveAutoSplit = () => {
        setIsAutoSplitApplied(false);
        setAllocationError("");
        setErrors({});
      };

      const handleEditNominee = (nominee) => {
        setDraftNominee({
          ...nominee,
        });

        setEditingNomineeId(nominee.id);
        setShowNomineeForm(true);

        setErrors({});
        setAllocationError("");
        setAadhaarFocused(false);
      };

      /*
        Delete icon in active nominee form.

        If a user opens another nominee form by mistake, this removes only
        the active unsaved form. Existing nominee cards stay unchanged.
      */
      const handleDiscardCurrentNomineeForm = () => {
        if (loading) return;

        setIsAutoSplitApplied(false);

        // Editing saved nominee: cancel edit and retain the saved nominee card.
        if (editingNomineeId) {
          setDraftNominee(createEmptyNominee(""));
          setEditingNomineeId(null);
          setShowNomineeForm(false);

          setErrors({});
          setAllocationError("");
          setAadhaarFocused(false);
          return;
        }

        // New nominee form: discard only this current form.
        if (savedNominees.length > 0) {
          setDraftNominee(createEmptyNominee(""));
          setEditingNomineeId(null);
          setShowNomineeForm(false);

          setErrors({});
          setAllocationError("");
          setAadhaarFocused(false);
          return;
        }

        // Keep the first form open, but allocation remains blank.
        setDraftNominee(createEmptyNominee(""));

        setErrors((previous) => ({
          ...previous,
          general:
            "At least one nominee is required. Select No if you do not want to add a nominee.",
        }));
      };

      /*
        Delete saved nominee card.
        This only changes frontend state.
        Database save happens after final Submit.
      */
      const handleDeleteSavedNominee = (nomineeId) => {
        if (loading) return;

        setIsAutoSplitApplied(false);

        const remainingSavedNominees = savedNominees.filter(
          (nominee) => nominee.id !== nomineeId,
        );

        // Keep all remaining allocations exactly as entered.
        // The user can choose Auto Split again later when needed.
        setSavedNominees(remainingSavedNominees);

        if (!remainingSavedNominees.length && !showNomineeForm) {
          setDraftNominee(createEmptyNominee(""));
          setShowNomineeForm(true);
          setEditingNomineeId(null);
        }

        setErrors((previous) => {
          const updatedErrors = { ...previous };
          delete updatedErrors[nomineeId];
          return updatedErrors;
        });

        setAllocationError("");
      };

      const handleSubmit = async (event) => {
        event.preventDefault();

        let finalNominees = savedNominees;

        /*
          If active form exists, it must be completed.
          User can click current-form delete icon to remove
          an unwanted blank nominee form before submitting.
        */
        if (showNomineeForm) {
          const committedNominees = commitCurrentNominee();

          if (!committedNominees) {
            return;
          }

          finalNominees = committedNominees;
        }

        if (!validateFinalAllocation(finalNominees)) {
          return;
        }

        if (!rightsAccepted) {
          setErrors((previous) => ({
            ...previous,
            rightsAccepted: "Please accept rights and obligations.",
          }));
          return;
        }

        if (!applicationId) {
          setErrors((previous) => ({
            ...previous,
            general: "Application ID is missing.",
          }));
          return;
        }

        try {
          setLoading(true);

          const payload = {
            application_id: Number(applicationId),
            nomination: "Yes",
            nominees: finalNominees.map(({ id, ...nominee }) => {
              const parsedDob = parseDisplayDob(nominee.dob);

              return {
                ...nominee,
                dob: parsedDob ? parsedDob.isoValue : nominee.dob,
              };
            }),
            showNomineeNames,
            showNomineeYesNo,
            rightsAccepted,
          };

          console.log("NOMINEE SAVE PAYLOAD:", JSON.stringify(payload, null, 2));

          const response = await api.post("/nominees/save", payload);

          if (response.data?.success) {
            navigate("/photoverify");
            return;
          }

          setErrors((previous) => ({
            ...previous,
            general: response.data?.message || "Failed to save nominee details.",
          }));
        } catch (error) {
          console.error(
            "NOMINEE SAVE ERROR:",
            error.response?.data || error.message,
          );

          setErrors((previous) => ({
            ...previous,
            general:
              error.response?.data?.message || "Failed to save nominee details.",
          }));
        } finally {
          setLoading(false);
        }
      };

      return (
        <div className='container'>
          <KycStepper
            currentStep='personal'
            completedSteps={["contact", "identify"]}
          />

          <div className='Nomination-card'>
            <div className='d-flex gap-3 align-items-center mb-4 nominee-heading'>
              <p className='mb-0 nominee-title'>
                Add Nominee Details <span className='required'>*</span>
              </p>

              <div className='d-flex nomination-btn gap-3 align-items-center'>
                <div className='d-flex align-items-center'>
                  <input
                    type='radio'
                    id='yes'
                    name='nomination'
                    value='Yes'
                    checked={nomination === "Yes"}
                    onChange={() => handleNominationChange("Yes")}
                  />

                  <label htmlFor='yes' className='ms-1 mb-0'>
                    Yes
                  </label>
                </div>

                <div className='d-flex align-items-center'>
                  <input
                    type='radio'
                    id='no'
                    name='nomination'
                    value='No'
                    checked={nomination === "No"}
                    onChange={() => handleNominationChange("No")}
                  />

                  <label htmlFor='no' className='ms-1 mb-0'>
                    No
                  </label>
                </div>
              </div>
            </div>

            <p className='mb-4'>You can add a maximum of 5 nominee details.</p>

            {nomination === "Yes" && (
              <form onSubmit={handleSubmit}>
                {/* SAVED NOMINEE CARDS */}
                <div className='row'>
                  {cardNominees.map((nominee, index) => (
                    <div className='col-12 col-md-6 mb-4' key={nominee.id}>
                      <div className='card shadow-sm border-0 h-100'>
                        <div className='card-body'>
                          <div className='d-flex justify-content-between align-items-center'>
                            <h6 className='mb-0'>Details of Nominee {index + 1}</h6>

                            <div className='d-flex gap-3'>
                              <img
                                src={editicon}
                                alt='Edit nominee'
                                className='Icons'
                                onClick={() => handleEditNominee(nominee)}
                                title='Edit nominee'
                                style={{
                                  cursor: "pointer",
                                  width: "18px",
                                  height: "18px",
                                  objectFit: "contain",
                                }}
                              />

                              <img
                                src={deleteicon}
                                alt='Delete nominee'
                                className='Icons'
                                onClick={() => handleDeleteSavedNominee(nominee.id)}
                                title='Delete nominee'
                                style={{
                                  cursor: "pointer",
                                  width: "18px",
                                  height: "18px",
                                  objectFit: "contain",
                                }}
                              />
                            </div>
                          </div>

                          <div className='row g-2 small text-muted mt-3'>
                            <div className='col-12 col-sm-6'>
                              <strong>Relation:</strong> {nominee.relation || "-"}
                            </div>

                            <div className='col-12 col-sm-6'>
                              <strong>Name:</strong> {nominee.nomineeName || "-"}
                            </div>

                            <div className='col-12 col-sm-6'>
                              <strong>DOB:</strong> {nominee.dob || "-"}
                            </div>

                            <div className='col-12 col-sm-6'>
                              <strong>Gender:</strong> {nominee.gender || "-"}
                            </div>
                          </div>

                          <div className='d-flex align-items-center gap-2 small text-muted mt-3'>
                            <img
                              src={phoneicon}
                              alt='Phone'
                              style={{
                                width: "18px",
                                height: "18px",
                                objectFit: "contain",
                              }}
                            />
                            <span>{nominee.mobile || "-"}</span>
                          </div>

                          <div className='d-flex align-items-center gap-2 small text-muted mt-3'>
                            <img
                              src={emailicon}
                              alt='Email'
                              style={{
                                width: "18px",
                                height: "18px",
                                objectFit: "contain",
                              }}
                            />
                            <span
                              style={{
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                            >
                              {nominee.email || "-"}
                            </span>
                          </div>

                          <div className='d-flex align-items-center gap-2 small text-muted mt-3'>
                            <img
                              src={
                                nominee.nomineeProofType === "PAN"
                                  ? panicon
                                  : aadhaaricon
                              }
                              alt='Proof'
                              style={{
                                width: "22px",
                                height: "22px",
                                objectFit: "contain",
                              }}
                            />

                            <span>
                              {nominee.nomineeProofType === "PAN"
                                ? nominee.pan || "-"
                                : maskAadhaarNumber(nominee.aadhaar)}
                            </span>
                          </div>

                          <div className='d-flex align-items-start gap-2 small text-muted mt-3'>
                            <img
                              src={addressicon}
                              alt='Address'
                              style={{
                                width: "22px",
                                height: "22px",
                                objectFit: "contain",
                                marginTop: "2px",
                              }}
                            />

                            <span
                              style={{
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                            >
                              {nominee.nomineeAddress || "-"}
                            </span>
                          </div>

                          <div className='mt-3' style={{ maxWidth: "190px" }}>
                            <div className='floating-group'>
                              <input
                                type='text'
                                className='floating-input'
                                placeholder='Allocation %'
                                value={nominee.nomineeAllocation || ""}
                                onChange={(event) =>
                                  handleSavedNomineeAllocationChange(
                                    nominee.id,
                                    event.target.value,
                                  )
                                }
                                inputMode='numeric'
                                autoComplete='off'
                                maxLength='3'
                                readOnly={isAutoSplitApplied}
                                disabled={loading}
                              />

                              <label>
                                Allocation % <span>*</span>
                              </label>

                              <span
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  right: "18px",
                                  transform: "translateY(-50%)",
                                  color: "#777",
                                  pointerEvents: "none",
                                }}
                              >
                                %
                              </span>
                            </div>

                            {errors[nominee.id] && (
                              <p className='error-text'>
                                {errors[nominee.id]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CURRENT ACTIVE NOMINEE FORM */}
                {showNomineeForm && (
                  <div className='mt-3'>
                    <div className='d-flex justify-content-between align-items-center mb-3'>
                      <h6 className='mb-0'>
                        Details of Nominee {currentNomineeNumber}
                      </h6>

                      {canDeleteCurrentForm && (
                        <img
                          src={deleteicon}
                          alt='Delete current nominee form'
                          className='Icons'
                          onClick={handleDiscardCurrentNomineeForm}
                          title='Delete this nominee form'
                          style={{
                            cursor: loading ? "not-allowed" : "pointer",
                            width: "18px",
                            height: "18px",
                            objectFit: "contain",
                            opacity: loading ? 0.5 : 1,
                          }}
                        />
                      )}
                    </div>

                    <div className='row g-3'>
                      <div className='col-12 col-lg-6'>
                        <div className='floating-group'>
                          <select
                            name='relation'
                            className='floating-select'
                            value={draftNominee.relation}
                            onChange={handleChange}
                            disabled={loading}
                          >
                            <option value='' disabled hidden>
                              Select Relation
                            </option>

                            <option value='Father'>Father</option>
                            <option value='Mother'>Mother</option>
                            <option value='Brother'>Brother</option>
                            <option value='Sister'>Sister</option>
                            <option value='Spouse'>Spouse</option>
                            <option value='Son'>Son</option>
                            <option value='Daughter'>Daughter</option>
                            <option value='Other'>Other</option>
                          </select>

                          <label>
                            Relation to you <span>*</span>
                          </label>
                        </div>

                        {errors.relation && (
                          <p className='error-text'>{errors.relation}</p>
                        )}
                      </div>

                      <div className='col-12 col-lg-6'>
                        <div className='input-container'>
                          <input
                            type='text'
                            className='input-field'
                            placeholder='Nominee Name'
                            name='nomineeName'
                            value={draftNominee.nomineeName}
                            onChange={handleChange}
                            disabled={loading}
                          />

                          <label className='floating-label'>
                            Enter your Nominee Name <span>*</span>
                          </label>
                        </div>

                        {errors.nomineeName && (
                          <p className='error-text'>{errors.nomineeName}</p>
                        )}
                      </div>

                      <div className='col-12 col-lg-6'>
                        <div className='input-container'>
                          <input
                            type='text'
                            className='input-field'
                            name='dob'
                            placeholder='Enter Nominee Date of Birth'
                            value={draftNominee.dob}
                            onChange={handleChange}
                            inputMode='numeric'
                            maxLength={10}
                            disabled={loading}
                          />

                          <label className='floating-label'>
                            Enter Nominee Date of Birth <span>*</span>
                          </label>
                        </div>

                        {errors.dob && <p className='error-text'>{errors.dob}</p>}
                      </div>

                      <div className='col-12 col-lg-6'>
                        <div className='input-container'>
                          <input
                            type='text'
                            className='input-field'
                            placeholder='Enter Nominee Mail ID'
                            name='email'
                            value={draftNominee.email}
                            onChange={handleChange}
                            autoComplete='off'
                            disabled={loading}
                          />

                          <label className='floating-label'>
                            Enter Nominee Mail ID <span>*</span>
                          </label>
                        </div>

                        {errors.email && (
                          <p className='error-text'>{errors.email}</p>
                        )}
                      </div>

                      <div className='col-12 col-lg-6'>
                        <div className='input-container'>
                          <input
                            type='text'
                            className='input-field'
                            placeholder='Enter Nominee Mobile Number'
                            name='mobile'
                            value={draftNominee.mobile}
                            onChange={handleChange}
                            inputMode='numeric'
                            autoComplete='off'
                            disabled={loading}
                          />

                          <label className='floating-label'>
                            Enter Nominee Mobile Number <span>*</span>
                          </label>
                        </div>

                        {errors.mobile && (
                          <p className='error-text'>{errors.mobile}</p>
                        )}
                      </div>

                      <div className='col-12 col-lg-6'>
                        <div className='floating-group'>
                          <select
                            name='gender'
                            className='floating-select'
                            value={draftNominee.gender}
                            onChange={handleChange}
                            disabled={loading}
                          >
                            <option value='' disabled hidden>
                              Select Gender
                            </option>

                            <option value='Male'>Male</option>
                            <option value='Female'>Female</option>
                            <option value='Other'>Other</option>
                          </select>

                          <label>
                            Select Gender <span>*</span>
                          </label>
                        </div>

                        {errors.gender && (
                          <p className='error-text'>{errors.gender}</p>
                        )}
                      </div>
                    </div>

                    <div className='row mt-3 g-3'>
                      <div className='col-12 col-lg-6'>
                        <div className='floating-group'>
                          <select
                            name='nomineeProofType'
                            className='floating-select'
                            value={draftNominee.nomineeProofType}
                            onChange={handleDocChange}
                            disabled={loading}
                          >
                            <option value='' disabled hidden>
                              Choose your Proof Type
                            </option>

                            <option value='Aadhaar'>Aadhaar Card</option>
                            <option value='PAN'>PAN Card</option>
                          </select>

                          <label>
                            Select Nominee Proof type <span>*</span>
                          </label>
                        </div>

                        {errors.nomineeProofType && (
                          <p className='error-text'>{errors.nomineeProofType}</p>
                        )}
                      </div>

                      {draftNominee.nomineeProofType === "Aadhaar" && (
                        <div className='col-12 col-lg-6'>
                          <div className='floating-group'>
                            <input
                              type='text'
                              name='aadhaar'
                              className='floating-input'
                              placeholder='Enter Aadhaar Number'
                              value={
                                aadhaarFocused
                                  ? draftNominee.aadhaar
                                  : maskAadhaarNumber(draftNominee.aadhaar)
                              }
                              onFocus={() => setAadhaarFocused(true)}
                              onBlur={() => setAadhaarFocused(false)}
                              onChange={handleChange}
                              inputMode='numeric'
                              autoComplete='off'
                              maxLength='12'
                              disabled={loading}
                              onPaste={(event) => event.preventDefault()}
                              onCopy={(event) => event.preventDefault()}
                              onCut={(event) => event.preventDefault()}
                            />

                            <label>
                              Enter Aadhaar Number <span>*</span>
                            </label>
                          </div>

                          {errors.aadhaar && (
                            <p className='error-text'>{errors.aadhaar}</p>
                          )}
                        </div>
                      )}

                      {draftNominee.nomineeProofType === "PAN" && (
                        <div className='col-12 col-lg-6'>
                          <div className='floating-group'>
                            <input
                              type='text'
                              name='pan'
                              className='floating-input'
                              placeholder='Enter PAN Number'
                              value={draftNominee.pan}
                              onChange={handleChange}
                              autoComplete='off'
                              maxLength='10'
                              disabled={loading}
                            />

                            <label>
                              Enter PAN Number <span>*</span>
                            </label>
                          </div>

                          {errors.pan && <p className='error-text'>{errors.pan}</p>}
                        </div>
                      )}
                    </div>

                    <div className='d-flex justify-content-between mt-4 align-items-center flex-wrap gap-2'>
                      <p className='mb-0'>Nominee Address Details</p>

                      <div className='same-address-wrapper'>
                        <input
                          type='checkbox'
                          id={`sameAddress-${draftNominee.id}`}
                          className='same-address-checkbox'
                          name='sameAddress'
                          checked={draftNominee.sameAddress}
                          onChange={handleChange}
                          disabled={loading}
                        />

                        <label
                          htmlFor={`sameAddress-${draftNominee.id}`}
                          className='same-address-label'
                        >
                          Same as my address
                        </label>
                      </div>
                    </div>

                    <div className='row mt-3'>
                      <div className='col-12 col-lg-6'>
                        <div className='floating-group'>
                          <textarea
                            name='nomineeAddress'
                            className='floating-textarea'
                            rows='4'
                            placeholder=' '
                            value={draftNominee.nomineeAddress}
                            onChange={handleChange}
                            readOnly={draftNominee.sameAddress}
                            disabled={loading}
                          />

                          <label>
                            Address Details <span>*</span>
                          </label>
                        </div>

                        {errors.nomineeAddress && (
                          <p className='error-text'>{errors.nomineeAddress}</p>
                        )}
                      </div>
                    </div>

                    <div className='mt-4'>
                      <p className='mb-0 nominee-title'>
                        Nominee Percentage Allocation{" "}
                        <span className='required'>*</span>
                      </p>

                      <p className='text-muted mb-3' style={{ fontSize: "13px" }}>
                        The sum of all Nominee&apos;s should be 100%
                      </p>

                      <div className='col-12 col-md-6 p-0'>
                        <div className='floating-group'>
                          <input
                            type='text'
                            name='nomineeAllocation'
                            className='floating-input'
                            placeholder='Enter Allocation %'
                            value={draftNominee.nomineeAllocation}
                            onChange={handleAllocationChange}
                            inputMode='numeric'
                            autoComplete='off'
                            maxLength='3'
                            readOnly={isAutoSplitApplied}
                            disabled={loading}
                          />

                          <label>
                            Nominee Allocation % <span>*</span>
                          </label>

                          <span
                            style={{
                              position: "absolute",
                              top: "50%",
                              right: "22px",
                              transform: "translateY(-50%)",
                              color: "#777",
                              pointerEvents: "none",
                            }}
                          >
                            %
                          </span>
                        </div>

                        {errors.nomineeAllocation && (
                          <p className='error-text'>{errors.nomineeAllocation}</p>
                        )}
                      </div>

                      <div className='d-flex align-items-center gap-3 flex-wrap mt-3'>
                        <p className='mb-0'>
                          Total Allocation: <strong>{totalAllocation}%</strong>
                        </p>

                        <button
                          type='button'
                          className={
                            isAutoSplitApplied
                              ? "btn btn-outline-danger"
                              : "btn btn-outline-primary"
                          }
                          onClick={
                            isAutoSplitApplied
                              ? handleRemoveAutoSplit
                              : handleAutoSplit
                          }
                          disabled={loading}
                        >
                          {isAutoSplitApplied
                            ? "Remove Auto Split"
                            : "Auto Split"}
                        </button>

                        {canAddAnotherNominee && (
                         
                          <button
                            type='button'
                            className='Add-nominee-btn'
                            onClick={handleAddAnotherNominee}
                            disabled={loading}
                          >
                            + Add Another Nominee
                          </button>
                        )}
                      </div>

                      {isAutoSplitApplied && (
                        <p className='text-success mt-2 mb-0'>
                          ✓ Auto split applied. Complete allocation is 100%.
                        </p>
                      )}

                      {allocationError && (
                        <p className='error-text mt-2'>{allocationError}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* CONTROLS AFTER ACTIVE FORM IS DELETED */}
                {!showNomineeForm && (
                  <div className='mt-4'>
                    <div className='d-flex gap-3 flex-wrap'>
                      <button
                        type='button'
                        className={
                          isAutoSplitApplied
                            ? "btn btn-outline-danger"
                            : "btn btn-outline-primary"
                        }
                        onClick={
                          isAutoSplitApplied
                            ? handleRemoveAutoSplit
                            : handleAutoSplit
                        }
                        disabled={loading}
                      >
                        {isAutoSplitApplied
                          ? "Remove Auto Split"
                          : "Auto Split"}
                      </button>

                      {savedNominees.length < MAX_NOMINEES && (
                        <button
                            type='button'
                            className='Add-nominee-btn'
                            onClick={handleAddAnotherNominee}
                            disabled={loading}
                          >
                            + Add Another Nominee
                          </button>
                      )}
                    </div>

                    {isAutoSplitApplied && (
                      <p className='text-success mt-2 mb-0'>
                        ✓ Auto split applied. Complete allocation is 100%.
                      </p>
                    )}
                  </div>
                )}

                {/* FINAL CONSENT AND SUBMIT */}
                <div className='mt-5'>
                  <p>
                    <span className='required'>*</span>I / We want the Details of my
                    / our nominee to be printed in the statement of holding,
                    provided to me / us by the AMC / DP as follows; Please tick as
                    appropriate.
                  </p>

                  <div className='d-flex align-items-center gap-4 flex-wrap'>
                    <div className='d-flex align-items-center gap-2'>
                      <input
                        type='checkbox'
                        id='nomineeName'
                        className='nominee-box'
                        checked={showNomineeNames}
                        onChange={(event) =>
                          setShowNomineeNames(event.target.checked)
                        }
                        disabled={loading}
                      />

                      <label htmlFor='nomineeName' className='mb-0'>
                        Name of Nominee(s)
                      </label>
                    </div>

                    <div className='d-flex align-items-center gap-2'>
                      <input
                        type='checkbox'
                        id='nomineeYesNo'
                        className='nominee-box'
                        checked={showNomineeYesNo}
                        onChange={(event) =>
                          setShowNomineeYesNo(event.target.checked)
                        }
                        disabled={loading}
                      />

                      <label htmlFor='nomineeYesNo' className='mb-0'>
                        Nominee : Yes/No
                      </label>
                    </div>
                  </div>

                  <p className='investor-nominee-info mt-4'>
                    Rights, Entitlement, Obligations Investor and Nominee
                  </p>

                  <div className='d-flex gap-3'>
                    <input
                      type='checkbox'
                      id='terms'
                      name='terms_accepted'
                      className='checkbox'
                      checked={rightsAccepted}
                      onChange={(event) => {
                        setRightsAccepted(event.target.checked);

                        setErrors((previous) => ({
                          ...previous,
                          rightsAccepted: "",
                          general: "",
                        }));
                      }}
                      disabled={loading}
                    />

                    <label htmlFor='terms' className='personal-details-right-obli'
>
                      I further confirm having read and understood the contents of
                      the “Rights and Obligations” document(s) and “Risk Disclosure
                      Document” MITC. I / We do hereby agree to be bound by such
                      provisions as outlined in these documents.
                    </label>
                  </div>

                  {errors.rightsAccepted && (
                    <p className='error-text mt-3'>{errors.rightsAccepted}</p>
                  )}

                  {errors.general && (
                    <p className='error-text mt-3'>{errors.general}</p>
                  )}

                 <button
                    type='submit'
                    className='nominee-submit-btn mt-4'
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Submit"}
                  </button>

                </div>
              </form>
            )}
          </div>
        </div>
      );
    };

    export default Nomination;
