import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  clearTokens,
  getStoredAccessToken,
  getTokenStorage,
  HKR_ROLE_KEY,
  setRememberPersistence,
  setTokens,
} from "@/api/client";
import { getCustomerIdFromToken } from "@/utils/jwtPayload";

type Role = "C" | "E" | null;

const AuthCtx = createContext<{
  role: Role;
  customerId: number | null;
  isAuthenticated: boolean;
  login: (
    username: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
} | null>(null);

function readStoredRole(): Role {
  const r = getTokenStorage().getItem(HKR_ROLE_KEY);
  if (r === "C" || r === "E") return r;
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => readStoredRole());

  const [customerId, setCustomerId] = useState<number | null>(null);

  useEffect(() => {
    if (role === "C") {
      setCustomerId(getCustomerIdFromToken());
    } else {
      setCustomerId(null);
    }
  }, [role]);

  const isAuthenticated = useMemo(() => {
    const hasToken = !!getStoredAccessToken();
    const r = role ?? readStoredRole();
    return hasToken && (r === "C" || r === "E");
  }, [role]);

  const login = useCallback(
    async (username: string, password: string, rememberMe = false) => {
      try {
        const { data } = await api.post<{
          access_token?: string;
          refresh_token?: string;
          role: "C" | "E";
        }>("/api/login", { username, password });
        if (data.access_token && data.refresh_token) {
          setRememberPersistence(rememberMe);
          setTokens(data.access_token, data.refresh_token);
          const store = getTokenStorage();
          store.setItem(HKR_ROLE_KEY, data.role);
          const other = store === localStorage ? sessionStorage : localStorage;
          other.removeItem(HKR_ROLE_KEY);
        }

        setRole(data.role);
        if (data.role === "C") {
          setCustomerId(getCustomerIdFromToken());
        } else {
          setCustomerId(null);
        }
        return { ok: true as const };
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Sign-in failed";
        return { ok: false as const, message: String(msg) };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/logout");
    } catch {
      /* ignore */
    }
    clearTokens();
    setRole(null);
    setCustomerId(null);
  }, []);

  const value = useMemo(
    () => ({
      role,
      customerId,
      isAuthenticated,
      login,
      logout,
    }),
    [role, customerId, isAuthenticated, login, logout],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
