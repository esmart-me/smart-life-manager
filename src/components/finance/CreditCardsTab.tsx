"use client";

import { useState } from "react";
import {
  CreditCard as CreditCardIcon,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { CreditCardFormData, CreditCardModal } from "./CreditCardModal";
import { CreditCardEmiFormData, CreditCardEmiModal } from "./CreditCardEmiModal";

export interface CreditCardWithEmis {
  id: string;
  cardName: string;
  bank: string;
  network?: string | null;
  lastFour: string;
  creditLimit: number;
  currentBalance: number;
  statementDay: number;
  dueDay: number;
  minimumDue?: number | null;
  totalDue?: number | null;
  currency: string;
  notes?: string | null;
  emis: Array<{
    id: string;
    cardId: string;
    merchant: string;
    totalAmount: number;
    monthlyEmi: number;
    interestRate?: number | null;
    tenureMonths: number;
    paidMonths: number;
    startDate: string | Date;
    status: string;
    notes?: string | null;
  }>;
}

interface CreditCardsTabProps {
  cards: CreditCardWithEmis[];
  userCurrency: string;
  onRefresh: () => void;
}

export function CreditCardsTab({ cards, userCurrency, onRefresh }: CreditCardsTabProps) {
  // Modal states
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardFormData | null>(null);

  const [isEmiModalOpen, setIsEmiModalOpen] = useState(false);
  const [selectedCardForEmi, setSelectedCardForEmi] = useState<{ id: string; name: string } | null>(null);
  const [editingEmi, setEditingEmi] = useState<CreditCardEmiFormData | null>(null);

  // Expanded EMIs state per card
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Summary computations
  const totalLimit = cards.reduce((acc, c) => acc + c.creditLimit, 0);
  const totalBalance = cards.reduce((acc, c) => acc + c.currentBalance, 0);
  const totalAvailable = Math.max(0, totalLimit - totalBalance);
  const totalMonthlyEmis = cards.reduce(
    (acc, c) =>
      acc +
      c.emis
        .filter((e) => e.status === "active")
        .reduce((sum, e) => sum + e.monthlyEmi, 0),
    0
  );

  function toggleCardEmis(cardId: string) {
    setExpandedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  }

  async function handleDeleteCard(card: CreditCardWithEmis) {
    if (!confirm(`Are you sure you want to delete ${card.cardName} (•••• ${card.lastFour}) and all its linked EMIs?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/finance/credit-cards/${card.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
      } else {
        alert(data.error?.message || "Failed to delete card");
      }
    } catch (err) {
      console.error("[Delete Card Error]:", err);
      alert("Network error deleting credit card");
    }
  }

  async function handleDeleteEmi(emiId: string, merchant: string) {
    if (!confirm(`Are you sure you want to remove EMI for "${merchant}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/finance/credit-cards/emis/${emiId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
      } else {
        alert(data.error?.message || "Failed to delete EMI");
      }
    } catch (err) {
      console.error("[Delete EMI Error]:", err);
      alert("Network error deleting EMI");
    }
  }

  async function handleIncrementEmi(emiId: string, currentPaid: number, totalTenure: number) {
    const nextPaid = currentPaid + 1;
    try {
      const res = await fetch(`/api/finance/credit-cards/emis/${emiId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidMonths: nextPaid,
          status: nextPaid >= totalTenure ? "completed" : "active",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
      } else {
        alert(data.error?.message || "Failed to update EMI installment");
      }
    } catch (err) {
      console.error("[Increment EMI Error]:", err);
      alert("Network error updating installment");
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Credit Limit</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalLimit, userCurrency)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{cards.length} cards active</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
          <p className="text-[11px] font-medium text-rose-500 dark:text-rose-400">Current Outstanding</p>
          <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalBalance, userCurrency)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {totalLimit > 0 ? `${Math.round((totalBalance / totalLimit) * 100)}% utilization` : "0%"}
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Available Limit</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalAvailable, userCurrency)}
          </p>
          <span className="text-[10px] text-emerald-500 mt-0.5 block">Ready for emergency use</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
          <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400">Monthly Card EMIs</p>
          <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {formatCurrency(totalMonthlyEmis, userCurrency)}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Active conversion installments</span>
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            My Credit Cards & Linked EMIs
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Never miss statement billing dates, keep credit utilization below 30%, and monitor active conversion EMIs.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingCard(null);
            setIsCardModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Credit Card</span>
        </Button>
      </div>

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto">
            <CreditCardIcon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              No credit cards configured
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Add your credit cards with privacy-safe last 4 digits to track credit limits, statement dates, and active EMIs.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingCard(null);
              setIsCardModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            Add First Card
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const available = Math.max(0, card.creditLimit - card.currentBalance);
            const utilization =
              card.creditLimit > 0
                ? Math.min(100, Math.round((card.currentBalance / card.creditLimit) * 100))
                : 0;

            const isHighUtilization = utilization > 50;
            const isMediumUtilization = utilization > 30 && utilization <= 50;
            const isExpanded = expandedCards[card.id] ?? false;

            return (
              <div
                key={card.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Physical Card Visual Header */}
                <div className="p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
                  {/* Subtle glass reflection decorative ring */}
                  <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/5 blur-xl pointer-events-none" />

                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] tracking-widest uppercase font-semibold text-indigo-300/90">
                        {card.bank}
                      </p>
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-wide mt-0.5">
                        {card.cardName}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/15">
                        {card.network || "Visa"}
                      </span>
                    </div>
                  </div>

                  {/* Masked Card Number & Chip */}
                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-mono text-sm tracking-wider text-slate-200">
                      <span>••••</span>
                      <span>••••</span>
                      <span>••••</span>
                      <span className="text-white font-bold">{card.lastFour}</span>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-indigo-200/80">Available</p>
                      <p className="text-xs font-bold text-emerald-400">
                        {formatCurrency(available, card.currency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Details & Utilization Meter */}
                <div className="p-4 sm:p-5 space-y-4 flex-1">
                  {/* Utilization Meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Utilization:{" "}
                        <strong
                          className={
                            isHighUtilization
                              ? "text-rose-600 dark:text-rose-400"
                              : isMediumUtilization
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {utilization}%
                        </strong>
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">
                        {formatCurrency(card.currentBalance, card.currency)} / {formatCurrency(card.creditLimit, card.currency)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isHighUtilization
                            ? "bg-rose-500"
                            : isMediumUtilization
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  </div>

                  {/* Statement & Due Day Badges */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                        <Calendar className="w-3 h-3" />
                        <span>Statement Gen</span>
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 text-xs">
                        Every {card.statementDay}th
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                        <Calendar className="w-3 h-3 text-indigo-500" />
                        <span>Payment Due</span>
                      </div>
                      <p className="font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 text-xs">
                        Every {card.dueDay}th
                      </p>
                    </div>
                  </div>

                  {/* Dues Summary if entered */}
                  {(Boolean(card.totalDue) || Boolean(card.minimumDue)) && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total Due</span>
                        <strong className="text-slate-900 dark:text-white font-semibold">
                          {formatCurrency(card.totalDue || 0, card.currency)}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Min Due</span>
                        <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                          {formatCurrency(card.minimumDue || 0, card.currency)}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* EMIs Section Accordion */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleCardEmis(card.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5 text-purple-500" />
                        <span>Linked EMIs ({card.emis.length})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCardForEmi({ id: card.id, name: card.cardName });
                          setEditingEmi(null);
                          setIsEmiModalOpen(true);
                        }}
                        className="text-[11px] h-7 text-indigo-600 hover:text-indigo-700 px-2 font-medium"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add EMI
                      </Button>
                    </div>

                    {/* Active EMIs List */}
                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {card.emis.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-1">
                            No converted purchase EMIs linked to this card.
                          </p>
                        ) : (
                          card.emis.map((emi) => {
                            const isCompleted = emi.status === "completed" || emi.paidMonths >= emi.tenureMonths;
                            const emiProgress = Math.min(
                              100,
                              Math.round((emi.paidMonths / emi.tenureMonths) * 100)
                            );

                            return (
                              <div
                                key={emi.id}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <strong className="text-slate-900 dark:text-white font-medium">
                                      {emi.merchant}
                                    </strong>
                                    {isCompleted ? (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-semibold">
                                        Done
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {formatCurrency(emi.monthlyEmi, card.currency)}/mo
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-purple-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${emiProgress}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>
                                      Month {emi.paidMonths} of {emi.tenureMonths}
                                    </span>
                                    <span>
                                      Total: {formatCurrency(emi.totalAmount, card.currency)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                  {!isCompleted ? (
                                    <button
                                      type="button"
                                      onClick={() => handleIncrementEmi(emi.id, emi.paidMonths, emi.tenureMonths)}
                                      className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Pay Installment (+1 Mo)</span>
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-emerald-600 font-medium">
                                      Fully Paid
                                    </span>
                                  )}

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedCardForEmi({ id: card.id, name: card.cardName });
                                        setEditingEmi({
                                          id: emi.id,
                                          cardId: emi.cardId,
                                          merchant: emi.merchant,
                                          totalAmount: emi.totalAmount,
                                          monthlyEmi: emi.monthlyEmi,
                                          interestRate: emi.interestRate,
                                          tenureMonths: emi.tenureMonths,
                                          paidMonths: emi.paidMonths,
                                          notes: emi.notes,
                                        });
                                        setIsEmiModalOpen(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-600"
                                      title="Edit EMI"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEmi(emi.id, emi.merchant)}
                                      className="p-1 text-slate-400 hover:text-rose-600"
                                      title="Delete EMI"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {card.notes || `Statement on ${card.statementDay}th`}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCard({
                          id: card.id,
                          cardName: card.cardName,
                          bank: card.bank,
                          network: card.network || "Visa",
                          lastFour: card.lastFour,
                          creditLimit: card.creditLimit,
                          currentBalance: card.currentBalance,
                          statementDay: card.statementDay,
                          dueDay: card.dueDay,
                          minimumDue: card.minimumDue || 0,
                          totalDue: card.totalDue || 0,
                          currency: card.currency,
                          notes: card.notes,
                        });
                        setIsCardModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Card"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Credit Card Modal */}
      <CreditCardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onSuccess={onRefresh}
        initialData={editingCard}
        defaultCurrency={userCurrency}
      />

      {/* Credit Card EMI Modal */}
      {selectedCardForEmi && (
        <CreditCardEmiModal
          isOpen={isEmiModalOpen}
          onClose={() => setIsEmiModalOpen(false)}
          onSuccess={onRefresh}
          cardId={selectedCardForEmi.id}
          cardName={selectedCardForEmi.name}
          initialData={editingEmi}
        />
      )}
    </div>
  );
}
