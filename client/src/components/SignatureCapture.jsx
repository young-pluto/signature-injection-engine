import React, { useRef, useState } from 'react';
import './SignatureCapture.css';

function SignatureCapture({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Get coordinates from either mouse or touch event
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    
    ctx.beginPath();
    ctx.moveTo(x - rect.left, y - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    // Prevent scrolling on touch devices
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Get coordinates from either mouse or touch event
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const y = e.clientY || (e.touches && e.touches[0].clientY);
    
    ctx.lineTo(x - rect.left, y - rect.top);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL('image/png');
    onSave(imageData);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onSave(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="signature-capture-modal">
      <div className="signature-capture-content">
        <h3>Add Signature</h3>
        
        <div className="signature-tabs">
          <div className="tab active">Draw</div>
          <div 
            className="tab" 
            onClick={() => document.getElementById('signature-upload').click()}
            style={{ cursor: 'pointer' }}
          >
            Upload
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          className="signature-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Hidden but functional upload input */}
        <input
          id="signature-upload"
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        <div className="signature-actions">
          <button onClick={clearCanvas} className="btn-secondary">
            Clear
          </button>
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button 
            onClick={saveSignature} 
            className="btn-primary"
            disabled={!hasDrawn}
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignatureCapture;
