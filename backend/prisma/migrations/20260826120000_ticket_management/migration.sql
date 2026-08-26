-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "assignedToUserId" INTEGER,
ADD COLUMN     "categoryId" INTEGER,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'Medium',
ADD COLUMN     "resolutionTimeMinutes" INTEGER,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "responseTimeMinutes" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'New';

-- CreateTable
CREATE TABLE "ticket_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_comments" (
    "id" SERIAL NOT NULL,
    "body" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_categories_name_key" ON "ticket_categories"("name");

-- CreateIndex
CREATE INDEX "ticket_comments_ticketId_idx" ON "ticket_comments"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_attachments_ticketId_idx" ON "ticket_attachments"("ticketId");

-- CreateIndex
CREATE INDEX "tickets_customerId_idx" ON "tickets"("customerId");

-- CreateIndex
CREATE INDEX "tickets_categoryId_idx" ON "tickets"("categoryId");

-- CreateIndex
CREATE INDEX "tickets_assignedToUserId_idx" ON "tickets"("assignedToUserId");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ticket_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
