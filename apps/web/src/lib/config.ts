const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "");

// Production-safe default: if the web UI is deployed without VITE_API_BASE_URL configured,
// fall back to the known Railway Cloud API URL. Local/dev should set VITE_API_BASE_URL explicitly.
const prodFallback = "https://sca-01-phase3-production.up.railway.app";

export const API_BASE_URL = fromEnv && fromEnv.length > 0 ? fromEnv : (import.meta.env.PROD ? prodFallback : "");


