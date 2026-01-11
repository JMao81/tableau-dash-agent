/**
 * Tableau REST API Client
 * 
 * Handles authentication and workbook download/publish operations.
 * Uses Personal Access Token (PAT) authentication.
 * 
 * API Reference: https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api.htm
 */

import { unzipSync, strFromU8 } from 'fflate';

// In-memory storage for workbook data
interface WorkbookCache {
  workbookId: string;
  workbookName: string;
  projectId: string;
  projectName: string;
  siteId: string;
  xml: string;
  originalXml: string; // Keep original for diff
  lastModified: Date;
}

let cachedWorkbook: WorkbookCache | null = null;
let authToken: string | null = null;
let siteId: string | null = null;
let tokenExpiry: Date | null = null;

// ==================== TWBX EXTRACTION ====================

/**
 * Extract .twb XML from a .twbx package (ZIP file)
 */
async function extractTwbFromTwbx(arrayBuffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(arrayBuffer);
  
  // Unzip the .twbx file
  const unzipped = unzipSync(uint8Array);
  
  // Find the .twb file inside (usually at the root level)
  for (const [filename, content] of Object.entries(unzipped)) {
    if (filename.endsWith('.twb')) {
      // Convert Uint8Array to string
      return strFromU8(content as Uint8Array);
    }
  }
  
  throw new Error('No .twb file found inside .twbx package');
}

// ==================== AUTH ====================

interface AuthResponse {
  success: boolean;
  token?: string;
  siteId?: string;
  error?: string;
}

/**
 * Authenticate with Tableau Server/Cloud using PAT
 */
export async function authenticate(
  server: string,
  siteName: string,
  patName: string,
  patSecret: string
): Promise<AuthResponse> {
  // Check if we have a valid cached token
  if (authToken && tokenExpiry && new Date() < tokenExpiry) {
    return { success: true, token: authToken, siteId: siteId || undefined };
  }

  const url = `${server}/api/3.21/auth/signin`;
  
  const body = {
    credentials: {
      personalAccessTokenName: patName,
      personalAccessTokenSecret: patSecret,
      site: {
        contentUrl: siteName,
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Auth failed (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    
    authToken = data.credentials?.token;
    siteId = data.credentials?.site?.id;
    // Token expires in ~240 minutes, refresh at 200 minutes
    tokenExpiry = new Date(Date.now() + 200 * 60 * 1000);

    if (!authToken || !siteId) {
      return {
        success: false,
        error: 'Auth response missing token or site ID',
      };
    }

    return {
      success: true,
      token: authToken,
      siteId: siteId,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Sign out and clear cached token
 */
export async function signOut(server: string): Promise<void> {
  if (!authToken) return;

  try {
    await fetch(`${server}/api/3.21/auth/signout`, {
      method: 'POST',
      headers: {
        'X-Tableau-Auth': authToken,
      },
    });
  } catch {
    // Ignore signout errors
  }

  authToken = null;
  siteId = null;
  tokenExpiry = null;
}

// ==================== WORKBOOK OPERATIONS ====================

interface DownloadResult {
  success: boolean;
  workbook?: WorkbookCache;
  error?: string;
}

/**
 * Download a workbook from Tableau Server/Cloud
 */
export async function downloadWorkbook(
  server: string,
  workbookId: string
): Promise<DownloadResult> {
  if (!authToken || !siteId) {
    return { success: false, error: 'Not authenticated. Call authenticate() first.' };
  }

  try {
    // First get workbook metadata
    const metaUrl = `${server}/api/3.21/sites/${siteId}/workbooks/${workbookId}`;
    const metaResponse = await fetch(metaUrl, {
      headers: {
        'X-Tableau-Auth': authToken,
        'Accept': 'application/json',
      },
    });

    if (!metaResponse.ok) {
      return {
        success: false,
        error: `Failed to get workbook metadata: ${metaResponse.status}`,
      };
    }

    const metadata = await metaResponse.json();
    const workbookName = metadata.workbook?.name || 'Unknown';
    const projectId = metadata.workbook?.project?.id || '';
    const projectName = metadata.workbook?.project?.name || '';

    // Download workbook content (XML)
    // Note: For .twbx files, we get a ZIP. For .twb, we get XML.
    // Using includeExtract=false to get just the .twb
    const contentUrl = `${server}/api/3.21/sites/${siteId}/workbooks/${workbookId}/content?includeExtract=false`;
    const contentResponse = await fetch(contentUrl, {
      headers: {
        'X-Tableau-Auth': authToken,
      },
    });

    if (!contentResponse.ok) {
      return {
        success: false,
        error: `Failed to download workbook: ${contentResponse.status}`,
      };
    }

    // Check content type - could be XML or ZIP
    const contentType = contentResponse.headers.get('content-type') || '';
    let xml: string;

    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      // Direct XML (.twb)
      xml = await contentResponse.text();
    } else if (contentType.includes('application/zip') || contentType.includes('application/octet-stream')) {
      // It's a .twbx package - extract the .twb from the ZIP
      try {
        const arrayBuffer = await contentResponse.arrayBuffer();
        xml = await extractTwbFromTwbx(arrayBuffer);
      } catch (extractError) {
        return {
          success: false,
          error: `Failed to extract .twb from .twbx package: ${extractError instanceof Error ? extractError.message : String(extractError)}`,
        };
      }
    } else {
      // Try to read as text anyway
      xml = await contentResponse.text();
    }

    // Validate it looks like Tableau XML
    if (!xml.includes('<workbook') && !xml.includes('<?xml')) {
      return {
        success: false,
        error: 'Downloaded content does not appear to be valid Tableau workbook XML',
      };
    }

    // Cache the workbook
    cachedWorkbook = {
      workbookId,
      workbookName,
      projectId,
      projectName,
      siteId,
      xml,
      originalXml: xml,
      lastModified: new Date(),
    };

    return {
      success: true,
      workbook: cachedWorkbook,
    };
  } catch (error) {
    return {
      success: false,
      error: `Download error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Search for a workbook by name
 */
export async function findWorkbook(
  server: string,
  workbookName: string,
  projectName?: string
): Promise<{ success: boolean; workbookId?: string; workbooks?: unknown[]; error?: string }> {
  if (!authToken || !siteId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    let filter = `name:eq:${workbookName}`;
    if (projectName) {
      filter += `,projectName:eq:${projectName}`;
    }

    const url = `${server}/api/3.21/sites/${siteId}/workbooks?filter=${encodeURIComponent(filter)}`;
    const response = await fetch(url, {
      headers: {
        'X-Tableau-Auth': authToken,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Search failed: ${response.status}`,
      };
    }

    const data = await response.json();
    const workbooks = data.workbooks?.workbook || [];

    if (workbooks.length === 0) {
      return {
        success: false,
        error: `No workbook found with name "${workbookName}"${projectName ? ` in project "${projectName}"` : ''}`,
      };
    }

    if (workbooks.length === 1) {
      return {
        success: true,
        workbookId: workbooks[0].id,
      };
    }

    // Multiple matches
    return {
      success: true,
      workbooks: workbooks.map((w: { id: string; name: string; project?: { name: string }; updatedAt?: string }) => ({
        id: w.id,
        name: w.name,
        project: w.project?.name,
        updatedAt: w.updatedAt,
      })),
      error: `Multiple workbooks found. Please specify project name or use workbook ID.`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Search error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== XML MODIFICATION ====================

/**
 * Get the currently cached workbook
 */
export function getCachedWorkbook(): WorkbookCache | null {
  return cachedWorkbook;
}

/**
 * Update the cached workbook XML
 */
export function updateCachedWorkbook(newXml: string): boolean {
  if (!cachedWorkbook) {
    return false;
  }
  cachedWorkbook.xml = newXml;
  cachedWorkbook.lastModified = new Date();
  return true;
}

/**
 * Apply an XML modification to the cached workbook
 * Uses simple string replacement - for complex ops, use DOMParser in browser
 */
export function applyXmlModification(
  searchPattern: string | RegExp,
  replacement: string
): { success: boolean; error?: string } {
  if (!cachedWorkbook) {
    return { success: false, error: 'No workbook loaded' };
  }

  try {
    if (typeof searchPattern === 'string') {
      if (!cachedWorkbook.xml.includes(searchPattern)) {
        return { success: false, error: `Pattern not found: ${searchPattern.substring(0, 50)}...` };
      }
      cachedWorkbook.xml = cachedWorkbook.xml.replace(searchPattern, replacement);
    } else {
      cachedWorkbook.xml = cachedWorkbook.xml.replace(searchPattern, replacement);
    }
    cachedWorkbook.lastModified = new Date();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Modification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Insert XML content at a specific location
 */
export function insertXml(
  afterPattern: string,
  xmlToInsert: string
): { success: boolean; error?: string } {
  if (!cachedWorkbook) {
    return { success: false, error: 'No workbook loaded' };
  }

  const index = cachedWorkbook.xml.indexOf(afterPattern);
  if (index === -1) {
    return { success: false, error: `Insertion point not found: ${afterPattern.substring(0, 50)}...` };
  }

  const insertPosition = index + afterPattern.length;
  cachedWorkbook.xml = 
    cachedWorkbook.xml.substring(0, insertPosition) + 
    '\n' + xmlToInsert + 
    cachedWorkbook.xml.substring(insertPosition);
  
  cachedWorkbook.lastModified = new Date();
  return { success: true };
}

// ==================== PUBLISH ====================

interface PublishResult {
  success: boolean;
  workbookId?: string;
  workbookUrl?: string;
  error?: string;
}

/**
 * Publish the modified workbook back to Tableau Server/Cloud
 */
export async function publishWorkbook(
  server: string,
  options: {
    mode: 'overwrite' | 'new';
    newName?: string;
    projectId?: string;
    description?: string;
  }
): Promise<PublishResult> {
  if (!authToken || !siteId) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!cachedWorkbook) {
    return { success: false, error: 'No workbook loaded. Use download-workbook first.' };
  }

  try {
    const workbookName = options.newName || cachedWorkbook.workbookName;
    const projectId = options.projectId || cachedWorkbook.projectId;
    
    // Build multipart form data
    // Tableau REST API requires multipart upload for workbooks
    const boundary = `----TableauBoundary${Date.now()}`;
    
    // Workbook metadata (request_payload)
    const requestPayload = {
      workbook: {
        name: workbookName,
        project: { id: projectId },
        ...(options.description ? { description: options.description } : {}),
      },
    };

    // Build multipart body
    let body = '';
    
    // Request payload part
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: name="request_payload"\r\n';
    body += 'Content-Type: application/json\r\n\r\n';
    body += JSON.stringify(requestPayload);
    body += '\r\n';
    
    // Workbook content part
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: name="tableau_workbook"; filename="${workbookName}.twb"\r\n`;
    body += 'Content-Type: application/octet-stream\r\n\r\n';
    body += cachedWorkbook.xml;
    body += '\r\n';
    body += `--${boundary}--\r\n`;

    // Determine URL based on mode
    let url: string;
    if (options.mode === 'overwrite') {
      // PUT to update existing workbook
      url = `${server}/api/3.21/sites/${siteId}/workbooks/${cachedWorkbook.workbookId}?overwrite=true`;
    } else {
      // POST to create new workbook
      url = `${server}/api/3.21/sites/${siteId}/workbooks?overwrite=false`;
    }

    const response = await fetch(url, {
      method: options.mode === 'overwrite' ? 'PUT' : 'POST',
      headers: {
        'X-Tableau-Auth': authToken,
        'Content-Type': `multipart/mixed; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Publish failed (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    const publishedWorkbook = data.workbook;

    return {
      success: true,
      workbookId: publishedWorkbook?.id,
      workbookUrl: publishedWorkbook?.webpageUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: `Publish error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get the modified workbook XML for local download
 */
export function getWorkbookXml(): { success: boolean; xml?: string; filename?: string; error?: string } {
  if (!cachedWorkbook) {
    return { success: false, error: 'No workbook loaded' };
  }

  return {
    success: true,
    xml: cachedWorkbook.xml,
    filename: `${cachedWorkbook.workbookName}_modified.twb`,
  };
}

/**
 * Check if there are unsaved modifications
 */
export function hasModifications(): boolean {
  if (!cachedWorkbook) return false;
  return cachedWorkbook.xml !== cachedWorkbook.originalXml;
}

/**
 * Get a summary of the cached workbook
 */
export function getWorkbookSummary(): {
  loaded: boolean;
  workbookId?: string;
  workbookName?: string;
  projectName?: string;
  hasModifications?: boolean;
  lastModified?: Date;
} {
  if (!cachedWorkbook) {
    return { loaded: false };
  }

  return {
    loaded: true,
    workbookId: cachedWorkbook.workbookId,
    workbookName: cachedWorkbook.workbookName,
    projectName: cachedWorkbook.projectName,
    hasModifications: cachedWorkbook.xml !== cachedWorkbook.originalXml,
    lastModified: cachedWorkbook.lastModified,
  };
}

/**
 * Clear the cached workbook
 */
export function clearCache(): void {
  cachedWorkbook = null;
}
