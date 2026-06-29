// import React, { useEffect, useState } from "react";

// import api from "../../../services/api";

// const ReversePennyDrop = () => {
//   const [qrData, setQrData] = useState(null);

//   const [verified, setVerified] = useState(false);

//   const applicationId = localStorage.getItem("application_id");

//   useEffect(() => {
//     createPayment();
//   }, []);

//   useEffect(() => {
//     if (!qrData?.transactionId) return;

//     const interval = setInterval(() => {
//       checkStatus(qrData.transactionId);
//     }, 5000);

//     return () => clearInterval(interval);
//   }, [qrData]);

//   const createPayment = async () => {
//     try {
//       const response = await api.post("/bank-details/reverse-penny-drop", {
//         application_id: applicationId,
//       });

//       setQrData(response.data.data);
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   const checkStatus = async (transactionId) => {
//     try {
//       const response = await api.get(
//         `/bank-details/payment-status/${transactionId}`,
//       );

//       if (response.data.verified) {
//         setVerified(true);
//       }
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   return (
//     <div className='container py-5'>
//       <div className='card p-4'>
//         <h3>Reverse Penny Drop</h3>

//         {!verified && (
//           <>
//             {qrData?.qrCode && <img src={qrData.qrCode} alt='QR' width='250' />}

//             {qrData?.shortUrl && <a href={qrData.shortUrl}>Pay ₹1</a>}
//           </>
//         )}

//         {verified && (
//           <div>
//             <h4>Bank Verified Successfully</h4>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ReversePennyDrop;
