/**
 * TWB Workbook Manipulation Module
 * 
 * Re-exports stable functions from `tableau-rest-api.ts` to provide a clear module boundary
 * for TWB-related operations.
 */

export {
  getWorkbookXml,
  getWorkbookSummary,
  applyXmlModification,
  insertXml,
  getCachedWorkbook,
  updateCachedWorkbook,
  hasModifications,
  clearCache,
} from '../tableau-rest-api.js';

// Re-export types (if needed in future)
export interface WorkbookSummary {
  datasources: string[];
  worksheets: string[];
  dashboards: string[];
  parameters: string[];
  calculatedFields: string[];
  colors: string[];
  fonts: string[];
}
