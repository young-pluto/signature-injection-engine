import React, { useState } from "react";
import axios from "axios";
import PDFViewer from "./components/PDFViewer";
import SignatureCapture from "./components/SignatureCapture";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [fields, setFields] = useState([]);
  const [showSignatureCapture, setShowSignatureCapture] = useState(false);
  const [currentSignatureFieldId, setCurrentSignatureFieldId] = useState(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [viewportDims, setViewportDims] = useState({ width: 800, height: 600 });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setFields([]);
      setSignedPdfUrl(null);
      setPageNum(1);
    } else {
      alert("Please upload a valid PDF file");
    }
  };

  const addField = (type) => {
    // Defaults are now PERCENTAGES (0-100)
    const newField = {
      id: Date.now(),
      type,
      page: pageNum,
      x: 40, // Center horizontally (approx)
      y: 45, // Center vertically (approx)
      width:
        type === "signature" ||
        type === "image" ||
        type === "text" ||
        type === "date"
          ? 25
          : 3, // Smaller 3% for checkbox/radio
      height:
        type === "signature" || type === "image"
          ? 10
          : type === "text" || type === "date"
          ? 5
          : 3, // Smaller 3% for checkbox/radio
      text: type === "text" ? "Type here..." : undefined,
      date: type === "date" ? new Date().toLocaleDateString() : undefined,
      checked: type === "checkbox" || type === "radio" ? false : undefined,
      imageData: null,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id, updates) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  const deleteField = (id) => {
    setFields(fields.filter((field) => field.id !== id));
  };

  const handleSignatureClick = (fieldId) => {
    setCurrentSignatureFieldId(fieldId);
    setShowSignatureCapture(true);
  };

  const handleSignatureSave = (imageData) => {
    if (currentSignatureFieldId) {
      updateField(currentSignatureFieldId, { imageData });
    }
    setShowSignatureCapture(false);
    setCurrentSignatureFieldId(null);
  };

  const handleSignatureCancel = () => {
    setShowSignatureCapture(false);
    setCurrentSignatureFieldId(null);
  };

  const handleSignDocument = async () => {
    if (!pdfFile) {
      alert("Please upload a PDF first");
      return;
    }

    if (fields.length === 0) {
      alert("Please add at least one field");
      return;
    }

    // Check if all signature fields have signatures
    const signatureFields = fields.filter((f) => f.type === "signature");
    const unsignedFields = signatureFields.filter((f) => !f.imageData);
    if (unsignedFields.length > 0) {
      alert("Please add signatures to all signature fields");
      return;
    }

    setIsSigning(true);

    try {
      const formData = new FormData();
      formData.append("pdfFile", pdfFile);
      formData.append("fields", JSON.stringify(fields));
      // Send dynamic viewport dimensions
      formData.append("viewport", JSON.stringify(viewportDims));

      const response = await axios.post(`${API_URL}/api/sign-pdf`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setSignedPdfUrl(`${API_URL}${response.data.signedPdfUrl}`);
        alert("Document signed successfully! ✅");
      }
    } catch (error) {
      console.error("Error signing document:", error);
      alert("Failed to sign document. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>📝 Signature Injection Engine</h1>
        <p>Upload a PDF, add signature fields, and sign your document</p>
      </header>

      <div className="app-container">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="upload-section">
            <label htmlFor="pdf-upload" className="upload-btn">
              📄 Upload PDF
            </label>
            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
            {pdfFile && <span className="file-name">{pdfFile.name}</span>}
          </div>

          {pdfFile && (
            <>
              <div className="mid-toolbar">
                <div className="field-buttons">
                  <button
                    onClick={() => addField("signature")}
                    className="field-btn"
                  >
                    ✍️ Signature
                  </button>
                  <button
                    onClick={() => addField("text")}
                    className="field-btn"
                  >
                    📝 Text
                  </button>
                  <button
                    onClick={() => addField("date")}
                    className="field-btn"
                  >
                    📅 Date
                  </button>
                  <button
                    onClick={() => addField("image")}
                    className="field-btn"
                  >
                    🖼️ Image
                  </button>
                  <button
                    onClick={() => addField("checkbox")}
                    className="field-btn"
                  >
                    ☑️ Checkbox
                  </button>
                  <button
                    onClick={() => addField("radio")}
                    className="field-btn"
                  >
                    🔘 Radio
                  </button>
                </div>

                <div className="page-controls">
                  <button
                    disabled={pageNum <= 1}
                    onClick={() => setPageNum(pageNum - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {pageNum} of {numPages || "--"}
                  </span>
                  <button
                    disabled={pageNum >= (numPages || 1)}
                    onClick={() => setPageNum(pageNum + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="action-buttons">
                <button
                  onClick={handleSignDocument}
                  className="sign-btn"
                  disabled={isSigning || fields.length === 0}
                >
                  {isSigning ? "⏳ Signing..." : "✅ Sign Document"}
                </button>

                {/* Signed PDF Download - Moved Below Sign Button */}
                {signedPdfUrl && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await axios.get(signedPdfUrl, {
                          responseType: "blob",
                          headers: { Accept: "application/pdf" },
                        });
                        const url = window.URL.createObjectURL(
                          new Blob([response.data])
                        );
                        const link = document.createElement("a");
                        link.href = url;
                        link.setAttribute(
                          "download",
                          signedPdfUrl.split("/").pop()
                        );
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error("Download failed:", error);
                        alert(`Download failed: ${error.message}`);
                      }
                    }}
                    className="download-btn"
                    style={{ marginTop: "10px", background: "#4CAF50" }}
                  >
                    ⬇️ Download Signed PDF
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* PDF Viewer */}
        {pdfFile && (
          <PDFViewer
            pdfFile={pdfFile}
            fields={fields.filter((f) => f.page === pageNum)}
            onFieldUpdate={updateField}
            onFieldDelete={deleteField}
            onSignatureClick={handleSignatureClick}
            pageNum={pageNum}
            onPageChange={setPageNum}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onDimensionsChange={setViewportDims}
          />
        )}

        {!pdfFile && (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h2>No PDF Loaded</h2>
            <p>Upload a PDF document to get started</p>
          </div>
        )}
      </div>

      {/* Signature Capture Modal */}
      {showSignatureCapture && (
        <SignatureCapture
          onSave={handleSignatureSave}
          onCancel={handleSignatureCancel}
        />
      )}

      {/* Full Screen Loading Overlay */}
      {isSigning && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">Securing Document...</div>
        </div>
      )}
    </div>
  );
}

export default App;
