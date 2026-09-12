#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs"; import { resolve } from "node:path";
const root=resolve(import.meta.dirname,".."); const failures=[];
function load(rel){const f=resolve(root,rel); if(!existsSync(f)){failures.push(`missing ${rel}`); return null;} try{return JSON.parse(readFileSync(f,"utf8"));}catch{failures.push(`invalid JSON ${rel}`); return null;}}
const bench=load("artifacts/production/laptop-benchmark.json");
if(bench && (bench.overallPass!==true || bench.rendererValid!==true || !Array.isArray(bench.results) || bench.results.length!==6 || bench.results.some(r=>r.longStalls>0))) failures.push("physical laptop benchmark is not a valid six-chapter WebGL PASS");
const review=load("artifacts/production/manual-browser-matrix.json");
if(review && (review.approved!==true || review.sixChapterVisualReview!==true || review.hdrPathVerified!==true || review.fallbackPathVerified!==true)) failures.push("manual browser/visual review has not approved six chapters + HDR + fallback paths");
if(failures.length){for(const f of failures) console.error(`MANUAL EVIDENCE BLOCKER: ${f}`); process.exit(1);} console.log("R6.1.2 manual evidence PASS.");
