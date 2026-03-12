from ultralytics import YOLO
import cv2
import numpy as np
import subprocess
import time

import os

# Use an absolute path or ensure the weights are in the current directory
# If yolov8n-pose.pt doesn't exist, YOLO() will automatically download it.
model = YOLO("yolov8n-pose.pt")

cap = cv2.VideoCapture(0)

last_alert_time = 0

# Get the directory of the current script to locate send_alert.py reliably
script_dir = os.path.dirname(os.path.abspath(__file__))
send_alert_path = os.path.join(script_dir, "..", "send_alert.py")

while True:

    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame)

    annotated_frame = results[0].plot()   # DRAW SKELETON + BOXES

    for r in results:

        if r.keypoints is None:
            continue

        for person in r.keypoints.xy:

            xs = person[:,0]
            ys = person[:,1]

            width = max(xs) - min(xs)
            height = max(ys) - min(ys)

            # FALL DETECTION
            if width > height:

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

                    if os.path.exists(send_alert_path):
                        subprocess.run(["python3", send_alert_path])
                    else:
                        print(f"Error: Alert script not found at {send_alert_path}")

                    last_alert_time = current_time

            else:

                cv2.putText(
                    annotated_frame,
                    "Normal",
                    (50,80),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0,255,0),
                    2
                )

    cv2.imshow("Construction Site Safety", annotated_frame)

    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()