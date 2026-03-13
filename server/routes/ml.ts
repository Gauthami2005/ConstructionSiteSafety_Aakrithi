import type { Request, Response } from "express";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import fs from "fs";

// Keep multiple running process references per source
const webcamProcs = new Map<string, ChildProcessWithoutNullStreams>();

// Use process.cwd() for reliable path resolution in both dev and production
const DATA_DIR = path.join(process.cwd(), "server/data");
const ML_ALERTS_PATH = path.join(DATA_DIR, "ml_alerts.json");
const INFERENCES_DIR = path.join(process.cwd(), "inferences");

// Scripts mapping
const FALL_DETECTION_SCRIPT = path.join(INFERENCES_DIR, "fall_detection_alert.py");
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
    // Source 0 (Phone Camera) -> fall_detection_alert.py
    // Source 2 (Laptop Camera) -> webcam 2.py
    let scriptToUse = "";
    let actualSource = source;

    if (source === "0") {
      scriptToUse = FALL_DETECTION_SCRIPT;
      // If index 0 failed in scan but index 1 worked, it might be that index 1 is actually the phone/first cam
      // Let's try to be smart, but for now we follow the user's mapping.
      // We'll pass the source as-is, but the python scripts will handle the retry logic.
    } else if (source === "2") {
      scriptToUse = WEBCAM2_SCRIPT;
      // The user specifically asked for source 2 for laptop, but scan says index 1 is OK.
      // We will pass '1' to the script if the user requested '2' but only 0,1 exist.
      actualSource = "1"; 
    } else {
      scriptToUse = path.join(INFERENCES_DIR, "webcam.py");
    }

    console.log(`Starting webcam ML for source ${source} (using index ${actualSource}) using ${path.basename(scriptToUse)}`);

    // Spawn python process running the appropriate script
    const proc = spawn("python3", [scriptToUse, "--source", actualSource], {
      cwd: INFERENCES_DIR,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    webcamProcs.set(source, proc);

    proc.stdout.on("data", (data) => {
      const msg = data.toString();
      // Optionally log for debugging
      // console.log(`[webcam:${source}]`, msg.trim());
    });

    proc.stderr.on("data", (data) => {
      const msg = data.toString();
      console.error(`[webcam:${source}:err]`, msg.trim());
    });

    proc.on("exit", (code) => {
      console.log(`webcam script (source ${source}) exited with code`, code);
      webcamProcs.delete(source);
    });

    return res.json({ started: true, message: `Webcam ML (source ${source}) started using ${path.basename(scriptToUse)}` });
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