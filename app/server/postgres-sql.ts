/**
 * The routes were written for D1 (SQLite). Postgres speaks the same shape for
 * everything else, so this translation handles the few SQLite-isms: `?`
 * placeholders, `INSERT OR IGNORE`, and `julianday()` date maths.
 */
export function toPostgresSql(sql: string): string {
  let text = sql;
  const ignoreInsert = /^\s*insert\s+or\s+ignore\s+into/i.test(text);
  if (ignoreInsert) {
    text = text.replace(/^(\s*)insert\s+or\s+ignore\s+into/i, "$1insert into");
  }

  // julianday('now','-10 minutes') -> now() - interval '10 minutes'
  text = text.replace(
    /julianday\(\s*'now'\s*,\s*'-(\d+)\s+([a-z]+)'\s*\)/gi,
    (_match, amount: string, unit: string) => `now() - interval '${amount} ${unit}'`,
  );
  // julianday(created) -> (created)::timestamptz
  text = text.replace(
    /julianday\(\s*([a-z_][a-z0-9_]*)\s*\)/gi,
    "($1)::timestamptz",
  );

  text = placeholders(text);

  if (ignoreInsert && !/on\s+conflict/i.test(text)) {
    text = text.trimEnd().replace(/;$/, "") + " on conflict do nothing";
  }
  return text;
}

function placeholders(sql: string): string {
  let out = "";
  let index = 0;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
      let end = i + 1;
      while (end < sql.length) {
        if (sql[end] === "'" && sql[end + 1] === "'") {
          end += 2;
          continue;
        }
        if (sql[end] === "'") break;
        end++;
      }
      out += sql.slice(i, Math.min(end + 1, sql.length));
      i = end;
      continue;
    }
    if (char === "?") {
      index++;
      out += "$" + index;
      continue;
    }
    out += char;
  }
  return out;
}
