/** Sticky strip so success/error stays visible while scrolling long admin forms. */
export function StaffActionFeedback({
  error,
  success,
}: {
  error: string | null;
  success: string | null;
}) {
  if (!error && !success) return null;
  return (
    <div className="action-feedback-sticky" role="status" aria-live="polite">
      {error ? <div className="error-banner" style={{ marginBottom: success ? "0.5rem" : 0 }}>{error}</div> : null}
      {success ? <div className="success-banner" style={{ marginBottom: 0 }}>{success}</div> : null}
    </div>
  );
}
