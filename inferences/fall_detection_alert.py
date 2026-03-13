from ultralytics import YOLO
import cv2
import numpy as np
import subprocess
import time
import os
import argparse
import sys
import json
from pathlib import Path

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--source", default="0", help="Webcam index or source path")
    p.add_argument("--weights", default="yolov8n-pose.pt", help="Path to pose weights")
    return p.parse_args()

def open_camera(source):
    if str(source).isdigit():
        src_idx = int(source)
        # Try a few common backends and indices if requested fails
        for offset in [0, 1, -1]:
            idx = src_idx + offset
            if idx < 0: continue
            for be in [cv2.CAP_ANY, cv2.CAP_AVFOUNDATION]:
                try:
                    cap = cv2.VideoCapture(idx, be)
                    if cap.isOpened():
                        ok, _ = cap.read()
                        if ok:
                            print(f"[OK] Camera {idx} opened with backend {be}")
                            return cap
                    cap.release()
                except:
                    pass
    
    cap = cv2.VideoCapture(source)
    return cap if cap.isOpened() else None

def main():
    args = parse_args()
    
    # Load model
    model = YOLO(args.weights)

    # Handle numeric vs string source
    cap = open_camera(args.source)

    if cap is None:
        print(f"[ERROR] Could not open source: {args.source}")
        sys.exit(1)

    last_alert_time = 0
    last_event_time = 0

    # Paths for alerts
    script_dir = os.path.dirname(os.path.abspath(__file__))
    send_alert_path = os.path.join(script_dir, "..", "send_alert.py")
    alerts_path = os.path.join(script_dir, "..", "server", "data", "ml_alerts.json")

    print(f"[INFO] Starting Fall Detection on source {args.source}")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, verbose=False)
        annotated_frame = results[0].plot()

        for r in results:
            if r.keypoints is None or len(r.keypoints.xy) == 0:
                continue

            for person in r.keypoints.xy:
                valid_kpts = person[person.sum(axis=1) > 0]
                if len(valid_kpts) < 5: continue 

                xs = valid_kpts[:,0]
                ys = valid_kpts[:,1]

                width = float(max(xs) - min(xs))
                height = float(max(ys) - min(ys))

                if width > height * 1.2:
                    cv2.putText(
                        annotated_frame,
                        "FALL DETECTED",
                        (50,80),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1.2,
                        (0,0,255),
                        3
                    )

                    current_time = time.time()
                    if current_time - last_alert_time > 10:
                        print("🚨 FALL DETECTED! Sending alert...")
                        
                        # SMS/Twilio Alert
                        if os.path.exists(send_alert_path):
                            subprocess.run(["python3", send_alert_path])
                        
                        # Dashboard Alert
                        payload = {
                            "id": f"{int(current_time*1000)}-fall-{args.source}",
                            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(current_time)),
                            "classes": ["fall"],
                            "primary": "fall",
                            "siteLocation": f"Camera {args.source}",
                            "source": args.source,
                            "level": "critical",
                            "message": f"FALL DETECTED: Source {args.source}",
                        }
                        try:
                            if os.path.exists(alerts_path):
                                data = json.loads(Path(alerts_path).read_text(encoding="utf-8"))
                            else:
                                data = []
                            data.append(payload)
                            Path(alerts_path).write_text(json.dumps(data[-100:], indent=2), encoding="utf-8")
                        except Exception as e:
                            print(f"Error saving alert: {e}")

                        last_alert_time = current_time
                else:
                    cv2.putText(
                        annotated_frame,
                        "Status: Normal",
                        (50,80),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0,255,0),
                        2
                    )

        cv2.imshow(f"Fall Detection - Source {args.source}", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
