import { useNavigate, useLocation } from "react-router-dom";

import openacctoday from "../assets/openacctoday.png";
import chooseaionion from "../assets/chooseaionion.png";

import zero from "../assets/zero.png";
import fast from "../assets/fast.png";
import secure from "../assets/secure.png";
import access from "../assets/access.png";
import expert from "../assets/expert.png";

import opendemart from "../assets/opendemart.png";
import stepsmobileview from "../assets/stepsmobileview.png";

import kycstep from "../assets/kycstep.png";
import kycstepsmobileview from "../assets/kycstepsmobileview.png";

const Openaccount = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className='openaccount-header'>
        <div className='container'>
          <div className='row'>
            <div className='col-lg-6'>
              <img
                src={openacctoday}
                alt='openaccount'
                className='openaccountimg'
              />
            </div>
            <div className='col-lg-6 openaccount'>
              <h4>GET STARTED WITH</h4>
              <h3>Demat account</h3>
              <p>
                Our platform offers a robust suite of investor-focused features,
                helping you make data-driven decisions effortlessly.
              </p>
              <button
                type='button'
                className='openaccountbtn'
                onClick={() => {
                  navigate("/numberregistration");
                }}
              >
                Open your Account Today
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className='text-center'>Why you Choose Aionion</h2>
        <div className='choose-Aionion container'>
          <div className='row'>
            <div className='col-lg-6 d-flex align-items-center choose-Aionion-left'>
              <ul className='choose-list'>
                <li>
                  <img src={zero} alt='zero' className='chooseimg' />
                  <span>Zero Maintenance Charges</span>
                </li>

                <li>
                  <img src={fast} alt='fast' className='chooseimg' />
                  <span>Fast and Paperless</span>
                </li>

                <li>
                  <img src={secure} alt='secure' className='chooseimg' />
                  <span>Secure & Reliable</span>
                </li>

                <li>
                  <img src={access} alt='access' className='chooseimg' />
                  <span>Access to Multiple Investment Options</span>
                </li>

                <li>
                  <img src={expert} alt='expert' className='chooseimg' />
                  <span>Expert Research & Recommendations</span>
                </li>
              </ul>
            </div>

            <div className='col-lg-6 choose-Aionion-right'>
              <img
                src={chooseaionion}
                alt='chooseaionion'
                className='aionionimg'
              />
            </div>
          </div>
        </div>
      </div>

      <div className='container'>
        <h2 className='text-center opendemartacc'>
          How to Open a Demat and Trading Account
        </h2>
        <img src={opendemart} alt='opendemart' className='opendemartimg' />
        <div className='d-flex justify-content-between opendemart mb-5'>
          <p className='opendemart'>
            Download the <strong>AIONION app</strong> or visit the AIONION
            website
          </p>
          <p className='opendemart'>
            Enter your <strong>Mobile Number</strong> and verify with an OTP
          </p>
          <p className='opendemart'>
            Verify <strong>KYC</strong> and bank details
          </p>
          <p className='opendemart'>
            <strong>eSign</strong> your form and documents
          </p>
        </div>
      </div>

      <div className='KYC-step'>
        <div className='container pb-3'>
          <h2 className='text-center'>KYC Steps & Approval Time</h2>
          <div className='kyc-card'>
            <img src={kycstep} alt='kycstep' className='kycstepimg' />
            {/* <div className='d-flex justify-content-between'>
              <p className='steps'>Contact Details</p>
              <p className='steps'>Demat Details</p>
              <p className='steps'>Personal Details</p>
              <p className='steps'>Bank Details</p>
              <p className='steps'>Application Details</p>
              <p className='steps'>E-Sign Details</p>
              <p className='steps'>KYC Complete</p>
            </div> */}
            <div className='approval'>
              <h3 className='pt-3'>Approval Time :</h3>
              <p>
                Your account with Aionion Capital Market Services Private
                Limited (ACMSPL) will typically be activated within
                <strong>72 hours</strong>—provided your KYC is verified and all
                submitted documents are in order.
              </p>
              <p>
                If you're opening an <strong>ACMSPL</strong> account for the
                first time or updating your KYC details during the process, the
                information needs to be verified by the <strong>KYC</strong>
                Registration Agency (KRA) in line with
                <span>SEBI guidelines.</span> This verification by the KRA can
                take up to 72 hours, which may slightly delay the account
                activation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Openaccount;
