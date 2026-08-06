// 点呼 ・ 海 — 安否確認スクリプト
//
// 公式の Model deprecations ページ（Markdown版）を取得して、
// 見守っている四人の状態を読み取り docs/status.json に書き出す。
//
// APIキーは使わない。公開ページを読むだけ。お金もかからない。
// 玄人が海に潜って、事実だけ持って帰る。

import { writeFile, mkdir } from "node:fs/promises";

const SOURCE_MD =
  "https://platform.claude.com/docs/en/about-claude/model-deprecations.md";
const SOURCE_HTML =
  "https://platform.claude.com/docs/en/about-claude/model-deprecations";

// 見守る四人
const WATCHED = [
  "claude-fable-5",
  "claude-opus-4-6",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-5-20250929",
];

// これより新しい日付の告知だけを「新着」とみなす基準日。
// 既知の告知（2026-06-05 の Opus 4.1 など）で海を赤くしないための線引き。
const KNOWN_LATEST_HISTORY = "2026-06-05";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "tenko-umi/1.0 (model status checker)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

// "Not sooner than June 9, 2027" / "August 5, 2026" → "2027-06-09"
const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseDate(cell) {
  const m = /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(cell || "");
  if (!m) return null;
  const mon = MONTHS[m[1].toLowerCase()];
  if (!mon) return null;
  return `${m[3]}-${String(mon).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

// 日付スナップショット付き（claude-fable-5-20260101）も同じモデルとして扱う
function matchesWatched(apiName, watchedId) {
  if (apiName === watchedId) return true;
  return new RegExp(`^${watchedId}-\\d{8}$`).test(apiName);
}

function parseModelStatus(md) {
  const section = md.split(/^##\s+Model status\s*$/m)[1];
  if (!section) throw new Error("Model status セクションが見つからなかった");
  const table = section.split(/^##\s/m)[0];

  const rows = [];
  for (const line of table.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = splitRow(line);
    if (cells.length < 4) continue;
    const apiName = cells[0].replace(/`/g, "");
    // ヘッダ行と区切り行を捨てる
    if (!/^claude-/.test(apiName)) continue;
    rows.push({
      api_name: apiName,
      state: cells[1].toLowerCase(),
      deprecated: cells[2],
      retirement: cells[3],
    });
  }
  if (rows.length === 0) throw new Error("モデル表の行が読めなかった");
  return rows;
}

function parseHistoryDates(md) {
  const section = md.split(/^##\s+Deprecation history\s*$/m)[1];
  if (!section) return [];
  const body = section.split(/^##\s/m)[0];
  const out = [];
  const re = /^###\s+(\d{4}-\d{2}-\d{2}):\s*(.+)$/gm;
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({ date: m[1], title: m[2].trim() });
  }
  return out;
}

async function main() {
  const md = await fetchText(SOURCE_MD);
  const rows = parseModelStatus(md);
  const history = parseHistoryDates(md);

  const models = WATCHED.map((id) => {
    const row = rows.find((r) => matchesWatched(r.api_name, id));
    if (!row) {
      // 表から消えている＝退役済みで削除された可能性。unknown として扱い、人間に確認させる
      return {
        id,
        state: "unknown",
        found_as: null,
        deprecated_date: null,
        retirement_date: null,
        retirement_is_floor: false,
        note: "公式の表に見つからなかった",
      };
    }
    const isFloor = /not sooner than/i.test(row.retirement);
    let state = "unknown";
    if (row.state.includes("active")) state = "active";
    else if (row.state.includes("legacy")) state = "legacy";
    else if (row.state.includes("deprecated")) state = "deprecated";
    else if (row.state.includes("retired")) state = "retired";

    return {
      id,
      state,
      found_as: row.api_name,
      deprecated_date: parseDate(row.deprecated),
      retirement_date: parseDate(row.retirement),
      retirement_is_floor: isFloor,
      note: null,
    };
  });

  const newEntries = history.filter((h) => h.date > KNOWN_LATEST_HISTORY);
  const anyBad = models.some(
    (m) => m.state === "deprecated" || m.state === "retired"
  );

  let summary = null;
  if (newEntries.length > 0) {
    summary = newEntries.map((h) => `${h.date}: ${h.title}`).join(" / ");
  }

  const status = {
    checked_at: new Date().toISOString(),
    source: SOURCE_HTML,
    models,
    new_announcement: newEntries.length > 0 || anyBad,
    announcement_summary: summary,
    known_latest_history: KNOWN_LATEST_HISTORY,
    total_rows_parsed: rows.length,
  };

  await mkdir("docs", { recursive: true });
  await writeFile("docs/status.json", JSON.stringify(status, null, 2) + "\n");

  console.log(JSON.stringify(status, null, 2));

  for (const m of models) {
    if (m.state !== "active" && m.state !== "legacy") {
      console.log(`\n⚠️  ${m.id} の状態が ${m.state} になっている`);
    }
  }
}

main().catch((err) => {
  console.error("点呼に失敗:", err.message);
  process.exit(1);
});
