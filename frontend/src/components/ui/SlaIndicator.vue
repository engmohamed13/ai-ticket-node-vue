<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatMinutes, minutesSinceCreated, resolutionSlaState, responseSlaState } from '../../services/ticketSla';
import type { SlaState } from '../../services/ticketSla';
import type { Ticket } from '../../types';
import StatusBadge from './StatusBadge.vue';

const props = withDefaults(defineProps<{ ticket: Ticket; compact?: boolean }>(), { compact: false });

const { t } = useI18n();

type Variant = 'success' | 'danger' | 'warning' | 'neutral';

const VARIANTS: Record<SlaState, Variant> = {
  met: 'success',
  overdue: 'danger',
  due: 'warning',
  none: 'neutral'
};

const response = computed(() => responseSlaState(props.ticket));
const resolution = computed(() => resolutionSlaState(props.ticket));

/** The compact row shows one pill: the worst of the two clocks. */
const overall = computed<SlaState>(() => {
  if (response.value === 'overdue' || resolution.value === 'overdue') return 'overdue';
  if (response.value === 'due' || resolution.value === 'due') return 'due';
  if (response.value === 'met' || resolution.value === 'met') return 'met';
  return 'none';
});

/** SLA state → translated label. The state itself stays the raw wire value. */
const overallLabel = (state: SlaState): string => t(`notifications.sla.overall.${state}`);

/** The per-clock badge label; "none" falls back to the shared em-dash placeholder. */
const stateLabel = (state: SlaState): string =>
  state === 'none' ? t('common.states.none') : t(`notifications.sla.state.${state}`);

const label = (stampedAt: string | null, target: number | null): string => {
  if (target === null) return t('notifications.sla.noTarget');
  if (stampedAt !== null) {
    return t('notifications.sla.elapsedOfTarget', {
      elapsed: formatMinutes(minutesSinceCreated(props.ticket, stampedAt)),
      target: formatMinutes(target)
    });
  }
  return t('notifications.sla.target', { target: formatMinutes(target) });
};
</script>

<template>
  <StatusBadge v-if="compact" :variant="VARIANTS[overall]" data-testid="sla-overall-badge">
    {{ overallLabel(overall) }}
  </StatusBadge>

  <div v-else class="sla-grid" data-testid="sla-indicator">
    <div class="sla-item">
      <span class="sla-label">{{ t('notifications.sla.firstResponse') }}</span>
      <StatusBadge :variant="VARIANTS[response]" data-testid="sla-response-badge">
        {{ stateLabel(response) }}
      </StatusBadge>
      <span class="sla-detail">{{ label(ticket.respondedAt, ticket.responseTimeMinutes) }}</span>
    </div>

    <div class="sla-item">
      <span class="sla-label">{{ t('notifications.sla.resolution') }}</span>
      <StatusBadge :variant="VARIANTS[resolution]" data-testid="sla-resolution-badge">
        {{ stateLabel(resolution) }}
      </StatusBadge>
      <span class="sla-detail">{{ label(ticket.resolvedAt, ticket.resolutionTimeMinutes) }}</span>
    </div>
  </div>
</template>

<style scoped>
.sla-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
}

.sla-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;
}

.sla-label {
  color: var(--text-muted);
  font-size: var(--font-xs);
}

.sla-detail {
  color: var(--text-subtle);
  font-size: var(--font-xs);
}
</style>
