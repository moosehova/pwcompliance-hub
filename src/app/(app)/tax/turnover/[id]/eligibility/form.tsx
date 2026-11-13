"use client";

import { useState, useTransition } from "react";
import { saveTotEligibility } from "@/lib/actions/turnover-tax";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface Props {
  taxReturnId: string;
  initialData?: {
    annualTurnoverCheck: boolean;
    notVatRegistered: boolean;
    eligibilityNotes: string;
  };
  readOnly?: boolean;
}

export function TotEligibilityForm({ taxReturnId, initialData, readOnly }: Props) {
  const [annualTurnoverCheck, setAnnualTurnoverCheck] = useState(
    initialData?.annualTurnoverCheck ?? false
  );
  const [notVatRegistered, setNotVatRegistered] = useState(
    initialData?.notVatRegistered ?? false
  );
  const [eligibilityNotes, setEligibilityNotes] = useState(initialData?.eligibilityNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isEligible = annualTurnoverCheck && notVatRegistered;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await saveTotEligibility({
          taxReturnId,
          annualTurnoverCheck,
          notVatRegistered,
          eligibilityNotes,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eligibility Criteria</CardTitle>
          <p className="text-sm text-muted-foreground">
            Confirm that this business meets the Zambian Turnover Tax eligibility requirements.
            Rates and thresholds must be verified against current ZRA guidelines.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Check 1 */}
          <EligibilityCheck
            id="annualTurnoverCheck"
            checked={annualTurnoverCheck}
            onChange={setAnnualTurnoverCheck}
            readOnly={readOnly}
            label="Annual gross turnover does not exceed the TOT threshold"
            description="Verify the current annual turnover threshold with ZRA before confirming. The threshold is set by the Income Tax Act and may change each tax year."
          />

          {/* Check 2 */}
          <EligibilityCheck
            id="notVatRegistered"
            checked={notVatRegistered}
            onChange={setNotVatRegistered}
            readOnly={readOnly}
            label="Business is not VAT-registered (or VAT threshold not exceeded)"
            description="A business registered for VAT is not eligible for Turnover Tax. Confirm current VAT registration status with ZRA."
          />

          {/* Summary */}
          <div
            className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium ${
              isEligible
                ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
            }`}
          >
            {isEligible ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            {isEligible
              ? "Based on the checks above, this business appears eligible for Turnover Tax."
              : "One or more eligibility criteria are not yet confirmed."}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="eligibilityNotes" className="text-sm font-medium">
              Notes
            </label>
            <textarea
              id="eligibilityNotes"
              value={eligibilityNotes}
              onChange={(e) => setEligibilityNotes(e.target.value)}
              disabled={readOnly}
              rows={3}
              placeholder="Optional notes on eligibility determination…"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-green-700 dark:text-green-400">Eligibility saved.</p>
      )}

      {!readOnly && (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Eligibility"}
        </Button>
      )}
    </form>
  );
}

function EligibilityCheck({
  id,
  checked,
  onChange,
  readOnly,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  readOnly?: boolean;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={readOnly}
        className="mt-1 h-4 w-4 rounded border accent-primary cursor-pointer disabled:cursor-default"
      />
      <div>
        <label htmlFor={id} className={`text-sm font-medium ${readOnly ? "" : "cursor-pointer"}`}>
          {checked ? (
            <span className="text-green-700 dark:text-green-400">{label}</span>
          ) : (
            label
          )}
        </label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
