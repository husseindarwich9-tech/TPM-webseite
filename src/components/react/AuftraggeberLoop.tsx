// Auftraggeber als Laufband (React Bits: LogoLoop). Es gibt bewusst nur Namen, keine Logos.
// Ohne Beschleunigung beim Scrollen: Das Band läuft gleichmäßig, egal wie schnell gescrollt wird.
import LogoLoop from '../../react-bits/LogoLoop';

interface Props {
  namen: readonly string[];
}

export default function AuftraggeberLoop({ namen }: Props) {
  return (
    <LogoLoop
      logos={namen.map((n) => ({ node: <span className="client-name">{n}</span>, title: n, ariaLabel: n }))}
      speed={38}
      direction="left"
      logoHeight={34}
      gap={56}
      pauseOnHover
      hoverSpeed={0}
      fadeOut
      fadeOutColor="#0a1626"
      ariaLabel="Auftraggeber als Laufband"
    />
  );
}
