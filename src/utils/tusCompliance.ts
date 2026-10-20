import { FurnaceClass, InstrumentationType, FurnaceApplication } from '../types/tus';

export interface TusIntervalInfo {
  initialIntervalMonths: number;
  extendedIntervalMonths: number;
  initialLabel: string;
  extendedLabel: string;
  consecutiveSuccessRequired: number;
  tableRef: 'Table 15' | 'Table 16';
  applicationLabel: string;
  description: string;
  graceDaysInitial: number;
  graceDaysExtended: number;
}

/**
 * AMS 2750 Rev H Table 15 (Parts) & Table 16 (Raw Material): TUS Intervals
 * Evaluates Normal (Initial) and Extended Periodic TUS Frequency based on:
 * - Furnace Class (1 through 6)
 * - Instrumentation Type ('A', 'B', 'C', 'D+', 'D', 'E')
 * - Application ('Parts' [Table 15] vs 'Raw Material' [Table 16])
 *
 * Note per AMS 2750 Rev H Table 15 Footnote (2) & Table 16 Footnote (2):
 * "Does not include the initial TUS."
 * Also incorporates Table 20 Permitted Test Interval Extension (Grace Days):
 * - Monthly: +4 calendar days
 * - Bimonthly / Quarterly: +7 calendar days
 * - Semi-annually / Annually: +14 calendar days
 */
export function getTusIntervalInfo(
  furnaceClass: FurnaceClass,
  instrumentationType: InstrumentationType = 'B',
  furnaceApplication: FurnaceApplication = 'Parts'
): TusIntervalInfo {
  const isRawMaterial = furnaceApplication === 'Raw Material';
  const tableRef = isRawMaterial ? 'Table 16' : 'Table 15';
  const applicationLabel = isRawMaterial ? 'Raw Material (Table 16)' : 'Parts (Table 15)';

  if (furnaceClass === 1 || furnaceClass === 2) {
    if (instrumentationType === 'A') {
      const reqCount = isRawMaterial ? 2 : 3;
      return {
        initialIntervalMonths: 1,
        extendedIntervalMonths: 6,
        initialLabel: 'Monthly',
        extendedLabel: 'Semi-annually',
        consecutiveSuccessRequired: reqCount,
        tableRef,
        applicationLabel,
        graceDaysInitial: 4,
        graceDaysExtended: 14,
        description: `AMS 2750 Rev H ${tableRef} — Class ${furnaceClass}, Type A (${applicationLabel}): Monthly normal periodic interval (+4 days max grace per Table 20). Extends to Semi-annually (+14 days max grace) after ${reqCount} consecutive successful periodic surveys (Initial TUS excluded).`,
      };
    }
    if (instrumentationType === 'B' || instrumentationType === 'C') {
      const reqCount = isRawMaterial ? 3 : 4;
      return {
        initialIntervalMonths: 1,
        extendedIntervalMonths: 3,
        initialLabel: 'Monthly',
        extendedLabel: 'Quarterly',
        consecutiveSuccessRequired: reqCount,
        tableRef,
        applicationLabel,
        graceDaysInitial: 4,
        graceDaysExtended: 7,
        description: `AMS 2750 Rev H ${tableRef} — Class ${furnaceClass}, Type ${instrumentationType} (${applicationLabel}): Monthly normal periodic interval (+4 days max grace per Table 20). Extends to Quarterly (+7 days max grace) after ${reqCount} consecutive successful periodic surveys (Initial TUS excluded).`,
      };
    }
    // Type D+ or D (Note: Type E is restricted to Class 6 only per Table 9)
    if (isRawMaterial) {
      return {
        initialIntervalMonths: 1,
        extendedIntervalMonths: 2,
        initialLabel: 'Monthly',
        extendedLabel: 'Bimonthly',
        consecutiveSuccessRequired: 8,
        tableRef,
        applicationLabel,
        graceDaysInitial: 4,
        graceDaysExtended: 7,
        description: `AMS 2750 Rev H Table 16 — Class ${furnaceClass}, Type ${instrumentationType} (Raw Material): Monthly normal periodic interval (+4 days max grace per Table 20). Extends to Bimonthly (+7 days max grace) after 8 consecutive successful periodic surveys (Initial TUS excluded).`,
      };
    }
    return {
      initialIntervalMonths: 1,
      extendedIntervalMonths: 3,
      initialLabel: 'Monthly',
      extendedLabel: 'Quarterly',
      consecutiveSuccessRequired: 4,
      tableRef,
      applicationLabel,
      graceDaysInitial: 4,
      graceDaysExtended: 7,
      description: `AMS 2750 Rev H Table 15 — Class ${furnaceClass}, Type ${instrumentationType} (Parts): Monthly normal periodic interval (+4 days max grace per Table 20). Extends to Quarterly (+7 days max grace) after 4 consecutive successful periodic surveys (Initial TUS excluded).`,
    };
  }

  if (furnaceClass === 3 || furnaceClass === 4 || furnaceClass === 5) {
    if (instrumentationType === 'A') {
      return {
        initialIntervalMonths: 3,
        extendedIntervalMonths: 12,
        initialLabel: 'Quarterly',
        extendedLabel: 'Annually',
        consecutiveSuccessRequired: 2,
        tableRef,
        applicationLabel,
        graceDaysInitial: 7,
        graceDaysExtended: 14,
        description: `AMS 2750 Rev H ${tableRef} — Class ${furnaceClass}, Type A (${applicationLabel}): Quarterly normal periodic interval (+7 days max grace per Table 20). Extends to Annually (+14 days max grace) after 2 consecutive successful periodic surveys (Initial TUS excluded).`,
      };
    }
    if (instrumentationType === 'B' || instrumentationType === 'C') {
      return {
        initialIntervalMonths: 3,
        extendedIntervalMonths: 6,
        initialLabel: 'Quarterly',
        extendedLabel: 'Semi-annually',
        consecutiveSuccessRequired: 3,
        tableRef,
        applicationLabel,
        graceDaysInitial: 7,
        graceDaysExtended: 14,
        description: `AMS 2750 Rev H ${tableRef} — Class ${furnaceClass}, Type ${instrumentationType} (${applicationLabel}): Quarterly normal periodic interval (+7 days max grace per Table 20). Extends to Semi-annually (+14 days max grace) after 3 consecutive successful periodic surveys (Initial TUS excluded).`,
      };
    }
    // Type D+ or D
    return {
      initialIntervalMonths: 3,
      extendedIntervalMonths: 6,
      initialLabel: 'Quarterly',
      extendedLabel: 'Semi-annually',
      consecutiveSuccessRequired: 4,
      tableRef,
      applicationLabel,
      graceDaysInitial: 7,
      graceDaysExtended: 14,
      description: `AMS 2750 Rev H ${tableRef} — Class ${furnaceClass}, Type ${instrumentationType} (${applicationLabel}): Quarterly normal periodic interval (+7 days max grace per Table 20). Extends to Semi-annually (+14 days max grace) after 4 consecutive successful periodic surveys (Initial TUS excluded).`,
    };
  }

  // Class 6
  if (instrumentationType === 'E') {
    return {
      initialIntervalMonths: 12,
      extendedIntervalMonths: 12,
      initialLabel: 'Annually',
      extendedLabel: 'Annually (Not Applicable)',
      consecutiveSuccessRequired: 0,
      tableRef,
      applicationLabel,
      graceDaysInitial: 14,
      graceDaysExtended: 14,
      description: `AMS 2750 Rev H ${tableRef} — Class 6, Type E (${applicationLabel}): Annually normal periodic interval (+14 days max grace per Table 20). Reduced frequency is not applicable.`,
    };
  }

  return {
    initialIntervalMonths: 6,
    extendedIntervalMonths: 12,
    initialLabel: 'Semi-annually',
    extendedLabel: 'Annually',
    consecutiveSuccessRequired: 2,
    tableRef,
    applicationLabel,
    graceDaysInitial: 14,
    graceDaysExtended: 14,
    description: `AMS 2750 Rev H ${tableRef} — Class 6, Type ${instrumentationType} (${applicationLabel}): Semi-annually normal periodic interval (+14 days max grace per Table 20). Extends to Annually (+14 days max grace) after 2 consecutive successful periodic surveys (Initial TUS excluded).`,
  };
}

/**
 * Legacy lookup by FurnaceClass (defaults to Type B, Parts)
 */
export const TUS_INTERVALS: Record<FurnaceClass, TusIntervalInfo> = {
  1: getTusIntervalInfo(1, 'B', 'Parts'),
  2: getTusIntervalInfo(2, 'B', 'Parts'),
  3: getTusIntervalInfo(3, 'B', 'Parts'),
  4: getTusIntervalInfo(4, 'B', 'Parts'),
  5: getTusIntervalInfo(5, 'B', 'Parts'),
  6: getTusIntervalInfo(6, 'B', 'Parts'),
};

/**
 * Helper to calculate next TUS due date using calendar months per AMS 2750 Rev H
 */
export function calculateNextTusDueDate(
  lastSurveyDate: string,
  furnaceClass: FurnaceClass,
  isExtended: boolean = false,
  instrumentationType: InstrumentationType = 'B',
  furnaceApplication: FurnaceApplication = 'Parts'
): string {
  const parts = lastSurveyDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';

  const [year, month, day] = parts;
  const interval = getTusIntervalInfo(furnaceClass, instrumentationType, furnaceApplication);
  const monthsToAdd = isExtended ? interval.extendedIntervalMonths : interval.initialIntervalMonths;

  const date = new Date(Date.UTC(year, month - 1 + monthsToAdd, day));
  if (isNaN(date.getTime())) return '';

  return date.toISOString().split('T')[0];
}
