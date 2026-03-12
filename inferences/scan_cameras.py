import cv2
print("Scanning for cameras...")
for i in range(10):
    cap = cv2.VideoCapture(i)
    if not cap.isOpened():
        print(f"Index {i}: Not opened")
        continue
    ok, frame = cap.read()
    if ok:
        print(f"Index {i}: OK (captured frame)")
    else:
        print(f"Index {i}: Failed read")
    cap.release()
