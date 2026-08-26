-- CreateTable
CREATE TABLE "ticket_feedback" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "ticketId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_feedback_ticketId_key" ON "ticket_feedback"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_feedback_customerId_idx" ON "ticket_feedback"("customerId");

-- AddForeignKey
ALTER TABLE "ticket_feedback" ADD CONSTRAINT "ticket_feedback_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_feedback" ADD CONSTRAINT "ticket_feedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
