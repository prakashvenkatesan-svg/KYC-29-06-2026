import React from "react";

import phone from "../assets/phone.png";
import email from "../assets/email.png";
import Location from "../assets/Location.png";
import time from "../assets/time.png";

import otp from "../assets/otp.png";

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

const teambranch = [
  {
    city: "HEAD OFFICE",
    address: [
      "Reg. Office: 3rd Floor, Meerlan Towers,",
      "No. 33 Hanumantha Road, Royapettah,",
      "Chennai - 600 014",
      "Ph: 044-46895225",
    ],
  },
  {
    city: "COIMBATORE",
    address: [
      "741, 2nd Building, TSJ Complex, 2nd Floor,",
      "Avinashi Road,",
      "Coimbatore - 641 018",
    ],
  },
  {
    city: "TRICHY",
    address: [
      "ANSHIL ARCADE, 2nd Floor,",
      "Old No.11, New No.39 (Plot No.660),",
      "EVR Salai, K.K.Nagar,",
      "Tiruchirappalli - 620 021",
    ],
  },
  {
    city: "MADURAI",
    address: [
      "No.70, Navalar Nagar 3rd Street,",
      "Sakthi Velammal Nagar,",
      "S.S Colony, Madurai - 625016",
    ],
  },
  {
    city: "BANGALORE",
    address: [
      "Novel Tech Park, 46/4, 2nd Floor,",
      "Hosur Rd, Kudlu Gate,",
      "Krishna Reddy Industrial Area,",
      "HSR Extension, Bengaluru - 560068",
    ],
  },
];

const Contact = () => {
  return (
    <div>
      <div className='container'>
        <h2 className='text-center'>Contact Us</h2>
        <h3 className='text-center contact-heading'>
          Any question or remarks? Just write us a message!
        </h3>

        <div className='row contact-card'>
          <div className='col-lg-4 contact-card-left'>
            <h3>Contact Information</h3>
            <p>Say something to start a live chat!</p>
            <div className='d-flex Contact-card-content'>
              <img src={phone} alt='phone' className='contactimg' />
              <p>(+91) 92402 62108</p>
            </div>
            <div className='d-flex Contact-card-content'>
              <img src={email} alt='phone' className='contactimg' />
              <p>clientcare@aionioncapital.com</p>
            </div>
            <div className='d-flex Contact-card-content'>
              <img src={Location} alt='phone' className='contactimg' />
              <p className='address'>
                {`3rd Floor, Meerlan Towers,
                No. 33 Hanumantha Road, Royapettah,
                Chennai - 600 014
                Ph: 044-46895225`}
              </p>
            </div>
          </div>

          <div className='col-lg-8 contact-card-right'>
            <div className='contact-container'>
              <form className='contact-form'>
                <div className='form-row'>
                  <div className='form-group'>
                    <label>First Name</label>
                    <input type='text' />
                  </div>

                  <div className='form-group'>
                    <label>Last Name</label>
                    <input type='text' />
                  </div>
                </div>

                <div className='form-row'>
                  <div className='form-group'>
                    <label>Email</label>
                    <input type='email' />
                  </div>

                  <div className='form-group'>
                    <label>Phone Number</label>
                    <input type='tel' />
                  </div>
                </div>

                <div className='form-group full-width'>
                  <label>Message</label>
                  <textarea placeholder='Write your message..' />
                </div>

                <div className='btn-wrapper'>
                  <button type='submit' className='send-message-btn'>
                    <img src={otp} alt='Send' className='send-icon' />
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className='contact-details'>
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

      <div className='about-Section'>
        <div className='container mt-5'>
          <h3 className='mb-4 text-center branch-heading'>
            Our Branch Address
          </h3>

          <div className='row'>
            {teambranch.map((branch, index) => (
              <div className='col-lg-4 col-md-6 mb-4' key={index}>
                <div className='About-card h-100'>
                  <h4>{branch.city}</h4>

                  <div className='address-text'>
                    {branch.address.map((line, i) => (
                      <span key={i}>{line}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
