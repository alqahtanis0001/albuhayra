/**
 * Table primitives. Everything is `text-start`: a plain `text-left` would break
 * RTL. Wrap in <Table> for horizontal scrolling on narrow screens; the ledger
 * uses stacked cards instead of a table on mobile.
 */
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

export function Table({
  caption,
  head,
  children,
  className = "",
}: {
  /** Visually hidden table caption — screen readers announce it. */
  caption?: string;
  head?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full border-collapse text-sm ${className}`}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {head ? <thead className="bg-gray-50">{head}</thead> : null}
        {children}
      </table>
    </div>
  );
}

export function Tr({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={`border-b border-gray-200 ${className}`}>{children}</tr>;
}

export function Th({
  children,
  className = "",
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-start font-semibold text-gray-700 ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td className={`px-3 py-2 text-start align-middle ${className}`} {...rest}>
      {children}
    </td>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

/** Totals row for the current filter — bold, no bottom border. */
export function TFoot({ children }: { children: ReactNode }) {
  return <tfoot className="bg-gray-50 font-semibold">{children}</tfoot>;
}

export default Table;
