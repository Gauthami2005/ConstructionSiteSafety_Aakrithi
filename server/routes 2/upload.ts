import { RequestHandler } from "express";
import { promises as fs } from "fs";
import path from "path";
import multer from "multer";
import { SaveUploadResponse, UploadEntry, UploadHistoryResponse, UploadedFileData, MLImagesResponse, MLImageData, UploadStatsResponse } from "@shared/api";

// Use process.cwd() for reliable path resolution in both dev and production
const DATA_DIR = path.join(process.cwd(), "server/data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const UPLOADS_FILE = path.join(DATA_DIR, "uploads.json");

// Configure multer for file storage - organize by upload ID
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadsDirectory();
    // Create a subdirectory for this upload batch (using timestamp)
    // Only create uploadId once per request (first file)
    if (!(req as any).uploadId) {
      (req as any).uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
    const uploadId = (req as any).uploadId;
    const uploadDir = path.join(UPLOADS_DIR, uploadId);
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename for easier identification
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    // Sanitize filename
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Ensure data directory exists
async function ensureDataDirectory(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Ensure uploads directory exists
async function ensureUploadsDirectory(): Promise<void> {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

// Helper function to read uploads from JSON file
async function readUploads(): Promise<UploadEntry[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(UPLOADS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is empty, return empty array
    return [];
  }
}

// Helper function to write uploads to JSON file
async function writeUploads(uploads: UploadEntry[]): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(UPLOADS_FILE, JSON.stringify(uploads, null, 2), "utf-8");
}

// Save upload data
export const handleSaveUpload: RequestHandler = async (req, res) => {
  try {
    // Extract form fields
    const constructionType = req.body.constructionType;
    const siteLocation = req.body.siteLocation;
    const supervisorName = req.body.supervisorName;
    const uploadDate = req.body.uploadDate;
    const notes = req.body.notes || "";

    // Validate required fields
    if (!constructionType || !siteLocation || !supervisorName) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: constructionType, siteLocation, supervisorName",
      } as SaveUploadResponse);
    }

    // Get uploaded files
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      } as SaveUploadResponse);
    }

    // Read existing uploads
    const uploads = await readUploads();

    // Get upload ID from request (set by multer destination)
    const uploadId = (req as any).uploadId || `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create file data entries with both relative and absolute paths
    const fileData: UploadedFileData[] = files.map((file, index) => {
      const relativePath = `uploads/${uploadId}/${file.filename}`;
      const absolutePath = path.join(UPLOADS_DIR, uploadId, file.filename);
      
      return {
        id: `file-${Date.now()}-${index}`,
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        path: relativePath, // Relative path for serving via API
        absolutePath: absolutePath, // Absolute path for ML model access
      };
    });

    // Create new upload entry
    const newUpload: UploadEntry = {
      id: uploadId,
      constructionType,
      siteLocation,
      supervisorName,
      uploadDate,
      notes,
      files: fileData,
      createdAt: new Date().toISOString(),
    };

    // Add to uploads array
    uploads.push(newUpload);

    // Write back to file
    await writeUploads(uploads);

    const response: SaveUploadResponse = {
      success: true,
      id: newUpload.id,
      message: "Upload saved successfully",
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error saving upload:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save upload",
    } as SaveUploadResponse);
  }
};

// Get upload history
export const handleGetUploadHistory: RequestHandler = async (_req, res) => {
  try {
    const uploads = await readUploads();

    // Sort by createdAt descending (newest first)
    uploads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const response: UploadHistoryResponse = {
      uploads,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error reading upload history:", error);
    res.status(500).json({
      uploads: [],
    } as UploadHistoryResponse);
  }
};

// Get all images with metadata for ML training/inference
export const handleGetMLImages: RequestHandler = async (_req, res) => {
  try {
    const uploads = await readUploads();
    
    // Flatten all images with their metadata
    const images: MLImageData[] = [];
    
    for (const upload of uploads) {
      for (const file of upload.files) {
        images.push({
          uploadId: upload.id,
          fileId: file.id,
          absolutePath: file.absolutePath,
          relativePath: file.path,
          metadata: {
            constructionType: upload.constructionType,
            siteLocation: upload.siteLocation,
            supervisorName: upload.supervisorName,
            uploadDate: upload.uploadDate,
            notes: upload.notes,
            createdAt: upload.createdAt,
          },
        });
      }
    }

    const response: MLImagesResponse = {
      images,
      total: images.length,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error getting ML images:", error);
    res.status(500).json({
      images: [],
      total: 0,
    } as MLImagesResponse);
  }
};

// Get images by upload ID
export const handleGetImagesByUploadId: RequestHandler = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const uploads = await readUploads();
    
    const upload = uploads.find((u) => u.id === uploadId);
    
    if (!upload) {
      return res.status(404).json({
        images: [],
        total: 0,
        message: "Upload not found",
      });
    }

    const images: MLImageData[] = upload.files.map((file) => ({
      uploadId: upload.id,
      fileId: file.id,
      absolutePath: file.absolutePath,
      relativePath: file.path,
      metadata: {
        constructionType: upload.constructionType,
        siteLocation: upload.siteLocation,
        supervisorName: upload.supervisorName,
        uploadDate: upload.uploadDate,
        notes: upload.notes,
        createdAt: upload.createdAt,
      },
    }));

    const response: MLImagesResponse = {
      images,
      total: images.length,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error getting images by upload ID:", error);
    res.status(500).json({
      images: [],
      total: 0,
    } as MLImagesResponse);
  }
};

// Get upload statistics
export const handleGetUploadStats: RequestHandler = async (_req, res) => {
  try {
    const uploads = await readUploads();
    
    const totalUploads = uploads.length;
    const totalImages = uploads.reduce((sum, upload) => sum + upload.files.length, 0);

    const response: UploadStatsResponse = {
      totalUploads,
      totalImages,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error getting upload stats:", error);
    res.status(500).json({
      totalUploads: 0,
      totalImages: 0,
    } as UploadStatsResponse);
  }
};

// Export multer middleware
export { upload };
