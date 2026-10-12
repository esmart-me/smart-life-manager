"use client";

import React, { useState } from "react";
import { useCustomTheme } from "@/lib/theme/theme-context";
import { ThemeId, THEMES } from "@/lib/theme/types";
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Layers,
  Palette,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CustomThemeSelector() {
  const { theme, setTheme, resetTheme } = useCustomTheme();
  const [justChanged, setJustChanged] = useState<string | null>(null);

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    const selectedConfig = THEMES.find((t) => t.id === id);
    setJustChanged(selectedConfig?.name || id);
    setTimeout(() => {
      setJustChanged(null);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Notification Banner */}
      {justChanged && (
        <div className="p-3.5 rounded-2xl glass-card border-theme-accent bg-theme-accent-subtle text-theme-accent text-xs flex items-center justify-between gap-3 animate-fade-in shadow-theme-glow">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-theme-accent shrink-0 animate-checkmark-pop" />
            <span>Theme applied: {justChanged}</span>
          </div>
          <span className="text-[11px] opacity-80">Saved persistently</span>
        </div>
      )}

      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-theme-accent" />
            <span>Custom Theme & Liquid Glass</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select your preferred visual atmosphere. Surfaces, navigation, and accents update instantly across the entire application.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetTheme}
          className="self-start sm:self-auto text-xs gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Default</span>
        </Button>
      </div>

      {/* 4 Theme Preview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {THEMES.map((item) => {
          const isSelected = theme === item.id;
          const { preview } = item;

          return (
            <div
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`group relative rounded-2xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden active:scale-[0.99] ${
                isSelected
                  ? "glass-card border-theme-accent shadow-theme-glow ring-2 ring-theme-accent/25"
                  : "glass-card border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md"
              }`}
            >
              <div>
                {/* Header Info */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.name}
                      </h4>
                      {item.id === "liquid-clear" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-theme-accent-subtle text-theme-accent border border-theme-accent/30 uppercase tracking-wide">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                      {item.tagline}
                    </span>
                  </div>

                  {/* Radio / Selection Indicator */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "bg-theme-accent text-white shadow-xs"
                        : "border border-slate-300 dark:border-white/20 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Real Visual Preview Box */}
                <div
                  className="rounded-xl p-3.5 mb-4 border transition-all duration-200 shadow-inner relative overflow-hidden"
                  style={{
                    backgroundColor: preview.bg,
                    borderColor: preview.cardBorder,
                  }}
                >
                  {/* Atmospheric Glow in Preview */}
                  <div
                    className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-xl opacity-30 pointer-events-none"
                    style={{ backgroundColor: preview.accent }}
                  />

                  {/* Mini Translucent Glass Card inside Preview */}
                  <div
                    className="rounded-lg p-3 border backdrop-blur-md relative z-10 space-y-2 shadow-xs"
                    style={{
                      backgroundColor: preview.cardBg,
                      borderColor: preview.cardBorder,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: preview.accent }}
                        />
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: preview.textColor }}
                        >
                          Smart Life Card
                        </span>
                      </div>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold border"
                        style={{
                          backgroundColor: `${preview.accent}20`,
                          color: preview.accent,
                          borderColor: `${preview.accent}40`,
                        }}
                      >
                        {item.accentName}
                      </span>
                    </div>

                    <p
                      className="text-[10px] leading-tight"
                      style={{ color: preview.subtextColor }}
                    >
                      Translucent surface with layered depth and specular highlights.
                    </p>

                    {/* Mini Sample Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <div
                        className="px-2.5 py-1 rounded-md text-[10px] font-bold shadow-xs select-none"
                        style={{
                          backgroundColor: preview.accent,
                          color: preview.accentText,
                        }}
                      >
                        Action
                      </div>
                      <div
                        className="px-2.5 py-1 rounded-md text-[10px] font-medium border select-none"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                          borderColor: preview.cardBorder,
                          color: preview.textColor,
                        }}
                      >
                        Glass
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description Text */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  {item.description}
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Mode: <strong className="capitalize text-slate-700 dark:text-slate-200">{item.mode}</strong>
                </span>

                <Button
                  type="button"
                  size="sm"
                  variant={isSelected ? "accent" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(item.id);
                  }}
                  className="text-xs font-semibold px-3 py-1"
                >
                  {isSelected ? "Active Theme" : "Apply Theme"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assurance Footer */}
      <div className="p-4 rounded-xl glass-subtle border border-slate-200/80 dark:border-white/10 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <Layers className="w-4 h-4 text-theme-accent shrink-0" />
        <p>
          Your selected theme persists on this device across page refreshes, account logins, and Electron application restarts.
        </p>
      </div>
    </div>
  );
}
