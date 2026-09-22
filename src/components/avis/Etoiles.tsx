export function Etoiles({ note, taille = 'text-base' }: { note: number; taille?: string }) {
  const pleines = Math.round(note)
  return (
    <span className={`${taille} leading-none tracking-tight`} aria-label={`${note.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= pleines ? 'text-amber-400' : 'text-slate-200'}>★</span>
      ))}
    </span>
  )
}

export function BadgeNote({ moyenne, total }: { moyenne: number | null; total: number }) {
  if (!moyenne || total === 0) {
    return <span className="text-xs text-slate-400">Aucun avis</span>
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <Etoiles note={moyenne} taille="text-sm" />
      <span className="text-slate-500">{moyenne.toFixed(1)} ({total})</span>
    </span>
  )
}
