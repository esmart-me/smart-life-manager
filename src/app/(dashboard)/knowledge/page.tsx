import { Metadata } from "next";
import { KnowledgeClient } from "@/components/knowledge/KnowledgeClient";

export const metadata: Metadata = {
  title: "Personal Knowledge Wallet | Smart Life Manager",
  description: "Secure, offline, personal knowledge vault for notes, collections, procedures, and links.",
};

export default function KnowledgePage() {
  return <KnowledgeClient />;
}
