import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CompetitorDetail } from "../types";

type Props = {
  value: CompetitorDetail[];
  onChange: (competitors: CompetitorDetail[]) => void;
};

export default function CompetitorEditor({ value, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [newWeakness, setNewWeakness] = useState("");
  const [newAdvantage, setNewAdvantage] = useState("");

  const add = () => {
    if (!newName.trim()) return;
    onChange([
      ...value,
      { name: newName.trim(), weakness: newWeakness.trim(), our_advantage: newAdvantage.trim() },
    ]);
    setNewName("");
    setNewWeakness("");
    setNewAdvantage("");
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateField = (idx: number, field: keyof CompetitorDetail, fieldValue: string) => {
    const updated = [...value];
    updated[idx] = { ...updated[idx], [field]: fieldValue };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Competitor Details
      </h3>

      {value.map((comp, idx) => (
        <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-start">
            <input
              className="form-input flex-1 text-sm bg-slate-950 border-slate-700 rounded px-2 py-1 text-slate-200"
              value={comp.name}
              onChange={(e) => updateField(idx, "name", e.target.value)}
              placeholder="Competitor name"
            />
            <button
              onClick={() => remove(idx)}
              className="ml-2 p-1 text-slate-600 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Weaknesses</label>
              <input
                className="form-input w-full text-xs bg-slate-950 border-slate-700 rounded px-2 py-1 text-slate-300"
                value={comp.weakness}
                onChange={(e) => updateField(idx, "weakness", e.target.value)}
                placeholder="e.g. high pricing"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">Our Advantage</label>
              <input
                className="form-input w-full text-xs bg-slate-950 border-slate-700 rounded px-2 py-1 text-slate-300"
                value={comp.our_advantage}
                onChange={(e) => updateField(idx, "our_advantage", e.target.value)}
                placeholder="e.g. faster onboarding"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="bg-slate-900/30 border border-dashed border-slate-700 rounded-lg p-3 space-y-2">
        <input
          className="form-input w-full text-sm bg-slate-950 border-slate-700 rounded px-2 py-1 text-slate-200"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Competitor name"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="form-input w-full text-xs bg-slate-950 border-slate-700 rounded px-2 py-1 text-slate-300"
            value={newWeakness}
            onChange={(e) => setNewWeakness(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Weakness"
          />
          <input
            className="form-input w-full text-xs bg-slate-950 border-slate-700 rounded px-2 py-1 text-slate-300"
            value={newAdvantage}
            onChange={(e) => setNewAdvantage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Our advantage"
          />
        </div>
        <button
          onClick={add}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <Plus size={12} /> Add Competitor
        </button>
      </div>
    </div>
  );
}
