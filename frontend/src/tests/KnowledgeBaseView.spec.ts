import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import KnowledgeBaseView from '../views/KnowledgeBaseView.vue';
import KnowledgeBaseArticleView from '../views/KnowledgeBaseArticleView.vue';
import { useAuthStore } from '../stores/auth';
import { fetchKbArticle, fetchKbArticles, fetchKbCategories } from '../services/kb.service';
import type { KbArticle, KbArticleSummary, KbCategory, Permission } from '../types';

vi.mock('../services/kb.service', () => ({
  fetchKbCategories: vi.fn(),
  fetchKbArticles: vi.fn(),
  fetchKbArticle: vi.fn(),
  createKbArticle: vi.fn(),
  updateKbArticle: vi.fn()
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return { ...actual, useRoute: () => ({ params: { id: '1' } }) };
});

const mockedCategories = fetchKbCategories as unknown as ReturnType<typeof vi.fn>;
const mockedArticles = fetchKbArticles as unknown as ReturnType<typeof vi.fn>;
const mockedArticle = fetchKbArticle as unknown as ReturnType<typeof vi.fn>;

const STAMP = '2026-08-26T10:00:00.000Z';

const category: KbCategory = { id: 3, name: 'Getting Started', description: 'First steps', createdAt: STAMP };

const summary = (overrides: Partial<KbArticleSummary> = {}): KbArticleSummary => ({
  id: 1,
  title: 'Cannot sign in',
  summary: 'Password resets and locked accounts.',
  categoryId: 3,
  category,
  isPublished: true,
  viewCount: 4,
  authorId: 7,
  author: { id: 7, name: 'Agent' },
  createdAt: STAMP,
  updatedAt: STAMP,
  ...overrides
});

const article = (overrides: Partial<KbArticle> = {}): KbArticle => ({
  ...summary(),
  body: '# Cannot sign in\n\nReset your password from the sign-in screen.',
  ...overrides
});

const signInAs = (permissions: Permission[]): void => {
  const auth = useAuthStore();
  auth.token = 'jwt';
  auth.user = {
    id: 7,
    name: 'Agent',
    email: 'agent@crm.local',
    isActive: true,
    roleKey: 'SUPPORT_AGENT',
    roleName: 'Support Agent',
    permissions,
    customerId: null,
    department: null,
    branch: null
  };
};

const RouterLinkStub = { props: ['to'], template: '<a><slot /></a>' };

const mountBrowse = () => mount(KnowledgeBaseView, { global: { stubs: { RouterLink: RouterLinkStub } } });
const mountArticle = () =>
  mount(KnowledgeBaseArticleView, { global: { stubs: { RouterLink: RouterLinkStub } } });

describe('KnowledgeBaseView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockedCategories.mockResolvedValue([category]);
  });

  it('lists the articles and the category rail after loading', async () => {
    signInAs(['kb:read']);
    mockedArticles.mockResolvedValue([summary()]);

    const wrapper = mountBrowse();
    await flushPromises();

    expect(wrapper.findAll('[data-testid="kb-article-item"]')).toHaveLength(1);
    expect(wrapper.findAll('[data-testid="kb-category-item"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('Cannot sign in');
  });

  it('searches on submit with the typed term', async () => {
    signInAs(['kb:read']);
    mockedArticles.mockResolvedValue([]);

    const wrapper = mountBrowse();
    await flushPromises();

    await wrapper.find('[data-testid="kb-search-input"]').setValue('billing');
    await wrapper.find('[data-testid="kb-search-form"]').trigger('submit');
    await flushPromises();

    expect(mockedArticles).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'billing' })
    );
  });

  it('filters by category from the rail', async () => {
    signInAs(['kb:read']);
    mockedArticles.mockResolvedValue([summary()]);

    const wrapper = mountBrowse();
    await flushPromises();

    await wrapper.find('[data-testid="kb-category-item"]').trigger('click');
    await flushPromises();

    expect(mockedArticles).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: 3 }));
  });

  it('shows the empty state when nothing matches', async () => {
    signInAs(['kb:read']);
    mockedArticles.mockResolvedValue([]);

    const wrapper = mountBrowse();
    await flushPromises();

    expect(wrapper.find('[data-testid="kb-empty"]').exists()).toBe(true);
  });

  it('offers the manage link only to a kb:manage holder', async () => {
    signInAs(['kb:read']);
    mockedArticles.mockResolvedValue([]);

    const reader = mountBrowse();
    await flushPromises();
    expect(reader.find('[data-testid="kb-manage-link"]').exists()).toBe(false);

    setActivePinia(createPinia());
    signInAs(['kb:read', 'kb:manage']);
    const author = mountBrowse();
    await flushPromises();
    expect(author.find('[data-testid="kb-manage-link"]').exists()).toBe(true);
  });

  it('marks a draft row with a badge', async () => {
    signInAs(['kb:read', 'kb:manage']);
    mockedArticles.mockResolvedValue([summary({ isPublished: false })]);

    const wrapper = mountBrowse();
    await flushPromises();

    expect(wrapper.find('[data-testid="kb-draft-badge"]').exists()).toBe(true);
  });

  it('surfaces a load failure in the error banner', async () => {
    signInAs(['kb:read']);
    mockedArticles.mockRejectedValue(new Error('Unable to load the knowledge base'));

    const wrapper = mountBrowse();
    await flushPromises();

    expect(wrapper.find('[data-testid="kb-error"]').text()).toContain('Unable to load the knowledge base');
  });
});

describe('KnowledgeBaseArticleView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders the markdown body as HTML', async () => {
    mockedArticle.mockResolvedValue(article());

    const wrapper = mountArticle();
    await flushPromises();

    const body = wrapper.find('[data-testid="kb-article-body"]');
    expect(body.html()).toContain('<h2>Cannot sign in</h2>');
    expect(body.text()).toContain('Reset your password');
  });

  it('never injects author-supplied markup', async () => {
    mockedArticle.mockResolvedValue(article({ body: '<script>alert(1)</script>' }));

    const wrapper = mountArticle();
    await flushPromises();

    const html = wrapper.find('[data-testid="kb-article-body"]').html();
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('shows the view count and category', async () => {
    mockedArticle.mockResolvedValue(article({ viewCount: 12 }));

    const wrapper = mountArticle();
    await flushPromises();

    expect(wrapper.find('[data-testid="kb-article-views"]').text()).toBe('12 views');
    expect(wrapper.find('[data-testid="kb-article-meta"]').text()).toContain('Getting Started');
  });

  it('shows the not-found state when the article cannot be read', async () => {
    mockedArticle.mockRejectedValue(new Error('Article 1 not found'));

    const wrapper = mountArticle();
    await flushPromises();

    expect(wrapper.find('[data-testid="kb-article-missing"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kb-article-error"]').text()).toContain('Article 1 not found');
  });

  it('badges a draft an author is previewing', async () => {
    mockedArticle.mockResolvedValue(article({ isPublished: false }));

    const wrapper = mountArticle();
    await flushPromises();

    expect(wrapper.find('[data-testid="kb-article-draft-badge"]').exists()).toBe(true);
  });
});
