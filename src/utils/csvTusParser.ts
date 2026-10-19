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

  // 1. Try standard Date.parse (ISO, etc.)
  const dateParsed = Date.parse(clean);
  if (!isNaN(dateParsed)) {
    return Math.floor(dateParsed / 1000);
  }

  // 2. Try DD/MM/YYYY HH:mm[:ss]
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1; // 0-indexed months
    const y = parseInt(dmyMatch[3], 10);
    const hh = parseInt(dmyMatch[4], 10);
    const mm = parseInt(dmyMatch[5], 10);
    const ss = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const date = new Date(y, m, d, hh, mm, ss);
    if (!isNaN(date.getTime())) return Math.floor(date.getTime() / 1000);
  }

  // 3. Try HH:MM:SS or HH:MM (Time only fallback)
  const timeMatch = clean.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s|$)/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const mins = parseInt(timeMatch[2], 10);
    const secs = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    return hours * 3600 + mins * 60 + secs;
  }

  // 4. Fallback to numeric seconds/milliseconds
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    return num > 100000000000 ? Math.floor(num / 1000) : Math.floor(num);
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

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]
      .split(delimiter)
      .map((p) => p.replace(/^["']|["']$/g, '').trim());
    if (parts.length < rawHeaders.length * 0.5) continue; // skip corrupted line

    const timeRaw = parts[timeHeaderIndex] || '';
    let timeSec = parseTimestampToSeconds(timeRaw);

    // Midnight Rollover Check (Only if we haven't successfully parsed a full date with year/month/day)
    // If timeSec jumps backwards by more than 12 hours, assume next day.
    if (lastRawSec !== -1) {
      if (timeSec < lastRawSec - 43200) {
        dayOffsetSec += 86400;
      }
    }
    lastRawSec = timeSec;
    const finalSec = timeSec + dayOffsetSec;

    const timeStr = formatSecondsToTime(finalSec);

    const values: Record<string, number> = {};
    rawHeaders.forEach((h, colIdx) => {
      if (colIdx !== timeHeaderIndex) {
        const valStr = parts[colIdx];
        const num = parseFloat(valStr);
        if (!isNaN(num)) {
          values[h] = num;
        }
      }
    });

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

  for (const target of targetTemps) {
    const lowerTol = target - tolerance;
    const upperTol = target + tolerance;

    let foundDwell: DetectedDwell | null = null;
    let currentStart = -1;

    // Search sequentially from where we left off
    for (let i = lastProcessedIndex; i < rows.length; i++) {
      const row = rows[i];
      let allInBand = true;
      for (const map of activeMappings) {
        const val = row.values[map.csvHeader];
        if (val === undefined || val < lowerTol || val > upperTol) {
          allInBand = false;
          break;
        }
      }

      if (allInBand) {
        if (currentStart === -1) currentStart = i;
        
        // Check if current contiguous block meets duration
        const startRow = rows[currentStart];
        const durationSec = row.timestampSec - startRow.timestampSec;
        const durationMin = durationSec / 60;

        if (durationMin >= minDurationMinutes) {
          // We found a valid dwell! 
          // However, we want to find the full extent of this stability block
          // Let's keep going until it breaks or we hit the end
          let j = i + 1;
          while (j < rows.length) {
            let nextInBand = true;
            for (const map of activeMappings) {
              const val = rows[j].values[map.csvHeader];
              if (val === undefined || val < lowerTol || val > upperTol) {
                nextInBand = false;
                break;
              }
            }
            if (!nextInBand) break;
            j++;
          }
          
          const bestStart = currentStart;
          const bestEnd = j - 1;
          const finalDurationMin = Math.round((rows[bestEnd].timestampSec - rows[bestStart].timestampSec) / 60);

          // Calculate statistics for this dwell (including ramp-up from prevEndIndex to bestEnd)
          const stats = calculateDwellStats(rows, bestStart, bestEnd, target, activeMappings, tolerance, tempUnit, minDurationMinutes, prevEndIndex);
          foundDwell = stats;
          
          prevEndIndex = bestEnd;
          lastProcessedIndex = bestEnd + 1;
          results.push(foundDwell);
          break; // Move to next setpoint
        }
      } else {
        currentStart = -1;
      }
    }

    // If no strict dwell found, we stay at lastProcessedIndex and try next setpoint
  }

  return results;
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

  // 1. Find the Most Stable 30-Minute Consecutive Window
  let evalStart = bestStart;
  let evalEnd = bestEnd;
  let minWindowSpread = Infinity;

  const targetWindowSec = 30 * 60;

  if (totalDurationMin * 60 >= targetWindowSec) {
    for (let i = bestStart; i <= bestEnd; i++) {
      let j = i;
      while (j <= bestEnd && rows[j].timestampSec - rows[i].timestampSec < targetWindowSec) {
        j++;
      }
      
      if (j > bestEnd) break;

      let maxS = -Infinity;
      let minS = Infinity;
      for (let k = i; k <= j; k++) {
        for (const map of activeMappings) {
          const val = rows[k].values[map.csvHeader];
          if (val !== undefined) {
            if (val > maxS) maxS = val;
            if (val < minS) minS = val;
          }
        }
      }
      
      const currentSpread = maxS - minS;
      if (currentSpread < minWindowSpread) {
        minWindowSpread = currentSpread;
        evalStart = i;
        evalEnd = j;
      }
    }
  }

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

    maxOvershoot: Math.round(maxOvershoot * 10) / 10,
    channelReadings,
    channelMin,
    channelMax,
    isDurationCompliant: (totalDurationMin * 60) >= (minDurationMinutes * 60 - 1),
    isSpreadCompliant: maxRead <= target + tolerance && minRead >= target - tolerance,
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
