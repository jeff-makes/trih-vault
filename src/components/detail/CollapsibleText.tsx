"use client";

import { useState } from "react";

import styles from "./CollapsibleText.module.css";

export interface CollapsibleTextProps {
  text: string;
  collapsedLines?: number;
  className?: string;
}

const classNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export function CollapsibleText({ text, collapsedLines = 6, className }: CollapsibleTextProps): JSX.Element {
  const [isExpanded, setExpanded] = useState(false);
  const shouldCollapse = text.split(/\n+/).length > collapsedLines || text.length > 400;
  const displayText = text.split(/\n+/).map((paragraph, index) => (
    <p key={index}>{paragraph}</p>
  ));

  return (
    <div className={classNames(styles.container, className)}>
      <div className={classNames(!isExpanded && shouldCollapse && styles.collapsed)}>{displayText}</div>
      {shouldCollapse ? (
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => setExpanded((value) => !value)}
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

export default CollapsibleText;
