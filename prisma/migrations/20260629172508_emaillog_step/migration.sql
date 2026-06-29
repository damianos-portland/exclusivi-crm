-- Add dunning sequence step to EmailLog
ALTER TABLE "EmailLog" ADD COLUMN "step" TEXT;
