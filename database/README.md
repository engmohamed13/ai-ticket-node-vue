# PostgreSQL Database Configuration

This directory contains resources for recreating and seeding the PostgreSQL database for the **ai-ticket-node-vue** project.

## Database Prerequisites
- **PostgreSQL**: Version 15 or 16 is recommended.
- **Database Name**: A database named `ticketdb` (or as configured in your `.env` file).

---

## Method 1: Recreating the Database using Prisma ORM (Recommended)

Prisma ORM manages the database schemas, migrations, and seeding in this project. This is the primary development workflow.

1. **Ensure environment variables are set** in `/backend/.env`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/ticketdb?schema=public"
   ```

2. **Run Migrations**:
   Run this command in the `/backend` directory to apply the database schema. This creates all tables, indexes, and constraints:
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Seed the Database**:
   Run the seed script in `/backend` to create the default demo user:
   ```bash
   npm run seed
   ```

---

## Method 2: Recreating the Database using Raw SQL (Fallback)

If you prefer to set up the database without Node.js or Prisma installed, or if you want to import it directly into a PostgreSQL instance (e.g., using pgAdmin or psql CLI):

1. **Create the Database**:
   Connect to your PostgreSQL server and execute:
   ```sql
   CREATE DATABASE ticketdb;
   ```

2. **Restore the Schema**:
   Run the DDL script to generate the tables, indexes, primary keys, and foreign keys:
   ```bash
   psql -U your_postgres_user -d ticketdb -f database/schema.sql
   ```

3. **Seed the Demo User**:
   Run the seed script to create the initial demo administrator account:
   ```bash
   psql -U your_postgres_user -d ticketdb -f database/seed.sql
   ```

---

## Default Demo User Credentials

Once the seed script or seed SQL is executed, the database will contain a demo account:
- **Email**: `admin@example.com`
- **Password**: `Password123!`
- **Role/Permissions**: Main Administrator account
