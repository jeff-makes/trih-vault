import Link from "next/link";
import { type ReactNode } from "react";

import styles from "./PillLink.module.css";

type PillVariant = "default" | "people" | "places" | "series" | "episode" | "topics";

export interface PillLinkProps {
  href: string;
  children: ReactNode;
  variant?: PillVariant;
  icon?: ReactNode;
  className?: string;
  title?: string;
}

const classNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export function PillLink({ href, children, variant = "default", icon, className, title }: PillLinkProps): JSX.Element {
  const variantClass = variant !== "default" ? styles[`pill--${variant}` as keyof typeof styles] : undefined;

  return (
    <Link href={href} className={classNames(styles.pill, variantClass, className)} title={title}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span>{children}</span>
    </Link>
  );
}

export default PillLink;
