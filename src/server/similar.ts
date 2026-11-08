const STOP = new Set(
  'a an the is are was were be to of in on at for and or but not with when from this that it its i we my our cant cannot doesnt dont does do get gets got how why what can able use using used has have had'.split(' '),
)

export function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  )
}

/** Jaccard overlap, with a small boost when one title token-set contains the other. */
export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const union = a.size + b.size - inter
  const jaccard = inter / union
  const containment = inter / Math.min(a.size, b.size)
  return Math.max(jaccard, containment * 0.8)
}
