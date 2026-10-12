"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function PageTransitionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="animate-page-enter w-full h-full min-w-0"
    >
      {children}
    </div>
  );
}
