-- Add IMAP message-id for inbound email dedup
ALTER TABLE "EmailLog" ADD COLUMN "messageId" TEXT;
CREATE UNIQUE INDEX "EmailLog_messageId_key" ON "EmailLog"("messageId");
