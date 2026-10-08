import { Suspense } from "react";
import { FabricDashboard } from "@/components/fabrics/FabricDashboard";
import { Loader2 } from "lucide-react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <FabricDashboard />
    </Suspense>
  );
}
