"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTaxReturnStatus } from "@/lib/actions/tax-returns";
import { Button } from "@/components/ui/button";
import { Loader2, Send, CheckCircle2, XCircle, Flag, Upload } from "lucide-react";
import type { TaxReturnReviewAction } from "@prisma/client";

interface Props {
  taxReturn: { id: string; status: string };
}

type ActionDef = {
  action: TaxReturnReviewAction;
  label: string;
  icon: React.ElementType;
  variant: "default" | "outline" | "destructive";
  fromStatuses: string[];
};

const ACTIONS: ActionDef[] = [
  {
    action: "SUBMIT_FOR_REVIEW",
    label: "Submit for Review",
    icon: Send,
    variant: "default",
    fromStatuses: ["DRAFT", "CHANGES_REQUESTED"],
  },
  {
    action: "APPROVE",
    label: "Approve",
    icon: CheckCircle2,
    variant: "default",
    fromStatuses: ["UNDER_REVIEW"],
  },
  {
    action: "REQUEST_CHANGES",
    label: "Request Changes",
    icon: XCircle,
    variant: "outline",
    fromStatuses: ["UNDER_REVIEW"],
  },
  {
    action: "SUBMIT_TO_ZRA",
    label: "Submit to ZRA",
    icon: Upload,
    variant: "default",
    fromStatuses: ["APPROVED"],
  },
  {
    action: "COMPLETE",
    label: "Mark Complete",
    icon: Flag,
    variant: "outline",
    fromStatuses: ["SUBMITTED"],
  },
];

export function TaxReturnWorkflowActions({ taxReturn }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null);

  const availableActions = ACTIONS.filter((a) => a.fromStatuses.includes(taxReturn.status));
  if (availableActions.length === 0) return null;

  async function execute(action: TaxReturnReviewAction) {
    setLoading(action);
    setError(null);
    try {
      await updateTaxReturnStatus(taxReturn.id, action, notes || undefined);
      setShowNotesFor(null);
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2 flex-wrap justify-end">
        {availableActions.map((a) => (
          <Button
            key={a.action}
            variant={a.variant}
            size="sm"
            disabled={!!loading}
            onClick={() => {
              if (a.action === "REQUEST_CHANGES" || a.action === "SUBMIT_FOR_REVIEW") {
                setShowNotesFor(showNotesFor === a.action ? null : a.action);
              } else {
                execute(a.action);
              }
            }}
          >
            {loading === a.action ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <a.icon className="h-3.5 w-3.5 mr-1.5" />
            )}
            {a.label}
          </Button>
        ))}
      </div>
      {showNotesFor && (
        <div className="flex gap-2 w-full max-w-sm">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note (optional)…"
            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="sm"
            disabled={!!loading}
            onClick={() => execute(showNotesFor as TaxReturnReviewAction)}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
