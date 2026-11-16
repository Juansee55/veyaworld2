import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsvImporter } from "@/components/admin/CsvImporter";
import { getImportAccess } from "@/lib/import/import.functions";

const accessQuery = queryOptions({ queryKey: ["csv-import-access"], queryFn: () => getImportAccess(), staleTime: 0 });

export const Route = createFileRoute("/_authenticated/admin-import")({
  head: () => ({ meta: [
    { title: "Admin CSV Import — Veya World" },
    { name: "description", content: "Securely restore exported Veya World players, users, gangs and chat with original IDs and validation reports." },
    { property: "og:title", content: "Admin CSV Import — Veya World" },
    { property: "og:description", content: "Securely restore exported Veya World players, users, gangs and chat with original IDs and validation reports." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accessQuery),
  component: ImportPage,
});

function ImportPage() {
  const { data } = useSuspenseQuery(accessQuery);
  return <main className="min-h-[100dvh] bg-background px-4 py-6 text-foreground sm:px-8">
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><ShieldCheck className="size-7 text-primary" /><span className="text-xl text-primary">Veya World / Admin</span></div><Button asChild variant="outline"><Link to="/play"><ArrowLeft />Back to world</Link></Button></header>
      <h1 className="mb-6 text-3xl">CSV import</h1>
      {data.allowed ? <CsvImporter /> : <p role="alert" className="text-lg text-destructive">Only admins can import records.</p>}
    </div>
  </main>;
}