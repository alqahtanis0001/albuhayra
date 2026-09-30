/**
 * Renders an i18n template whose `{key}` placeholders are nodes — an amount, a
 * date — rather than strings, e.g. «{spent} من {budget}», «من اليوم حتى
 * {date}». Keeps the Arabic in src/i18n and the formatting in the components.
 */
import { Fragment, type ReactNode } from "react";

export function fillTemplate(template: string, nodes: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{key && key in nodes ? nodes[key] : part}</Fragment>;
  });
}
