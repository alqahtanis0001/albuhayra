"use client";

/**
 * Registers the service worker after mount. Deliberately not `beforeunload`-free
 * magic: if registration fails — no HTTPS, a blocked worker, a CSP refusal — the
 * app carries on exactly as before, because the worker only ever caches static
 * assets and nothing depends on it existing.
 */
import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Registration failing is not an app error, so it is swallowed rather than
    // surfaced: there is nothing the person using the app could do about it.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}

export default ServiceWorkerRegistration;
