import { Metadata } from "next";
import { WellnessClient } from "@/components/wellness/WellnessClient";

export const metadata: Metadata = {
  title: "Wellness & Habit Tracker | Smart Life Manager",
  description: "Track habits, consistency streaks, sleep, hydration, and daily wellness vitals offline and securely.",
};

export default function WellnessPage() {
  return <WellnessClient />;
}
