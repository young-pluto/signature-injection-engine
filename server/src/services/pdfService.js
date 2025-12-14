const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs").promises;
const path = require("path");

/**
 * Transform CSS pixel coordinates to PDF points
 *
 * @param {Object} field - Field object with position and size in CSS pixels
 * @param {number} viewportWidth - Browser viewport width in pixels
 * @param {number} viewportHeight - Browser viewport height in pixels
 * @param {number} pdfWidth - PDF page width in points (72 DPI)
 * @param {number} pdfHeight - PDF page height in points (72 DPI)
 * @returns {Object} Transformed coordinates in PDF points
 */
/**
 * Transform Percentage coordinates to PDF points
 *
 * @param {Object} field - Field object with position and size in Percentages (0-100)
 * @param {number} pdfWidth - PDF page width in points (72 DPI)
 * @param {number} pdfHeight - PDF page height in points (72 DPI)
 * @returns {Object} Transformed coordinates in PDF points
 */
function transformCoordinates(field, pdfWidth, pdfHeight) {
  // Field x, y, width, height are percentages (0-100)
  // PDF uses bottom-left origin, so Y is flippped based on percentage from top

  // Calculate raw dimensions in PDF points
  const widthPoints = (field.width / 100) * pdfWidth;
  const heightPoints = (field.height / 100) * pdfHeight;

  // Calculate X position
  const xPoints = (field.x / 100) * pdfWidth;

  // Calculate Y position (PDF is bottom-up)
  // field.y is % from TOP.
  // So yPoints = pdfHeight - ((field.y / 100) * pdfHeight) - heightPoints;
  const yPoints = pdfHeight - (field.y / 100) * pdfHeight - heightPoints;

  return {
    x: xPoints,
    y: yPoints,
    width: widthPoints,
    height: heightPoints,
  };
}

/**
 * Calculate aspect ratio fit for signature image within box
 *
 * @param {number} boxWidth - Width of the signature box
 * @param {number} boxHeight - Height of the signature box
 * @param {number} imgWidth - Width of the signature image
 * @param {number} imgHeight - Height of the signature image
 * @returns {Object} Final dimensions and offsets for centered image
 */
function calculateAspectRatioFit(boxWidth, boxHeight, imgWidth, imgHeight) {
  const boxAspect = boxWidth / boxHeight;
  const imgAspect = imgWidth / imgHeight;

  let finalWidth, finalHeight, offsetX, offsetY;

  if (imgAspect > boxAspect) {
    // Image is wider - fit to width
    finalWidth = boxWidth;
    finalHeight = boxWidth / imgAspect;
    offsetX = 0;
    offsetY = (boxHeight - finalHeight) / 2;
  } else {
    // Image is taller - fit to height
    finalHeight = boxHeight;
    finalWidth = boxHeight * imgAspect;
    offsetX = (boxWidth - finalWidth) / 2;
    offsetY = 0;
  }

  return { finalWidth, finalHeight, offsetX, offsetY };
}

/**
 * Sign PDF with signature and fields
 *
 * @param {Buffer} pdfBuffer - Original PDF file buffer
 * @param {Array} fields - Array of field objects with positions and data
 * @param {Object} viewport - Viewport dimensions {width, height}
 * @returns {Buffer} Signed PDF buffer
 */
async function signPDF(pdfBuffer, fields, viewport) {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    // Group fields by page for efficiency
    const fieldsByPage = fields.reduce((acc, field) => {
      const pageNum = field.page || 1; // Default to page 1
      if (!acc[pageNum]) acc[pageNum] = [];
      acc[pageNum].push(field);
      return acc;
    }, {});

    // Process fields for each page
    for (const [pageNum, pageFields] of Object.entries(fieldsByPage)) {
      const pageIndex = parseInt(pageNum) - 1;

      if (pageIndex < 0 || pageIndex >= pages.length) {
        console.warn(`Page ${pageNum} out of range, skipping fields`);
        continue;
      }

      const page = pages[pageIndex];
      // Get PDF dimensions for THIS page
      const { width: pdfWidth, height: pdfHeight } = page.getSize();

      for (const field of pageFields) {
        // Transform coordinates from Percentages to PDF points
        const transformed = transformCoordinates(field, pdfWidth, pdfHeight);

        if (
          (field.type === "signature" || field.type === "image") &&
          field.imageData
        ) {
          // Handle signature/image
          const imageBytes = Buffer.from(
            field.imageData.split(",")[1],
            "base64"
          );

          let image;
          if (field.imageData.startsWith("data:image/png")) {
            image = await pdfDoc.embedPng(imageBytes);
          } else if (
            field.imageData.startsWith("data:image/jpeg") ||
            field.imageData.startsWith("data:image/jpg")
          ) {
            image = await pdfDoc.embedJpg(imageBytes);
          } else {
            console.warn("Unsupported image format, skipping field");
            continue;
          }

          const imgDims = image.scale(1);
          const { finalWidth, finalHeight, offsetX, offsetY } =
            calculateAspectRatioFit(
              transformed.width,
              transformed.height,
              imgDims.width,
              imgDims.height
            );

          page.drawImage(image, {
            x: transformed.x + offsetX,
            y: transformed.y + offsetY,
            width: finalWidth,
            height: finalHeight,
          });
        } else if (field.type === "text" && field.text) {
          page.drawText(field.text, {
            x: transformed.x + 2,
            y: transformed.y + transformed.height - 12, // Align text near top
            size: 10,
            color: rgb(0, 0, 0),
            maxWidth: transformed.width,
          });
        } else if (field.type === "date" && field.date) {
          page.drawText(field.date, {
            x: transformed.x + 2,
            y: transformed.y + transformed.height - 12,
            size: 10,
            color: rgb(0, 0, 0),
          });
        } else if (field.type === "checkbox" || field.type === "radio") {
          // Draw box
          page.drawRectangle({
            x: transformed.x,
            y: transformed.y,
            width: transformed.width,
            height: transformed.height,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
            // If checked, fill or draw checkmark
          });

          if (field.checked) {
            // Draw simple checkmark or fill
            if (field.type === "radio") {
              // Draw circle fill
              page.drawEllipse({
                x: transformed.x + transformed.width / 2,
                y: transformed.y + transformed.height / 2,
                xScale: transformed.width / 3,
                yScale: transformed.height / 3,
                color: rgb(0, 0, 0),
              });
            } else {
              // Draw Checkmark (✓)
              // Start (left-mid) -> Bottom-mid -> Top-right
              page.drawLine({
                start: {
                  x: transformed.x + transformed.width * 0.2,
                  y: transformed.y + transformed.height * 0.5,
                },
                end: {
                  x: transformed.x + transformed.width * 0.45,
                  y: transformed.y + transformed.height * 0.2,
                },
                thickness: 1.5,
                color: rgb(0, 0, 0),
              });
              page.drawLine({
                start: {
                  x: transformed.x + transformed.width * 0.45,
                  y: transformed.y + transformed.height * 0.2,
                },
                end: {
                  x: transformed.x + transformed.width * 0.8,
                  y: transformed.y + transformed.height * 0.8,
                },
                thickness: 1.5,
                color: rgb(0, 0, 0),
              });
            }
          }
        }
      }
    }

    // Save and return the modified PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Error signing PDF:", error);
    throw error;
  }
}

/**
 * Save PDF buffer to file system
 */
async function savePDF(pdfBuffer, filename) {
  const uploadsDir = path.join(__dirname, "../../uploads");
  const filePath = path.join(uploadsDir, filename);

  // Ensure directory exists
  await fs.mkdir(uploadsDir, { recursive: true });

  await fs.writeFile(filePath, pdfBuffer);
  return filePath;
}

module.exports = {
  signPDF,
  savePDF,
  transformCoordinates,
  calculateAspectRatioFit,
};
