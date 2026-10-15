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
 * Calculates work zone volume in cubic metres (UK/European standard for AMS 2750 Rev H Table 11)
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
 * AMS 2750 Rev H Table 11: Minimum number of TUS sensors
 * Defined in metric (m³) and imperial (ft³)
 */
export function getMinRequiredSensors(
  volumeCuFt: number,
  volumeM3?: number
): {
  minSensors: number;
  ruleText: string;
  formulaBreakdown: string;
  volumeM3Val: number;
  volumeCuFtVal: number;
  baselineSensors: number;
  additionalSensors: number;
} {
  const volM3 = volumeM3 !== undefined ? volumeM3 : volumeCuFt * 0.0283168;
  const volCuFt = volumeCuFt !== undefined ? volumeCuFt : volM3 * 35.3147;

  if (volM3 < 6.4) {
    return {
      minSensors: 9,
      ruleText: `AMS 2750 Rev H Table 11: Work zone volume ${volM3.toFixed(2)} m³ (< 6.4 m³ / 225 ft³) requires a minimum of 9 sensors (8 corners + 1 center).`,
      formulaBreakdown: `Volume ${volM3.toFixed(2)} m³ (${volCuFt.toFixed(1)} ft³) is below 6.4 m³ (225 ft³), requiring the baseline 9 sensors (8 corners + 1 geometric center).`,
      volumeM3Val: volM3,
      volumeCuFtVal: volCuFt,
      baselineSensors: 9,
      additionalSensors: 0,
    };
  } else if (volM3 <= 85) {
    const excessM3 = volM3 - 6.4;
    const additional = Math.ceil(excessM3 / 2.83);
    const minSensors = Math.min(37, 9 + additional);
    return {
      minSensors,
      ruleText: `AMS 2750 Rev H Table 11: Volume ${volM3.toFixed(2)} m³ requires 9 + 1 per 2.83 m³ excess = ${minSensors} sensors.`,
      formulaBreakdown: `Baseline 9 sensors (for first 6.4 m³ / 225 ft³) + ${additional} additional sensors (1 per 2.83 m³ / 100 ft³ of excess volume: ${excessM3.toFixed(2)} m³) = ${minSensors} Sensors Minimum per AMS 2750 Rev H Table 11. (Note: Many aerospace heat treaters use 14 or 21 sensors for balanced face symmetry).`,
      volumeM3Val: volM3,
      volumeCuFtVal: volCuFt,
      baselineSensors: 9,
      additionalSensors: additional,
    };
  } else {
    const excessM3 = volM3 - 85;
    const additional = Math.ceil(excessM3 / 7.08);
    const minSensors = 37 + additional;
    return {
      minSensors,
      ruleText: `AMS 2750 Rev H Table 11: Volume ${volM3.toFixed(2)} m³ requires 37 + 1 per 7.08 m³ = ${minSensors} sensors.`,
      formulaBreakdown: `Baseline 37 sensors (for up to 85 m³ / 3000 ft³) + ${additional} additional sensors (1 per 7.08 m³ / 250 ft³ excess) = ${minSensors} Sensors Minimum.`,
      volumeM3Val: volM3,
      volumeCuFtVal: volCuFt,
      baselineSensors: 37,
      additionalSensors: additional,
    };
  }
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
  count: number = 21
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

  // Exact 21-point pattern from Picture 1 (AMS 2750 standard pyrometry schematic)
  const picture1_21 = [
    { num: 1, label: 'TC 1: Front Upper Left Corner', x: xMin, y: yMax, z: zMin },
    { num: 2, label: 'TC 2: Front Upper Right Corner', x: xMin, y: yMax, z: zMax },
    { num: 3, label: 'TC 3: Front Lower Right Corner', x: xMin, y: yMin, z: zMax },
    { num: 4, label: 'TC 4: Front Lower Left Corner', x: xMin, y: yMin, z: zMin },
    { num: 5, label: 'TC 5: Left Face Lower Mid', x: xMid, y: (yMin + yMid) / 2, z: zMin },
    { num: 6, label: 'TC 6: Left Face Upper Mid', x: xMid, y: (yMax + yMid) / 2, z: zMin },
    { num: 7, label: 'TC 7: Top Face Center Diagonal', x: (xMin + xMid) / 2, y: yMax, z: (zMin + zMax) / 2 },
    { num: 8, label: 'TC 8: Bottom Face Center Diagonal', x: (xMax + xMid) / 2, y: yMin, z: (zMin + zMax) / 2 },
    { num: 9, label: 'TC 9: Rear Left Lower Diagonal', x: (xMax + xMid) / 2, y: (yMin + yMid) / 2, z: zMin },
    { num: 10, label: 'TC 10: Front Left Mid Edge', x: xMin, y: yMid, z: zMin },
    { num: 11, label: 'TC 11: Geometric Center (Spider Hub)', x: xMid, y: yMid, z: zMid },
    { num: 12, label: 'TC 12: Right Face Mid Edge', x: (xMax + xMid) / 2, y: yMid, z: zMax },
    { num: 13, label: 'TC 13: Top Rear Diagonal Mid', x: xMid, y: yMax, z: (zMin + zMid) / 2 },
    { num: 14, label: 'TC 14: Right Rear Upper Diagonal', x: (xMin + xMid) / 2, y: (yMax + yMid) / 2, z: zMax },
    { num: 15, label: 'TC 15: Right Front Lower Diagonal', x: (xMin + xMid) / 2, y: (yMin + yMid) / 2, z: zMax },
    { num: 16, label: 'TC 16: Front Bottom Diagonal Mid', x: (xMin + xMid) / 2, y: yMin, z: zMid },
    { num: 17, label: 'TC 17: Rear Upper Left Corner', x: xMax, y: yMax, z: zMin },
    { num: 18, label: 'TC 18: Rear Upper Right Corner', x: xMax, y: yMax, z: zMax },
    { num: 19, label: 'TC 19: Rear Lower Right Corner', x: xMax, y: yMin, z: zMax },
    { num: 20, label: 'TC 20: Rear Lower Left Corner', x: xMax, y: yMin, z: zMin },
    { num: 21, label: 'TC 21: Right Face Upper Mid', x: xMid, y: yMid, z: zMax },
  ];

  // 13-point pattern (AMS 2750 Rev H Table 11 Minimum for 15 m³ / 530 ft³):
  // 8 corners + 1 center + 4 face centers (Top, Bottom, Left, Right)
  const pattern13 = [
    { num: 1, label: 'TC 1: Front Upper Left Corner', x: xMin, y: yMax, z: zMin },
    { num: 2, label: 'TC 2: Front Upper Right Corner', x: xMin, y: yMax, z: zMax },
    { num: 3, label: 'TC 3: Front Lower Right Corner', x: xMin, y: yMin, z: zMax },
    { num: 4, label: 'TC 4: Front Lower Left Corner', x: xMin, y: yMin, z: zMin },
    { num: 5, label: 'TC 5: Geometric Center', x: xMid, y: yMid, z: zMid },
    { num: 6, label: 'TC 6: Rear Upper Left Corner', x: xMax, y: yMax, z: zMin },
    { num: 7, label: 'TC 7: Rear Upper Right Corner', x: xMax, y: yMax, z: zMax },
    { num: 8, label: 'TC 8: Rear Lower Right Corner', x: xMax, y: yMin, z: zMax },
    { num: 9, label: 'TC 9: Rear Lower Left Corner', x: xMax, y: yMin, z: zMin },
    { num: 10, label: 'TC 10: Top Face Center', x: xMid, y: yMax, z: zMid },
    { num: 11, label: 'TC 11: Bottom Face Center', x: xMid, y: yMin, z: zMid },
    { num: 12, label: 'TC 12: Left Face Center', x: xMid, y: yMid, z: zMin },
    { num: 13, label: 'TC 13: Right Face Center', x: xMid, y: yMid, z: zMax },
  ];

  // Classic 9-Point Pattern (8 corners + 1 center)
  const default9 = [
    { num: 1, label: 'TC 1: Front Upper Left Corner', x: xMin, y: yMax, z: zMin },
    { num: 2, label: 'TC 2: Front Upper Right Corner', x: xMin, y: yMax, z: zMax },
    { num: 3, label: 'TC 3: Front Lower Left Corner', x: xMin, y: yMin, z: zMin },
    { num: 4, label: 'TC 4: Front Lower Right Corner', x: xMin, y: yMin, z: zMax },
    { num: 5, label: 'TC 5: Geometric Center', x: xMid, y: yMid, z: zMid },
    { num: 6, label: 'TC 6: Rear Upper Left Corner', x: xMax, y: yMax, z: zMin },
    { num: 7, label: 'TC 7: Rear Upper Right Corner', x: xMax, y: yMax, z: zMax },
    { num: 8, label: 'TC 8: Rear Lower Left Corner', x: xMax, y: yMin, z: zMin },
    { num: 9, label: 'TC 9: Rear Lower Right Corner', x: xMax, y: yMin, z: zMax },
  ];

  let rawList: Array<{ num: number; label: string; x: number; y: number; z: number }>;
  if (count === 21) {
    rawList = picture1_21;
  } else if (count === 13) {
    rawList = pattern13;
  } else if (count === 9) {
    rawList = default9;
  } else if (count === 14) {
    rawList = [
      ...pattern13,
      { num: 14, label: 'TC 14: Front Face Center', x: xMin, y: yMid, z: zMid },
    ];
  } else if (count < 21) {
    // Ensure all 8 corners and center are always included
    const base8CornersAndCenter = [
      { num: 1, label: 'TC 1: Front Upper Left Corner', x: xMin, y: yMax, z: zMin },
      { num: 2, label: 'TC 2: Front Upper Right Corner', x: xMin, y: yMax, z: zMax },
      { num: 3, label: 'TC 3: Front Lower Right Corner', x: xMin, y: yMin, z: zMax },
      { num: 4, label: 'TC 4: Front Lower Left Corner', x: xMin, y: yMin, z: zMin },
      { num: 5, label: 'TC 5: Geometric Center', x: xMid, y: yMid, z: zMid },
      { num: 6, label: 'TC 6: Rear Upper Left Corner', x: xMax, y: yMax, z: zMin },
      { num: 7, label: 'TC 7: Rear Upper Right Corner', x: xMax, y: yMax, z: zMax },
      { num: 8, label: 'TC 8: Rear Lower Right Corner', x: xMax, y: yMin, z: zMax },
      { num: 9, label: 'TC 9: Rear Lower Left Corner', x: xMax, y: yMin, z: zMin },
    ];
    const extraPointsPool = [
      { num: 10, label: 'TC 10: Top Face Center', x: xMid, y: yMax, z: zMid },
      { num: 11, label: 'TC 11: Bottom Face Center', x: xMid, y: yMin, z: zMid },
      { num: 12, label: 'TC 12: Left Face Center', x: xMid, y: yMid, z: zMin },
      { num: 13, label: 'TC 13: Right Face Center', x: xMid, y: yMid, z: zMax },
      { num: 14, label: 'TC 14: Front Face Center', x: xMin, y: yMid, z: zMid },
      { num: 15, label: 'TC 15: Rear Face Center', x: xMax, y: yMid, z: zMid },
      { num: 16, label: 'TC 16: Front Left Mid Edge', x: xMin, y: yMid, z: zMin },
      { num: 17, label: 'TC 17: Front Right Mid Edge', x: xMin, y: yMid, z: zMax },
      { num: 18, label: 'TC 18: Rear Left Mid Edge', x: xMax, y: yMid, z: zMin },
      { num: 19, label: 'TC 19: Rear Right Mid Edge', x: xMax, y: yMid, z: zMax },
      { num: 20, label: 'TC 20: Top Left Mid Edge', x: xMid, y: yMax, z: zMin },
    ];
    rawList = [...base8CornersAndCenter];
    for (let i = 0; i < count - 9; i++) {
      if (extraPointsPool[i]) rawList.push(extraPointsPool[i]);
    }
  } else {
    rawList = [...picture1_21];
    for (let i = 22; i <= count; i++) {
      rawList.push({
        num: i,
        label: `TC ${i}: Zone Position`,
        x: xMin + Math.random() * (xMax - xMin),
        y: yMin + Math.random() * (yMax - yMin),
        z: zMin + Math.random() * (zMax - zMin),
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
      rollLotNumber: `LOT-2026-N${100 + (channelNumber % 4)}`,
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
  category: '3d-diagonal' | 'perimeter-frame' | 'depth-rail' | 'face-brace';
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
 * 1. Opposite-Corner 3D Tension Diagonals (e.g. Bottom-Left-Front to Upper-Right-Rear through Center Hub)
 * 2. 12-Cable Perimeter Box Frame (Front rectangle, Rear rectangle, 4 Depth rails)
 * 3. Face Stabilizer Braces & Mid-Point Sensor Struts
 */
export function getLogicalWireRiggingSchedule(
  channels: ThermocoupleChannel[],
  dimUnit: DimUnit = 'mm'
): WireRiggingPlan {
  const map = new Map<number, ThermocoupleChannel>();
  channels.forEach((c) => map.set(c.channelNumber, c));

  const connections: Array<[ThermocoupleChannel, ThermocoupleChannel]> = [];
  const cables: WireRiggingCable[] = [];
  const oppositeCornerDiagonals: WireRiggingPlan['oppositeCornerDiagonals'] = [];

  let stepCounter = 1;

  const addCable = (
    numA: number,
    numB: number,
    category: WireRiggingCable['category'],
    title: string,
    description: string
  ) => {
    const a = map.get(numA);
    const b = map.get(numB);
    if (a && b) {
      connections.push([a, b]);
      cables.push({
        id: `cable-${numA}-${numB}`,
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
    }
  };

  // Determine key corners and center
  const is21Point = map.has(11) && map.has(1) && map.has(17);
  const centerNum = is21Point ? 11 : 5;
  const centerCh = map.get(centerNum) || channels.find((c) => c.label.toLowerCase().includes('center')) || channels[0];

  // 4 Front corners
  const fTL = 1; // Front Top Left
  const fTR = 2; // Front Top Right
  const fBR = 3; // Front Bottom Right
  const fBL = 4; // Front Bottom Left

  // 4 Rear corners
  const rTL = is21Point ? 17 : 6; // Rear Top Left
  const rTR = is21Point ? 18 : 7; // Rear Top Right
  const rBR = is21Point ? 19 : 8; // Rear Bottom Right
  const rBL = is21Point ? 20 : 9; // Rear Bottom Left

  // -----------------------------------------------------------
  // STEP 1: 4 MAIN 3D CROSS-BODY DIAGONALS (OPPOSITE CORNERS THROUGH CENTER HUB)
  // -----------------------------------------------------------
  // Diagonal 1: Front Bottom Left <-> Center Hub <-> Rear Upper Right
  const chFBL = map.get(fBL);
  const chRTR = map.get(rTR);
  if (chFBL && centerCh && chRTR) {
    const span = calcDistance3D(chFBL, chRTR);
    oppositeCornerDiagonals.push({
      id: 'diag-1',
      title: 'Diagonal 1: Bottom-Left-Front to Upper-Right-Rear',
      cornerA: chFBL,
      center: centerCh,
      cornerB: chRTR,
      totalSpanLength: span,
      description: `Continuous diagonal tension cable spanning from TC ${fBL} (Front Bottom Left) through Center Hub TC ${centerNum} to TC ${rTR} (Rear Top Right). Cut length: ${span} ${dimUnit}.`,
    });
    addCable(fBL, centerNum, '3d-diagonal', `Main Diagonal 1A (TC ${fBL} ➔ Center TC ${centerNum})`, `Tension span from Front Bottom Left to Center Spider Hub`);
    addCable(centerNum, rTR, '3d-diagonal', `Main Diagonal 1B (Center TC ${centerNum} ➔ TC ${rTR})`, `Tension span from Center Spider Hub to Rear Top Right`);
  }

  // Diagonal 2: Front Bottom Right <-> Center Hub <-> Rear Upper Left
  const chFBR = map.get(fBR);
  const chRTL = map.get(rTL);
  if (chFBR && centerCh && chRTL) {
    const span = calcDistance3D(chFBR, chRTL);
    oppositeCornerDiagonals.push({
      id: 'diag-2',
      title: 'Diagonal 2: Bottom-Right-Front to Upper-Left-Rear',
      cornerA: chFBR,
      center: centerCh,
      cornerB: chRTL,
      totalSpanLength: span,
      description: `Continuous diagonal tension cable spanning from TC ${fBR} (Front Bottom Right) through Center Hub TC ${centerNum} to TC ${rTL} (Rear Top Left). Cut length: ${span} ${dimUnit}.`,
    });
    addCable(fBR, centerNum, '3d-diagonal', `Main Diagonal 2A (TC ${fBR} ➔ Center TC ${centerNum})`, `Tension span from Front Bottom Right to Center Spider Hub`);
    addCable(centerNum, rTL, '3d-diagonal', `Main Diagonal 2B (Center TC ${centerNum} ➔ TC ${rTL})`, `Tension span from Center Spider Hub to Rear Top Left`);
  }

  // Diagonal 3: Front Upper Left <-> Center Hub <-> Rear Bottom Right
  const chFTL = map.get(fTL);
  const chRBR = map.get(rBR);
  if (chFTL && centerCh && chRBR) {
    const span = calcDistance3D(chFTL, chRBR);
    oppositeCornerDiagonals.push({
      id: 'diag-3',
      title: 'Diagonal 3: Upper-Left-Front to Lower-Right-Rear',
      cornerA: chFTL,
      center: centerCh,
      cornerB: chRBR,
      totalSpanLength: span,
      description: `Continuous diagonal tension cable spanning from TC ${fTL} (Front Top Left) through Center Hub TC ${centerNum} to TC ${rBR} (Rear Bottom Right). Cut length: ${span} ${dimUnit}.`,
    });
    addCable(fTL, centerNum, '3d-diagonal', `Main Diagonal 3A (TC ${fTL} ➔ Center TC ${centerNum})`, `Tension span from Front Top Left to Center Spider Hub`);
    addCable(centerNum, rBR, '3d-diagonal', `Main Diagonal 3B (Center TC ${centerNum} ➔ TC ${rBR})`, `Tension span from Center Spider Hub to Rear Bottom Right`);
  }

  // Diagonal 4: Front Upper Right <-> Center Hub <-> Rear Bottom Left
  const chFTR = map.get(fTR);
  const chRBL = map.get(rBL);
  if (chFTR && centerCh && chRBL) {
    const span = calcDistance3D(chFTR, chRBL);
    oppositeCornerDiagonals.push({
      id: 'diag-4',
      title: 'Diagonal 4: Upper-Right-Front to Lower-Left-Rear',
      cornerA: chFTR,
      center: centerCh,
      cornerB: chRBL,
      totalSpanLength: span,
      description: `Continuous diagonal tension cable spanning from TC ${fTR} (Front Top Right) through Center Hub TC ${centerNum} to TC ${rBL} (Rear Bottom Left). Cut length: ${span} ${dimUnit}.`,
    });
    addCable(fTR, centerNum, '3d-diagonal', `Main Diagonal 4A (TC ${fTR} ➔ Center TC ${centerNum})`, `Tension span from Front Top Right to Center Spider Hub`);
    addCable(centerNum, rBL, '3d-diagonal', `Main Diagonal 4B (Center TC ${centerNum} ➔ TC ${rBL})`, `Tension span from Center Spider Hub to Rear Bottom Left`);
  }

  // -----------------------------------------------------------
  // STEP 2: 12-CABLE PERIMETER BOUNDARY BOX (FRAME OUTLINE)
  // -----------------------------------------------------------
  // Front Perimeter Rectangle (4 edges)
  addCable(fTL, fTR, 'perimeter-frame', `Front Top Rail (TC ${fTL} ➔ TC ${fTR})`, 'Upper horizontal boundary wire across front door opening');
  addCable(fTR, fBR, 'perimeter-frame', `Front Right Post (TC ${fTR} ➔ TC ${fBR})`, 'Right vertical boundary wire on front face');
  addCable(fBR, fBL, 'perimeter-frame', `Front Bottom Rail (TC ${fBR} ➔ TC ${fBL})`, 'Lower horizontal boundary wire across front hearth floor');
  addCable(fBL, fTL, 'perimeter-frame', `Front Left Post (TC ${fBL} ➔ TC ${fTL})`, 'Left vertical boundary wire on front face');

  // Rear Perimeter Rectangle (4 edges)
  addCable(rTL, rTR, 'perimeter-frame', `Rear Top Rail (TC ${rTL} ➔ TC ${rTR})`, 'Upper horizontal boundary wire across rear wall');
  addCable(rTR, rBR, 'perimeter-frame', `Rear Right Post (TC ${rTR} ➔ TC ${rBR})`, 'Right vertical boundary wire on rear face');
  addCable(rBR, rBL, 'perimeter-frame', `Rear Bottom Rail (TC ${rBR} ➔ TC ${rBL})`, 'Lower horizontal boundary wire across rear floor');
  addCable(rBL, rTL, 'perimeter-frame', `Rear Left Post (TC ${rBL} ➔ TC ${rTL})`, 'Left vertical boundary wire on rear face');

  // 4 Longitudinal Depth Rails (Front Corners directly to Rear Corners)
  addCable(fTL, rTL, 'depth-rail', `Top Left Depth Rail (TC ${fTL} ➔ TC ${rTL})`, 'Longitudinal depth wire connecting upper-left corners');
  addCable(fTR, rTR, 'depth-rail', `Top Right Depth Rail (TC ${fTR} ➔ TC ${rTR})`, 'Longitudinal depth wire connecting upper-right corners');
  addCable(fBR, rBR, 'depth-rail', `Bottom Right Depth Rail (TC ${fBR} ➔ TC ${rBR})`, 'Longitudinal depth wire connecting lower-right corners');
  addCable(fBL, rBL, 'depth-rail', `Bottom Left Depth Rail (TC ${fBL} ➔ TC ${rBL})`, 'Longitudinal depth wire connecting lower-left corners');

  // -----------------------------------------------------------
  // STEP 3: FACE STABILIZER BRACES & SENSOR ATTACHMENT STRUTS
  // -----------------------------------------------------------
  if (is21Point) {
    // Front face intermediate points
    addCable(fTL, 10, 'face-brace', 'Front Left Upper Mid Brace (TC 1 ➔ TC 10)', 'Diagonal strut supporting Front Left Mid sensor');
    addCable(10, fBL, 'face-brace', 'Front Left Lower Mid Brace (TC 10 ➔ TC 4)', 'Diagonal strut supporting Front Left Mid sensor');
    addCable(fBL, 16, 'face-brace', 'Front Bottom Left Brace (TC 4 ➔ TC 16)', 'Bottom truss supporting Front Floor Mid sensor');
    addCable(16, fBR, 'face-brace', 'Front Bottom Right Brace (TC 16 ➔ TC 3)', 'Bottom truss supporting Front Floor Mid sensor');

    // Rear face intermediate points
    addCable(rTL, 9, 'face-brace', 'Rear Left Upper Mid Brace (TC 17 ➔ TC 9)', 'Rear vertical truss supporting Rear Left sensor');
    addCable(9, rBL, 'face-brace', 'Rear Left Lower Mid Brace (TC 9 ➔ TC 20)', 'Rear vertical truss supporting Rear Left sensor');

    // Side & Top intermediate points
    addCable(fTR, 14, 'face-brace', 'Right Wall Upper Front Brace (TC 2 ➔ TC 14)', 'Right side wall diagonal truss');
    addCable(14, rTR, 'face-brace', 'Right Wall Upper Rear Brace (TC 14 ➔ TC 18)', 'Right side wall diagonal truss');
    addCable(fBR, 15, 'face-brace', 'Right Wall Lower Front Brace (TC 3 ➔ TC 15)', 'Right side wall lower truss');
    addCable(15, rBR, 'face-brace', 'Right Wall Lower Rear Brace (TC 15 ➔ TC 19)', 'Right side wall lower truss');

    addCable(fTL, 13, 'face-brace', 'Top Roof Front Mid Brace (TC 1 ➔ TC 13)', 'Ceiling longitudinal stabilizer truss');
    addCable(13, rTL, 'face-brace', 'Top Roof Rear Mid Brace (TC 13 ➔ TC 17)', 'Ceiling longitudinal stabilizer truss');

    // Remaining intermediate points connected to center hub
    [5, 6, 7, 8, 12, 21].forEach((ptNum) => {
      addCable(centerNum, ptNum, 'face-brace', `Radial Sensor Lead (Center TC ${centerNum} ➔ TC ${ptNum})`, `Tensioned drop wire supporting TC ${ptNum}`);
    });
  } else {
    // 13 / 14 / Universal pattern
    // Connect face centers (Top 10, Bottom 11, Left 12, Right 13, Front 14) to center hub and boundary rails
    if (map.has(10)) {
      addCable(centerNum, 10, 'face-brace', `Top Face Center Drop (Center TC ${centerNum} ➔ TC 10)`, 'Vertical riser to Top Face Center sensor');
      addCable(10, fTL, 'face-brace', 'Top Face Diagonal A (TC 10 ➔ Front Top Left)', 'Stabilizer tie to front top left');
      addCable(10, rTR, 'face-brace', 'Top Face Diagonal B (TC 10 ➔ Rear Top Right)', 'Stabilizer tie to rear top right');
    }
    if (map.has(11)) {
      addCable(centerNum, 11, 'face-brace', `Bottom Face Center Drop (Center TC ${centerNum} ➔ TC 11)`, 'Vertical dropper to Hearth Floor Center sensor');
      addCable(11, fBL, 'face-brace', 'Bottom Face Diagonal A (TC 11 ➔ Front Bottom Left)', 'Stabilizer tie to front bottom left');
      addCable(11, rBR, 'face-brace', 'Bottom Face Diagonal B (TC 11 ➔ Rear Bottom Right)', 'Stabilizer tie to rear bottom right');
    }
    if (map.has(12)) {
      addCable(centerNum, 12, 'face-brace', `Left Face Center Lead (Center TC ${centerNum} ➔ TC 12)`, 'Horizontal strut to Left Face Center sensor');
      addCable(12, fTL, 'face-brace', 'Left Face Diagonal A (TC 12 ➔ Front Top Left)', 'Stabilizer tie to front top left');
      addCable(12, rBL, 'face-brace', 'Left Face Diagonal B (TC 12 ➔ Rear Bottom Left)', 'Stabilizer tie to rear bottom left');
    }
    if (map.has(13)) {
      addCable(centerNum, 13, 'face-brace', `Right Face Center Lead (Center TC ${centerNum} ➔ TC 13)`, 'Horizontal strut to Right Face Center sensor');
      addCable(13, fTR, 'face-brace', 'Right Face Diagonal A (TC 13 ➔ Front Top Right)', 'Stabilizer tie to front top right');
      addCable(13, rBR, 'face-brace', 'Right Face Diagonal B (TC 13 ➔ Rear Bottom Right)', 'Stabilizer tie to rear bottom right');
    }
    if (map.has(14)) {
      addCable(centerNum, 14, 'face-brace', `Front Face Center Lead (Center TC ${centerNum} ➔ TC 14)`, 'Longitudinal strut to Front Face Center sensor');
    }
  }

  return {
    cables,
    connections,
    oppositeCornerDiagonals,
  };
}

/**
 * Returns array of [ThermocoupleChannel, ThermocoupleChannel] wire links for rendering
 */
export function getWireGridConnections(channels: ThermocoupleChannel[]): Array<[ThermocoupleChannel, ThermocoupleChannel]> {
  const plan = getLogicalWireRiggingSchedule(channels);
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
  channelResults: Array<{
    channelId: string;
    channelNumber: number;
    label: string;
    rawReading: number;
    tcCorrection: number;
    correctedTemp: number;
    deltaFromTarget: number;
    inTolerance: boolean;
  }>;
}

export function evaluateSetpoint(
  setpoint: SurveySetpoint,
  channels: ThermocoupleChannel[],
  furnaceClass: FurnaceClass,
  tempUnit: TempUnit,
  instrumentError: number = 0.0
): SetpointAnalysisResult {
  const tol = CLASS_TOLERANCES[furnaceClass][tempUnit];
  const minAllowed = setpoint.targetTemp - tol;
  const maxAllowed = setpoint.targetTemp + tol;

  let minCorrected = Infinity;
  let maxCorrected = -Infinity;
  let sumCorrected = 0;
  let minSensor = '';
  let maxSensor = '';

  const channelResults = channels.map((ch) => {
    const raw = setpoint.readings[ch.id] ?? setpoint.targetTemp;
    const tcCorr = ch.correctionFactors[setpoint.id] ?? 0;
    // AMS 2750 Rev H arithmetic: Corrected = Raw + TC Correction + Instrument Correction
    const corrected = Math.round((raw + tcCorr + instrumentError) * 10) / 10;
    const delta = Math.round((corrected - setpoint.targetTemp) * 10) / 10;
    const inTolerance = corrected >= minAllowed && corrected <= maxAllowed;

    if (corrected < minCorrected) {
      minCorrected = corrected;
      minSensor = ch.label;
    }
    if (corrected > maxCorrected) {
      maxCorrected = corrected;
      maxSensor = ch.label;
    }
    sumCorrected += corrected;

    return {
      channelId: ch.id,
      channelNumber: ch.channelNumber,
      label: ch.label,
      rawReading: raw,
      tcCorrection: tcCorr,
      correctedTemp: corrected,
      deltaFromTarget: delta,
      inTolerance,
    };
  });

  const meanCorrected = channels.length > 0 ? Math.round((sumCorrected / channels.length) * 10) / 10 : setpoint.targetTemp;
  const spread = Math.round((maxCorrected - minCorrected) * 10) / 10;
  const overshootPassed = setpoint.maxOvershootObserved <= setpoint.targetTemp + tol;
  const allChannelsPassed = channelResults.every((c) => c.inTolerance);

  const passed = allChannelsPassed && overshootPassed;

  return {
    setpointId: setpoint.id,
    targetTemp: setpoint.targetTemp,
    tolerance: tol,
    minAllowed,
    maxAllowed,
    minCorrectedTemp: minCorrected,
    maxCorrectedTemp: maxCorrected,
    meanCorrectedTemp: meanCorrected,
    uniformitySpread: spread,
    maxOvershoot: setpoint.maxOvershootObserved,
    passed,
    minSensorLabel: minSensor,
    maxSensorLabel: maxSensor,
    channelResults,
  };
}
