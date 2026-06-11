import fs from 'fs/promises';
import path from 'path';
import { getToolErrorMessage } from './tool-error';

const PROJECT_ROOT = path.resolve(process.cwd());

const PRODUCTION_READ_ALLOWLIST = [
  'README.md',
  'src/shared/jarvish.constants.ts',
  'src/backend/agent/nodes/registry.ts',
  'src/backend/agent/tools/tool.schemas.ts',
  'src/backend/agent/tools/tool-executor.ts',
] as const;

const PRODUCTION_READ_DIR_ALLOWLIST = [
  'docs',
] as const;

const ACCESS_DENIED_READ = "Error: Access denied. You can only read approved project files.";
const ACCESS_DENIED_WRITE = "Error: Access denied. File writing is disabled in production.";

type LocalFilePolicyResult = {
  allowed: boolean;
  fullPath?: string;
  relativePath?: string;
  reason?: string;
};

export function isProductionFileToolMode(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function canExposeWriteFileTool(): boolean {
  return !isProductionFileToolMode();
}

export function resolveLocalProjectPath(requestedPath: string): LocalFilePolicyResult {
  const fullPath = path.resolve(PROJECT_ROOT, requestedPath);
  const relativePath = path.relative(PROJECT_ROOT, fullPath);

  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return { allowed: false, reason: "Path is outside the project directory." };
  }

  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const segments = normalizedRelativePath.split('/');

  if (segments.some(isBlockedHiddenSegment)) {
    return { allowed: false, reason: "Hidden and environment files are not accessible." };
  }

  return {
    allowed: true,
    fullPath,
    relativePath: normalizedRelativePath,
  };
}

export function canReadLocalProjectFile(requestedPath: string): LocalFilePolicyResult {
  const resolved = resolveLocalProjectPath(requestedPath);

  if (!resolved.allowed || !resolved.relativePath) {
    return resolved;
  }

  if (!isProductionFileToolMode()) {
    return resolved;
  }

  if (isProductionReadAllowed(resolved.relativePath)) {
    return resolved;
  }

  return { allowed: false, reason: "File is not in the production read allowlist." };
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

function isBlockedHiddenSegment(segment: string): boolean {
  return segment === '.env' || segment.startsWith('.env.') || segment.startsWith('.');
}

function isProductionReadAllowed(relativePath: string): boolean {
  if (PRODUCTION_READ_ALLOWLIST.includes(relativePath as typeof PRODUCTION_READ_ALLOWLIST[number])) {
    return true;
  }

  return PRODUCTION_READ_DIR_ALLOWLIST.some((directory) => (
    relativePath === directory || relativePath.startsWith(`${directory}/`)
  ));
}

/**
 * Reads a local file from the project directory.
 * Includes security checks to prevent directory traversal.
 * 
 * @param args Contains the relative path to the file.
 * @returns The file content as a string.
 */
export async function readFile(args: { path: string }): Promise<string> {
  try {
    const policy = canReadLocalProjectFile(args.path);

    if (!policy.allowed || !policy.fullPath) {
      return ACCESS_DENIED_READ;
    }

    const content = await fs.readFile(policy.fullPath, 'utf-8');
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
    if (isProductionFileToolMode()) {
      return ACCESS_DENIED_WRITE;
    }

    const policy = resolveLocalProjectPath(args.path);

    if (!policy.allowed || !policy.fullPath) {
      return "Error: Access denied. You can only write files within the project directory.";
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(policy.fullPath), { recursive: true });
    
    await fs.writeFile(policy.fullPath, args.content, 'utf-8');
    return `Successfully wrote to file: ${args.path}`;
  } catch (error: unknown) {
    return `Failed to write file: ${getToolErrorMessage(error)}`;
  }
}
