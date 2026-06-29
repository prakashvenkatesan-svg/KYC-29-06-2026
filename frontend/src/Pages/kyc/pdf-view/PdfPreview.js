// import { useState } from "react";

// function PdfPreview() {
//   const [pdfUrl, setPdfUrl] = useState("");
//   const [documentId, setDocumentId] = useState("");

//   // 📌 Upload PDF
//   const uploadPdf = async (file) => {
//     const formData = new FormData();
//     formData.append("document", file);
//     formData.append("name", file.name);

//     const res = await fetch("http://localhost:5000/api/upload/pdf", {
//       method: "POST",
//       body: formData,
//     });

//     const data = await res.json();

//     console.log("UPLOAD RESPONSE:", data);

//     setDocumentId(data.id); // 🔥 STORE documentId
//   };

//   // 📌 Generate PDF preview (optional)
//   const generatePdf = async () => {
//     const response = await fetch(
//       "http://localhost:5000/api/pdf/generate-pdf/2",
//     );

//     const blob = await response.blob();
//     const url = URL.createObjectURL(blob);

//     setPdfUrl(url);
//   };

//   // 📌 eSign flow
//   const handleEsign = async () => {
//     const response = await fetch("http://localhost:5000/api/esign/create", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         documentId: documentId, // 🔥 FROM STATE
//         name: "Test User",
//         email: "test@gmail.com",
//         identifier: "esign_" + Date.now(),
//       }),
//     });

//     const data = await response.json();

//     console.log("ESIGN RESPONSE:", data);

//     if (data.signingUrl) {
//       window.location.href = data.signingUrl;
//     }
//   };

//   return (
//     <div>
//       <h2>PDF Upload + eSign Flow</h2>

//       {/* Upload */}
//       <input type='file' onChange={(e) => uploadPdf(e.target.files[0])} />

//       <button onClick={generatePdf}>Generate PDF Preview</button>

//       {pdfUrl && (
//         <div>
//           <iframe src={pdfUrl} width='100%' height='600px' />

//           <button onClick={handleEsign}>Proceed To E-Sign</button>
//         </div>
//       )}
//     </div>
//   );
// }

// export default PdfPreview;
