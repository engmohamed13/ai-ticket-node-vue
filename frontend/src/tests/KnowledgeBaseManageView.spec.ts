import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import KnowledgeBaseManageView from '../views/KnowledgeBaseManageView.vue';
import {
  createKbArticle,
  fetchKbArticle,
  fetchKbArticles,
  fetchKbCategories,
  updateKbArticle
} from '../services/kb.service';
import type { KbArticle, KbArticleSummary, KbCategory } from '../types';

vi.mock('../services/kb.service', () => ({
  fetchKbCategories: vi.fn(),
  fetchKbArticles: vi.fn(),
  fetchKbArticle: vi.fn(),
  createKbArticle: vi.fn(),
  updateKbArticle: vi.fn()
}));

const mockedCategories = fetchKbCategories as unknown as ReturnType<typeof vi.fn>;
const mockedArticles = fetchKbArticles as unknown as ReturnType<typeof vi.fn>;
const mockedArticle = fetchKbArticle as unknown as ReturnType<typeof vi.fn>;
const mockedCreate = createKbArticle as unknown as ReturnType<typeof vi.fn>;
const mockedUpdate = updateKbArticle as unknown as ReturnType<typeof vi.fn>;

const STAMP = '2026-08-26T10:00:00.000Z';

const category: KbCategory = { id: 3, name: 'Getting Started', description: null, createdAt: STAMP };

const summary = (overrides: Partial<KbArticleSummary> = {}): KbArticleSummary => ({
  id: 1,
  title: 'Cannot sign in',
  summary: 'Password resets.',
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
  body: '# Cannot sign in',
  ...overrides
});

const RouterLinkStub = { props: ['to'], template: '<a><slot /></a>' };

const mountView = () =>
  mount(KnowledgeBaseManageView, { global: { stubs: { RouterLink: RouterLinkStub } } });

describe('KnowledgeBaseManageView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockedCategories.mockResolvedValue([category]);
  });

  it('loads drafts alongside published articles', async () => {
    mockedArticles.mockResolvedValue([summary(), summary({ id: 2, isPublished: false })]);

    const wrapper = mountView();
    await flushPromises();

    expect(mockedArticles.mock.calls[0][0].includeDrafts).toBe(true);
    expect(wrapper.findAll('[data-testid="kb-manage-row"]')).toHaveLength(2);
  });

  it('shows the empty state when there are no articles', async () => {
    mockedArticles.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="kb-manage-empty"]').exists()).toBe(true);
  });

  it('opens a blank create form preset to the first category', async () => {
    mockedArticles.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="kb-article-form"]').exists()).toBe(false);

    await wrapper.find('[data-testid="kb-new-article-button"]').trigger('click');

    expect(wrapper.find('[data-testid="kb-article-form"]').exists()).toBe(true);
    expect(
      (wrapper.find('[data-testid="kb-form-category-select"]').element as HTMLSelectElement).value
    ).toBe('3');
  });

  it('creates an article from the form and closes it', async () => {
    mockedArticles.mockResolvedValue([]);
    mockedCreate.mockResolvedValue(article({ isPublished: true }));

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="kb-new-article-button"]').trigger('click');
    await wrapper.find('[data-testid="kb-form-title-input"]').setValue('  Reset your password  ');
    await wrapper.find('[data-testid="kb-form-body-input"]').setValue('  # Steps  ');
    await wrapper.find('[data-testid="kb-form-published-checkbox"]').setValue(true);
    await wrapper.find('[data-testid="kb-article-form"]').trigger('submit');
    await flushPromises();

    expect(mockedCreate).toHaveBeenCalledWith({
      title: 'Reset your password',
      body: '# Steps',
      categoryId: 3,
      summary: undefined,
      isPublished: true
    });
    expect(wrapper.find('[data-testid="kb-article-form"]').exists()).toBe(false);
  });

  it('keeps the form open when the create fails', async () => {
    mockedArticles.mockResolvedValue([]);
    mockedCreate.mockRejectedValue(new Error('Knowledge base category 3 not found'));

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="kb-new-article-button"]').trigger('click');
    await wrapper.find('[data-testid="kb-form-title-input"]').setValue('T');
    await wrapper.find('[data-testid="kb-form-body-input"]').setValue('B');
    await wrapper.find('[data-testid="kb-article-form"]').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-testid="kb-article-form"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kb-manage-error"]').text()).toContain('category 3 not found');
  });

  it('loads the markdown body when editing, since list rows do not carry it', async () => {
    mockedArticles.mockResolvedValue([summary()]);
    mockedArticle.mockResolvedValue(article());

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="kb-edit-article-button"]').trigger('click');
    await flushPromises();

    expect(mockedArticle).toHaveBeenCalledWith(1);
    expect(
      (wrapper.find('[data-testid="kb-form-body-input"]').element as HTMLTextAreaElement).value
    ).toBe('# Cannot sign in');
  });

  it('clears an emptied summary with an explicit null', async () => {
    mockedArticles.mockResolvedValue([summary()]);
    mockedArticle.mockResolvedValue(article());
    mockedUpdate.mockResolvedValue(article({ summary: null }));

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="kb-edit-article-button"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-testid="kb-form-summary-input"]').setValue('   ');
    await wrapper.find('[data-testid="kb-article-form"]').trigger('submit');
    await flushPromises();

    expect(mockedUpdate.mock.calls[0][1].summary).toBeNull();
  });

  it('toggles an article between published and draft', async () => {
    mockedArticles.mockResolvedValue([summary({ isPublished: true })]);
    mockedUpdate.mockResolvedValue(article({ isPublished: false }));

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="kb-toggle-published-button"]').trigger('click');
    await flushPromises();

    expect(mockedUpdate).toHaveBeenCalledWith(1, { isPublished: false });
  });

  it('disables submit until the required fields are filled', async () => {
    mockedArticles.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="kb-new-article-button"]').trigger('click');

    expect(wrapper.find('[data-testid="kb-form-submit-button"]').attributes('disabled')).toBeDefined();

    await wrapper.find('[data-testid="kb-form-title-input"]').setValue('T');
    await wrapper.find('[data-testid="kb-form-body-input"]').setValue('B');

    expect(wrapper.find('[data-testid="kb-form-submit-button"]').attributes('disabled')).toBeUndefined();
  });
});
