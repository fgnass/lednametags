import { banks, currentBank } from "./store";

// Helper to clean up state before sharing
function prepareState() {
  // Only include banks that have content
  const nonEmptyBanks = banks
    .map((bank) => bank.value)
    .filter(
      (bank) =>
        bank.pixels.some((row) => row.some((pixel) => pixel)) ||
        bank.text.trim()
    );

  return {
    currentBank: currentBank.value,
    banks: nonEmptyBanks,
  };
}

export async function shareState() {
  try {
    const state = prepareState();

    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { id } = await response.json();
    return { success: true, id };
  } catch (error) {
    console.error("Error sharing state:", error);
    return { success: false, error: error.message };
  }
}

export async function loadState(id) {
  try {
    const response = await fetch(`/api/share?id=${encodeURIComponent(id)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const state = await response.json();

    // Validate state format
    if (!state || !state.banks || !Array.isArray(state.banks)) {
      throw new Error("Invalid state format");
    }

    return { success: true, state };
  } catch (error) {
    console.error("Error loading state:", error);
    return { success: false, error: error.message };
  }
}
