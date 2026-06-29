import React from "react";

import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";

const More = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("Awareness and Advisory");

  const { section } = useParams();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const section = queryParams.get("section");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (section) {
      setActiveSection(section);
    }
  }, [location]);

  return (
    <div className='container'>
      <h2 className='text-center More-heading'>More</h2>
      <div className='More-header'>
        <div>
          <button
            type='button'
            className={`more-btn ${
              activeSection === "Awareness and Advisory" ? "active" : ""
            }`}
            onClick={() => setActiveSection("Awareness and Advisory")}
          >
            Investor Awareness and Advisory
          </button>
        </div>

        <div>
          <button
            type='button'
            className={`more-btn ${activeSection === "Disclaimers" ? "active" : ""}`}
            onClick={() => setActiveSection("Disclaimers")}
          >
            Disclaimers
          </button>
        </div>

        <div>
          <button
            type='button'
            className={`more-btn ${activeSection === "Refund" ? "active" : ""}`}
            onClick={() => setActiveSection("Refund")}
          >
            Refund Cancellation
          </button>
        </div>

        <div>
          <button
            type='button'
            className={`more-btn ${activeSection === "Terms" ? "active" : ""}`}
            onClick={() => setActiveSection("Terms")}
          >
            Terms and conditions
          </button>
        </div>

        <div>
          <button
            type='button'
            className={`more-btn ${activeSection === "bond" ? "active" : ""}`}
            onClick={() => setActiveSection("bond")}
          >
            Bond details
          </button>
        </div>
      </div>

      <div className='More-card'>
        {activeSection === "Awareness and Advisory" && (
          <>
            <h3>Investor Awareness and Advisory</h3>
            <p>
              Beware of fixed/guaranteed/regular returns/ capital protection
              schemes. Brokers or their authorized persons or any of their
              associates are not authorized to offer fixed/guaranteed/regular
              returns/ capital protection on your investment or authorized to
              enter into any loan agreement with you to pay interest on the
              funds offered by you.
            </p>
            <p>
              Please note that in case of default of a member claim for funds or
              securities given to the broker under any arrangement/ agreement of
              indicative return will not be accepted by the relevant Committee
              of the Exchange as per the approved norms. Do not keep funds idle
              with the Stock Broker. Please note that your stock broker has to
              return the credit balance lying with them, within three working
              days in case you have not done any transaction within last 30
              calendar days.
            </p>
            <p>
              Please note that in case of default of a Member, claim for funds
              and securities, without any transaction on theexchange will not be
              accepted by the relevant Committee of the Exchange as per the
              approved norms. Check the frequency of accounts settlement opted
              for. If you have opted for running account, please ensure that
              your broker settles your account and, in any case, not later than
              once in 90 days (or 30 days if you have opted for 30 days
              settlement). In case of declaration of trading member as
              defaulter, the claims of clients against such defaulter member
              would be subject to norms for eligibility of claims for
              compensation from IPF to the clients of the defaulter member.
              These norms are available on Exchange website at
            </p>
            <p>following link:</p>
           <p className="more-link-item">
  <a
    href="https://www.nseindia.com/invest/about-defaulter-section"
    target="_blank"
    rel="noopener noreferrer"
    className="more-text"
  >
    www.nseindia.com/invest/about-defaulter-section
  </a>
</p>

<p className="more-link-item">
  <a
    href="https://www.bseindia.com/static/investors/Claim%20Against%20Defaulter"
    target="_blank"
    rel="noopener noreferrer"
    className="more-text"
  >
    www.bseindia.com/static/investors/Claim Against Defaulter
  </a>
</p>
            <p>
              Brokers are not permitted to accept transfer of securities as
              margin. Securitiesoffered as margin/ collateral MUST remain in the
              account of the client and can be pledged to the broker only by way
              of 'margin pledge', created in the Depository system. Clients are
              not permitted to place any securities with the broker or associate
              of the broker or authorized person of the broker for any reason.
              Broker can take securities belonging to clients only for
              settlement of securities sold by the client.
            </p>
            <p>
              Always keep your contact details viz. Mobile number/Email ID
              updated with the stock broker. Email and mobile number is
              mandatory and you must provide the same to your broker for
              updation in Exchange records. You must immediately take up the
              matter with Stock Broker/Exchange if you are not receiving the
              messages from Exchange/Depositories regularly. Don't ignore any
              emails/SMSs received from the Exchange for trades done by you.
              Verify the same with the Contract notes/Statement of accounts
              received from your broker and report discrepancy, if any, to your
              broker in writing immediately and if the Stock Broker does not
              respond, please take this up with the Exchange/Depositories
              forthwith.
            </p>
            <p>
              Check messages sent by Exchanges on a weekly basis regarding funds
              and securities balances reported by the trading member, compare it
              with the weekly statement of account sent by broker and
              immediately raise a concern to the exchange if you notice a
              discrepancy. Please do not transfer funds, for the purposes of
              trading to anyone, including an authorized person or an associate
              of the broker, other than a SEBI registered entity.
            </p>
          </>
        )}
        {activeSection === "Disclaimers" && (
          <>
            <h3>Disclaimer</h3>
            <p>
              There are risks associated with investing in securities. Investing
              in stocks, bonds, exchange traded funds, mutual funds, and money
              market funds involve risk of loss. Loss of principal is possible.
              Some high risk investments may use leverage, which will accentuate
              gains and losses. Foreign investing involves special risks,
              including a greater volatility and political, economic and
              currency risks and differences in accounting methods. A security’s
              or a firm’s past investment is not a guarantee or predictor of
              future investment performance.
            </p>
            <p>
              Insurance is a subject matter of solicitation. The information
              provided here cannot substitute for the advice of a licensed
              professional. The information and data provided here is of a
              general nature and strictly for informational purposes.
            </p>
            <p>
              This email and any files transmitted with it are confidential and
              intended solely for the use of the individual or entity to whom
              they are addressed. If you have received this email in error
              please notify the system manager. This message contains
              confidential information and is intended only for the individual
              named. If you are not the named addressee you should not
              disseminate, distribute or copy this email. Please notify the
              sender immediately by email if you have received this email by
              mistake and delete this email from your system. If you are not the
              intended recipient you are notified that disclosing, copying,
              distributing or taking any action in reliance on the contents of
              this information is strictly prohibited.
            </p>
          </>
        )}
        {activeSection === "Refund" && (
          <>
            <h3>Refund Cancellation</h3>
            <h4>REFUND & CANCELLATION POLICY</h4>
            <h4>1.Non-Refundable Charges</h4>
            <p>
              There are risks associated with investing in securities. Investing
              in stocks, bonds, exchange traded funds, mutual funds, and money
              market funds involve risk of loss. Loss of principal is possible.
              Some high risk investments may use leverage, which will accentuate
              gains and losses. Foreign investing involves special risks,
              including a greater volatility and political, economic and
              currency risks and differences in accounting methods. A security's
              or a firm's past investment is not a guarantee or predictor of
              future investment performance.
            </p>
            <p>
              The collection of documents required for the account opening
              process is subject to the availability of representatives at the
              specific time and location agreed upon.
            </p>
            <h4>2.Duplicate Payments</h4>
            <p>
              If payments related to account opening have been made multiple
              times in error, clients are advised to write to
              clientcare@aionioncapital.com. Upon verification, Aionion Capital
              will initiate the necessary process to refund the excess amount.
            </p>
            <h4>3.Refund Processing</h4>
            <p>
              Any refund process, where applicable, is subject to the procedures
              and timelines of third-party entities, such as banks and payment
              gateways, involved in the transaction. Completion of the refund
              process depends on these external agencies.
            </p>
            <p>
              Note: While Aionion Capital will make every effort to process
              refunds promptly, delays caused by banks, payment gateways, or
              other third-party agencies are beyond our control.
            </p>
          </>
        )}
        {activeSection === "Terms" && (
          <>
            <h3>Terms and Conditions</h3>
            <p>
              Before using the online trading services, the Client must complete
              the registration process as specified and follow the instructions
              provided on the website to register as a client with Aionion
              Capital Market Services Private Limited ("Aionion Capital").
            </p>
            <p>
              The Client acknowledges that all investment and disinvestment
              decisions are based solely on their own assessment of financial
              circumstances and investment goals. Aionion Capital, along with
              its officers, employees, agents, subsidiaries, affiliates, or
              business associates, shall not be held liable for any trading
              losses, costs, or damages incurred due to reliance on any
              information, research, opinions, or advice provided through its
              website, platform, brochures, or other materials. Clients are
              strongly advised to seek independent professional advice to
              determine the suitability of their investment decisions.
            </p>
            <p>
              Furthermore, the Client agrees not to hold Aionion Capital or its
              affiliates responsible for any losses or damages arising from
              reliance on information, opinions, or materials disseminated
              through its platform or promotional communications.
            </p>
          </>
        )}
        {activeSection === "bond" && (
          <>
            <h3>Bond details</h3>
            <h5>Important Information on Bond Payments</h5>
            <p>
              All bond payments must be made only to the two accounts mentioned
              below, based on the payment amount. Please proceed with the
              payment only after receiving confirmation from your Relationship
              Manager.
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
                 <td data-label='ICCL LEI Number'>-</td>

                </tr>
              </tbody>
            </table>

            <p className='more-table-content'>2 Lakhs and Above</p>
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
                 <td data-label='ICCL LEI Number'>335800EV4FPEFRWNVX08</td>

                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default More;
