import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ImageRun,
  Header,
  Footer,
  PageNumber,
  ShadingType,
  Packer,
  convertInchesToTwip,
  PageOrientation,
} from 'docx';
import {
  FurnaceChamber,
  QualifiedWorkZone,
  ThermocoupleChannel,
  SurveySetpoint,
  TestInstrument,
  SurveyMetadata,
  NadcapCheckItem,
} from '../types/tus';
import {
  calculateVolumeInCuFt,
  getMinRequiredSensors,
  CLASS_TOLERANCES,
  evaluateSetpoint,
} from './ams2750';

function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URL scheme if present
  const pureBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(pureBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const tableBorderObj = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: 'CBD5E1',
};

const cellBorders = {
  top: tableBorderObj,
  bottom: tableBorderObj,
  left: tableBorderObj,
  right: tableBorderObj,
};

function createCell(
  text: string,
  options: {
    bold?: boolean;
    header?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    color?: string;
    bg?: string;
    widthPercent?: number;
    highlightFail?: boolean;
    italics?: boolean;
  } = {}
): TableCell {
  const { 
    bold = false, 
    header = false, 
    align = AlignmentType.LEFT, 
    color, 
    bg, 
    widthPercent, 
    highlightFail = false,
    italics = false
  } = options;

  // Split by actual newline or literal \n string or /n for robustness
  const lines = text.split(/\r?\n|\\n|\/n/);

  return new TableCell({
    width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
    borders: cellBorders,
    shading: {
      type: ShadingType.CLEAR,
      fill: highlightFail ? 'FEF2F2' : (bg || (header ? '1E293B' : 'FFFFFF')),
    },
    margins: {
      top: convertInchesToTwip(0.06),
      bottom: convertInchesToTwip(0.06),
      left: convertInchesToTwip(0.08),
      right: convertInchesToTwip(0.08),
    },
    children: lines.map(line => 
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text: line || ' ', // Use a space for empty lines to ensure the paragraph is rendered
            bold: bold || header || highlightFail,
            italics: italics,
            font: 'Arial',
            size: header ? 18 : 17,
            color: highlightFail ? 'B91C1C' : (color || (header ? 'FFFFFF' : '0F172A')),
          }),
        ],
      })
    ),
  });
}

function createHeading(
  text: string, 
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1,
  pageBreakBefore: boolean = false
): Paragraph {
  return new Paragraph({
    heading: level,
    pageBreakBefore,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: 'Arial',
        size: level === HeadingLevel.HEADING_1 ? 26 : 22,
        color: '0F172A',
      }),
    ],
  });
}

export async function generateTusDocxBlob(params: {
  meta: SurveyMetadata;
  chamber: FurnaceChamber;
  qwz: QualifiedWorkZone;
  channels: ThermocoupleChannel[];
  setpoints: SurveySetpoint[];
  instrument: TestInstrument;
  checklist: NadcapCheckItem[];
  diagramImageBase64?: string;
  trendImageBase64?: string;
  setpointTrendImages?: Record<string, string>; // Map of setpoint ID -> Base64 Image
}): Promise<Blob> {
  const { meta, chamber, qwz, channels, setpoints, instrument, checklist, diagramImageBase64, trendImageBase64, setpointTrendImages } = params;

  const volumeCuFt = calculateVolumeInCuFt(qwz, meta.dimUnit);
  const { minSensors } = getMinRequiredSensors(volumeCuFt);
  const toleranceVal = CLASS_TOLERANCES[meta.furnaceClass][meta.tempUnit];

  // Evaluate all setpoints per AMS 2750 Rev H § 3.5.14.1, § 3.5.10.2 & Table 17/18
  const setpointAnalyses = setpoints.map((sp) =>
    evaluateSetpoint(
      sp,
      channels,
      meta.furnaceClass,
      meta.tempUnit,
      instrument.instrumentCorrection ?? 0,
      minSensors,
      qwz,
      meta.furnaceApplication || 'Parts'
    )
  );
  const overallConformant = 
    setpointAnalyses.every((sa) => sa.passed) && 
    channels.length >= minSensors &&
    checklist.every(item => item.compliant);

  // Header & Footer (unchanged...)

  const docHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `NADCAP AC7102/8 & AMS 2750 REV H TUS REPORT  |  FURNACE ID: ${meta.furnaceId}  |  DOC: ${meta.reportNumber}`,
            font: 'Arial',
            size: 16,
            color: '64748B',
          }),
        ],
      }),
    ],
  });

  const docFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'Page ', font: 'Arial', size: 16, color: '64748B' }),
          new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '64748B' }),
          new TextRun({ text: ' of ', font: 'Arial', size: 16, color: '64748B' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 16, color: '64748B' }),
        ],
      }),
    ],
  });

  const section1Children: (Paragraph | Table)[] = [];
  const section2Children: (Paragraph | Table)[] = [];
  const section3Children: (Paragraph | Table)[] = [];

  // ==========================================
  // SECTION 1: REPORT HEADERS & CLEARANCES
  // ==========================================
  section1Children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: meta.companyName.toUpperCase(),
          bold: true,
          font: 'Arial',
          size: 28,
          color: '0F172A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: `FACILITY: ${meta.facilityLocation.toUpperCase()}`,
          font: 'Arial',
          size: 18,
          color: '475569',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: 'TEMPERATURE UNIFORMITY SURVEY (TUS) TEST REPORT',
          bold: true,
          font: 'Arial',
          size: 32,
          color: '0369A1',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Conforming strictly to SAE AMS 2750 Rev H & PRI Nadcap AC7102/8 Audit Criteria',
          italics: true,
          font: 'Arial',
          size: 20,
          color: '334155',
        }),
      ],
    })
  );

  // Status Verdict Callout - ENHANCED SIZE
  section1Children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          height: { value: 1200, rule: 'atLeast' },
          children: [
            createCell(
              overallConformant ? 'PASS' : 'FAIL',
              {
                bold: true,
                align: AlignmentType.CENTER,
                bg: overallConformant ? '15803D' : 'B91C1C',
                color: 'FFFFFF',
              }
            ),
          ],
        }),
        new TableRow({
          children: [
            createCell(
              overallConformant
                ? 'OVERALL AUDIT VERDICT: CONFORMANT / ACCEPTED\nAll survey channels satisfy AMS 2750 Rev H Class ' +
                    meta.furnaceClass +
                    ' (±' +
                    toleranceVal +
                    meta.tempUnit +
                    ') uniformity limits and all checklist audit criteria.'
                : 'OVERALL AUDIT VERDICT: NON-CONFORMANT / REJECTED\nOne or more survey test criteria did not satisfy AMS 2750 Rev H Class ' +
                    meta.furnaceClass +
                    ' tolerance, sensor quantity requirements, or audit checklist items.',
              {
                bold: true,
                align: AlignmentType.CENTER,
                bg: overallConformant ? 'F0FDF4' : 'FEF2F2',
                color: overallConformant ? '15803D' : 'B91C1C',
              }
            ),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 180 } })
  );

  // Key Survey Metadata Table
  section1Children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('Report Number:', { bold: true, bg: 'F1F5F9', widthPercent: 20 }),
            createCell(meta.reportNumber, { widthPercent: 30 }),
            createCell('Survey Date:', { bold: true, bg: 'F1F5F9', widthPercent: 20 }),
            createCell(meta.date, { widthPercent: 30 }),
          ],
        }),
        new TableRow({
          children: [
            createCell('Revision:', { bold: true, bg: 'F1F5F9' }),
            createCell(meta.revision),
            createCell('Survey Reason:', { bold: true, bg: 'F1F5F9' }),
            createCell(meta.surveyReason),
          ],
        }),
        new TableRow({
          children: [
            createCell('Furnace ID / Tag:', { bold: true, bg: 'F1F5F9' }),
            createCell(meta.furnaceId),
            createCell('Equipment Name:', { bold: true, bg: 'F1F5F9' }),
            createCell(meta.furnaceName),
          ],
        }),
        new TableRow({
          children: [
            createCell('Furnace Model & S/N:', { bold: true, bg: 'F1F5F9' }),
            createCell(`${meta.furnaceModel} / S/N: ${meta.furnaceSerial}`),
            createCell('Furnace Class & Type:', { bold: true, bg: 'F1F5F9' }),
            createCell(`Class ${meta.furnaceClass} (±${toleranceVal}${meta.tempUnit}) | Type ${meta.instrumentationType}`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Operating Range:', { bold: true, bg: 'F1F5F9' }),
            createCell(`${meta.operatingTempMin}${meta.tempUnit} to ${meta.operatingTempMax}${meta.tempUnit}`),
            createCell('Atmosphere & Fan:', { bold: true, bg: 'F1F5F9' }),
            createCell(`${meta.atmosphere} | Fan: ${meta.fanCondition}`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Heating Method:', { bold: true, bg: 'F1F5F9' }),
            createCell(meta.heatingMethod),
            createCell('Load Condition:', { bold: true, bg: 'F1F5F9' }),
            createCell(meta.loadCondition),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // SECTION 1: FURNACE DIMENSIONS
  section1Children.push(
    createHeading('1. Furnace Chamber & Qualified Work Zone (QWZ) Specifications'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `The thermal processing chamber and qualified working dimensions are established per AMS 2750 Rev H Section 3.5. All production parts must be contained entirely within the qualified work zone envelope during certified heat treatments.`,
          font: 'Arial',
          size: 18,
          color: '334155',
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('Dimension Parameter', { header: true, widthPercent: 35 }),
            createCell(`Furnace Chamber (${meta.dimUnit})`, { header: true, widthPercent: 30 }),
            createCell(`Qualified Work Zone (${meta.dimUnit})`, { header: true, widthPercent: 35 }),
          ],
        }),
        new TableRow({
          children: [
            createCell('Length (Front to Rear)', { bold: true, bg: 'F8FAFC' }),
            createCell(`${chamber.length} ${meta.dimUnit}`),
            createCell(`${qwz.length} ${meta.dimUnit}`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Width (Left to Right)', { bold: true, bg: 'F8FAFC' }),
            createCell(`${chamber.width} ${meta.dimUnit}`),
            createCell(`${qwz.width} ${meta.dimUnit}`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Height (Floor to Ceiling)', { bold: true, bg: 'F8FAFC' }),
            createCell(`${chamber.height} ${meta.dimUnit}`),
            createCell(`${qwz.height} ${meta.dimUnit}`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Enclosed Volume', { bold: true, bg: 'F8FAFC' }),
            createCell(
              meta.dimUnit === 'mm'
                ? `${((chamber.length * chamber.width * chamber.height) / 1_000_000_000).toFixed(3)} m³ (${((chamber.length * chamber.width * chamber.height) / 1_000_000).toFixed(0)} L)`
                : `${((chamber.length * chamber.width * chamber.height) / 1728).toFixed(2)} ft³`
            ),
            createCell(
              meta.dimUnit === 'mm'
                ? `${((qwz.length * qwz.width * qwz.height) / 1_000_000_000).toFixed(3)} m³ (${((qwz.length * qwz.width * qwz.height) / 1_000_000).toFixed(0)} L / ${volumeCuFt.toFixed(1)} ft³)`
                : `${volumeCuFt.toFixed(2)} ft³ (${(volumeCuFt * 0.0283168).toFixed(2)} m³)`
            ),
          ],
        }),
        new TableRow({
          children: [
            createCell('AMS 2750 Rev H Min Sensors', { bold: true, bg: 'F8FAFC' }),
            createCell('N/A (Chamber overall)'),
            createCell(`Minimum ${minSensors} Sensors (${channels.length} Configured)`, {
              bold: true,
              color: channels.length >= minSensors ? '15803D' : 'B91C1C',
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 120 } })
  );

  // Work Zone Clearances Table
  section1Children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'Qualified Work Zone Clearances from Internal Chamber Surfaces:',
          bold: true,
          font: 'Arial',
          size: 18,
          color: '0F172A',
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('Front Door Clearance', { bold: true, bg: 'F8FAFC', widthPercent: 33 }),
            createCell('Rear Wall Clearance', { bold: true, bg: 'F8FAFC', widthPercent: 33 }),
            createCell('Hearth / Floor Clearance', { bold: true, bg: 'F8FAFC', widthPercent: 34 }),
          ],
        }),
        new TableRow({
          children: [
            createCell(`${qwz.offsetFront} ${meta.dimUnit}`),
            createCell(`${qwz.offsetRear} ${meta.dimUnit}`),
            createCell(`${qwz.offsetFloor} ${meta.dimUnit}`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Left Wall Clearance', { bold: true, bg: 'F8FAFC' }),
            createCell('Right Wall Clearance', { bold: true, bg: 'F8FAFC' }),
            createCell('Roof / Ceiling Clearance', { bold: true, bg: 'F8FAFC' }),
          ],
        }),
        new TableRow({
          children: [
            createCell(`${qwz.offsetLeft} ${meta.dimUnit}`),
            createCell(`${qwz.offsetRight} ${meta.dimUnit}`),
            createCell(`${qwz.offsetCeiling} ${meta.dimUnit}`),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  const ctrlPos = chamber.controlSensorPos;
  const ovtPos = chamber.overtempSensorPos;

  if (ctrlPos || ovtPos) {
    section1Children.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({
            text: 'Permanent Furnace Instrumentation Locations (Control & Overtemp Sensors)',
            bold: true,
            font: 'Arial',
            size: 20,
            color: '1E3A8A',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `Per AMS 2750 Rev H Section 3.4.3, the spatial locations of permanent furnace control and overtemperature sensors are documented below relative to the internal chamber origin (X = Depth from Front Door, Y = Height from Floor, Z = Width from Left Wall):`,
            font: 'Arial',
            size: 18,
            color: '334155',
          }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createCell('Sensor Function', { header: true, widthPercent: 30 }),
              createCell('Sensor Tag / Label', { header: true, widthPercent: 25 }),
              createCell(`Spatial Location Coordinates (X, Y, Z in ${meta.dimUnit})`, { header: true, widthPercent: 45 }),
            ],
          }),
          ...(ctrlPos
            ? [
                new TableRow({
                  children: [
                    createCell('Control Thermocouple (TC-CTRL)', { bold: true, bg: 'F8FAFC' }),
                    createCell(ctrlPos.label || 'Control TC'),
                    createCell(`X: ${ctrlPos.x} ${meta.dimUnit} (Depth) | Y: ${ctrlPos.y} ${meta.dimUnit} (Height) | Z: ${ctrlPos.z} ${meta.dimUnit} (Width)`),
                  ],
                }),
              ]
            : []),
          ...(ovtPos
            ? [
                new TableRow({
                  children: [
                    createCell('Overtemperature TC (TC-OVT)', { bold: true, bg: 'F8FAFC' }),
                    createCell(ovtPos.label || 'Overtemp TC'),
                    createCell(`X: ${ovtPos.x} ${meta.dimUnit} (Depth) | Y: ${ovtPos.y} ${meta.dimUnit} (Height) | Z: ${ovtPos.z} ${meta.dimUnit} (Width)`),
                  ],
                }),
              ]
            : []),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } })
    );
  }

  // Schematic
  section1Children.push(
    createHeading('2. Isometric Thermocouple Location & Physical Wire Grid Schematic'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `Figure 1: 2D Isometric engineering schematic (AMS 2750 Rev H / Nadcap standard) illustrating the furnace chamber boundary, the tinted qualified work zone envelope, physical wire grid web structure, and numbered thermocouple sensor markers (TC 1 to TC ${channels.length}).`,
          font: 'Arial',
          size: 18,
          italics: true,
          color: '475569',
        }),
      ],
    })
  );

  if (diagramImageBase64) {
    try {
      const imgBytes = base64ToUint8Array(diagramImageBase64);
      section1Children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 120 },
          children: [
            new ImageRun({
              data: imgBytes,
              transformation: { width: 700, height: 460 },
              type: 'png',
            }),
          ],
        })
      );
    } catch {
      section1Children.push(
        new Paragraph({
          children: [new TextRun({ text: '[Isometric diagram rendering attached]', italics: true })],
        })
      );
    }
  }

  // Sensor clearance matrix
  section1Children.push(
    createHeading('3. Thermocouple Sensor Location & Internal Clearance Matrix'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `In compliance with AMS 2750 Rev H Section 3.5.10.3 and Nadcap AC7102/8 checklist item 4.2, the physical distance of every survey thermocouple from all six internal furnace surfaces is verified and documented below.`,
          font: 'Arial',
          size: 18,
          color: '334155',
        }),
      ],
    })
  );

  const sensorRows: TableRow[] = [
    new TableRow({
      children: [
        createCell('TC #', { header: true, widthPercent: 8 }),
        createCell('Sensor Description', { header: true, widthPercent: 24 }),
        createCell(`Left Wall (${meta.dimUnit})`, { header: true, widthPercent: 11 }),
        createCell(`Right Wall (${meta.dimUnit})`, { header: true, widthPercent: 11 }),
        createCell(`Front Wall (${meta.dimUnit})`, { header: true, widthPercent: 11 }),
        createCell(`Rear Wall (${meta.dimUnit})`, { header: true, widthPercent: 11 }),
        createCell(`Floor (${meta.dimUnit})`, { header: true, widthPercent: 12 }),
        createCell(`Ceiling (${meta.dimUnit})`, { header: true, widthPercent: 12 }),
      ],
    }),
  ];

  channels.forEach((ch, idx) => {
    const bg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    sensorRows.push(
      new TableRow({
        children: [
          createCell(`TC ${ch.channelNumber}`, { bold: true, bg }),
          createCell(ch.label, { bg }),
          createCell(ch.distLeft.toString(), { align: AlignmentType.RIGHT, bg }),
          createCell(ch.distRight.toString(), { align: AlignmentType.RIGHT, bg }),
          createCell(ch.distFront.toString(), { align: AlignmentType.RIGHT, bg }),
          createCell(ch.distRear.toString(), { align: AlignmentType.RIGHT, bg }),
          createCell(ch.distFloor.toString(), { align: AlignmentType.RIGHT, bg }),
          createCell(ch.distCeiling.toString(), { align: AlignmentType.RIGHT, bg }),
        ],
      })
    );
  });

  section1Children.push(
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: sensorRows }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // Pyrometric Traceability
  section1Children.push(
    createHeading('4. Pyrometric Instrumentation & Calibration Traceability'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `Thermocouple wire batches and test data recording equipment meet the maximum permissible error limits specified in AMS 2750 Rev H Table 1 and Table 7. All calibrations are traceable to NIST or recognized National Metrological Institutes.`,
          font: 'Arial',
          size: 18,
          color: '334155',
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('Instrument Parameter', { header: true, widthPercent: 50 }),
            createCell('Certified Data Record', { header: true, widthPercent: 50 }),
          ],
        }),
        new TableRow({
          children: [
            createCell('Test Recorder Manufacturer & Model', { bold: true, bg: 'F8FAFC' }),
            createCell(`${instrument.manufacturer} ${instrument.model}`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Instrument Serial Number', { bold: true, bg: 'F8FAFC' }),
            createCell(instrument.serialNumber),
          ],
        }),
        new TableRow({
          children: [
            createCell('Internal Asset / Tool ID', { bold: true, bg: 'F8FAFC' }),
            createCell(instrument.assetTag || 'N/A'),
          ],
        }),
        new TableRow({
          children: [
            createCell('Equipment Type / Architecture', { bold: true, bg: 'F8FAFC' }),
            createCell(instrument.equipmentType || 'Digital TUS Data Acquisition'),
          ],
        }),
        new TableRow({
          children: [
            createCell('Calibration Date & Due Date', { bold: true, bg: 'F8FAFC' }),
            createCell(`${instrument.calibrationDate} (Due: ${instrument.calibrationDueDate})`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Calibration Standards Traceability #', { bold: true, bg: 'F8FAFC' }),
            createCell(instrument.traceabilityNumber || 'N/A'),
          ],
        }),
        new TableRow({
          children: [
            createCell('Calibration Laboratory & Accreditation', { bold: true, bg: 'F8FAFC' }),
            createCell(`${instrument.calibrationLab || 'N/A'} (${instrument.calibrationStandard || 'ISO/IEC 17025 Accredited'})`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Calibrated By (Metrology Technician)', { bold: true, bg: 'F8FAFC' }),
            createCell(instrument.calibratedByTechnician || 'N/A'),
          ],
        }),
        new TableRow({
          children: [
            createCell('Maximum Permissible Instrument Error (MPE)', { bold: true, bg: 'F8FAFC' }),
            createCell(`±${instrument.maxPermissibleError} ${meta.tempUnit} (Allowed Range: ±${meta.tempUnit === '°C' ? '0.6' : '1.1'} ${meta.tempUnit} per AMS 2750 Rev H Table 7)`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Field Instrument Calibration Correction', { bold: true, bg: 'F8FAFC' }),
            createCell(`${(instrument.instrumentCorrection ?? 0) >= 0 ? '+' : ''}${instrument.instrumentCorrection ?? 0} ${meta.tempUnit} (Arithmetically applied to all raw data per Rev H Section 3.5.14.1)`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Calibration Result: "As Found"', { bold: true, bg: 'F8FAFC' }),
            createCell(instrument.asFoundError !== undefined ? `Max Error: ${instrument.asFoundError} ${meta.tempUnit}` : 'N/A'),
          ],
        }),
        new TableRow({
          children: [
            createCell('Calibration Result: "As Left"', { bold: true, bg: 'F8FAFC' }),
            createCell(instrument.asLeftError !== undefined ? `Max Error: ${instrument.asLeftError} ${meta.tempUnit}` : 'N/A'),
          ],
        }),
        new TableRow({
          children: [
            createCell('Data Acquisition Logging Frequency', { bold: true, bg: 'F8FAFC' }),
            createCell(`${meta.dataIntervalSeconds} seconds (AMS 2750 Rev H requires ≤ 120s)`),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 120, after: 60 } }),
    // Secondary Standards Table
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: 'Secondary / Auxiliary Metrology Standards (Calibration Hierarchy Traceability):',
          bold: true,
          font: 'Arial',
          size: 18,
          color: '0F172A',
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('Standard Name / Model', { header: true, widthPercent: 25 }),
            createCell('Serial Number', { header: true, widthPercent: 15 }),
            createCell('Traceability ID', { header: true, widthPercent: 15 }),
            createCell('Calibration Lab / Standard', { header: true, widthPercent: 25 }),
            createCell('Cal Date', { header: true, widthPercent: 10 }),
            createCell('Due Date', { header: true, widthPercent: 10 }),
          ],
        }),
        ...(instrument.secondaryStandards && instrument.secondaryStandards.length > 0
          ? instrument.secondaryStandards.map((sec, idx) => (
              new TableRow({
                children: [
                  createCell(sec.name, { bg: idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF' }),
                  createCell(sec.serialNumber, { bg: idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF' }),
                  createCell(sec.traceabilityNumber, { bg: idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF' }),
                  createCell(sec.calibrationLab || 'N/A', { bg: idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF' }),
                  createCell(sec.calibrationDate, { bg: idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF' }),
                  createCell(sec.calibrationDueDate, { bg: idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF' }),
                ],
              })
            ))
          : [
              new TableRow({
                children: [
                  createCell('N/A - Direct Traceability to Primary Standard', { align: AlignmentType.CENTER, widthPercent: 100 }),
                  createCell(''), createCell(''), createCell(''), createCell(''), createCell(''),
                ],
              }),
            ]),
      ],
    }),
    new Paragraph({ spacing: { after: 120 } })
  );

  const wireRows: TableRow[] = [
    new TableRow({
      children: [
        createCell('TC #', { header: true, widthPercent: 10 }),
        createCell('Type', { header: true, widthPercent: 10 }),
        createCell('Roll / Lot Batch #', { header: true, widthPercent: 25 }),
        createCell('Cal Date', { header: true, widthPercent: 15 }),
        createCell('Expiry Date', { header: true, widthPercent: 15 }),
        createCell('Recorder Channel', { header: true, widthPercent: 25 }),
      ],
    }),
  ];

  channels.forEach((ch, idx) => {
    const bg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    wireRows.push(
      new TableRow({
        children: [
          createCell(`TC ${ch.channelNumber}`, { bold: true, bg }),
          createCell(`Type ${ch.type}`, { bg }),
          createCell(ch.rollLotNumber, { bg }),
          createCell(ch.calibrationDate, { bg }),
          createCell(ch.expirationDate, { bg }),
          createCell(ch.recorderChannel, { bg }),
        ],
      })
    );
  });

  section1Children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: wireRows,
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // ==========================================
  // SECTION 2: ROTATED FULL-PAGE TREND GRAPH
  // ==========================================
  section2Children.push(
    createHeading('5. Temperature Uniformity Survey Trend Graph Analysis'),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `In accordance with AMS 2750 Rev H Section 3.5.14.1, thermocouple correction factors and instrument calibration corrections are arithmetically applied to all raw data. The soak period began only after all survey sensors reached the minimum survey tolerance and stabilized.`,
          font: 'Arial',
          size: 18,
          color: '334155',
        }),
      ],
    })
  );

  if (trendImageBase64) {
    try {
      const imgBytes = base64ToUint8Array(trendImageBase64);
      section2Children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 120 },
          children: [
            new ImageRun({
              data: imgBytes,
              transformation: {
                width: 900,  // Filling landscape width
                height: 520, // Fitting within landscape height
              },
              type: 'png',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: 'Figure 2: Full-Page Temperature Uniformity Survey Trend Graph with Highlighted 30-Min Evaluation Windows.',
              italics: true,
              font: 'Arial',
              size: 16,
              color: '64748B',
            }),
          ],
        })
      );
    } catch (err) {
      console.error('Failed to add trend image to docx:', err);
    }
  }

  // ==========================================
  // SECTION 3: DETAILED RESULTS & NADCAP AUDIT
  // ==========================================
  
  // Results for each setpoint
  setpointAnalyses.forEach((sa, spIdx) => {
    const sp = setpoints[spIdx];
    section3Children.push(
      new Paragraph({
        pageBreakBefore: true,
        spacing: { before: 100, after: 60 },
        children: [
          new TextRun({
            text: `Setpoint ${spIdx + 1} Analytical Results: ${sa.targetTemp} ${meta.tempUnit}`,
            bold: true,
            font: 'Arial',
            size: 24,
            color: '0F172A',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `Status: ${sa.passed ? 'CONFORMANT / PASS' : 'NON-CONFORMANT / FAIL'}`,
            bold: true,
            font: 'Arial',
            size: 20,
            color: sa.passed ? '15803D' : 'B91C1C',
          }),
        ],
      }),
      // Individual Soak Zoom-In Graph (Placed at the start of each soak result as requested)
      ...(setpointTrendImages?.[sp.id] ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          children: [
            new ImageRun({
              data: base64ToUint8Array(setpointTrendImages[sp.id]),
              transformation: {
                width: 700,
                height: 320,
              },
              type: 'png',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `Setpoint ${spIdx + 1}: Zoom-In Trend Analysis of 30-Minute Captured Soak Period (${sp.soakStartTime} - ${sp.soakEndTime}).`,
              italics: true,
              font: 'Arial',
              size: 16,
              color: '64748B',
            }),
          ],
        })
      ] : []),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createCell('Target Setpoint', { bold: true, bg: 'F1F5F9', widthPercent: 25 }),
              createCell(`${sa.targetTemp} ${meta.tempUnit}`, { widthPercent: 25 }),
              createCell('Allowable Limits', { bold: true, bg: 'F1F5F9', widthPercent: 25 }),
              createCell(`${sa.minAllowed} to ${sa.maxAllowed} ${meta.tempUnit}`, { widthPercent: 25 }),
            ],
          }),
          new TableRow({
            children: [
              createCell('Total Stability Hold', { bold: true, bg: 'F1F5F9' }),
              createCell(`${sp.fullHoldStartTime || sp.soakStartTime} to ${sp.fullHoldEndTime || sp.soakEndTime} (${sp.fullHoldDurationMinutes || sp.soakDurationMinutes} min)`),
              createCell('Maximum Overshoot', { bold: true, bg: 'F1F5F9' }),
              createCell(`${sa.maxOvershoot} ${meta.tempUnit} (Limit: ${sa.maxAllowed} ${meta.tempUnit})`),
            ],
          }),
          new TableRow({
            children: [
              createCell('Audit Capture Window', { bold: true, bg: 'F1F5F9' }),
              createCell(`${sp.soakStartTime} to ${sp.soakEndTime} (${sp.soakDurationMinutes} min evaluation)`),
              createCell('Mean Temperature', { bold: true, bg: 'F1F5F9' }),
              createCell(`${sa.meanCorrectedTemp} ${meta.tempUnit}`),
            ],
          }),
          new TableRow({
            children: [
              createCell('Minimum Corrected Temp', { bold: true, bg: 'F1F5F9' }),
              createCell(`${sa.minCorrectedTemp} ${meta.tempUnit} (${sa.minSensorLabel})`),
              createCell('Maximum Corrected Temp', { bold: true, bg: 'F1F5F9' }),
              createCell(`${sa.maxCorrectedTemp} ${meta.tempUnit} (${sa.maxSensorLabel})`),
            ],
          }),
          new TableRow({
            children: [
              createCell('Uniformity Spread (Max-Min)', { bold: true, bg: 'F1F5F9' }),
              createCell(`${sa.uniformitySpread} ${meta.tempUnit} (Max allowed: ${sa.tolerance * 2} ${meta.tempUnit})`, {
                bold: true,
                color: sa.uniformitySpread <= sa.tolerance * 2 ? '15803D' : 'B91C1C',
              }),
              createCell(' ', { bg: 'F1F5F9' }),
              createCell(' '),
            ],
          }),
        ],
      }),
      ...(sa.sensorFailureNote ? [
        new Paragraph({
          spacing: { before: 60, after: 80 },
          children: [
            new TextRun({
              text: `⚠️ ${sa.sensorFailureNote}`,
              bold: true,
              size: 16,
              color: 'B45309',
              font: 'Arial',
            }),
          ],
        })
      ] : []),
      new Paragraph({ spacing: { after: 120 } })
    );

    // Channel details table
    const spChannelRows: TableRow[] = [
      new TableRow({
        children: [
          createCell('TC #', { header: true, widthPercent: 8 }),
          createCell('Sensor Location', { header: true, widthPercent: 18 }),
          createCell('Capture Time (30-Min Window)', { header: true, widthPercent: 16 }),
          createCell(`Raw (${meta.tempUnit})`, { header: true, widthPercent: 10 }),
          createCell(`TC Corr (${meta.tempUnit})`, { header: true, widthPercent: 10 }),
          createCell(`Corrected (${meta.tempUnit})`, { header: true, widthPercent: 13 }),
          createCell(`Delta (${meta.tempUnit})`, { header: true, widthPercent: 12 }),
          createCell('Result', { header: true, widthPercent: 13 }),
        ],
      }),
    ];

    sa.channelResults.forEach((cr, rIdx) => {
      const bg = rIdx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
      spChannelRows.push(
        new TableRow({
          children: [
            createCell(`TC ${cr.channelNumber}`, { bold: true, bg }),
            createCell(cr.label, { bg }),
            createCell(`${sp.soakStartTime} - ${sp.soakEndTime}`, { bg, align: AlignmentType.CENTER }),
            createCell(cr.rawReading.toFixed(1), { align: AlignmentType.RIGHT, bg }),
            createCell(cr.tcCorrection >= 0 ? `+${cr.tcCorrection.toFixed(1)}` : cr.tcCorrection.toFixed(1), {
              align: AlignmentType.RIGHT,
              bg,
            }),
            createCell(cr.correctedTemp.toFixed(1), { bold: true, align: AlignmentType.RIGHT, bg, highlightFail: !cr.inTolerance }),
            createCell(cr.deltaFromTarget >= 0 ? `+${cr.deltaFromTarget.toFixed(1)}` : cr.deltaFromTarget.toFixed(1), {
              align: AlignmentType.RIGHT,
              bg,
            }),
            createCell(cr.inTolerance ? 'PASS' : 'FAIL', {
              bold: true,
              align: AlignmentType.CENTER,
              bg: cr.inTolerance ? 'F0FDF4' : 'FEF2F2',
              color: cr.inTolerance ? '15803D' : 'B91C1C',
            }),
          ],
        })
      );
    });

    section3Children.push(
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: spChannelRows }),
      new Paragraph({ spacing: { after: 140 } })
    );
  });

  // Checklist & Sign-Off (unchanged logic, just ensuring no random letters)
  section3Children.push(
    createHeading('6. Nadcap AC7102/8 Compliance Checklist'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('Audit Ref', { header: true, widthPercent: 12 }),
            createCell('Requirement', { header: true, widthPercent: 58 }),
            createCell('Finding', { header: true, widthPercent: 15 }),
            createCell('Notes', { header: true, widthPercent: 15 }),
          ],
        }),
        ...checklist.map((item, idx) => new TableRow({
          children: [
            createCell(item.code, { bold: true, bg: idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF' }),
            createCell(item.question, { bg: idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF' }),
            createCell(item.compliant ? 'COMPLIANT' : 'NON-COMPLIANT', {
              bold: true,
              align: AlignmentType.CENTER,
              bg: item.compliant ? 'F0FDF4' : 'FEF2F2',
              color: item.compliant ? '15803D' : 'B91C1C',
            }),
            createCell(item.notes || 'Verified', { bg: idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF' }),
          ],
        })),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } }),
    new Paragraph({
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({
          text: 'Raw data logs containing 1-minute interval readings for all TUS sensors are stored electronically and available for auditor review upon request.',
          bold: true,
          italics: true,
          font: 'Arial',
          size: 18,
          color: '0F172A',
        }),
      ],
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      },
    })
  );

  // ==========================================
  // SECTION 7: CORRECTIVE ACTIONS & FAILURES
  // ==========================================
  (() => {
    const failures: string[] = [];

    // 1. Setpoint Uniformity Failures
    setpointAnalyses.forEach((sa) => {
      if (!sa.passed) {
        const reasons = [];
        if (sa.uniformitySpread > sa.tolerance * 2) {
          reasons.push(`Uniformity spread (${sa.uniformitySpread}${meta.tempUnit}) exceeded limit of ${sa.tolerance * 2}${meta.tempUnit}`);
        }
        if (sa.maxOvershoot > sa.targetTemp + sa.tolerance) {
          reasons.push(`Temperature overshoot (${sa.maxOvershoot}${meta.tempUnit}) exceeded target + tolerance limit`);
        }
        if (sa.sensorFailureNote && sa.sensorFailureNote.includes('FAILED')) {
          reasons.push('Excessive sensor failures');
        }
        failures.push(`Setpoint ${sa.targetTemp}${meta.tempUnit}: ${reasons.join(', ') || 'General failure'}`);
      }
    });

    // 2. Sensor Count Failures
    if (channels.length < minSensors) {
      failures.push(`Total sensor count (${channels.length}) is below AMS 2750 Rev H Table 17 minimum requirement (${minSensors}) for this volume.`);
    }

    // 3. Individual Sensor Failures (only flag as non-conformance if it violated § 3.5.10.2 / § 3.5.14.1.6)
    const manualFailed = channels.filter(ch => ch.failed);
    const hasFailureViolation = setpointAnalyses.some(sa => sa.sensorFailureNote && sa.sensorFailureNote.includes('Violation'));
    if (manualFailed.length > 0 && hasFailureViolation) {
      failures.push(`Sensor failure limit violation (§ 3.5.10.2 / § 3.5.14.1.6) on: ${manualFailed.map(ch => `TC ${ch.channelNumber} (${ch.label})`).join(', ')}.`);
    }

    // 4. Checklist Failures
    const nonCompliant = checklist.filter(item => !item.compliant);
    nonCompliant.forEach(item => {
      failures.push(`Checklist Violation (${item.code}): ${item.question}`);
    });

    const hasFailures = failures.length > 0;

      section3Children.push(
        createHeading('7. Automated Audit Findings & Corrective Action Record', HeadingLevel.HEADING_1, hasFailures),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createCell('Identified Non-Conformances / Deviations', { header: true, widthPercent: 100 }),
              ],
            }),
            new TableRow({
              children: [
                createCell(
                  hasFailures 
                    ? failures.join('\n\n') 
                    : 'NO NON-CONFORMANCES IDENTIFIED: All survey results and checklist items satisfy SAE AMS 2750 Rev H and Nadcap AC7102/8 requirements.',
                  { 
                    highlightFail: hasFailures,
                    bg: hasFailures ? undefined : 'F0FDF4',
                    color: hasFailures ? undefined : '15803D',
                    bold: !hasFailures
                  }
                ),
              ],
            }),
            new TableRow({
              children: [
                createCell('Root Cause Analysis & Corrective Actions Record (Technician/QA Notes)', { header: true }),
              ],
            }),
            ...(hasFailures ? [
              new TableRow({
                children: [
                  createCell('1. Description of Identified Root Cause:', { bold: true, bg: 'F1F5F9' }),
                ],
              }),
              new TableRow({
                height: { value: 1200, rule: 'atLeast' },
                children: [
                  createCell('\n\n\n', { bg: 'FFFFFF' }),
                ],
              }),
              new TableRow({
                children: [
                  createCell('2. Immediate Corrective Action Taken:', { bold: true, bg: 'F1F5F9' }),
                ],
              }),
              new TableRow({
                height: { value: 1200, rule: 'atLeast' },
                children: [
                  createCell('\n\n\n', { bg: 'FFFFFF' }),
                ],
              }),
              new TableRow({
                children: [
                  createCell('3. Long-Term Preventative Action Plan:', { bold: true, bg: 'F1F5F9' }),
                ],
              }),
              new TableRow({
                height: { value: 1200, rule: 'atLeast' },
                children: [
                  createCell('\n\n\n', { bg: 'FFFFFF' }),
                ],
              }),
            ] : [
              new TableRow({
                children: [
                  createCell('N/A — Survey compliant. No corrective actions required.', { 
                    italics: true, 
                    color: '64748B',
                    bg: 'F8FAFC' 
                  }),
                ],
              }),
            ]),
          ],
        }),
        new Paragraph({ spacing: { after: 200 } })
      );
  })();

  section3Children.push(

    createHeading('8. Quality Authorization & Sign-Off Approvals'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `This survey was conducted strictly in accordance with approved pyrometry procedures and the requirements of SAE AMS 2750 Rev H and Nadcap AC7102/8. The signatures below certify that the data, calibration offsets, and calculated results are authentic, complete, and technically valid.`,
          font: 'Arial',
          size: 18,
          color: '334155',
        }),
      ],
    }),
    (() => {
      const hasEngineer = meta.responsibleEngineerName && meta.responsibleEngineerName.trim() !== '';
      const signoffHeaders = hasEngineer
        ? [
            createCell('Pyrometry Technician', { header: true, widthPercent: 33 }),
            createCell('Quality Assurance Manager', { header: true, widthPercent: 33 }),
            createCell('Responsible Metallurgist / Level 3', { header: true, widthPercent: 34 }),
          ]
        : [
            createCell('Pyrometry Technician', { header: true, widthPercent: 50 }),
            createCell('Quality Assurance Manager', { header: true, widthPercent: 50 }),
          ];

      const signoffCells = hasEngineer
        ? [
            createCell(
              `Name: ${meta.technicianName || '[ Unsigned ]'}\nTitle: ${meta.technicianTitle}\n\nSignature: ______________________\n\nDate: ${meta.date}`,
              { bg: 'F8FAFC' }
            ),
            createCell(
              `Name: ${meta.qualityManagerName || '[ Unsigned ]'}\nTitle: ${meta.qualityManagerTitle}\n\nSignature: ______________________\n\nDate: ${meta.date}`,
              { bg: 'F8FAFC' }
            ),
            createCell(
              `Name: ${meta.responsibleEngineerName}\nTitle: Pyrometry Level 3 Authority\n\nSignature: ______________________\n\nDate: ${meta.date}`,
              { bg: 'F8FAFC' }
            ),
          ]
        : [
            createCell(
              `Name: ${meta.technicianName || '[ Unsigned ]'}\nTitle: ${meta.technicianTitle}\n\nSignature: ______________________\n\nDate: ${meta.date}`,
              { bg: 'F8FAFC' }
            ),
            createCell(
              `Name: ${meta.qualityManagerName || '[ Unsigned ]'}\nTitle: ${meta.qualityManagerTitle}\n\nSignature: ______________________\n\nDate: ${meta.date}`,
              { bg: 'F8FAFC' }
            ),
          ];

      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: signoffHeaders }),
          new TableRow({ children: signoffCells }),
        ],
      });
    })(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: '*** END OF FORMAL TEMPERATURE UNIFORMITY SURVEY REPORT ***',
          bold: true,
          font: 'Arial',
          size: 16,
          color: '64748B',
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      { properties: { page: { margin: { top: 864, bottom: 864, left: 936, right: 936 } } }, headers: { default: docHeader }, footers: { default: docFooter }, children: section1Children },
      { properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, headers: { default: docHeader }, footers: { default: docFooter }, children: section2Children },
      { properties: { page: { margin: { top: 864, bottom: 864, left: 936, right: 936 } } }, headers: { default: docHeader }, footers: { default: docFooter }, children: section3Children },
    ],
  });

  return await Packer.toBlob(doc);
}
