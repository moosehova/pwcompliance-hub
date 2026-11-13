"use client";

import { useState } from "react";
import { updateObligationStatus } from "@/lib/actions/compliance";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "UPCOMING", label: "Upcoming" },
  { value: "DUE_SOON", label: "Due Soon" },
  { value: "DUE", label: "Due" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "PENDING_PAYMENT", label: "Pending Payment" },
  { value: "PAID", label: "Paid" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function UpdateStatusForm({ obligationId, currentStatus }: { obligationId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateObligationStatus({ id: obligationId, status: status as never, notes });
      setSuccess(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          Status updated successfully.
        </div>
      )}
      <div className="space-y-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Textarea
          placeholder="Add a note about this status change..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
      <Button type="submit" disabled={loading || status === currentStatus} className="w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Update Status
      </Button>
    </form>
  );
}
