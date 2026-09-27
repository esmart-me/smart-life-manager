import { requireUser } from "@/lib/auth/session";
import { GlobalSearchPageClient } from "@/components/search/GlobalSearchPageClient";

export default async function SearchPage() {
  await requireUser();

  return <GlobalSearchPageClient />;
}
