export const CSRF_HEADER_NAME = "x-csrf-token";
export const CSRF_COOKIE_NAME = "spp_csrf_token";

/**
 * Membaca CSRF token dari cookie document.cookie
 */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]) : "";
}

/**
 * Inisialisasi interceptor otomatis untuk window.fetch di browser.
 * Semua request mutasi (POST, PUT, DELETE, PATCH) ke /api
 * akan otomatis disisipkan header x-csrf-token jika belum ada.
 */
export function initCsrfInterceptor() {
  if (typeof window === "undefined") return;
  if ((window as any).__csrf_interceptor_init) return;
  (window as any).__csrf_interceptor_init = true;

  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const options: RequestInit = { ...init };
    const method = (options.method || "GET").toUpperCase();

    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const headers = new Headers(options.headers || {});
      if (!headers.has(CSRF_HEADER_NAME)) {
        let token = getCsrfToken();
        if (!token) {
          // Fallback: ambil session csrf dari /api/auth/me jika cookie belum tersimpan di document
          try {
            const meRes = await originalFetch("/api/auth/me");
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.csrf_token) {
                token = meData.csrf_token;
                document.cookie = `${CSRF_COOKIE_NAME}=${token}; path=/; SameSite=Lax`;
              }
            }
          } catch {}
        }
        if (token) {
          headers.set(CSRF_HEADER_NAME, token);
        }
      }
      options.headers = headers;
    }

    return originalFetch(input, options);
  };
}
