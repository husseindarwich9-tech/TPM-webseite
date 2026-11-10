// Ablauf in fünf Schritten als gestapelte Karten (React Bits: ScrollStack).
// Lenis übernimmt das weiche Scrollen, deshalb ist das eigene Glätten der Komponente aus.
import ScrollStack, { ScrollStackItem } from '../../react-bits/ScrollStack';

interface Schritt {
  titel: string;
  text: string;
}

interface Props {
  schritte: Schritt[];
}

export default function AblaufStack({ schritte }: Props) {
  return (
    <ScrollStack
      useWindowScroll
      smoothScroll={false}
      itemDistance={64}
      itemStackDistance={18}
      stackPosition="22%"
      itemScale={0.04}
      baseScale={0.88}
      dimAmount={0.12}
      holdDistance={80}
      className="ablauf-stack"
    >
      {schritte.map((s, i) => (
        <ScrollStackItem key={s.titel} itemClassName={`ablauf-card ablauf-card--${i % 2 ? 'b' : 'a'}`}>
          <span className="ablauf-card__nr">{String(i + 1).padStart(2, '0')}</span>
          <div className="ablauf-card__body">
            <h3 className="ablauf-card__title">{s.titel}</h3>
            <p className="ablauf-card__text">{s.text}</p>
          </div>
          <span className="ablauf-card__of" aria-hidden="true">
            Schritt {i + 1} / {schritte.length}
          </span>
        </ScrollStackItem>
      ))}
    </ScrollStack>
  );
}
