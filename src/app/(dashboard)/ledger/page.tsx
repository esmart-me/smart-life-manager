import { redirect } from "next/navigation";

export default function LedgerPage() {
  redirect("/finance?tab=expenses");
}
