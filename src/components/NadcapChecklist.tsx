import React from 'react';
import {
  NadcapCheckItem,
  TestInstrument,
  SurveyMetadata,
  DimUnit,
  TempUnit,
} from '../types/tus';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCheck,
  PenTool,
  Wrench,
  Award,
} from 'lucide-react';

interface NadcapChecklistProps {
  checklist: NadcapCheckItem[];
  instrument: TestInstrument;
  meta: SurveyMetadata;
  onUpdateChecklist: (items: NadcapCheckItem[]) => void;
  onUpdateInstrument: (inst: TestInstrument) => void;
  onUpdateMeta: (meta: SurveyMetadata) => void;
}

export const NadcapChecklist: React.FC<NadcapChecklistProps> = ({
  checklist,
  instrument,
  meta,
  onUpdateChecklist,
  onUpdateInstrument,
  onUpdateMeta,
}) => {
  const toggleCheck = (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, compliant: !item.compliant } : item
    );
    onUpdateChecklist(updated);
  };

  const updateNotes = (id: string, notes: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, notes } : item
    );
    onUpdateChecklist(updated);
  };

  const allCompliant = checklist.every((i) => i.compliant);

  return (
    <div className="space-y-6">
      {/* Nadcap Compliance Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-950/80 border border-cyan-800/60 rounded-xl text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">
              PRI Nadcap AC7102/8 Rev D & AMS 2750 Rev H Audit Verification
            </h3>
            <p className="text-xs text-slate-400">
              Mandatory pyrometry audit checklist items for Nadcap heat treating accreditation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center gap-1.5 ${
              allCompliant
                ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300'
                : 'bg-amber-950/80 border-amber-700/80 text-amber-300'
            }`}
          >
            {allCompliant ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>ALL NADCAP AUDIT ITEMS SATISFIED</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-amber-400" />
                <span>PENDING AUDIT ITEMS</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Audit Checklist Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            Audit Criteria Verification Matrix
          </span>
          <span className="text-xs text-slate-500">Click finding pill to toggle status</span>
        </div>
        <div className="divide-y divide-slate-800/60">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {item.code}
                  </span>
                  <span className="text-xs font-medium text-slate-200">{item.question}</span>
                </div>
                <div className="pt-1">
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateNotes(item.id, e.target.value)}
                    placeholder="Auditor verification notes..."
                    className="w-full bg-slate-950/60 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                <button
                  onClick={() => toggleCheck(item.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold font-mono transition-all cursor-pointer ${
                    item.compliant
                      ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 hover:bg-emerald-900/60'
                      : 'bg-red-950/80 border-red-700 text-red-300 hover:bg-red-900/60'
                  }`}
                >
                  {item.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Recorder & Metrology Instrumentation Details */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Wrench className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-slate-100 text-sm">
            TUS Test Data Recorder & Calibration Traceability
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Recorder Manufacturer
            </label>
            <input
              type="text"
              value={instrument.manufacturer}
              onChange={(e) =>
                onUpdateInstrument({ ...instrument, manufacturer: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Instrument Model
            </label>
            <input
              type="text"
              value={instrument.model}
              onChange={(e) => onUpdateInstrument({ ...instrument, model: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Instrument Serial Number
            </label>
            <input
              type="text"
              value={instrument.serialNumber}
              onChange={(e) =>
                onUpdateInstrument({ ...instrument, serialNumber: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Calibration Date
            </label>
            <input
              type="date"
              value={instrument.calibrationDate}
              onChange={(e) =>
                onUpdateInstrument({ ...instrument, calibrationDate: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Calibration Due Date
            </label>
            <input
              type="date"
              value={instrument.calibrationDueDate}
              onChange={(e) =>
                onUpdateInstrument({ ...instrument, calibrationDueDate: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Standards Traceability # (NIST)
            </label>
            <input
              type="text"
              value={instrument.traceabilityNumber}
              onChange={(e) =>
                onUpdateInstrument({ ...instrument, traceabilityNumber: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Accredited Cal Laboratory
            </label>
            <input
              type="text"
              value={instrument.calibrationLab}
              onChange={(e) =>
                onUpdateInstrument({ ...instrument, calibrationLab: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Max Permissible Error (AMS 2750 Table 7)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.05"
                value={instrument.maxPermissibleError}
                onChange={(e) =>
                  onUpdateInstrument({
                    ...instrument,
                    maxPermissibleError: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="absolute right-3 top-1.5 text-xs text-slate-500">
                {meta.tempUnit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Data Logging Interval (Sec)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="120"
                value={meta.dataIntervalSeconds || ''}
                onChange={(e) =>
                  onUpdateMeta({
                    ...meta,
                    dataIntervalSeconds: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="Auto-detected on CSV import..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="absolute right-3 top-1.5 text-xs text-slate-500">
                sec (max 120s)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Sign-Off Approvals */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <PenTool className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-slate-100 text-sm">
            Formal Pyrometry & Quality Assurance Sign-Off Authority
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-300">Pyrometry Technician</div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={meta.technicianName}
                onChange={(e) => onUpdateMeta({ ...meta, technicianName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Title / Certification</label>
              <input
                type="text"
                value={meta.technicianTitle}
                onChange={(e) => onUpdateMeta({ ...meta, technicianTitle: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-300">Quality Assurance Manager</div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={meta.qualityManagerName}
                onChange={(e) => onUpdateMeta({ ...meta, qualityManagerName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Title</label>
              <input
                type="text"
                value={meta.qualityManagerTitle}
                onChange={(e) => onUpdateMeta({ ...meta, qualityManagerTitle: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-300">Responsible Metallurgist / Level 3</div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                value={meta.responsibleEngineerName}
                onChange={(e) =>
                  onUpdateMeta({ ...meta, responsibleEngineerName: e.target.value })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Authority Role</label>
              <input
                type="text"
                readOnly
                value="Pyrometry Level 3 Authority"
                className="w-full bg-slate-900/40 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
