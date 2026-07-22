-- Create User Table
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create Ticket Table
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- Create Comment Table
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- Create Unique Index on User Email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Add ForeignKey on Ticket for createdBy referencing User
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add ForeignKey on Comment for ticketId referencing Ticket
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_ticketId_fkey" 
    FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add ForeignKey on Comment for createdBy referencing User
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;
