// Auftraggeber als Laufband (React Bits: LogoLoop). Es gibt bewusst nur Namen, keine Logos.
// Ohne Beschleunigung beim Scrollen: Das Band läuft gleichmäßig, egal wie schnell gescrollt wird.
// Unter der Maus läuft es langsamer weiter (zum Lesen), statt stehen zu bleiben; mit Tastaturfokus hält es an.
import LogoLoop from '../../react-bits/LogoLoop';

interface Props {
  namen: readonly string[];
}

export default function AuftraggeberLoop({ namen }: Props) {
  return (
    <LogoLoop
      logos={namen.map((n) => ({ node: <span className="client-name">{n}</span>, title: n, ariaLabel: n }))}
      speed={72}
      direction="left"
      logoHeight={34}
      gap={56}
      hoverSpeed={24}
      fadeOut
      fadeOutColor="#0a1626"
      ariaLabel="Auftraggeber als Laufband"
    />
  );
}
