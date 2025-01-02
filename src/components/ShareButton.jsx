import { useState } from "preact/hooks";
import { Share2 } from "lucide-preact";
import { shareState } from "../share";
import { Button } from "./Button";
import { toast } from "./ToastMessage";

export default function ShareButton() {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);

    try {
      const { success, id, error } = await shareState();

      if (!success) {
        throw new Error(error || "Failed to share");
      }

      // Create share URL
      const url = new URL(window.location.href);
      url.searchParams.set("state", id);

      // Copy to clipboard
      await navigator.clipboard.writeText(url.toString());
      toast.show("Share link copied to clipboard!");
    } catch (err) {
      console.error("Share error:", err);
      toast.show(err.message, "error");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Button
      onClick={handleShare}
      disabled={isSharing}
      title="Share configuration"
    >
      <Share2 />
      Share
    </Button>
  );
}
