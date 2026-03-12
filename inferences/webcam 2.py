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

UNSAFE_CLASSES = {"no_glove", "no_goggles", "no_helmet", "no_mask", "no_shoes"}
# Optional per-class minimum confidence (you can tweak)
PER_CLASS_MIN_CONF = {
    "helmet": 0.20,
    "mask": 0.20,
    "goggles": 0.20,
    "glove": 0.20,
    "shoes": 0.20,
    "no_helmet": 0.15,
    "no_mask": 0.15,
    "no_goggles": 0.15,
    "no_glove": 0.15,
    "no_shoes": 0.15,
}

ALERT_CLASSES = {"no_helmet", "no_mask", "no_goggles", "no_shoes"}  # which ones should beep
ALERT_COOLDOWN_SEC = 2.0  # don't beep more than once per X sec per class

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--weights", default="weights/best.pt", help="Path to .pt weights")
    p.add_argument("--source", default="0", help="Webcam index (0/1/2) or video/rtsp")
    p.add_argument("--conf", type=float, default=0.30, help="Base confidence threshold")
    p.add_argument("--imgsz", type=int, default=640, help="Inference image size")
    p.add_argument("--device", default="cpu", help="GPU id like 0, or 'cpu'")
    p.add_argument("--iou", type=float, default=0.45, help="NMS IoU threshold")
    return p.parse_args()

def play_beep():
    # Cross-platform best effort
    try:
        if sys.platform == "darwin":  # macOS
            subprocess.Popen(["afplay", "/System/Library/Sounds/Glass.aiff"],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif sys.platform.startswith("win"):
            import winsound
            winsound.Beep(1000, 300)
        else:
            # Linux: try `paplay` or `aplay` if available
            subprocess.Popen(["paplay", "/usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga"],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        # If audio fails, just silently skip
        pass

def open_camera(source):
    # Try mac-friendly backends first
    backends = [cv2.CAP_AVFOUNDATION, cv2.CAP_QT, cv2.CAP_ANY]
    for be in backends:
        try:
            cap = cv2.VideoCapture(source if isinstance(source, str) else int(source), be)
            if cap.isOpened():
                print(f"[OK] Camera opened with backend {be}")
                return cap
            cap.release()
        except Exception:
            pass
    return None

def main():
    args = parse_args()
    source = int(args.source) if args.source.isdigit() else args.source

    weights_path = Path(args.weights).resolve()
    if not weights_path.exists():
        raise FileNotFoundError(f"Weight file not found: {weights_path}")

    print(f"[INFO] Loading model: {weights_path}")
    model = YOLO(str(weights_path))
    names = model.names  # id->label dict
    print(f"[INFO] Classes: {names}")

    cap = open_camera(source)
    if cap is None:
        raise RuntimeError(
            f"Cannot access camera/stream: {args.source}. "
            "Fully quit & reopen VS Code after allowing Camera permission, and ensure no other app uses the camera."
        )

    render = True
    alarm_enabled = True
    base_conf = args.conf
    prev_t, fps = time.time(), 0.0
    last_alert = {}  # class_name -> last_time (beep cooldown)
    last_event = {}  # class_name -> last_time (JSON log cooldown)

    # Prepare ML alerts JSON path (server/data/ml_alerts.json)
    alerts_path = Path(__file__).resolve().parents[1] / "server" / "data" / "ml_alerts.json"
    try:
        if not alerts_path.exists():
            alerts_path.write_text("[]", encoding="utf-8")
    except Exception as e:
        print(f"[WARN] Cannot prepare alerts file: {e}")

    print("[INFO] Starting webcam loop… Press 'q' to quit.")

    retry_count = 0
    max_retries = 10
    while True:
        ok, frame = cap.read()
        if not ok:
            if retry_count < max_retries:
                retry_count += 1
                print(f"[WARN] Frame grab failed, retrying ({retry_count}/{max_retries})...")
                time.sleep(0.1)
                continue
            else:
                print("[ERROR] Frame grab failed after multiple retries, exiting.")
                break
        
        retry_count = 0 # Reset retry count on success

        # Run inference
        results = model.predict(
            frame,
            conf=base_conf,
            iou=args.iou,
            imgsz=args.imgsz,
            device=args.device,
            verbose=False
        )
        res = results[0]

        # Track unsafe flag for banner
        any_unsafe = False
        unsafe_labels_on_frame = set()

        if render and res.boxes is not None:
            for box in res.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                cls_id = int(box.cls[0])
                conf_val = float(box.conf[0])
                cls_name = names.get(cls_id, str(cls_id))

                # Apply per-class minimum confidence if present
                min_conf = PER_CLASS_MIN_CONF.get(cls_name, base_conf)
                if conf_val < min_conf:
                    continue

                # Color by safety: red for "no_*", green otherwise
                is_unsafe = cls_name in UNSAFE_CLASSES
                color = (0, 0, 255) if is_unsafe else (0, 200, 0)

                label = f"{cls_name} {conf_val:.2f}"
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, label, (x1, max(y1 - 6, 16)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2, cv2.LINE_AA)

                if is_unsafe:
                    any_unsafe = True
                    unsafe_labels_on_frame.add(cls_name)
                    # Rate-limited beep for alert classes
                    if alarm_enabled and cls_name in ALERT_CLASSES:
                        now = time.time()
                        last = last_alert.get(cls_name, 0)
                        if now - last >= ALERT_COOLDOWN_SEC:
                            play_beep()
                            last_alert[cls_name] = now
                            # Also rate-limited JSON alert logging
                            try:
                                evt_last = last_event.get(cls_name, 0)
                                if now - evt_last >= ALERT_COOLDOWN_SEC:
                                    # Append an alert event
                                    payload = {
                                        "id": f"{int(now*1000)}-{cls_name}",
                                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
                                        "classes": sorted(list(unsafe_labels_on_frame)),
                                        "primary": cls_name,
                                        "siteLocation": f"Camera {args.source}",
                                        "source": args.source,
                                        "level": "warning" if cls_name.startswith("no_") else "watch",
                                        "message": f"Unsafe detected: {', '.join(sorted(unsafe_labels_on_frame))}",
                                    }
                                    try:
                                        data = json.loads(alerts_path.read_text(encoding="utf-8"))
                                        if not isinstance(data, list):
                                            data = []
                                    except Exception:
                                        data = []
                                    data.append(payload)
                                    alerts_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
                                    last_event[cls_name] = now
                            except Exception as e:
                                print(f"[WARN] Failed to log alert: {e}")

        # HUD (top-left)
        now = time.time()
        fps = 0.9 * fps + 0.1 * (1.0 / max(now - prev_t, 1e-6))
        prev_t = now
        hud = f"FPS: {fps:.1f} | conf: {base_conf:.2f} | render: {render} | alarm: {alarm_enabled}"
        cv2.putText(frame, hud, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)

        # DANGER banner if any unsafe
        if any_unsafe:
            banner = "DANGER: " + ", ".join(sorted(unsafe_labels_on_frame))
            (w, h), _ = cv2.getTextSize(banner, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)
            pad = 10
            cv2.rectangle(frame, (5, 40), (5 + w + 2*pad, 40 + h + 2*pad), (0, 0, 255), -1)
            cv2.putText(frame, banner, (5 + pad, 40 + h + pad),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255,255,255), 2, cv2.LINE_AA)

        cv2.imshow("YOLO Webcam (PPE Alerts)", frame)
        k = cv2.waitKey(1) & 0xFF
        if k == ord('q'):
            break
        elif k == ord('s'):
            cv2.imwrite("frame.jpg", frame); print("[INFO] Saved frame.jpg")
        elif k == ord('r'):
            render = not render; print(f"[INFO] render -> {render}")
        elif k == ord('a'):
            alarm_enabled = not alarm_enabled; print(f"[INFO] alarm -> {alarm_enabled}")
        elif k == ord('+'):
            base_conf = min(base_conf + 0.05, 0.95); print(f"[INFO] conf -> {base_conf:.2f}")
        elif k == ord('-'):
            base_conf = max(base_conf - 0.05, 0.05); print(f"[INFO] conf -> {base_conf:.2f}")

    cap.release()
    cv2.destroyAllWindows()
    print("[INFO] Closed.")

if __name__ == "__main__":
    main()
