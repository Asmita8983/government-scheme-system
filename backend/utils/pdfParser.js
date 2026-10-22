const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");

/**
 * Extracts text from a PDF buffer.
 * If the PDF is digital, pdf-parse will extract the text.
 * If the PDF is scanned (low text count), it would ideally use OCR.
 * Note: Real PDF-to-Image-to-OCR requires heavy dependencies like Poppler.
 * This implementation provides the logic structure for both.
 */
const extractText = async (buffer) => {
  try {
    console.log("Starting text extraction... Buffer size:", buffer.length);

    // Check if it's actually a PDF
    const isPDF = buffer.slice(0, 4).toString() === '%PDF';
    console.log("Document is PDF:", isPDF);

    let text = "";

    if (isPDF) {
      // 1. Try digital extraction for PDFs
      try {
        console.log("Calling pdf-parse...");
        const data = await pdfParse(buffer);
        text = data.text || "";
        console.log("Digital extraction complete. Word count:", text.split(/\s+/).length);
      } catch (pdfErr) {
        console.error("pdf-parse CRASHED:", pdfErr.message);
        if (pdfErr.stack) console.error(pdfErr.stack);
      }
    }

    // 2. OCR Fallback logic
    if (!text || text.trim().length < 50) {
      if (isPDF) {
        console.log("Digital extraction yielded low text. PDF might be scanned.");
        if (!text) throw new Error("This PDF appears to be scanned or empty. OCR for PDF requires additional system libraries.");
      } else {
        console.log("Attempting direct OCR on image buffer...");
        const { data: { text: ocrText } } = await Tesseract.recognize(
          buffer,
          'eng'
        );
        text = ocrText;
        console.log("OCR complete. Word count:", text ? text.split(/\s+/).length : 0);
      }
    }

    return text;
  } catch (error) {
    console.error("Extraction error details:", error);
    if (error.stack) console.error(error.stack);
    throw new Error(error.message || "Could not extract text from document");
  }
};

module.exports = extractText;
