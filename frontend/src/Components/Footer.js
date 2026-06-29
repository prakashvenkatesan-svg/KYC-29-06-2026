import React from "react";
import { Link } from "react-router-dom";

import Aionionlogo from "../assets/Aionionlogo.png";
import yt from "../assets/yt.png";
import instra from "../assets/instra.png";
import linkedin from "../assets/linkedin.png";
import twitter from "../assets/twitter.png";
import fb from "../assets/fb.png";

import appstorewhite from "../assets/appstorewhite.png";
import googleplaywhite from "../assets/googleplaywhite.png";

import "../Style.css";

const Footer = () => {
  return (
    <div className='Footer'>
      <div className='container'>
        <div className='footer-header'>
          <div>
            <img src={Aionionlogo} alt='Logo' className='navbar-logo' />
          </div>

          <div className='d-flex gap-3 iconimg'>
            <img src={fb} alt='fb' className='footerimg' />
            <img src={twitter} alt='twitter' className='footerimg' />
            <img src={linkedin} alt='linkedin' className='footerimg' />
            <img src={instra} alt='instagram' className='footerimg' />
            <img src={yt} alt='yt' className='footerimg' />
          </div>
        </div>

        <hr />

        <div className='row'>
          <div className='col-lg-3'>
            <ul className='list-unstyled d-flex flex-column gap-2'>
              <li>
                <Link to='/about' className='footer-link'>
                  About us
                </Link>
              </li>
              <li>
                <Link to='/contact' className='footer-link'>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to='/about#meet-the-people' className='footer-link'>
                  Key Managerial Persons
                </Link>
              </li>
              <li>
                <Link
                  to='/investor#complaint-procedure'
                  className='footer-link'
                >
                  How to file a complaint
                </Link>
              </li>

              <li>
                <Link
                  to='/investor#complaint-procedure'
                  className='footer-link'
                >
                  Find the status of a complaint
                </Link>
              </li>
            </ul>
          </div>

          <div className='col-lg-3'>
            <ul className='list-unstyled d-flex flex-column gap-2'>
              <li>
                <Link to='/investor#escalation-matrix' className='footer-link'>
                  Escalation Matrix
                </Link>
              </li>

              <li>
                <Link to='/investor#bank-details' className='footer-link'>
                  Bank Details
                </Link>
              </li>
              <li>
                <Link to='/investor#Investor-Support' className='footer-link'>
                  Investor Support Center
                </Link>
              </li>
              <li>
                <Link to='/investor#application-form' className='footer-link'>
                  Application Form
                </Link>
              </li>

              <li>
                <Link to='/investor#sebi-score' className='footer-link'>
                  SMART ODR
                </Link>
              </li>

              <li>
                <Link to='/investor#sebi-score' className='footer-link'>
                  SCORES
                </Link>
              </li>
            </ul>
          </div>

          <div className='col-lg-3'>
            <ul className='list-unstyled d-flex flex-column gap-2'>
              <li>
                <Link to='/privacy' className='footer-link'>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to='/more?section=Awareness and Advisory'
                  className='footer-link'
                >
                  Investor Advisory Section
                </Link>
              </li>
              <li>
                <Link to='/more?section=Disclaimers' className='footer-link'>
                  Disclaimer
                </Link>
              </li>

              <li>
                <Link to='/more?section=Refund' className='footer-link'>
                  Refund Cancellations
                </Link>
              </li>

              <li>
                <Link to='/more?section=Terms' className='footer-link'>
                  Terms and Conditions
                </Link>
              </li>

              <li>
                <Link to='/more?section=bond' className='footer-link'>
                  Bond Details
                </Link>
              </li>
            </ul>
          </div>

          <div className='col-lg-3'>
            <ul className='list-unstyled d-flex flex-column gap-2'>
              <li>
                <a
                  href='https://www.nseindia.com/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='footer-link'
                >
                  NSE
                </a>
              </li>

              <li>
                <a
                  href='https://www.bseindia.com/static/investors/cac_tm.aspx?expandable=2'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='footer-link'
                >
                  BSE
                </a>
              </li>

              <li>
                <a
                  href='https://www.sebi.gov.in/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='footer-link'
                >
                  SEBI
                </a>
              </li>

              <li>
                <a
                  href='https://www.cdslindia.com/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='footer-link'
                >
                  CDSL
                </a>
              </li>

              <li>
                <a
                  href='https://www.nsdl.co.in/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='footer-link'
                >
                  NSDL
                </a>
              </li>

              <li>
                <a
                  href='https://evoting.cdslindia.com/Evoting/EvotingLogin'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='footer-link'
                >
                  CDSL e-voting
                </a>
              </li>

              <li>
                <a
                  href='https://www.evoting.nsdl.com/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='footer-link'
                >
                  NSDL e-voting
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className='footer-card-1'>
          <h3 className='text-center footer-content-header'>
            M/s. AIONION CAPITAL MARKET SERVICES PRIVATE LIMITED
          </h3>
          <p className='text-center company-address'>
            3rd Floor, Meerlan Towers, No.33, Hanumantha Road, Royapettah,
            Chennai - 600 014
          </p>

          <div className='d-flex justify-content-between'>
            <div className='footer-card-1-content'>
              <p className='p-tag'>Company PAN: ABACA2285K</p>
              <p className='p-tag'>GST: 33ABACA2285K1ZR</p>
              <p className='p-tag'>TAN: CHEA37281G</p>
              <p className='p-tag'>BSE Member Code: 6878</p>
              <p className='p-tag'>CDSL DP ID: 12100800</p>
              <p className='p-tag'>
                Depository participant SEBI Registration Number: IN-DP-790-2024
              </p>
            </div>
            <div className='d-flex flex-column align-items-end'>
              <p className='p-tag'>Stock Broker SEBI Registration Number: INZ000318532</p>
              <p className='p-tag'>CIN: U66120TN2024PTC167864</p>
              <p className='p-tag'>AMFI Registration Number: ARN-296313</p>
              <p className='p-tag'>NSE Member Code: 90405</p>
              <p className='p-tag'>NSDL DP ID: IN304772</p>
              <p className='p-tag'>
                Research Analyst SEBI Registration Number: INH000020138
              </p>
            </div>
          </div>
        </div>

        <div className='footer-card-2'>
          <h3 className='text-center footer-content-header'>
            Compliance Officer Details
          </h3>
          <div className='d-flex justify-content-between'>
            <p className='p-tag'>
              Compliance Officer: Ms Swati Keshari | Email:
              compliance@aionioncapital.com
            </p>
            <p className='p-tag'>
              For investor grievances, please email:
              grievances@aionioncapital.com
            </p>
          </div>
        </div>

        <div className='footer-card-3'>
          <h3 className='text-center footer-content-header'>
            Attention Investors
          </h3>
          <p className='p-tag'>
            1. Stock brokers can accept securities as margin only by way of
            pledge in the depository system w.e.f. 1 Sep 2020.
          </p>
          <p className='p-tag'>
            2. Update your email ID and mobile number with your stock
            broker/depository participant to receive an OTP directly from the
            depository when creating a pledge.
          </p>
          <p className='p-tag'>
            3. Check your securities/MF/bonds in the consolidated account
            statement issued by NSDL/CDSL every month.
          </p>
          <p className='p-tag'>
            4. Prevent unauthorised transactions → update your mobile
            numbers/email IDs with your stock brokers and receive end-of-day
            transaction alerts from the exchange.
            <span>Issued in the interest of investors.</span>
          </p>
        </div>

        <div className='mt-3'>
          <p className='p-tag'>
            The Stock Exchanges are not in any manner answerable, responsible or
            liable to any person or persons for any acts of omission or
            commission, errors, mistakes and/or violation, actual or perceived,
            by us or our partners, agents, associates, etc., of any of the
            Rules, Regulations, Bye-laws of the Stock Exchanges, SEBI Act or any
            other laws in force from time to time. The Stock Exchanges are not
            answerable, responsible or liable for any information on this
            Website or for any services rendered by us, our employees, and our
            servants.
          </p>
          <p className='p-tag'>
            The comprehensive details of Depository Participants is displayed on
            CDSL website at following link:
            https://www.cdslindia.com/eservices/DP/DPDatabase
          </p>
          <h6 className='text-center'>
            Investments in securities market are subject to market risks, read
            all the related documents carefully before investing.
          </h6>
        </div>
      </div>

      <div className='footer-end'>
        <p className='text-center'>
          Copyright ©2026 Aionion Capital. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default Footer;
