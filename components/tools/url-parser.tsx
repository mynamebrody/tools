"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface UrlParam {
  id: string;
  key: string;
  value: string;
}

interface ParsedUrlState {
  protocol: string;
  host: string;
  path: string;
  hash: string;
  params: UrlParam[];
}

const emptyUrlState: ParsedUrlState = {
  protocol: "https:",
  host: "",
  path: "/",
  hash: "",
  params: [],
};

export function UrlParserTool() {
  const [rawUrl, setRawUrl] = useState("");
  const [urlState, setUrlState] = useState<ParsedUrlState>(emptyUrlState);
  const [parseError, setParseError] = useState("");
  const [compareUrl, setCompareUrl] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const parseInputUrl = () => {
    if (!rawUrl.trim()) {
      setUrlState(emptyUrlState);
      setParseError("");
      return;
    }

    const parsed = tryParseUrl(rawUrl.trim());

    if (!parsed) {
      setParseError("Unable to parse URL. Include a hostname and valid URL characters.");
      return;
    }

    setParseError("");
    setUrlState({
      protocol: parsed.protocol || "https:",
      host: parsed.host,
      path: parsed.pathname || "/",
      hash: parsed.hash.replace(/^#/, ""),
      params: [...parsed.searchParams.entries()].map(([key, value], index) => ({
        id: `${key}-${index}-${crypto.randomUUID()}`,
        key,
        value,
      })),
    });
  };

  const rebuiltQueryString = useMemo(() => {
    const searchParams = new URLSearchParams();

    urlState.params.forEach((param) => {
      if (!param.key) {
        return;
      }
      searchParams.append(param.key, param.value);
    });

    return searchParams.toString();
  }, [urlState.params]);

  const rebuiltUrl = useMemo(() => {
    if (!urlState.host) {
      return "";
    }

    const protocol = urlState.protocol.endsWith(":")
      ? urlState.protocol
      : `${urlState.protocol}:`;
    const path = urlState.path.startsWith("/") ? urlState.path : `/${urlState.path}`;
    const hash = urlState.hash ? `#${urlState.hash}` : "";
    const query = rebuiltQueryString ? `?${rebuiltQueryString}` : "";

    return `${protocol}//${urlState.host}${path}${query}${hash}`;
  }, [rebuiltQueryString, urlState.hash, urlState.host, urlState.path, urlState.protocol]);

  const fetchReadySnippet = useMemo(() => {
    if (!rebuiltUrl) {
      return "";
    }

    return `const url = "${rebuiltUrl}";\nconst response = await fetch(url);`;
  }, [rebuiltUrl]);

  const compareSummary = useMemo(() => {
    if (!compareUrl.trim() || !rebuiltUrl) {
      return null;
    }

    const left = tryParseUrl(rebuiltUrl);
    const right = tryParseUrl(compareUrl.trim());

    if (!left || !right) {
      return {
        valid: false,
        message: "Could not compare URLs. Ensure both URLs are valid.",
        rows: [],
      };
    }

    const leftParams = toParamSummary(left.searchParams);
    const rightParams = toParamSummary(right.searchParams);

    return {
      valid: true,
      message: "",
      rows: [
        { label: "Protocol", same: left.protocol === right.protocol, left: left.protocol, right: right.protocol },
        { label: "Host", same: left.host === right.host, left: left.host, right: right.host },
        { label: "Path", same: left.pathname === right.pathname, left: left.pathname, right: right.pathname },
        {
          label: "Query Params",
          same: leftParams === rightParams,
          left: leftParams || "(none)",
          right: rightParams || "(none)",
        },
        { label: "Hash", same: left.hash === right.hash, left: left.hash || "(none)", right: right.hash || "(none)" },
      ],
    };
  }, [compareUrl, rebuiltUrl]);

  const updateParam = (id: string, field: "key" | "value", value: string) => {
    setUrlState((prev) => ({
      ...prev,
      params: prev.params.map((param) => (param.id === id ? { ...param, [field]: value } : param)),
    }));
  };

  const transformParam = (id: string, field: "key" | "value", mode: "encode" | "decode") => {
    setUrlState((prev) => ({
      ...prev,
      params: prev.params.map((param) => {
        if (param.id !== id) {
          return param;
        }

        const value = param[field];

        try {
          return {
            ...param,
            [field]: mode === "encode" ? encodeURIComponent(value) : decodeURIComponent(value),
          };
        } catch {
          return param;
        }
      }),
    }));
  };

  const addParam = (key = "", value = "") => {
    setUrlState((prev) => ({
      ...prev,
      params: [...prev.params, { id: crypto.randomUUID(), key, value }],
    }));
  };

  const duplicateParam = (param: UrlParam) => addParam(param.key, param.value);

  const removeParam = (id: string) => {
    setUrlState((prev) => ({
      ...prev,
      params: prev.params.filter((param) => param.id !== id),
    }));
  };

  const copyText = async (value: string, key: string) => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="url-input">URL input</Label>
        <div className="flex gap-2">
          <Input
            id="url-input"
            value={rawUrl}
            onChange={(event) => setRawUrl(event.target.value)}
            placeholder="https://example.com/search?q=shoes&q=boots#sale"
            className="font-mono"
          />
          <Button onClick={parseInputUrl}>Parse</Button>
        </div>
        {parseError && <p className="text-sm text-destructive">{parseError}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Protocol</Label>
          <Input value={urlState.protocol} onChange={(event) => setUrlState((prev) => ({ ...prev, protocol: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Host</Label>
          <Input value={urlState.host} onChange={(event) => setUrlState((prev) => ({ ...prev, host: event.target.value }))} placeholder="example.com" />
        </div>
        <div className="space-y-2">
          <Label>Path</Label>
          <Input value={urlState.path} onChange={(event) => setUrlState((prev) => ({ ...prev, path: event.target.value }))} placeholder="/search" />
        </div>
        <div className="space-y-2">
          <Label>Hash (without #)</Label>
          <Input value={urlState.hash} onChange={(event) => setUrlState((prev) => ({ ...prev, hash: event.target.value }))} placeholder="section-1" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Query Params (duplicates supported)</h3>
          <Button variant="outline" size="sm" onClick={() => addParam()}>
            <Plus className="size-4 mr-2" />
            Add param
          </Button>
        </div>

        <div className="space-y-2">
          {urlState.params.length === 0 ? (
            <p className="text-sm text-muted-foreground border rounded-md p-3">No query params yet.</p>
          ) : (
            urlState.params.map((param) => (
              <div key={param.id} className="grid gap-2 rounded-md border p-3 lg:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-2">
                  <Label className="text-xs">Key</Label>
                  <Input value={param.key} onChange={(event) => updateParam(param.id, "key", event.target.value)} className="font-mono" />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => transformParam(param.id, "key", "encode")}>Encode</Button>
                    <Button variant="ghost" size="sm" onClick={() => transformParam(param.id, "key", "decode")}>Decode</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Value</Label>
                  <Input value={param.value} onChange={(event) => updateParam(param.id, "value", event.target.value)} className="font-mono" />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => transformParam(param.id, "value", "encode")}>Encode</Button>
                    <Button variant="ghost" size="sm" onClick={() => transformParam(param.id, "value", "decode")}>Decode</Button>
                  </div>
                </div>

                <div className="flex lg:flex-col gap-2 lg:justify-end">
                  <Button variant="outline" size="sm" onClick={() => duplicateParam(param)}>Duplicate</Button>
                  <Button variant="outline" size="sm" onClick={() => removeParam(param.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Fetch-ready query string</Label>
            <Button variant="outline" size="sm" onClick={() => copyText(rebuiltQueryString, "query")}> {copied === "query" ? <Check className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}Copy</Button>
          </div>
          <Input value={rebuiltQueryString ? `?${rebuiltQueryString}` : ""} readOnly className="font-mono" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Rebuilt URL</Label>
            <Button variant="outline" size="sm" onClick={() => copyText(rebuiltUrl, "url")}> {copied === "url" ? <Check className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}Copy</Button>
          </div>
          <Textarea value={rebuiltUrl} readOnly className="font-mono min-h-[88px]" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Fetch snippet</Label>
            <Button variant="outline" size="sm" onClick={() => copyText(fetchReadySnippet, "fetch")}> {copied === "fetch" ? <Check className="size-4 mr-2" /> : <Copy className="size-4 mr-2" />}Copy</Button>
          </div>
          <Textarea value={fetchReadySnippet} readOnly className="font-mono min-h-[88px]" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="compare-url">Compare against second URL</Label>
        <Input
          id="compare-url"
          value={compareUrl}
          onChange={(event) => setCompareUrl(event.target.value)}
          placeholder="https://example.com/search?q=boots"
          className="font-mono"
        />

        {compareSummary && (
          <div className="rounded-md border p-3 space-y-2">
            {!compareSummary.valid ? (
              <p className="text-sm text-destructive">{compareSummary.message}</p>
            ) : (
              compareSummary.rows.map((row) => (
                <div key={row.label} className="grid gap-1 sm:grid-cols-[120px_1fr_1fr] text-sm">
                  <p className="font-medium">{row.label}</p>
                  <p className={row.same ? "text-foreground" : "text-amber-600 dark:text-amber-400"}>{row.left}</p>
                  <p className={row.same ? "text-foreground" : "text-amber-600 dark:text-amber-400"}>{row.right}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function toParamSummary(searchParams: URLSearchParams): string {
  const items = [...searchParams.entries()].map(([key, value]) => `${key}=${value}`);
  return items.sort((a, b) => a.localeCompare(b)).join("&");
}
