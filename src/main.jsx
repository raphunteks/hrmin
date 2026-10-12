import React from "react";
import { createRoot } from "react-dom/client";
import "../tokens.css";
import "./styles/base.css";
import { RouterProvider } from "./lib/router.jsx";
import { AuthProvider } from "./auth/AuthProvider.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </RouterProvider>
  </React.StrictMode>
);
