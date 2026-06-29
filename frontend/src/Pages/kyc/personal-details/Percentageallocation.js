import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import KycStepper from "../../../Components/kyc/KycStepper";

import Personicon from "../../../assets/Personicon.png";
import editicon from "../../../assets/editicon.png";
import deleteicon from "../../../assets/deleteicon.png";
import addicon from "../../../assets/addicon.png";
import api from "../../../services/api";

const Percentageallocation = () => {
  const navigate = useNavigate();

  const [applicationId, setApplicationId] = useState("");
  const [nominees, setNominees] = useState([]);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [showNomineeNames, setShowNomineeNames] = useState(false);
  const [showNomineeYesNo, setShowNomineeYesNo] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedApplicationId = localStorage.getItem("application_id");

    if (!savedApplicationId) {
      navigate("/numberregistration");
      return;
    }

    setApplicationId(savedApplicationId);
    fetchNominees(savedApplicationId);
  }, [navigate]);

  const fetchNominees = async (id) => {
    try {
      const response = await api.get(`/nominees/${id}`);
      if (response.data?.success) {
        setNominees(response.data.data || []);
      }
    } catch (error) {
      console.log("GET NOMINEES ERROR:", error.response?.data || error.message);
    }
  };

  const handleAllocationChange = (nomineeId, value) => {
    const updatedValue = value.replace(/\D/g, "").slice(0, 3);

    setNominees((prev) =>
      prev.map((item) =>
        item.id === nomineeId
          ? { ...item, allocation_percentage: updatedValue }
          : item,
      ),
    );

    setErrors((prev) => ({
      ...prev,
      [nomineeId]: "",
    }));

    setGeneralError("");
  };

  const handleDelete = async (nomineeId) => {
    try {
      await api.delete(`/nominees/${nomineeId}`);
      fetchNominees(applicationId);
    } catch (error) {
      console.log(
        "DELETE NOMINEE ERROR:",
        error.response?.data || error.message,
      );
    }
  };

  const validateAllocation = () => {
    const newErrors = {};
    let total = 0;

    if (nominees.length === 0) {
      setGeneralError("Please add at least one nominee");
      return false;
    }

    nominees.forEach((item) => {
      const value = Number(item.allocation_percentage || 0);

      if (!item.allocation_percentage && item.allocation_percentage !== 0) {
        newErrors[item.id] = "Allocation is required";
      } else if (value <= 0 || value > 100) {
        newErrors[item.id] = "Enter valid percentage";
      }

      total += value;
    });

    if (total !== 100) {
      setGeneralError("Total allocation percentage must be exactly 100");
    } else {
      setGeneralError("");
    }

    if (!rightsAccepted) {
      setGeneralError("Please accept rights and obligations");
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0 && total === 100 && rightsAccepted
    );
  };

  const handleSubmit = async () => {
    if (!validateAllocation()) return;

    try {
      setLoading(true);

      const payload = {
        application_id: Number(applicationId),
        allocations: nominees.map((item) => ({
          nominee_id: item.id,
          allocation_percentage: Number(item.allocation_percentage),
        })),
      };

      const response = await api.post("/nominees/allocation", payload);

      if (response.data?.success) {
        navigate("/photoverify");
      } else {
        setGeneralError(response.data?.message || "Failed to save allocation");
      }
    } catch (error) {
      console.log(
        "SAVE ALLOCATION ERROR:",
        error.response?.data || error.message,
      );
      setGeneralError(
        error.response?.data?.message || "Failed to save allocation",
      );
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
        <h3>Added Nominee Details *</h3>
        <p>You can add max 3 nominee details</p>

        {nominees.map((item) => (
          <div className='Percentage-card mb-3' key={item.id}>
            <div className='d-flex justify-content-between'>
              <div className='d-flex align-items-center gap-3'>
                <img
                  src={Personicon}
                  alt='Person-icon'
                  className='person-icon'
                />
                <div>
                  <p>{item.nominee_name}</p>
                  <p>{item.mobile}</p>
                  <p>{item.email}</p>
                  {/* {showNomineeNames && <p>{item.nominee_name}</p>} */}
                  {showNomineeYesNo && <p>Nominee: Yes</p>}
                </div>
              </div>

              <div className='d-flex flex-column justify-content-between align-items-end gap-2'>
                <div className='d-flex gap-3'>
                  <img
                    src={editicon}
                    alt='Edit'
                    className='Icons'
                    onClick={() => navigate("/nomination")}
                    style={{ cursor: "pointer" }}
                  />
                  <img
                    src={deleteicon}
                    alt='deleteicon'
                    className='Icons'
                    style={{ cursor: "pointer" }}
                    onClick={() => handleDelete(item.id)}
                  />
                </div>

                <div style={{ minWidth: "150px" }}>
                  <input
                    type='text'
                    className='floating-input'
                    placeholder='Allocation %'
                    value={item.allocation_percentage || ""}
                    onChange={(e) =>
                      handleAllocationChange(item.id, e.target.value)
                    }
                  />
                  {errors[item.id] && (
                    <p className='error-text'>{errors[item.id]}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {nominees.length < 3 && (
          <div className='d-flex gap-3'>
            <img src={addicon} alt='addicon' className='add-icons' />
            <button
              className='add-nominee mb-3'
              onClick={() => navigate("/nomination")}
              type='button'
            >
              Add another Nominee
            </button>
          </div>
        )}

        <p>
          <span className='required'>*</span>I / We want the Details of my / our
          nominee to be printed in the statement of holding, provided to me / us
          by the AMC / DP as follows ; (Please tick, as Appropriate)
        </p>

        <div className='d-flex align-items-center gap-4'>
          <div className='d-flex align-items-center gap-2'>
            <input
              type='checkbox'
              id='nomineeName'
              className='nominee-box'
              checked={showNomineeNames}
              onChange={(e) => setShowNomineeNames(e.target.checked)}
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
              onChange={(e) => setShowNomineeYesNo(e.target.checked)}
            />
            <label htmlFor='nomineeYesNo' className='mb-0'>
              Nominee : Yes/No
            </label>
          </div>
        </div>

        <p className='investor-nominee-info'>
          Rights, Entitlement, Obligations Investor and Nominee
        </p>

        <div className='d-flex gap-3'>
          <input
            type='checkbox'
            id='terms'
            name='terms_accepted'
            className='checkbox'
            checked={rightsAccepted}
            onChange={(e) => setRightsAccepted(e.target.checked)}
          />
          <label htmlFor='terms'>
            I further confirm having read and understood the contents of the
            “Rights and Obligations” document(s) and “Risk Disclosure Document”
            MITC. I We do hereby agree to be bound by such provisions as
            outlined in these documents.
          </label>
        </div>

        {generalError && <p className='error-text mt-3'>{generalError}</p>}

        <button
          type='button'
          className='mt-4'
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Saving..." : "Submit"}
        </button>
      </div>
    </div>
  );
};

export default Percentageallocation;
