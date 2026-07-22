-- Seed default demo admin user
-- Credentials:
--   Email: admin@example.com
--   Password: Password123!

INSERT INTO "User" ("name", "email", "passwordHash")
VALUES (
    'Admin',
    'admin@example.com',
    '$2a$10$tZ2R8B4w0bJ7/NfVpQ2JieE7sF47y6o9iM9wE0.86rMh6H7R3Q5eq' -- bcrypt hash of 'Password123!'
)
ON CONFLICT ("email") DO NOTHING;
