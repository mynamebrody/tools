export type SqlDialect = "postgresql" | "mysql" | "sqlite";
export type SqlKeywordCase = "uppercase" | "lowercase";

type TokenType = "word" | "string" | "comment" | "symbol";

interface Token {
  value: string;
  type: TokenType;
}

const BASE_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "JOIN", "LEFT", "RIGHT", "INNER",
  "OUTER", "FULL", "CROSS", "ON", "AS", "AND", "OR", "NOT", "IN", "EXISTS", "BETWEEN",
  "LIKE", "IS", "NULL", "DISTINCT", "UNION", "ALL", "CASE", "WHEN", "THEN", "ELSE", "END",
  "CREATE", "TABLE", "ALTER", "DROP", "INDEX", "VIEW", "WITH", "RECURSIVE", "RETURNING",
]);

const DIALECT_KEYWORDS: Record<SqlDialect, Set<string>> = {
  postgresql: new Set(["ILIKE", "SIMILAR", "SERIAL", "JSONB", "RETURNING", "LATERAL"]),
  mysql: new Set(["REPLACE", "STRAIGHT_JOIN", "AUTO_INCREMENT", "SHOW", "DESCRIBE"]),
  sqlite: new Set(["WITHOUT", "ROWID", "GLOB", "PRAGMA", "VACUUM"]),
};

const CLAUSE_BREAK_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "GROUP", "ORDER", "HAVING", "LIMIT", "OFFSET",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE", "JOIN", "LEFT", "RIGHT", "INNER",
  "OUTER", "FULL", "CROSS", "ON", "UNION", "WITH", "WHEN", "ELSE", "THEN",
]);

function tokenizeSql(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === "-" && sql[i + 1] === "-") {
      let j = i + 2;
      while (j < sql.length && sql[j] !== "\n") j += 1;
      tokens.push({ value: sql.slice(i, j), type: "comment" });
      i = j;
      continue;
    }

    if (ch === "/" && sql[i + 1] === "*") {
      let j = i + 2;
      while (j < sql.length - 1 && !(sql[j] === "*" && sql[j + 1] === "/")) j += 1;
      j = Math.min(j + 2, sql.length);
      tokens.push({ value: sql.slice(i, j), type: "comment" });
      i = j;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === quote) {
          if (sql[j + 1] === quote) {
            j += 2;
            continue;
          }

          j += 1;
          break;
        }

        j += 1;
      }

      tokens.push({ value: sql.slice(i, j), type: "string" });
      i = j;
      continue;
    }

    if (/[(),.;]/.test(ch)) {
      tokens.push({ value: ch, type: "symbol" });
      i += 1;
      continue;
    }

    let j = i;
    while (j < sql.length && !/\s/.test(sql[j]) && !/[(),.;]/.test(sql[j])) {
      if (sql[j] === "-" && sql[j + 1] === "-") break;
      if (sql[j] === "/" && sql[j + 1] === "*") break;
      j += 1;
    }

    tokens.push({ value: sql.slice(i, j), type: "word" });
    i = j;
  }

  return tokens;
}

function isKeyword(token: Token, dialect: SqlDialect): boolean {
  if (token.type !== "word") return false;
  const upper = token.value.toUpperCase();
  return BASE_KEYWORDS.has(upper) || DIALECT_KEYWORDS[dialect].has(upper);
}

function withKeywordCase(value: string, keywordCase: SqlKeywordCase): string {
  return keywordCase === "uppercase" ? value.toUpperCase() : value.toLowerCase();
}

export function formatSql(
  sql: string,
  { dialect, keywordCase, indentSize }: { dialect: SqlDialect; keywordCase: SqlKeywordCase; indentSize: number }
): string {
  const tokens = tokenizeSql(sql);
  const lines: string[] = [];
  let currentLine = "";
  let indentLevel = 0;

  const flushLine = () => {
    if (currentLine.trim()) {
      lines.push(currentLine.trimEnd());
      currentLine = "";
    }
  };

  const append = (text: string) => {
    if (!currentLine) {
      currentLine = `${" ".repeat(indentLevel * indentSize)}${text}`;
    } else {
      currentLine += `${needsSpace(currentLine, text) ? " " : ""}${text}`;
    }
  };

  for (const token of tokens) {
    const upper = token.value.toUpperCase();

    if (token.value === ")") {
      flushLine();
      indentLevel = Math.max(0, indentLevel - 1);
      append(")");
      continue;
    }

    if (token.type === "comment") {
      flushLine();
      append(token.value);
      flushLine();
      continue;
    }

    if (token.value === "(") {
      append("(");
      flushLine();
      indentLevel += 1;
      continue;
    }

    if (token.value === ",") {
      append(",");
      flushLine();
      continue;
    }

    if (token.value === ";") {
      append(";");
      flushLine();
      lines.push("");
      continue;
    }

    if (isKeyword(token, dialect) && CLAUSE_BREAK_KEYWORDS.has(upper)) {
      flushLine();
      append(withKeywordCase(token.value, keywordCase));
      continue;
    }

    if (isKeyword(token, dialect)) {
      append(withKeywordCase(token.value, keywordCase));
      continue;
    }

    append(token.value);
  }

  flushLine();

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function needsSpace(currentLine: string, next: string): boolean {
  if (!currentLine) return false;
  const last = currentLine[currentLine.length - 1];
  if (last === "(" || next === ")" || next === "," || next === ";") return false;
  return true;
}

export function minifySql(sql: string, { dialect, keywordCase }: { dialect: SqlDialect; keywordCase: SqlKeywordCase }): string {
  const tokens = tokenizeSql(sql);
  let output = "";
  let forceNewlineBeforeNextToken = false;

  for (const token of tokens) {
    let value = token.value;

    if (isKeyword(token, dialect)) {
      value = withKeywordCase(token.value, keywordCase);
    }

    if (!output) {
      output = value;
      forceNewlineBeforeNextToken = token.type === "comment" && token.value.startsWith("--");
      continue;
    }

    if (token.value === "," || token.value === ")" || token.value === ";") {
      output += value;
      forceNewlineBeforeNextToken = false;
      continue;
    }

    const prev = output[output.length - 1];
    if (prev === "(" || value === "(") {
      output += value;
      forceNewlineBeforeNextToken = false;
      continue;
    }

    output += `${forceNewlineBeforeNextToken ? "\n" : " "}${value}`;
    forceNewlineBeforeNextToken = token.type === "comment" && token.value.startsWith("--");
  }

  return output.replace(/;\s*/g, ";\n").trim();
}
