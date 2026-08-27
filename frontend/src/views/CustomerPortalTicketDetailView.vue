<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { usePortalStore } from '../stores/portal';
import { FEEDBACK_RATING_MAX, FEEDBACK_RATING_MIN } from '../types';
import type { Ticket, TicketPriority } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = usePortalStore();
const route = useRoute();
const { t, locale } = useI18n();

const ticketId = computed(() => Number(route.params.id));

const RATINGS = Array.from(
  { length: FEEDBACK_RATING_MAX - FEEDBACK_RATING_MIN + 1 },
  (_, index) => FEEDBACK_RATING_MIN + index
);

const rating = ref(0);
const comment = ref('');

const statusVariant = (status: Ticket['status']): 'success' | 'neutral' | 'primary' | 'warning' | 'info' => {
  switch (status) {
    case 'New':
      return 'info';
    case 'Open':
    case 'In Progress':
      return 'primary';
    case 'Pending':
      return 'warning';
    case 'Resolved':
      return 'success';
    case 'Closed':
      return 'neutral';
  }
};

const priorityVariant = (priority: TicketPriority): 'neutral' | 'primary' | 'warning' | 'danger' => {
  switch (priority) {
    case 'Low':
      return 'neutral';
    case 'Medium':
      return 'primary';
    case 'High':
      return 'warning';
    case 'Urgent':
      return 'danger';
  }
};

const formatDateTime = (value: string): string => new Date(value).toLocaleString(locale.value);

const onSubmitFeedback = async (): Promise<void> => {
  if (rating.value < FEEDBACK_RATING_MIN) return;
  const submitted = await store.submitFeedback(
    ticketId.value,
    rating.value,
    comment.value.trim() === '' ? undefined : comment.value.trim()
  );
  if (submitted) {
    rating.value = 0;
    comment.value = '';
  }
};

onMounted(() => {
  void store.loadTicketDetail(ticketId.value);
});

// Navigating straight from one portal ticket to another reuses this component, so the id
// change has to drive a reload — mounting only happens once.
watch(ticketId, (next) => {
  rating.value = 0;
  comment.value = '';
  void store.loadTicketDetail(next);
});
</script>

<template>
  <section class="view">
    <PageHeader
      :title="store.selectedTicket?.subject ?? t('portal.detail.fallbackTitle')"
      :subtitle="t('portal.detail.subtitle')"
    >
      <template #actions>
        <RouterLink class="btn btn-secondary" :to="{ name: 'portal' }" data-testid="portal-back-link">
          {{ t('portal.detail.backToList') }}
        </RouterLink>
      </template>
    </PageHeader>

    <AlertBanner v-if="store.error" variant="error" data-testid="portal-detail-error">
      {{ store.error }}
    </AlertBanner>
    <AlertBanner v-if="store.notice" variant="success" data-testid="portal-detail-notice">
      {{ store.notice }}
    </AlertBanner>

    <LoadingState v-if="store.detailLoading" data-testid="portal-detail-loading">
      {{ t('portal.detail.loading') }}
    </LoadingState>

    <EmptyState
      v-else-if="!store.selectedTicket"
      :title="t('portal.detail.missingTitle')"
      :description="t('portal.detail.missingDescription')"
      data-testid="portal-detail-missing"
    />

    <template v-else>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('portal.detail.requestDetails') }}</h3>
        </div>
        <dl class="card-padded detail-grid" data-testid="portal-ticket-detail">
          <div>
            <dt>{{ t('portal.detail.fields.reference') }}</dt>
            <dd>#{{ store.selectedTicket.id }}</dd>
          </div>
          <div>
            <dt>{{ t('portal.detail.fields.status') }}</dt>
            <dd>
              <StatusBadge :variant="statusVariant(store.selectedTicket.status)" data-testid="portal-detail-status">
                {{ store.selectedTicket.status }}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <dt>{{ t('portal.detail.fields.priority') }}</dt>
            <dd>
              <StatusBadge :variant="priorityVariant(store.selectedTicket.priority)">
                {{ store.selectedTicket.priority }}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <dt>{{ t('portal.detail.fields.category') }}</dt>
            <dd>{{ store.selectedTicket.category?.name ?? t('common.states.none') }}</dd>
          </div>
          <div>
            <dt>{{ t('portal.detail.fields.opened') }}</dt>
            <dd>{{ formatDateTime(store.selectedTicket.createdAt) }}</dd>
          </div>
          <div>
            <dt>{{ t('portal.detail.fields.lastUpdated') }}</dt>
            <dd>{{ formatDateTime(store.selectedTicket.updatedAt) }}</dd>
          </div>
          <div v-if="store.selectedTicket.resolvedAt">
            <dt>{{ t('portal.detail.fields.resolved') }}</dt>
            <dd>{{ formatDateTime(store.selectedTicket.resolvedAt) }}</dd>
          </div>
        </dl>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t('portal.feedback.title') }}</h3>
        </div>

        <div v-if="store.feedback" class="card-padded" data-testid="portal-feedback-summary">
          <p class="rating-line">
            <span class="rating-value" data-testid="portal-feedback-rating">
              {{ store.feedback.rating }}/{{ FEEDBACK_RATING_MAX }}
            </span>
            <span class="stars" aria-hidden="true">{{ '★'.repeat(store.feedback.rating) }}</span>
          </p>
          <p v-if="store.feedback.comment" class="feedback-comment">{{ store.feedback.comment }}</p>
          <p v-else class="muted">{{ t('portal.feedback.noComment') }}</p>
          <p class="muted submitted-at">
            {{ t('portal.feedback.submittedAt', { date: formatDateTime(store.feedback.createdAt) }) }}
          </p>
        </div>

        <form
          v-else-if="store.canLeaveFeedback"
          class="card-padded"
          data-testid="portal-feedback-form"
          @submit.prevent="onSubmitFeedback"
        >
          <fieldset class="rating-field">
            <legend>{{ t('portal.feedback.prompt') }}</legend>
            <div class="rating-options">
              <button
                v-for="value in RATINGS"
                :key="value"
                class="rating-button"
                :class="{ 'is-selected': value <= rating }"
                type="button"
                :aria-pressed="value === rating"
                :aria-label="t('portal.feedback.starAriaLabel', { value, max: FEEDBACK_RATING_MAX })"
                :data-testid="`portal-feedback-star-${value}`"
                @click="rating = value"
              >
                ★
              </button>
              <span class="muted">
                {{ rating === 0 ? t('portal.feedback.pickRating') : `${rating}/${FEEDBACK_RATING_MAX}` }}
              </span>
            </div>
          </fieldset>

          <div class="form-field">
            <label for="portal-feedback-comment">{{ t('portal.feedback.commentLabel') }}</label>
            <textarea
              id="portal-feedback-comment"
              v-model="comment"
              data-testid="portal-feedback-comment-input"
              rows="4"
              maxlength="1000"
            ></textarea>
          </div>

          <div class="form-actions">
            <button
              class="btn btn-primary"
              type="submit"
              :disabled="rating < FEEDBACK_RATING_MIN || store.submitting"
              data-testid="portal-submit-feedback-button"
            >
              {{ store.submitting ? t('portal.feedback.submitting') : t('portal.feedback.submit') }}
            </button>
          </div>
        </form>

        <div v-else class="card-padded">
          <p class="muted" data-testid="portal-feedback-locked">
            {{ t('portal.feedback.locked') }}
          </p>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.detail-grid dt {
  font-size: var(--font-sm);
  color: var(--text-subtle);
  margin-bottom: 0.25rem;
}

.detail-grid dd {
  margin: 0;
  font-weight: 500;
}

.rating-field {
  border: 0;
  padding: 0;
  margin: 0 0 var(--space-3);
}

.rating-field legend {
  padding: 0;
  font-size: var(--font-sm);
  font-weight: 500;
  margin-bottom: 0.4rem;
}

.rating-options {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.rating-button {
  background: none;
  border: 0;
  cursor: pointer;
  font-size: 1.6rem;
  line-height: 1;
  padding: 0.1rem;
  color: var(--border-color);
  transition: color var(--transition-fast);
}

.rating-button:hover,
.rating-button.is-selected {
  color: #f59e0b;
}

.rating-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 var(--space-2);
}

.rating-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.stars {
  color: #f59e0b;
  font-size: 1.25rem;
}

.feedback-comment {
  margin: 0 0 var(--space-2);
  white-space: pre-wrap;
}

.submitted-at {
  font-size: var(--font-sm);
  margin: 0;
}

.muted {
  color: var(--text-subtle);
}
</style>
