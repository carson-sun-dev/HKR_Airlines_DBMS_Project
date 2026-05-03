import { getStoredAccessToken } from "@/api/client";

/** 解析 JWT payload（仅客户端展示用；权限以后端为准） */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getCustomerIdFromToken(): number | null {
  const t = getStoredAccessToken();
  if (!t) return null;
  const p = parseJwtPayload(t);
  if (!p || p.customer_id == null || p.customer_id === "") return null;
  const n = Number(p.customer_id);
  return Number.isFinite(n) ? n : null;
}
