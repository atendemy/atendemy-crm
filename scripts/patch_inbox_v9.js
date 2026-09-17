const fs = require("fs");
const path = require("path");

// 1. Locate next-server PID
let nextPid = null;
const pids = fs.readdirSync("/proc").filter(p => /^\d+$/.test(p));
for (const p of pids) {
  try {
    const cmdline = fs.readFileSync(`/proc/${p}/cmdline`, "utf8");
    if (cmdline.includes("next-server")) {
      const chunkDir = `/proc/${p}/root/app/.next/static/chunks/`;
      if (fs.existsSync(chunkDir)) {
        nextPid = p;
        break;
      }
    }
  } catch (e) {}
}

if (!nextPid) {
  console.error("Could not find next-server PID!");
  process.exit(1);
}

console.log(`Found next-server PID: ${nextPid}`);
const rootDir = `/proc/${nextPid}/root/app/.next`;
const chunksDir = path.join(rootDir, "static/chunks");
const serverDir = path.join(rootDir, "server");

const origChunk = path.join(chunksDir, "2sfwphzrv80zh.js");
const newChunkName = "2sfwphzrv80z8.js";
const newChunk = path.join(chunksDir, newChunkName);

let code = fs.readFileSync(origChunk, "utf8");
console.log(`Read source chunk: ${code.length} bytes`);

// 1. Selected conversation item color: bg-accent-soft
const whiteBtnPattern = '"bg-accent-50 hover:bg-accent-50"';
if (code.includes(whiteBtnPattern)) {
  code = code.replaceAll(whiteBtnPattern, '"bg-accent-soft hover:bg-accent-soft"');
  console.log("Replaced white button pattern with bg-accent-soft!");
}

// 2. Add overflowAnchor: "none" to scroller div
const scrollerPattern1 = '("div",{ref:S,className:"flex-1 overflow-y-auto py-2",';
const scrollerPattern2 = '("div",{ref:S,style:{overflowAnchor:"none"},className:"flex-1 overflow-y-auto py-2 [overflow-anchor:none]",';
if (code.includes(scrollerPattern1)) {
  code = code.replace(scrollerPattern1, scrollerPattern2);
  console.log("Added overflowAnchor: none to scrollerRef div!");
} else if (code.includes(scrollerPattern2)) {
  console.log("scrollerRef already has overflowAnchor: none.");
}

// 3. Replace scroll useEffect + add MutationObserver
const startPattern = "(0,t.useEffect)(()=>{let e=0===E.current";
const endPattern = "[H.length,e,I])";

const startIdx = code.indexOf(startPattern);
if (startIdx === -1) {
  console.error("Could not find start of scroll useEffect!");
  process.exit(1);
}

const endIdx = code.indexOf(endPattern, startIdx);
if (endIdx === -1) {
  console.error("Could not find end of scroll useEffect!");
  process.exit(1);
}

const oldEffect = code.slice(startIdx, endIdx + endPattern.length);
console.log("Old effect length:", oldEffect.length);

const newEffect = '(0,t.useEffect)(()=>{let e=S.current;if(e){let t=new MutationObserver(()=>{e.scrollTop=e.scrollHeight});return t.observe(e,{childList:!0,subtree:!0}),()=>t.disconnect()}},[e]),(0,t.useEffect)(()=>{let e=0===E.current,a=!e&&I>E.current;if(E.current=I,!a){let s=()=>{let el=S.current;if(el)el.scrollTop=el.scrollHeight};s();requestAnimationFrame(s);setTimeout(s,40);setTimeout(s,100);setTimeout(s,250);setTimeout(s,500)}},[H.length,e,I])';

code = code.replace(oldEffect, newEffect);
console.log("Replaced scroll useEffect with MutationObserver + pure scrollTop!");

// 4. Buffer element: h-8 shrink-0
if (code.includes('(0,a.jsx)("div",{ref:A,className:"h-6 shrink-0"})')) {
  code = code.replace('(0,a.jsx)("div",{ref:A,className:"h-6 shrink-0"})', '(0,a.jsx)("div",{ref:A,className:"h-8 shrink-0"})');
  console.log("Updated bottomRef to h-8!");
} else if (code.includes('(0,a.jsx)("div",{ref:A})')) {
  code = code.replace('(0,a.jsx)("div",{ref:A})', '(0,a.jsx)("div",{ref:A,className:"h-8 shrink-0"})');
  console.log("Added h-8 buffer to bottomRef!");
} else if (code.includes('(0,a.jsx)("div",{ref:A,className:"h-8 shrink-0"})')) {
  console.log("bottomRef already has h-8.");
}

// 5. Write new chunk and back-fill
fs.writeFileSync(newChunk, code, "utf8");
["2sfwphzrv80z7.js", "2sfwphzrv80z6.js", "2sfwphzrv80z5.js", "2sfwphzrv80zh.js"].forEach(oldFile => {
  fs.writeFileSync(path.join(chunksDir, oldFile), code, "utf8");
});
console.log(`Wrote patched code to ${newChunkName} (${code.length} bytes)`);

// 6. Update manifests to point to 2sfwphzrv80z8.js
function replaceInDir(dir, findStr, replaceStr) {
  let count = 0;
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".json"))) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          if (content.includes(findStr)) {
            const updated = content.replaceAll(findStr, replaceStr);
            fs.writeFileSync(fullPath, updated, "utf8");
            count++;
          }
        } catch (err) {
          console.error(`Error reading ${fullPath}:`, err.message);
        }
      }
    }
  }
  walk(dir);
  return count;
}

function replaceInFile(filePath, findStr, replaceStr) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.includes(findStr)) {
        fs.writeFileSync(filePath, content.replaceAll(findStr, replaceStr), "utf8");
        return true;
      }
    } catch (e) {
      console.error(`Error replacing in ${filePath}:`, e.message);
    }
  }
  return false;
}

["2sfwphzrv80zh.js", "2sfwphzrv80z5.js", "2sfwphzrv80z6.js", "2sfwphzrv80z7.js"].forEach(oldName => {
  replaceInDir(serverDir, oldName, newChunkName);
  replaceInFile(path.join(rootDir, "app-build-manifest.json"), oldName, newChunkName);
  replaceInFile(path.join(rootDir, "build-manifest.json"), oldName, newChunkName);
});

console.log(`All manifests updated to reference ${newChunkName}.`);

// 7. Restart next-server
console.log(`Sending SIGTERM to next-server (PID ${nextPid})...`);
try {
  process.kill(Number(nextPid), "SIGTERM");
  console.log("SIGTERM sent successfully.");
} catch (e) {
  console.error("Failed to send SIGTERM:", e.message);
}

console.log("Hotfix v9 complete!");
