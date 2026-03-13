import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { handleStartWebcam, handleStopWebcam, handleGetMlAlerts } from "./routes/ml";
import { handleSaveWorkerHealth, handleGetWorkerHealthHistory, handleGetWorkerHealthStats, handleGetAlerts } from "./routes 2/workers";
import { handleSaveUpload, handleGetUploadHistory, handleGetUploadStats, handleGetMLImages, upload } from "./routes 2/upload";
import { handleGetRainySites } from "./routes 2/weather";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded images statically
  const uploadsDir = path.join(process.cwd(), "server/data/uploads");
  app.use("/api/uploads", express.static(uploadsDir));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Worker Health routes
  app.post("/api/workers", handleSaveWorkerHealth);
  app.get("/api/workers", handleGetWorkerHealthHistory);
  app.get("/api/workers/stats", handleGetWorkerHealthStats);
  app.get("/api/workers/alerts", handleGetAlerts);

  // Upload routes
  app.post("/api/upload", upload.array("images"), handleSaveUpload);
  app.get("/api/upload", handleGetUploadHistory);
  app.get("/api/upload/stats", handleGetUploadStats);
  app.get("/api/upload/ml-images", handleGetMLImages);

  // Weather routes
  app.get("/api/weather/rainy-sites", handleGetRainySites);

  // ML webcam control routes
  app.get("/api/ml/start-webcam", handleStartWebcam);
  app.post("/api/ml/stop-webcam", handleStopWebcam);
  app.get("/api/ml/alerts", handleGetMlAlerts);

  return app;
}
