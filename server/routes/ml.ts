import type { Request, Response } from "express";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";

// Keep multiple running process references
const webcamProcs = new Map<string, ChildProcessWithoutNullStreams>();

// Use process.cwd() for reliable path resolution in both dev and production
const DATA_DIR = path.join(process.cwd(), "server/data");
const ML_ALERTS_PATH = path.join(DATA_DIR, "ml_alerts.json");
const INFERENCES_DIR = path.join(process.cwd(), "inferences");
const WEBCAM_SCRIPT = path.join(INFERENCES_DIR, "webcam.py");

function ensureAlertsFile() {
  if (!fs.existsSync(ML_ALERTS_PATH)) {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ML_ALERTS_PATH, JSON.stringify([], null, 2), "utf-8");
  }
}

export function handleStartWebcam(req: Request, res: Response) {
  try {
    ensureAlertsFile();
    const source = (req.query.source as string) || "0";

    if (webcamProcs.has(source)) {
      return res.json({ started: true, message: `Webcam ML (source ${source}) already running` });
    }

    // Spawn python process running webcam.py with the specified source
    const proc = spawn("python3", [WEBCAM_SCRIPT, "--source", source], {
      cwd: INFERENCES_DIR,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    webcamProcs.set(source, proc);

    proc.stdout.on("data", (data) => {
      const msg = data.toString();
      // Optionally log for debugging
      // console.log(`[webcam.py:${source}]`, msg.trim());
    });

    proc.stderr.on("data", (data) => {
      const msg = data.toString();
      console.error(`[webcam.py:${source}:err]`, msg.trim());
    });

    proc.on("exit", (code) => {
      console.log(`webcam.py (source ${source}) exited with code`, code);
      webcamProcs.delete(source);
    });

    return res.json({ started: true, message: `Webcam ML (source ${source}) started` });
  } catch (err: any) {
    console.error("Failed to start webcam ML:", err);
    return res.status(500).json({ started: false, error: String(err?.message || err) });
  }
}

export function handleStopWebcam(req: Request, res: Response) {
  try {
    const source = (req.body.source as string) || (req.query.source as string) || "0";
    const proc = webcamProcs.get(source);

    if (proc) {
      proc.kill("SIGTERM");
      webcamProcs.delete(source);
      return res.json({ stopped: true, message: `Webcam ML (source ${source}) stopped` });
    }
    return res.json({ stopped: false, message: `No running webcam ML for source ${source}` });
  } catch (err: any) {
    return res.status(500).json({ stopped: false, error: String(err?.message || err) });
  }
}

export function handleGetMlAlerts(_req: Request, res: Response) {
  try {
    ensureAlertsFile();
    const raw = fs.readFileSync(ML_ALERTS_PATH, "utf-8");
    const alerts = JSON.parse(raw);
    return res.json({ alerts });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}