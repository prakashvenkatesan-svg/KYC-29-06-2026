import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";

import KycStepper from "../../../Components/kyc/KycStepper";

const Nonomination = () => {
  const radioErrorRef = useRef(null);
  const checkboxErrorRef = useRef(null);
  const navigate = useNavigate();

  const clearRadioError = () => {
    radioErrorRef.current.innerText = "";
  };

  const clearCheckboxError = () => {
    checkboxErrorRef.current.innerText = "";
  };

  const handleNomineeChange = (e) => {
    const value = e.target.value;

    if (value === "Yes") {
      navigate("/nomination");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const form = e.currentTarget;

    const selectedRadio = form.querySelector('input[name="document"]:checked');

    const termsCheckbox = form.querySelector("#terms");

    let isValid = true;

    if (!selectedRadio) {
      radioErrorRef.current.innerText = "Please select Yes or No";
      isValid = false;
    } else {
      radioErrorRef.current.innerText = "";
    }

    if (!termsCheckbox.checked) {
      checkboxErrorRef.current.innerText =
        "Please accept the terms and conditions";
      isValid = false;
    } else {
      checkboxErrorRef.current.innerText = "";
    }

    if (!isValid) return;
  };

  return (
    <div className='container'>
      <KycStepper
        currentStep='personal'
        completedSteps={["contact", "identify"]}
      />

      <form className='Nonomination-card' onSubmit={handleSubmit}>
        <div className='d-flex align-items-center gap-3 mb-4 nominee-heading'>
          <p className='mb-0 nominee-title'>
            Add Nominee Details <span className='required'>*</span>
          </p>

          <div className='d-flex nomination-btn gap-3 align-items-center'>
            <div className='d-flex align-items-center'>
              <input
                type='radio'
                id='yes'
                name='nominee'
                value='Yes'
                onChange={handleNomineeChange}
              />

              <label htmlFor='yes' className='ms-1 mb-0'>
                Yes
              </label>
            </div>

            <div className='d-flex align-items-center'>
              <input
                type='radio'
                id='no'
                name='nominee'
                value='No'
                className='radio-btn'
                defaultChecked
                onChange={clearRadioError}
              />

              <label htmlFor='no' className='ms-1 mb-0'>
                No
              </label>
            </div>
          </div>
        </div>

        <p ref={radioErrorRef} className='text-danger'></p>

        <div className='d-flex gap-2'>
          <input
            type='checkbox'
            id='terms'
            className='Nonominee-checkbox'
            onChange={clearCheckboxError}
          />

          <p>
            <span className='required'>*</span> I/We hereby confirm that I/We do
            not wish to appoint any nominee(s) in my demat/trading account and
            understand the issues involved in non-appointment of nominee(s) and
            further are aware that in case of death of all the account
            holder(s), my/our legal heirs would need to submit all the requisite
            documents/information for claiming of assets held in my/our
            demat/trading account.
          </p>
        </div>

        <p ref={checkboxErrorRef} className='text-danger'></p>

        <button
          type='submit'
          className='btn btn-primary'
          onClick={() => navigate("/schemedetail")}
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default Nonomination;
