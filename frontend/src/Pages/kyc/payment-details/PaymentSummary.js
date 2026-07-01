import React from "react";
import api from "../../../services/api";

import paymentImg from "../../../assets/paymentimg.png";

import KycStepper from "../../../Components/kyc/KycStepper";

const PaymentSummary = () => {
  const ddpi = localStorage.getItem("ddpi");
  const savedSchemeSelections = JSON.parse(
    localStorage.getItem("scheme_selections") || "{}",
  );

  const accountOpeningCharges = savedSchemeSelections.annualCare ? 1249 : 2499;
  const taxAmount = (accountOpeningCharges * 18) / 100;
  // const ddpiAmount = ddpi === "Yes" ? 150 : 0;

  const total = accountOpeningCharges + taxAmount;

  // PAYMENT
  const handlePayment = async () => {
    try {
      // TRANSACTION ID
      const txnid = "TXN" + Date.now();

      const applicationId = localStorage.getItem("application_id") || "1";
      const userEmail = localStorage.getItem("email") || "test@gmail.com";
      const userPhone = localStorage.getItem("mobile_number") || "9999999999";
      const userName = userEmail.split("@")[0] || "Client";

      // BACKEND API
      const response = await api.post(
        "/payment/generate-hash",
        {
          application_id: Number(applicationId),
          txnid,
          amount: total.toFixed(2),
          firstname: userName,
          email: userEmail,
          phone: userPhone,
          productinfo: "Trading and Demat Account Opening",
        },
      );

      const data = response.data;

      // CREATE FORM
    
      const form = document.createElement("form");

      form.method = "POST";

      // PAYU TEST URL
      form.action = "https://test.payu.in/_payment";

      // PAYU FIELDS
      const fields = {
        key: data.key,
        txnid: data.txnid,
        amount: data.amount,
        productinfo: data.productinfo,
        firstname: data.firstname,
        email: data.email,
        phone: data.phone,
        surl: data.surl,
        furl: data.furl,
        hash: data.hash,
        service_provider: data.service_provider,
      };

      // APPEND INPUTS
      Object.keys(fields).forEach((key) => {
        const input = document.createElement("input");

        input.type = "hidden";

        input.name = key;

        input.value = fields[key];

        form.appendChild(input);
      });

      // APPEND FORM
      document.body.appendChild(form);

      // SUBMIT
      form.submit();
    } catch (error) {
      console.log("PAYMENT ERROR:", error.response?.data || error.message);
    }
  };

  return (
    <div className='container'>
      <KycStepper
        currentStep='complete'
        completedSteps={["contact", "identify", "personal", "scheme"]}
      />

      <div className='row'>
        {/* LEFT IMAGE */}
        <div className='col-lg-6'>
          <img src={paymentImg} alt='payment' className='paymentimg' />
        </div>

        {/* RIGHT PAYMENT SUMMARY */}
        <div className='col-lg-6'>
          <div className='payment-summary-box'>
            <h3 className='payment-title text-center'>Payment Summary</h3>

            {/* HEADER */}
            <div className='payment-header d-flex justify-content-between fw-bold mt-4'>
              <span>Description</span>

              <span>Amount (Rs.)</span>
            </div>

            {/* ACCOUNT OPENING */}
            <div className='payment-row d-flex justify-content-between mt-3'>
              <span>Account Opening Charges</span>

              <span>{accountOpeningCharges.toFixed(2)}</span>
            </div>

            {/* TAX */}
            <div className='payment-row d-flex justify-content-between mt-3'>
              <span>18% Tax on Account Opening Charges</span>

              <span>{taxAmount.toFixed(2)}</span>
            </div>

            {/* DDPI */}
            {/* {ddpi === "Yes" && (
              <div className='payment-row d-flex justify-content-between mt-3'>
                <span>DDPI</span>

                <span>{ddpiAmount.toFixed(2)}</span>
              </div>
            )} */}

            <hr />

            {/* TOTAL */}
            <div className='payment-total d-flex justify-content-between fw-bold'>
              <span>Total</span>

              <span>{total.toFixed(2)}</span>
            </div>
           <hr/>
            {/* BUTTON */}

           <button
              type='button'
              className='payment-proceed-btn '
              onClick={handlePayment}
            >
              Proceed to Pay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummary;
