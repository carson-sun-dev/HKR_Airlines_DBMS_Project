import { useCallback, useState } from "react";
import type { AxiosError } from "axios";
import { api } from "@/api/client";

export function useStaffFeedback() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clear = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const handleErr = useCallback((e: unknown) => {
    const ax = e as AxiosError<{ error?: string; details?: string }>;
    const body = ax.response?.data;
    const msg =
      body?.error ??
      body?.details ??
      (ax.response?.status === 404 ? "Not found." : null) ??
      (ax.message && !ax.response ? ax.message : null) ??
      "Something went wrong. Please try again.";
    const detail = body?.details && body.details !== msg ? body.details : undefined;
    setError(detail ? `${msg}: ${detail}` : String(msg));
    setSuccess(null);
  }, []);

  const ok = useCallback((msg: string) => {
    setSuccess(msg);
    setError(null);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setSuccess(null);
  }, []);

  return { error, success, clear, handleErr, ok, showError };
}

export async function apiDelete(url: string) {
  await api.delete(url);
}
