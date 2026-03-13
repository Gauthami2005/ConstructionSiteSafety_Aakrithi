import cv2

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Camera not opened")
    exit(1)

while True:
    ok, frame = cap.read()
    if not ok:
        print("Failed to grab frame")
        break
    cv2.imshow("test", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
