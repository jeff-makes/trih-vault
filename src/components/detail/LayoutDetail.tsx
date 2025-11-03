import Link from "next/link";
import { type ReactNode } from "react";

import { PillLink } from "./PillLink";
import styles from "./LayoutDetail.module.css";

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface LayoutDetailProps {
  title: string;
  subtitle?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

const classNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export function LayoutDetail({ title, subtitle, breadcrumbs = [], meta, actions, children }: LayoutDetailProps): JSX.Element {
  return (
    <div className={styles.page}>
      {breadcrumbs.length > 0 ? (
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              <Link href={crumb.href}>{crumb.label}</Link>
            </span>
          ))}
        </nav>
      ) : null}

      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>{title}</h1>
        {subtitle ? <div className={styles.heroSubtitle}>{subtitle}</div> : null}
        {meta ? <div className={styles.metaRow}>{meta}</div> : null}
        {actions ? <div>{actions}</div> : null}
      </header>

      <main className={styles.content}>{children}</main>

      <footer className={styles.content}>
        <PillLink href="/" variant="series">
          ← Back to timeline
        </PillLink>
      </footer>
    </div>
  );
}

export default LayoutDetail;
