type HeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function Header({ eyebrow, title, description, action }: HeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">{eyebrow}</p> : null}
        <h2 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
