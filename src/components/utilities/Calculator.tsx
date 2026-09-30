"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  Trash2,
  Copy,
  Check,
  Delete,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

export function Calculator() {
  const [display, setDisplay] = useState<string>("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNewInput, setWaitingForNewInput] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Load history from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("slm_calc_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load calculator history", e);
    }
  }, []);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem("slm_calc_history", JSON.stringify(items.slice(0, 30)));
    } catch (e) {
      console.error("Failed to save calculator history", e);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForNewInput(false);
  };

  const handleBackspace = () => {
    if (waitingForNewInput || display === "Error" || display === "Cannot divide by 0") {
      setDisplay("0");
      return;
    }
    if (display.length <= 1 || (display.length === 2 && display.startsWith("-"))) {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleDigit = (digit: string) => {
    if (display === "Error" || display === "Cannot divide by 0" || waitingForNewInput) {
      setDisplay(digit);
      setWaitingForNewInput(false);
    } else {
      if (display === "0" && digit !== ".") {
        setDisplay(digit);
      } else if (display.length < 16) {
        setDisplay(display + digit);
      }
    }
  };

  const handleDecimal = () => {
    if (waitingForNewInput || display === "Error" || display === "Cannot divide by 0") {
      setDisplay("0.");
      setWaitingForNewInput(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleToggleSign = () => {
    if (display === "0" || display === "Error" || display === "Cannot divide by 0") return;
    if (display.startsWith("-")) {
      setDisplay(display.slice(1));
    } else {
      setDisplay("-" + display);
    }
  };

  const handlePercentage = () => {
    const current = parseFloat(display);
    if (isNaN(current)) return;

    let res: number;
    if (prevValue !== null && operator) {
      res = (prevValue * current) / 100;
    } else {
      res = current / 100;
    }
    const formatted = formatNumber(res);
    setDisplay(formatted);
  };

  const calculate = (first: number, second: number, op: string): { result: number | null; error?: string } => {
    switch (op) {
      case "+":
        return { result: first + second };
      case "-":
        return { result: first - second };
      case "×":
      case "*":
        return { result: first * second };
      case "÷":
      case "/":
        if (second === 0) return { result: null, error: "Cannot divide by 0" };
        return { result: first / second };
      default:
        return { result: second };
    }
  };

  const formatNumber = (num: number): string => {
    if (isNaN(num)) return "Error";
    if (!isFinite(num)) return "Error";
    // Avoid floating point inaccuracies like 0.1 + 0.2 = 0.30000000000000004
    const rounded = Math.round(num * 1e10) / 1e10;
    const str = rounded.toString();
    if (str.length > 14) {
      return rounded.toExponential(6);
    }
    return str;
  };

  const handleOperator = (nextOp: string) => {
    const inputValue = parseFloat(display);
    if (isNaN(inputValue)) return;

    if (prevValue === null) {
      setPrevValue(inputValue);
      setOperator(nextOp);
      setWaitingForNewInput(true);
    } else if (operator) {
      if (waitingForNewInput) {
        // Change operator if no new digit entered yet
        setOperator(nextOp);
        return;
      }
      const { result, error } = calculate(prevValue, inputValue, operator);
      if (error) {
        setDisplay(error);
        setPrevValue(null);
        setOperator(null);
        setWaitingForNewInput(true);
        return;
      }
      if (result !== null) {
        const formatted = formatNumber(result);
        setDisplay(formatted);
        setPrevValue(result);
        setOperator(nextOp);
        setWaitingForNewInput(true);
      }
    }
  };

  const handleEquals = () => {
    if (prevValue === null || operator === null || waitingForNewInput) return;
    const inputValue = parseFloat(display);
    if (isNaN(inputValue)) return;

    const { result, error } = calculate(prevValue, inputValue, operator);
    const expression = `${prevValue} ${operator} ${inputValue}`;

    if (error) {
      setDisplay(error);
      setPrevValue(null);
      setOperator(null);
      setWaitingForNewInput(true);
      return;
    }

    if (result !== null) {
      const formatted = formatNumber(result);
      setDisplay(formatted);

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        expression,
        result: formatted,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      saveHistory([newItem, ...history]);

      setPrevValue(null);
      setOperator(null);
      setWaitingForNewInput(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error("Clipboard copy failed", e);
    }
  };

  const clearHistory = () => {
    saveHistory([]);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setDisplay(item.result);
    setWaitingForNewInput(true);
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keyboard if user is typing in an input elsewhere on page
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === ".") {
        e.preventDefault();
        handleDecimal();
      } else if (e.key === "+") {
        e.preventDefault();
        handleOperator("+");
      } else if (e.key === "-") {
        e.preventDefault();
        handleOperator("-");
      } else if (e.key === "*" || e.key === "x" || e.key === "X") {
        e.preventDefault();
        handleOperator("×");
      } else if (e.key === "/") {
        e.preventDefault();
        handleOperator("÷");
      } else if (e.key === "%") {
        e.preventDefault();
        handlePercentage();
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEquals();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [display, prevValue, operator, waitingForNewInput, history]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Outer Glass Card */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl">
        {/* Header Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                Smart Calculator
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Precision Arithmetic
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              title="Copy Result"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied && (
                <span className="absolute -top-7 right-0 text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded shadow-sm">
                  Copied!
                </span>
              )}
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              title="Calculation History"
              className={`p-2 rounded-lg transition-colors ${
                showHistory
                  ? "bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Display Screen */}
        <div className="glass-subtle rounded-xl p-4 mb-4 border border-slate-200/60 dark:border-slate-800/60 text-right overflow-hidden select-text">
          {/* Sub-expression (e.g. 150 × ) */}
          <div className="h-5 text-xs font-mono font-medium text-slate-400 dark:text-slate-500 truncate">
            {prevValue !== null && operator ? `${prevValue} ${operator}` : ""}
          </div>
          {/* Main output */}
          <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-slate-900 dark:text-white truncate mt-1">
            {display}
          </div>
        </div>

        {/* History Flyout Drawer */}
        {showHistory && (
          <div className="glass-panel rounded-xl p-3 mb-4 border border-slate-200/80 dark:border-slate-800/80 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Recent Calculations
              </span>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-3">
                No calculation history yet.
              </p>
            ) : (
              <div className="space-y-1.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer transition-colors text-xs font-mono group"
                  >
                    <div className="truncate pr-2">
                      <span className="text-slate-500 dark:text-slate-400">
                        {item.expression} =
                      </span>{" "}
                      <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        {item.result}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {item.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calculator Button Grid */}
        <div className="grid grid-cols-4 gap-2.5">
          {/* Row 1 */}
          <button
            onClick={handleClear}
            className="h-12 sm:h-13 rounded-xl font-semibold text-sm bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 active:scale-95 transition-all shadow-xs"
          >
            AC
          </button>
          <button
            onClick={handleBackspace}
            title="Backspace"
            className="h-12 sm:h-13 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center shadow-xs"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            onClick={handlePercentage}
            className="h-12 sm:h-13 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-xs"
          >
            %
          </button>
          <button
            onClick={() => handleOperator("÷")}
            className={`h-12 sm:h-13 rounded-xl font-semibold text-base active:scale-95 transition-all shadow-xs ${
              operator === "÷"
                ? "bg-brand-600 text-white ring-2 ring-brand-400"
                : "bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50"
            }`}
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            onClick={() => handleDigit("7")}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            7
          </button>
          <button
            onClick={() => handleDigit("8")}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            8
          </button>
          <button
            onClick={() => handleDigit("9")}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            9
          </button>
          <button
            onClick={() => handleOperator("×")}
            className={`h-12 sm:h-13 rounded-xl font-semibold text-base active:scale-95 transition-all shadow-xs ${
              operator === "×"
                ? "bg-brand-600 text-white ring-2 ring-brand-400"
                : "bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50"
            }`}
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            onClick={() => handleDigit("4")}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            4
          </button>
          <button
            onClick={() => handleDigit("5")}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            5
          </button>
          <button
            onClick={() => handleDigit("6")}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            6
          </button>
          <button
            onClick={() => handleOperator("-")}
            className={`h-12 sm:h-13 rounded-xl font-semibold text-base active:scale-95 transition-all shadow-xs ${
              operator === "-"
                ? "bg-brand-600 text-white ring-2 ring-brand-400"
                : "bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50"
            }`}
          >
            -
          </button>

          {/* Row 4 */}
          <button
            onClick={() => handleDigit("1")}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            1
          </button>
          <button
            onClick={() => handleDigit("2")}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            2
          </button>
          <button
            onClick={() => handleDigit("3")}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            3
          </button>
          <button
            onClick={() => handleOperator("+")}
            className={`h-12 sm:h-13 rounded-xl font-semibold text-base active:scale-95 transition-all shadow-xs ${
              operator === "+"
                ? "bg-brand-600 text-white ring-2 ring-brand-400"
                : "bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50"
            }`}
          >
            +
          </button>

          {/* Row 5 */}
          <button
            onClick={handleToggleSign}
            title="Toggle Sign (+/-)"
            className="h-12 sm:h-13 rounded-xl font-semibold text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-xs"
          >
            ±
          </button>
          <button
            onClick={() => handleDigit("0")}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            0
          </button>
          <button
            onClick={handleDecimal}
            className="h-12 sm:h-13 rounded-xl font-semibold text-base bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/60 dark:border-slate-800/80 shadow-xs"
          >
            .
          </button>
          <button
            onClick={handleEquals}
            className="h-12 sm:h-13 rounded-xl font-semibold text-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
          >
            =
          </button>
        </div>

        {/* Keyboard Helper Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Keyboard enabled (0-9, +, -, *, /, Enter, Esc)</span>
          <span className="font-mono">v1.0</span>
        </div>
      </div>
    </div>
  );
}
