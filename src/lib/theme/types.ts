export type ThemeId =
  | "liquid-clear"
  | "emerald-white"
  | "emerald-black"
  | "crimson-black";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  mode: "dark" | "light";
  accentColor: string;
  accentName: string;
  backgroundClass: string;
  preview: {
    bg: string;
    cardBg: string;
    cardBorder: string;
    accent: string;
    accentText: string;
    textColor: string;
    subtextColor: string;
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: "liquid-clear",
    name: "Liquid Glass Clear",
    tagline: "Apple-Inspired Liquid Glass",
    description: "Frosted translucent glass, floating navigation, and neutral obsidian depth with restrained emerald highlights.",
    mode: "dark",
    accentColor: "#10B981",
    accentName: "Emerald",
    backgroundClass: "bg-[#090D14]",
    preview: {
      bg: "#090D14",
      cardBg: "rgba(17, 24, 38, 0.70)",
      cardBorder: "rgba(255, 255, 255, 0.12)",
      accent: "#10B981",
      accentText: "#FFFFFF",
      textColor: "#F8FAFC",
      subtextColor: "#94A3B8",
    },
  },
  {
    id: "emerald-white",
    name: "Emerald & White",
    tagline: "Crisp & High-Readability Light",
    description: "Clean white and soft-grey background with luminous emerald accent lines, active states, and light translucent cards.",
    mode: "light",
    accentColor: "#059669",
    accentName: "Emerald",
    backgroundClass: "bg-[#F8FAFC]",
    preview: {
      bg: "#F8FAFC",
      cardBg: "rgba(255, 255, 255, 0.90)",
      cardBorder: "rgba(226, 232, 240, 0.90)",
      accent: "#059669",
      accentText: "#FFFFFF",
      textColor: "#0F172A",
      subtextColor: "#475569",
    },
  },
  {
    id: "emerald-black",
    name: "Emerald & Black",
    tagline: "Deep Charcoal & Emerald Sheen",
    description: "Pure dark obsidian canvas with layered emerald-green glass borders, subtle green ambient glow, and selected states.",
    mode: "dark",
    accentColor: "#10B981",
    accentName: "Emerald",
    backgroundClass: "bg-[#06090B]",
    preview: {
      bg: "#06090B",
      cardBg: "rgba(14, 21, 25, 0.75)",
      cardBorder: "rgba(16, 185, 129, 0.25)",
      accent: "#10B981",
      accentText: "#FFFFFF",
      textColor: "#F9FAFB",
      subtextColor: "#9CA3AF",
    },
  },
  {
    id: "crimson-black",
    name: "Crimson & Black",
    tagline: "Deep Charcoal & Controlled Crimson Glow",
    description: "Sophisticated deep black canvas with frosted glass panels, refined crimson-red accent lines, and smooth transitions.",
    mode: "dark",
    accentColor: "#E11D48",
    accentName: "Crimson",
    backgroundClass: "bg-[#080A0C]",
    preview: {
      bg: "#080A0C",
      cardBg: "rgba(18, 20, 26, 0.75)",
      cardBorder: "rgba(225, 29, 72, 0.28)",
      accent: "#E11D48",
      accentText: "#FFFFFF",
      textColor: "#F9FAFB",
      subtextColor: "#9CA3AF",
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "liquid-clear";
