/**
 * v1.4 C6 — the top banner of `/owner/plans?pick=payment`: the owner came from
 * «تسجيل دفعة» and every card below lands where a payment is recorded.
 */
import { t } from "@/i18n/ar";

export function PaymentPickBanner() {
  return (
    <p role="status" className="no-print rounded-xl border border-accent-line bg-accent-soft p-3 text-sm font-medium text-accent-dark">
      {t.openPlan.pickBanner}
    </p>
  );
}

export default PaymentPickBanner;
