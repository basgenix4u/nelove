/** Shimmer placeholders while the catalogue loads — keeps layout stable (no CLS). */
export function ProductCardSkeleton() {
  return (
    <div className="card skeleton-card" aria-hidden>
      <div className="card-media sk-media"><span className="sk-shimmer" /></div>
      <div className="card-body">
        <span className="sk-line w40" />
        <span className="sk-line w80" />
        <span className="sk-line w60" />
        <span className="sk-line w50" style={{ height: 34, borderRadius: 10 }} />
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 8 }) {
  return (
    <div className="grid-products">
      {Array.from({ length: count }, (_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  )
}

export function FullPageSkeleton() {
  return (
    <main className="container" style={{ padding: '120px 20px 80px' }} aria-busy>
      <span className="sk-line w40" style={{ height: 44, marginBottom: 18 }} />
      <span className="sk-line w80" style={{ height: 15 }} />
      <div style={{ height: 28 }} />
      <GridSkeleton count={4} />
    </main>
  )
}
