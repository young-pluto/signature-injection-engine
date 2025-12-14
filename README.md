# 📝 Signature Injection Engine

A full-stack application for adding and "burning" signatures into PDF documents with pixel-perfect coordinate transformation.

## 🚀 Features

- **PDF Upload & Viewing**: Upload and view PDF documents in the browser
- **Draggable Fields**: Add signature, text, and date fields with drag & drop
- **Signature Capture**: Draw signatures with canvas or upload image files
- **Coordinate Transformation**: Accurate CSS pixel → PDF point conversion
- **Aspect Ratio Handling**: Signatures are centered and scaled properly
- **Audit Trail**: SHA-256 hash tracking for document integrity
- **Responsive Design**: Premium UI with gradients and smooth animations

## 🏗️ Architecture

```
signature-engine/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── PDFViewer.jsx
│   │   │   ├── DraggableField.jsx
│   │   │   └── SignatureCapture.jsx
│   │   ├── utils/
│   │   │   └── coordinateTransform.js
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
│
└── server/                 # Node.js backend
    ├── src/
    │   ├── models/
    │   │   └── Document.model.js
    │   ├── services/
    │   │   ├── pdfService.js
    │   │   └── auditService.js
    │   └── routes/
    │       └── pdf.routes.js
    ├── index.js
    └── package.json
```

## 🛠️ Tech Stack

### Frontend

- React 18
- react-pdf (PDF rendering)
- react-rnd (drag & resize)
- axios (HTTP client)

### Backend

- Node.js + Express
- pdf-lib (PDF manipulation)
- MongoDB + Mongoose (audit trail)
- Multer (file uploads)

## 📦 Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd server
npm install

# Create .env file
echo "PORT=5000" > .env
echo "MONGODB_URI=mongodb://localhost:27017/signature-engine" >> .env

# Start server
npm run dev
```

### Frontend Setup

```bash
cd client
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000" > .env

# Start development server
npm start
```

The app will open at `http://localhost:3000`

## 🎯 How It Works

### The Coordinate Transformation Problem

**Challenge**: Browsers use CSS pixels (top-left origin), PDFs use points at 72 DPI (bottom-left origin).

**Solution**: Mathematical transformation with responsive anchoring

```javascript
// Step 1: Calculate scale factors
const scaleX = pdfWidth / viewportWidth;
const scaleY = pdfHeight / viewportHeight;

// Step 2: Transform coordinates (flip Y-axis)
const pdfX = cssX * scaleX;
const pdfY = pdfHeight - (cssY + cssHeight) * scaleY;

// Step 3: Transform dimensions
const pdfWidthScaled = cssWidth * scaleX;
const pdfHeightScaled = cssHeight * scaleY;
```

### Aspect Ratio Handling

When a user draws a square box but uploads a wide signature:

```javascript
const boxAspect = boxWidth / boxHeight;
const imgAspect = imgWidth / imgHeight;

if (imgAspect > boxAspect) {
  // Image is wider - fit to width
  finalWidth = boxWidth;
  finalHeight = boxWidth / imgAspect;
  offsetY = (boxHeight - finalHeight) / 2; // Center vertically
} else {
  // Image is taller - fit to height
  finalHeight = boxHeight;
  finalWidth = boxHeight * imgAspect;
  offsetX = (boxWidth - finalWidth) / 2; // Center horizontally
}
```

## 📡 API Endpoints

### POST `/api/sign-pdf`

Sign a PDF with fields

**Request**:

- `pdfFile`: PDF file (multipart/form-data)
- `fields`: JSON array of field objects
- `viewport`: JSON object with viewport dimensions

**Response**:

```json
{
  "success": true,
  "signedPdfUrl": "/api/download/signed_1234567890.pdf",
  "auditTrail": {
    "originalHash": "abc123...",
    "signedHash": "def456...",
    "timestamp": "2025-12-13T08:17:00.000Z"
  }
}
```

### GET `/api/download/:filename`

Download signed PDF

## 🧪 Testing

### Manual Testing Steps

1. **Upload PDF**: Upload any A4 PDF document
2. **Add Signature Field**: Click "Add Signature" button
3. **Position Field**: Drag and resize the signature box
4. **Add Signature**: Click the field and draw/upload signature
5. **Sign Document**: Click "Sign Document" button
6. **Download**: Download the signed PDF

### Responsive Constraint Test

1. Place signature field on desktop (1920×1080)
2. Resize browser to mobile (375×667)
3. Verify field stays anchored to same PDF location

### Coordinate Accuracy Test

- Place field at known position (e.g., 100, 100)
- Verify PDF coordinates match expected values
- Check signature appears in correct location

## 🚀 Deployment

### Frontend (Vercel)

```bash
cd client
npm run build

# Deploy to Vercel
vercel --prod
```

### Backend (Render/Railway)

```bash
cd server

# Add to package.json
"scripts": {
  "start": "node index.js"
}

# Deploy to Render or Railway
# Set environment variables:
# - PORT=5000
# - MONGODB_URI=your_mongodb_atlas_uri
```

## 🔒 Security Features

- **SHA-256 Hashing**: Original and signed PDFs are hashed
- **Audit Trail**: All signatures stored in MongoDB with timestamps
- **File Validation**: Only PDF files accepted
- **Size Limits**: 10MB max file size

## 📝 License

MIT

## 👨‍💻 Author

Built for BoloForms Full Stack Developer Assessment

---

**Note**: This is a prototype demonstrating coordinate transformation logic. For production use, add authentication, rate limiting, and enhanced security measures.
