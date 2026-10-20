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
 * AMS 2750 Rev H Table 17: Minimum Number of TUS Sensors (Volumetric Method)
 * Defined in metric (m³) and imperial (ft³):
 * - Less than 225 ft³ (6.4 m³): 9 sensors (8 corners + 1 center)
 * - 225 to 3,000 ft³ (6.4 to 85 m³): 9 + 1 for each additional 100 ft³ (2.83 m³) or fraction thereof
 * - Greater than 3,000 ft³ (85 m³): 37 + 1 for each additional 250 ft³ (7.08 m³) or fraction thereof
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
      ruleText: `AMS 2750 Rev H Table 17: Work zone volume ${volM3.toFixed(2)} m³ (< 6.4 m³ / 225 ft³) requires a minimum of 9 sensors (8 corners + 1 geometric center).`,
      formulaBreakdown: `Volume ${volM3.toFixed(2)} m³ (${volCuFt.toFixed(1)} ft³) is below 6.4 m³ (225 ft³), requiring the baseline 9 sensors (8 corners + 1 geometric center) per AMS 2750 Rev H Table 17 & § 3.5.10.3.1.`,
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
      ruleText: `AMS 2750 Rev H Table 17: Volume ${volM3.toFixed(2)} m³ requires 9 + 1 per 2.83 m³ (100 ft³) excess = ${minSensors} sensors.`,
      formulaBreakdown: `Baseline 9 sensors (for first 6.4 m³ / 225 ft³) + ${additional} additional sensors (1 per 2.83 m³ / 100 ft³ or fraction thereof of excess volume: ${excessM3.toFixed(2)} m³) = ${minSensors} Sensors Minimum per AMS 2750 Rev H Table 17.`,
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
      ruleText: `AMS 2750 Rev H Table 17: Volume ${volM3.toFixed(2)} m³ requires 37 + 1 per 7.08 m³ (250 ft³) excess = ${minSensors} sensors.`,
      formulaBreakdown: `Baseline 37 sensors (for up to 85 m³ / 3000 ft³) + ${additional} additional sensors (1 per 7.08 m³ / 250 ft³ or fraction thereof excess) = ${minSensors} Sensors Minimum per AMS 2750 Rev H Table 17.`,
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

  // Handle specific high-density symmetrical layouts
  if (count === 36) {
    const points: Array<{ label: string; x: number; y: number; z: number }> = [];
    const xPositions = [xMin, xMin + qwz.length / 3, xMin + (qwz.length * 2) / 3, xMax];
    const yPositions = [yMin, yMid, yMax];
    const zPositions = [zMin, zMid, zMax];

    let tcNum = 1;
    xPositions.forEach((x, xi) => {
      yPositions.forEach((y, yi) => {
        zPositions.forEach((z, zi) => {
          const xLabel = xi === 0 ? 'Front' : xi === 3 ? 'Rear' : `Plane ${xi + 1}`;
          const yLabel = yi === 0 ? 'Bottom' : yi === 1 ? 'Mid' : 'Top';
          const zLabel = zi === 0 ? 'Left' : zi === 1 ? 'Center' : 'Right';
          points.push({
            label: `${xLabel} ${yLabel} ${zLabel}`,
            x, y, z
          });
        });
      });
    });
    // This generates exactly 4 * 3 * 3 = 36 points
    return points.map((p, idx) => {
      const channelNumber = idx + 1;
      const dist = computeSensorDistances(p.x, p.y, p.z, chamber);
      const qL = Math.max(1, qwz.length);
      const qH = Math.max(1, qwz.height);
      const qW = Math.max(1, qwz.width);
      const ux = Math.max(0, Math.min(1, (p.x - qwz.offsetFront) / qL));
      const uy = Math.max(0, Math.min(1, (p.y - qwz.offsetFloor) / qH));
      const uz = Math.max(0, Math.min(1, (p.z - qwz.offsetLeft) / qW));

      const today = new Date().toISOString().split('T')[0];
      const expiry = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0];

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
        ux, uy, uz,
        correctionFactors: {}
      };
    });
  }

  const pool: Array<{ label: string; x: number; y: number; z: number }> = [
    // 1. Center Hub (Critical Anchor)
    { label: 'Geometric Center (Spider Hub)', x: xMid, y: yMid, z: zMid },

    // 2. 8 Corners (Standard Envelope)
    { label: 'Front Upper Left Corner', x: xMin, y: yMax, z: zMin },
    { label: 'Front Upper Right Corner', x: xMin, y: yMax, z: zMax },
    { label: 'Front Lower Left Corner', x: xMin, y: yMin, z: zMin },
    { label: 'Front Lower Right Corner', x: xMin, y: yMin, z: zMax },
    { label: 'Rear Upper Left Corner', x: xMax, y: yMax, z: zMin },
    { label: 'Rear Upper Right Corner', x: xMax, y: yMax, z: zMax },
    { label: 'Rear Lower Left Corner', x: xMax, y: yMin, z: zMin },
    { label: 'Rear Lower Right Corner', x: xMax, y: yMin, z: zMax },

    // 3. 6 Face Centers (Standard for 13/14/15 point TUS)
    { label: 'Top Face Center', x: xMid, y: yMax, z: zMid },
    { label: 'Bottom Face Center', x: xMid, y: yMin, z: zMid },
    { label: 'Left Face Center', x: xMid, y: yMid, z: zMin },
    { label: 'Right Face Center', x: xMid, y: yMid, z: zMax },
    { label: 'Front Face Center', x: xMin, y: yMid, z: zMid },
    { label: 'Rear Face Center', x: xMax, y: yMid, z: zMid },

    // 4. 12 Edge Centers (Refinement for High-Density 27 point TUS)
    { label: 'Front Top Edge Mid', x: xMin, y: yMax, z: zMid },
    { label: 'Front Bottom Edge Mid', x: xMin, y: yMin, z: zMid },
    { label: 'Front Left Edge Mid', x: xMin, y: yMid, z: zMin },
    { label: 'Front Right Edge Mid', x: xMin, y: yMid, z: zMax },
    { label: 'Rear Top Edge Mid', x: xMax, y: yMax, z: zMid },
    { label: 'Rear Bottom Edge Mid', x: xMax, y: yMin, z: zMid },
    { label: 'Rear Left Edge Mid', x: xMax, y: yMid, z: zMin },
    { label: 'Rear Right Edge Mid', x: xMax, y: yMid, z: zMax },
    { label: 'Top Left Edge Mid', x: xMid, y: yMax, z: zMin },
    { label: 'Top Right Edge Mid', x: xMid, y: yMax, z: zMax },
    { label: 'Bottom Left Edge Mid', x: xMid, y: yMin, z: zMin },
    { label: 'Bottom Right Edge Mid', x: xMid, y: yMin, z: zMax },

    // 5. 24 Edge Quarters (Symmetrical quads for balanced high-density layouts)
    // Quad A: Front Face Horizontals
    { label: 'Front Top Edge 1/4', x: xMin, y: yMax, z: zMin + qwz.width * 0.25 },
    { label: 'Front Top Edge 3/4', x: xMin, y: yMax, z: zMin + qwz.width * 0.75 },
    { label: 'Front Bottom Edge 1/4', x: xMin, y: yMin, z: zMin + qwz.width * 0.25 },
    { label: 'Front Bottom Edge 3/4', x: xMin, y: yMin, z: zMin + qwz.width * 0.75 },

    // Quad B: Rear Face Horizontals
    { label: 'Rear Top Edge 1/4', x: xMax, y: yMax, z: zMin + qwz.width * 0.25 },
    { label: 'Rear Top Edge 3/4', x: xMax, y: yMax, z: zMin + qwz.width * 0.75 },
    { label: 'Rear Bottom Edge 1/4', x: xMax, y: yMin, z: zMin + qwz.width * 0.25 },
    { label: 'Rear Bottom Edge 3/4', x: xMax, y: yMin, z: zMin + qwz.width * 0.75 },

    // Quad C: Top Face Lengths
    { label: 'Top Left Edge 1/4', x: xMin + qwz.length * 0.25, y: yMax, z: zMin },
    { label: 'Top Left Edge 3/4', x: xMin + qwz.length * 0.75, y: yMax, z: zMin },
    { label: 'Top Right Edge 1/4', x: xMin + qwz.length * 0.25, y: yMax, z: zMax },
    { label: 'Top Right Edge 3/4', x: xMin + qwz.length * 0.75, y: yMax, z: zMax },

    // Quad D: Bottom Face Lengths
    { label: 'Bottom Left Edge 1/4', x: xMin + qwz.length * 0.25, y: yMin, z: zMin },
    { label: 'Bottom Left Edge 3/4', x: xMin + qwz.length * 0.75, y: yMin, z: zMin },
    { label: 'Bottom Right Edge 1/4', x: xMin + qwz.length * 0.25, y: yMin, z: zMax },
    { label: 'Bottom Right Edge 3/4', x: xMin + qwz.length * 0.75, y: yMin, z: zMax },

    // Quad E: Front/Rear Vertical Posts
    { label: 'Front Left Edge 1/4', x: xMin, y: yMin + qwz.height * 0.25, z: zMin },
    { label: 'Front Left Edge 3/4', x: xMin, y: yMin + qwz.height * 0.75, z: zMin },
    { label: 'Front Right Edge 1/4', x: xMin, y: yMin + qwz.height * 0.25, z: zMax },
    { label: 'Front Right Edge 3/4', x: xMin, y: yMin + qwz.height * 0.75, z: zMax },

    // Quad F: Rear Vertical Posts
    { label: 'Rear Left Edge 1/4', x: xMax, y: yMin + qwz.height * 0.25, z: zMin },
    { label: 'Rear Left Edge 3/4', x: xMax, y: yMin + qwz.height * 0.75, z: zMin },
    { label: 'Rear Right Edge 1/4', x: xMax, y: yMin + qwz.height * 0.25, z: zMax },
    { label: 'Rear Right Edge 3/4', x: xMax, y: yMin + qwz.height * 0.75, z: zMax },
  ];

  // Select points from pool based on count
  const rawList = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    rawList.push({ num: i + 1, ...pool[i] });
  }

  // If user requested more than pool, subdivide internal volume or add random-ish but zone-compliant points
  if (count > pool.length) {
    for (let i = pool.length + 1; i <= count; i++) {
      rawList.push({
        num: i,
        label: `TC ${i}: Internal Grid Point`,
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

  const map = new Map<number, ThermocoupleChannel>();
  channels.forEach((c) => map.set(c.channelNumber, c));

  const connections: Array<[ThermocoupleChannel, ThermocoupleChannel]> = [];
  const cables: WireRiggingCable[] = [];
  const oppositeCornerDiagonals: WireRiggingPlan['oppositeCornerDiagonals'] = [];

  let stepCounter = 1;

  const seenConnections = new Set<string>();

  const addCable = (
    numA: number,
    numB: number,
    category: WireRiggingCable['category'],
    title: string,
    description: string
  ) => {
    if (numA === numB || numA === 0 || numB === 0) return;
    
    // Normalize connection key so order doesn't matter (1-2 is same as 2-1)
    const [min, max] = [Math.min(numA, numB), Math.max(numA, numB)];
    const connectionKey = `${min}-${max}`;
    
    if (seenConnections.has(connectionKey)) return;
    seenConnections.add(connectionKey);

    const a = map.get(numA);
    const b = map.get(numB);
    if (a && b) {
      connections.push([a, b]);
      cables.push({
        id: `cable-${min}-${max}`,
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
    channels.find(c => c.label.toLowerCase().includes('center') || c.label.toLowerCase().includes('hub')) ||
    findClosest(xMid, yMid, zMid);
  
  // Proximity check: is this sensor actually near the center?
  const centerDist = Math.hypot(closestToCenter.x - xMid, closestToCenter.y - yMid, closestToCenter.z - zMid);
  const minDim = Math.min(qwz.length, qwz.width, qwz.height);
  const hubSensor = centerDist < minDim * 0.2 ? closestToCenter : null;
  const centerNum = hubSensor?.channelNumber ?? 0;

  const structuralIds = new Set<number>();
  if (hubSensor) structuralIds.add(hubSensor.channelNumber);
  Object.values(corners).forEach(c => structuralIds.add(c.channelNumber));

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
      // Split diagonal through the hub so they explicitly "meet" there
      addCable(a.channelNumber, centerNum, '3d-diagonal', `${title} (Part A)`, 'Radial spider leg to Hub');
      addCable(centerNum, b.channelNumber, '3d-diagonal', `${title} (Part B)`, 'Radial spider leg to Hub');
      
      const span = calcDistance3D(a, b);
      oppositeCornerDiagonals.push({
        id: `diag-${idx + 1}`,
        title,
        cornerA: a,
        center: hubSensor,
        cornerB: b,
        totalSpanLength: span,
        description: `Opposite-corner diagonal intersecting at Center Hub (TC ${centerNum}).`,
      });
    } else {
      // Direct diagonal if no hub sensor exists or if corner is the hub
      addCable(a.channelNumber, b.channelNumber, '3d-diagonal', title, 'Direct opposite-corner tension cable');
    }
  });

  // -----------------------------------------------------------
  // STEP 2: 12-CABLE PERIMETER BOX FRAME (QWZ BOUNDARIES)
  // -----------------------------------------------------------
  const { fBL, fBR, fTL, fTR, rBL, rBR, rTL, rTR } = corners;
  
  // Front Face
  addCable(fTL.channelNumber, fTR.channelNumber, 'perimeter-frame', 'Front Top Rail', 'Structural frame');
  addCable(fTR.channelNumber, fBR.channelNumber, 'perimeter-frame', 'Front Right Post', 'Structural frame');
  addCable(fBR.channelNumber, fBL.channelNumber, 'perimeter-frame', 'Front Bottom Rail', 'Structural frame');
  addCable(fBL.channelNumber, fTL.channelNumber, 'perimeter-frame', 'Front Left Post', 'Structural frame');

  // Rear Face
  addCable(rTL.channelNumber, rTR.channelNumber, 'perimeter-frame', 'Rear Top Rail', 'Structural frame');
  addCable(rTR.channelNumber, rBR.channelNumber, 'perimeter-frame', 'Rear Right Post', 'Structural frame');
  addCable(rBR.channelNumber, rBL.channelNumber, 'perimeter-frame', 'Rear Bottom Rail', 'Structural frame');
  addCable(rBL.channelNumber, rTL.channelNumber, 'perimeter-frame', 'Rear Left Post', 'Structural frame');

  // Depth Rails
  addCable(fTL.channelNumber, rTL.channelNumber, 'depth-rail', 'Top Left Depth Rail', 'Structural frame');
  addCable(fTR.channelNumber, rTR.channelNumber, 'depth-rail', 'Top Right Depth Rail', 'Structural frame');
  addCable(fBR.channelNumber, rBR.channelNumber, 'depth-rail', 'Bottom Right Depth Rail', 'Structural frame');
  addCable(fBL.channelNumber, rBL.channelNumber, 'depth-rail', 'Bottom Left Depth Rail', 'Structural frame');

  // -----------------------------------------------------------
  // STEP 3: FACE CROSS-HAIRS & MID-PLANE GRIDS
  // -----------------------------------------------------------
  // Identify face midpoints and edge midpoints
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
    tF: findClosest(xMin, yMax, zMid), // Same as fT
    tBa: findClosest(xMax, yMax, zMid), // Same as rT
    bL: findClosest(xMid, yMin, zMin),
    bR: findClosest(xMid, yMin, zMax),
    bF: findClosest(xMin, yMin, zMid), // Same as fB
    bBa: findClosest(xMax, yMin, zMid), // Same as rB
  };

  const faceCenters = {
    front: findClosest(xMin, yMid, zMid),
    rear: findClosest(xMax, yMid, zMid),
    top: findClosest(xMid, yMax, zMid),
    bottom: findClosest(xMid, yMin, zMid),
    left: findClosest(xMid, yMid, zMin),
    right: findClosest(xMid, yMid, zMax),
  };

  // Add face crosses (Edge-to-Edge through Face Center if exists)
  const addFaceCross = (numA: number, numB: number, numCenter: number, title: string) => {
    if (numCenter && numCenter !== numA && numCenter !== numB) {
      addCable(numA, numCenter, 'face-cross', `${title} (Part A)`, 'Face stability grid');
      addCable(numCenter, numB, 'face-cross', `${title} (Part B)`, 'Face stability grid');
    } else {
      addCable(numA, numB, 'face-cross', title, 'Face stability grid');
    }
  };

  // Front Face Cross
  addFaceCross(mids.fT.channelNumber, mids.fB.channelNumber, faceCenters.front.channelNumber, 'Front Vertical Cross');
  addFaceCross(mids.fL.channelNumber, mids.fR.channelNumber, faceCenters.front.channelNumber, 'Front Horizontal Cross');
  
  // Rear Face Cross
  addFaceCross(mids.rT.channelNumber, mids.rB.channelNumber, faceCenters.rear.channelNumber, 'Rear Vertical Cross');
  addFaceCross(mids.rL.channelNumber, mids.rR.channelNumber, faceCenters.rear.channelNumber, 'Rear Horizontal Cross');

  // Top Face Cross
  addFaceCross(mids.tL.channelNumber, mids.tR.channelNumber, faceCenters.top.channelNumber, 'Top Transverse Cross');
  
  // Bottom Face Cross
  addFaceCross(mids.bL.channelNumber, mids.bR.channelNumber, faceCenters.bottom.channelNumber, 'Bottom Transverse Cross');

  // Add Mid-Plane Crosses (Face Center to Opposite Face Center through Hub)
  if (hubSensor) {
    const h = hubSensor.channelNumber;
    // Floor-to-Ceiling Plane
    addCable(faceCenters.bottom.channelNumber, h, 'mid-plane', 'Y-Axis Plane (Bottom to Hub)', 'Internal volumetric grid');
    addCable(h, faceCenters.top.channelNumber, 'mid-plane', 'Y-Axis Plane (Hub to Top)', 'Internal volumetric grid');
    
    // Left-to-Right Plane
    addCable(faceCenters.left.channelNumber, h, 'mid-plane', 'Z-Axis Plane (Left to Hub)', 'Internal volumetric grid');
    addCable(h, faceCenters.right.channelNumber, 'mid-plane', 'Z-Axis Plane (Hub to Right)', 'Internal volumetric grid');
    
    // Front-to-Rear Plane
    addCable(faceCenters.front.channelNumber, h, 'mid-plane', 'X-Axis Plane (Front to Hub)', 'Internal volumetric grid');
    addCable(h, faceCenters.rear.channelNumber, 'mid-plane', 'X-Axis Plane (Hub to Rear)', 'Internal volumetric grid');

    // Internal Longitudinal Stabilizers (Depth rails for face centers)
    addCable(mids.fT.channelNumber, mids.rT.channelNumber, 'depth-rail', 'Top Center Depth Rail', 'Internal volumetric stabilizer');
    addCable(mids.fB.channelNumber, mids.rB.channelNumber, 'depth-rail', 'Bottom Center Depth Rail', 'Internal volumetric stabilizer');
    addCable(mids.fL.channelNumber, mids.rL.channelNumber, 'depth-rail', 'Left Center Depth Rail', 'Internal volumetric stabilizer');
    addCable(mids.fR.channelNumber, mids.rR.channelNumber, 'depth-rail', 'Right Center Depth Rail', 'Internal volumetric stabilizer');
  } else {
    addCable(faceCenters.bottom.channelNumber, faceCenters.top.channelNumber, 'mid-plane', 'Y-Axis Plane', 'Internal volumetric grid');
    addCable(faceCenters.left.channelNumber, faceCenters.right.channelNumber, 'mid-plane', 'Z-Axis Plane', 'Internal volumetric grid');
    addCable(faceCenters.front.channelNumber, faceCenters.rear.channelNumber, 'mid-plane', 'X-Axis Plane', 'Internal volumetric grid');
  }

  // -----------------------------------------------------------
  // STEP 4: TETHER ALL OTHER SENSORS TO HUB
  // Ensures any extra sensors are logically tied into the spider web
  // -----------------------------------------------------------
  const coreIds = new Set<number>();
  if (hubSensor) coreIds.add(hubSensor.channelNumber);
  Object.values(corners).forEach(c => coreIds.add(c.channelNumber));
  Object.values(mids).forEach(c => coreIds.add(c.channelNumber));
  Object.values(faceCenters).forEach(c => coreIds.add(c.channelNumber));

  if (hubSensor) {
    channels.forEach(ch => {
      if (!coreIds.has(ch.channelNumber)) {
        addCable(ch.channelNumber, centerNum, 'face-brace', `Radial Lead (TC ${ch.channelNumber} ➔ Hub)`, 'Logical center-tethered rigging');
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
 * Distributes sensors in a balanced, symmetrical pattern based on current count.
 * Snaps to corners, face centers, edge centers, and hub.
 */
export function balanceSensors(
  channels: ThermocoupleChannel[],
  chamber: FurnaceChamber,
  qwz: QualifiedWorkZone
): ThermocoupleChannel[] {
  const count = channels.length;
  // Use standard layouts if possible, otherwise distribute logically
  const balanced = generateStandardAMS2750Sensors(chamber, qwz, count);
  
  // Maintain user-defined metadata (roll lots, etc) while updating positions
  return channels.map((ch, idx) => {
    const balancedPos = balanced[idx] || balanced[balanced.length - 1];
    return {
      ...ch,
      x: balancedPos.x,
      y: balancedPos.y,
      z: balancedPos.z,
      ux: balancedPos.ux,
      uy: balancedPos.uy,
      uz: balancedPos.uz,
      ...computeSensorDistances(balancedPos.x, balancedPos.y, balancedPos.z, chamber),
      label: balancedPos.label, // Update label to match standard position
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
 * AMS 2750 Rev H Table 18: Maximum Allowed Offset (Magnitude of Temperature Controller Offset Adjustment)
 * Class 1: 5°F / 3°C
 * Class 2: 10°F / 6°C (Parts) or 5°F / 3°C (Raw Material)
 * Class 3: 10°F / 6°C (Parts) or 8°F / 4°C (Raw Material)
 * Class 4: 10°F / 6°C
 * Class 5: 13°F / 7°C
 * Class 6: 25°F / 14°C
 */
export function getMaxAllowedOffset(
  furnaceClass: FurnaceClass,
  tempUnit: TempUnit,
  furnaceApplication: 'Parts' | 'Raw Material' = 'Parts'
): number {
  const isRaw = furnaceApplication === 'Raw Material';
  if (tempUnit === '°F') {
    switch (furnaceClass) {
      case 1: return 5;
      case 2: return isRaw ? 5 : 10;
      case 3: return isRaw ? 8 : 10;
      case 4: return 10;
      case 5: return 13;
      case 6: return 25;
    }
  } else {
    switch (furnaceClass) {
      case 1: return 3;
      case 2: return isRaw ? 3 : 6;
      case 3: return isRaw ? 4 : 6;
      case 4: return 6;
      case 5: return 7;
      case 6: return 14;
    }
  }
}

/**
 * Evaluates whether two corner sensors are adjacent on the QWZ box (share 2 of 3 corner axes)
 * per AMS 2750 Rev H § 3.5.10.2 ("Failed sensors are not in adjacent corners").
 */
function findAdjacentFailedCorners(
  failedChannels: ThermocoupleChannel[],
  qwz?: QualifiedWorkZone
): Array<[ThermocoupleChannel, ThermocoupleChannel]> {
  if (failedChannels.length < 2) return [];

  // Identify corner coordinates either via QWZ or via normalized ux, uy, uz (0 or 1)
  const cornerFailures = failedChannels.filter((ch) => {
    if (qwz) {
      const tolL = Math.max(0.5, qwz.length * 0.05);
      const tolH = Math.max(0.5, qwz.height * 0.05);
      const tolW = Math.max(0.5, qwz.width * 0.05);
      const isXCorner = Math.abs(ch.x - qwz.offsetFront) <= tolL || Math.abs(ch.x - (qwz.offsetFront + qwz.length)) <= tolL;
      const isYCorner = Math.abs(ch.y - qwz.offsetFloor) <= tolH || Math.abs(ch.y - (qwz.offsetFloor + qwz.height)) <= tolH;
      const isZCorner = Math.abs(ch.z - qwz.offsetLeft) <= tolW || Math.abs(ch.z - (qwz.offsetLeft + qwz.width)) <= tolW;
      return isXCorner && isYCorner && isZCorner;
    }
    const ux = ch.ux ?? -1;
    const uy = ch.uy ?? -1;
    const uz = ch.uz ?? -1;
    const isCornerCoord = (v: number) => Math.abs(v - 0) <= 0.05 || Math.abs(v - 1) <= 0.05;
    return (isCornerCoord(ux) && isCornerCoord(uy) && isCornerCoord(uz)) || ch.label.toLowerCase().includes('corner');
  });

  const adjacentPairs: Array<[ThermocoupleChannel, ThermocoupleChannel]> = [];
  for (let i = 0; i < cornerFailures.length; i++) {
    for (let j = i + 1; j < cornerFailures.length; j++) {
      const a = cornerFailures[i];
      const b = cornerFailures[j];
      if (qwz) {
        const sameX = Math.abs(a.x - b.x) <= Math.max(1, qwz.length * 0.1);
        const sameY = Math.abs(a.y - b.y) <= Math.max(1, qwz.height * 0.1);
        const sameZ = Math.abs(a.z - b.z) <= Math.max(1, qwz.width * 0.1);
        const sharedAxes = (sameX ? 1 : 0) + (sameY ? 1 : 0) + (sameZ ? 1 : 0);
        // Two corners are adjacent along a QWZ edge if they share 2 axes and differ on 1 axis
        if (sharedAxes >= 2) {
          adjacentPairs.push([a, b]);
        }
      } else {
        const uxA = Math.round(a.ux ?? 0);
        const uyA = Math.round(a.uy ?? 0);
        const uzA = Math.round(a.uz ?? 0);
        const uxB = Math.round(b.ux ?? 0);
        const uyB = Math.round(b.uy ?? 0);
        const uzB = Math.round(b.uz ?? 0);
        const shared = (uxA === uxB ? 1 : 0) + (uyA === uyB ? 1 : 0) + (uzA === uzB ? 1 : 0);
        if (shared >= 2) {
          adjacentPairs.push([a, b]);
        }
      }
    }
  }
  return adjacentPairs;
}

export function evaluateSetpoint(
  setpoint: SurveySetpoint,
  channels: ThermocoupleChannel[],
  furnaceClass: FurnaceClass,
  tempUnit: TempUnit,
  instrumentCorrection: number = 0.0,
  minRequiredSensorsFromTable17: number = 9,
  qwz?: QualifiedWorkZone,
  furnaceApplication: 'Parts' | 'Raw Material' = 'Parts'
): SetpointAnalysisResult {
  const tol = CLASS_TOLERANCES[furnaceClass][tempUnit];
  const minAllowed = setpoint.targetTemp - tol;
  const maxAllowed = setpoint.targetTemp + tol;

  const maxAllowedOffset = getMaxAllowedOffset(furnaceClass, tempUnit, furnaceApplication);
  const offsetApplied = Math.abs(setpoint.controlOffset ?? 0);
  const isOffsetCompliant = offsetApplied <= maxAllowedOffset;
  const offsetCompliance = {
    offsetApplied: setpoint.controlOffset ?? 0,
    maxAllowedOffset,
    isOffsetCompliant,
    ruleRef: `AMS 2750 Rev H Table 18 & § 3.2.5.2 (Max ±${maxAllowedOffset}${tempUnit} for Class ${furnaceClass} ${furnaceApplication})`,
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
  const minRequired = Math.max(9, minRequiredSensorsFromTable17);

  // AMS 2750 Rev H § 3.5.10.2 & § 3.5.14.1.6 Sensor Failure Evaluation:
  // 1. No permanent furnace control or recording sensor can fail (§ 3.5.14.1.6)
  const failedControlSensors = failedChannels.filter((ch) => ch.isControlSensor);
  // 2. When 9 TUS sensors are used, no more than 1 TUS sensor may fail.
  //    When > 9 TUS sensors are used, no more than 10% (rounded down to integer, or exact 10%) of total TUS sensors used may fail (§ 3.5.10.2),
  //    AND total remaining valid TUS sensors must be >= minimum required in Table 17.
  const maxFailedAllowedByPercent = channels.length === 9 ? 1 : Math.floor(channels.length * 0.10);
  const exceedsPercentFailureLimit = channels.length > 9
    ? failedChannels.length > maxFailedAllowedByPercent
    : failedChannels.length > 1;
  // Wait: per § 3.5.10.2: "When 9 TUS sensors are used, no more than 1 TUS sensor may fail. When more than 9 TUS sensors are used, the number of failed TUS sensors shall not result in less than the minimum required in Table 17 or 10% of the number of TUS sensors used, whichever is greater."
  // Note: If 9 sensors are used for a <225 ft³ zone (Table 17 min = 9), § 3.5.10.2 explicitly allows 1 sensor to fail (leaving 8 active) as long as it's not a control sensor!
  // When > 9 sensors are used:
  // - Remaining valid sensors must be >= minRequired (Table 17), AND
  // - Number of failed sensors must not exceed 10% of total sensors used (e.g. for 36 sensors, 10% = 3.6 -> max 3 failed sensors, provided 36 - 3 = 33 >= Table 17 min).
  const hasValidRemainingCount = channels.length === 9
    ? failedChannels.length <= 1
    : (validChannels.length >= minRequired && !exceedsPercentFailureLimit);

  // 3. Failed sensors are not in adjacent corners (§ 3.5.10.2)
  const adjacentFailedCornerPairs = findAdjacentFailedCorners(failedChannels, qwz);
  const hasAdjacentCornerFailure = adjacentFailedCornerPairs.length > 0;

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
    const inTolerance = ch.failed ? true : (corrected >= minAllowed && corrected <= maxAllowed);

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
  const meanCorrected = evaluationChannels.length > 0 ? Math.round((sumCorrected / evaluationChannels.length) * 10) / 10 : setpoint.targetTemp;
  const spread = Math.round((maxCorrected - minCorrected) * 10) / 10;
  // AMS 2750 Rev H § 3.5.10.6 & § 3.5.14.1.2: At no time shall any sensor reading exceed the upper TUS tolerance!
  const overshootPassed = setpoint.maxOvershootObserved <= setpoint.targetTemp + tol;
  
  const allValidPassed = validChannels.length > 0 
    ? channelResults.filter(c => !c.failed).every(c => c.inTolerance)
    : channelResults.every(c => c.inTolerance);

  let passed = allValidPassed && overshootPassed && isOffsetCompliant;
  let sensorFailureNote: string | undefined;

  if (failedChannels.length > 0) {
    const failureViolations: string[] = [];
    if (failedControlSensors.length > 0) {
      failureViolations.push(
        `Permanent furnace control/recording sensor(s) failed (${failedControlSensors.map(c => `TC ${c.channelNumber}`).join(', ')}) — prohibited by § 3.5.14.1.6`
      );
    }
    if (hasAdjacentCornerFailure) {
      const pairStr = adjacentFailedCornerPairs.map(([a, b]) => `TC ${a.channelNumber} & TC ${b.channelNumber}`).join('; ');
      failureViolations.push(
        `Failed sensors are in adjacent corners (${pairStr}) — prohibited by § 3.5.10.2`
      );
    }
    if (!hasValidRemainingCount) {
      if (channels.length === 9 && failedChannels.length > 1) {
        failureViolations.push(
          `${failedChannels.length} sensors failed in a 9-sensor survey (maximum 1 failed sensor allowed per § 3.5.10.2)`
        );
      } else {
        if (exceedsPercentFailureLimit) {
          failureViolations.push(
            `${failedChannels.length} sensors failed, exceeding the maximum 10% failure allowance (${maxFailedAllowedByPercent} max for ${channels.length} sensors per § 3.5.10.2)`
          );
        }
        if (validChannels.length < minRequired) {
          failureViolations.push(
            `Remaining active valid sensors (${validChannels.length}) dropped below the AMS 2750 Rev H Table 17 minimum requirement (${minRequired} sensors for this work zone volume)`
          );
        }
      }
    }

    if (failureViolations.length === 0 && allValidPassed && overshootPassed && isOffsetCompliant) {
      passed = true;
      sensorFailureNote = `AMS 2750 Rev H § 3.5.10.2 & § 3.5.14.1.6 Sensor Failure Provision: ${failedChannels.length} TUS sensor(s) experienced open/broken failure (${failedChannels.map(c => `TC ${c.channelNumber} - ${c.label}`).join(', ')}). Active valid sensors (${validChannels.length}/${channels.length}) satisfy Table 17 minimum (${minRequired}) and ≤10% failure limit (${maxFailedAllowedByPercent} max), no adjacent corners failed, and no control sensor failed. Survey is certified as PASS.`;
    } else if (failureViolations.length > 0) {
      passed = false;
      sensorFailureNote = `AMS 2750 Rev H § 3.5.10.2 / § 3.5.14.1.6 Sensor Failure Violation: ${failureViolations.join(' | ')}. Survey FAILED.`;
    } else {
      passed = false;
      sensorFailureNote = `AMS 2750 Rev H Evaluation Note: ${failedChannels.length} sensor(s) marked failed, and one or more active sensors or parameters (overshoot/offset) exceeded tolerance. Survey FAILED.`;
    }
  } else if (!isOffsetCompliant) {
    sensorFailureNote = `AMS 2750 Rev H Table 18 Offset Violation: Applied control offset (${setpoint.controlOffset}${tempUnit}) exceeds maximum allowed ±${maxAllowedOffset}${tempUnit} for Class ${furnaceClass} (${furnaceApplication}). Survey FAILED.`;
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

