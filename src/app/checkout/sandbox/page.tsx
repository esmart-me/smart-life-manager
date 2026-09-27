import { Suspense } from "react";
import { SandboxCheckoutClient } from "@/components/checkout/SandboxCheckoutClient";

export const metadata = {
  title: "Stripe Test Checkout | Smart Life Manager",
};

export default function SandboxCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white text-xs">
          Loading test checkout...
        </div>
      }
    >
      <SandboxCheckoutClient />
    </Suspense>
  );
}
