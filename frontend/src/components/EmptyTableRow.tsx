import type { ReactNode } from "react";

interface Props {
  colSpan: number;
  children: ReactNode;
}

export function EmptyTableRow({ colSpan, children }: Props) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-sm text-neutral-500">
        {children}
      </td>
    </tr>
  );
}
