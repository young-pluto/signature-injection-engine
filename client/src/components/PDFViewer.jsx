import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import DraggableField from './DraggableField';
import './PDFViewer.css';

// Set up PDF.js worker - using local file to avoid CORS issues
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

function PDFViewer({ pdfFile, fields, onFieldUpdate, onFieldDelete, onSignatureClick, pageNum, onPageChange, onLoadSuccess, onDimensionsChange }) {
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  const [renderedDimensions, setRenderedDimensions] = useState({ width: 0, height: 0 }); // Track visual pixels
  const pageRef = useRef(null);

  // Measure page size on load and resize
  useEffect(() => {
    if (!pageRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        // We observe the container div
        const { width, height } = entry.contentRect;
        // The inner Page div might be what we actually want if container has padding
        const pageEl = entry.target.querySelector('.react-pdf__Page');
        if (pageEl) {
           const rect = pageEl.getBoundingClientRect();
           setRenderedDimensions({ width: rect.width, height: rect.height });
           if (onDimensionsChange) onDimensionsChange({ width: rect.width, height: rect.height });
        }
      }
    });

    observer.observe(pageRef.current);
    return () => observer.disconnect();
  }, [pageNum, onDimensionsChange]); // Re-attach if page changes

  function onPageLoadSuccess(page) {
    const viewport = page.getViewport({ scale: 1 });
    setPdfDimensions({
      width: viewport.width,
      height: viewport.height
    });
    
    // Initial measure
    setTimeout(() => {
      if (pageRef.current) {
        const pageElement = pageRef.current.querySelector('.react-pdf__Page');
        if (pageElement) {
           const { width, height } = pageElement.getBoundingClientRect();
           setRenderedDimensions({ width, height });
           if (onDimensionsChange) onDimensionsChange({ width, height });
        }
      }
    }, 100);
  }

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-canvas-wrapper">
        <div className="pdf-document-container" ref={pageRef}>
          <Document
            file={pdfFile}
            onLoadSuccess={onLoadSuccess}
            loading={<div className="loading">Loading PDF...</div>}
            className="pdf-document"
          >
            <Page
              pageNumber={pageNum}
              onLoadSuccess={onPageLoadSuccess}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="pdf-page"
            >
               {/* Render draggable fields INSIDE Page to match coordinates exactly */}
               <div className="fields-overlay">
                {fields.map((field) => (
                  <DraggableField
                    key={field.id}
                    field={field}
                    onUpdate={onFieldUpdate}
                    onDelete={onFieldDelete}
                    onSignatureClick={onSignatureClick}
                    containerWidth={renderedDimensions.width}
                    containerHeight={renderedDimensions.height}
                  />
                ))}
              </div>
            </Page>
          </Document>
        </div>
      </div>
      <div className="pdf-info">
        <small>
          Page {pageNum} (Size: {pdfDimensions.width.toFixed(0)}×{pdfDimensions.height.toFixed(0)}pt)
        </small>
      </div>
    </div>
  );
}

export default PDFViewer;
