import React, { useState } from "react";

import privacypolicy from "../assets/privacypolicy.png";

const Privacy = () => {
  const [activeSection, setActiveSection] = useState("intro");

  return (
    <div className='container'>
      <h2 className='text-center privacy-heading'>Privacy Policy</h2>

      <div className='row'>
        <div className='col-12 col-sm-12 col-md-12 col-lg-6'>
          <img
            src={privacypolicy}
            alt='privacypolicy'
            className='privacypolicyimg'
          />
        </div>

        <div className='col-12 col-sm-12 col-md-12 col-lg-6 align-self-center'>
          <p>
            Website : <span className='fw-bold'>www.aionioncapital.com</span>{" "}
            (http://www.aionioncapital.com) (hereinafter referred to as the
            “Website”) is owned and operated by Aionion Capital Market Services
            Private Limited, a company incorporated under the Companies{" "}
            <span className='fw-bold'>Act, 2013</span>, with its registered
            office located at 3rd Floor, Meerlan Towers, No.33, Hanumantha Road,
            Royapettah, Chennai - 600014 (hereinafter referred to as "Aionion
            Capital")
          </p>
          <p>
            For the purposes of this Privacy Policy, wherever the context
            requires, the term “You” or “User” refers to any natural or legal
            person, including online and offline clients, and the terms “We,”
            “Us,” or “Our” refer to Aionion Capital.
          </p>
        </div>
      </div>

      <div className='row privacy-card'>
        {/* LEFT SIDE BUTTONS */}
        <div className='col-lg-4'>
          <div className='list-group '>
            <button
              type='button'
              className={`Privacy-btn ${activeSection === "intro" ? "active" : ""}`}
              onClick={() => setActiveSection("intro")}
            >
              1. Introduction
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "importance" ? "active" : ""}`}
              onClick={() => setActiveSection("importance")}
            >
              2. Importance of Your Information
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "collection" ? "active" : ""}`}
              onClick={() => setActiveSection("collection")}
            >
              3. Collection of Personal Data
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "purpose" ? "active" : ""}`}
              onClick={() => setActiveSection("purpose")}
            >
              4. Purpose of Data Collection
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "consent" ? "active" : ""}`}
              onClick={() => setActiveSection("consent")}
            >
              5. Consent for Data Collection
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "retention" ? "active" : ""}`}
              onClick={() => setActiveSection("retention")}
            >
              6. Data Retention
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "sharing" ? "active" : ""}`}
              onClick={() => setActiveSection("sharing")}
            >
              7. Data Sharing and Disclosure
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "rights" ? "active" : ""}`}
              onClick={() => setActiveSection("rights")}
            >
              8. Rights of Data Subject
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "cookies" ? "active" : ""}`}
              onClick={() => setActiveSection("cookies")}
            >
              9. Cookies and Tracking Technology
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "security" ? "active" : ""}`}
              onClick={() => setActiveSection("security")}
            >
              10. Security of Personal Data
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "thirdparty" ? "active" : ""}`}
              onClick={() => setActiveSection("thirdparty")}
            >
              11. Links to Third-Party Websites
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "changes" ? "active" : ""}`}
              onClick={() => setActiveSection("changes")}
            >
              12. Changes to the Privacy Policy
            </button>

            <button
              type='button'
              className={`Privacy-btn ${activeSection === "contact" ? "active" : ""}`}
              onClick={() => setActiveSection("contact")}
            >
              13. Contact Us
            </button>
          </div>
        </div>

        {/* RIGHT SIDE CONTENT */}
        <div className='col-lg-8'>
          {activeSection === "intro" && (
            <>
              <h4>1. Introduction</h4>
              <p>
                At Aionion Capital, we are committed to protecting your personal
                data and ensuring that your privacy is respected. This Privacy
                Policy is designed to inform you about the personal data we
                collect, how we use it, and the measures we take to protect your
                information in compliance with the Digital Personal Data
                Protection Act, 2023 (DPDPA) and other applicable laws in India.
              </p>
              <p>
                By using our Website, you consent to the collection, use, and
                sharing of your personal data as described in this Privacy
                Policy. You have the right to withdraw your consent at any time,
                but please note that this may impact your ability to access some
                of our services.
              </p>
            </>
          )}

          {activeSection === "importance" && (
            <>
              <h4>2. Importance of Your Information</h4>
              <p>
                We value your personal data as one of our most important assets.
                We collect, process, store, and safeguard your information with
                the utmost care, following the principles of purpose limitation,
                data minimization, and accuracy, as required by the DPDPA, 2023.
              </p>
              <p>
                We take appropriate physical, technical, and administrative
                measures to ensure the security and confidentiality of your
                personal data and prevent unauthorized access, disclosure,
                alteration, or destruction.
              </p>
            </>
          )}

          {activeSection === "collection" && (
            <>
              <h4>3. Collection of Personal Data</h4>
              <p>
                Under the Digital Personal Data Protection Act, 2023, we are
                obligated to inform you about the types of personal data we
                collect. This may include the following categories:
              </p>
              <h5>Persional Information:</h5>
              <p>
                Name, gender, date of birth, residential address, contact
                details (phone number, email address), and marital status.
              </p>
              <h6>Identification Details:</h6>
              <p>
                PAN, Aadhar (where applicable), KYC status, signature, and
                photograph.
              </p>
              <h6>Financial Information:</h6>
              <p>
                Bank account details, payment information, and other financial
                data.
              </p>
              <h6>Service-Related Information:</h6>
              <p>
                Data required to provide the services you request, including
                trading preferences, service usage, and feedback.
              </p>
            </>
          )}

          {activeSection === "purpose" && (
            <>
              <h4>4. Purpose of Data Collection</h4>
              <h6>Your personal data is used primarily for:</h6>
              <p>Processing your service requests and transactions.</p>
              <p>Fulfilling our legal and regulatory obligations.</p>
              <p>
                Communicating relevant updates, product information, and offers.
              </p>
            </>
          )}

          {activeSection === "consent" && (
            <>
              <h4>5. Consent for Data Collection</h4>
              <p>
                By providing your personal data, you consent to its collection,
                processing, and storage in accordance with this Privacy Policy.
                You may withdraw your consent at any time by contacting us,
                although this may limit your access to our services.
              </p>
            </>
          )}

          {activeSection === "retention" && (
            <>
              <h4>6. Data Retention</h4>
              <p>
                We retain your personal data only for as long as necessary to
                fulfill the purposes for which it was collected or as required
                by applicable law. Once your data is no longer needed, we will
                securely delete or anonymize it.
              </p>
            </>
          )}

          {activeSection === "sharing" && (
            <>
              <h4>7. Data Sharing and Disclosure</h4>
              <p>
                We will not share your personal data with third parties except
                under the following circumstances:
              </p>
              <p>Service Providers:</p>
              <p>
                We may share your personal data with trusted third-party service
                providers who assist us in delivering services to you (e.g.,
                payment processing, IT support). These third parties are
                contractually obligated to maintain the confidentiality and
                security of your data.
              </p>
              <p>Legal Requirements:</p>
              <p>
                We may disclose your personal data if required by law,
                regulation, or a court order. This includes compliance with
                governmental or regulatory authorities, including tax and audit
                requirements.
              </p>
              <p>With Your Consent:</p>
              <p>
                We may share your personal data with third parties only when you
                explicitly consent to such sharing. In all cases, we ensure that
                any third-party service providers comply with the DPDPA, 2023,
                and maintain strict confidentiality standards.
              </p>
            </>
          )}

          {activeSection === "rights" && (
            <>
              <h4>8. Rights of Data Subject</h4>
              <p>
                Under the Digital Personal Data Protection Act, 2023, you have
                the following rights concerning your personal data:
              </p>
            </>
          )}

          {activeSection === "cookies" && (
            <>
              <h4>9. Cookies and Tracking Technology</h4>
              <p>
                Our Website uses cookies and similar tracking technologies to
                enhance your browsing experience. Cookies are small text files
                stored on your device that help us analyze site usage, provide
                personalized content, and improve functionality.
              </p>
              <h5>Types Of Cookies:</h5>
              <p>
                Necessary Cookies: Essential for the functioning of the Website.
              </p>
              <p>
                Performance Cookies: Help us analyze user behavior and improve
                the Website.
              </p>
              <p>
                Functional Cookies: Remember your preferences to provide a
                personalized experience.
              </p>
              <p>Targeting Cookies: Used for advertising and tracking.</p>
              <p>
                You can control cookie settings via your browser settings.
                However, disabling cookies may affect your ability to use
                certain features of the Website.,
              </p>
            </>
          )}

          {activeSection === "security" && (
            <>
              <h4>10. Security of Personal Data</h4>
              <p>
                We implement industry-standard security practices to protect
                your personal data. These include physical security measures,
                encryption, firewalls, and access control mechanisms. We conduct
                regular security audits and reviews to ensure the continued
                protection of your information. However, please note that no
                data transmission over the internet can be guaranteed to be 100%
                secure. Therefore, while we strive to protect your personal
                data, we cannot ensure or warrant its absolute security.
              </p>
            </>
          )}

          {activeSection === "thirdparty" && (
            <>
              <h4>11. Links to Third-Party Websites</h4>
              <p>
                Our Website may contain links to third-party websites that are
                not operated by us. We have no control over the privacy
                practices or content of these websites. We encourage you to read
                their privacy policies before providing them with any personal
                data.
              </p>
            </>
          )}

          {activeSection === "changes" && (
            <>
              <h4>12. Changes to the Privacy Policy</h4>
              <p>
                Aionion Capital reserves the right to update or modify this
                Privacy Policy from time to time. Any changes will be posted on
                this page, and the **Effective Date** will be updated
                accordingly. We encourage you to review this Privacy Policy
                periodically to stay informed about how we are protecting your
                personal data.
              </p>
            </>
          )}

          {activeSection === "contact" && (
            <>
              <h4>13. Contact Us</h4>
              <p>
                If you have any questions or concerns about this Privacy Policy
                or our data protection practices, or if you wish to exercise
                your rights, please contact us at:
              </p>
              <h5>Aionion Capital Market Services Private Limited:</h5>
              <p>3rd Floor,</p>
              <p>Meerlan Towers, No.33,</p>
              <p>Hanumantha Road, Royapettah, Chennai - 600014,India</p>
              <p>Email: contactus@aionioncapital.com.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Privacy;
