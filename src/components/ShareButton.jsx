import { useState } from "preact/hooks";
import { Share2 } from "lucide-preact";
import { shareState } from "../share";
import { Button } from "./Button";

export default function ShareButton() {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState(null);

  const handleShare = async () => {
    setIsSharing(true);
    setError(null);

    try {
      const { success, id, error } = await shareState();

      if (!success) {
        throw new Error(error || "Failed to share");
      }

      // Create share URL
      const url = new URL(window.location.href);
      url.searchParams.set("state", id);

      // Try to use the Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: "LED Nametag Configuration",
          url: url.toString(),
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(url.toString());
        alert("Share link copied to clipboard!");
      }
    } catch (err) {
      console.error("Share error:", err);
      setError(err.message);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div class="relative">
      <Button
        onClick={handleShare}
        disabled={isSharing}
        title="Share configuration"
      >
        <Share2 />
        Share
      </Button>
      {error && (
        <div class="absolute top-full mt-2 left-0 right-0 bg-red-900/90 text-white text-sm p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
