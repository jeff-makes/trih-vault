import { type ReactNode } from "react";

import styles from "./QuickFacts.module.css";

export interface QuickFactsItem {
  term: string;
  detail: ReactNode;
}

export interface QuickFactsProps {
  heading?: ReactNode;
  items: QuickFactsItem[];
  columns?: 1 | 2;
  className?: string;
}

const classNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export function QuickFacts({ heading, items, columns = 1, className }: QuickFactsProps): JSX.Element {
  const listClass = classNames(styles.list, columns === 2 && styles.listTwoColumn);

  return (
    <section className={classNames(styles.container, className)}>
      {heading ? heading : null}
      <dl className={listClass}>
        {items.map((item) => (
          <div key={item.term} className={styles.item}>
            <dt className={styles.term}>{item.term}</dt>
            <dd className={styles.detail}>{item.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default QuickFacts;
