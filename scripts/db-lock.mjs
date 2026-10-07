// Records every migration in src/db/migrations.lock.json with a hash of its SQL, so a migration
// can't be edited once it's on main (phones that ran it never run it again; docs/releasing.md).
// Adds new migrations, never changes a recorded one. Run by `pnpm db:generate`.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const folder = new URL('../src/db/migrations/', import.meta.url);
const lockUrl = new URL('../src/db/migrations.lock.json', import.meta.url);

const journal = JSON.parse(readFileSync(new URL('meta/_journal.json', folder), 'utf8'));
const lock = JSON.parse(readFileSync(lockUrl, 'utf8'));

// Line endings are normalised so a Windows checkout hashes the same.
const hashOf = (tag) =>
  createHash('sha256')
    .update(readFileSync(new URL(`${tag}.sql`, folder), 'utf8').replace(/\r\n/g, '\n'))
    .digest('hex');

const problems = [];
const tags = new Set(journal.entries.map((entry) => entry.tag));
for (const tag of Object.keys(lock.migrations)) {
  if (!tags.has(tag)) problems.push(`${tag} is locked but no longer in the journal`);
}
const added = [];
for (const { tag } of journal.entries) {
  const hash = hashOf(tag);
  if (!lock.migrations[tag]) {
    lock.migrations[tag] = hash;
    added.push(tag);
  } else if (lock.migrations[tag] !== hash) {
    problems.push(`${tag}.sql was edited after it was locked`);
  }
}

if (problems.length > 0) {
  console.error(
    `Shipped migrations must not change. Undo these and put the change in a new migration:\n- ${problems.join('\n- ')}`,
  );
  process.exit(1);
}
writeFileSync(lockUrl, `${JSON.stringify(lock, null, 2)}\n`);
console.log(added.length > 0 ? `Locked ${added.join(', ')}` : 'Nothing new to lock');
