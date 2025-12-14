import React from 'react';
import { Rnd } from 'react-rnd';
import './DraggableField.css';

function DraggableField({ field, onUpdate, onDelete, onSignatureClick, containerWidth, containerHeight }) {
  // Convert percentage (store) to pixels (render)
  const getPixelValues = () => {
    if (!containerWidth || !containerHeight) return { x: 0, y: 0, width: 100, height: 50 };
    return {
      x: (field.x / 100) * containerWidth,
      y: (field.y / 100) * containerHeight,
      width: (field.width / 100) * containerWidth,
      height: (field.height / 100) * containerHeight,
    };
  };

  const { x, y, width, height } = getPixelValues();

  const handleDragStop = (e, d) => {
    // Convert pixels (dragged) back to percentage (store)
    if (containerWidth && containerHeight) {
      const xPercent = (d.x / containerWidth) * 100;
      const yPercent = (d.y / containerHeight) * 100;
      onUpdate(field.id, { x: xPercent, y: yPercent });
    }
  };

  const handleResizeStop = (e, direction, ref, delta, position) => {
    // Convert pixels (resized) back to percentage (store)
    if (containerWidth && containerHeight) {
      const widthPercent = (parseInt(ref.style.width) / containerWidth) * 100;
      const heightPercent = (parseInt(ref.style.height) / containerHeight) * 100;
      const xPercent = (position.x / containerWidth) * 100;
      const yPercent = (position.y / containerHeight) * 100;
      
      onUpdate(field.id, {
        width: widthPercent,
        height: heightPercent,
        x: xPercent,
        y: yPercent
      });
    }
  };

  const getFieldIcon = () => {
    switch (field.type) {
      case 'signature': return '✍️';
      case 'text': return '📝';
      case 'date': return '📅';
      default: return '📄';
    }
  };

  const handleContentBlur = (e) => {
    const text = e.target.innerText;
    if (field.type === 'text') {
      onUpdate(field.id, { text });
    } else if (field.type === 'date') {
      onUpdate(field.id, { date: text });
    }
  };

  // Show drag handle for text, date, signature AND image fields (text-like or block-like)
  // Checkbox/Radio are small, maybe no handle needed? Or yes for consistency?
  // User asked for consistency. Let's add handles for all content types that might need clear dragging.
  const showDragHandle = true; // Uniform experience requested
  const isEditable = field.type === 'text' || field.type === 'date';

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate(field.id, { imageData: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderContent = () => {
    switch (field.type) {
      case 'signature':
        return field.imageData ? (
          <img src={field.imageData} alt="Signature" className="signature-preview" style={{ pointerEvents: 'none' }} />
        ) : (
          <div className="empty-field-placeholder">
            <span className="field-icon">✍️</span>
            <span className="field-label">Sign</span>
          </div>
        );
      
      case 'image':
        return field.imageData ? (
          <img src={field.imageData} alt="Uploaded" className="image-preview" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
        ) : (
          <label className="empty-field-placeholder" style={{ cursor: 'pointer' }}>
            <span className="field-icon">🖼️</span>
            <span className="field-label">Image</span>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
        );

      case 'checkbox':
        return (
          <div 
            className={`checkbox-field ${field.checked ? 'checked' : ''}`}
            onClick={(e) => {
              e.stopPropagation(); // Prevent drag
              onUpdate(field.id, { checked: !field.checked });
            }}
            style={{ 
              width: '100%', height: '100%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #333', borderRadius: '4px', background: field.checked ? '#333' : 'transparent',
              cursor: 'pointer'
            }}
          >
            {field.checked && <span style={{ color: 'white', fontSize: '18px' }}>✓</span>}
          </div>
        );

      case 'radio':
        return (
          <div 
            className={`radio-field ${field.checked ? 'checked' : ''}`}
            onClick={(e) => {
              e.stopPropagation(); 
              onUpdate(field.id, { checked: !field.checked });
            }}
            style={{ 
              width: '100%', height: '100%', 
              border: '2px solid #333', borderRadius: '50%', 
              background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
             {field.checked && <div style={{ width: '60%', height: '60%', borderRadius: '50%', background: '#333' }} />}
          </div>
        );

      case 'text':
      case 'date':
      default:
        return (
          <div 
            className="editable-content"
            contentEditable={true}
            suppressContentEditableWarning={true}
            onBlur={handleContentBlur}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', height: '100%', cursor: 'text', outline: 'none' }}
          >
            {field.type === 'text' ? (field.text || 'Type...') : (field.date || 'Date')}
          </div>
        );
    }
  };
  
  // Don't render until we have dimensions to avoid jump
  if (!containerWidth) return null;

  return (
    <Rnd
      size={{ width, height }}
      position={{ x, y }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      bounds="parent"
      className="draggable-field"
      minWidth={30}
      minHeight={30}
      cancel=".delete-field, .editable-content, .checkbox-field, .radio-field" 
      dragHandleClassName="drag-handle" 
    >
      <div 
        className={`field-content field-${field.type} ${field.imageData ? 'has-image' : ''}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
             const isEditing = document.activeElement.classList.contains('editable-content');
             if (!isEditing) onDelete(field.id);
          }
        }}
        onClick={() => {
          if (field.type === 'signature' && !field.imageData) {
            onSignatureClick(field.id);
          }
        }}
      >
        <div className="drag-handle" title="Drag to move">
          ✥
        </div>
        
        {renderContent()}
        
        <button 
          className="delete-field"
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Deleting field:', field.id);
            onDelete(field.id);
          }}
          title="Delete field"
        >
          ×
        </button>
      </div>
    </Rnd>
  );
}

export default DraggableField;
