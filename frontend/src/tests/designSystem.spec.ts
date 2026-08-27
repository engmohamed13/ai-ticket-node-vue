import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AlertBanner from '../components/ui/AlertBanner.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

/**
 * The design system is CSS-first: the tokens live in style.css and every component
 * reads them. These tests guard the two things that silently break — a token that
 * disappears (every consumer falls back to the browser default) and a component
 * whose existing prop/slot contract changes under a refactor.
 *
 * The stylesheet is read off disk rather than imported: Vitest stubs CSS imports
 * (including `?raw`), so an import would assert against an empty string and pass
 * no matter what the real file contains. `import.meta.url` is an http URL under
 * jsdom, so the path is resolved from the Vitest working directory instead.
 */
const styleSheet = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf8');

const REQUIRED_TOKENS = [
  // Brand + semantic status
  '--color-primary',
  '--color-primary-hover',
  '--color-primary-bg',
  '--color-ok',
  '--color-ok-bg',
  '--color-degraded',
  '--color-degraded-bg',
  '--color-down',
  '--color-down-bg',
  '--color-info',
  '--color-info-bg',
  // Neutrals + semantic aliases
  '--text-main',
  '--text-muted',
  '--text-subtle',
  '--border-color',
  '--border-color-strong',
  '--surface-color',
  '--surface-sunken',
  '--neutral-bg',
  '--neutral-fg',
  // Spacing
  '--space-1',
  '--space-4',
  '--space-8',
  '--space-12',
  '--space-16',
  '--space-20',
  // Radius
  '--radius-xs',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-xl',
  '--radius-full',
  // Shadows
  '--shadow-xs',
  '--shadow-sm',
  '--shadow-md',
  '--shadow-lg',
  '--shadow-xl',
  // Typography
  '--font-xs',
  '--font-base',
  '--font-2xl',
  '--font-3xl',
  '--font-4xl',
  '--line-height-tight',
  '--line-height-normal',
  '--line-height-relaxed',
  '--letter-spacing-wide',
  // Motion, focus, layout
  '--transition-fast',
  '--transition',
  '--focus-ring',
  '--focus-ring-color',
  '--opacity-disabled',
  '--header-height',
  '--sidebar-width'
];

const REQUIRED_CLASSES = [
  // Buttons
  '.btn',
  '.btn-primary',
  '.btn-secondary',
  '.btn-ghost',
  '.btn-danger',
  '.btn-xs',
  '.btn-sm',
  '.btn-lg',
  '.btn-icon',
  '.btn-block',
  // Forms
  '.form-field',
  '.form-grid',
  '.form-actions',
  '.form-field-error',
  '.form-field-success',
  '.field-error',
  '.field-success',
  '.field-required',
  // Badges + alerts
  '.badge',
  '.badge-sm',
  '.badge-success',
  '.alert',
  '.alert-error',
  '.alert-close',
  // Surfaces
  '.card',
  '.card-header',
  '.card-footer',
  '.card-subtitle',
  // Tables
  '.table-wrapper',
  '.cell-numeric',
  '.cell-center',
  '.cell-actions',
  '.th-sortable',
  '.pagination',
  '.table-message',
  // States
  '.spinner',
  '.skeleton',
  '.skeleton-text',
  '.skeleton-row',
  '.empty-state',
  '.loading-state',
  // Dialogs + toolbar
  '.dialog',
  '.dialog-overlay',
  '.dialog-header',
  '.dialog-body',
  '.dialog-footer',
  '.toolbar',
  // Utilities + a11y
  '.sr-only',
  '.skip-link',
  '.text-truncate',
  '.text-muted',
  '.flex-between',
  '.stack',
  '.hide-sm',
  '.hide-md'
];

describe('design tokens', () => {
  it.each(REQUIRED_TOKENS)('defines %s', (token) => {
    expect(styleSheet).toContain(`${token}:`);
  });

  it.each(REQUIRED_CLASSES)('defines the %s utility', (className) => {
    expect(styleSheet).toContain(className);
  });

  it('honours the reduced-motion preference', () => {
    expect(styleSheet).toContain('prefers-reduced-motion: reduce');
  });

  it('ships a system dark theme that re-points the semantic aliases', () => {
    expect(styleSheet).toContain('prefers-color-scheme: dark');
    const darkBlock = styleSheet.slice(styleSheet.indexOf('prefers-color-scheme: dark'));
    for (const token of ['--text-main', '--surface-color', '--surface-sunken', '--border-color']) {
      expect(darkBlock).toContain(`${token}:`);
    }
  });

  it('keeps a visible keyboard focus ring', () => {
    expect(styleSheet).toContain(':focus-visible');
  });
});

describe('StatusBadge', () => {
  it('renders slot text with the variant class', () => {
    const wrapper = mount(StatusBadge, { props: { variant: 'success' }, slots: { default: 'ok' } });
    expect(wrapper.text()).toBe('ok');
    expect(wrapper.classes()).toContain('badge');
    expect(wrapper.classes()).toContain('badge-success');
  });

  it('defaults to the neutral variant and medium size', () => {
    const wrapper = mount(StatusBadge, { slots: { default: 'draft' } });
    expect(wrapper.classes()).toContain('badge-neutral');
    expect(wrapper.classes()).not.toContain('badge-sm');
  });

  it('applies the small size when asked', () => {
    const wrapper = mount(StatusBadge, { props: { size: 'sm' }, slots: { default: 'x' } });
    expect(wrapper.classes()).toContain('badge-sm');
  });
});

describe('AlertBanner', () => {
  it('marks an error banner with role="alert" and shows the icon', () => {
    const wrapper = mount(AlertBanner, { props: { variant: 'error' }, slots: { default: 'Boom' } });
    expect(wrapper.attributes('role')).toBe('alert');
    expect(wrapper.classes()).toContain('alert-error');
    expect(wrapper.find('.alert-icon').exists()).toBe(true);
    expect(wrapper.text()).toContain('Boom');
  });

  it('uses role="status" for non-error variants', () => {
    const wrapper = mount(AlertBanner, { props: { variant: 'success' }, slots: { default: 'Saved' } });
    expect(wrapper.attributes('role')).toBe('status');
  });

  it('has no close button unless dismissible', () => {
    const wrapper = mount(AlertBanner, { slots: { default: 'Note' } });
    expect(wrapper.find('.alert-close').exists()).toBe(false);
  });

  it('emits dismiss when the close button is clicked', async () => {
    const wrapper = mount(AlertBanner, {
      props: { dismissible: true, dismissLabel: 'Close' },
      slots: { default: 'Note' }
    });
    const close = wrapper.find('.alert-close');
    expect(close.attributes('aria-label')).toBe('Close');
    await close.trigger('click');
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
  });
});

describe('LoadingState', () => {
  it('renders a spinner plus the label by default', () => {
    const wrapper = mount(LoadingState, { slots: { default: 'Loading…' } });
    expect(wrapper.find('.spinner').exists()).toBe(true);
    expect(wrapper.attributes('role')).toBe('status');
    expect(wrapper.text()).toContain('Loading…');
  });

  it('renders the requested number of skeleton lines', () => {
    const wrapper = mount(LoadingState, { props: { variant: 'skeleton', rows: 5 } });
    expect(wrapper.findAll('.skeleton-text')).toHaveLength(5);
  });

  it('renders a skeleton table grid and keeps the label for screen readers', () => {
    const wrapper = mount(LoadingState, {
      props: { variant: 'table', rows: 3, columns: 4 },
      slots: { default: 'Loading tickets' }
    });
    expect(wrapper.findAll('.skeleton-row')).toHaveLength(3);
    expect(wrapper.findAll('.skeleton-cell')).toHaveLength(12);
    expect(wrapper.find('.sr-only').text()).toBe('Loading tickets');
  });
});

describe('EmptyState', () => {
  it('renders the title, description, and default icon', () => {
    const wrapper = mount(EmptyState, { props: { title: 'Nothing here', description: 'Add one' } });
    expect(wrapper.text()).toContain('Nothing here');
    expect(wrapper.text()).toContain('Add one');
    expect(wrapper.find('.empty-state-icon').exists()).toBe(true);
  });

  it('lets the caller replace the icon and add actions', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'Empty' },
      slots: { icon: '<span class="custom-icon" />', actions: '<button>New</button>' }
    });
    expect(wrapper.find('.custom-icon').exists()).toBe(true);
    expect(wrapper.find('.empty-state-icon').exists()).toBe(false);
    expect(wrapper.find('button').text()).toBe('New');
  });
});

describe('PageHeader', () => {
  it('renders the title, subtitle, and actions slot', () => {
    const wrapper = mount(PageHeader, {
      props: { title: 'Tickets', subtitle: 'All open work' },
      slots: { actions: '<button>New ticket</button>' }
    });
    expect(wrapper.find('h2').text()).toBe('Tickets');
    expect(wrapper.text()).toContain('All open work');
    expect(wrapper.find('.page-header-actions button').text()).toBe('New ticket');
  });

  it('omits the breadcrumb nav when no crumbs are given', () => {
    const wrapper = mount(PageHeader, { props: { title: 'Tickets' } });
    expect(wrapper.find('nav.breadcrumbs').exists()).toBe(false);
  });

  it('renders crumbs, linking every one except the current page', () => {
    const wrapper = mount(PageHeader, {
      props: {
        title: 'Ticket 12',
        breadcrumbs: [{ label: 'Tickets', to: { name: 'tickets' } }, { label: 'Ticket 12' }]
      },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } }
    });
    const nav = wrapper.find('nav.breadcrumbs');
    expect(nav.exists()).toBe(true);
    expect(nav.attributes('aria-label')).toBe('Breadcrumb');
    expect(nav.findAll('li')).toHaveLength(2);
    expect(nav.find('a').text()).toBe('Tickets');
    expect(nav.find('[aria-current="page"]').text()).toBe('Ticket 12');
  });
});
