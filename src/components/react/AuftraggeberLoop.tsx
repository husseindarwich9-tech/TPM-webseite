// Auftraggeber als Laufband (React Bits: LogoLoop). Es gibt bewusst nur Namen, keine Logos.
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
      scrollBoost={0.4}
      ariaLabel="Auftraggeber als Laufband"
    />
  );
}
