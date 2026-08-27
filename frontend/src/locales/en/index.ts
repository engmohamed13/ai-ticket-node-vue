import admin from './admin.json';
import auth from './auth.json';
import common from './common.json';
import communications from './communications.json';
import customers from './customers.json';
import dashboard from './dashboard.json';
import health from './health.json';
import kb from './kb.json';
import nav from './nav.json';
import notifications from './notifications.json';
import portal from './portal.json';
import reports from './reports.json';
import tickets from './tickets.json';
import validation from './validation.json';

/**
 * English is the fallback locale, so this object is the canonical shape every other
 * locale is checked against by src/tests/i18n.spec.ts.
 */
export default { admin, auth, common, communications, customers, dashboard, health, kb, nav, notifications, portal, reports, tickets, validation };
