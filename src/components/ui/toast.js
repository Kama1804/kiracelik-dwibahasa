export const toast = {
  success(message, title = "") {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kiracelik-toast", {
          detail: { type: "success", message, title },
        })
      );
    }
  },
  warning(message, title = "") {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kiracelik-toast", {
          detail: { type: "warning", message, title },
        })
      );
    }
  },
  error(message, title = "") {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kiracelik-toast", {
          detail: { type: "error", message, title },
        })
      );
    }
  },
  info(message, title = "") {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("kiracelik-toast", {
          detail: { type: "info", message, title },
        })
      );
    }
  },
};

export function confirmAction({
  title,
  message,
  confirmText,
  cancelText,
  variant = "danger", // "danger" | "warning" | "default"
  onConfirm,
}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("kiracelik-confirm", {
        detail: {
          title,
          message,
          confirmText,
          cancelText,
          variant,
          onConfirm,
        },
      })
    );
  }
}
