import "./global.css";
import { createRoot } from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Check if root already exists to prevent multiple createRoot calls
if (!(rootElement as any)._reactRoot) {
  (rootElement as any)._reactRoot = createRoot(rootElement);
}

(rootElement as any)._reactRoot.render(<App />);

// Handle HMR
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    if ((rootElement as any)._reactRoot) {
      (rootElement as any)._reactRoot.render(<App />);
    }
  });
}
