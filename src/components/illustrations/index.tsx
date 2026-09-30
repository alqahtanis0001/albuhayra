import type { ComponentType } from "react";

import { DuesArt } from "./DuesArt";
import { EmployeesArt } from "./EmployeesArt";
import { LedgerArt } from "./LedgerArt";
import { PartiesArt } from "./PartiesArt";
import { ProjectsArt } from "./ProjectsArt";
import { RemindersArt } from "./RemindersArt";

/** v1.3 item 15: the six empty-state drawings, keyed by `EmptyState`'s `kind`. */
export const ILLUSTRATIONS = {
  ledger: LedgerArt,
  parties: PartiesArt,
  dues: DuesArt,
  projects: ProjectsArt,
  employees: EmployeesArt,
  reminders: RemindersArt,
} satisfies Record<string, ComponentType>;

export type IllustrationKind = keyof typeof ILLUSTRATIONS;
