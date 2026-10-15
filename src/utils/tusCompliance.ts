import { FurnaceClass, InstrumentationType } from '../types/tus';

export interface TusIntervalInfo {
  initialIntervalDays: number;
  extendedIntervalDays: number;
  consecutiveSuccessRequired: number;
  description: string;
}

/**
 * AMS 2750 Rev H Table 14: TUS Intervals
 */
export const TUS_INTERVALS: Record<FurnaceClass, TusIntervalInfo> = {
  1: {
    initialIntervalDays: 30,
    extendedIntervalDays: 60,
    consecutiveSuccessRequired: 8,
    description: 'Class 1: Monthly initial. Extends to Bi-monthly after 8 successful surveys.'
  },
  2: {
    initialIntervalDays: 60,
    extendedIntervalDays: 90,
    consecutiveSuccessRequired: 8,
    description: 'Class 2: Bi-monthly initial. Extends to Quarterly after 8 successful surveys.'
  },
  3: {
    initialIntervalDays: 90,
    extendedIntervalDays: 180,
    consecutiveSuccessRequired: 8,
    description: 'Class 3: Quarterly initial. Extends to Semi-annually after 8 successful surveys.'
  },
  4: {
    initialIntervalDays: 90,
    extendedIntervalDays: 180,
    consecutiveSuccessRequired: 8,
    description: 'Class 4: Quarterly initial. Extends to Semi-annually after 8 successful surveys.'
  },
  5: {
    initialIntervalDays: 90,
    extendedIntervalDays: 180,
    consecutiveSuccessRequired: 8,
    description: 'Class 5: Quarterly initial. Extends to Semi-annually after 8 successful surveys.'
  },
  6: {
    initialIntervalDays: 90,
    extendedIntervalDays: 180,
    consecutiveSuccessRequired: 8,
    description: 'Class 6: Quarterly initial. Extends to Semi-annually after 8 successful surveys.'
  }
};

/**
 * Helper to calculate next TUS due date
 */
export function calculateNextTusDueDate(
  lastSurveyDate: string,
  furnaceClass: FurnaceClass,
  isExtended: boolean = false
): string {
  const date = new Date(lastSurveyDate);
  if (isNaN(date.getTime())) return '';
  
  const interval = TUS_INTERVALS[furnaceClass];
  const days = isExtended ? interval.extendedIntervalDays : interval.initialIntervalDays;
  
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
