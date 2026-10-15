import { FurnaceClass, TempUnit, SurveySetpoint, ThermocoupleChannel } from '../types/tus';
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
  startIndex: number;
  endIndex: number;
  startTimeStr: string;
  endTimeStr: string;
  durationMinutes: number;
  maxOvershoot: number;
  channelReadings: Record<string, number>; // channelId -> calculated steady reading
  channelMin: Record<string, number>;
  channelMax: Record<string, number>;
  isDurationCompliant: boolean; // >= 30 min per AMS 2750
  isSpreadCompliant: boolean;   // within class tolerance
  tempSpread: number;
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

  // Try ISO or standard Date
  const dateParsed = Date.parse(clean);
  if (!isNaN(dateParsed)) {
    return Math.floor(dateParsed / 1000);
  }

  // Try HH:MM:SS or HH:MM
  const timeMatch = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const mins = parseInt(timeMatch[2], 10);
    const secs = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    return hours * 3600 + mins * 60 + secs;
  }

  // Fallback to numeric seconds/milliseconds
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

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]
      .split(delimiter)
      .map((p) => p.replace(/^["']|["']$/g, '').trim());
    if (parts.length < rawHeaders.length * 0.5) continue; // skip corrupted line

    const timeRaw = parts[timeHeaderIndex] || '';
    const timeSec = parseTimestampToSeconds(timeRaw);
    const timeStr = formatSecondsToTime(timeSec);

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
      const delta = timeSec - prevSec;
      if (delta > 0 && delta <= 3600) {
        intervals.push(delta);
      }
    }

    parsedRows.push({
      timestampRaw: timeRaw,
      timestampSec: timeSec,
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

  targetTemps.forEach((target) => {
    const lowerTol = target - tolerance;
    const upperTol = target + tolerance;

    // Find all contiguous segments where all mapped channels are within tolerance
    let bestStart = -1;
    let bestEnd = -1;
    let maxLen = 0;

    let currentStart = -1;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Check if mapped channels are inside tolerance band
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
      } else {
        if (currentStart !== -1) {
          const len = i - currentStart;
          if (len > maxLen) {
            maxLen = len;
            bestStart = currentStart;
            bestEnd = i - 1;
          }
          currentStart = -1;
        }
      }
    }

    if (currentStart !== -1) {
      const len = rows.length - currentStart;
      if (len > maxLen) {
        maxLen = len;
        bestStart = currentStart;
        bestEnd = rows.length - 1;
      }
    }

    // If no strict 100% segment found, find segment where at least 80% of channels are within band
    if (bestStart === -1 || maxLen < 3) {
      currentStart = -1;
      maxLen = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let inCount = 0;
        for (const map of activeMappings) {
          const val = row.values[map.csvHeader];
          if (val !== undefined && val >= lowerTol - 1.0 && val <= upperTol + 1.0) {
            inCount++;
          }
        }
        const pct = inCount / activeMappings.length;
        if (pct >= 0.75) {
          if (currentStart === -1) currentStart = i;
        } else {
          if (currentStart !== -1) {
            const len = i - currentStart;
            if (len > maxLen) {
              maxLen = len;
              bestStart = currentStart;
              bestEnd = i - 1;
            }
            currentStart = -1;
          }
        }
      }
      if (currentStart !== -1 && rows.length - currentStart > maxLen) {
        bestStart = currentStart;
        bestEnd = rows.length - 1;
      }
    }

    if (bestStart !== -1 && bestEnd >= bestStart) {
      const startRow = rows[bestStart];
      const endRow = rows[bestEnd];
      const durationSec = Math.max(0, endRow.timestampSec - startRow.timestampSec);
      const durationMin = Math.round(durationSec / 60);

      // Search prior to and during dwell for maximum overshoot
      let maxOvershoot = target;
      const searchStart = Math.max(0, bestStart - Math.floor(bestStart * 0.2));
      for (let i = searchStart; i <= bestEnd; i++) {
        for (const map of activeMappings) {
          const val = rows[i].values[map.csvHeader];
          if (val !== undefined && val > maxOvershoot) {
            maxOvershoot = val;
          }
        }
      }

      // Calculate steady-state readings for each channel
      const channelReadings: Record<string, number> = {};
      const channelMin: Record<string, number> = {};
      const channelMax: Record<string, number> = {};

      activeMappings.forEach((map) => {
        let sum = 0;
        let count = 0;
        let minV = Infinity;
        let maxV = -Infinity;

        // Take steady state window (middle 60% of dwell to eliminate entry transients)
        const trim = Math.floor((bestEnd - bestStart) * 0.15);
        const steadyStart = bestStart + trim;
        const steadyEnd = bestEnd - trim;

        for (let i = steadyStart; i <= steadyEnd; i++) {
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

      // Temperature spread
      const allVals = Object.values(channelReadings);
      const minRead = Math.min(...allVals);
      const maxRead = Math.max(...allVals);
      const spread = Math.round((maxRead - minRead) * 10) / 10;

      const isDurationCompliant = durationMin >= minDurationMinutes;
      const isSpreadCompliant =
        maxRead <= target + tolerance && minRead >= target - tolerance;

      results.push({
        targetTemp: target,
        startIndex: bestStart,
        endIndex: bestEnd,
        startTimeStr: startRow.timeStr,
        endTimeStr: endRow.timeStr,
        durationMinutes: durationMin,
        maxOvershoot: Math.round(maxOvershoot * 10) / 10,
        channelReadings,
        channelMin,
        channelMax,
        isDurationCompliant,
        isSpreadCompliant,
        tempSpread: spread,
      });
    }
  });

  return results;
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
