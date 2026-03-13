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
const WEBCAM2_SCRIPT = path.join(INFERENCES_DIR, "webcam 2.py");

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

    // Determine which script to use based on source
    // Source 0 (Main Entrance) uses webcam.py
    // Source 1 (Work Zone) uses webcam 2.py
    const scriptToUse = source === "1" ? WEBCAM2_SCRIPT : WEBCAM_SCRIPT;

    console.log(`Starting webcam ML for source ${source} using ${path.basename(scriptToUse)}`);

    // Spawn python process running the appropriate script
    const proc = spawn("python3", [scriptToUse, "--source", source], {
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
      
      // We could store the exit status in a shared map if the frontend needs to poll it
    });

    // Wait a brief moment to see if it crashes immediately
    return new Promise((resolve) => {
      let hasExited = false;
      const onExit = (code: number | null) => {
        hasExited = true;
        resolve(res.status(500).json({ 
          started: false, 
          error: `Webcam script failed to start (exit code ${code}). Ensure the camera is connected and index ${source} is valid.` 
        }));
      };
      
      proc.once("exit", onExit);
      
      setTimeout(() => {
        if (!hasExited) {
          proc.off("exit", onExit);
          resolve(res.json({ started: true, message: `Webcam ML (source ${source}) started successfully` }));
        }
      }, 2000);
    });
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