/**
 * Owner home, first thing on the page (docs/V12-SPEC.md §1): the quick actions
 * حركة جديدة · تسجيل دفعة (→ المستحقات, where every unpaid instalment has its
 * own «تسجيل دفعة»). «تسجيل حضور» joins in v1.2b CP2. Links, not buttons —
 * each one navigates. Equal columns for however many there are.
 */
import { LinkButton } from "@/components/LinkButton";
import { CalendarIcon } from "@/components/navIcons";
import { PlusIcon } from "@/components/icons";
import { t } from "@/i18n/ar";

export function QuickActions() {
  return (
    <section aria-label={t.quickActions.title} className="grid auto-cols-fr grid-flow-col gap-2">
      <LinkButton href="/owner/transactions/new" className="text-center">
        <PlusIcon size={18} />
        {t.quickActions.newEntry}
      </LinkButton>
      <LinkButton href="/owner/dues" variant="secondary" className="text-center">
        <CalendarIcon size={18} />
        {t.quickActions.recordPayment}
      </LinkButton>
    </section>
  );
}
