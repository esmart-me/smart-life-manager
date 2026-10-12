import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] dark:bg-[#07130F] text-[#141E19] dark:text-[#E8ECE9] antialiased selection:bg-[#063B2E] selection:text-[#FAF7F2]">
      {children}
    </div>
  );
}
