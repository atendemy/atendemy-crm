const fs = require('fs');

// 1. Server API chunk
const apiFile = '/app/.next/server/chunks/_0r4sq5-._.js';
if (fs.existsSync(apiFile)) {
  let apiContent = fs.readFileSync(apiFile, 'utf8');
  if (!apiContent.includes('suspended_reason')) {
    if (!fs.existsSync(apiFile + '.bak')) {
      fs.copyFileSync(apiFile, apiFile + '.bak');
    }
    apiContent = apiContent.replace('suspended_at,\n      created_at,', 'suspended_at,\n      suspended_reason,\n      created_at,');
    fs.writeFileSync(apiFile, apiContent);
    console.log('1. Server API chunk patched successfully!');
  } else {
    console.log('1. Server API chunk already contains suspended_reason');
  }
} else {
  console.log('1. Server API chunk not found at', apiFile);
}

// 2. Server SSR chunk
const ssrFile = '/app/.next/server/chunks/ssr/app_admin_(protected)_tenants_[id]__client_tsx_1yhi7t_._.js';
if (fs.existsSync(ssrFile)) {
  let ssrContent = fs.readFileSync(ssrFile, 'utf8');
  if (ssrContent.includes('(0,b.jsx)(H,{suspendedAt:k.suspended_at})')) {
    if (!fs.existsSync(ssrFile + '.bak')) {
      fs.copyFileSync(ssrFile, ssrFile + '.bak');
    }
    ssrContent = ssrContent.replace('(0,b.jsx)(H,{suspendedAt:k.suspended_at})', '(0,b.jsx)(H,{suspendedAt:k.suspended_at,reason:k.suspended_reason})');
    fs.writeFileSync(ssrFile, ssrContent);
    console.log('2. Server SSR chunk patched successfully!');
  } else {
    console.log('2. Server SSR chunk already patched or pattern not found');
  }
} else {
  console.log('2. Server SSR chunk not found at', ssrFile);
}

// 3. Client static chunk
const staticFile = '/app/.next/static/chunks/1ebs4t5est4k6.js';
if (fs.existsSync(staticFile)) {
  let staticContent = fs.readFileSync(staticFile, 'utf8');
  if (staticContent.includes('(0,a.jsx)(P,{suspendedAt:c.suspended_at})')) {
    if (!fs.existsSync(staticFile + '.bak')) {
      fs.copyFileSync(staticFile, staticFile + '.bak');
    }
    staticContent = staticContent.replace('(0,a.jsx)(P,{suspendedAt:c.suspended_at})', '(0,a.jsx)(P,{suspendedAt:c.suspended_at,reason:c.suspended_reason})');
    fs.writeFileSync(staticFile, staticContent);
    console.log('3. Client static chunk patched successfully!');
  } else {
    console.log('3. Client static chunk already patched or pattern not found');
  }
} else {
  console.log('3. Client static chunk not found at', staticFile);
}
