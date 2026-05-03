import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const ACCESS_KEY = "hkr_access_token";
const REFRESH_KEY = "hkr_refresh_token";
/** Persist "remember me" choice (always in localStorage so we know where tokens live after reopening the app). */
const REMEMBER_KEY = "hkr_remember";
export const HKR_ROLE_KEY = "hkr_role";

/**
 * Which Storage bucket holds tokens for this session.
 * - Remember me ON: tokens in localStorage (survives browser close).
 * - Remember me OFF: tokens in sessionStorage (cleared when the tab/window session ends).
 *
 * XSS note: any script on this origin can read storage. Prefer trusted devices; avoid third-party
 * scripts; React escapes text by default — do not inject unsanitized HTML with user data.
 */
export function getTokenStorage(): Storage {
  return localStorage.getItem(REMEMBER_KEY) === "1" ? localStorage : sessionStorage;
}

/** Call before setTokens on login so tokens go to the correct store. */
export function setRememberPersistence(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
}

export function getStoredAccessToken(): string | null {
  return getTokenStorage().getItem(ACCESS_KEY);
}

export function getStoredRefreshToken(): string | null {
  return getTokenStorage().getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  const primary = getTokenStorage();
  primary.setItem(ACCESS_KEY, access);
  primary.setItem(REFRESH_KEY, refresh);
  const other = primary === localStorage ? sessionStorage : localStorage;
  other.removeItem(ACCESS_KEY);
  other.removeItem(REFRESH_KEY);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(HKR_ROLE_KEY);
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(HKR_ROLE_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

const api = axios.create({
  baseURL: "",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const rt = getStoredRefreshToken();
  if (!rt) return null;
  const { data } = await axios.post<{
    access_token: string;
    refresh_token: string;
  }>("/api/refresh", { refresh_token: rt }, { headers: { "Content-Type": "application/json" } });
  if (data.access_token && data.refresh_token) {
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  }
  return null;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config;
    const status = error.response?.status;
    if (status !== 401 || !original || original.url?.includes("/api/refresh")) {
      return Promise.reject(error);
    }
    if ((original as { _retry?: boolean })._retry) {
      clearTokens();
      return Promise.reject(error);
    }
    (original as { _retry?: boolean })._retry = true;
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newAccess = await refreshPromise;
    if (!newAccess) {
      clearTokens();
      return Promise.reject(error);
    }
    original.headers.Authorization = `Bearer ${newAccess}`;
    return api(original);
  },
);

export { api };
