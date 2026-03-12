import cv2
import time
import argparse
import subprocess
import sys
import json
from pathlib import Path
from ultralytics import YOLO

# Keys:
#   q = quit
#   s = save frame
#   r = toggle render
#   a = toggle alarm
#   + / - = conf up/down

# All-inclusive detection: show EVERYTHING the model sees
UNSAFE_CLASSES = {"no_glove", "no_goggles", "no_helmet", "no_mask", "no_shoes"}
# Fine-tuned per-class minimum confidence to eliminate false positives on mouth/nose
PER_CLASS_MIN_CONF = {
    "helmet": 0.12,
    "mask": 0.18,
    "goggles": 0.35, # Higher to avoid goggles misfiring on mouth/nose
    "glove": 0.22,
    "shoes": 0.18,
    "no_helmet": 0.12,
    "no_mask": 0.15,
    "no_goggles": 0.25,
    "no_glove": 0.20,
    "no_shoes": 0.15,
}

ALERT_CLASSES = {"no_helmet", "no_mask", "no_goggles", "no_shoes"}
ALERT_COOLDOWN_SEC = 2.0

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--weights", default="weights/best.pt", help="Path to .pt weights")
    p.add_argument("--source", default="0", help="Webcam index (0/1/2) or video/rtsp")
    p.add_argument("--conf", type=float, default=0.15, help="Base confidence threshold")
    p.add_argument("--imgsz", type=int, default=640, help="Inference image size")
    p.add_argument("--device", default="cpu", help="GPU id like 0, or 'cpu'")
    p.add_argument("--iou", type=float, default=0.45, help="NMS IoU threshold")
    return p.parse_args()

def play_beep():
    try:
        if sys.platform == "darwin":  # macOS
            subprocess.Popen(["afplay", "/System/Library/Sounds/Glass.aiff"],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif sys.platform.startswith("win"):
            import winsound
            winsound.Beep(1000, 300)
        else:
            subprocess.Popen(["paplay", "/usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga"],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def open_camera(source):
    # Try indices first if source is a number
    if str(source).isdigit():
        src_idx = int(source)
        # Try a few common backends
        backends = [cv2.CAP_ANY, cv2.CAP_AVFOUNDATION, cv2.CAP_V4L2, cv2.CAP_DSHOW]
        for be in backends:
            try:
                cap = cv2.VideoCapture(src_idx, be)
                if cap.isOpened():
                    # Test read a frame to ensure it's not a "ghost" device
                    ok, _ = cap.read()
                    if ok:
                        print(f"[OK] Camera {src_idx} opened with backend {be}")
                        return cap
                cap.release()
            except:
                pass
    
    # Try as string/path
    cap = cv2.VideoCapture(source)
    if cap.isOpened():
        return cap
        
    return None

def main():
    args = parse_args()
    
    weights_path = Path(args.weights).resolve()
    if not weights_path.exists():
        # Fallback for relative paths if run from different CWD
        weights_path = Path(__file__).parent / "weights" / "best.pt"
        if not weights_path.exists():
            raise FileNotFoundError(f"Weight file not found: {args.weights}")

    print(f"[INFO] Loading model: {weights_path}")
    model = YOLO(str(weights_path))
    names = model.names  # id->label dict
    print(f"[INFO] Classes: {names}")

    cap = open_camera(args.source)
    if cap is None:
        print(f"[ERROR] Cannot access camera {args.source}")
        sys.exit(1)

    render = True
    alarm_enabled = True
    base_conf = args.conf
    prev_t, fps = time.time(), 0.0
    last_alert = {}  # class_name -> last_time
    last_event = {}  # class_name -> last_time

    # Prepare alerts path
    alerts_path = Path(__file__).resolve().parents[1] / "server" / "data" / "ml_alerts.json"
    
    print(f"[INFO] Starting loop for source {args.source}. Press 'q' to quit.")

    retry_count = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            retry_count += 1
            if retry_count > 10: break
            time.sleep(0.1); continue
        
        retry_count = 0

        # Balanced inference
        results = model.predict(
            frame,
            conf=0.10, # Catch potential helmets without too much noise
            iou=args.iou,
            imgsz=args.imgsz,
            device=args.device,
            verbose=False
        )
        res = results[0]

        any_unsafe = False
        unsafe_labels_on_frame = set()

        if render and res.boxes is not None:
            for box in res.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                cls_id = int(box.cls[0])
                conf_val = float(box.conf[0])
                cls_name = names.get(cls_id, str(cls_id))

                if conf_val < base_conf:
                    continue

                is_unsafe = cls_name in UNSAFE_CLASSES
                color = (0, 0, 255) if is_unsafe else (0, 200, 0)

                label = f"{cls_name} {conf_val:.2f}"
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, label, (x1, max(y1 - 6, 16)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                if is_unsafe:
                    any_unsafe = True
                    unsafe_labels_on_frame.add(cls_name)
                    
                    now = time.time()
                    if alarm_enabled and cls_name in ALERT_CLASSES:
                        if now - last_alert.get(cls_name, 0) >= ALERT_COOLDOWN_SEC:
                            play_beep()
                            last_alert[cls_name] = now

                    if now - last_event.get(cls_name, 0) >= ALERT_COOLDOWN_SEC:
                        payload = {
                            "id": f"{int(now*1000)}-{cls_name}-{args.source}",
                            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
                            "classes": sorted(list(unsafe_labels_on_frame)),
                            "primary": cls_name,
                            "siteLocation": f"Camera {args.source}",
                            "source": args.source,
                            "level": "warning",
                            "message": f"Unsafe: {', '.join(sorted(unsafe_labels_on_frame))}",
                        }
                        try:
                            if alerts_path.exists():
                                data = json.loads(alerts_path.read_text(encoding="utf-8"))
                            else:
                                data = []
                            data.append(payload)
                            alerts_path.write_text(json.dumps(data[-100:], indent=2), encoding="utf-8")
                            last_event[cls_name] = now
                        except: pass

        # HUD
        now = time.time()
        fps = 0.9 * fps + 0.1 * (1.0 / max(now - prev_t, 1e-6))
        prev_t = now
        hud = f"SRC: {args.source} | FPS: {fps:.1f} | CONF: {base_conf:.2f}"
        cv2.putText(frame, hud, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,255), 2)

        if any_unsafe:
            banner = "DANGER: " + ", ".join(sorted(unsafe_labels_on_frame))
            cv2.putText(frame, banner, (10, frame.shape[0]-20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,0,255), 2)

        cv2.imshow(f"PPE Stream {args.source}", frame)
        k = cv2.waitKey(1) & 0xFF
        if k == ord('q'): break
        elif k == ord('+'): base_conf = min(base_conf + 0.05, 0.9)
        elif k == ord('-'): base_conf = max(base_conf - 0.05, 0.05)

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
