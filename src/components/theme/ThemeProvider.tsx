"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { CustomThemeProvider } from "@/lib/theme/theme-context";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <CustomThemeProvider defaultTheme="liquid-clear">
        {children}
      </CustomThemeProvider>
    </NextThemesProvider>
  );
}
