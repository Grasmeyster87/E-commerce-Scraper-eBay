#!/usr/bin/env node
/**
 * Скрипт для отримання всіх комітів (git log) по всіх гілках репозиторію.
 *
 * Використання:
 *   node get-all-commits.js [шлях_до_репозиторію] [--json] [--out=file.txt] [--remote] [--branches=b1,b2,...] [--all-branches]
 *
 * Приклади:
 *   node get-all-commits.js                     // поточна папка, гілки за замовчуванням (див. DEFAULT_BRANCHES)
 *   node get-all-commits.js ../my-repo           // вказаний репозиторій
 *   node get-all-commits.js --remote             // шукати гілки серед origin/*, якщо локально їх немає
 *   node get-all-commits.js --json               // вивід у форматі JSON
 *   node get-all-commits.js --out=commits.txt    // зберегти результат у файл
 *   node get-all-commits.js --branches=main,develop,feature/x
 *                                                 // явно вказати список гілок
 *   node get-all-commits.js --all-branches        // старий режим: усі гілки репозиторію
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Гілки, які використовуються, якщо не вказано --branches і не вказано --all-branches
const DEFAULT_BRANCHES = ['main', 'develop', 'feature/backend-api', 'feature/frontend-ui'];

// --- Розбір аргументів командного рядка ---
const args = process.argv.slice(2);
const flags = {
  json: args.includes('--json'),
  remote: args.includes('--remote'),
  allBranches: args.includes('--all-branches'),
  out: null,
  branches: null,
  repoPath: '.',
};

for (const arg of args) {
  if (arg.startsWith('--out=')) {
    flags.out = arg.split('=')[1];
  } else if (arg.startsWith('--branches=')) {
    flags.branches = arg
      .split('=')[1]
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
  } else if (!arg.startsWith('--')) {
    flags.repoPath = arg;
  }
}

const REPO_PATH = path.resolve(flags.repoPath);

function run(cmd) {
  return execSync(cmd, { cwd: REPO_PATH, encoding: 'utf-8', maxBuffer: 1024 * 1024 * 100 });
}

// --- Перевірка, що це git-репозиторій ---
try {
  run('git rev-parse --is-inside-work-tree');
} catch (e) {
  console.error(`Помилка: "${REPO_PATH}" не є git-репозиторієм.`);
  process.exit(1);
}

// --- Отримання повного списку існуючих гілок (локальних і, за потреби, remote) ---
function getAllExistingBranches() {
  const refType = flags.remote ? '--all' : '--list';
  const raw = run(`git branch ${refType} --format="%(refname:short)"`);
  return raw
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean)
    // прибираємо технічний вказівник HEAD -> origin/main
    .filter((b) => !b.includes('HEAD ->') && b !== 'HEAD');
}

// Перевіряє, чи існує гілка (локально, або як origin/branch)
function resolveBranchRef(existing, name) {
  if (existing.includes(name)) return name;
  const remoteName = `origin/${name}`;
  if (existing.includes(remoteName)) return remoteName;
  return null;
}

// --- Визначення, які гілки обробляти ---
function getBranches() {
  const existing = getAllExistingBranches();

  // Режим "усі гілки" (старий режим)
  if (flags.allBranches) {
    return existing;
  }

  const wanted = flags.branches || DEFAULT_BRANCHES;
  const resolved = [];

  for (const name of wanted) {
    const ref = resolveBranchRef(existing, name);
    if (ref) {
      resolved.push(ref);
    } else {
      console.error(`Увага: гілку "${name}" не знайдено (ні локально, ні як origin/${name}) — пропускаю.`);
    }
  }

  return resolved;
}

// --- Формат для git log ---
// Використовуємо унікальні розділювачі, щоб безпечно парсити багаторядкові повідомлення
const FIELD_SEP = '\u0001';
const RECORD_SEP = '\u0002';
const LOG_FORMAT = `--pretty=format:%H${FIELD_SEP}%an${FIELD_SEP}%ae${FIELD_SEP}%ad${FIELD_SEP}%s${FIELD_SEP}%b${RECORD_SEP}`;

function getCommitsForBranch(branch) {
  let raw;
  try {
    raw = run(`git log ${LOG_FORMAT} --date=iso-strict "${branch}"`);
  } catch (e) {
    console.error(`Не вдалося отримати лог для гілки "${branch}": ${e.message}`);
    return [];
  }

  return raw
    .split(RECORD_SEP)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, authorName, authorEmail, date, subject, body] = record.split(FIELD_SEP);
      return {
        branch,
        hash,
        authorName,
        authorEmail,
        date,
        subject,
        body: (body || '').trim(),
      };
    });
}

// --- Основна логіка ---
function main() {
  const branches = getBranches();

  if (branches.length === 0) {
    console.error('Гілок не знайдено.');
    process.exit(1);
  }

  console.error(`Знайдено гілок: ${branches.length}`);

  const allCommits = [];
  const seenHashes = new Set(); // щоб уникнути дублікатів (той самий коміт у кількох гілках)

  for (const branch of branches) {
    const commits = getCommitsForBranch(branch);
    for (const c of commits) {
      if (!seenHashes.has(c.hash)) {
        seenHashes.add(c.hash);
        allCommits.push(c);
      }
    }
    console.error(`  - ${branch}: ${commits.length} комітів`);
  }

  // Сортуємо за датою (від найновіших)
  allCommits.sort((a, b) => new Date(b.date) - new Date(a.date));

  let output;
  if (flags.json) {
    output = JSON.stringify(allCommits, null, 2);
  } else {
    output = allCommits
      .map((c) => {
        const msg = c.body ? `${c.subject}\n${c.body}` : c.subject;
        return [
          `Коміт:   ${c.hash}`,
          `Гілка:   ${c.branch}`,
          `Автор:   ${c.authorName} <${c.authorEmail}>`,
          `Дата:    ${c.date}`,
          `Повідомлення:`,
          msg
            .split('\n')
            .map((l) => `    ${l}`)
            .join('\n'),
          '-'.repeat(80),
        ].join('\n');
      })
      .join('\n\n');
  }

  if (flags.out) {
    fs.writeFileSync(flags.out, output, 'utf-8');
    console.error(`\nРезультат збережено у файл: ${flags.out}`);
  } else {
    console.log(output);
  }

  console.error(`\nВсього унікальних комітів: ${allCommits.length}`);
}

main();