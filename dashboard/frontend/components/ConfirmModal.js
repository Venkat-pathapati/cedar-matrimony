"use client";

export default function ConfirmModal({
  title = "Confirm Action",
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  danger = true,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-head">
          <h3 style={{ color: danger ? "var(--red)" : "var(--navy)" }}>{title}</h3>
          <button type="button" className="confirm-close" onClick={onCancel} aria-label="Close">✕</button>
        </div>
        <p>{message}</p>
        <div className="confirm-actions">
          <button type="button" className="btn small ghost" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn small ${danger ? "danger" : ""}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

