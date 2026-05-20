import fs from 'fs/promises';
import path from 'path';
import { getToolErrorMessage } from './tool-error';

/**
 * Reads a local file from the project directory.
 * Includes security checks to prevent directory traversal.
 * 
 * @param args Contains the relative path to the file.
 * @returns The file content as a string.
 */
export async function readFile(args: { path: string }): Promise<string> {
  try {
    // SECURITY: Absolute path resolution and containment check
    const fullPath = path.resolve(process.cwd(), args.path);
    
    if (!fullPath.startsWith(process.cwd())) {
      return "Error: Access denied. You can only read files within the project directory.";
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    return content.substring(0, 10000);
  } catch (error: unknown) {
    return `Failed to read file: ${getToolErrorMessage(error)}`;
  }
}

/**
 * Writes content to a local file in the project directory.
 * Includes security checks to prevent directory traversal.
 */
export async function writeFile(args: { path: string, content: string }): Promise<string> {
  try {
    // SECURITY: Absolute path resolution and containment check
    const fullPath = path.resolve(process.cwd(), args.path);
    
    if (!fullPath.startsWith(process.cwd())) {
      return "Error: Access denied. You can only write files within the project directory.";
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    await fs.writeFile(fullPath, args.content, 'utf-8');
    return `Successfully wrote to file: ${args.path}`;
  } catch (error: unknown) {
    return `Failed to write file: ${getToolErrorMessage(error)}`;
  }
}
