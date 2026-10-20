import { FurnaceClass, InstrumentationType, FurnaceApplication, TempUnit } from '../types/tus';

export interface TusIntervalInfo {
  initialIntervalMonths: number;
  extendedIntervalMonths: number;
  initialLabel: string;
  extendedLabel: string;
  consecutiveRequiredForExtension: number;
  canExtend: boolean;
  tableRef: string;
  maxPermittedOffsetF: number | null;
  maxPermittedOffsetC: number | null;
  maxPermittedOffsetPct: number | null;
}

/**
 * AMS 2750 Rev H Table 15 (Parts, page 39) & Table 16 (Raw Material, page 40)
 * Periodic TUS Intervals, Required Consecutive Successful Periodic TUS for Extension,
 * and Maximum Permitted Offset.
 */
export function getTusIntervalInfo(
  furnaceClass: FurnaceClass,
  instrumentationType: InstrumentationType,
  application: FurnaceApplication = 'Parts'
): TusIntervalInfo {
  const isRawMaterial = application === 'Raw Material';
  const tableRef = isRawMaterial ? 'Table 16 (Raw Material)' : 'Table 15 (Parts)';

  // Maximum Permitted Offset per Table 15 & Table 16
  const offsetMap: Record<
    FurnaceClass,
    { f: number | null; c: number | null; pct: number | null }
  > = {
    1: { f: 2.5, c: 1.5, pct: null },
    2: { f: 5.0, c: 3.0, pct: null },
    3: { f: 8.0, c: 5.0, pct: 0.38 },
    4: { f: 10.0, c: 6.0, pct: 0.38 },
    5: { f: 13.0, c: 7.0, pct: 0.38 },
    6: { f: null, c: null, pct: 0.75 },
  };
  const offsets = offsetMap[furnaceClass];

  // Class 6 (Types D, E — or any type operated as Class 6)
  if (furnaceClass === 6) {
    return {
      initialIntervalMonths: 12,
      extendedIntervalMonths: 12,
      initialLabel: 'Annually (12 Months)',
      extendedLabel: 'Annually (12 Months — No Further Extension)',
      consecutiveRequiredForExtension: 0,
      canExtend: false,
      tableRef,
      maxPermittedOffsetF: offsets.f,
      maxPermittedOffsetC: offsets.c,
      maxPermittedOffsetPct: offsets.pct,
    };
  }

  // Classes 1 and 2
  if (furnaceClass === 1 || furnaceClass === 2) {
    if (instrumentationType === 'A') {
      return {
        initialIntervalMonths: isRawMaterial ? 3 : 1,
        extendedIntervalMonths: 6,
        initialLabel: isRawMaterial ? 'Quarterly (3 Months)' : 'Monthly (1 Month)',
        extendedLabel: 'Semiannually (6 Months)',
        consecutiveRequiredForExtension: 2,
        canExtend: true,
        tableRef,
        maxPermittedOffsetF: offsets.f,
        maxPermittedOffsetC: offsets.c,
        maxPermittedOffsetPct: offsets.pct,
      };
    }
    if (instrumentationType === 'B' || instrumentationType === 'C') {
      return {
        initialIntervalMonths: isRawMaterial ? 3 : 1,
        extendedIntervalMonths: isRawMaterial ? 6 : 3,
        initialLabel: isRawMaterial ? 'Quarterly (3 Months)' : 'Monthly (1 Month)',
        extendedLabel: isRawMaterial ? 'Semiannually (6 Months)' : 'Quarterly (3 Months)',
        consecutiveRequiredForExtension: 4,
        canExtend: true,
        tableRef,
        maxPermittedOffsetF: offsets.f,
        maxPermittedOffsetC: offsets.c,
        maxPermittedOffsetPct: offsets.pct,
      };
    }
    // Types D, D+, E
    return {
      initialIntervalMonths: 1,
      extendedIntervalMonths: isRawMaterial ? 6 : 2,
      initialLabel: 'Monthly (1 Month)',
      extendedLabel: isRawMaterial ? 'Semiannually (6 Months)' : 'Bimonthly (2 Months)',
      consecutiveRequiredForExtension: 8,
      canExtend: true,
      tableRef,
      maxPermittedOffsetF: offsets.f,
      maxPermittedOffsetC: offsets.c,
      maxPermittedOffsetPct: offsets.pct,
    };
  }

  // Classes 3, 4, and 5
  if (instrumentationType === 'A') {
    return {
      initialIntervalMonths: isRawMaterial ? 6 : 3,
      extendedIntervalMonths: 12,
      initialLabel: isRawMaterial ? 'Semiannually (6 Months)' : 'Quarterly (3 Months)',
      extendedLabel: 'Annually (12 Months)',
      consecutiveRequiredForExtension: 2,
      canExtend: true,
      tableRef,
      maxPermittedOffsetF: offsets.f,
      maxPermittedOffsetC: offsets.c,
      maxPermittedOffsetPct: offsets.pct,
    };
  }
  if (instrumentationType === 'B' || instrumentationType === 'C') {
    return {
      initialIntervalMonths: isRawMaterial ? 6 : 3,
      extendedIntervalMonths: isRawMaterial ? 12 : 6,
      initialLabel: isRawMaterial ? 'Semiannually (6 Months)' : 'Quarterly (3 Months)',
      extendedLabel: isRawMaterial ? 'Annually (12 Months)' : 'Semiannually (6 Months)',
      consecutiveRequiredForExtension: 3,
      canExtend: true,
      tableRef,
      maxPermittedOffsetF: offsets.f,
      maxPermittedOffsetC: offsets.c,
      maxPermittedOffsetPct: offsets.pct,
    };
  }
  // Types D, D+, E for Classes 3, 4, 5
  return {
    initialIntervalMonths: 3,
    extendedIntervalMonths: 6,
    initialLabel: 'Quarterly (3 Months)',
    extendedLabel: 'Semiannually (6 Months)',
    consecutiveRequiredForExtension: 4,
    canExtend: true,
    tableRef,
    maxPermittedOffsetF: offsets.f,
    maxPermittedOffsetC: offsets.c,
    maxPermittedOffsetPct: offsets.pct,
  };
}

/**
 * AMS 2750 Rev H Table 22 (page 56): Permitted calibration/test interval extension (Grace Period)
 */
export function getGracePeriodDays(intervalMonths: number): number {
  if (intervalMonths <= 1) return 3; // Monthly: 3 calendar days
  if (intervalMonths === 2) return 3; // Bimonthly: 3 calendar days
  if (intervalMonths === 3) return 4; // Quarterly: 4 calendar days
  if (intervalMonths === 4) return 4; // 4 Months: 4 calendar days
  if (intervalMonths === 6) return 6; // Semiannually: 6 calendar days
  return 12; // Annually or greater: 12 calendar days
}

/**
 * Calculates the next TUS due date per AMS 2750 Rev H § 2.4.25 & § 3.5.5
 */
export function calculateNextTusDueDate(
  surveyDateStr: string,
  furnaceClass: FurnaceClass,
  instrumentationType: InstrumentationType,
  useExtendedInterval: boolean = false,
  application: FurnaceApplication = 'Parts'
): {
  dueDate: string;
  maxGraceDate: string;
  intervalMonths: number;
  graceDays: number;
  intervalLabel: string;
  consecutiveRequired: number;
  tableRef: string;
} {
  const info = getTusIntervalInfo(furnaceClass, instrumentationType, application);
  const intervalMonths =
    useExtendedInterval && info.canExtend
      ? info.extendedIntervalMonths
      : info.initialIntervalMonths;
  const graceDays = getGracePeriodDays(intervalMonths);

  const baseDate = surveyDateStr ? new Date(surveyDateStr) : new Date();
  if (isNaN(baseDate.getTime())) {
    const today = new Date().toISOString().split('T')[0];
    return {
      dueDate: today,
      maxGraceDate: today,
      intervalMonths,
      graceDays,
      intervalLabel: useExtendedInterval ? info.extendedLabel : info.initialLabel,
      consecutiveRequired: info.consecutiveRequiredForExtension,
      tableRef: info.tableRef,
    };
  }

  // Per § 2.4.25 Note 1: If the next test is due on a calendar date not contained in that month,
  // then the last day of that calendar month shall be used.
  const targetYear = baseDate.getFullYear();
  const targetMonth = baseDate.getMonth() + intervalMonths;
  const origDay = baseDate.getDate();

  const due = new Date(targetYear, targetMonth, 1);
  const maxDaysInTargetMonth = new Date(due.getFullYear(), due.getMonth() + 1, 0).getDate();
  due.setDate(Math.min(origDay, maxDaysInTargetMonth));

  const grace = new Date(due);
  grace.setDate(grace.getDate() + graceDays);

  return {
    dueDate: due.toISOString().split('T')[0],
    maxGraceDate: grace.toISOString().split('T')[0],
    intervalMonths,
    graceDays,
    intervalLabel: useExtendedInterval ? info.extendedLabel : info.initialLabel,
    consecutiveRequired: info.consecutiveRequiredForExtension,
    tableRef: info.tableRef,
  };
}

/**
 * AMS 2750 Rev H § 3.5.2.2 & § 3.5.3.3.1:
 * Checks whether selected TUS setpoints cover the qualified operating range
 * and do not exceed 335°C (600°F) between adjacent TUS temperatures.
 */
export function validateSetpointIntervals(
  setpoints: number[],
  operatingMin: number,
  operatingMax: number,
  tempUnit: TempUnit,
  surveyReason: string = 'Initial'
): {
  isValid: boolean;
  maxGapAllowed: number;
  endMarginAllowed: number;
  issues: string[];
} {
  const maxGapAllowed = tempUnit === '°C' ? 335 : 600;
  const endMarginAllowed = tempUnit === '°C' ? 170 : 300;
  const issues: string[] = [];

  if (setpoints.length === 0) {
    return {
      isValid: false,
      maxGapAllowed,
      endMarginAllowed,
      issues: ['At least one TUS setpoint temperature is required.'],
    };
  }

  const sorted = [...setpoints].sort((a, b) => a - b);
  const rangeSpan = operatingMax - operatingMin;
  const isInitial =
    surveyReason === 'Initial' ||
    surveyReason === 'Major Repair' ||
    surveyReason === 'Control Logic Change';

  if (rangeSpan === 0) {
    // Single operating temperature (§ 3.5.2.4)
    if (sorted[0] !== operatingMin) {
      issues.push(
        `AMS 2750 Rev H § 3.5.2.4: Single-temperature equipment (${operatingMin}${tempUnit}) must be surveyed at ${operatingMin}${tempUnit}.`
      );
    }
  } else if (isInitial) {
    // § 3.5.2.1: Initial TUS must include min and max of qualified range
    if (sorted[0] > operatingMin) {
      issues.push(
        `AMS 2750 Rev H § 3.5.2.1: Initial TUS must include the minimum qualified operating temperature (${operatingMin}${tempUnit}). Lowest setpoint is ${sorted[0]}${tempUnit}.`
      );
    }
    if (sorted[sorted.length - 1] < operatingMax) {
      issues.push(
        `AMS 2750 Rev H § 3.5.2.1: Initial TUS must include the maximum qualified operating temperature (${operatingMax}${tempUnit}). Highest setpoint is ${sorted[sorted.length - 1]}${tempUnit}.`
      );
    }
  } else if (rangeSpan > maxGapAllowed) {
    // § 3.5.3.3.1: Periodic TUS on range > 600°F / 335°C
    if (sorted[0] - operatingMin > endMarginAllowed) {
      issues.push(
        `AMS 2750 Rev H § 3.5.3.3.1: For ranges > ${maxGapAllowed}${tempUnit}, lowest periodic TUS temperature (${sorted[0]}${tempUnit}) must be within ${endMarginAllowed}${tempUnit} of the minimum operating temperature (${operatingMin}${tempUnit}).`
      );
    }
    if (operatingMax - sorted[sorted.length - 1] > endMarginAllowed) {
      issues.push(
        `AMS 2750 Rev H § 3.5.3.3.1: For ranges > ${maxGapAllowed}${tempUnit}, highest periodic TUS temperature (${sorted[sorted.length - 1]}${tempUnit}) must be within ${endMarginAllowed}${tempUnit} of the maximum operating temperature (${operatingMax}${tempUnit}).`
      );
    }
  }

  // § 3.5.2.2 & § 3.5.3.3.1: Max increment between adjacent TUS temperatures ≤ 600°F or 335°C
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1] - sorted[i];
    if (gap > maxGapAllowed) {
      issues.push(
        `AMS 2750 Rev H § 3.5.2.2 / § 3.5.3.3.1: Increment between ${sorted[i]}${tempUnit} and ${sorted[i + 1]}${tempUnit} is ${gap}${tempUnit}, which exceeds the maximum allowed ${maxGapAllowed}${tempUnit} increment.`
      );
    }
  }

  return {
    isValid: issues.length === 0,
    maxGapAllowed,
    endMarginAllowed,
    issues,
  };
}
