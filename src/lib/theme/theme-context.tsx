"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ThemeId, ThemeConfig, THEMES, DEFAULT_THEME_ID } from "./types";

interface CustomThemeContextValue {
  theme: ThemeId;
  themeConfig: ThemeConfig;
  allThemes: ThemeConfig[];
  setTheme: (theme: ThemeId) => void;
  resetTheme: () => void;
}

const STORAGE_KEY = "slm-custom-theme";

const CustomThemeContext = createContext<CustomThemeContextValue | null>(null);

function applyThemeToDOM(themeId: ThemeId) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const config = THEMES.find((t) => t.id === themeId) || THEMES[0];

  // Set the data-theme attribute
  root.setAttribute("data-theme", themeId);

  // Synchronize dark/light class for Tailwind and standard elements
  if (config.mode === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }

  // Smooth brief transition flag
  root.classList.add("theme-transitioning");
  if (document.body) {
    document.body.classList.add("theme-transitioning");
  }
  setTimeout(() => {
    root.classList.remove("theme-transitioning");
    if (document.body) {
      document.body.classList.remove("theme-transitioning");
    }
  }, 350);
}

export function CustomThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME_ID,
}: {
  children: React.ReactNode;
  defaultTheme?: ThemeId;
}) {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check saved theme in localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES.some((t) => t.id === saved)) {
        setCurrentTheme(saved);
        applyThemeToDOM(saved);
        return;
      }
    } catch {
      // Fallback
    }

    // Default application
    applyThemeToDOM(defaultTheme);
  }, [defaultTheme]);

  const setTheme = useCallback((newTheme: ThemeId) => {
    if (!THEMES.some((t) => t.id === newTheme)) return;

    setCurrentTheme(newTheme);
    applyThemeToDOM(newTheme);

    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      // Also update cookie for SSR hint if needed
      document.cookie = `slm-custom-theme=${newTheme};path=/;max-age=31536000;SameSite=Lax`;
    } catch {
      // Ignore
    }

    // Optional background sync with user settings endpoint if logged in
    fetch("/api/user/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {
      // Non-blocking
    });
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME_ID);
  }, [setTheme]);

  const activeConfig = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <CustomThemeContext.Provider
      value={{
        theme: currentTheme,
        themeConfig: activeConfig,
        allThemes: THEMES,
        setTheme,
        resetTheme,
      }}
    >
      {children}
    </CustomThemeContext.Provider>
  );
}

export function useCustomTheme(): CustomThemeContextValue {
  const context = useContext(CustomThemeContext);
  if (!context) {
    // Return a safe fallback if accessed outside provider
    const defaultConfig = THEMES[0];
    return {
      theme: DEFAULT_THEME_ID,
      themeConfig: defaultConfig,
      allThemes: THEMES,
      setTheme: () => {},
      resetTheme: () => {},
    };
  }
  return context;
}
