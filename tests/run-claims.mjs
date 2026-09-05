import { spawnSync } from 'node:child_process';

const grepAt = process.argv.indexOf('--grep');
const pattern = grepAt === -1 ? '.*' : process.argv[grepAt + 1];
if (grepAt !== -1 && !pattern) throw new Error('Pass a claim tag after --grep.');
const result = spawnSync(process.execPath, ['--test', '--test-name-pattern', pattern, 'tests/claims.mjs'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
