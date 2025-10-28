import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";

interface CopyToClipboardButtonProps {
  content: string;
  onCopy: (content: string) => Promise<void>;
}

export function CopyToClipboardButton({ content, onCopy }: CopyToClipboardButtonProps) {
  const [isCopying, setIsCopying] = useState(false);

  const handleClick = useCallback(async () => {
    if (isCopying) {
      return;
    }

    setIsCopying(true);

    try {
      await onCopy(content);
    } finally {
      setIsCopying(false);
    }
  }, [content, isCopying, onCopy]);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isCopying}
      aria-label="Kopiuj plan"
    >
      {isCopying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {isCopying ? "Kopiowanie..." : "Kopiuj"}
      <span className="sr-only" aria-live="polite">
        {isCopying ? "Kopiowanie planu do schowka" : "Plan gotowy do skopiowania"}
      </span>
    </Button>
  );
}

