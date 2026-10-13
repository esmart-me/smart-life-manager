"use client";

import { useState, useEffect } from "react";
import {
  Compass,
  Plus,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  ArrowRight,
  Eye,
  EyeOff,
  Briefcase,
  Plane,
  Building,
  Utensils,
  Navigation,
  Car,
  Sparkles,
  ChevronLeft,
  Luggage,
  AlertCircle,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface TripItineraryItem {
  id: string;
  tripId: string;
  dayDate: string;
  timeSlot: string | null;
  activity: string;
  location: string | null;
  bookingRef: string | null;
  confirmationDetails: string | null;
  cost: number | null;
  category: string;
  notes: string | null;
}

interface TripPackingItem {
  id: string;
  tripId: string;
  item: string;
  category: string;
  isPacked: boolean;
  quantity: number;
}

interface TripItem {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string; // "planned" | "active" | "completed" | "cancelled"
  estimatedBudget: number | null;
  actualCost: number | null;
  currency: string;
  coverImage: string | null;
  notes: string | null;
  itineraries?: TripItineraryItem[];
  packingItems?: TripPackingItem[];
  _count?: {
    itineraries: number;
    packingItems: number;
  };
}

export function TravelClient() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTabStatus, setActiveTabStatus] = useState<string>("all");
  const [selectedTrip, setSelectedTrip] = useState<TripItem | null>(null);
  const [tripSubTab, setTripSubTab] = useState<"itinerary" | "packing" | "budget">("itinerary");

  // Masking toggles for sensitive booking references
  const [revealedRefs, setRevealedRefs] = useState<Record<string, boolean>>({});

  // Modals
  const [showTripModal, setShowTripModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripItem | null>(null);
  const [tripFormData, setTripFormData] = useState({
    title: "",
    destination: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    status: "planned",
    estimatedBudget: "",
    currency: "USD",
    notes: "",
  });

  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [itineraryFormData, setItineraryFormData] = useState({
    dayDate: "",
    timeSlot: "",
    activity: "",
    location: "",
    bookingRef: "",
    confirmationDetails: "",
    cost: "",
    category: "activity",
    notes: "",
  });

  const [showPackingModal, setShowPackingModal] = useState(false);
  const [packingFormData, setPackingFormData] = useState({
    item: "",
    category: "essentials",
    quantity: "1",
  });

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/travel/trips");
      const data = await res.json();
      if (data.success) {
        setTrips(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load trips:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTripDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/travel/trips/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedTrip(data.data);
      }
    } catch (err) {
      console.error("Failed to load trip details:", err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const openCreateTripModal = () => {
    setEditingTrip(null);
    setTripFormData({
      title: "",
      destination: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      status: "planned",
      estimatedBudget: "",
      currency: "USD",
      notes: "",
    });
    setShowTripModal(true);
  };

  const openEditTripModal = (trip: TripItem) => {
    setEditingTrip(trip);
    setTripFormData({
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate.split("T")[0],
      endDate: trip.endDate.split("T")[0],
      status: trip.status,
      estimatedBudget: trip.estimatedBudget ? trip.estimatedBudget.toString() : "",
      currency: trip.currency || "USD",
      notes: trip.notes || "",
    });
    setShowTripModal(true);
  };

  const handleTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripFormData.title.trim() || !tripFormData.destination.trim()) return;

    try {
      setSubmitting(true);
      const url = editingTrip
        ? `/api/travel/trips/${editingTrip.id}`
        : "/api/travel/trips";
      const method = editingTrip ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripFormData),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: editingTrip ? "Trip updated successfully!" : "New trip planned!",
        });
        setShowTripModal(false);
        fetchTrips();
        if (selectedTrip && selectedTrip.id === editingTrip?.id) {
          fetchTripDetails(selectedTrip.id);
        }
      } else {
        setNotification({
          type: "error",
          message: data.error?.message || "Failed to save trip",
        });
      }
    } catch (err) {
      console.error("Save trip error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTrip = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete trip "${title}"? All itinerary stops and packing lists will be removed.`)) return;

    try {
      const res = await fetch(`/api/travel/trips/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (selectedTrip?.id === id) setSelectedTrip(null);
        fetchTrips();
      }
    } catch (err) {
      console.error("Delete trip error:", err);
    }
  };

  // Itinerary handlers
  const handleAddItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !itineraryFormData.activity.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/travel/trips/${selectedTrip.id}/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itineraryFormData),
      });

      const data = await res.json();
      if (data.success) {
        setShowItineraryModal(false);
        fetchTripDetails(selectedTrip.id);
        fetchTrips();
      }
    } catch (err) {
      console.error("Add itinerary error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItinerary = async (itineraryId: string) => {
    if (!selectedTrip) return;
    try {
      const res = await fetch(`/api/travel/trips/${selectedTrip.id}/itinerary/${itineraryId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchTripDetails(selectedTrip.id);
      }
    } catch (err) {
      console.error("Delete itinerary error:", err);
    }
  };

  // Packing list handlers
  const handleAddPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !packingFormData.item.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/travel/trips/${selectedTrip.id}/packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packingFormData),
      });

      const data = await res.json();
      if (data.success) {
        setShowPackingModal(false);
        fetchTripDetails(selectedTrip.id);
        fetchTrips();
      }
    } catch (err) {
      console.error("Add packing error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePackingItem = async (packingId: string, currentPacked: boolean) => {
    if (!selectedTrip) return;
    try {
      const res = await fetch(`/api/travel/trips/${selectedTrip.id}/packing/${packingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPacked: !currentPacked }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTripDetails(selectedTrip.id);
      }
    } catch (err) {
      console.error("Toggle packing error:", err);
    }
  };

  const handleDeletePackingItem = async (packingId: string) => {
    if (!selectedTrip) return;
    try {
      const res = await fetch(`/api/travel/trips/${selectedTrip.id}/packing/${packingId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchTripDetails(selectedTrip.id);
      }
    } catch (err) {
      console.error("Delete packing item error:", err);
    }
  };

  const toggleRefReveal = (id: string) => {
    setRevealedRefs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTrips = trips.filter((t) => {
    if (activeTabStatus === "all") return true;
    return t.status === activeTabStatus;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "flight":
        return <Plane className="w-4 h-4 text-sky-500" />;
      case "hotel":
        return <Building className="w-4 h-4 text-amber-500" />;
      case "dining":
        return <Utensils className="w-4 h-4 text-rose-500" />;
      case "transport":
        return <Car className="w-4 h-4 text-indigo-500" />;
      default:
        return <Compass className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            {selectedTrip && (
              <button
                onClick={() => setSelectedTrip(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 mr-1"
                title="Back to all trips"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {selectedTrip ? selectedTrip.title : "Travel & Trip Organizer"}
            </h1>
            <Badge variant="info">
              {selectedTrip ? selectedTrip.destination : "Itineraries & Packing"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {selectedTrip
              ? `${new Date(selectedTrip.startDate).toLocaleDateString()} — ${new Date(selectedTrip.endDate).toLocaleDateString()}`
              : "Plan destinations, transport, hotels, daily timelines, and packing checklists offline."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedTrip ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditTripModal(selectedTrip)}
              className="text-xs gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Trip Details</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateTripModal}
              className="text-xs font-semibold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Plan New Trip</span>
            </Button>
          )}
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main View: All Trips vs Single Trip Detail */}
      {!selectedTrip ? (
        <div className="space-y-6">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            {["all", "planned", "active", "completed", "cancelled"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setActiveTabStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  activeTabStatus === st
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {st} ({st === "all" ? trips.length : trips.filter((t) => t.status === st).length})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
              Loading trips...
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
              <Compass className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No trips scheduled
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Organize your upcoming vacations, weekend getaways, and business travel.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={openCreateTripModal}
                className="mt-4 text-xs"
              >
                Plan First Trip
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrips.map((trip) => {
                const start = new Date(trip.startDate);
                const end = new Date(trip.endDate);
                const daysDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

                return (
                  <div
                    key={trip.id}
                    onClick={() => fetchTripDetails(trip.id)}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge
                          variant={
                            trip.status === "active"
                              ? "success"
                              : trip.status === "completed"
                              ? "outline"
                              : "info"
                          }
                        >
                          {trip.status.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-slate-500 font-medium">
                          {daysDiff} days
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                        {trip.title}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="font-semibold truncate">{trip.destination}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        <span>
                          {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} -{" "}
                          {end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-medium">
                          <Compass className="w-3.5 h-3.5 text-slate-400" />
                          {trip._count?.itineraries || 0} stops
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Luggage className="w-3.5 h-3.5 text-slate-400" />
                          {trip._count?.packingItems || 0} items
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Selected Trip View */
        <div className="space-y-6">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTripSubTab("itinerary")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  tripSubTab === "itinerary"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Itinerary ({selectedTrip.itineraries?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setTripSubTab("packing")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  tripSubTab === "packing"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                <Luggage className="w-3.5 h-3.5" />
                <span>Packing Checklist ({selectedTrip.packingItems?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setTripSubTab("budget")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  tripSubTab === "budget"
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Budget & Summary</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {tripSubTab === "itinerary" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setItineraryFormData({
                      dayDate: selectedTrip.startDate.split("T")[0],
                      timeSlot: "10:00 AM",
                      activity: "",
                      location: "",
                      bookingRef: "",
                      confirmationDetails: "",
                      cost: "",
                      category: "activity",
                      notes: "",
                    });
                    setShowItineraryModal(true);
                  }}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stop / Flight</span>
                </Button>
              )}
              {tripSubTab === "packing" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPackingFormData({ item: "", category: "essentials", quantity: "1" });
                    setShowPackingModal(true);
                  }}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Packing Item</span>
                </Button>
              )}
            </div>
          </div>

          {/* Sub Tab 1: Itinerary Timeline */}
          {tripSubTab === "itinerary" && (
            <div className="space-y-4">
              {!selectedTrip.itineraries || selectedTrip.itineraries.length === 0 ? (
                <div className="p-12 text-center bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                  <Compass className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No itinerary activities added yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Add flights, hotel check-ins, tours, and restaurant reservations.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTrip.itineraries.map((item) => {
                    const isMasked = !revealedRefs[item.id];
                    const refDisplay = item.bookingRef
                      ? isMasked
                        ? `••••••••${item.bookingRef.slice(-3)}`
                        : item.bookingRef
                      : null;

                    return (
                      <div
                        key={item.id}
                        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-start justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                            {getCategoryIcon(item.category)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                                {new Date(item.dayDate).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              {item.timeSlot && (
                                <span className="text-xs text-slate-500 font-medium">
                                  • {item.timeSlot}
                                </span>
                              )}
                              <Badge variant="outline">{item.category.toUpperCase()}</Badge>
                              {item.cost && (
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  ${item.cost.toFixed(2)}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                              {item.activity}
                            </h4>

                            {item.location && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{item.location}</span>
                              </div>
                            )}

                            {/* Masked Booking Reference */}
                            {item.bookingRef && (
                              <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                                <span className="text-slate-500 font-medium">Booking Ref:</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {refDisplay}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleRefReveal(item.id)}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
                                  title={isMasked ? "Reveal booking ref" : "Hide booking ref"}
                                >
                                  {isMasked ? (
                                    <Eye className="w-3.5 h-3.5" />
                                  ) : (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            )}

                            {item.notes && (
                              <p className="text-xs text-slate-500 mt-1 italic">{item.notes}</p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteItinerary(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub Tab 2: Packing Checklist */}
          {tripSubTab === "packing" && (
            <div className="space-y-4">
              {!selectedTrip.packingItems || selectedTrip.packingItems.length === 0 ? (
                <div className="p-12 text-center bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                  <Luggage className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Packing list is empty
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Add passport, adaptors, jackets, medicine, and travel essentials.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTrip.packingItems.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border flex items-center justify-between gap-3 group transition-all ${
                        item.isPacked
                          ? "border-emerald-200/50 bg-emerald-50/20 dark:bg-emerald-950/10 opacity-75"
                          : "border-slate-200/80 dark:border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePackingItem(item.id, item.isPacked)}
                          className="text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          {item.isPacked ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <span
                          className={`text-xs font-semibold text-slate-900 dark:text-white ${
                            item.isPacked ? "line-through text-slate-400" : ""
                          }`}
                        >
                          {item.item}
                        </span>

                        {item.quantity > 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold">
                            ×{item.quantity}
                          </span>
                        )}

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 capitalize">
                          {item.category}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePackingItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub Tab 3: Budget & Summary */}
          {tripSubTab === "budget" && (
            <div className="bg-white/70 dark:bg-slate-900/70 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Trip Financial Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500">Estimated Budget</span>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {selectedTrip.estimatedBudget
                      ? `$${selectedTrip.estimatedBudget.toFixed(2)}`
                      : "Not set"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500">Tracked Itinerary Cost</span>
                  <p className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-1">
                    $
                    {(
                      selectedTrip.itineraries?.reduce(
                        (sum, item) => sum + (item.cost || 0),
                        0
                      ) || 0
                    ).toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedTrip.notes && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Trip Notes
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">
                    {selectedTrip.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Plan/Edit Trip Modal */}
      {showTripModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingTrip ? "Edit Trip" : "Plan New Trip"}
            </h3>

            <form onSubmit={handleTripSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Trip Name *
                </label>
                <input
                  type="text"
                  required
                  value={tripFormData.title}
                  onChange={(e) => setTripFormData({ ...tripFormData, title: e.target.value })}
                  placeholder="e.g. Summer Vacation in Switzerland"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination *
                </label>
                <input
                  type="text"
                  required
                  value={tripFormData.destination}
                  onChange={(e) =>
                    setTripFormData({ ...tripFormData, destination: e.target.value })
                  }
                  placeholder="e.g. Zurich & Lucerne"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={tripFormData.startDate}
                    onChange={(e) =>
                      setTripFormData({ ...tripFormData, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={tripFormData.endDate}
                    onChange={(e) =>
                      setTripFormData({ ...tripFormData, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={tripFormData.status}
                    onChange={(e) =>
                      setTripFormData({ ...tripFormData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="planned">Planned</option>
                    <option value="active">Active / In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Budget ($)
                  </label>
                  <input
                    type="number"
                    value={tripFormData.estimatedBudget}
                    onChange={(e) =>
                      setTripFormData({
                        ...tripFormData,
                        estimatedBudget: e.target.value,
                      })
                    }
                    placeholder="e.g. 2500"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Trip Notes
                </label>
                <textarea
                  rows={2}
                  value={tripFormData.notes}
                  onChange={(e) =>
                    setTripFormData({ ...tripFormData, notes: e.target.value })
                  }
                  placeholder="Emergency contacts, embassy details, notes..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTripModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="text-xs font-semibold"
                >
                  {submitting ? "Saving..." : editingTrip ? "Save Changes" : "Plan Trip"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Itinerary Stop Modal */}
      {showItineraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Add Itinerary Stop / Booking
            </h3>

            <form onSubmit={handleAddItinerary} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Activity / Booking Name *
                </label>
                <input
                  type="text"
                  required
                  value={itineraryFormData.activity}
                  onChange={(e) =>
                    setItineraryFormData({ ...itineraryFormData, activity: e.target.value })
                  }
                  placeholder="e.g. Flight LX-18 to Zurich or Hotel Check-in"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={itineraryFormData.dayDate}
                    onChange={(e) =>
                      setItineraryFormData({ ...itineraryFormData, dayDate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Time Slot
                  </label>
                  <input
                    type="text"
                    value={itineraryFormData.timeSlot}
                    onChange={(e) =>
                      setItineraryFormData({ ...itineraryFormData, timeSlot: e.target.value })
                    }
                    placeholder="e.g. 10:30 AM"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={itineraryFormData.category}
                    onChange={(e) =>
                      setItineraryFormData({ ...itineraryFormData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="flight">Flight / Transit</option>
                    <option value="hotel">Accommodation</option>
                    <option value="activity">Tour / Sightseeing</option>
                    <option value="dining">Dining / Food</option>
                    <option value="transport">Rental / Train</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    value={itineraryFormData.cost}
                    onChange={(e) =>
                      setItineraryFormData({ ...itineraryFormData, cost: e.target.value })
                    }
                    placeholder="e.g. 120.00"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={itineraryFormData.location}
                    onChange={(e) =>
                      setItineraryFormData({ ...itineraryFormData, location: e.target.value })
                    }
                    placeholder="Terminal 3 or Address"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Booking Reference
                  </label>
                  <input
                    type="text"
                    value={itineraryFormData.bookingRef}
                    onChange={(e) =>
                      setItineraryFormData({ ...itineraryFormData, bookingRef: e.target.value })
                    }
                    placeholder="e.g. PNR-78921"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowItineraryModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="text-xs font-semibold"
                >
                  {submitting ? "Adding..." : "Add to Itinerary"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Packing Item Modal */}
      {showPackingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Add Packing Item
            </h3>

            <form onSubmit={handleAddPackingItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={packingFormData.item}
                  onChange={(e) =>
                    setPackingFormData({ ...packingFormData, item: e.target.value })
                  }
                  placeholder="e.g. Universal Travel Adapter"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={packingFormData.category}
                    onChange={(e) =>
                      setPackingFormData({ ...packingFormData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="essentials">Essentials</option>
                    <option value="clothes">Clothes</option>
                    <option value="electronics">Electronics</option>
                    <option value="documents">Documents</option>
                    <option value="toiletries">Toiletries</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={packingFormData.quantity}
                    onChange={(e) =>
                      setPackingFormData({ ...packingFormData, quantity: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPackingModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="text-xs font-semibold"
                >
                  {submitting ? "Adding..." : "Add Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
