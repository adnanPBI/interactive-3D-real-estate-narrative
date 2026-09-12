#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
const root=resolve(import.meta.dirname,".."); const errors=[];
const required=["artifacts/production/contact-delivery.example.json","artifacts/production/manual-browser-matrix.example.json","artifacts/production/client-signoff.example.json"];
for(const f of required) if(!existsSync(resolve(root,f))) errors.push(`missing evidence template ${f}`);
const manifestPath=resolve(root,"R612_FILE_MANIFEST_SHA256.txt");
if(existsSync(manifestPath)){
 const rows=readFileSync(manifestPath,"utf8").split(/\r?\n/).filter(Boolean);
 for(const row of rows){ const m=row.match(/^([0-9a-f]{64})\s+(.+)$/); if(!m) continue; const rel=m[2]; if(!/^(assets-source\/r6|public\/models\/r6|public\/fallback\/r6)\//.test(rel)) continue; const file=resolve(root,rel); if(!existsSync(file)){errors.push(`manifest file missing ${rel}`);continue;} const actual=createHash("sha256").update(readFileSync(file)).digest("hex"); if(actual!==m[1]) errors.push(`asset digest mismatch ${rel}`); }
}else errors.push("authoritative R6.1.2 file manifest missing");
if(errors.length){ for(const e of errors) console.error(`R6.1.2 INTEGRITY FAIL: ${e}`); process.exit(1);}
console.log("R6.1.2 release integrity PASS: immutable source/model/fallback assets match authoritative manifest and evidence templates exist.");
