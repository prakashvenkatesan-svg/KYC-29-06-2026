import api from "../services/api";

export const syncKycProgress = async (
  currentStep,
  kycStatus = "in_progress",
) => {
  const applicationId = localStorage.getItem("application_id");

  if (!applicationId || !currentStep) {
    return;
  }

  try {
    await api.post("/contact/progress", {
      application_id: Number(applicationId),
      current_step: currentStep,
      kyc_status: kycStatus,
    });
  } catch (error) {
    console.log(
      "SYNC KYC PROGRESS ERROR:",
      error.response?.data || error.message,
    );
  }
};
