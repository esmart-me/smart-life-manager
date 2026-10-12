"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Bot,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Laptop,
  Globe,
  Trash2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface SystemConfig {
  geminiApiKeyConfigured: boolean;
  geminiApiKeyMasked: string | null;
  geminiModel: string;
  googleOAuthConfigured: boolean;
  googleClientId: string | null;
  googleClientSecretConfigured: boolean;
  googleDesktopClientId: string | null;
  googleDesktopClientSecretConfigured: boolean;
}

export function SystemSettingsClient() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Gemini Form State
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiStatusMsg, setGeminiStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Google OAuth Form State
  const [googleDesktopClientId, setGoogleDesktopClientId] = useState("");
  const [googleDesktopClientSecret, setGoogleDesktopClientSecret] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [isSavingGoogle, setIsSavingGoogle] = useState(false);
  const [googleStatusMsg, setGoogleStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/system/settings");
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (e) {
      console.error("Failed to load system config:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiStatusMsg(null);
    try {
      const res = await fetch("/api/admin/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_gemini",
          apiKey: geminiKeyInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeminiStatusMsg({ type: "success", text: data.message });
      } else {
        setGeminiStatusMsg({ type: "error", text: data.message || "Gemini connection test failed." });
      }
    } catch {
      setGeminiStatusMsg({ type: "error", text: "Network error occurred while testing Gemini." });
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKeyInput.trim()) return;

    setIsSavingGemini(true);
    setGeminiStatusMsg(null);

    try {
      const res = await fetch("/api/admin/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_gemini_key",
          apiKey: geminiKeyInput.trim(),
          testFirst: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setGeminiKeyInput("");
        setGeminiStatusMsg({ type: "success", text: "Gemini API key validated and saved successfully." });
      } else {
        setGeminiStatusMsg({ type: "error", text: data.error?.message || "Failed to save key." });
      }
    } catch {
      setGeminiStatusMsg({ type: "error", text: "Network error occurred." });
    } finally {
      setIsSavingGemini(false);
    }
  };

  const handleClearGemini = async () => {
    if (!confirm("Are you sure you want to remove the Gemini API key? Smart AI will become unavailable until reconfigured.")) {
      return;
    }

    setGeminiStatusMsg(null);
    try {
      const res = await fetch("/api/admin/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_gemini_key" }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setGeminiStatusMsg({ type: "success", text: "Gemini API key removed." });
      }
    } catch {
      setGeminiStatusMsg({ type: "error", text: "Failed to remove key." });
    }
  };

  const handleSaveGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGoogle(true);
    setGoogleStatusMsg(null);

    try {
      const res = await fetch("/api/admin/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_google_oauth",
          googleDesktopClientId: googleDesktopClientId || undefined,
          googleDesktopClientSecret: googleDesktopClientSecret || undefined,
          googleClientId: googleClientId || undefined,
          googleClientSecret: googleClientSecret || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setGoogleDesktopClientId("");
        setGoogleDesktopClientSecret("");
        setGoogleClientId("");
        setGoogleClientSecret("");
        setGoogleStatusMsg({ type: "success", text: "Google OAuth credentials updated successfully." });
      } else {
        setGoogleStatusMsg({ type: "error", text: data.error?.message || "Failed to update OAuth settings." });
      }
    } catch {
      setGoogleStatusMsg({ type: "error", text: "Network error occurred." });
    } finally {
      setIsSavingGoogle(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-indigo-400" />
          System & Service Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure production online integrations (Google Gemini AI and Google OAuth) safely from within the application.
        </p>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 gap-6">
        {/* Gemini AI Card */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    Google Gemini AI Configuration
                    <Badge variant={config?.geminiApiKeyConfigured ? "success" : "outline"}>
                      {config?.geminiApiKeyConfigured ? "Operational" : "Awaiting Key"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Powers the smart natural-language assistant, document analysis, and life event summaries.
                  </CardDescription>
                </div>
              </div>

              {config?.geminiApiKeyConfigured && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearGemini}
                  className="border-rose-900/50 text-rose-400 hover:bg-rose-950/40 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Remove Key
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Status Indicator Banner */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400">Active Model:</span>
                <p className="font-mono text-purple-300 font-semibold">{config?.geminiModel || "gemini-3.8-flash"}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400">Current Key:</span>
                <p className="font-mono text-slate-300 font-semibold">
                  {config?.geminiApiKeyMasked || "None (Not Configured)"}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400">Storage Location:</span>
                <p className="font-mono text-indigo-300 text-[11px]">%APPDATA%\smart-life-manager\.env</p>
              </div>
            </div>

            {geminiStatusMsg && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  geminiStatusMsg.type === "success"
                    ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                    : "bg-rose-950/60 border-rose-800 text-rose-300"
                }`}
              >
                {geminiStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{geminiStatusMsg.text}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSaveGemini} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {config?.geminiApiKeyConfigured ? "Update Gemini API Key" : "Enter Gemini API Key"}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <Input
                    type="password"
                    placeholder={config?.geminiApiKeyMasked || "AIzaSy..."}
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Your key is securely saved to your machine&apos;s OS AppData folder and never bundled into installer binaries or exposed to client JavaScript.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!geminiKeyInput.trim() || isSavingGemini}
                  isLoading={isSavingGemini}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Save & Validate Key
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestGemini}
                  disabled={isTestingGemini || (!geminiKeyInput.trim() && !config?.geminiApiKeyConfigured)}
                  isLoading={isTestingGemini}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Test Connection
                </Button>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-400 hover:text-purple-300 ml-auto inline-flex items-center gap-1"
                >
                  Get API Key from Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Google OAuth Card */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base text-white flex items-center gap-2">
                  Google OAuth 2.0 Credentials
                  <Badge variant={config?.googleOAuthConfigured ? "success" : "outline"}>
                    {config?.googleOAuthConfigured ? "Configured" : "Awaiting Setup"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Manage Google Single Sign-On credentials for Windows Desktop and Web deployments.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {googleStatusMsg && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  googleStatusMsg.type === "success"
                    ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                    : "bg-rose-950/60 border-rose-800 text-rose-300"
                }`}
              >
                {googleStatusMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{googleStatusMsg.text}</span>
              </div>
            )}

            {/* Architecture Explanatory Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-blue-400">
                  <Laptop className="w-4 h-4" />
                  <span>Windows Desktop App Flow (RFC 8252)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Requires a Google Cloud Console credential of type <strong>Desktop App</strong>. The application uses dynamic loopback (<code className="text-indigo-300 font-mono">http://127.0.0.1</code>) authentication in the system browser automatically.
                </p>
                <div className="pt-1 text-[11px] text-slate-400 font-mono">
                  Current Desktop Client ID: <span className="text-white">{config?.googleDesktopClientId || config?.googleClientId || "None"}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-slate-300">
                  <Globe className="w-4 h-4" />
                  <span>Web Application Flow</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Requires a credential of type <strong>Web Application</strong> with exact matching Authorized Redirect URI (e.g. <code className="text-indigo-300 font-mono">http://localhost:3000/api/auth/google/callback</code>).
                </p>
                <div className="pt-1 text-[11px] text-slate-400 font-mono">
                  Current Web Client ID: <span className="text-white">{config?.googleClientId || "None"}</span>
                </div>
              </div>
            </div>

            {/* Update Form */}
            <form onSubmit={handleSaveGoogle} className="space-y-4 pt-2">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                  Desktop OAuth Client (Recommended for Installed EXE)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Desktop Client ID
                    </label>
                    <Input
                      type="text"
                      placeholder="...apps.googleusercontent.com"
                      value={googleDesktopClientId}
                      onChange={(e) => setGoogleDesktopClientId(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Desktop Client Secret
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      value={googleDesktopClientSecret}
                      onChange={(e) => setGoogleDesktopClientSecret(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Web OAuth Client (For Web Deployment)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Web Client ID
                    </label>
                    <Input
                      type="text"
                      placeholder="...apps.googleusercontent.com"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Web Client Secret
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      value={googleClientSecret}
                      onChange={(e) => setGoogleClientSecret(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingGoogle}
                  isLoading={isSavingGoogle}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  Save Google Credentials
                </Button>

                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                >
                  Open Google Cloud Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
