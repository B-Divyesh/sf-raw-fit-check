import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!existsSync('target/release/raw-fit-check')) { const result=spawnSync('cargo',['build','--release'],{stdio:'inherit'}); if(result.status)process.exit(result.status); }
await mkdir('dist/raw-fit-check-0.1.0-linux-x64',{recursive:true});
await copyFile('target/release/raw-fit-check','dist/raw-fit-check-0.1.0-linux-x64/raw-fit-check');
await copyFile('LICENSE','dist/raw-fit-check-0.1.0-linux-x64/LICENSE');
await writeFile('dist/raw-fit-check-0.1.0-linux-x64/README.txt','Run ./raw-fit-check --help\nSource and documentation: https://raw-fit-check.sociobot.in\n');
const result=spawnSync('tar',['-czf','dist/raw-fit-check-0.1.0-linux-x64.tar.gz','-C','dist','raw-fit-check-0.1.0-linux-x64'],{stdio:'inherit'}); process.exit(result.status ?? 1);
