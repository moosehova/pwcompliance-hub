"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFixedAsset } from "@/lib/actions/tax-returns";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteAssetButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Remove this asset from the schedule?")) return;
    setLoading(true);
    try {
      await deleteFixedAsset(assetId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
