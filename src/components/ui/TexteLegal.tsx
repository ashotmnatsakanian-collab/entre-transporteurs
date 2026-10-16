export function Titre({ children, maj }: { children: React.ReactNode; maj?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-slate-900">{children}</h1>
      {maj && <p className="text-xs text-slate-400 mt-2">Dernière mise à jour : {maj}</p>}
    </div>
  )
}

export function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">{titre}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export function Liste({ elements }: { elements: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {elements.map((e, i) => <li key={i}>{e}</li>)}
    </ul>
  )
}
