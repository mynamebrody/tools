"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import yaml from "js-yaml";
import { Button } from "@/components/ui/button";

type DataFormat = "json" | "yaml" | "toml" | "xml";

const formatLabels: Record<DataFormat, string> = {
  json: "JSON",
  yaml: "YAML",
  toml: "TOML",
  xml: "XML",
};

export function ConfigConverterTool() {
  const [input, setInput] = useState("");
  const [sourceFormat, setSourceFormat] = useState<DataFormat>("json");
  const [targetFormat, setTargetFormat] = useState<DataFormat>("yaml");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const canConvert = useMemo(() => sourceFormat !== targetFormat, [sourceFormat, targetFormat]);

  const runConvert = () => {
    setError("");

    try {
      const parsed = parseByFormat(input, sourceFormat);
      setOutput(stringifyByFormat(parsed, targetFormat, true));
    } catch (err) {
      setOutput("");
      setError(getErrorMessage(err));
    }
  };

  const runFormat = () => {
    setError("");

    try {
      const parsed = parseByFormat(input, sourceFormat);
      setOutput(stringifyByFormat(parsed, sourceFormat, true));
    } catch (err) {
      setOutput("");
      setError(getErrorMessage(err));
    }
  };

  const runMinify = () => {
    setError("");

    try {
      const parsed = parseByFormat(input, sourceFormat);
      setOutput(stringifyByFormat(parsed, sourceFormat, false));
    } catch (err) {
      setOutput("");
      setError(getErrorMessage(err));
    }
  };

  const runValidate = () => {
    setError("");

    try {
      parseByFormat(input, sourceFormat);
      setOutput("Valid " + formatLabels[sourceFormat] + " ✓");
    } catch (err) {
      setOutput("");
      setError(getErrorMessage(err));
    }
  };

  const copyOutput = async () => {
    if (!output) {
      return;
    }

    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Source format</label>
          <select
            value={sourceFormat}
            onChange={(e) => setSourceFormat(e.target.value as DataFormat)}
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
          >
            {Object.entries(formatLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Target format</label>
          <select
            value={targetFormat}
            onChange={(e) => setTargetFormat(e.target.value as DataFormat)}
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
          >
            {Object.entries(formatLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-lg font-bold block">Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste ${formatLabels[sourceFormat]} here`}
            className="w-full min-h-[280px] rounded-lg border bg-background p-4 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-lg font-bold block">Output</label>
            <Button onClick={copyOutput} variant="outline" size="sm" disabled={!output}>
              {copied ? <Check className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Formatted/converted output appears here"
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
        <Button onClick={runConvert} disabled={!canConvert}>Convert</Button>
        <Button onClick={runFormat} variant="outline">Format</Button>
        <Button onClick={runMinify} variant="outline">Minify</Button>
        <Button onClick={runValidate} variant="outline">Validate</Button>
        <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>
          Clear
        </Button>
      </div>
    </div>
  );
}

function parseByFormat(input: string, format: DataFormat): unknown {
  if (!input.trim()) {
    throw new Error("Input is empty");
  }

  switch (format) {
    case "json":
      return JSON.parse(input);
    case "yaml":
      return yaml.load(input);
    case "toml":
      return parseToml(input);
    case "xml":
      return parseXml(input);
  }
}

function stringifyByFormat(value: unknown, format: DataFormat, pretty: boolean): string {
  switch (format) {
    case "json":
      return JSON.stringify(value, null, pretty ? 2 : 0);
    case "yaml":
      return yaml.dump(value, {
        indent: 2,
        sortKeys: false,
        noRefs: true,
        lineWidth: -1,
        flowLevel: pretty ? -1 : 0,
        condenseFlow: !pretty,
      });
    case "toml":
      return stringifyToml(value, pretty);
    case "xml":
      return stringifyXml(value, pretty);
  }
}

function parseToml(input: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let current = root;

  const lines = input.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("[") && line.endsWith("]")) {
      const sectionPath = line.slice(1, -1).trim();
      if (!sectionPath) {
        throw new Error(`TOML section missing name (line ${i + 1})`);
      }

      current = ensurePath(root, sectionPath.split("."));
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      throw new Error(`Invalid TOML statement at line ${i + 1}`);
    }

    const key = line.slice(0, eqIndex).trim();
    const rawValue = line.slice(eqIndex + 1).trim();

    if (!key) {
      throw new Error(`TOML key missing at line ${i + 1}`);
    }

    current[key] = parseTomlValue(rawValue, i + 1);
  }

  return root;
}

function parseTomlValue(rawValue: string, line: number): unknown {
  if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
    return rawValue.slice(1, -1).replaceAll('\\"', '"');
  }

  if (rawValue === "true" || rawValue === "false") {
    return rawValue === "true";
  }

  if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
    const inside = rawValue.slice(1, -1).trim();

    if (!inside) {
      return [];
    }

    return inside.split(",").map((part) => parseTomlValue(part.trim(), line));
  }

  const numeric = Number(rawValue);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  throw new Error(`Unsupported TOML value at line ${line}: ${rawValue}`);
}

function stringifyToml(value: unknown, pretty: boolean): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TOML output must be an object at the root");
  }

  const lines: string[] = [];
  writeTomlObject(value as Record<string, unknown>, lines, [], pretty);
  return lines.join("\n").trimEnd();
}

function writeTomlObject(
  obj: Record<string, unknown>,
  lines: string[],
  path: string[],
  pretty: boolean,
): void {
  const scalarEntries = Object.entries(obj).filter(([, val]) => !isPlainObject(val));
  const nestedEntries = Object.entries(obj).filter(([, val]) => isPlainObject(val));

  if (path.length > 0) {
    if (lines.length > 0 && pretty) {
      lines.push("");
    }

    lines.push(`[${path.join(".")}]`);
  }

  for (const [key, val] of scalarEntries) {
    lines.push(`${key} = ${tomlValueToString(val)}`);
  }

  for (const [key, val] of nestedEntries) {
    writeTomlObject(val as Record<string, unknown>, lines, [...path, key], pretty);
  }
}

function tomlValueToString(value: unknown): string {
  if (typeof value === "string") {
    return `"${value.replaceAll('"', '\\"')}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(tomlValueToString).join(", ")}]`;
  }

  throw new Error("Unsupported value for TOML export");
}

function parseXml(input: string): unknown {
  const parser = new DOMParser();
  const document = parser.parseFromString(input, "application/xml");
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error(parserError.textContent?.trim() || "Invalid XML");
  }

  if (!document.documentElement) {
    throw new Error("Invalid XML document");
  }

  return {
    [document.documentElement.nodeName]: xmlNodeToObject(document.documentElement),
  };
}

function stringifyXml(value: unknown, pretty: boolean): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("XML output must be an object with one root element");
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length !== 1) {
    throw new Error("XML output must contain exactly one root key");
  }

  const [rootName, rootValue] = entries[0];
  const root = objectToXmlNode(rootName, rootValue);

  if (!pretty) {
    return root.replace(/>\s+</g, "><").trim();
  }

  return root;
}

function xmlNodeToObject(element: Element): unknown {
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    attributes[attr.name] = attr.value;
  }

  const children = Array.from(element.children);
  const text = element.textContent?.trim() ?? "";

  if (children.length === 0 && Object.keys(attributes).length === 0) {
    return text;
  }

  const result: Record<string, unknown> = {};

  if (Object.keys(attributes).length > 0) {
    result["@attributes"] = attributes;
  }

  for (const child of children) {
    const value = xmlNodeToObject(child);
    if (result[child.nodeName] === undefined) {
      result[child.nodeName] = value;
    } else if (Array.isArray(result[child.nodeName])) {
      (result[child.nodeName] as unknown[]).push(value);
    } else {
      result[child.nodeName] = [result[child.nodeName], value];
    }
  }

  if (text && children.length === 0) {
    result["#text"] = text;
  }

  return result;
}

function objectToXmlNode(name: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => objectToXmlNode(name, item)).join("");
  }

  if (!isPlainObject(value)) {
    return `<${name}>${escapeXml(String(value ?? ""))}</${name}>`;
  }

  const obj = value as Record<string, unknown>;
  const attrs = isPlainObject(obj["@attributes"]) ? (obj["@attributes"] as Record<string, unknown>) : {};
  const attrText = Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${escapeXml(String(v))}"`)
    .join("");

  const children = Object.entries(obj)
    .filter(([key]) => key !== "@attributes" && key !== "#text")
    .map(([key, childValue]) => objectToXmlNode(key, childValue))
    .join("");

  const text = typeof obj["#text"] === "string" ? escapeXml(obj["#text"] as string) : "";

  if (!children && !text) {
    return `<${name}${attrText} />`;
  }

  return `<${name}${attrText}>${text}${children}</${name}>`;
}

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function ensurePath(root: Record<string, unknown>, parts: string[]): Record<string, unknown> {
  let cursor = root;

  for (const part of parts) {
    if (!isPlainObject(cursor[part])) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }

  return cursor;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return "Unable to process input";
}
