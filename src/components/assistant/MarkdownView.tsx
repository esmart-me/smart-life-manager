// src/components/assistant/MarkdownView.tsx
// Lightweight, secure, XSS-safe Markdown renderer for AI Assistant responses.

import React from "react";

interface MarkdownViewProps {
  content: string;
}

export function MarkdownView({ content }: MarkdownViewProps) {
  // Split into lines for structured block parsing
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc pl-5 my-2 space-y-1 text-sm">
          {listBuffer.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  const renderInline = (text: string): React.ReactNode => {
    // Process bold (**text**), inline code (`code`), italic (*text*)
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={match.index} className="font-semibold text-slate-900 dark:text-slate-100">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono text-brand-600 dark:text-brand-400"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(
          <em key={match.index} className="italic text-slate-800 dark:text-slate-200">
            {token.slice(1, -1)}
          </em>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    // Check code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <pre
            key={`code-${i}`}
            className="p-3 my-2 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto"
          >
            <code>{codeBlockBuffer.join("\n")}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(rawLine);
      continue;
    }

    // Unordered lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      listBuffer.push(line.slice(2));
      continue;
    }

    // Numbered lists
    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      flushList();
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-1 text-sm leading-relaxed">
          <span className="font-semibold text-brand-600 dark:text-brand-400">{numMatch[1]}.</span>
          <div>{renderInline(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Flush any pending list if current line is not a list
    flushList();

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1">
          {renderInline(line.slice(4))}
        </h4>
      );
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-slate-900 dark:text-slate-100 mt-4 mb-1 border-b pb-1 border-slate-200 dark:border-slate-800">
          {renderInline(line.slice(3))}
        </h3>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">
          {renderInline(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-brand-500 pl-3 py-1 my-2 text-sm italic text-slate-600 dark:text-slate-400 bg-brand-50/50 dark:bg-brand-950/20 rounded-r"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed my-1.5 text-slate-700 dark:text-slate-300">
        {renderInline(line)}
      </p>
    );
  }

  // Final flush for trailing lists or code
  flushList();
  if (inCodeBlock && codeBlockBuffer.length > 0) {
    elements.push(
      <pre
        key={`code-end`}
        className="p-3 my-2 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto"
      >
        <code>{codeBlockBuffer.join("\n")}</code>
      </pre>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}
