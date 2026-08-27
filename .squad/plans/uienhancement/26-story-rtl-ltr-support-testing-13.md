# Story 26 — RTL/LTR Support & Final Testing (Story: 13)

## Prerequisites

- Story 25 completed: [25-story-views-ui-refinement-13.md](25-story-views-ui-refinement-13.md). All views use design system and i18n.
- Story 24 completed: [24-story-core-layout-improvements-13.md](24-story-core-layout-improvements-13.md). Core layout supports RTL.
- Story 23 completed: [23-story-internationalization-setup-13.md](23-story-internationalization-setup-13.md). Language switching and RTL detection work.
- Story 22 completed: [22-story-design-system-enhancement-13.md](22-story-design-system-enhancement-13.md). Design tokens and CSS support RTL.

---

## Story Goal

Ensure full RTL/LTR layout support for Arabic and English, test the complete user journey in both languages and directions, perform accessibility and visual regression testing, and finalize the UI/UX enhancement feature for release.

Outcomes:

1. **RTL/LTR layouts** — all components and views correctly mirror for Arabic (RTL) and English (LTR).
2. **Bilingual testing** — complete user flow tested in Arabic and English.
3. **Accessibility verification** — WCAG 2.1 AA compliance confirmed.
4. **Visual regression testing** — responsive design verified at all breakpoints.
5. **Performance verification** — no performance regression from i18n and design changes.
6. **Translation review** — Arabic translations reviewed for accuracy and context.

---

## Context — Read These Files First

1. `frontend/src/style.css` — Story 22 enhancements; verify no hardcoded `left`/`right` or `margin-left`/`margin-right` values.
2. `frontend/src/config/i18n.ts` — Story 23 RTL detection functions.
3. `frontend/src/locales/ar/` — Story 23 Arabic translations.
4. All views from Story 25 — verify RTL/LTR layout correctness.

---

## Implementation Tasks

### 1 — Audit CSS for hardcoded directional properties

**File: `frontend/src/style.css`** and all component `<style>` blocks

Search for and replace directional properties:

Find all instances of:
- `left`, `right` (use `inset-inline-start`, `inset-inline-end` or flexbox)
- `margin-left`, `margin-right` (use `margin-inline-start`, `margin-inline-end`)
- `padding-left`, `padding-right` (use `padding-inline-start`, `padding-inline-end`)
- `border-left`, `border-right` (use `border-inline-start`, `border-inline-end`)
- `text-align: left` (use `text-align: start` or just `text-align: inherit`)
- `border-radius` with specific corners (keep general, or use logical properties)

**Examples of CSS logical properties to use:**

```css
/* Old (directional) */
.sidebar {
  margin-left: 1rem;
}

/* New (logical) */
.sidebar {
  margin-inline-start: 1rem;
}

/* For flexbox, use `flex-direction: row` and let RTL handle it */
.header-right {
  display: flex;
  gap: var(--space-4);
  /* Don't use margin-right; let flex handle alignment */
}

/* For positioning, use logical properties */
.skip-link {
  left: var(--space-4);  /* Old */
  inset-inline-start: var(--space-4);  /* New */
}
```

**Action:** Audit `frontend/src/style.css` and all component `<style>` blocks for directional properties. Update to logical properties or flexbox/grid layouts.

### 2 — Verify responsive design at all breakpoints

Create a test checklist for responsive behavior:

**Test at these viewport widths:**
- 320px (small mobile)
- 375px (standard mobile)
- 480px (large mobile)
- 640px (small tablet)
- 768px (tablet)
- 1024px (large tablet/small desktop)
- 1280px (desktop)
- 1920px (large desktop)

**Checklist for each breakpoint in both LTR and RTL:**
- [ ] Header layout does not break; logo and controls are visible
- [ ] Sidebar is accessible (drawer on mobile, visible on desktop)
- [ ] Page content has proper padding and margins
- [ ] Tables scroll horizontally without breaking layout
- [ ] Forms are readable with proper input sizing
- [ ] Buttons are touch-friendly (min 44x44px on mobile)
- [ ] No horizontal scroll on body
- [ ] Text is readable (font sizes appropriate)

### 3 — Accessibility audit

Use automated tools and manual testing:

**Automated checks (browser DevTools):**
- [ ] Lighthouse Accessibility score ≥90 for all major views
- [ ] No WCAG AA contrast violations reported
- [ ] No missing alt text (if applicable)
- [ ] No missing labels on form inputs

**Manual keyboard navigation:**
- [ ] Tab through all interactive elements
- [ ] All focusable elements visible (focus rings show)
- [ ] Tab order logical (left to right in LTR, right to left in RTL)
- [ ] No keyboard traps (can tab out of all sections)
- [ ] Escape key closes modals/dialogs

**Screen reader testing (NVDA/JAWS):**
- [ ] All text content readable
- [ ] Form labels associated with inputs
- [ ] Button purposes clear
- [ ] Navigation landmarks semantic (`<header>`, `<nav>`, `<main>`)
- [ ] Tables have proper `<th>` headers

**RTL-specific checks:**
- [ ] Layout mirrors correctly (sidebar on right in RTL)
- [ ] Icons/images don't need mirroring (e.g., arrows for back/forward should mirror)
- [ ] Text direction is consistent

### 4 — Visual regression testing

**Manual comparison (RTL vs LTR):**

For each major view, take screenshots at 3 breakpoints (mobile, tablet, desktop) in both English (LTR) and Arabic (RTL):

Views to test:
1. Login screen
2. Dashboard
3. Customers (list + detail)
4. Tickets (list + detail)
5. Communications
6. Users/Roles admin screens
7. Knowledge Base

**Acceptance criteria:**
- [ ] Layouts mirror correctly in RTL
- [ ] No content overflow or clipping
- [ ] Spacing is consistent
- [ ] Text readability maintained
- [ ] Color scheme consistent
- [ ] Interactive elements work in both directions

### 5 — Performance verification

**Metrics to measure:**
- [ ] Initial page load time (before/after i18n)
- [ ] Time to interactive (TTI)
- [ ] Cumulative Layout Shift (CLS)
- [ ] Translation bundle size

**Acceptance:**
- No significant regression (< 10% slower on low-end device)
- LCP < 3 seconds
- CLS < 0.1

Run with `npm run build` and test with Lighthouse.

### 6 — Translation review and completeness

**Checklist:**
- [ ] All UI labels translated to Arabic (no English fallback needed)
- [ ] Translations are contextually accurate (not just machine translation)
- [ ] Arabic translations reviewed by native speaker
- [ ] No hardcoded English strings in components
- [ ] Plural handling works correctly if used
- [ ] Numbers/dates format correctly in both locales
- [ ] Validation messages translated

**Key Arabic translations to verify:**
- Navigation labels
- Button labels (Save, Cancel, Delete, etc.)
- Form labels and placeholders
- Error and success messages
- Empty state messages
- Help text and tooltips

### 7 — Final integration testing

**Complete user journeys in both languages:**

**Journey 1: User Authentication & Dashboard**
- [ ] Load app → login screen in English
- [ ] Switch to Arabic → all text RTL
- [ ] Login with demo account
- [ ] Verify dashboard displays correctly in Arabic
- [ ] Navigate sidebar links
- [ ] Switch back to English → LTR layout
- [ ] Logout

**Journey 2: Customer Management**
- [ ] View customer list in Arabic
- [ ] Create new customer (form displayed correctly)
- [ ] View customer detail
- [ ] Edit customer
- [ ] Verify table displays correctly

**Journey 3: Ticket Management**
- [ ] View ticket list in Arabic
- [ ] Create ticket with description
- [ ] View ticket detail
- [ ] Add comment/interaction
- [ ] Verify timeline displays correctly

**Journey 4: Admin Functions**
- [ ] View users list in Arabic
- [ ] Manage user roles
- [ ] Edit role permissions
- [ ] Verify all admin screens RTL

**Journey 5: Responsive on Mobile**
- [ ] Test all above journeys on mobile (375px)
- [ ] Verify sidebar drawer works
- [ ] Verify form inputs are touch-friendly
- [ ] Verify tables scroll on mobile

---

## Edge Cases & Failure Modes

- **Browser does not support logical CSS properties.** Fallback: use `left`/`right` with `[dir="rtl"]` attribute selector for broad browser support. Logical properties are progressive enhancement.
- **Arabic translations are too long.** Some Arabic text is longer than English; adjust CSS width constraints or use `text-truncate` class if needed.
- **Icons don't mirror in RTL.** Some icons (arrows, checkmarks) should mirror; others (play, pause) should not. Component developers handle per-icon.
- **Number formatting differs in Arabic.** Use `Intl.NumberFormat` if number formatting is context-dependent; currently accept EN numerals.
- **User's system locale differs from app locale.** App explicitly controls locale; system preference is not used (by design).

---

## Test Plan

1. **Create `frontend/src/tests/rtl.spec.ts`** — no mocks:
   - `getLocaleDirection('ar')` returns `'rtl'`
   - `getLocaleDirection('en')` returns `'ltr'`
   - Document direction updates when locale changes
   - RTL translation keys exist and have content

2. **Create `frontend/src/tests/i18nCompleteness.spec.ts`**:
   - Spot-check 20 common translation keys in both en and ar
   - Verify no untranslated (missing) keys in ar
   - Verify key structure matches between en and ar

3. **Manual test matrix:**
   - 3 breakpoints (mobile, tablet, desktop) × 2 languages × all views = comprehensive coverage
   - Keyboard navigation test on 3 major views
   - Screen reader test on 2 major views
   - Performance baseline + after measurements

---

## Verification Steps

**Critical path (must pass before merge):**

1. **Build and type check:** `npm run build` and `npm run typecheck` exit 0
2. **Tests:** `npm test` passes all tests including new RTL and i18n completeness tests
3. **Responsive check:** Manual test at 320px, 768px, 1920px in both English and Arabic
4. **Accessibility:** Lighthouse audit ≥90 on Dashboard view
5. **Keyboard navigation:** Tab through Login → Dashboard → Customers in English, then repeat in Arabic
6. **Critical user journey:** Login as admin → view customers → edit/create → logout in Arabic
7. **Performance:** Lighthouse Performance score ≥85 (< 10% regression from Story 22)

**Additional (should pass):**

8. **RTL/LTR visual:** Compare dashboard screenshot English (LTR) vs Arabic (RTL) — layouts mirror correctly
9. **Translation accuracy:** Spot-check 10 Arabic labels with native speaker
10. **Mobile UX:** Test complete flow on mobile device (375px) in both languages
11. **Screen reader:** Test navigation and form with NVDA/JAWS on Customers view

---

## Done Criteria

- [ ] CSS uses logical properties (`margin-inline-start`, etc.) or flexbox/grid for layout; no hardcoded `left`/`right` breaks RTL.
- [ ] Document direction (`<html dir="rtl">` / `<html dir="ltr">`) updates when language changes.
- [ ] All major views tested at mobile (320-480px), tablet (640-768px), desktop (1280-1920px) in both English and Arabic.
- [ ] No horizontal scrolling on body; responsive layout works at all breakpoints.
- [ ] Keyboard navigation works in both directions; Tab order is logical.
- [ ] Focus rings visible on all interactive elements; no keyboard traps.
- [ ] Lighthouse Accessibility score ≥90 on 3 representative views.
- [ ] Screen reader can read all content; labels properly associated.
- [ ] Complete user journeys pass in both English and Arabic (login, customers, tickets, admin).
- [ ] Arabic translations reviewed for accuracy and context.
- [ ] Performance regression < 10% (Lighthouse ≥85).
- [ ] `npm run build`, `npm run typecheck`, `npm test` all exit 0.
- [ ] Manual visual regression testing shows correct RTL/LTR mirroring.

---

**STOP HERE. Report to the user and wait for confirmation before merging to main.**

This completes the UI/UX Enhancement feature (Stories 22–26). All stories have been planned and are ready for implementation. Review the acceptance criteria and verification steps to ensure readiness for execution.

