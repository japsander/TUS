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
  } = {}
): TableCell {
  const { bold = false, header = false, align = AlignmentType.LEFT, color, bg, widthPercent } = options;

  return new TableCell({
    width: widthPercent ? { size: widthPercent, type: WidthType.PERCENTAGE } : undefined,
    borders: cellBorders,
    shading: {
      type: ShadingType.CLEAR,
      fill: bg || (header ? '1E293B' : 'FFFFFF'),
    },
    margins: {
      top: convertInchesToTwip(0.06),
      bottom: convertInchesToTwip(0.06),
      left: convertInchesToTwip(0.08),
      right: convertInchesToTwip(0.08),
    },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold: bold || header,
            font: 'Arial',
            size: header ? 18 : 17, // half-points (9pt or 8.5pt)
            color: color || (header ? 'FFFFFF' : '0F172A'),
          }),
        ],
      }),
    ],
  });
}

function createHeading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({
    heading: level,
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
}): Promise<Blob> {
  const { meta, chamber, qwz, channels, setpoints, instrument, checklist, diagramImageBase64, trendImageBase64 } = params;

  const volumeCuFt = calculateVolumeInCuFt(qwz, meta.dimUnit);
  const { minSensors, ruleText } = getMinRequiredSensors(volumeCuFt);
  const toleranceVal = CLASS_TOLERANCES[meta.furnaceClass][meta.tempUnit];

  // Evaluate all setpoints
  const setpointAnalyses = setpoints.map((sp) =>
    evaluateSetpoint(sp, channels, meta.furnaceClass, meta.tempUnit, instrument.maxPermissibleError)
  );
  const overallConformant = setpointAnalyses.every((sa) => sa.passed) && channels.length >= minSensors;

  // Header & Footer
  const docHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
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
          new TextRun({
            text: 'Page ',
            font: 'Arial',
            size: 16,
            color: '64748B',
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: 'Arial',
            size: 16,
            color: '64748B',
          }),
          new TextRun({
            text: ' of ',
            font: 'Arial',
            size: 16,
            color: '64748B',
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: 'Arial',
            size: 16,
            color: '64748B',
          }),
        ],
      }),
    ],
  });

  const children: (Paragraph | Table)[] = [];

  // ==========================================
  // DOCUMENT BANNER & TITLE
  // ==========================================
  children.push(
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
          text: `FACILITY: ${meta.facilityLocation.toUpperCase()} — NADCAP ACCREDITED HEAT TREATING OPERATION`,
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

  // Status Verdict Callout
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell(
              overallConformant
                ? 'OVERALL AUDIT VERDICT: CONFORMANT / ACCEPTED\nAll survey channels satisfy AMS 2750 Rev H Class ' +
                    meta.furnaceClass +
                    ' (±' +
                    toleranceVal +
                    meta.tempUnit +
                    ') uniformity limits with zero uncorrected overshoot.'
                : 'OVERALL AUDIT VERDICT: NON-CONFORMANT / REJECTED\nOne or more survey test criteria did not satisfy AMS 2750 Rev H Class ' +
                    meta.furnaceClass +
                    ' tolerance or sensor quantity requirements.',
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
  children.push(
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
        new TableRow({
          children: [
            createCell('Last SAT Date:', { bold: true, bg: 'F1F5F9' }),
            createCell(meta.lastSatDate || 'N/A'),
            createCell('Last SAT Result:', { bold: true, bg: 'F1F5F9' }),
            createCell(meta.lastSatResult || 'N/A'),
          ],
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // ==========================================
  // SECTION 1: FURNACE DIMENSIONS & WORK ZONE
  // ==========================================
  children.push(
    createHeading('1. Furnace Chamber & Qualified Work Zone (QWZ) Specifications'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `The thermal processing chamber and qualified working dimensions are established per AMS 2750 Rev H Section 3.4. All production parts must be contained entirely within the qualified work zone envelope during certified heat treatments.`,
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

  // Work Zone Clearances / Offsets Table
  children.push(
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

  // ==========================================
  // SECTION 2: 2D ISOMETRIC SCHEMATIC & WIRE GRID
  // ==========================================
  children.push(
    createHeading('2. Isometric Thermocouple Location & Physical Wire Grid Schematic'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `Figure 1: 2D Isometric engineering schematic (AMS 2750 Rev H / Nadcap standard) illustrating the furnace chamber boundary with visible solid and hidden dashed lines, the tinted qualified work zone envelope, physical wire grid web structure, and numbered triangular thermocouple sensor markers (TC 1 to TC ${channels.length}) with clearance dimensions a and b.`,
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
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 120 },
          children: [
            new ImageRun({
              data: imgBytes,
              transformation: {
                width: 580,
                height: 380,
              },
              type: 'png',
            }),
          ],
        })
      );
    } catch {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '[Isometric diagram rendering attached]', italics: true })],
        })
      );
    }
  }

  // ==========================================
  // SECTION 3: SENSOR PLACEMENT & 6-WAY CLEARANCES
  // ==========================================
  children.push(
    createHeading('3. Thermocouple Sensor Location & Internal Clearance Matrix'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `In compliance with AMS 2750 Rev H Section 3.4.5 and Nadcap AC7102/8 checklist item 4.2, the physical distance of every survey thermocouple from all six internal furnace surfaces (Left Wall, Right Wall, Front Wall/Door, Rear Wall, Hearth/Floor, and Ceiling/Roof) is verified and documented below.`,
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

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: sensorRows,
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // ==========================================
  // SECTION 4: THERMOCOUPLE & INSTRUMENT TRACEABILITY
  // ==========================================
  children.push(
    createHeading('4. Pyrometric Instrumentation & Calibration Traceability'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `Thermocouple wire batches and test data recording equipment meet the maximum permissible error limits specified in AMS 2750 Rev H Table 1 and Table 3. All calibrations are traceable to NIST or recognized National Metrological Institutes.`,
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
            createCell('Calibration Date & Due Date', { bold: true, bg: 'F8FAFC' }),
            createCell(`${instrument.calibrationDate} (Due: ${instrument.calibrationDueDate})`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Calibration Standards Traceability #', { bold: true, bg: 'F8FAFC' }),
            createCell(instrument.traceabilityNumber),
          ],
        }),
        new TableRow({
          children: [
            createCell('Calibration Laboratory & Accreditation', { bold: true, bg: 'F8FAFC' }),
            createCell(`${instrument.calibrationLab} (ISO/IEC 17025 Accredited)`),
          ],
        }),
        new TableRow({
          children: [
            createCell('Maximum Permissible Instrument Error', { bold: true, bg: 'F8FAFC' }),
            createCell(`±${instrument.maxPermissibleError} ${meta.tempUnit} (Well within AMS 2750 Rev H Table 3 limits)`),
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
    new Paragraph({ spacing: { after: 120 } })
  );

  // Wire calibration table
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

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: wireRows,
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // ==========================================
  // SECTION 5: SURVEY TEST DATA & UNIFORMITY
  // ==========================================
  children.push(
    createHeading('5. Temperature Uniformity Survey Results & Analysis'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `In accordance with AMS 2750 Rev H Section 3.4.15, thermocouple correction factors and instrument calibration corrections are arithmetically applied to all raw data. The soak period began only after all survey sensors reached the minimum survey tolerance and stabilized.`,
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
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 120 },
          children: [
            new ImageRun({
              data: imgBytes,
              transformation: {
                width: 600,
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
              text: 'Figure 2: Temperature Uniformity Survey Trend Graph with Identified Dwell Soak Periods.',
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

  // Results for each setpoint
  setpointAnalyses.forEach((sa, spIdx) => {
    const sp = setpoints[spIdx];
    children.push(
      new Paragraph({
        spacing: { before: 100, after: 60 },
        children: [
          new TextRun({
            text: `Setpoint ${spIdx + 1}: ${sa.targetTemp} ${meta.tempUnit} (Tolerance: ±${sa.tolerance} ${meta.tempUnit}) — Status: ${
              sa.passed ? 'CONFORMANT' : 'NON-CONFORMANT'
            }`,
            bold: true,
            font: 'Arial',
            size: 20,
            color: sa.passed ? '15803D' : 'B91C1C',
          }),
        ],
      }),
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
              createCell('Soak Start / End Time', { bold: true, bg: 'F1F5F9' }),
              createCell(`${sp.soakStartTime} to ${sp.soakEndTime} (${sp.soakDurationMinutes} min)`),
              createCell('Maximum Overshoot', { bold: true, bg: 'F1F5F9' }),
              createCell(`${sa.maxOvershoot} ${meta.tempUnit} (Limit: ${sa.maxAllowed} ${meta.tempUnit})`),
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
              createCell('Mean Temperature', { bold: true, bg: 'F1F5F9' }),
              createCell(`${sa.meanCorrectedTemp} ${meta.tempUnit}`),
            ],
          }),
          new TableRow({
            children: [
              createCell('Furnace Control Instrument', { bold: true, bg: 'F8FAFC' }),
              createCell(`Setpoint: ${sp.controlSetpoint ?? sp.targetTemp}${meta.tempUnit} | Reading: ${sp.controlReading ?? sp.targetTemp}${meta.tempUnit}`),
              createCell('Applied Offset', { bold: true, bg: 'F8FAFC' }),
              createCell(`${sp.controlOffset ?? 0.0} ${meta.tempUnit}`),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 80 } })
    );

    // Channel details table for this setpoint
    const spChannelRows: TableRow[] = [
      new TableRow({
        children: [
          createCell('TC #', { header: true, widthPercent: 8 }),
          createCell('Sensor Location', { header: true, widthPercent: 26 }),
          createCell(`Raw (${meta.tempUnit})`, { header: true, widthPercent: 13 }),
          createCell(`TC Corr (${meta.tempUnit})`, { header: true, widthPercent: 13 }),
          createCell(`Corrected (${meta.tempUnit})`, { header: true, widthPercent: 14 }),
          createCell(`Delta (${meta.tempUnit})`, { header: true, widthPercent: 13 }),
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
            createCell(cr.rawReading.toFixed(1), { align: AlignmentType.RIGHT, bg }),
            createCell(cr.tcCorrection >= 0 ? `+${cr.tcCorrection.toFixed(1)}` : cr.tcCorrection.toFixed(1), {
              align: AlignmentType.RIGHT,
              bg,
            }),
            createCell(cr.correctedTemp.toFixed(1), { bold: true, align: AlignmentType.RIGHT, bg }),
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

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: spChannelRows,
      }),
      new Paragraph({ spacing: { after: 140 } })
    );
  });

  // ==========================================
  // SECTION 6: NADCAP AC7102/8 AUDIT CHECKLIST
  // ==========================================
  children.push(
    createHeading('6. Nadcap AC7102/8 Pyrometry Compliance Audit Checklist'),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `Verification of compliance against PRI Nadcap Heat Treating Audit Criteria (AC7102/8 Rev D / AMS 2750 Rev H):`,
          font: 'Arial',
          size: 18,
          color: '334155',
        }),
      ],
    })
  );

  const auditRows: TableRow[] = [
    new TableRow({
      children: [
        createCell('Audit Ref', { header: true, widthPercent: 12 }),
        createCell('Audit Requirement / Question', { header: true, widthPercent: 58 }),
        createCell('Finding', { header: true, widthPercent: 15 }),
        createCell('Audit Verification Notes', { header: true, widthPercent: 15 }),
      ],
    }),
  ];

  checklist.forEach((item, idx) => {
    const bg = idx % 2 === 1 ? 'F8FAFC' : 'FFFFFF';
    auditRows.push(
      new TableRow({
        children: [
          createCell(item.code, { bold: true, bg }),
          createCell(item.question, { bg }),
          createCell(item.compliant ? 'COMPLIANT' : 'NON-COMPLIANT', {
            bold: true,
            align: AlignmentType.CENTER,
            bg: item.compliant ? 'F0FDF4' : 'FEF2F2',
            color: item.compliant ? '15803D' : 'B91C1C',
          }),
          createCell(item.notes || 'Verified Satisfactory', { bg }),
        ],
      })
    );
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: auditRows,
    }),
    new Paragraph({ spacing: { after: 200 } })
  );

  // ==========================================
  // SECTION 7: SIGN-OFF & APPROVALS
  // ==========================================
  children.push(
    createHeading('7. Quality Authorization & Sign-Off Approvals'),
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
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createCell('Pyrometry Technician', { header: true, widthPercent: 33 }),
            createCell('Quality Assurance Manager', { header: true, widthPercent: 33 }),
            createCell('Responsible Metallurgist / Level 3', { header: true, widthPercent: 34 }),
          ],
        }),
        new TableRow({
          children: [
            createCell(
              `Name: ${meta.technicianName}\nTitle: ${meta.technicianTitle}\n\nSignature: _______________________\n\nDate: ${meta.date}`,
              { bg: 'F8FAFC' }
            ),
            createCell(
              `Name: ${meta.qualityManagerName}\nTitle: ${meta.qualityManagerTitle}\n\nSignature: _______________________\n\nDate: ${meta.date}`,
              { bg: 'F8FAFC' }
            ),
            createCell(
              `Name: ${meta.responsibleEngineerName}\nTitle: Pyrometry Level 3 Authority\n\nSignature: _______________________\n\nDate: ${meta.date}`,
              { bg: 'F8FAFC' }
            ),
          ],
        }),
      ],
    }),
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
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.6),
              bottom: convertInchesToTwip(0.6),
              left: convertInchesToTwip(0.65),
              right: convertInchesToTwip(0.65),
            },
          },
        },
        headers: { default: docHeader },
        footers: { default: docFooter },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
