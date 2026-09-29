import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { homePathFor } from "@/lib/permissions";

// Sends a signed-in user to their role's home; everyone else to the login page.
export default async function RootPage() {
  const session = await getSession();
  if (!session.userId || !session.role) redirect("/login");
  redirect(homePathFor(session.role));
}
