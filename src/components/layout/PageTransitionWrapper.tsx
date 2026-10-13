"use client";

import React from "react";

export function PageTransitionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="animate-page-enter w-full h-full min-w-0">
      {children}
    </div>
  );
}
