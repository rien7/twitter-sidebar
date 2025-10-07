import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/components/App";
import "./index.css";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");
  if (!container) return;
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
