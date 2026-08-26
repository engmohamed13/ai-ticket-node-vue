<script setup lang="ts">
import { computed } from 'vue';
import { formatMinutes, minutesSinceCreated, resolutionSlaState, responseSlaState } from '../../services/ticketSla';
import type { SlaState } from '../../services/ticketSla';
import type { Ticket } from '../../types';
import StatusBadge from './StatusBadge.vue';

const props = withDefaults(defineProps<{ ticket: Ticket; compact?: boolean }>(), { compact: false });

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

const OVERALL_LABELS: Record<SlaState, string> = {
  met: 'On time',
  overdue: 'Overdue',
  due: 'Within SLA',
  none: 'No SLA'
};

const label = (stampedAt: string | null, target: number | null): string => {
  if (target === null) return 'No target';
  if (stampedAt !== null) {
    return `${formatMinutes(minutesSinceCreated(props.ticket, stampedAt))} of ${formatMinutes(target)}`;
  }
  return `Target ${formatMinutes(target)}`;
};
</script>

<template>
  <StatusBadge v-if="compact" :variant="VARIANTS[overall]" data-testid="sla-overall-badge">
    {{ OVERALL_LABELS[overall] }}
  </StatusBadge>

  <div v-else class="sla-grid" data-testid="sla-indicator">
    <div class="sla-item">
      <span class="sla-label">First response</span>
      <StatusBadge :variant="VARIANTS[response]" data-testid="sla-response-badge">
        {{ response === 'overdue' ? 'Overdue' : response === 'met' ? 'Met' : response === 'due' ? 'Pending' : '—' }}
      </StatusBadge>
      <span class="sla-detail">{{ label(ticket.respondedAt, ticket.responseTimeMinutes) }}</span>
    </div>

    <div class="sla-item">
      <span class="sla-label">Resolution</span>
      <StatusBadge :variant="VARIANTS[resolution]" data-testid="sla-resolution-badge">
        {{ resolution === 'overdue' ? 'Overdue' : resolution === 'met' ? 'Met' : resolution === 'due' ? 'Pending' : '—' }}
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
