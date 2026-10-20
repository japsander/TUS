import { FurnaceClass, TempUnit, SurveySetpoint, ThermocoupleChannel, TusTrendData, DetectedDwellPeriod } from '../types/tus';
import { CLASS_TOLERANCES } from './ams2750';

export interface ParsedCsvRow {
  timestampRaw: string;
  timestampSec: number; // Seconds from start or epoch
  timeStr: string;      // HH:mm formatted
  values: Record<string, number>; // Header -> Temperature value
}

export interface CsvColumnMapping {
  csvHeader: string;
  channelId: string;     // App channel ID or '' if unmapped
  channelNumber: number; // App TC channel number
}

export interface DetectedDwell {
  targetTemp: number;
  
  // Full contiguous block where sensors were in-band
  fullStartTimeStr: string;
  fullEndTimeStr: string;
  fullDurationMinutes: number;
  fullStartIndex: number;
  fullEndIndex: number;

  // Most stable 30-min window within that block (evaluation window)
  evalStartTimeStr: string;
  evalEndTimeStr: string;
  evalDurationMinutes: number;
  evalStartIndex: number;
  evalEndIndex: number;

  maxOvershoot: number;
  channelReadings: Record<string, number>; // channelId -> calculated steady reading
  channelMin: Record<string, number>;
  channelMax: Record<string, number>;
  isDurationCompliant: boolean; // >= 30 min per AMS 2750
  isSpreadCompliant: boolean;   // within class tolerance
  tempSpread: number;

  // Compatibility fields (map to eval window)
  startTimeStr: string; 
  endTimeStr: string;
  durationMinutes: number;
}

export interface CsvParseResult {
  headers: string[];
  timeHeader: string;
  dataHeaders: string[];
  rows: ParsedCsvRow[];
  detectedIntervalSeconds: number;
  totalDurationMinutes: number;
  mappings: CsvColumnMapping[];
}

/**
 * Parses timestamp string into seconds
 */
export function parseTimestampToSeconds(val: string): number {
  if (!val) return 0;
  const clean = val.trim();

  // 1. Try standard Date.parse (ISO, etc.) or DD/MM/YYYY HH:mm
  let date: Date | null = null;
  const dateParsed = Date.parse(clean);
  if (!isNaN(dateParsed)) {
    date = new Date(dateParsed);
  } else {
    // Try DD/MM/YYYY HH:mm[:ss]
    const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (dmyMatch) {
      const d = parseInt(dmyMatch[1], 10);
      const m = parseInt(dmyMatch[2], 10) - 1;
      const y = parseInt(dmyMatch[3], 10);
      const hh = parseInt(dmyMatch[4], 10);
      const mm = parseInt(dmyMatch[5], 10);
      const ss = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
      date = new Date(y, m, d, hh, mm, ss);
    }
  }

  if (date && !isNaN(date.getTime())) {
    // Return seconds since midnight for this specific date
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  }

  // 2. Try HH:MM:SS or HH:MM (Time only fallback)
  const timeMatch = clean.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s|$)/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const mins = parseInt(timeMatch[2], 10);
    const secs = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    return hours * 3600 + mins * 60 + secs;
  }

  // 3. Fallback to numeric seconds (if it looks like a day-offset, keep it, otherwise mod it)
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    // If it looks like epoch milliseconds, convert to seconds
    const sec = num > 100000000000 ? Math.floor(num / 1000) : Math.floor(num);
    return sec % 86400;
  }

  return 0;
}

/**
 * Format seconds to HH:mm
 */
export function formatSecondsToTime(sec: number): string {
  const norm = ((sec % 86400) + 86400) % 86400;
  const h = Math.floor(norm / 3600);
  const m = Math.floor((norm % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Parse raw CSV/TSV text into structured rows and auto-detect time/channel columns
 */
export function parseTusCsv(
  csvText: string,
  channels: ThermocoupleChannel[]
): CsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one data row.');
  }

  // Detect delimiter: comma, semicolon, tab
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';
  else if (semiCount > commaCount) delimiter = ';';

  const rawHeaders = firstLine
    .split(delimiter)
    .map((h) => h.replace(/^["']|["']$/g, '').trim());

  // Detect Time/Timestamp header
  let timeHeaderIndex = rawHeaders.findIndex((h) =>
    /^(time|timestamp|date|datetime|zeit|temps|logged_at)/i.test(h)
  );
  if (timeHeaderIndex === -1) {
    // If first column contains numbers or time formats
    timeHeaderIndex = 0;
  }

  const timeHeader = rawHeaders[timeHeaderIndex];
  const dataHeaders = rawHeaders.filter((_, idx) => idx !== timeHeaderIndex);

  // Parse data rows
  const parsedRows: ParsedCsvRow[] = [];
  const intervals: number[] = [];
  
  let dayOffsetSec = 0;
  let lastRawSec = -1;
  let firstEpochSec = -1;
  let firstRowTOD = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]
      .split(delimiter)
      .map((p) => p.replace(/^["']|["']$/g, '').trim());
    if (parts.length < rawHeaders.length * 0.5) continue; // skip corrupted line

    const timeRaw = parts[timeHeaderIndex] || '';
    if (!timeRaw || timeRaw.trim() === '') continue;

    // Robust time parsing
    const clean = timeRaw.trim();
    let timeOfDaySec = -1;

    const timeMatch = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      const h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      timeOfDaySec = h * 3600 + m * 60 + s;
    } else {
      const parsed = Date.parse(clean);
      if (!isNaN(parsed)) {
        const d = new Date(parsed);
        timeOfDaySec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
      }
    }

    if (timeOfDaySec === -1) continue;

    if (lastRawSec !== -1 && timeOfDaySec < lastRawSec - 3600) {
      dayOffsetSec += 86400;
    }
    const finalSec = timeOfDaySec + dayOffsetSec;
    lastRawSec = timeOfDaySec;

    if (finalSec === -1) continue; // failed to parse
    lastRawSec = timeOfDaySec;

    const timeStr = formatSecondsToTime(timeOfDaySec); // Use TOD for string label

    const values: Record<string, number> = {};
    let hasValidValue = false;
    rawHeaders.forEach((h, colIdx) => {
      if (colIdx !== timeHeaderIndex) {
        const valStr = parts[colIdx];
        const num = parseFloat(valStr);
        if (!isNaN(num)) {
          values[h] = num;
          hasValidValue = true;
        }
      }
    });

    if (!hasValidValue) continue;

    if (parsedRows.length > 0) {
      const prevSec = parsedRows[parsedRows.length - 1].timestampSec;
      const delta = finalSec - prevSec;
      if (delta > 0 && delta <= 3600) {
        intervals.push(delta);
      }
    }

    parsedRows.push({
      timestampRaw: timeRaw,
      timestampSec: finalSec,
      timeStr,
      values,
    });
  }

  // Ensure data is sorted by time to prevent graph artifacts
  parsedRows.sort((a, b) => a.timestampSec - b.timestampSec);

  // Calculate detected logging interval (mode / median)
  let detectedIntervalSeconds = 60; // default 60s
  if (intervals.length > 0) {
    intervals.sort((a, b) => a - b);
    detectedIntervalSeconds = intervals[Math.floor(intervals.length / 2)] || 60;
  }

  const totalDurationMinutes =
    parsedRows.length > 1
      ? Math.round(
          (parsedRows[parsedRows.length - 1].timestampSec - parsedRows[0].timestampSec) / 60
        )
      : 0;

  // Smart auto-mapping: match CSV headers to app channels by number
  const mappings: CsvColumnMapping[] = dataHeaders.map((header) => {
    // Try to extract TC number: e.g. "TC 1", "TC01", "CH-01", "Channel 1", "Sensor 1", "TC_1"
    const match = header.match(/(?:tc|ch|channel|sensor|pt)[_\s-]*0*(\d{1,2})/i);
    let matchedChannel = channels.find((c) =>
      match ? c.channelNumber === parseInt(match[1], 10) : false
    );

    if (!matchedChannel) {
      // Try exact or partial label match
      matchedChannel = channels.find((c) =>
        header.toLowerCase().includes(`tc ${c.channelNumber}`) ||
        header.toLowerCase().includes(`tc${c.channelNumber}`)
      );
    }

    return {
      csvHeader: header,
      channelId: matchedChannel ? matchedChannel.id : '',
      channelNumber: matchedChannel ? matchedChannel.channelNumber : 0,
    };
  });

  return {
    headers: rawHeaders,
    timeHeader,
    dataHeaders,
    rows: parsedRows,
    detectedIntervalSeconds,
    totalDurationMinutes,
    mappings,
  };
}

/**
 * Computes the mean, min, and max across all active mapped channels for a single CSV row.
 */
function getRowChannelStats(
  row: ParsedCsvRow,
  activeMappings: CsvColumnMapping[]
): { mean: number; min: number; max: number } {
  let sum = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const map of activeMappings) {
    const val = row.values[map.csvHeader];
    if (val !== undefined) {
      sum += val;
      count++;
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }
  return {
    mean: count > 0 ? sum / count : 0,
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
  };
}

/**
 * Determines the true end of a steady-state soak period (soakEndIndex) by checking
 * whether the in-band period terminated due to a sustained ramp-up to a higher setpoint
 * (or cooldown at the end of the survey) and backtracking along that continuous departure
 * ramp to the exact point where the steady-state soak ended and the ramp began.
 *
 * This prevents the initial ramp-up to the next setpoint (while still below target + tolerance)
 * from being mistaken for overshoot of the current setpoint, without ignoring any genuine
 * overshoot that occurred during the actual soak period (even after the 30-min capture window).
 */
function findTrueSoakEndIndex(
  rows: ParsedCsvRow[],
  bestStart: number,
  rawBestEnd: number,
  target: number,
  tolerance: number,
  activeMappings: CsvColumnMapping[],
  minDurationMinutes: number
): number {
  const nextIdx = rawBestEnd + 1;
  if (nextIdx >= rows.length) return rawBestEnd;

  const upperTol = target + tolerance;
  const lowerTol = target - tolerance;

  const endStats = getRowChannelStats(rows[rawBestEnd], activeMappings);
  const nextStats = getRowChannelStats(rows[nextIdx], activeMappings);
  const lookAheadIdx = Math.min(rows.length - 1, rawBestEnd + 5);
  const lookAheadStats = getRowChannelStats(rows[lookAheadIdx], activeMappings);

  // Confirm whether the furnace exited the tolerance band on a sustained departure ramp-up
  const exitedHigh = nextStats.max > upperTol;
  const isSustainedRampUp =
    exitedHigh && lookAheadStats.mean > endStats.mean + 0.5 && lookAheadStats.max > upperTol;

  // Also check if the furnace exited the tolerance band on a sustained cooldown ramp
  const exitedLow = nextStats.min < lowerTol;
  const isSustainedCoolDown =
    exitedLow && lookAheadStats.mean < endStats.mean - 0.5 && lookAheadStats.min < lowerTol;

  if (!isSustainedRampUp && !isSustainedCoolDown) {
    return rawBestEnd;
  }

  // Never backtrack so far that the remaining soak duration falls below minDurationMinutes
  const minAllowedSec = rows[bestStart].timestampSec + minDurationMinutes * 60;

  // Calculate the steady plateau reference across the hold
  const holdMeans: number[] = [];
  for (let i = bestStart; i <= rawBestEnd; i++) {
    holdMeans.push(getRowChannelStats(rows[i], activeMappings).mean);
  }
  holdMeans.sort((a, b) => a - b);
  const plateauMedian = holdMeans[Math.floor(holdMeans.length * 0.5)] || target;

  let k = rawBestEnd;

  if (isSustainedRampUp) {
    const departureThreshold = Math.max(plateauMedian + 1.0, target + 1.0);
    while (k > bestStart && rows[k - 1].timestampSec >= minAllowedSec) {
      const curr = getRowChannelStats(rows[k], activeMappings);
      const prev5 = getRowChannelStats(rows[Math.max(bestStart, k - 5)], activeMappings);
      const dMean5 = curr.mean - prev5.mean;

      // If temperature is distinctly elevated above the plateau or continuing on departure slope
      const isAbovePlateau = curr.mean > departureThreshold;
      const isClimbingSlope = curr.mean > plateauMedian + 0.5 && dMean5 >= 0.2;

      if (isAbovePlateau || isClimbingSlope) {
        k--;
      } else {
        break;
      }
    }
  } else if (isSustainedCoolDown) {
    const departureThreshold = Math.min(plateauMedian - 1.0, target - 1.0);
    while (k > bestStart && rows[k - 1].timestampSec >= minAllowedSec) {
      const curr = getRowChannelStats(rows[k], activeMappings);
      const prev5 = getRowChannelStats(rows[Math.max(bestStart, k - 5)], activeMappings);
      const dMean5 = curr.mean - prev5.mean;

      const isBelowPlateau = curr.mean < departureThreshold;
      const isCoolingSlope = curr.mean < plateauMedian - 0.5 && dMean5 <= -0.2;

      if (isBelowPlateau || isCoolingSlope) {
        k--;
      } else {
        break;
      }
    }
  }

  return k;
}

/**
 * Searches through the CSV rows to detect periods of stable dwell for given setpoints
 * meeting AMS 2750 Rev H / Nadcap AC7102/8 requirements.
 */
export function detectTusDwells(
  rows: ParsedCsvRow[],
  targetTemps: number[],
  mappings: CsvColumnMapping[],
  furnaceClass: FurnaceClass,
  tempUnit: TempUnit,
  minDurationMinutes: number = 30
): DetectedDwell[] {
  const tolerance = CLASS_TOLERANCES[furnaceClass][tempUnit];
  const activeMappings = mappings.filter((m) => m.channelId !== '');

  if (rows.length === 0 || targetTemps.length === 0 || activeMappings.length === 0) {
    return [];
  }

  const results: DetectedDwell[] = [];
  let lastProcessedIndex = 0;
  let prevEndIndex = 0;

  // Candidate search bands for identifying physical dwell plateaus
  const fallbackBands = tempUnit === '°C' ? [6, 8, 10, 14, 20, 28] : [10, 15, 20, 25, 35, 50];

  for (const target of targetTemps) {
    let foundDwell: DetectedDwell | null = null;

    // Determine the physical hold envelope tolerance
    const holdEnvelopeTol = Math.max(tolerance * 1.5, tempUnit === '°C' ? 10 : 20);
    const lowerHold = target - holdEnvelopeTol;
    const upperHold = target + holdEnvelopeTol;

    // 1. Identify contiguous candidate hold block where furnace mean is within hold envelope
    let blockStart = -1;
    let blockEnd = -1;

    for (let i = lastProcessedIndex; i < rows.length; i++) {
      const stats = getRowChannelStats(rows[i], activeMappings);
      if (stats.mean >= lowerHold && stats.mean <= upperHold) {
        if (blockStart === -1) blockStart = i;
        if (rows[i].timestampSec - rows[blockStart].timestampSec >= minDurationMinutes * 60) {
          let j = i;
          while (j < rows.length) {
            const sj = getRowChannelStats(rows[j], activeMappings);
            if (sj.mean < lowerHold || sj.mean > upperHold) {
              break;
            }
            j++;
          }
          blockEnd = j - 1;
          break;
        }
      } else {
        blockStart = -1;
      }
    }

    if (blockStart === -1 || blockEnd === -1) {
      continue;
    }

    // Compute steady-state plateau median across the candidate hold block
    const holdMeans: number[] = [];
    for (let i = blockStart; i <= blockEnd; i++) {
      holdMeans.push(getRowChannelStats(rows[i], activeMappings).mean);
    }
    holdMeans.sort((a, b) => a - b);
    const plateauMedian = holdMeans[Math.floor(holdMeans.length * 0.5)] || target;

    // 2. Determine authentic soak start per AMS 2750 Rev H § 3.5.14.1:
    // "The soak period begins only after all survey sensors reached the minimum survey tolerance and stabilized."
    // Ramp-up must be completed, plateau level reached, and rate of climb (slope) flattened.
    const maxStabilizedSlope = tempUnit === '°C' ? 0.06 : 0.10; // °/min
    let bestStart = -1;

    for (let i = blockStart; i <= blockEnd - 10; i++) {
      const rStats = getRowChannelStats(rows[i], activeMappings);

      // Level check:
      // Passing dwell: all sensors within tolerance band
      // Failing dwell: furnace mean arrived at steady plateau level
      const allInBand = rStats.min >= target - tolerance && rStats.max <= target + tolerance;
      const atPlateauLevel =
        rStats.mean >= Math.min(target - tolerance, plateauMedian - 0.8) &&
        Math.abs(rStats.mean - plateauMedian) <= 1.5;

      if (!allInBand && !atPlateauLevel) {
        continue; // Still on lower ascending ramp
      }

      // Thermal stabilization check: slope over trailing and forward samples must be flat
      const trailingIdx = Math.max(blockStart, i - 5);
      const trailingStats = getRowChannelStats(rows[trailingIdx], activeMappings);
      const dtTrailing = (rows[i].timestampSec - rows[trailingIdx].timestampSec) / 60;
      const trailingSlope = dtTrailing > 0 ? (rStats.mean - trailingStats.mean) / dtTrailing : 0;

      const forwardIdx = Math.min(blockEnd, i + 5);
      const forwardStats = getRowChannelStats(rows[forwardIdx], activeMappings);
      const dtForward = (rows[forwardIdx].timestampSec - rows[i].timestampSec) / 60;
      const forwardSlope = dtForward > 0 ? (forwardStats.mean - rStats.mean) / dtForward : 0;

      const trailingMinSlope = dtTrailing > 0 ? (rStats.min - trailingStats.min) / dtTrailing : 0;

      // Rate of climb must be stabilized (not continuing up a ramp)
      const isStabilized =
        Math.abs(trailingSlope) <= maxStabilizedSlope &&
        Math.abs(forwardSlope) <= maxStabilizedSlope &&
        trailingMinSlope <= maxStabilizedSlope * 1.5;

      if (isStabilized) {
        bestStart = i;
        break;
      }
    }

    // Fallback: if slope was noisy, choose the point with minimal climb rate after reaching plateau
    if (bestStart === -1) {
      let lowestClimb = Infinity;
      for (let i = blockStart; i <= Math.min(blockEnd, blockStart + 60); i++) {
        const rStats = getRowChannelStats(rows[i], activeMappings);
        if (rStats.mean >= target - tolerance || Math.abs(rStats.mean - plateauMedian) <= 1.5) {
          const prev5 = getRowChannelStats(rows[Math.max(blockStart, i - 5)], activeMappings);
          const climb = Math.abs(rStats.mean - prev5.mean);
          if (climb < lowestClimb) {
            lowestClimb = climb;
            bestStart = i;
          }
        }
      }
    }

    if (bestStart === -1) {
      bestStart = blockStart;
    }

    // Backtrack any departure ramp-up (or cooldown) at the end of the hold
    const effectiveHoldTol = holdEnvelopeTol;
    const soakEnd = findTrueSoakEndIndex(
      rows,
      bestStart,
      blockEnd,
      target,
      effectiveHoldTol,
      activeMappings,
      minDurationMinutes
    );

    // Calculate statistics for this dwell against the strict furnace class tolerance
    const stats = calculateDwellStats(
      rows,
      bestStart,
      soakEnd,
      target,
      activeMappings,
      tolerance,
      tempUnit,
      minDurationMinutes,
      prevEndIndex
    );
    foundDwell = stats;

    // Advance indices for next setpoint
    prevEndIndex = soakEnd + 1;
    lastProcessedIndex = blockEnd + 1;
    results.push(foundDwell);
  }

  return results;
}

/**
 * Determines the AMS 2750 Rev H / Nadcap AC7102/8 compliant 30-minute evaluation window
 * within a confirmed physical soak period [bestStart, bestEnd].
 *
 * Per AMS 2750 Rev H (§ 3.5.13 & § 3.5.14.1) and Nadcap AC7102/8 (§ 4.1):
 * 1. The 30-minute capture window MUST be anchored to the initial stabilization period at
 *    the onset of soak (after ramp completion and thermal stabilization).
 * 2. Downstream window hunting (scanning hours into an extended soak to cherry-pick a passing slice)
 *    is strictly prohibited and flagged as non-conforming by auditors.
 * 3. The capture window MUST NOT highlight or overlap any ramp-up period.
 * 4. If any sensor is out of tolerance during this initial qualified window, the survey reports
 *    an honest non-conformance (FAIL) rather than sliding the window.
 */
function findBestPracticeEvalWindow(
  rows: ParsedCsvRow[],
  bestStart: number,
  bestEnd: number,
  target: number,
  tolerance: number,
  tempUnit: TempUnit,
  activeMappings: CsvColumnMapping[],
  minDurationMinutes: number
): { evalStart: number; evalEnd: number } {
  const targetWindowSec = minDurationMinutes * 60;

  // If the total dwell duration is less than the required window, return the full available block
  if (rows[bestEnd].timestampSec - rows[bestStart].timestampSec < targetWindowSec) {
    return { evalStart: bestStart, evalEnd: bestEnd };
  }

  // Window MUST start within the initial stabilization envelope (max 25 minutes after entering plateau)
  const maxStabilizationSec = 25 * 60;
  let latestAllowedStart = bestStart;
  for (let i = bestStart; i <= bestEnd; i++) {
    if (
      rows[bestEnd].timestampSec - rows[i].timestampSec >= targetWindowSec &&
      rows[i].timestampSec - rows[bestStart].timestampSec <= maxStabilizationSec
    ) {
      latestAllowedStart = i;
    } else if (rows[i].timestampSec - rows[bestStart].timestampSec > maxStabilizationSec) {
      break;
    }
  }

  // Rate of climb limit for steady-state evaluation window
  const maxClimbLimit = tempUnit === '°C' ? 0.06 : 0.10;
  let chosenStart = bestStart;
  let lowestClimbRate = Infinity;

  for (let i = bestStart; i <= latestAllowedStart; i++) {
    const lookAheadIdx = Math.min(bestEnd, i + 5);
    const currMin = getRowChannelStats(rows[i], activeMappings).min;
    const nextMin = getRowChannelStats(rows[lookAheadIdx], activeMappings).min;
    const dtMin = (rows[lookAheadIdx].timestampSec - rows[i].timestampSec) / 60;
    const climbRate = dtMin > 0 ? Math.abs((nextMin - currMin) / dtMin) : 0;

    if (climbRate < lowestClimbRate) {
      lowestClimbRate = climbRate;
      chosenStart = i;
    }
    if (climbRate <= maxClimbLimit) {
      chosenStart = i;
      break; // Fully stabilized steady state
    }
  }

  // evalEnd is exactly minDurationMinutes after chosenStart
  let chosenEnd = chosenStart;
  for (let i = chosenStart; i <= bestEnd; i++) {
    if (rows[i].timestampSec - rows[chosenStart].timestampSec >= targetWindowSec) {
      chosenEnd = i;
      break;
    }
  }

  return { evalStart: chosenStart, evalEnd: chosenEnd || bestEnd };
}

/**
 * Helper to calculate stats for a confirmed dwell period
 */
function calculateDwellStats(
  rows: ParsedCsvRow[],
  bestStart: number,
  bestEnd: number,
  target: number,
  activeMappings: CsvColumnMapping[],
  tolerance: number,
  tempUnit: TempUnit,
  minDurationMinutes: number,
  prevEndIndex: number = 0
): DetectedDwell {
  const startRow = rows[bestStart];
  const endRow = rows[bestEnd];
  const totalDurationMin = (endRow.timestampSec - startRow.timestampSec) / 60;

  // Find the AMS 2750 Rev H best-practice 30-minute evaluation window
  const { evalStart, evalEnd } = findBestPracticeEvalWindow(
    rows,
    bestStart,
    bestEnd,
    target,
    tolerance,
    tempUnit,
    activeMappings,
    minDurationMinutes
  );

  // Window references
  const evalStartRow = rows[evalStart];
  const evalEndRow = rows[evalEnd];
  const capturedDurationMin = Math.round((evalEndRow.timestampSec - evalStartRow.timestampSec) / 60);

  // Search for maximum overshoot including ramping up to this dwell (from prevEndIndex to bestEnd)
  let maxOvershoot = target;
  const overshootStart = Math.max(0, prevEndIndex);
  for (let i = overshootStart; i <= bestEnd; i++) {
    for (const map of activeMappings) {
      const val = rows[i].values[map.csvHeader];
      if (val !== undefined && val > maxOvershoot) {
        maxOvershoot = val;
      }
    }
  }

  const channelReadings: Record<string, number> = {};
  const channelMin: Record<string, number> = {};
  const channelMax: Record<string, number> = {};

  activeMappings.forEach((map) => {
    let sum = 0;
    let count = 0;
    let minV = Infinity;
    let maxV = -Infinity;

    for (let i = evalStart; i <= evalEnd; i++) {
      const val = rows[i].values[map.csvHeader];
      if (val !== undefined) {
        sum += val;
        count++;
        if (val < minV) minV = val;
        if (val > maxV) maxV = val;
      }
    }

    const avg = count > 0 ? sum / count : target;
    channelReadings[map.channelId] = Math.round(avg * 10) / 10;
    channelMin[map.channelId] = minV !== Infinity ? Math.round(minV * 10) / 10 : target;
    channelMax[map.channelId] = maxV !== -Infinity ? Math.round(maxV * 10) / 10 : target;
  });

  const allVals = Object.values(channelReadings);
  const minRead = Math.min(...allVals);
  const maxRead = Math.max(...allVals);
  const spread = Math.round((maxRead - minRead) * 10) / 10;

  const allWindowMin = Object.values(channelMin);
  const allWindowMax = Object.values(channelMax);
  const minWindowVal = Math.min(...allWindowMin);
  const maxWindowVal = Math.max(...allWindowMax);
  const roundedOvershoot = Math.round(maxOvershoot * 10) / 10;

  return {
    targetTemp: target,

    // Full Hold
    fullStartTimeStr: startRow.timeStr,
    fullEndTimeStr: endRow.timeStr,
    fullDurationMinutes: Math.round(totalDurationMin),
    fullStartIndex: bestStart,
    fullEndIndex: bestEnd,

    // Evaluation Window
    evalStartTimeStr: evalStartRow.timeStr,
    evalEndTimeStr: evalEndRow.timeStr,
    evalDurationMinutes: capturedDurationMin,
    evalStartIndex: evalStart,
    evalEndIndex: evalEnd,

    // Compatibility
    startTimeStr: evalStartRow.timeStr,
    endTimeStr: evalEndRow.timeStr,
    durationMinutes: capturedDurationMin,

    maxOvershoot: roundedOvershoot,
    channelReadings,
    channelMin,
    channelMax,
    isDurationCompliant: (totalDurationMin * 60) >= (minDurationMinutes * 60 - 1),
    isSpreadCompliant:
      maxRead <= target + tolerance &&
      minRead >= target - tolerance &&
      maxWindowVal <= target + tolerance &&
      minWindowVal >= target - tolerance &&
      roundedOvershoot <= target + tolerance,
    tempSpread: spread,
  };
}

/**
 * Converts parsed CSV rows into a format suitable for charting (channel IDs as keys)
 */
export function convertToTrendData(
  rows: ParsedCsvRow[],
  mappings: CsvColumnMapping[]
): TusTrendData[] {
  const activeMappings = mappings.filter((m) => m.channelId !== '');
  
  return rows.map((row) => {
    const trendEntry: TusTrendData = {
      timeStr: row.timeStr,
      timestampSec: row.timestampSec,
    };
    
    activeMappings.forEach((m) => {
      const val = row.values[m.csvHeader];
      if (val !== undefined) {
        trendEntry[m.channelId] = val;
      }
    });
    
    return trendEntry;
  });
}

/**
 * Converts detected dwells into simple period markers for the graph
 */
export function convertToDwellPeriods(
  dwells: DetectedDwell[],
  rows: ParsedCsvRow[]
): DetectedDwellPeriod[] {
  return dwells.map((d) => {
    return {
      targetTemp: d.targetTemp,
      startIndex: d.fullStartIndex,
      endIndex: d.fullEndIndex,
      startTimeSec: rows[d.fullStartIndex].timestampSec,
      endTimeSec: rows[d.fullEndIndex].timestampSec,
      startTimeStr: d.fullStartTimeStr,
      endTimeStr: d.fullEndTimeStr,
      evalStartIndex: d.evalStartIndex,
      evalEndIndex: d.evalEndIndex,
      evalStartTimeSec: rows[d.evalStartIndex].timestampSec,
      evalEndTimeSec: rows[d.evalEndIndex].timestampSec,
    };
  });
}


/**
 * Generate a realistic multi-setpoint sample CSV for testing (e.g., 42°C, 110°C, 275°C)
 */
export function generateSampleTusCsv(
  channels: ThermocoupleChannel[],
  tempUnit: TempUnit = '°C'
): string {
  const setpoints = [42, 110, 275];
  const stepSeconds = 30; // 30s logging interval
  const headers = ['Timestamp', 'Time_Elapsed', ...channels.map((c) => `TC_${c.channelNumber}`)];

  const rows: string[] = [headers.join(',')];

  let currentTimeSec = 8 * 3600; // Start at 08:00:00

  // Ramp and Dwell sequence
  let prevTemp = 20;

  setpoints.forEach((spTarget, spIdx) => {
    // 1. Ramp Phase (15-20 min)
    const rampSteps = 25;
    for (let i = 0; i < rampSteps; i++) {
      currentTimeSec += stepSeconds;
      const progress = (i + 1) / rampSteps;
      const currentRamp = prevTemp + (spTarget - prevTemp) * progress;

      const timeStr = formatSecondsToTime(currentTimeSec);
      const rowVals: string[] = [
        `2026-10-15 ${timeStr}:00`,
        `${Math.round((currentTimeSec - 8 * 3600) / 60)}m`,
      ];

      channels.forEach((ch, cIdx) => {
        const lag = (cIdx % 5) * 0.4 - 0.8;
        const temp = (currentRamp + lag).toFixed(1);
        rowVals.push(temp);
      });
      rows.push(rowVals.join(','));
    }

    // 2. Stabilized Dwell Phase (35-40 min, satisfying >= 30 min soak)
    const dwellSteps = 70; // 70 * 30s = 35 minutes
    for (let i = 0; i < dwellSteps; i++) {
      currentTimeSec += stepSeconds;
      const timeStr = formatSecondsToTime(currentTimeSec);
      const rowVals: string[] = [
        `2026-10-15 ${timeStr}:00`,
        `${Math.round((currentTimeSec - 8 * 3600) / 60)}m`,
      ];

      channels.forEach((ch, cIdx) => {
        // Subtle realistic spatial temperature gradients within ±1.5°C
        const heightBias = ((ch.y - 18) / 36) * 0.8;
        const cornerBias = ((cIdx % 4) - 1.5) * 0.4;
        const sineNoise = Math.sin((i + cIdx) * 0.25) * 0.3;
        const val = (spTarget + heightBias + cornerBias + sineNoise).toFixed(1);
        rowVals.push(val);
      });
      rows.push(rowVals.join(','));
    }

    prevTemp = spTarget;
  });

  return rows.join('\n');
}
