"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function JsonFormatterTool() {
  const [input, setInput] = useState("");
  const [indentType, setIndentType] = useState<"spaces" | "tabs">("spaces");
  const [indentSize, setIndentSize] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [formatted, setFormatted] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const indentValue = useMemo(() => {
    if (indentType === "tabs") {
      return "\t";
    }

    return " ".repeat(indentSize);
  }, [indentSize, indentType]);

  const formatJson = () => {
    setError("");

    try {
      const parsed = JSON.parse(input);
      const normalized = sortKeys ? sortObjectKeys(parsed) : parsed;
      const output = JSON.stringify(normalized, null, indentValue);
      setFormatted(output);
    } catch (err) {
      setFormatted("");
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const minifyJson = () => {
    setError("");

    try {
      const parsed = JSON.parse(input);
      const normalized = sortKeys ? sortObjectKeys(parsed) : parsed;
      const output = JSON.stringify(normalized);
      setFormatted(output);
    } catch (err) {
      setFormatted("");
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const copyOutput = async () => {
    if (!formatted) {
      return;
    }

    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-lg font-bold block">Formatting Options</label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Indent type</label>
            <select
              value={indentType}
              onChange={(e) => setIndentType(e.target.value as "spaces" | "tabs")}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="spaces">Spaces</option>
              <option value="tabs">Tabs</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Space count</label>
            <select
              value={indentSize}
              onChange={(e) => setIndentSize(Number(e.target.value))}
              disabled={indentType === "tabs"}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm disabled:opacity-50"
            >
              {[2, 4, 8].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-md border px-3 h-10 mt-auto">
            <input
              type="checkbox"
              checked={sortKeys}
              onChange={(e) => setSortKeys(e.target.checked)}
              className="size-4"
            />
            <span className="text-sm">Sort keys</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-lg font-bold block">Input JSON</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Paste JSON here, e.g. {"status":"ok"}'
            className="w-full min-h-[280px] rounded-lg border bg-background p-4 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-lg font-bold block">Formatted Output</label>
            <Button onClick={copyOutput} variant="outline" size="sm" disabled={!formatted}>
              {copied ? <Check className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <textarea
            value={formatted}
            readOnly
            placeholder="Formatted JSON will appear here"
            className="w-full min-h-[280px] rounded-lg border bg-muted/30 p-4 font-mono text-sm resize-y"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={formatJson}>Format JSON</Button>
        <Button variant="outline" onClick={minifyJson}>Minify JSON</Button>
        <Button variant="ghost" onClick={() => { setInput(""); setFormatted(""); setError(""); }}>
          Clear
        </Button>
      </div>
    </div>
  );
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}
