import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import axios from "axios";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ToastContainer } from "react-toastify";

const root = ReactDOM.createRoot(document.getElementById("root"));

// Global Interceptor to auto-logout the user if the server wipes the database or tokens become invalid.
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const msg = error.response.data?.message;
            if (msg === "Not authorized, participant not found" || msg === "Not authorized, token failed") {
                localStorage.removeItem("userInfo");
                localStorage.removeItem("adminInfo");

                // Smart redirect based on current path
                if (window.location.pathname.includes('/admin')) {
                    window.location.href = "/admin";
                } else {
                    window.location.href = "/login";
                }
            }
        }
        return Promise.reject(error);
    }
);

root.render(
    <React.StrictMode>
        <AuthProvider>
            <AdminAuthProvider>
                <LanguageProvider>
                    <App />
                    <ToastContainer position="top-right" autoClose={3000} />
                </LanguageProvider>
            </AdminAuthProvider>
        </AuthProvider>
    </React.StrictMode>
);

// Register PWA Service Worker for offline and mobile installation capability
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => console.log("🔋 [PWA] Service Worker registered successfully:", reg.scope))
            .catch((err) => console.error("❌ [PWA] Service Worker registration failed:", err));
    });
}
