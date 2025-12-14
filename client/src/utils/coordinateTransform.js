/**
 * Transform CSS pixel coordinates to PDF points
 * This mirrors the backend transformation logic
 */
export function transformCoordinates(
  field,
  viewportWidth,
  viewportHeight,
  pdfWidth,
  pdfHeight
) {
  const scaleX = pdfWidth / viewportWidth;
  const scaleY = pdfHeight / viewportHeight;

  const pdfX = field.x * scaleX;
  const pdfY = pdfHeight - (field.y + field.height) * scaleY;

  const pdfWidthScaled = field.width * scaleX;
  const pdfHeightScaled = field.height * scaleY;

  return {
    x: pdfX,
    y: pdfY,
    width: pdfWidthScaled,
    height: pdfHeightScaled,
  };
}

/**
 * Calculate responsive anchor point as percentage
 * This ensures fields stay in correct position across different viewport sizes
 */
export function calculateAnchorPoint(
  field,
  viewportWidth,
  viewportHeight,
  pdfWidth,
  pdfHeight
) {
  const scaleX = pdfWidth / viewportWidth;
  const scaleY = pdfHeight / viewportHeight;

  const anchorX = (field.x * scaleX) / pdfWidth;
  const anchorY = (field.y * scaleY) / pdfHeight;

  return { anchorX, anchorY };
}

/**
 * Reconstruct position from anchor point
 */
export function reconstructFromAnchor(
  anchorX,
  anchorY,
  viewportWidth,
  viewportHeight,
  pdfWidth,
  pdfHeight
) {
  const scaleX = pdfWidth / viewportWidth;
  const scaleY = pdfHeight / viewportHeight;

  const x = (anchorX * pdfWidth) / scaleX;
  const y = (anchorY * pdfHeight) / scaleY;

  return { x, y };
}
