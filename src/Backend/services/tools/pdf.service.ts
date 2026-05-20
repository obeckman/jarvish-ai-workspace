import { PDFParse } from 'pdf-parse';
import { getToolErrorMessage } from './tool-error';

/**
 * Downloads a PDF from a URL and extracts its text content.
 * 
 * @param args Contains the URL of the PDF.
 * @returns The extracted text content, truncated for efficiency.
 */
export async function readPdf(args: { url: string }): Promise<string> {
  try {
    const response = await fetch(args.url);
    const arrayBuffer = await response.arrayBuffer();
    
    // We instantiate the PDFParse engine with the raw buffer
    const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
    const result = await parser.getText();
    
    // Cleanup the parser resources
    await parser.destroy();
    
    // Return a generous chunk of the text (up to 10k chars)
    return result.text.substring(0, 10000);
  } catch (error: unknown) {
    return `Failed to read PDF: ${getToolErrorMessage(error)}`;
  }
}
