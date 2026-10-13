import { Metadata } from "next";
import { TravelClient } from "@/components/travel/TravelClient";

export const metadata: Metadata = {
  title: "Travel & Trip Organizer | Smart Life Manager",
  description: "Organize trips, flight itineraries, hotel bookings, packing checklists, and travel budgets securely.",
};

export default function TravelPage() {
  return <TravelClient />;
}
