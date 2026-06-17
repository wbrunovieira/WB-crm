-- ─────────────────────────────────────────────────────────────────────────────
-- One-off backfill: reclassify recipients wrongly marked BOUNCED as SUPPRESSED.
--
-- Context: a fixed bug in SendCampaignStepUseCase marked a recipient BOUNCED when its
-- email was already on the suppression list (e.g. a prior bounce), even though we never
-- sent to it. That inflated campaign bounce rates with contacts we deliberately skipped.
-- The fix introduces a SUPPRESSED status; this script corrects the historical rows.
--
-- DISCRIMINATOR (a row is a suppression skip, NOT a real bounce, when ALL hold):
--   1. status = 'BOUNCED'
--   2. the email is on the OWNER's suppression list with reason bounced/spam
--      (the precondition for the bug to fire)
--   3. NO bounce activity was ever logged for it — wording-independent:
--      type='campaign_email' AND completed=false AND failReason IS NOT NULL.
--      A real bounce always logs such an activity; a suppression skip never sent, so none.
--
-- IMPORTANT: deploy the code fix FIRST. Otherwise new sends keep recreating false bounces.
--
-- Validated against production 2026-06-17: expected to reclassify 400 rows
-- (607 BOUNCED total → 207 real bounces remain).
--
-- Run inside a transaction; verify the SELECT count before COMMIT.
--   docker exec -i crm_postgres psql -U crm_user -d crm_db -f - < backfill-suppressed-recipients.sql
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Pre-check: how many rows WILL be reclassified (expect 400).
SELECT count(*) AS will_reclassify
FROM email_campaign_recipients r
JOIN email_campaigns c ON c.id = r."campaignId"
WHERE r.status = 'BOUNCED'
  AND EXISTS (
    SELECT 1 FROM email_suppressions s
    WHERE lower(s.email) = lower(r.email)
      AND s."ownerId" = c."ownerId"
      AND s.reason IN ('bounced', 'spam')
  )
  AND NOT EXISTS (
    SELECT 1 FROM activities a
    WHERE a."emailCampaignId" = r."campaignId"
      AND a.type = 'campaign_email'
      AND a.completed = false
      AND a."failReason" IS NOT NULL
      AND (a."leadId" = r."recipientId" OR a."contactId" = r."recipientId")
  );

UPDATE email_campaign_recipients r
   SET status = 'SUPPRESSED'
  FROM email_campaigns c
 WHERE r."campaignId" = c.id
   AND r.status = 'BOUNCED'
   AND EXISTS (
     SELECT 1 FROM email_suppressions s
     WHERE lower(s.email) = lower(r.email)
       AND s."ownerId" = c."ownerId"
       AND s.reason IN ('bounced', 'spam')
   )
   AND NOT EXISTS (
     SELECT 1 FROM activities a
     WHERE a."emailCampaignId" = r."campaignId"
       AND a.type = 'campaign_email'
       AND a.completed = false
       AND a."failReason" IS NOT NULL
       AND (a."leadId" = r."recipientId" OR a."contactId" = r."recipientId")
   );

-- Post-check: status breakdown after the update (BOUNCED should drop to ~207).
SELECT status, count(*) FROM email_campaign_recipients GROUP BY status ORDER BY 2 DESC;

-- Review the two counts above. If they match expectations, COMMIT. Otherwise ROLLBACK.
COMMIT;
