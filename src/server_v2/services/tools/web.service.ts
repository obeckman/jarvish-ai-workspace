/**
 * Fetches and cleans the text content from a given URL.
 * 
 * @param args Contains the URL to fetch.
 * @returns The cleaned text content of the page, truncated to stay within context limits.
 */
export async function fetchWebPage(args: { url: string }): Promise<string> {
  try {
    const response = await fetch(args.url);
    const html = await response.text();
    
    // Perform basic tag stripping to minimize token count while preserving meaning.
    // We remove script/style tags and then strip all other HTML tags.
    const text = html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Return the first 5000 characters to prevent context window overflow.
    return text.substring(0, 5000);
  } catch (error: any) {
    return `Failed to fetch page: ${error.message}`;
  }
}
