// notes/*.html の見出しと最終更新日を読み取り、notes.html の一覧を再生成する
// あわせて、各記事に表示する最終更新日の文字を datetime から自動で整える
// 使い方: node scripts/build-notes.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const notesDir = path.join(root, "notes");
const indexPath = path.join(root, "notes.html");
const START = "<!-- NOTES:START -->";
const END = "<!-- NOTES:END -->";

const errors = [];

const notes = readdirSync(notesDir)
  .filter((file) => file.endsWith(".html") && !file.startsWith("_"))
  .map((file) => {
    const filePath = path.join(notesDir, file);
    const html = readFileSync(filePath, "utf8");
    const title = html.match(/<h1\b[^>]*class="page-head__title"[^>]*>([\s\S]*?)<\/h1>/)?.[1].trim();
    const timeMatch = html.match(/(<time\b[^>]*class="note-updated"[^>]*>)([^<]*)(<\/time>)/);
    const updated = timeMatch?.[1].match(/datetime="(\d{4})-(\d{2})-(\d{2})"/);

    if (!title) errors.push(`${file}: h1.page-head__title が見つかりません`);
    if (!updated) {
      errors.push(`${file}: time.note-updated の datetime（YYYY-MM-DD）が見つかりません`);
      return { file, title };
    }

    const [, y, m, d] = updated;
    // 存在しない日付(2026-02-31 など)を弾く
    const valid = new Date(Date.UTC(+y, +m - 1, +d));
    if (valid.getUTCFullYear() !== +y || valid.getUTCMonth() !== +m - 1 || valid.getUTCDate() !== +d) {
      errors.push(`${file}: datetime の日付が正しくありません (${y}-${m}-${d})`);
      return { file, title };
    }

    // 表示される日付の文字を datetime に合わせる（編集は datetime だけでよい）
    const label = `${y}年${+m}月${+d}日`;
    if (timeMatch[2] !== label) {
      writeFileSync(filePath, html.replace(timeMatch[0], `${timeMatch[1]}${label}${timeMatch[3]}`));
      console.log(`${file}: 表示日付を ${label} に更新しました`);
    }
    return { file, title, updated: `${y}-${m}-${d}` };
  });

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

// 最終更新日の新しい順（同日はファイル名順）
notes.sort((a, b) => b.updated.localeCompare(a.updated) || a.file.localeCompare(b.file));

const items = notes.map(({ file, title, updated }) => [
  `      <li class="note-item">`,
  `        <time datetime="${updated}">${updated.replaceAll("-", ".")}</time>`,
  `        <a class="note-item__link" href="notes/${file}">${title}</a>`,
  `      </li>`,
].join("\n"));

const list = [
  `${START}`,
  `    <ul class="note-list">`,
  ...items,
  `    </ul>`,
  `    ${END}`,
].join("\n");

const source = readFileSync(indexPath, "utf8");
const startAt = source.indexOf(START);
const endAt = source.indexOf(END);
if (startAt === -1 || endAt === -1 || endAt < startAt) {
  console.error(`notes.html に ${START} と ${END} が見つかりません`);
  process.exit(1);
}

const next = source.slice(0, startAt) + list + source.slice(endAt + END.length);
if (next !== source) writeFileSync(indexPath, next);
console.log(`notes.html を更新しました（${notes.length}件）${next === source ? "※変更なし" : ""}`);
