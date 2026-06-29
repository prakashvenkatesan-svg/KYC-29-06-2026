import React from "react";

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { IoArrowForward } from "react-icons/io5";

import pdf from "../assets/pdf.png";
import phone from "../assets/phone.png";
import email from "../assets/email.png";
import Location from "../assets/Location.png";
import time from "../assets/time.png";
import Freezacc from "../assets/Freezacc.png";

const pdfList = [
  {
    id: 1,
    title: "Individual Application Form",
    file: "/pdfs/individual-application-form.pdf",
  },
  {
    id: 2,
    title: "Non-Individual Application Form",
    file: "/pdfs/Non-Individual-Application-form.pdf",
  },
  {
    id: 3,
    title:
      "CLIENT REGISTRATION DOCUMENTS (RIGHTS & OBLIGATIONS, RISK DISCLOSURE DOCUMENT, DO'S & DON'T'S) IN VERNACULAR LANGUAGE",
    file: "/pdfs/files/Annexure_E_CRD in_vernacular_languages.zip",
  },
  {
    id: 4,
    title: "FINANCIAL DETAILS UPDATION FORM",
    file: "/pdfs/Financial-Details-Updation-form.pdf",
  },
  {
    id: 5,
    title: "GRIEVANCES REDRESSAL PROCEDURE",
    file: "/pdfs/Grievances-Redressal-Procedure-Form.pdf  ",
  },
  {
    id: 6,
    title: "INVESTORS ATTENTION",
    file: "/pdfs/Investors-attention-Form.pdf",
  },
  {
    id: 7,
    title: "MODIFICATION FORM",
    file: "/pdfs/Modification-Form.pdf",
  },
  {
    id: 8,
    title: "NOMINATION FORM",
    file: "/pdfs/Nomination-Form.pdf",
  },
  {
    id: 9,
    title: "RIGHTS AND OBLIGATIONS OF STOCK BROKERS",
    file: "/pdfs/RIGHTS-AND-OBLIGATIONS-OF-STOCK-BROKERS-Form.pdf",
  },
  {
    id: 10,
    title: "RIGHTS AND OBLIGATIONS OF BO and DP",
    file: "/pdfs/RightsandObligations-DP-Form.pdf",
  },
  {
    id: 11,
    title:
      "INTERNET & WIRELESS TECHNOLOGY BASED TRADING FACILITY PROVIDED BY MEMBERS TO CLIENT",
    file: "/pdfs/INTERNET&WIRELESS-TECHNOLOGY-BASED-TRADING-Form.pdf",
  },
  {
    id: 12,
    title: "ADVISORY - KYC COMPLIANCE",
    file: "/pdfs/Advisory-Form.pdf",
  },
  {
    id: 13,
    title: "RESEARCH ANALYST ANNUAL COMPLIANCE REPORT FY 24-25",
    file: "/pdfs/Research-Analyst-Form.pdf",
  },
  {
    id: 14,
    title:
      "RISK DISCLOSURE DOCUMENT FOR CAPITAL MARKET AND DERIVATIVES SEGMENTS",
    file: "/pdfs/RISK-DISCLOSURE-DOCUMENT-Form.pdf",
  },
  {
    id: 15,
    title:
      "DO's AND DON'Ts FOR TRADING ON THE EXCHANGE(S) FOR INVESTORS BEFORE YOU BEGIN TO TRADE",
    file: "/pdfs/DOs-AND-DONTs-FORTRADING-Form.pdf",
  },
  {
    id: 16,
    title: "WHISTLEBLOWER POLICY - STOCK BROKER",
    file: "/pdfs/Whistleblower-Policy-Stock-Broker-web-Form.pdf",
  },
  {
    id: 17,
    title: "ACCOUNT CLOSURE FORM",
    file: "/pdfs/Account-Closure-Form.pdf",
  },
  {
    id: 18,
    title: "CLIENT CODE MODIFICATION AND ERROR CODE POLICY",
    file: "/pdfs/client-Code-Modification-Form.pdf",
  },
  {
    id: 19,
    title: "DDPI Form",
    file: "/pdfs/DDPI-Form.pdf",
  },
  {
    id: 20,
    title: "SARAL ACCOUNT OPENING FORM",
    file: "/pdfs/Saral-Account-Opening-Form.pdf",
  },
  {
    id: 21,
    title: "SURVEILLANCE POLICY DP",
    file: "/pdfs/Surveillance-Policy-DP-Form.pdf",
  },
  {
    id: 22,
    title: "SURVEILLANCE POLICY STOCK BROKER",
    file: "/pdfs/Surveillance-Policy-SB-Stock-Broker-Form.pdf",
  },
  {
    id: 23,
    title: "RISK MANAGEMENT POLICY",
    file: "/pdfs/Risk-Management-policy-Form.pdf",
  },
  {
    id: 24,
    title: "MITC - Research Analyst",
    file: "/pdfs/MITC-Research-Form.pdf",
  },
  {
    id: 25,
    title: "FREEZE AND GTT",
    file: "/pdfs/Freeze-GTT-Form.pdf",
  },
  {
    id: 26,
    title: "INTERNAL POLICY",
    file: "/pdfs/Internal-Policy-Form.pdf",
  },
  {
    id: 27,
    title: "TREATMENT OF INACTIVE ACCOUNT/DORMANT ACCOUNT POLICY",
    file: "/pdfs/Inactive-Dormant-Account-Policy-Form.pdf",
  },
  {
    id: 28,
    title: "INVESTOR AWARNESS AND ADVISIORY",
    file: "/pdfs/Non-Individual-Application-form.pdf",
  },
  {
    id: 29,
    title: "INVESTOR CHARTER - STOCK BROKER",
    file: "/pdfs/Investor-Awarness-Advisiory-Form.pdf",
  },
  {
    id: 30,
    title: "INVESTOR CHARTER - DEPOSITORY PARTICIPANT",
    file: "/pdfs/Investor-Charter-DP-Form.pdf",
  },
  {
    id: 31,
    title: "INVESTOR CHARTER - RESEARCH ANALYST",
    file: "/pdfs/Investor-Charter-Research-Analyst-Form.pdf",
  },
  {
    id: 32,
    title: "POLICY FOR EMP SCREENING AND TRAINING",
    file: "/pdfs/Policy-forEmp-Screening-Training-Form.pdf",
  },
  {
    id: 33,
    title: "PREFUNDED INSTRUMENT POLICY",
    file: "/pdfs/Prefunded-Instrument-Policy-Form.pdf",
  },
  {
    id: 34,
    title: "PREVENTION OF MONEYLAUNDERING POLICY",
    file: "/pdfs/Prevention-Moneylaundering-Policy-Form.pdf",
  },
  {
    id: 35,
    title: "SYSTEMS & PROCEDURES",
    file: "/pdfs/Systems-Procedures-Form.pdf",
  },
];

const contactData = [
  {
    tag: "1. Reach Out Client Care",
    title: "Client Care Department",
    phone: "(+91) 92402 62108",
    email: "clientcare@aionioncapital.com",
    address:
      "3rd Floor, Meerlan Towers, No. 33 Hanumantha Road, Royapettah, Chennai - 600014",
    timing: "Mon-Fri (9 AM to 6 PM, IST)",
  },
  {
    tag: "2. Reach Out Grievance Redressal Officer",
    title: "Ms Swati Keshari",
    phone: "(+91) 7305088516",
    email: "grievances@aionioncapital.com",
    address:
      "3rd Floor, Meerlan Towers, No. 33 Hanumantha Road, Royapettah, Chennai - 600014",
    timing: "Mon-Fri (9 AM to 6 PM, IST)",
  },
  {
    tag: "3. Reach Out Head of Operations",
    title: "Mr Kumar Mahlingam Iyer",
    phone: "(+91) 8925808627",
    email: "kumarmahlingam.iyer@aionioncapital.com",
    address:
      "3rd Floor, Meerlan Towers, No. 33 Hanumantha Road, Royapettah, Chennai - 600014",
    timing: "Mon-Fri (9 AM to 6 PM, IST)",
  },
  {
    tag: "4. Reach Out Director",
    title: " Mr Anish Gupta",
    phone: "(+91) 8925808630",
    email: "compliance@aionioncapital.com",
    address:
      "3rd Floor, Meerlan Towers, No. 33 Hanumantha Road, Royapettah, Chennai - 600014",
    timing: "Mon-Fri (9 AM to 6 PM, IST)",
  },
];

const bankDetails = [
  {
    id: 1,
    company: "Aionion Capital Market Services Private Limited - USCNBA",
    bank: "ICICI BANK LIMITED",
    account: "000905036661",
    ifsc: "ICIC0000009",
    branch: "Nungambakkam, Chennai",
  },
  {
    id: 2,
    company: "Aionion Capital Market Services Private Limited - USCNBA",
    bank: "AXIS BANK LIMITED",
    account: "924020068024292",
    ifsc: "UTIB0003334",
    branch: "Ashok Nagar, Chennai",
  },
  {
    id: 3,
    company: "Aionion Capital Market Services (P) Ltd. - USCNBA A/c",
    bank: "HDFC BANK LIMITED",
    account: "57500001595542",
    ifsc: "HDFC0000004",
    branch: "Anna Salai, Chennai",
  },
  {
    id: 4,
    company: "Aionion Capital Market Services Private Limited - USCNBA",
    bank: "HDFC BANK LIMITED",
    account: "50200104071302",
    ifsc: "HDFC0000004",
    branch: "Anna Salai, Chennai",
  },
];

const Investor = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.replace("#", ""));

      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [location]);

  return (
    <div>
      <div className='container' id='Investor-Support'>
        <h2 className='text-center'>Investor Support</h2>

        <div className='d-flex Investor-header'>
          <button
            type='button'
            className='investor-btn'
            onClick={() => {
              navigate("/rekycpage");
            }}
          >
            Re KYC
          </button>

          <button
            type='button'
            className='investor-btn'
            onClick={() => {
              navigate("/accountcloser");
            }}
          >
            Account Closure
          </button>

          <button type='button' className='investor-btn'>
            Back Office
          </button>
        </div>
      </div>

      <div className='Investor-form' id='application-form'>
        <div className='container'>
          <h2 className='text-center'>Links to Download Forms</h2>

          <div className='row mt-4 mb-4'>
            {pdfList.map((item) => (
              <div className='col-lg-4' key={item.id}>
                <a href={item.file} download className='investor-link'>
                  <div className='investor-card'>
                    <div className='d-flex align-items-center'>
                      <img src={pdf} alt='pdf' className='pdfimg' />
                      <p className='mb-0 ms-2'>{item.title}</p>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='container' id='complaint-procedure'>
        <h2 className='text-center'>
          Procedure for filing a complaint on designated email ID and finding
          out the status of the complaint
        </h2>

        <div className='row'>
          <div className='col-lg-4 '>
            <div className='investor-step'>
              <h5>Step 1</h5>
              <p>
                1. If you have any complaints or concerns, pleaseemail
                <span className='bold'>grievances@aionioncapital.com</span>
              </p>
              <p>
                2. Kindly provide a detailed description of the issue, including
                the date, time, persons contacted, actions taken, and any
                supporting documentation related to the matter.
              </p>
            </div>
          </div>

          <div className='col-lg-4'>
            <div className='investor-step'>
              <h5>Step 2</h5>
              <p>
                1. Upon receiving your email, you will automatically receive a
                reply with a
                <span className='bold'>
                  Ticket ID/Complaint Reference Number.
                </span>
              </p>
              <p>
                2. Our team aims to respond within
                <span className='bold'>36 hours.</span>
              </p>
              <p>
                3. Please note that the response time may vary based on the
                nature of your complaint.
              </p>
              <p>
                4. You can check the
                <span className='bold'>status of your complaint</span> at any
                time by sending an email with your Ticket ID/Complaint Reference
                Number.
              </p>
            </div>
          </div>

          <div className='col-lg-4'>
            <div className='investor-step'>
              <h5>Step 3</h5>
              <p>
                1. If you are not satisfied with the resolution, you can lodge a
                complaint with SEBI through their
                <a
                  href='https://scores.sebi.gov.in/#main-content'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  SCORES portal
                </a>
                , or with the Exchange via
                <a
                  href='https://investorhelpline.nseindia.com/NICEPLUS/'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  NSE Investor Helpline
                </a>
                or
                <a
                  href='https://bsecrs.bseindia.com/ecomplaint/frmInvestorHome.aspx'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  BSE Complaint Portal
                </a>
                .
              </p>

              <p>
                2. When submitting your complaint, please include your Service
                Ticket/Complaint Reference Number.
              </p>

              <p>
                3. You may also access the
                <a
                  href='https://smartodr.in/login'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  SMART Online Resolution of Dispute Portal
                </a>
                . For further information, you can review the
                <a
                  href='https://www.sebi.gov.in/legal/circulars/aug-2023/online-dispute-resolution-in-the-indian-securities-market_75345.html'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  SEBI ODR Circular
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='investor-sebi' id='sebi-score'>
        <div className='container'>
          <h2 className='text-center'>
            Procedure for filing a complaint on SEBI SCORES
          </h2>

          <div className='row'>
            <div className='col-lg-6'>
              <div className='SEBI-card'>
                <h3>Easy & Quick</h3>
                <p>
                  Register on SEBI SCORES 2.0
                  <a
                    href='https://scores.sebi.gov.in/#main-content'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    link
                  </a>
                </p>

                <p>
                  <strong>
                    Mandatory details for filing complaints on SCORES :
                  </strong>
                  Name, PAN, Address, Mobile Number, E-mail ID.
                </p>
                <p>
                  <strong>Benefits :</strong> Effective Communication, Speedy
                  redressal of the grievances. Click on the provided link
                  <a
                    href='https://smartodr.in/login/'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    link
                  </a>
                  to learn about the process for submitting a complaint on the
                  ODR platform for resolving investor grievances.
                </p>
              </div>
            </div>

            <div className='col-lg-6'>
              <div className='SEBI-card'>
                <h3>Investor Complaint Data </h3>
                <div className='d-flex'>
                  <p>
                    <strong>Stock Broker -</strong>
                  </p>
                  <p>
                    <a href='/pdfs/monthly-compliance-dec-2025.pdf' download>
                      Monthly Compliance December 2025
                    </a>
                  </p>
                </div>

                <div className='d-flex'>
                  <p>
                    <strong>Depository -</strong>
                  </p>
                  <p>
                    <a href='/pdfs/monthly-compliance-dec-2025.pdf' download>
                      Monthly Compliance December 2025
                    </a>
                  </p>
                </div>

                <div className='d-flex'>
                  <p>
                    <strong>Research Analyst -</strong>
                  </p>
                  <p>
                    <a href='/pdfs/monthly-compliance-dec-2025.pdf' download>
                      Monthly Compliance December 2025
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='' id='escalation-matrix'>
        <div className='container'>
          <h2 className='text-center'>Escalation Matrix</h2>
          <h3 className='text-center'>Details of Contact Persons</h3>

          <div className='row contact-row'>
            {contactData.map((item, index) => (
              <div className='col-lg-6 mb-4' key={index}>
                <div className='contact-card-detail'>
                  <div>
                    <h4 className='contact-card-detail-content'>{item.tag}</h4>
                  </div>
                  <div className='contact-person'>
                    <h3>{item.title}</h3>

                    <div className='d-flex Contact-card-content'>
                      <img src={phone} alt='phone' className='contactimg' />
                      <p>{item.phone}</p>
                    </div>

                    <div className='d-flex Contact-card-content'>
                      <img src={email} alt='email' className='contactimg' />
                      <p>{item.email}</p>
                    </div>

                    <div className='d-flex Contact-card-content'>
                      <img
                        src={Location}
                        alt='location'
                        className='contactimg'
                      />
                      <p>{item.address}</p>
                    </div>

                    <div className='d-flex Contact-card-content'>
                      <img src={time} alt='time' className='contactimg' />
                      <p>{item.timing}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='investor-account' id='bank-details'>
        <div className='container'>
          <h2 className='text-center'>Equity Account Details</h2>
          <h3 className="bank-detail-title">
            Kindly ensure you strictly follow the instructions provided on the
            Trade app and website before proceeding with your fund transfer.
          </h3>
          <p className="bank-detail-text">
            Investors are requested to note that Stock broker,
            <span className='bold'>
              Aionion Capital Market Services Private Limited,
            </span>
            is permitted to receive/pay money from/to investor through
            designated banks accounts only named as
            <span className='bold'>client bank accounts.</span>
            Stock broker, Aionion Capital Market Services Private Limited, is
            also required to disclose these client bank accounts to the Stock
            Exchange. Hence, you are requested to use following client bank
            accounts only for the purpose of dealings in your trading account
            with us. The details of these client bank accounts are also
            displayed by <strong>Stock Exchanges</strong> on their website under
            <span className='bold'>“Bank Details”.</span>
          </p>

          <div className='bank-section'>
            <div className='container'>
              <div className='row'>
                {bankDetails.map((item) => (
                  <div className='col-lg-3 col-md-6 bank-col' key={item.id}>
                    <div className='bank-card'>
                      <p>
                        <strong>Company Name :</strong> {item.company}
                      </p>
                      <p>
                        <strong>Bank Name :</strong> {item.bank}
                      </p>
                      <p>
                        <strong>Account No :</strong> {item.account}
                      </p>
                      <p>
                        <strong>IFSC Code :</strong> {item.ifsc}
                      </p>
                      <p>
                        <strong>Branch :</strong> {item.branch}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='container'>
        <h2 className='text-center'>Bond details</h2>
        <div className='Investor-Bond-card'>
          <h5>Important Information on Bond Payments</h5>
          <p>
            All bond payments must be made only to the two accounts mentioned
            below, based on the payment amount. Please proceed with the payment
            only after receiving confirmation from your Relationship Manager.
          </p>
          <p>
            Note: Payments made to any account other than the designated ones
            will not be accepted.
          </p>

          <p className='more-table-content'>Below 2 Lakhs</p>
          <table className='responsive-table'>
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Beneficery name</th>
                <th>IFSC Code</th>
                <th>Branch Name</th>
                <th>Mode of Transfer</th>
                <th>ICCL LEI Number</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td data-label='Account Number'>57500001086245</td>
                <td data-label='Beneficery name'>
                  Indian Clearing Corporation Limited
                </td>
                <td data-label='IFSC Code'>HDFC0000060</td>
                <td data-label='Branch Name'>HDFC Bank Ltd, Fort Branch</td>
                <td data-label='Mode of Transfer'>NEFT Only</td>
                <td data-label="ICCL LEI Number">-</td>
              </tr>
            </tbody>
          </table>

          <p className='more-table-content pt-4'>2 Lakhs and Above</p>
          <table className='responsive-table'>
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Beneficery name</th>
                <th>IFSC Code</th>
                <th>Branch Name</th>
                <th>Mode of Transfer</th>
                <th>ICCL LEI Number</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td data-label='Account Number'>8715962</td>
                <td data-label='Beneficery name'>
                  Indian Clearing Corporation Limited
                </td>
                <td data-label='IFSC Code'>ICLL0000001</td>
                <td data-label='Branch Name'>RBI Fort</td>
                <td data-label='Mode of Transfer'>RTGS Only</td>
                <td data-label="ICCL LEI Number">335800EV4FPEFRWNVX08</td>
              </tr>
              
            </tbody>
          </table>
        </div>
      </div>

      <div className='container'>
        <div className='Freeze-card'>
          <h2 className='text-center'>
            Process and Modes to Freeze/Unfreeze the Account
          </h2>

          <div className='row mt-5 mb-5'>
            <div className='col-lg-6 align-self-center'>
              <p>
                Clients can easily request to freeze or unfreeze their account
                through the <strong>Aionion Capital app.</strong>
              </p>
              <p>To do so, simply go to :</p>
              <strong>
                Account
                <IoArrowForward
                  style={{ marginLeft: "3px", color: "#000000" }}
                />
                Settings
                <IoArrowForward
                  style={{ marginLeft: "3px", color: "#000000" }}
                />
                Freeze Account
              </strong>
              <p>
                From this section, you can choose to freeze your account
                temporarily or unfreeze it whenever needed.
              </p>
            </div>

            <div className='col-lg-6'>
              <img src={Freezacc} alt='Freeaccount' className='Freezaccimg' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Investor;
