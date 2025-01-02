import { signal } from "@preact/signals";
import { styled } from "classname-variants/preact";

const Toast = styled("div", {
  base: "px-4 py-3 rounded-lg transition-opacity text-white",
  variants: {
    type: {
      none: "invisible",
      success: "bg-green-600",
      error: "bg-red-600",
    },
  },
});

// Global toast state
export const toast = {
  message: signal("-"),
  type: signal("none"),
  show: (message, type = "success") => {
    toast.message.value = message;
    toast.type.value = type;
    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.message.value = "-";
      toast.type.value = "none";
    }, 3000);
  },
};

export default function ToastMessage() {
  return <Toast type={toast.type.value}>{toast.message.value}</Toast>;
}
