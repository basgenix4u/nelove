function Star({ fill }) {
  return (
    <span className="star-wrap" aria-hidden>
      <svg className="star star-bg" viewBox="0 0 24 24">
        <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.45 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95L12 2.6z" />
      </svg>
      <svg className="star star-fg" style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }} viewBox="0 0 24 24">
        <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.45 6.2 20.5l1.1-6.47L2.6 9.45l6.5-.95L12 2.6z" />
      </svg>
    </span>
  )
}

/** Fractional star rating, 0–5. */
export default function Stars({ value = 0, size = 14 }) {
  return (
    <span className="stars" style={{ fontSize: size }} role="img" aria-label={`Rated ${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} fill={Math.max(0, Math.min(1, value - i))} />
      ))}
    </span>
  )
}
