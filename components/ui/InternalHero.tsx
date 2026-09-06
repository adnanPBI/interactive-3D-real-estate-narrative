export function InternalHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <header className="internal-hero">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{intro}</p>
    </header>
  );
}
