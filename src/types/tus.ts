export type UnitSystem = 'imperial' | 'metric';
export type TempUnit = '°F' | '°C';
export type DimUnit = 'in' | 'mm';

export type FurnaceClass = 1 | 2 | 3 | 4 | 5 | 6;
export type InstrumentationType = 'A' | 'B' | 'C' | 'D';

export interface PermanentSensorPosition {
  x: number;
  y: number;
  z: number;
  label: string;
}

export interface FurnaceChamber {
  length: number; // Front-to-Back (Depth)
  width: number;  // Left-to-Right
  height: number; // Floor-to-Ceiling
  shape: 'rectangular' | 'cylindrical';
  feedthroughWall: 'rear' | 'roof' | 'left' | 'right' | 'under_door';
  feedthroughPos: { x: number; y: number; z: number };
  controlSensorPos?: PermanentSensorPosition;
  overtempSensorPos?: PermanentSensorPosition;
}

export interface QualifiedWorkZone {
  length: number;
  width: number;
  height: number;
  offsetLeft: number;
  offsetRight: number;
  offsetFront: number;
  offsetRear: number;
  offsetFloor: number;
  offsetCeiling: number;
}

export type WireType = 'K' | 'N' | 'J' | 'R' | 'S' | 'B' | 'T';

export interface ThermocoupleChannel {
  id: string;
  channelNumber: number;
  label: string; // e.g. "TC 1 - Top Left Front"
  type: WireType;
  rollLotNumber: string;
  calibrationDate: string;
  expirationDate: string;
  recorderChannel: string;
  
  // Distances to internal surfaces
  distLeft: number;
  distRight: number;
  distFront: number;
  distRear: number;
  distFloor: number;
  distCeiling: number;
  
  // Absolute 3D coordinates (x=depth/length from front, y=height from floor, z=width from left)
  x: number;
  y: number;
  z: number;

  // Normalized relative coordinate inside QWZ [0, 1]
  ux?: number;
  uy?: number;
  uz?: number;
  
  // Correction factors (keyed by setpoint ID)
  correctionFactors: Record<string, number>;
  
  isControlSensor?: boolean;
  uses?: number;
  failed?: boolean;
}

export interface SurveySetpoint {
  id: string;
  targetTemp: number;
  soakDurationMinutes: number; // Evaluation window duration (30 min)
  soakStartTime: string;      // Evaluation window start
  soakEndTime: string;        // Evaluation window end
  
  fullHoldStartTime?: string;  // Total stability hold start
  fullHoldEndTime?: string;    // Total stability hold end
  fullHoldDurationMinutes?: number; 
  maxOvershootObserved: number;
  // channelId -> raw temperature reading
  readings: Record<string, number>;
  controlSetpoint?: number;
  controlReading?: number;
  controlOffset?: number;
}

export interface SecondaryStandard {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  calibrationDate: string;
  calibrationDueDate: string;
  traceabilityNumber: string;
  calibrationLab?: string;
  calibrationStandard?: string;
}

export interface TestInstrument {
  manufacturer: string;
  model: string;
  serialNumber: string;
  calibrationDate: string;
  calibrationDueDate: string;
  traceabilityNumber: string; // NIST, UKAS, or National Standard
  maxPermissibleError: number;
  calibrationLab: string;
  assetTag?: string;
  equipmentType?: string;
  calibrationStandard?: string;
  calibrationCertDocRef?: string;
  calibratedByTechnician?: string;
  asFoundError?: number;
  asLeftError?: number;
  instrumentCorrection?: number;
  secondaryStandards?: SecondaryStandard[];
}

export interface NadcapCheckItem {
  id: string;
  code: string; // e.g. AC7102/8 Sec 4.1
  question: string;
  compliant: boolean;
  notes: string;
}

export interface SurveyMetadata {
  reportNumber: string;
  revision: string;
  date: string;
  companyName: string;
  facilityLocation: string;
  furnaceId: string;
  furnaceName: string;
  furnaceModel: string;
  furnaceSerial: string;
  surveyReason: 'Periodic' | 'Initial Qualification' | 'Post-Maintenance / Relining' | 'Thermocouple Failure';
  furnaceClass: FurnaceClass;
  instrumentationType: InstrumentationType;
  operatingTempMin: number;
  operatingTempMax: number;
  unitSystem: UnitSystem;
  tempUnit: TempUnit;
  dimUnit: DimUnit;
  atmosphere: string; // Air, Nitrogen, Argon, Vacuum, Endothermic
  heatingMethod: string; // Electric Resistance, Gas Radiant Tube, Direct Fired
  loadCondition: 'Empty' | 'Simulated Production Load' | 'Maximum Production Load';
  fanCondition: string; // High Speed On, Circulating, Off
  dataIntervalSeconds: number; // Max 120s for AMS2750 Rev H
  technicianName: string;
  technicianTitle: string;
  qualityManagerName: string;
  qualityManagerTitle: string;
  responsibleEngineerName: string;
}

export interface TusTrendData {
  timeStr: string;
  timestampSec: number;
  [key: string]: number | string; // TC channel ID -> Temperature
}

export interface DetectedDwellPeriod {
  targetTemp: number;
  startIndex: number;
  endIndex: number;
  startTimeSec: number;
  endTimeSec: number;
  startTimeStr?: string;
  endTimeStr?: string;
  evalStartIndex?: number; // The specific 30-min window used for report data
  evalEndIndex?: number;
  evalStartTimeSec?: number;
  evalEndTimeSec?: number;
}
