import Link from "next/link";
import { type ReactNode } from "react";

import styles from "./RelatedRow.module.css";

export interface RelatedItem {
  href: string;
  title: string;
  meta?: string;
  description?: ReactNode;
}

export interface RelatedRowProps {
  title: string;
  action?: ReactNode;
  items: RelatedItem[];
  className?: string;
}

const classNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export function RelatedRow({ title, action, items, className }: RelatedRowProps): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={classNames(styles.section, className)}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {action ?? null}
      </div>
      <div className={styles.list}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={styles.itemLink}>
            <span className={styles.itemTitle}>{item.title}</span>
            {item.meta ? <span className={styles.itemMeta}>{item.meta}</span> : null}
            {item.description ?? null}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default RelatedRow;
