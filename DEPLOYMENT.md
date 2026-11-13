# Deployment Checklist

## Required Environment Variables

Set these in Vercel project settings (Settings → Environment Variables):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Random 32+ char string — generate with `openssl rand -hex 32` |
| `NEXTAUTH_URL` | ✅ | Full URL of the deployment (e.g. `https://compliance-hub.vercel.app`) |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Vercel Blob token — generate in Storage → Blob → `compliance-vault` |
| `NEXT_PUBLIC_APP_NAME` | optional | App display name (defaults to "Compliance Hub") |
| `NEXT_PUBLIC_APP_URL` | optional | Same as `NEXTAUTH_URL`, used for client-side links |

> **Security note:** `BLOB_READ_WRITE_TOKEN` is a server-only secret. Never expose it in
> client-side code or `NEXT_PUBLIC_*` variables. All file downloads are proxied server-side —
> blob URLs are never sent to the browser.

---

## Vercel Blob Storage Setup

1. Go to [vercel.com](https://vercel.com) → Your project → Storage tab
2. Click **Add Store** → **Blob**
3. Name the store `compliance-vault`
4. Copy the `BLOB_READ_WRITE_TOKEN` to environment variables (see above)
5. Files are stored with non-guessable UUID paths under `vault/` and `vault-tax/` prefixes
6. All downloads are proxied through `/api/vault/[id]/download` and `/api/vault/tax/[id]/download`

---

## Database Migration Commands

Run these in order against the production database:

```bash
# 1. Apply all pending migrations
npx prisma migrate deploy

# 2. Verify migration status
npx prisma migrate status
```

If migrations are out of sync, resolve with:

```bash
# Mark a migration as applied without running SQL (use only if already applied manually)
npx prisma migrate resolve --applied "0001_baseline"
npx prisma migrate resolve --applied "0002_vault_v2_cloud_storage"
npx prisma migrate resolve --applied "0003_turnover_tax_computation"
```

### Migration history

| Migration | Description |
|---|---|
| `0001_baseline` | Full DB baseline — all tables from initial `db push` state |
| `0002_vault_v2_cloud_storage` | Rename `storagePath` → `blobUrl`, add `TaxDocumentCategory` enum, `taxYear` on `TaxReturnDocument` |
| `0003_turnover_tax_computation` | Add `TurnoverTaxComputation` table for Turnover Tax workflow |

---

## Preview Deployment Testing

Before promoting to production, test on a Vercel preview deployment:

1. **Auth**: sign in as `musole@mhventures.co.zm` (demo user — seed only, never production)
2. **Document upload**: upload a PDF via `/documents` and `/tax/documents` — confirm download works
3. **Permission checks**: sign in as a VIEWER and confirm `/api/vault/upload` returns 403
4. **Turnover Tax**:
   - Navigate to `/tax/turnover` — confirm the draft rate warning appears
   - Create a new return via `/tax/returns/new?type=TURNOVER_TAX`
   - Complete the eligibility and computation forms
5. **Blob unavailability**: temporarily revoke `BLOB_READ_WRITE_TOKEN` and confirm the upload
   returns a 503 (not 500/unhandled)
6. **TypeScript**: run `npx tsc --noEmit` — must pass with zero errors

---

## Production Deployment Steps

1. Merge the feature branch into `main`
2. Set all required environment variables in Vercel (see above)
3. Deploy:
   ```bash
   vercel --prod
   ```
4. Run migrations:
   ```bash
   DATABASE_URL=<prod-url> npx prisma migrate deploy
   ```
5. Run the seed to create the TOT rule (idempotent — safe to re-run):
   ```bash
   DATABASE_URL=<prod-url> npx prisma db seed
   ```
6. Verify the deployment by visiting `/tax/turnover` and confirming the rate warning
7. Update the `tot-rule-2024` record: set `isDraft = false` and `verifiedAt` after a qualified
   tax practitioner confirms the rate against current ZRA guidelines

---

## Rollback Procedure

If a critical issue is found after production deploy:

1. **Revert the Vercel deployment** via the Vercel dashboard → Deployments → previous deploy → Promote
2. **Roll back the database migration** (only if schema change causes issues):
   ```sql
   DROP TABLE IF EXISTS "TurnoverTaxComputation";
   DELETE FROM _prisma_migrations WHERE migration_name = '0003_turnover_tax_computation';
   ```
3. Regenerate Prisma client against the rolled-back schema:
   ```bash
   npx prisma generate
   ```

> Files already uploaded to Vercel Blob are not affected by a rollback and remain available.
> The `blobUrl` column in both `Document` and `TaxReturnDocument` tables is preserved across all migrations.

---

## Turnover Tax Rate Verification

The seeded TOT rule (`tot-rule-2024`) uses a **DRAFT 4% rate**. Before production use:

- [ ] Confirm the current rate with ZRA or a qualified Zambian tax practitioner
- [ ] Verify against the current edition of the Income Tax Act Cap 323 (Zambia)
- [ ] Update the `TaxRule` record: set `isDraft = false`, `verifiedAt = <date>`, and correct `flatRate` if needed
- [ ] Update `source` to cite the specific ZRA publication or Act section

> **Do not file a Turnover Tax return using an unverified rate.**
