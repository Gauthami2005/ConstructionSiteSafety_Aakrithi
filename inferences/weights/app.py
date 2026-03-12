import sys
from pathlib import Path
from ultralytics import YOLO

def find_weights(default_dir: Path) -> Path:
    # if user passed a path, use it
    if len(sys.argv) > 1:
        return Path(sys.argv[1]).expanduser().resolve()

    # otherwise pick a .pt in the current folder (prefer names starting with "best")
    pts = sorted(default_dir.glob("*.pt"))
    if not pts:
        raise FileNotFoundError(f"No .pt weights found in {default_dir}")
    best_like = [p for p in pts if p.stem.startswith("best")]
    return (best_like[0] if best_like else pts[0]).resolve()

def main():
    here = Path(__file__).parent
    weights = find_weights(here)
    print(f"Loading weights: {weights}")

    model = YOLO(str(weights))
    # source=0 -> default webcam. change to 1/2 if you have multiple cameras.
    # show=True -> opens a window with boxes/labels
    # conf=0.5 is a good starting point for PPE
    model.predict(source=0, show=True, conf=0.5, imgsz=640, stream=False)

if __name__ == "__main__":
    main()
