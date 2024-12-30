import { styled } from "classname-variants/preact";

export const Button = styled("button", {
  base: "px-6 py-3 rounded-lg flex items-center gap-2",
  variants: {
    active: {
      true: "bg-gray-700",
      false: "bg-gray-800 hover:bg-gray-600",
    },
  },
});
