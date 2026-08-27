import { config } from '@vue/test-utils';
import { createAppI18n } from '../config/i18n';

/**
 * Every view calls `useI18n()`, which needs an i18n instance on the app it is mounted
 * into. Registering it globally here means each spec keeps calling `mount(View)` with no
 * plugin plumbing of its own.
 *
 * The locale is pinned to English so the text assertions across the suite read the same
 * strings the views shipped with before translation. A spec that needs Arabic switches
 * `i18n.global.locale.value` itself and restores it afterwards.
 */
export const i18n = createAppI18n('en');

config.global.plugins = [...(config.global.plugins ?? []), i18n];
