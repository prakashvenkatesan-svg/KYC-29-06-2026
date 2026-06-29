import React, { useEffect, useRef } from "react";

import contactdetail from "../../assets/contactdetail.png";
import dematdetails from "../../assets/dematdetails.png";
import personaldetails from "../../assets/personaldetails.png";
import Bankdetails from "../../assets/Bankdetails.png";
import Applicationdetails from "../../assets/Applicationdetails.png";
import Esigndetails from "../../assets/Esigndetails.png";
import Kyccomplete from "../../assets/Kyccomplete.png";

const steps = [
  { key: "contact", label: "Contact Details", icon: contactdetail },
  { key: "identify", label: "Document verification", icon: dematdetails },
  { key: "personal", label: "Personal Details", icon: personaldetails },
  { key: "scheme", label: "Scheme Details", icon: Bankdetails },
  { key: "complete", label: "Payment & KYC Complete", icon: Kyccomplete },
];

const KycStepper = ({ currentStep, completedSteps = [] }) => {
  const stepperScrollRef = useRef(null);
  const stepRefs = useRef({});

  const getStepStatus = (stepKey) => {
    if (completedSteps.includes(stepKey)) return "completed";
    if (stepKey === currentStep) return "active";
    return "pending";
  };

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 991.98px)").matches;

    if (!isMobile) return;

    const scrollContainer = stepperScrollRef.current;
    const activeStepElement = stepRefs.current[currentStep];

    if (!scrollContainer || !activeStepElement) return;

    requestAnimationFrame(() => {
      const targetLeft =
        activeStepElement.offsetLeft -
        scrollContainer.clientWidth / 2 +
        activeStepElement.clientWidth / 2;

      scrollContainer.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: "smooth",
      });
    });
  }, [currentStep]);

  return (
    <div className='kyc-stepper-wrapper'>
      <div className='kyc-stepper-heading'>
        <h2 className='text-center'>
          Open a <span className='kyc-step-trading'>Trading &</span>{" "}
          <span className='kyc-step-demat'>Demat</span> account
        </h2>

        <p className='text-center'>Aionion Capital Online Registration</p>
      </div>

      <div className='kyc-stepper-scroll' ref={stepperScrollRef}>
        <div className='kyc-stepper'>
          {steps.map((step, index) => {
            const status = getStepStatus(step.key);

            return (
              <React.Fragment key={step.key}>
                <div
                  ref={(element) => {
                    stepRefs.current[step.key] = element;
                  }}
                  className={`kyc-step ${status}`}
                >
                  <div className={`kyc-circle ${status}`}>
                    <img src={step.icon} alt={step.label} />
                  </div>

                  <p className={`kyc-label ${status}`}>{step.label}</p>
                </div>

                {index !== steps.length - 1 && (
                  <div className={`kyc-connector ${status}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KycStepper;
