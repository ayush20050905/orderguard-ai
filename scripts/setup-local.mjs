import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
if(Number(process.versions.node.split('.')[0])<24)throw new Error('Install Node.js 24 or newer, then reopen your terminal.');
if(!existsSync(path.join(root,'node_modules/vinext')))throw new Error('Install dependencies first: pnpm install --frozen-lockfile');
for(const args of [['scripts/run-framework.mjs','build'],['scripts/migrate-local.mjs']]){
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
console.log('\nLocal setup complete. Run pnpm start and open the address it prints.');
