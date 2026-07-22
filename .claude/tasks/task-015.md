# Task 015
Implement interactive dashboard navigation without changing any backend APIs.

The backend is already complete.

Do NOT modify backend code.

Do NOT add new APIs.

Do NOT change business logic.

=========================================================
Dashboard Card Navigation
=========================================================

Make every statistics card on the Dashboard clickable.

When a user clicks a statistics card, navigate to the Tickets page with the corresponding filter already applied.

Required behavior:

• Total Tickets
→ Navigate to the Ticket List and display all tickets.

• Open Tickets
→ Navigate to the Ticket List showing only Open tickets.

• Closed Tickets
→ Navigate to the Ticket List showing only Closed tickets.

• High Priority Tickets
→ Navigate to the Ticket List showing only High Priority tickets.

=========================================================
Filtering
=========================================================

Use Vue Router query parameters.

Example:

/tickets
/tickets?status=open
/tickets?status=closed
/tickets?priority=high

The Ticket page should automatically read the query parameters and apply the correct filter on initial load.

The filter should also remain active after page refresh.

=========================================================
UI
=========================================================

Improve the dashboard cards:

- Show pointer cursor.
- Add hover animation.
- Add smooth transition.
- Highlight on hover.
- Make the entire card clickable.

=========================================================
Implementation Rules
=========================================================

Reuse the existing Ticket List page.

Do NOT create a new page.

Do NOT duplicate components.

Do NOT add backend filtering.

Filtering should be performed on the frontend using the already loaded ticket data unless backend filtering already exists.

=========================================================
Verification
=========================================================

Verify:

✓ Total Tickets card navigates correctly.

✓ Open Tickets card navigates correctly.

✓ Closed Tickets card navigates correctly.

✓ High Priority card navigates correctly.

✓ URL query parameters work correctly.

✓ Refresh keeps the selected filter.

✓ Existing Ticket CRUD continues to work.

Build the frontend.

Return an implementation summary and stop.