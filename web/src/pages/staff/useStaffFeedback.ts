import { useCallback, useState } from "react";
import { api } from "@/api/client";

export function useStaffFeedback() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clear = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const handleErr = useCallback((e: unknown) => {
    const msg =
      (e as { response?: { data?: { error?: string; details?: string } } })?.response?.data?.error ??
      (e as { response?: { data?: { details?: string } } })?.response?.data?.details ??
      "Something went wrong. Please try again.";
    const detail = (e as { response?: { data?: { details?: string } } })?.response?.data?.details;
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
