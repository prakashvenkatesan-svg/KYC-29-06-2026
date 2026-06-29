import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { IoArrowBack, IoArrowForward } from "react-icons/io5";
import { FaQuoteLeft } from "react-icons/fa";

import Banner from "../assets/Banner.png";

import Equity from "../assets/Equity.png";
import Ipo from "../assets/Ipo.png";
import Mutual from "../assets/Mutual.png";
import Bonds from "../assets/Bonds.png";

import User from "../assets/User.png";
import Kycimg from "../assets/Kycimg.png";
import buyimg from "../assets/buyimg.png";
import passcodeimg from "../assets/passcodeimg.png";

import Hub from "../assets/Hub.png";
import Recommend from "../assets/Recommend.png";
import Flexible from "../assets/Flexible.png";
import Service from "../assets/Service.png";

import appinvesting from "../assets/appinvesting.png";
import Playstore from "../assets/Playstore.png";
import Appstore from "../assets/Appstore.png";

import chooseaionion from "../assets/chooseaionion.png";

import testimonial from "../assets/testimonial.png";

import "../Style.css";

const servicesData = [
  {
    img: Equity,
    title: "Equity",
    desc: "Invest in leading stocks and grow your portfolio. Trade seamlessly with expert insights and 24/7 accessibility on our platform.",
  },
  {
    img: Bonds,
    title: "Bonds",
    desc: "Secure your investments with low-risk bonds. Enjoy consistent returns and diversify your portfolio effortlessly.",
  },
  {
    img: Mutual,
    title: "Mutual Funds",
    desc: "Grow wealth through professionally managed mutual funds and SIPs. Start small, invest smart, and let compounding work for you.",
  },
  {
    img: Ipo,
    title: "IPO",
    desc: "Be the first to invest in promising companies. Access IPOs and benefit from early growth potential with ease.",
  },
];

const services = [
  {
    img: User,
    title: "Equity",
    desc: "Simple & Easy User Friendly",
  },
  {
    img: Kycimg,
    title: "IPO",
    desc: "Instant KYC",
  },
  {
    img: buyimg,
    title: "Mutual Funds",
    desc: "Low Network Trading",
  },
  {
    img: passcodeimg,
    title: "Bonds",
    desc: "Two - Factor Authentication",
  },
];

const servicesDatas = [
  {
    img: Hub,
    title: "All in One Financial Hub",
    desc: "Manage your Equity, Bonds, Mutual Funds, and IPO's effortlessly — all in one place. Simplify your investments with a unified platform",
  },
  {
    img: Recommend,
    title: "Well-Researched Recommendations",
    desc: "Get expert insights tailored to your financial goals. Make smarter investment decisions with curated advice you can trust.",
  },
  {
    img: Flexible,
    title: "Flexible Investment Options",
    desc: "Choose how you invest—buy in bulk or start with SIP. Flexibility that fits your financial strategy and lifestyle.",
  },
  {
    img: Service,
    title: "Personalized Service",
    desc: "Experience dedicated support designed for every investor From beginners to experts, we’re here to guide you every step of the way.",
  },
];

const testimonials = [
  {
    text: "I am very satisfied and happy with your service regarding investments. I will suggest your Aionion group to my friends and family for sure and Mr. Ansar rahuman is very polite and helpful. He resolved my all issues ASAP",
    name: "PUSHPARAJ K",
    image: "https://i.pravatar.cc/100?img=1",
  },
  {
    text: "We want to say a massive thank you for the support you are giving us. We appreciate that you are solving all the issues very quickly for us and all customers. You always work so passionately to make sure the customers get the best experience and insights. We have very glad about your service, and your explanations on to get a clear idea about any kind of doubts in the markets. So once again we say massive thanks to you. We are getting daily updates properly. We are getting  Market alerts properly. We are getting the buying opportunity at the correct time. We are getting proper awareness. We are getting very kind service from you.",
    name: "MUTHUKKUMARASWAMY",
    image: "https://i.pravatar.cc/100?img=2",
  },
  {
    text: "Keep your contact details updated to avoid missing important updates.",
    name: "Anitha Sharma",
    image: "https://i.pravatar.cc/100?img=3",
  },
];

const Home = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const prevSlide = () => {
    setCurrent(current === 0 ? testimonials.length - 1 : current - 1);
  };

  const nextSlide = () => {
    setCurrent(current === testimonials.length - 1 ? 0 : current + 1);
  };

  return (
    <div>
      <div className='Section-A'>
        <div className='container moving-gradient'>
          <div className='row'>
            <div className='col-lg-6 mt-3'>
              <img src={Banner} alt='Banner' className='HeroImage'></img>
            </div>

            <div className='col-lg-6 d-flex align-items-center'>
              <div className='card'>
                <h1 className='hero-title'>
                  Empowering <span className='investor-text'>Investors</span>
                </h1>
                <h3 className='hero-subtitle'>
                  Enabling your Investments Platform
                </h3>

                <p className='hero-description'>
                  Seamlessly navigate opportunities with tools and support
                  designed for every investor
                </p>

                <p className='hero-paragraph'>
                  Explore stockbroking made simple with
                  <span className='aionion-capital'>Aionion Capital</span>
                </p>

                <button
                  type='button'
                  className='hero-Accountbtn'
                  onClick={() => {
                    navigate("/openaccount");
                  }}
                >
                  Open Demat Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='Section-B'>
        <div className='container'>
          <h2 className='text-center'>Our Services</h2>

          <div className='row content-format'>
            {servicesData.map((service) => (
              <div className='col-lg-3 col-md-6 mb-4' key={service.title}>
                <div className='grid-card text-center'>
                  <img
                    src={service.img}
                    alt={service.title}
                    className='Cardimg'
                  />
                  <h3>{service.title}</h3>
                  <p>{service.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='Section-C'>
        <div className='container'>
          <h2 className='text-center home-heading'>
            Aionion Capital For Everyone
          </h2>
          <p className='text-center'>Experience a smarter way to invest</p>

          <div className='row'>
            {services.map((service) => (
              <div className='col-lg-3 col-md-6 mb-4' key={service.title}>
                <div className='grid-card--primary text-center'>
                  <img
                    src={service.img}
                    alt={service.title}
                    className='Sec-cimg'
                  />
                  <p>{service.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='Section-D'>
        <div className='container'>
          <h2 className='text-center'>Investing made Simple & Accessible</h2>
          {/* <video
              src='/videos/investingvideo.mp4'
              controls
              className='invest-video'
            /> */}
        </div>
      </div>

      <div className='Section-E'>
        <div className='container'>
          <div className='row content-format  '>
            {servicesDatas.map((service) => (
              <div className='col-lg-3 col-md-6 mb-4' key={service.title}>
                <div className='grid-cards text-center'>
                  <img
                    src={service.img}
                    alt={service.title}
                    className='Cardimg'
                  />
                  <h3>{service.title}</h3>
                  <p>{service.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='Section-F'>
        <div className='container'>
          <div className='row secf-header'>
            <div className='col-lg-6'>
              <img src={appinvesting} alt='smart' className='Appimg' />
            </div>

            <div className='col-lg-6 secf-content'>
              <h3>App for Smart Investing</h3>
              <h4>Investing Financial Future</h4>
              <div className='card'>
                <div className='d-flex gap-3'>
                  <div className='vertical-line'></div>
                  <p>
                    At Aionion Capital, we make investing easy for everyone.
                    With a user-friendly platform and expert guidance, you can
                    take charge of your financial future —anytime, anywhere
                  </p>
                </div>
              </div>

              <div className='secf-footer'>
                <a
                  href='https://play.google.com/store/apps/details?id=com.intellectsoftwares.aionioncaptial'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <img src={Playstore} alt='Playstore' className='sec-f-img' />
                </a>

                <a
                  href='https://apps.apple.com/us/app/aionion-capital/id6740156959'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <img src={Appstore} alt='Appstore' className='sec-f-img' />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='Section-G'>
        <div className='container'>
          <h2 className='text-center'>38K+ User World Wide</h2>
          <h3 className='text-center'>Investor Attention</h3>

          <div className='testimonial-section'>
            <FaQuoteLeft className='quote-icon' />

            <p className='testimonial-text'>{testimonials[current].text}</p>

            <img
              src={testimonials[current].image}
              alt='profile'
              className='profile-img'
            />

            <h4>{testimonials[current].name}</h4>

            {/* Arrows */}
            <button className='arrow left' onClick={prevSlide}>
              <IoArrowBack />
            </button>

            <button className='arrow right' onClick={nextSlide}>
              <IoArrowForward />
            </button>

            {/* Dots */}
            <div className='dots'>
              {testimonials.map((_, index) => (
                <span
                  key={index}
                  className={index === current ? "dot active" : "dot"}
                  onClick={() => setCurrent(index)}
                ></span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className='Section-H'>
        <div className='container'>
          <div className='mt-4'>
            <h2 className='text-center home-heading'>Our Experience</h2>
            <div className='row ourexperience'>
              <div className='col-lg-6 m-auto'>
                <h3>Growth & Innovation</h3>
                <h4>With Our Seamless Experience </h4>
                <div className='card'>
                  <div className='d-flex gap-3'>
                    <div className='line-1'></div>
                    <p>
                      Our platform offers a robust suite of investor-focused
                      features, helping you make data-driven decisions
                      effortlessly.
                    </p>
                  </div>

                  <div className='d-flex gap-3'>
                    <div className='line-2'></div>
                    <p>
                      With seamless navigation and comprehensive insights, you
                      can make informed decisions to strengthen your portfolio
                      and pursue your financial goals.
                    </p>
                  </div>
                </div>
              </div>

              <div className='col-lg-6'>
                <img
                  src={chooseaionion}
                  alt='chooseaionion'
                  className='aionionimg-home'
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
