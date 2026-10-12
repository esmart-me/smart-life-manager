// src/app/admin/(portal)/settings/page.tsx
// Admin System & AI Service Settings Page

import { Metadata } from "next";
import { SystemSettingsClient } from "@/components/admin/SystemSettingsClient";

export const metadata: Metadata = {
  title: "System & AI Settings | Admin Portal",
  description: "Configure system integrations, Gemini AI, and Google OAuth credentials",
};

export default function AdminSettingsPage() {
  return <SystemSettingsClient />;
}
