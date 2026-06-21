import { BrandVoiceScale } from "../types";

type Props = {
  value: BrandVoiceScale;
  onChange: (scale: BrandVoiceScale) => void;
};

const DIMENSIONS: { key: keyof BrandVoiceScale; label: string; desc: string }[] = [
  { key: "humor", label: "Humor", desc: "Use of humor and informal language" },
  { key: "professionalism", label: "Professionalism", desc: "Corporate and formal tone level" },
  { key: "technical_terms", label: "Technical Terms", desc: "Industry-specific jargon usage" },
  { key: "provocative", label: "Provocative", desc: "Bold, boundary-pushing language" },
];

export default function BrandVoiceSliders({ value, onChange }: Props) {
  const update = (key: keyof BrandVoiceScale, newVal: number) => {
    onChange({ ...value, [key]: newVal });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Brand Voice Scale (1-10)
      </h3>
      {DIMENSIONS.map((dim) => {
        const current = value?.[dim.key] ?? 5;
        const pct = ((current - 1) / 9) * 100;
        return (
          <div key={dim.key} className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">{dim.label}</span>
              <span className="text-xs font-mono text-blue-400">{current}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={current}
              onChange={(e) => update(dim.key, Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-slate-800 cursor-pointer"
              style={{
                background: `linear-gradient(to right, #2563eb ${pct}%, #1e293b ${pct}%)`,
              }}
            />
            <p className="text-[10px] text-slate-600">{dim.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
