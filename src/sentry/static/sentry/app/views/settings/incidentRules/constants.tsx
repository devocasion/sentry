import {t} from 'app/locale';
import {
  AlertRuleThresholdType,
  UnsavedIncidentRule,
  Trigger,
  Dataset,
} from 'app/views/settings/incidentRules/types';
import {Incident} from 'app/views/alerts/types';
import {NewQuery} from 'app/types';

export const DEFAULT_AGGREGATE = 'count()';

type Preset = {
  /**
   * The regex used to match aggregates to this preset.
   */
  match: RegExp;
  /**
   * The name of the preset
   */
  name: string;
  /**
   * The dataset that this preset applys to.
   */
  validDataset: Dataset[];
  /**
   * The default aggregate to use when selecting this preset
   */
  default: string;
  /**
   * Used to generate additional parameters in the 'show in discover' button on
   * the alert details page.
   */
  makeQueryParameters: (incident: Incident) => Partial<NewQuery>;
};

export const PRESET_AGGREGATES: Preset[] = [
  {
    match: /^count\(\)/,
    name: t('Number of errors'),
    validDataset: [Dataset.ERRORS],
    default: 'count()',
    makeQueryParameters: (incident: Incident) => ({
      fields: ['issue', incident.alertRule.aggregate],
    }),
  },
  {
    match: /^count_unique\(tags\[sentry:user\]\)/,
    name: t('Users affected'),
    validDataset: [Dataset.ERRORS],
    default: 'count_unique(tags[sentry:user])',
    makeQueryParameters: (incident: Incident) => ({
      fields: ['issue', incident.alertRule.aggregate],
    }),
  },
  {
    match: /^(p[0-9]{2,3}|percentile\(transaction\.duration,[^)]+\))/,
    name: t('Latency'),
    validDataset: [Dataset.TRANSACTIONS],
    default: 'percentile(transaction.duration, 0.95)',
    makeQueryParameters: (incident: Incident) => ({
      fields: ['id', 'transaction.duration', incident.alertRule.aggregate],
      orderby: '-transaction.duration',
    }),
  },
  {
    match: /^apdex\([0-9.]+\)/,
    name: t('Apdex'),
    validDataset: [Dataset.TRANSACTIONS],
    default: 'apdex(300)',
    makeQueryParameters: (incident: Incident) => ({
      fields: ['id', 'transaction.duration', incident.alertRule.aggregate],
      orderby: '-transaction.duration',
    }),
  },
  {
    match: /^count\(\)/,
    name: t('Throughput'),
    validDataset: [Dataset.TRANSACTIONS],
    default: 'count()',
    makeQueryParameters: (incident: Incident) => ({
      fields: ['transaction', 'user', 'timestamp', incident.alertRule.aggregate],
    }),
  },
  {
    match: /^error_rate\(\)/,
    name: t('Error rate'),
    validDataset: [Dataset.TRANSACTIONS],
    default: 'error_rate()',
    makeQueryParameters: (incident: Incident) => ({
      fields: ['transaction.status', 'count()', incident.alertRule.aggregate],
      display: 'top5',
    }),
  },
];

export const DATASET_EVENT_TYPE_FILTERS = {
  [Dataset.ERRORS]: 'event.type:error',
  [Dataset.TRANSACTIONS]: 'event.type:transaction',
} as const;

export function createDefaultTrigger(): Trigger {
  return {
    label: 'critical',
    alertThreshold: '',
    resolveThreshold: '',
    thresholdType: AlertRuleThresholdType.ABOVE,
    actions: [],
  };
}

export function createDefaultRule(): UnsavedIncidentRule {
  return {
    dataset: Dataset.ERRORS,
    aggregate: DEFAULT_AGGREGATE,
    query: '',
    timeWindow: 1,
    triggers: [createDefaultTrigger()],
    projects: [],
    environment: null,
  };
}
