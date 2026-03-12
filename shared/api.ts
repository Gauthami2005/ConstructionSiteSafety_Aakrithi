/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Upload data types
 */
export interface UploadedFileData {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string; // relative path for serving (e.g., "uploads/upload-123/image.jpg")
  absolutePath: string; // absolute file system path for ML model access
}

export interface UploadEntry {
  id: string;
  constructionType: string;
  siteLocation: string;
  supervisorName: string;
  uploadDate: string;
  notes: string;
  files: UploadedFileData[];
  createdAt: string; // ISO timestamp
}

export interface UploadHistoryResponse {
  uploads: UploadEntry[];
}

export interface MLImageData {
  uploadId: string;
  fileId: string;
  absolutePath: string;
  relativePath: string;
  metadata: {
    constructionType: string;
    siteLocation: string;
    supervisorName: string;
    uploadDate: string;
    notes: string;
    createdAt: string;
  };
}

export interface MLImagesResponse {
  images: MLImageData[];
  total: number;
}

// Note: SaveUploadRequest is now sent as FormData, not JSON
// Fields: constructionType, siteLocation, supervisorName, uploadDate, notes, files (multiple files)

export interface SaveUploadResponse {
  success: boolean;
  id: string;
  message: string;
}

export interface UploadStatsResponse {
  totalUploads: number;
  totalImages: number;
}

/**
 * Worker Health data types
 */
export interface WorkerHealthEntry {
  id: string;
  workerName: string;
  workerId: string; // Employee ID or unique identifier
  age: number; // Age of the worker
  totalHoursWorked: number; // Total number of hours worked
  date: string; // Date of health check (ISO format)
  siteLocation: string;
  supervisorName: string;
  healthConditions: string[]; // Array of health conditions
  medications?: string; // Optional medications
  allergies?: string; // Optional allergies
  emergencyContact?: string; // Optional emergency contact
  emergencyPhone?: string; // Optional emergency phone
  notes?: string; // Additional notes
  createdAt: string; // ISO timestamp
  riskScore?: number; // Risk evaluation score (0-100)
  alertLevel?: "ok" | "watch" | "warning" | "critical"; // Risk alert level
  riskReasons?: string[]; // Reasons for risk score
  recommendedActions?: string[]; // Recommended actions based on risk
}

export interface WorkerHealthRequest {
  workerName: string;
  workerId: string;
  age: number;
  totalHoursWorked: number;
  date: string;
  siteLocation: string;
  supervisorName: string;
  healthConditions: string[];
  medications?: string;
  allergies?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
}

export interface WorkerHealthResponse {
  success: boolean;
  id: string;
  message: string;
}

export interface WorkerHealthHistoryResponse {
  workers: WorkerHealthEntry[];
}

export interface WorkerHealthStatsResponse {
  totalWorkers: number;
  totalRecords: number;
}

/**
 * Alert data types
 */
export interface AlertEntry {
  id: string;
  workerId: string;
  workerName: string;
  alertLevel: "ok" | "watch" | "warning" | "critical";
  riskScore: number;
  riskReasons: string[];
  recommendedActions: string[];
  timestamp: string;
  siteLocation: string;
  supervisorName: string;
}

export interface AlertsResponse {
  alerts: AlertEntry[];
}

/**
 * Weather / Rainy sites types
 */
export interface RainySite {
  siteLocation: string;
  firstRainAt?: string; // ISO string when rain is first predicted
  probability?: number; // POP (0-1) from forecast if available
  rainVolumeMm?: number; // Accumulated rain volume (mm) for the forecast slot
}

export interface RainySitesResponse {
  hours: number; // lookahead window in hours
  locations: RainySite[]; // only locations predicted to have rain within the window
}

/**
 * ML Webcam alert types
 */
export interface MlAlertEntry {
  id: string;
  timestamp: string; // ISO
  classes: string[]; // detected unsafe classes, e.g., ["no_helmet", "no_mask"]
  primary?: string; // primary unsafe class
  siteLocation?: string; // e.g., "Live Webcam"
  level?: "watch" | "warning" | "critical";
  message?: string;
}

export interface MlAlertsResponse {
  alerts: MlAlertEntry[];
}
