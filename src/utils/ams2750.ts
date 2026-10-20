import {
  FurnaceClass,
  TempUnit,
  DimUnit,
  FurnaceChamber,
  QualifiedWorkZone,
  ThermocoupleChannel,
  SurveySetpoint,
} from '../types/tus';

export const CLASS_TOLERANCES: Record<FurnaceClass, { '°F': number; '°C': number }> = {
  1: { '°F': 5, '°C': 3 },
  2: { '°F': 10, '°C': 6 },
  3: { '°F': 15, '°C': 8 },
  4: { '°F': 20, '°C': 10 },
  5: { '°F': 25, '°C': 14 },
  6: { '°F': 50, '°C': 28 },
};

/**
 * Calculates work zone volume in cubic metres (AMS 2750 Rev H Table 17)
 */
export function calculateVolumeInM3(qwz: QualifiedWorkZone, dimUnit: DimUnit): number {
  if (dimUnit === 'mm') {
    return (qwz.length * qwz.width * qwz.height) / 1_000_000_000;
  } else {
    // inches to m³: 1 in³ = 1.6387064e-5 m³
    const volIn3 = qwz.length * qwz.width * qwz.height;
    return volIn3 * 0.000016387064;
  }
}

/**
 * Calculates work zone volume in cubic feet
 */
export function calculateVolumeInCuFt(qwz: QualifiedWorkZone, dimUnit: DimUnit): number {
  if (dimUnit === 'in') {
    return (qwz.length * qwz.width * qwz.height) / 1728;
  } else {
    const volMm3 = qwz.length * qwz.width * qwz.height;
    return volMm3 / 28316846.592;
  }
}

/**
 * AMS 2750 Rev H Table 17 (p. 44) & Table 18 (p. 45):
 * Minimum Number of TUS Sensors (Volumetric Method)
 * - < 3 ft³ (< 0.085 m³): 5 sensors (4 alternating corners + 1 center per Figure 1; 9-sensor layout also permitted per Table 17 Note 1)
 * - ≥ 3 and < 225 ft³ (≥ 0.085 and < 6.4 m³): 9 sensors (8 corners + 1 center)
 * - ≥ 225 ft³ (≥ 6.4 m³): See Table 18 (depends on Furnace Class 1–2 vs 3–6, via Table 18 brackets or formula)
 */
export interface SymmetryAnalysis {
  isSymmetrical: boolean;
  hasCenterSensor: boolean;
  currentCount: number;
  recommendedCount: number;
  additionalNeeded: number;
  symmetryType: string;
  description: string;
  recommendationNote: string;
}

/**
 * Evaluates whether a sensor count forms a fully 3D symmetrical layout with 1 sensor dead center.
 * If asymmetrical, recommends the nearest higher symmetrical count.
 */
export function getSymmetryAnalysis(count: number): SymmetryAnalysis {
  const symmetricalTiers = [
    { count: 5, type: '5-Point Cross', name: '5-Point Cross (1 Center + 4 Corners)' },
    { count: 9, type: '9-Point Cube', name: '9-Point Cube (1 Center + 8 Corners)' },
    { count: 15, type: '15-Point Symmetrical Cube', name: '15-Point Symmetrical (1 Center + 8 Corners + 6 Face Centers)' },
    { count: 21, type: '21-Point Symmetrical Cube', name: '21-Point Symmetrical (1 Center + 8 Corners + 12 Edge Mids)' },
    { count: 27, type: '27-Point Symmetrical Grid', name: '27-Point Full Grid (3x3x3 Symmetrical Cube)' },
    { count: 33, type: '33-Point Symmetrical Grid', name: '33-Point Symmetrical (1 Center + 8 Corners + 24 Edge Quarters)' },
    { count: 45, type: '45-Point High-Density Grid', name: '45-Point Symmetrical (1 Center + 8 Corners + 12 Edge Mids + 24 Quarters)' },
    { count: 51, type: '51-Point High-Density Grid', name: '51-Point Symmetrical (1 Center + 8 Corners + 6 Faces + 12 Edges + 24 Quarters)' },
    { count: 65, type: '65-Point High-Density Grid', name: '65-Point Symmetrical Shell Grid' },
  ];

  const match = symmetricalTiers.find((t) => t.count === count);

  if (match) {
    return {
      isSymmetrical: true,
      hasCenterSensor: true,
      currentCount: count,
      recommendedCount: count,
      additionalNeeded: 0,
      symmetryType: match.type,
      description: match.name,
      recommendationNote: `Sensor layout has ${count} sensors arranged in a 100% 3D symmetrical pattern with 1 sensor fixed dead center at the QWZ geometric hub.`,
    };
  }

  const nextTier = symmetricalTiers.find((t) => t.count > count) || {
    count: Math.ceil(count / 2) * 2 + 1,
    name: `${Math.ceil(count / 2) * 2 + 1}-Point Symmetrical Grid`,
    type: 'Custom Symmetrical',
  };

  const additionalNeeded = nextTier.count - count;

  return {
    isSymmetrical: false,
    hasCenterSensor: true,
    currentCount: count,
    recommendedCount: nextTier.count,
    additionalNeeded,
    symmetryType: 'Asymmetrical',
    description: `Asymmetrical ${count}-Sensor Layout`,
    recommendationNote: `The minimum required count of ${count} sensors creates an asymmetrical layout. We recommend adding ${additionalNeeded} sensor${additionalNeeded > 1 ? 's' : ''} (total ${nextTier.count} sensors: ${nextTier.name}) to keep the layout 100% 3D symmetrical while maintaining 1 sensor fixed dead center at the QWZ geometric hub.`,
  };
}

/**
 * AMS 2750 Rev H Table 17 (p. 44) & Table 18 (p. 45):
 * Minimum Number of TUS Sensors (Volumetric Method)
 * - < 3 ft³ (< 0.085 m³): 5 sensors (4 alternating corners + 1 center per Figure 1; 9-sensor layout also permitted per Table 17 Note 1)
 * - ≥ 3 and < 225 ft³ (≥ 0.085 and < 6.4 m³): 9 sensors (8 corners + 1 center)
 * - ≥ 225 ft³ (≥ 6.4 m³): See Table 18 (depends on Furnace Class 1–2 vs 3–6, via Table 18 brackets or formula)
 */
export function getMinRequiredSensors(
  volumeCuFt: number,
  volumeM3?: number,
  furnaceClass: FurnaceClass = 2
): {
  minSensors: number;
  ruleText: string;
  formulaBreakdown: string;
  volumeM3Val: number;
  volumeCuFtVal: number;
  baselineSensors: number;
  additionalSensors: number;
  isSymmetrical: boolean;
  recommendedSensors: number;
  additionalNeededForSymmetry: number;
  symmetryNote: string;
} {
  const volM3 = volumeM3 !== undefined ? volumeM3 : volumeCuFt * 0.0283168;
  const volCuFt = volumeCuFt !== undefined ? volumeCuFt : volM3 * 35.3147;

  let minSensors = 9;
  let ruleText = '';
  let formulaBreakdown = '';
  let baselineSensors = 9;
  let additionalSensors = 0;

  if (volM3 <= 0 || volCuFt <= 0) {
    minSensors = 5;
    baselineSensors = 5;
    ruleText = `AMS 2750 Rev H Table 17: Enter work zone dimensions (> 0) to calculate volume. Volumes < 0.085 m³ (< 3 ft³) require a minimum of 5 sensors (4 corners + 1 center per Figure 1).`;
    formulaBreakdown = `Work zone volume is currently 0.000 m³ (0.0 ft³). Per AMS 2750 Rev H Table 17, volumes < 0.085 m³ (< 3 ft³) require 5 sensors minimum (or 9 sensors per Table 17 Note 1), and volumes ≥ 0.085 m³ to < 6.4 m³ (3 to < 225 ft³) require 9 sensors.`;
  } else if (volM3 < 0.085 && volCuFt < 3) {
    minSensors = 5;
    baselineSensors = 5;
    ruleText = `AMS 2750 Rev H Table 17: Work zone volume ${volM3.toFixed(3)} m³ (${volCuFt.toFixed(2)} ft³) is < 0.085 m³ (< 3 ft³) and requires a minimum of 5 sensors (4 corners + 1 center per Figure 1; 9 sensors optional per Note 1).`;
    formulaBreakdown = `Volume ${volM3.toFixed(3)} m³ (${volCuFt.toFixed(2)} ft³) is below 0.085 m³ (3 ft³), requiring 5 sensors minimum (4 alternating corners + 1 center per Figure 1) under AMS 2750 Rev H Table 17 (Note 1 also permits using the 9-sensor layout).`;
  } else if (volM3 < 6.4 && volCuFt < 225) {
    minSensors = 9;
    baselineSensors = 9;
    ruleText = `AMS 2750 Rev H Table 17: Work zone volume ${volM3.toFixed(2)} m³ (${volCuFt.toFixed(1)} ft³) is between 0.085 and 6.4 m³ (3 to < 225 ft³), requiring a minimum of 9 sensors (8 corners + 1 center).`;
    formulaBreakdown = `Volume ${volM3.toFixed(2)} m³ (${volCuFt.toFixed(1)} ft³) is within ≥ 0.085 to < 6.4 m³ (≥ 3 to < 225 ft³), requiring the baseline 9 sensors (8 corners + 1 geometric center) per AMS 2750 Rev H Table 17 & Figure 1.`;
  } else {
    const isClass1Or2 = furnaceClass === 1 || furnaceClass === 2;
    const table18Brackets = [
      { maxCuFt: 300, maxM3: 8.5, c12: 14, c36: 12 },
      { maxCuFt: 400, maxM3: 11, c12: 16, c36: 13 },
      { maxCuFt: 600, maxM3: 17, c12: 19, c36: 14 },
      { maxCuFt: 800, maxM3: 23, c12: 21, c36: 15 },
      { maxCuFt: 1000, maxM3: 28, c12: 23, c36: 16 },
      { maxCuFt: 2000, maxM3: 57, c12: 30, c36: 20 },
      { maxCuFt: 3000, maxM3: 85, c12: 35, c36: 23 },
      { maxCuFt: 4000, maxM3: 113, c12: 40, c36: 25 },
    ];

    let foundBracket = false;
    for (const b of table18Brackets) {
      if (volCuFt < b.maxCuFt || volM3 < b.maxM3) {
        minSensors = isClass1Or2 ? b.c12 : b.c36;
        additionalSensors = minSensors - 9;
        baselineSensors = 9;
        ruleText = `AMS 2750 Rev H Table 18 (Class ${furnaceClass}): Volume ${volM3.toFixed(2)} m³ (${volCuFt.toFixed(1)} ft³) < ${b.maxM3} m³ (${b.maxCuFt} ft³) requires ${minSensors} sensors (8 corners + 1 center + ${additionalSensors} distributed).`;
        formulaBreakdown = `Per AMS 2750 Rev H Table 17 & Table 18 (Furnace Class ${furnaceClass}, volume < ${b.maxM3} m³ / ${b.maxCuFt} ft³): 9 baseline sensors + ${additionalSensors} uniformly distributed sensors = ${minSensors} Sensors Minimum.`;
        foundBracket = true;
        break;
      }
    }

    if (!foundBracket) {
      const factor = isClass1Or2 ? 0.5 : 0.25;
      const excessCuFt = Math.max(0, volCuFt - 225);
      additionalSensors = Math.ceil(factor * Math.sqrt(excessCuFt));
      minSensors = 9 + additionalSensors;
      baselineSensors = 9;
      ruleText = `AMS 2750 Rev H Table 18 Note 1 (Class ${furnaceClass}): Volume ${volM3.toFixed(2)} m³ (${volCuFt.toFixed(0)} ft³) requires 9 + ${isClass1Or2 ? '1/2' : '1/4'}×√(${volCuFt.toFixed(0)} - 225) = ${minSensors} sensors.`;
      formulaBreakdown = `Baseline 9 sensors + ${additionalSensors} additional sensors via Table 18 Note 1 formula [9 + ${isClass1Or2 ? '1/2' : '1/4'} × √(Vol_ft³ - 225)] = ${minSensors} Sensors Minimum.`;
    }
  }

  const sym = getSymmetryAnalysis(minSensors);

  return {
    minSensors,
    ruleText,
    formulaBreakdown,
    volumeM3Val: volM3,
    volumeCuFtVal: volCuFt,
    baselineSensors,
    additionalSensors,
    isSymmetrical: sym.isSymmetrical,
    recommendedSensors: sym.recommendedCount,
    additionalNeededForSymmetry: sym.additionalNeeded,
    symmetryNote: sym.recommendationNote,
  };
}

/**
 * Rescales thermocouple channel positions so they proportionally and perfectly
 * fill the new Qualified Work Zone whenever QWZ boundaries or clearances change!
 */
export function rescaleChannelsToQWZ(
  channels: ThermocoupleChannel[],
  oldQWZ: QualifiedWorkZone,
  newQWZ: QualifiedWorkZone,
  chamber: FurnaceChamber
): ThermocoupleChannel[] {
  const oldL = Math.max(1, oldQWZ.length);
  const oldW = Math.max(1, oldQWZ.width);
  const oldH = Math.max(1, oldQWZ.height);

  return channels.map((ch) => {
    // Canonical normalized relative position inside QWZ [0, 1]
    const ux =
      ch.ux !== undefined
        ? ch.ux
        : Math.max(0, Math.min(1, (ch.x - oldQWZ.offsetFront) / oldL));
    const uy =
      ch.uy !== undefined
        ? ch.uy
        : Math.max(0, Math.min(1, (ch.y - oldQWZ.offsetFloor) / oldH));
    const uz =
      ch.uz !== undefined
        ? ch.uz
        : Math.max(0, Math.min(1, (ch.z - oldQWZ.offsetLeft) / oldW));

    // Map to new QWZ coordinate space
    const newX = Math.round((newQWZ.offsetFront + ux * newQWZ.length) * 10) / 10;
    const newY = Math.round((newQWZ.offsetFloor + uy * newQWZ.height) * 10) / 10;
    const newZ = Math.round((newQWZ.offsetLeft + uz * newQWZ.width) * 10) / 10;

    const dist = computeSensorDistances(newX, newY, newZ, chamber);

    return {
      ...ch,
      x: newX,
      y: newY,
      z: newZ,
      ux,
      uy,
      uz,
      ...dist,
    };
  });
}

/**
 * Calculate 6-way wall/floor/ceiling clearances for a 3D coordinate (x, y, z) inside the furnace chamber
 * x: length / front-to-back (0 = Front wall, chamber.length = Rear wall)
 * y: height / floor-to-ceiling (0 = Floor, chamber.height = Ceiling)
 * z: width / left-to-right (0 = Left wall, chamber.width = Right wall)
 */
export function computeSensorDistances(
  x: number,
  y: number,
  z: number,
  chamber: FurnaceChamber
) {
  const distFront = Math.max(0, Math.round(x * 10) / 10);
  const distRear = Math.max(0, Math.round((chamber.length - x) * 10) / 10);
  const distFloor = Math.max(0, Math.round(y * 10) / 10);
  const distCeiling = Math.max(0, Math.round((chamber.height - y) * 10) / 10);
  const distLeft = Math.max(0, Math.round(z * 10) / 10);
  const distRight = Math.max(0, Math.round((chamber.width - z) * 10) / 10);

  return { distFront, distRear, distFloor, distCeiling, distLeft, distRight };
}

/**
 * Generate standard AMS 2750 Rev H sensor layout for a given furnace chamber and qualified work zone
 * Always guarantees that the 8 corners, center, and zone extents are filled!
 */
export function generateStandardAMS2750Sensors(
  chamber: FurnaceChamber,
  qwz: QualifiedWorkZone,
  count: number = 9
): ThermocoupleChannel[] {
  const xMin = qwz.offsetFront;
  const xMax = qwz.offsetFront + qwz.length;
  const xMid = (xMin + xMax) / 2;

  const yMin = qwz.offsetFloor;
  const yMax = qwz.offsetFloor + qwz.height;
  const yMid = (yMin + yMax) / 2;

  const zMin = qwz.offsetLeft;
  const zMax = qwz.offsetLeft + qwz.width;
  const zMid = (zMin + zMax) / 2;

  // Handle 5-sensor layout for < 3 ft³ (< 0.085 m³) per AMS 2750 Rev H Table 17 & Figure 1
  // Sensor #1 is ALWAYS Geometric Center
  if (count === 5) {
    const points5: Array<{ label: string; x: number; y: number; z: number }> = [
      { label: 'Geometric Center (Spider Hub)', x: xMid, y: yMid, z: zMid },
      { label: 'Front Upper Left Corner (Loc 1)', x: xMin, y: yMax, z: zMin },
      { label: 'Front Lower Right Corner (Loc 4)', x: xMin, y: yMin, z: zMax },
      { label: 'Rear Lower Left Corner (Loc 7)', x: xMax, y: yMin, z: zMin },
      { label: 'Rear Upper Right Corner (Loc 8)', x: xMax, y: yMax, z: zMax },
    ];
    const qL = Math.max(1, qwz.length);
    const qH = Math.max(1, qwz.height);
    const qW = Math.max(1, qwz.width);
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0];

    return points5.map((p, idx) => {
      const channelNumber = idx + 1;
      const dist = computeSensorDistances(p.x, p.y, p.z, chamber);
      const ux = Math.max(0, Math.min(1, (p.x - qwz.offsetFront) / qL));
      const uy = Math.max(0, Math.min(1, (p.y - qwz.offsetFloor) / qH));
      const uz = Math.max(0, Math.min(1, (p.z - qwz.offsetLeft) / qW));
      return {
        id: `tc-${channelNumber}`,
        channelNumber,
        label: p.label,
        type: 'N',
        rollLotNumber: '',
        calibrationDate: today,
        expirationDate: expiry,
        recorderChannel: `CH-${String(channelNumber).padStart(2, '0')}`,
        ...dist,
        x: p.x,
        y: p.y,
        z: p.z,
        ux,
        uy,
        uz,
        correctionFactors: {},
      };
    });
  }

  // Master Symmetrical Pool: Point #1 is ALWAYS Geometric Center (Dead Center of QWZ)
  const pool: Array<{ label: string; x: number; y: number; z: number }> = [
    // 1. Center Hub (Critical Anchor - DEAD CENTER)
    { label: 'Geometric Center (Spider Hub)', x: xMid, y: yMid, z: zMid },

    // 2. 8 Corners (Standard Envelope)
    { label: 'Front Upper Left Corner', x: xMin, y: yMax, z: zMin },
    { label: 'Rear Lower Right Corner', x: xMax, y: yMin, z: zMax },
    { label: 'Front Lower Right Corner', x: xMin, y: yMin, z: zMax },
    { label: 'Rear Upper Left Corner', x: xMax, y: yMax, z: zMin },
    { label: 'Front Upper Right Corner', x: xMin, y: yMax, z: zMax },
    { label: 'Rear Lower Left Corner', x: xMax, y: yMin, z: zMin },
    { label: 'Front Lower Left Corner', x: xMin, y: yMin, z: zMin },
    { label: 'Rear Upper Right Corner', x: xMax, y: yMax, z: zMax },

    // 3. 6 Face Centers (Standard for 15-point symmetrical TUS)
    { label: 'Top Face Center', x: xMid, y: yMax, z: zMid },
    { label: 'Bottom Face Center', x: xMid, y: yMin, z: zMid },
    { label: 'Left Face Center', x: xMid, y: yMid, z: zMin },
    { label: 'Right Face Center', x: xMid, y: yMid, z: zMax },
    { label: 'Front Face Center', x: xMin, y: yMid, z: zMid },
    { label: 'Rear Face Center', x: xMax, y: yMid, z: zMid },

    // 4. 12 Edge Centers (Refinement for 21/27 point TUS)
    { label: 'Front Top Edge Mid', x: xMin, y: yMax, z: zMid },
    { label: 'Rear Bottom Edge Mid', x: xMax, y: yMin, z: zMid },
    { label: 'Front Bottom Edge Mid', x: xMin, y: yMin, z: zMid },
    { label: 'Rear Top Edge Mid', x: xMax, y: yMax, z: zMid },
    { label: 'Top Left Edge Mid', x: xMid, y: yMax, z: zMin },
    { label: 'Bottom Right Edge Mid', x: xMid, y: yMin, z: zMax },
    { label: 'Bottom Left Edge Mid', x: xMid, y: yMin, z: zMin },
    { label: 'Top Right Edge Mid', x: xMid, y: yMax, z: zMax },
    { label: 'Front Left Edge Mid', x: xMin, y: yMid, z: zMin },
    { label: 'Rear Right Edge Mid', x: xMax, y: yMid, z: zMax },
    { label: 'Front Right Edge Mid', x: xMin, y: yMid, z: zMax },
    { label: 'Rear Left Edge Mid', x: xMax, y: yMid, z: zMin },

    // 5. 24 Edge Quarters (Symmetrical quads for 33/45/51 point layouts)
    { label: 'Front Top Edge 1/4', x: xMin, y: yMax, z: zMin + qwz.width * 0.25 },
    { label: 'Rear Bottom Edge 3/4', x: xMax, y: yMin, z: zMin + qwz.width * 0.75 },
    { label: 'Front Top Edge 3/4', x: xMin, y: yMax, z: zMin + qwz.width * 0.75 },
    { label: 'Rear Bottom Edge 1/4', x: xMax, y: yMin, z: zMin + qwz.width * 0.25 },

    { label: 'Front Bottom Edge 1/4', x: xMin, y: yMin, z: zMin + qwz.width * 0.25 },
    { label: 'Rear Top Edge 3/4', x: xMax, y: yMax, z: zMin + qwz.width * 0.75 },
    { label: 'Front Bottom Edge 3/4', x: xMin, y: yMin, z: zMin + qwz.width * 0.75 },
    { label: 'Rear Top Edge 1/4', x: xMax, y: yMax, z: zMin + qwz.width * 0.25 },

    { label: 'Top Left Edge 1/4', x: xMin + qwz.length * 0.25, y: yMax, z: zMin },
    { label: 'Bottom Right Edge 3/4', x: xMin + qwz.length * 0.75, y: yMin, z: zMax },
    { label: 'Top Left Edge 3/4', x: xMin + qwz.length * 0.75, y: yMax, z: zMin },
    { label: 'Bottom Right Edge 1/4', x: xMin + qwz.length * 0.25, y: yMin, z: zMax },

    { label: 'Top Right Edge 1/4', x: xMin + qwz.length * 0.25, y: yMax, z: zMax },
    { label: 'Bottom Left Edge 3/4', x: xMin + qwz.length * 0.75, y: yMin, z: zMin },
    { label: 'Top Right Edge 3/4', x: xMin + qwz.length * 0.75, y: yMax, z: zMax },
    { label: 'Bottom Left Edge 1/4', x: xMin + qwz.length * 0.25, y: yMin, z: zMin },

    { label: 'Front Left Edge 1/4', x: xMin, y: yMin + qwz.height * 0.25, z: zMin },
    { label: 'Rear Right Edge 3/4', x: xMax, y: yMin + qwz.height * 0.75, z: zMax },
    { label: 'Front Left Edge 3/4', x: xMin, y: yMin + qwz.height * 0.75, z: zMin },
    { label: 'Rear Right Edge 1/4', x: xMax, y: yMin + qwz.height * 0.25, z: zMax },

    { label: 'Front Right Edge 1/4', x: xMin, y: yMin + qwz.height * 0.25, z: zMax },
    { label: 'Rear Left Edge 3/4', x: xMax, y: yMin + qwz.height * 0.75, z: zMin },
    { label: 'Front Right Edge 3/4', x: xMin, y: yMin + qwz.height * 0.75, z: zMax },
    { label: 'Rear Left Edge 1/4', x: xMax, y: yMin + qwz.height * 0.25, z: zMin },
  ];

  // Select points from pool based on count
  const rawList = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    rawList.push({ num: i + 1, ...pool[i] });
  }

  // If user requested more than pool length, add symmetrical sub-grid internal volume points
  if (count > pool.length) {
    for (let i = pool.length + 1; i <= count; i++) {
      const idxInExtra = i - pool.length - 1;
      const fracX = (idxInExtra % 3) === 0 ? 0.25 : (idxInExtra % 3) === 1 ? 0.75 : 0.5;
      const fracY = Math.floor(idxInExtra / 3) % 2 === 0 ? 0.25 : 0.75;
      const fracZ = Math.floor(idxInExtra / 6) % 2 === 0 ? 0.25 : 0.75;

      rawList.push({
        num: i,
        label: `TC ${i}: Internal Grid Point`,
        x: xMin + qwz.length * fracX,
        y: yMin + qwz.height * fracY,
        z: zMin + qwz.width * fracZ,
      });
    }
  }

  const qL = Math.max(1, qwz.length);
  const qH = Math.max(1, qwz.height);
  const qW = Math.max(1, qwz.width);

  const today = new Date().toISOString().split('T')[0];
  const expiry = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0];

  return rawList.map((p, index) => {
    const channelNumber = p.num;
    const dist = computeSensorDistances(p.x, p.y, p.z, chamber);
    const ux = Math.max(0, Math.min(1, (p.x - qwz.offsetFront) / qL));
    const uy = Math.max(0, Math.min(1, (p.y - qwz.offsetFloor) / qH));
    const uz = Math.max(0, Math.min(1, (p.z - qwz.offsetLeft) / qW));

    return {
      id: `tc-${channelNumber}`,
      channelNumber,
      label: p.label,
      type: 'N',
      rollLotNumber: '',
      calibrationDate: today,
      expirationDate: expiry,
      recorderChannel: `CH-${String(channelNumber).padStart(2, '0')}`,
      ...dist,
      x: p.x,
      y: p.y,
      z: p.z,
      ux,
      uy,
      uz,
      correctionFactors: {
        'sp-1': -0.3 + (index % 5) * 0.15,
        'sp-2': -0.2 + (index % 4) * 0.15,
        'sp-3': 0.1 - (index % 3) * 0.15,
      },
    };
  });
}

export function calcDistance3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz) * 10) / 10;
}

export interface WireRiggingCable {
  id: string;
  stepNumber: number;
  category: '3d-diagonal' | 'perimeter-frame' | 'depth-rail' | 'face-cross' | 'mid-plane' | 'face-brace';
  title: string;
  fromChannelNum: number;
  fromLabel: string;
  toChannelNum: number;
  toLabel: string;
  cutLength: number;
  description: string;
  pair: [ThermocoupleChannel, ThermocoupleChannel];
}

export interface WireRiggingPlan {
  cables: WireRiggingCable[];
  connections: Array<[ThermocoupleChannel, ThermocoupleChannel]>;
  oppositeCornerDiagonals: Array<{
    id: string;
    title: string;
    cornerA: ThermocoupleChannel;
    center: ThermocoupleChannel;
    cornerB: ThermocoupleChannel;
    totalSpanLength: number;
    description: string;
  }>;
}

/**
 * Generates an engineering wire-rigging build schedule so technicians can
 * systematically construct the physical TUS spider web out of wire rope or tie-wire.
 *
 * Sequence:
 * 1. Opposite-Corner 3D Tension Diagonals (through Center Hub)
 * 2. 12-Cable Perimeter Box Frame (QWZ Boundaries)
 * 3. Face-Cross & Mid-Plane Stabilizers (Center-edge to center-edge, center-face to center-face)
 */
export function getLogicalWireRiggingSchedule(
  channels: ThermocoupleChannel[],
  qwz: QualifiedWorkZone,
  dimUnit: DimUnit = 'mm'
): WireRiggingPlan {
  if (!channels || channels.length === 0) {
    return {
      cables: [],
      connections: [],
      oppositeCornerDiagonals: [],
    };
  }

  const connections: Array<[ThermocoupleChannel, ThermocoupleChannel]> = [];
  const cables: WireRiggingCable[] = [];
  const oppositeCornerDiagonals: WireRiggingPlan['oppositeCornerDiagonals'] = [];

  let stepCounter = 1;

  const seenConnections = new Set<string>();

  const addCable = (
    a: ThermocoupleChannel | null | undefined,
    b: ThermocoupleChannel | null | undefined,
    category: WireRiggingCable['category'],
    title: string,
    description: string
  ) => {
    if (!a || !b || a.id === b.id) return;

    const [idMin, idMax] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
    const connectionKey = `${idMin}::${idMax}`;

    if (seenConnections.has(connectionKey)) return;
    seenConnections.add(connectionKey);

    connections.push([a, b]);
    cables.push({
      id: `cable-${a.id}-${b.id}`,
      stepNumber: stepCounter++,
      category,
      title,
      fromChannelNum: a.channelNumber,
      fromLabel: a.label,
      toChannelNum: b.channelNumber,
      toLabel: b.label,
      cutLength: calcDistance3D(a, b),
      description,
      pair: [a, b],
    });
  };

  // 1. Identify 8 Corners & Center Hub based on QWZ geometry
  const xMin = qwz.offsetFront;
  const xMax = qwz.offsetFront + qwz.length;
  const xMid = (xMin + xMax) / 2;

  const yMin = qwz.offsetFloor;
  const yMax = qwz.offsetFloor + qwz.height;
  const yMid = (yMin + yMax) / 2;

  const zMin = qwz.offsetLeft;
  const zMax = qwz.offsetLeft + qwz.width;
  const zMid = (zMin + zMax) / 2;

  const findClosest = (tx: number, ty: number, tz: number, excludeIds: Set<string> = new Set()) => {
    let closest: ThermocoupleChannel | undefined = undefined;
    let minDist = Infinity;
    for (const ch of channels) {
      if (excludeIds.has(ch.id)) continue;
      const d = Math.hypot(ch.x - tx, ch.y - ty, ch.z - tz);
      if (d < minDist) {
        minDist = d;
        closest = ch;
      }
    }
    return closest || channels[0];
  };

  const corners = {
    fBL: findClosest(xMin, yMin, zMin),
    fBR: findClosest(xMin, yMin, zMax),
    fTL: findClosest(xMin, yMax, zMin),
    fTR: findClosest(xMin, yMax, zMax),
    rBL: findClosest(xMax, yMin, zMin),
    rBR: findClosest(xMax, yMin, zMax),
    rTL: findClosest(xMax, yMax, zMin),
    rTR: findClosest(xMax, yMax, zMax),
  };

  // Identify intended Hub sensor (closest to center)
  const closestToCenter =
    channels.find((c) => c.label.toLowerCase().includes('center') || c.label.toLowerCase().includes('hub')) ||
    findClosest(xMid, yMid, zMid);

  // Proximity check: is this sensor actually near the center?
  const centerDist = Math.hypot(
    closestToCenter.x - xMid,
    closestToCenter.y - yMid,
    closestToCenter.z - zMid
  );
  const minDim = Math.min(qwz.length, qwz.width, qwz.height);
  const hubSensor = centerDist < minDim * 0.2 ? closestToCenter : null;
  const centerNum = hubSensor?.channelNumber ?? 0;

  // -----------------------------------------------------------
  // STEP 1: 4 MAIN 3D CROSS-BODY DIAGONALS (THROUGH CENTER HUB)
  // -----------------------------------------------------------
  const diagPairs: Array<[keyof typeof corners, keyof typeof corners, string]> = [
    ['fBL', 'rTR', 'Diagonal 1: Front-Bottom-Left to Rear-Top-Right'],
    ['fBR', 'rTL', 'Diagonal 2: Front-Bottom-Right to Rear-Top-Left'],
    ['fTL', 'rBR', 'Diagonal 3: Front-Top-Left to Rear-Bottom-Right'],
    ['fTR', 'rBL', 'Diagonal 4: Front-Top-Right to Rear-Bottom-Left'],
  ];

  diagPairs.forEach(([c1, c2, title], idx) => {
    const a = corners[c1];
    const b = corners[c2];

    if (hubSensor && a.id !== hubSensor.id && b.id !== hubSensor.id) {
      addCable(a, hubSensor, '3d-diagonal', `${title} (Part A)`, 'Radial spider leg to Hub');
      addCable(hubSensor, b, '3d-diagonal', `${title} (Part B)`, 'Radial spider leg to Hub');

      const span = calcDistance3D(a, b);
      oppositeCornerDiagonals.push({
        id: `diag-${idx + 1}`,
        title,
        cornerA: a,
        center: hubSensor,
        cornerB: b,
        totalSpanLength: span,
        description: `Opposite-corner diagonal intersecting at Center Hub (${centerNum > 0 ? `TC ${centerNum}` : hubSensor.label}).`,
      });
    } else {
      addCable(a, b, '3d-diagonal', title, 'Direct opposite-corner tension cable');
    }
  });

  // -----------------------------------------------------------
  // STEP 2: 12-CABLE PERIMETER BOX FRAME (QWZ BOUNDARIES)
  // -----------------------------------------------------------
  const { fBL, fBR, fTL, fTR, rBL, rBR, rTL, rTR } = corners;

  // Front Face
  addCable(fTL, fTR, 'perimeter-frame', 'Front Top Rail', 'Structural frame');
  addCable(fTR, fBR, 'perimeter-frame', 'Front Right Post', 'Structural frame');
  addCable(fBR, fBL, 'perimeter-frame', 'Front Bottom Rail', 'Structural frame');
  addCable(fBL, fTL, 'perimeter-frame', 'Front Left Post', 'Structural frame');

  // Rear Face
  addCable(rTL, rTR, 'perimeter-frame', 'Rear Top Rail', 'Structural frame');
  addCable(rTR, rBR, 'perimeter-frame', 'Rear Right Post', 'Structural frame');
  addCable(rBR, rBL, 'perimeter-frame', 'Rear Bottom Rail', 'Structural frame');
  addCable(rBL, rTL, 'perimeter-frame', 'Rear Left Post', 'Structural frame');

  // Depth Rails
  addCable(fTL, rTL, 'depth-rail', 'Top Left Depth Rail', 'Structural frame');
  addCable(fTR, rTR, 'depth-rail', 'Top Right Depth Rail', 'Structural frame');
  addCable(fBR, rBR, 'depth-rail', 'Bottom Right Depth Rail', 'Structural frame');
  addCable(fBL, rBL, 'depth-rail', 'Bottom Left Depth Rail', 'Structural frame');

  // -----------------------------------------------------------
  // STEP 3: FACE CROSS-HAIRS & MID-PLANE GRIDS
  // -----------------------------------------------------------
  const mids = {
    fT: findClosest(xMin, yMax, zMid),
    fB: findClosest(xMin, yMin, zMid),
    fL: findClosest(xMin, yMid, zMin),
    fR: findClosest(xMin, yMid, zMax),
    rT: findClosest(xMax, yMax, zMid),
    rB: findClosest(xMax, yMin, zMid),
    rL: findClosest(xMax, yMid, zMin),
    rR: findClosest(xMax, yMid, zMax),
    tL: findClosest(xMid, yMax, zMin),
    tR: findClosest(xMid, yMax, zMax),
    tF: findClosest(xMin, yMax, zMid),
    tBa: findClosest(xMax, yMax, zMid),
    bL: findClosest(xMid, yMin, zMin),
    bR: findClosest(xMid, yMin, zMax),
    bF: findClosest(xMin, yMin, zMid),
    bBa: findClosest(xMax, yMin, zMid),
  };

  const faceCenters = {
    front: findClosest(xMin, yMid, zMid),
    rear: findClosest(xMax, yMid, zMid),
    top: findClosest(xMid, yMax, zMid),
    bottom: findClosest(xMid, yMin, zMid),
    left: findClosest(xMid, yMid, zMin),
    right: findClosest(xMid, yMid, zMax),
  };

  const addFaceCross = (
    a: ThermocoupleChannel,
    b: ThermocoupleChannel,
    center: ThermocoupleChannel,
    title: string
  ) => {
    if (center && center.id !== a.id && center.id !== b.id) {
      addCable(a, center, 'face-cross', `${title} (Part A)`, 'Face stability grid');
      addCable(center, b, 'face-cross', `${title} (Part B)`, 'Face stability grid');
    } else {
      addCable(a, b, 'face-cross', title, 'Face stability grid');
    }
  };

  // Front Face Cross
  addFaceCross(mids.fT, mids.fB, faceCenters.front, 'Front Vertical Cross');
  addFaceCross(mids.fL, mids.fR, faceCenters.front, 'Front Horizontal Cross');

  // Rear Face Cross
  addFaceCross(mids.rT, mids.rB, faceCenters.rear, 'Rear Vertical Cross');
  addFaceCross(mids.rL, mids.rR, faceCenters.rear, 'Rear Horizontal Cross');

  // Top Face Cross
  addFaceCross(mids.tL, mids.tR, faceCenters.top, 'Top Transverse Cross');

  // Bottom Face Cross
  addFaceCross(mids.bL, mids.bR, faceCenters.bottom, 'Bottom Transverse Cross');

  // Add Mid-Plane Crosses (Face Center to Opposite Face Center through Hub)
  if (hubSensor) {
    // Floor-to-Ceiling Plane
    addCable(faceCenters.bottom, hubSensor, 'mid-plane', 'Y-Axis Plane (Bottom to Hub)', 'Internal volumetric grid');
    addCable(hubSensor, faceCenters.top, 'mid-plane', 'Y-Axis Plane (Hub to Top)', 'Internal volumetric grid');

    // Left-to-Right Plane
    addCable(faceCenters.left, hubSensor, 'mid-plane', 'Z-Axis Plane (Left to Hub)', 'Internal volumetric grid');
    addCable(hubSensor, faceCenters.right, 'mid-plane', 'Z-Axis Plane (Hub to Right)', 'Internal volumetric grid');

    // Front-to-Rear Plane
    addCable(faceCenters.front, hubSensor, 'mid-plane', 'X-Axis Plane (Front to Hub)', 'Internal volumetric grid');
    addCable(hubSensor, faceCenters.rear, 'mid-plane', 'X-Axis Plane (Hub to Rear)', 'Internal volumetric grid');

    // Internal Longitudinal Stabilizers (Depth rails for face centers)
    addCable(mids.fT, mids.rT, 'depth-rail', 'Top Center Depth Rail', 'Internal volumetric stabilizer');
    addCable(mids.fB, mids.rB, 'depth-rail', 'Bottom Center Depth Rail', 'Internal volumetric stabilizer');
    addCable(mids.fL, mids.rL, 'depth-rail', 'Left Center Depth Rail', 'Internal volumetric stabilizer');
    addCable(mids.fR, mids.rR, 'depth-rail', 'Right Center Depth Rail', 'Internal volumetric stabilizer');
  } else {
    addCable(faceCenters.bottom, faceCenters.top, 'mid-plane', 'Y-Axis Plane', 'Internal volumetric grid');
    addCable(faceCenters.left, faceCenters.right, 'mid-plane', 'Z-Axis Plane', 'Internal volumetric grid');
    addCable(faceCenters.front, faceCenters.rear, 'mid-plane', 'X-Axis Plane', 'Internal volumetric grid');
  }

  // -----------------------------------------------------------
  // STEP 4: TETHER ALL OTHER SENSORS TO HUB
  // -----------------------------------------------------------
  const coreIds = new Set<string>();
  if (hubSensor) coreIds.add(hubSensor.id);
  Object.values(corners).forEach((c) => coreIds.add(c.id));
  Object.values(mids).forEach((c) => coreIds.add(c.id));
  Object.values(faceCenters).forEach((c) => coreIds.add(c.id));

  if (hubSensor) {
    channels.forEach((ch) => {
      if (!coreIds.has(ch.id)) {
        addCable(
          ch,
          hubSensor,
          'face-brace',
          `Radial Lead (${ch.channelNumber > 0 ? `TC ${ch.channelNumber}` : ch.label} ➔ Hub)`,
          'Logical center-tethered rigging'
        );
      }
    });
  }

  return {
    cables,
    connections,
    oppositeCornerDiagonals,
  };
}

/**
 * Extracts the physical location description from a sensor label by stripping any leading "TC X:" prefix.
 */
export function formatBaseSensorLocation(label: string): string {
  return (label || '').replace(/^TC\s*(?:\d+|—|\?)\s*[-:]\s*/i, '').trim() || 'Sensor Location';
}

/**
 * Formats a sensor label consistently with its assigned channel number.
 */
export function formatSensorLabelWithNumber(baseLocation: string, channelNumber: number): string {
  const cleanBase = formatBaseSensorLocation(baseLocation);
  return channelNumber > 0 ? `TC ${channelNumber}: ${cleanBase}` : cleanBase;
}

/**
 * Assigns or clears a sensor's Field Instrument Channel Number and syncs
 * channelNumber, recorderChannel (CH-XX), and label across both Schematic and Sensor Manager.
 * When resolveDuplicates is true, any other sensor holding the same positive channelNumber is unassigned.
 */
export function assignSensorChannelNumber(
  channels: ThermocoupleChannel[],
  targetId: string,
  newNum: number,
  resolveDuplicates: boolean = true
): ThermocoupleChannel[] {
  const cleanNum = Math.max(0, Math.floor(newNum) || 0);

  return channels.map((ch) => {
    const baseLocation = formatBaseSensorLocation(ch.label);
    if (ch.id === targetId) {
      if (cleanNum <= 0) {
        return {
          ...ch,
          channelNumber: 0,
          recorderChannel: 'UNASSIGNED',
          label: baseLocation,
        };
      }
      return {
        ...ch,
        channelNumber: cleanNum,
        recorderChannel: `CH-${String(cleanNum).padStart(2, '0')}`,
        label: `TC ${cleanNum}: ${baseLocation}`,
      };
    }

    if (resolveDuplicates && cleanNum > 0 && ch.channelNumber === cleanNum) {
      return {
        ...ch,
        channelNumber: 0,
        recorderChannel: 'UNASSIGNED',
        label: baseLocation,
      };
    }

    return ch;
  });
}

/**
 * Clears all channel numbers across all sensors (sets channelNumber = 0, recorderChannel = 'UNASSIGNED').
 */
export function clearAllSensorNumbers(channels: ThermocoupleChannel[]): ThermocoupleChannel[] {
  return channels.map((ch) => ({
    ...ch,
    channelNumber: 0,
    recorderChannel: 'UNASSIGNED',
    label: formatBaseSensorLocation(ch.label),
  }));
}

/**
 * Restores sequential channel numbering (1..N) across all sensors.
 */
export function resetSequentialSensorNumbers(channels: ThermocoupleChannel[]): ThermocoupleChannel[] {
  return channels.map((ch, idx) => {
    const num = idx + 1;
    const baseLocation = formatBaseSensorLocation(ch.label);
    return {
      ...ch,
      channelNumber: num,
      recorderChannel: `CH-${String(num).padStart(2, '0')}`,
      label: `TC ${num}: ${baseLocation}`,
    };
  });
}

/**
 * Distributes sensors in a balanced, symmetrical pattern based on current count.
 * Snaps to corners, face centers, edge centers, and hub while preserving assigned channel numbers.
 */
export function balanceSensors(
  channels: ThermocoupleChannel[],
  chamber: FurnaceChamber,
  qwz: QualifiedWorkZone
): ThermocoupleChannel[] {
  const count = channels.length;
  // Use standard layouts if possible, otherwise distribute logically
  const balanced = generateStandardAMS2750Sensors(chamber, qwz, count);
  
  // Find channel 1 if present, or fallback to first channel index
  const ch1Index = channels.findIndex((c) => c.channelNumber === 1);

  // Maintain user-defined metadata and channel numbering while updating positions
  return channels.map((ch, idx) => {
    let balancedIdx = idx;
    if (ch1Index !== -1) {
      if (idx === ch1Index) balancedIdx = 0; // TC 1 gets point 0 (Geometric Center)
      else if (idx === 0) balancedIdx = ch1Index; // Swap index 0's point to TC 1's old index point
    }
    const balancedPos = balanced[balancedIdx] || balanced[balanced.length - 1];
    const baseLoc = formatBaseSensorLocation(balancedPos.label);
    return {
      ...ch,
      x: balancedPos.x,
      y: balancedPos.y,
      z: balancedPos.z,
      ux: balancedPos.ux,
      uy: balancedPos.uy,
      uz: balancedPos.uz,
      ...computeSensorDistances(balancedPos.x, balancedPos.y, balancedPos.z, chamber),
      label: formatSensorLabelWithNumber(baseLoc, ch.channelNumber),
    };
  });
}

/**
 * Returns array of [ThermocoupleChannel, ThermocoupleChannel] wire links for rendering
 */
export function getWireGridConnections(channels: ThermocoupleChannel[], qwz: QualifiedWorkZone): Array<[ThermocoupleChannel, ThermocoupleChannel]> {
  const plan = getLogicalWireRiggingSchedule(channels, qwz);
  return plan.connections;
}

export interface SetpointAnalysisResult {
  setpointId: string;
  targetTemp: number;
  tolerance: number;
  minAllowed: number;
  maxAllowed: number;
  minCorrectedTemp: number;
  maxCorrectedTemp: number;
  meanCorrectedTemp: number;
  uniformitySpread: number; // max - min
  maxOvershoot: number;
  passed: boolean;
  minSensorLabel: string;
  maxSensorLabel: string;
  sensorFailureNote?: string;
  offsetCompliance?: {
    offsetApplied: number;
    maxAllowedOffset: number;
    isOffsetCompliant: boolean;
    ruleRef: string;
  };
  channelResults: Array<{
    channelId: string;
    channelNumber: number;
    label: string;
    rawReading: number;
    tcCorrection: number;
    correctedTemp: number;
    deltaFromTarget: number;
    inTolerance: boolean;
    failed?: boolean;
  }>;
}

/**
 * AMS 2750 Rev H Table 15 (p. 39) & Table 16 (p. 40):
 * Maximum Permitted Offset (for TUS modification offsets and SAT correction offsets separately)
 * Class 1: ±2.5°F / ±1.5°C
 * Class 2: ±5.0°F / ±3.0°C
 * Class 3: ±8.0°F / ±5.0°C or 0.38% of max qualified operating temp, whichever is greater
 * Class 4: ±10.0°F / ±6.0°C or 0.38% of max qualified operating temp, whichever is greater
 * Class 5: ±13.0°F / ±7.0°C or 0.38% of max qualified operating temp, whichever is greater
 * Class 6: 0.75% of max qualified operating temp
 */
export function getMaxAllowedOffset(
  furnaceClass: FurnaceClass,
  tempUnit: TempUnit,
  _furnaceApplication: 'Parts' | 'Raw Material' = 'Parts',
  targetTemp?: number
): number {
  const pct038 = targetTemp ? Math.round(Math.abs(targetTemp) * 0.0038 * 10) / 10 : 0;
  const pct075 = targetTemp ? Math.round(Math.abs(targetTemp) * 0.0075 * 10) / 10 : 0;

  if (tempUnit === '°F') {
    switch (furnaceClass) {
      case 1: return 2.5;
      case 2: return 5.0;
      case 3: return Math.max(8.0, pct038);
      case 4: return Math.max(10.0, pct038);
      case 5: return Math.max(13.0, pct038);
      case 6: return pct075 > 0 ? pct075 : 25.0;
    }
  } else {
    switch (furnaceClass) {
      case 1: return 1.5;
      case 2: return 3.0;
      case 3: return Math.max(5.0, pct038);
      case 4: return Math.max(6.0, pct038);
      case 5: return Math.max(7.0, pct038);
      case 6: return pct075 > 0 ? pct075 : 14.0;
    }
  }
}

/**
 * AMS 2750 Rev H § 3.5.13.1 & § 3.5.13.2 (p. 50):
 * - "TUS sensor or recording channel failure at the corner locations of a rectangle/square work zone
 *    or periphery (top/bottom or front/back) locations of a cylindrical work zone is not permitted."
 * - "The failure of one or more TUS sensors at corner locations, any two adjacent TUS sensors, or a
 *    number exceeding the requirements in Table 20 or Table 21 shall require corrective action to be
 *    taken and the TUS repeated."
 */
function findCornerFailures(
  failedChannels: ThermocoupleChannel[],
  qwz?: QualifiedWorkZone
): ThermocoupleChannel[] {
  return failedChannels.filter((ch) => {
    if (ch.label.toLowerCase().includes('corner')) return true;
    if (qwz && qwz.length > 0 && qwz.width > 0 && qwz.height > 0) {
      const tolL = Math.max(0.5, qwz.length * 0.05);
      const tolH = Math.max(0.5, qwz.height * 0.05);
      const tolW = Math.max(0.5, qwz.width * 0.05);
      const isXCorner =
        Math.abs(ch.x - qwz.offsetFront) <= tolL ||
        Math.abs(ch.x - (qwz.offsetFront + qwz.length)) <= tolL;
      const isYCorner =
        Math.abs(ch.y - qwz.offsetFloor) <= tolH ||
        Math.abs(ch.y - (qwz.offsetFloor + qwz.height)) <= tolH;
      const isZCorner =
        Math.abs(ch.z - qwz.offsetLeft) <= tolW ||
        Math.abs(ch.z - (qwz.offsetLeft + qwz.width)) <= tolW;
      return isXCorner && isYCorner && isZCorner;
    }
    const ux = ch.ux ?? -1;
    const uy = ch.uy ?? -1;
    const uz = ch.uz ?? -1;
    const isCornerCoord = (v: number) => Math.abs(v - 0) <= 0.05 || Math.abs(v - 1) <= 0.05;
    return isCornerCoord(ux) && isCornerCoord(uy) && isCornerCoord(uz);
  });
}

/**
 * Checks if any two failed TUS sensors are adjacent to each other in the 3D rigging grid
 * per AMS 2750 Rev H § 3.5.13.2 ("any two adjacent TUS sensors").
 */
function findAdjacentFailedSensors(
  failedChannels: ThermocoupleChannel[],
  allChannels: ThermocoupleChannel[],
  qwz?: QualifiedWorkZone
): Array<[ThermocoupleChannel, ThermocoupleChannel]> {
  if (failedChannels.length < 2) return [];
  const adjacentPairs: Array<[ThermocoupleChannel, ThermocoupleChannel]> = [];

  if (qwz && allChannels.length > 0) {
    const connections = getWireGridConnections(allChannels, qwz);
    const failedIds = new Set(failedChannels.map((c) => c.id));
    for (const [a, b] of connections) {
      if (failedIds.has(a.id) && failedIds.has(b.id)) {
        adjacentPairs.push([a, b]);
      }
    }
    if (adjacentPairs.length > 0) return adjacentPairs;
  }

  for (let i = 0; i < failedChannels.length; i++) {
    for (let j = i + 1; j < failedChannels.length; j++) {
      const a = failedChannels[i];
      const b = failedChannels[j];
      if (Math.abs(a.channelNumber - b.channelNumber) === 1) {
        adjacentPairs.push([a, b]);
      }
    }
  }
  return adjacentPairs;
}

/**
 * AMS 2750 Rev H Table 20 & Table 21 (p. 50):
 * Allowable number of TUS sensor failures based on total TUS sensors and survey temperature
 * - Table 20: TUS performed < 2000°F or < 1093°C
 *   3 to 9: 0 ("None")
 *   10 to 16: 1
 *   17 to 23: 2
 *   24 to 39: 3
 *   ≥ 40: No more than 10% (Math.floor(total * 0.10))
 * - Table 21: TUS performed ≥ 2000°F or ≥ 1093°C
 *   3 to 5: 0 ("None")
 *   6 to 9: 1
 *   10 to 16: 2
 *   17 to 23: 3
 *   24 to 39: 4
 *   ≥ 40: No more than 10% (Math.floor(total * 0.10))
 */
export function getAllowableSensorFailures(
  totalSensors: number,
  targetTemp: number,
  tempUnit: TempUnit
): { maxAllowedFailures: number; tableName: string } {
  const isHighTemp =
    (tempUnit === '°F' && targetTemp >= 2000) ||
    (tempUnit === '°C' && targetTemp >= 1093);

  if (!isHighTemp) {
    if (totalSensors <= 9) return { maxAllowedFailures: 0, tableName: 'Table 20 (< 2000°F / < 1093°C)' };
    if (totalSensors <= 16) return { maxAllowedFailures: 1, tableName: 'Table 20 (< 2000°F / < 1093°C)' };
    if (totalSensors <= 23) return { maxAllowedFailures: 2, tableName: 'Table 20 (< 2000°F / < 1093°C)' };
    if (totalSensors <= 39) return { maxAllowedFailures: 3, tableName: 'Table 20 (< 2000°F / < 1093°C)' };
    return {
      maxAllowedFailures: Math.floor(totalSensors * 0.1),
      tableName: 'Table 20 (< 2000°F / < 1093°C)',
    };
  } else {
    if (totalSensors <= 5) return { maxAllowedFailures: 0, tableName: 'Table 21 (≥ 2000°F / ≥ 1093°C)' };
    if (totalSensors <= 9) return { maxAllowedFailures: 1, tableName: 'Table 21 (≥ 2000°F / ≥ 1093°C)' };
    if (totalSensors <= 16) return { maxAllowedFailures: 2, tableName: 'Table 21 (≥ 2000°F / ≥ 1093°C)' };
    if (totalSensors <= 23) return { maxAllowedFailures: 3, tableName: 'Table 21 (≥ 2000°F / ≥ 1093°C)' };
    if (totalSensors <= 39) return { maxAllowedFailures: 4, tableName: 'Table 21 (≥ 2000°F / ≥ 1093°C)' };
    return {
      maxAllowedFailures: Math.floor(totalSensors * 0.1),
      tableName: 'Table 21 (≥ 2000°F / ≥ 1093°C)',
    };
  }
}

export function evaluateSetpoint(
  setpoint: SurveySetpoint,
  channels: ThermocoupleChannel[],
  furnaceClass: FurnaceClass,
  tempUnit: TempUnit,
  instrumentCorrection: number = 0.0,
  _minRequiredSensorsFromTable17: number = 9,
  qwz?: QualifiedWorkZone,
  furnaceApplication: 'Parts' | 'Raw Material' = 'Parts'
): SetpointAnalysisResult {
  const tol = CLASS_TOLERANCES[furnaceClass][tempUnit];
  const minAllowed = setpoint.targetTemp - tol;
  const maxAllowed = setpoint.targetTemp + tol;

  const maxAllowedOffset = getMaxAllowedOffset(
    furnaceClass,
    tempUnit,
    furnaceApplication,
    setpoint.targetTemp
  );
  const offsetApplied = Math.abs(setpoint.controlOffset ?? 0);
  const isOffsetCompliant = offsetApplied <= maxAllowedOffset;
  const tableRef = furnaceApplication === 'Raw Material' ? 'Table 16' : 'Table 15';
  const offsetCompliance = {
    offsetApplied: setpoint.controlOffset ?? 0,
    maxAllowedOffset,
    isOffsetCompliant,
    ruleRef: `AMS 2750 Rev H ${tableRef} & § 3.2.6.1.4 (Max ±${maxAllowedOffset}${tempUnit} for Class ${furnaceClass})`,
  };

  if (!channels || channels.length === 0) {
    return {
      setpointId: setpoint.id,
      targetTemp: setpoint.targetTemp,
      tolerance: tol,
      minAllowed,
      maxAllowed,
      minCorrectedTemp: setpoint.targetTemp,
      maxCorrectedTemp: setpoint.targetTemp,
      meanCorrectedTemp: setpoint.targetTemp,
      uniformitySpread: 0,
      maxOvershoot: setpoint.maxOvershootObserved,
      passed: false,
      minSensorLabel: 'N/A',
      maxSensorLabel: 'N/A',
      sensorFailureNote: 'No thermocouple channels configured.',
      offsetCompliance,
      channelResults: [],
    };
  }

  const failedChannels = channels.filter((ch) => ch.failed);
  const validChannels = channels.filter((ch) => !ch.failed);

  // AMS 2750 Rev H § 3.5.13 & Tables 20 and 21 (p. 50) Sensor Failure Evaluation:
  // 1. Failure of one or more TUS sensors at corner locations is NOT permitted (§ 3.5.13.1 & § 3.5.13.2)
  const cornerFailures = findCornerFailures(failedChannels, qwz);
  // 2. Failure of permanent control/recording sensor is NOT permitted (§ 3.5.13.1 & § 3.5.14.1.5)
  const failedControlSensors = failedChannels.filter((ch) => ch.isControlSensor);
  // 3. Failure of any two adjacent TUS sensors is NOT permitted (§ 3.5.13.2)
  const adjacentFailedPairs = findAdjacentFailedSensors(failedChannels, channels, qwz);
  // 4. Total number of failed TUS sensors shall not exceed Table 20 (< 2000°F / < 1093°C) or Table 21 (≥ 2000°F / ≥ 1093°C)
  const { maxAllowedFailures, tableName } = getAllowableSensorFailures(
    channels.length,
    setpoint.targetTemp,
    tempUnit
  );
  const exceedsFailureCount = failedChannels.length > maxAllowedFailures;

  let minCorrected = Infinity;
  let maxCorrected = -Infinity;
  let sumCorrected = 0;
  let minSensor = '';
  let maxSensor = '';

  const channelResults = channels.map((ch) => {
    const raw = setpoint.readings[ch.id] ?? setpoint.targetTemp;
    const tcCorr = ch.correctionFactors[setpoint.id] ?? 0;
    const corrected = Math.round((raw + tcCorr + instrumentCorrection) * 10) / 10;
    const delta = Math.round((corrected - setpoint.targetTemp) * 10) / 10;
    const inTolerance = ch.failed ? true : corrected >= minAllowed && corrected <= maxAllowed;

    if (!ch.failed) {
      if (corrected < minCorrected) {
        minCorrected = corrected;
        minSensor = ch.label;
      }
      if (corrected > maxCorrected) {
        maxCorrected = corrected;
        maxSensor = ch.label;
      }
      sumCorrected += corrected;
    }

    return {
      channelId: ch.id,
      channelNumber: ch.channelNumber,
      label: ch.label,
      rawReading: raw,
      tcCorrection: tcCorr,
      correctedTemp: corrected,
      deltaFromTarget: delta,
      inTolerance: ch.failed ? true : inTolerance,
      failed: ch.failed,
    };
  });

  const evaluationChannels = validChannels.length > 0 ? validChannels : channels;
  const meanCorrected =
    evaluationChannels.length > 0
      ? Math.round((sumCorrected / evaluationChannels.length) * 10) / 10
      : setpoint.targetTemp;
  const spread = Math.round((maxCorrected - minCorrected) * 10) / 10;
  // AMS 2750 Rev H § 3.5.10.6 & § 3.5.14.1.6: At no time shall any sensor reading exceed the upper TUS tolerance!
  const overshootPassed = setpoint.maxOvershootObserved <= setpoint.targetTemp + tol;

  const allValidPassed =
    validChannels.length > 0
      ? channelResults.filter((c) => !c.failed).every((c) => c.inTolerance)
      : channelResults.every((c) => c.inTolerance);

  let passed = allValidPassed && overshootPassed && isOffsetCompliant;
  let sensorFailureNote: string | undefined;

  if (failedChannels.length > 0) {
    const failureViolations: string[] = [];
    if (cornerFailures.length > 0) {
      failureViolations.push(
        `Corner TUS sensor failure is not permitted (${cornerFailures.map((c) => `TC ${c.channelNumber} - ${c.label}`).join(', ')}) — prohibited by § 3.5.13.1 & § 3.5.13.2`
      );
    }
    if (failedControlSensors.length > 0) {
      failureViolations.push(
        `Control/recording channel failure (${failedControlSensors.map((c) => `TC ${c.channelNumber}`).join(', ')}) — prohibited by § 3.5.13.1`
      );
    }
    if (adjacentFailedPairs.length > 0) {
      const pairStr = adjacentFailedPairs
        .map(([a, b]) => `TC ${a.channelNumber} & TC ${b.channelNumber}`)
        .join('; ');
      failureViolations.push(
        `Two adjacent TUS sensors failed (${pairStr}) — prohibited by § 3.5.13.2`
      );
    }
    if (exceedsFailureCount) {
      failureViolations.push(
        `${failedChannels.length} TUS sensor(s) failed, exceeding the maximum ${maxAllowedFailures} allowable failure(s) for ${channels.length} total TUS sensors per AMS 2750 Rev H ${tableName} & § 3.5.13.2`
      );
    }

    if (failureViolations.length === 0 && allValidPassed && overshootPassed && isOffsetCompliant) {
      passed = true;
      sensorFailureNote = `AMS 2750 Rev H § 3.5.13 & ${tableName} Sensor Failure Provision: ${failedChannels.length} non-corner TUS sensor(s) failed (${failedChannels.map((c) => `TC ${c.channelNumber} - ${c.label}`).join(', ')}), which is within the maximum ${maxAllowedFailures} allowable failure(s) for ${channels.length} total TUS sensors, with no corner or adjacent sensor failures. Survey is certified as PASS.`;
    } else if (failureViolations.length > 0) {
      passed = false;
      sensorFailureNote = `AMS 2750 Rev H § 3.5.13 / ${tableName} Sensor Failure Violation: ${failureViolations.join(' | ')}. Corrective action required and TUS must be repeated.`;
    } else {
      passed = false;
      sensorFailureNote = `AMS 2750 Rev H Evaluation Note: ${failedChannels.length} sensor(s) marked failed, and one or more active sensors or parameters (overshoot/offset) exceeded tolerance. Survey FAILED.`;
    }
  } else if (!isOffsetCompliant) {
    sensorFailureNote = `AMS 2750 Rev H ${tableRef} & § 3.2.6.1.4 Offset Violation: Applied modification offset (${setpoint.controlOffset}${tempUnit}) exceeds maximum permitted ±${maxAllowedOffset}${tempUnit} for Class ${furnaceClass}. Survey FAILED.`;
  }

  return {
    setpointId: setpoint.id,
    targetTemp: setpoint.targetTemp,
    tolerance: tol,
    minAllowed,
    maxAllowed,
    minCorrectedTemp: minCorrected === Infinity ? setpoint.targetTemp : minCorrected,
    maxCorrectedTemp: maxCorrected === -Infinity ? setpoint.targetTemp : maxCorrected,
    meanCorrectedTemp: meanCorrected,
    uniformitySpread: spread,
    maxOvershoot: setpoint.maxOvershootObserved,
    passed,
    minSensorLabel: minSensor || 'N/A',
    maxSensorLabel: maxSensor || 'N/A',
    sensorFailureNote,
    offsetCompliance,
    channelResults,
  };
}

