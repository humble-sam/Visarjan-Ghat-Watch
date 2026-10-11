import type { Filters } from './types';

export const DEFAULT_FILTERS: Filters = {
  years: [2025],
  festivals: ['Ganesh', 'Durga'],
  phases: ['pre', 'during', 'after'],
};

export const PHASE_LABELS = {
  pre: 'Before',
  during: 'During',
  after: 'After',
} as const;

export function formatScope(filters: Filters): string {
  if (!filters.years.length || !filters.festivals.length || !filters.phases.length) {
    return 'No period selected';
  }
  return [
    [...filters.years].sort().join(', '),
    filters.festivals.join(' + '),
    filters.phases.map((phase) => PHASE_LABELS[phase]).join(' / '),
  ].join(' · ');
}
