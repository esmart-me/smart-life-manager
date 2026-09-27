"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  Plus,
  Calendar,
  Gauge,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Clock,
  Wrench,
  Battery,
  Disc,
  Droplet,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VehicleStatusSummary } from "@/lib/vehicles/status";
import { VehicleFormModal, VehicleFormData } from "./VehicleFormModal";
import { formatShortDate } from "@/lib/utils";

export interface VehicleRecord {
  id: string;
  name: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  licensePlate?: string | null;
  vin?: string | null;
  mileage?: number | null;
  nextServiceMileage?: number | null;
  insuranceExpiry?: string | Date | null;
  registrationExpiry?: string | Date | null;
  nextServiceDate?: string | Date | null;
  notes?: string | null;
  statusSummary: VehicleStatusSummary;
}

interface VehicleListClientProps {
  initialVehicles: VehicleRecord[];
}

export function VehicleListClient({ initialVehicles }: VehicleListClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleFormData | null>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleOpenAdd = () => {
    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: VehicleRecord) => {
    setSelectedVehicle({
      id: v.id,
      name: v.name,
      make: v.make,
      model: v.model,
      year: v.year,
      licensePlate: v.licensePlate,
      vin: v.vin,
      mileage: v.mileage,
      nextServiceMileage: v.nextServiceMileage,
      insuranceExpiry: v.insuranceExpiry ? String(v.insuranceExpiry) : null,
      registrationExpiry: v.registrationExpiry ? String(v.registrationExpiry) : null,
      nextServiceDate: v.nextServiceDate ? String(v.nextServiceDate) : null,
      notes: v.notes,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (v: VehicleRecord) => {
    if (!confirm(`Are you sure you want to delete vehicle "${v.name}"? Related maintenance reminders will also be removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/vehicles/${v.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        handleRefresh();
      } else {
        alert(data.error?.message || "Failed to delete vehicle");
      }
    } catch (err) {
      console.error("[Delete Vehicle Error]:", err);
      alert("Network error deleting vehicle");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Vehicles & Maintenance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your garage, track insurance, registration renewals, periodic services, and mileage alerts.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Vehicle</span>
        </Button>
      </div>

      {/* Vehicle Grid */}
      {initialVehicles.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No vehicles in your garage
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add your car, motorcycle, or fleet to track renewal deadlines, oil changes, tyres, and battery maintenance.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            Add Your First Vehicle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {initialVehicles.map((vehicle) => {
            const { alerts, insuranceStatus, registrationStatus, serviceStatus, mileageStatus } =
              vehicle.statusSummary;

            return (
              <div
                key={vehicle.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {vehicle.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" • ") ||
                          "No make/model specified"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(vehicle)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit vehicle"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(vehicle)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete vehicle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* License Plate & Mileage Bar */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {vehicle.licensePlate && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {vehicle.licensePlate}
                    </span>
                  )}
                  {vehicle.vin && (
                    <span className="text-[11px] text-slate-400 font-mono" title="VIN">
                      VIN: {vehicle.vin}
                    </span>
                  )}
                  {vehicle.mileage !== null && vehicle.mileage !== undefined && (
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium ml-auto">
                      <Gauge className="w-3.5 h-3.5 text-amber-500" />
                      <span>{vehicle.mileage.toLocaleString()} km/mi</span>
                    </span>
                  )}
                </div>

                {/* Expiries & Status Matrix */}
                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {/* Registration */}
                  <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Registration
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {vehicle.registrationExpiry ? formatShortDate(vehicle.registrationExpiry) : "Not set"}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        registrationStatus === "EXPIRED"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                          : registrationStatus === "EXPIRING_SOON"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                          : registrationStatus === "VALID"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : "text-slate-400"
                      }`}
                    >
                      {registrationStatus.replace("_", " ")}
                    </span>
                  </div>

                  {/* Insurance */}
                  <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Insurance Policy
                    </span>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {vehicle.insuranceExpiry ? formatShortDate(vehicle.insuranceExpiry) : "Not set"}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        insuranceStatus === "EXPIRED"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                          : insuranceStatus === "EXPIRING_SOON"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                          : insuranceStatus === "VALID"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : "text-slate-400"
                      }`}
                    >
                      {insuranceStatus.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Service Schedule */}
                <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-indigo-500" />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        Periodic Service
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {vehicle.nextServiceDate ? `Due: ${formatShortDate(vehicle.nextServiceDate)}` : "No date set"}{" "}
                        {vehicle.nextServiceMileage ? `or ${vehicle.nextServiceMileage.toLocaleString()} km/mi` : ""}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      serviceStatus === "OVERDUE" || mileageStatus === "OVERDUE"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                        : serviceStatus === "DUE_SOON" || mileageStatus === "DUE_SOON"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    }`}
                  >
                    {serviceStatus === "OVERDUE" || mileageStatus === "OVERDUE"
                      ? "Service Overdue"
                      : serviceStatus === "DUE_SOON" || mileageStatus === "DUE_SOON"
                      ? "Service Soon"
                      : "On Track"}
                  </span>
                </div>

                {/* Vehicle Reminders Matrix */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Monitored Reminders (Synced to Tasks)
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[11px] text-center">
                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                      <Shield className="w-3 h-3 text-indigo-500 mb-0.5" />
                      <span>Insurance</span>
                    </div>
                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                      <FileText className="w-3 h-3 text-sky-500 mb-0.5" />
                      <span>Registration</span>
                    </div>
                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                      <Wrench className="w-3 h-3 text-amber-500 mb-0.5" />
                      <span>Service</span>
                    </div>
                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                      <Droplet className="w-3 h-3 text-rose-500 mb-0.5" />
                      <span>Oil Change</span>
                    </div>
                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                      <Disc className="w-3 h-3 text-emerald-500 mb-0.5" />
                      <span>Tyres</span>
                    </div>
                    <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                      <Battery className="w-3 h-3 text-yellow-500 mb-0.5" />
                      <span>Battery</span>
                    </div>
                  </div>
                </div>

                {vehicle.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                    {vehicle.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <VehicleFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
        initialData={selectedVehicle}
      />
    </div>
  );
}
