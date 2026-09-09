// Compiled by `vite build --ssr` into a Node-runnable bundle, then executed
// by scripts/prerender-content.mjs to write each page out as plain static
// HTML. Nothing here ships to the browser -- this only runs at build time.
import { renderToStaticMarkup } from "react-dom/server";
import { join } from "node:path";

import { loadEntries } from "./lib/loadEntries.js";

// `import.meta.url` isn't reliable here: the SSR build (`vite build --ssr`)
// bundles this whole file into dist-ssr/entry-server.js, so at runtime its
// own URL points at the bundle output, not this source file's real location.
// `process.cwd()` is safe instead, because `npm run build` (frontend/package.json)
// always runs from frontend/, same assumption the rest of this build already makes.
const entriesDir = (type) => join(process.cwd(), "src/content/entries", type);

import Home, { meta as homeMeta } from "./pages/Home.jsx";
import Architecture, { meta as architectureMeta } from "./pages/Architecture.jsx";
import SetupReact, { meta as setupReactMeta } from "./pages/SetupReact.jsx";
import SetupPython, { meta as setupPythonMeta } from "./pages/SetupPython.jsx";
import SetupNode, { meta as setupNodeMeta } from "./pages/SetupNode.jsx";
import SetupTensorflowPyro, { meta as setupTensorflowPyroMeta } from "./pages/SetupTensorflowPyro.jsx";
import GuidesIndex, { meta as guidesMeta } from "./pages/GuidesIndex.jsx";
import AISystemPatterns, { meta as aiSystemPatternsMeta } from "./pages/guides/AISystemPatterns.jsx";
import GuidePage, { guideMeta } from "./pages/GuidePage.jsx";
import CloudArchitectureIndex, { meta as cloudArchitectureIndexMeta } from "./pages/CloudArchitectureIndex.jsx";
import ClaudeArchitectureIndex, { meta as claudeArchitectureIndexMeta } from "./pages/ClaudeArchitectureIndex.jsx";
import PromptsIndex, { meta as promptsMeta } from "./pages/PromptsIndex.jsx";
import PromptLibrary, { meta as promptLibraryMeta } from "./pages/PromptLibrary.jsx";
import OperatorOS, { meta as operatorOsMeta } from "./pages/OperatorOS.jsx";
import Challenge, { meta as challengeMeta } from "./pages/Challenge.jsx";
import Community, { meta as communityMeta } from "./pages/Community.jsx";
import NewsIndex, { meta as newsIndexMeta } from "./pages/NewsIndex.jsx";
import NewsArticle, { newsMeta } from "./pages/NewsArticle.jsx";
import ModelsDirectory, { meta as modelsMeta } from "./pages/ModelsDirectory.jsx";
import ModelEntry, { modelMeta } from "./pages/ModelEntry.jsx";
import Glossary, { meta as glossaryMeta } from "./pages/Glossary.jsx";
import PromptDay, { promptMeta } from "./pages/PromptDay.jsx";
import { PROMPTS } from "./data/prompts.js";

// One markdown file per entry -- drop a new .md in the matching folder and it
// shows up on the next build, no other file needs to change. See
// src/content/lib/loadEntries.js and frontend/README.md.
const newsEntries = loadEntries(entriesDir("news"));
const glossaryEntries = loadEntries(entriesDir("glossary"));
const modelEntries = loadEntries(entriesDir("models"));
const guideEntries = loadEntries(entriesDir("guides"));
const cloudArchEntries = loadEntries(entriesDir("cloud-architecture"));
const claudeArchEntries = loadEntries(entriesDir("claude-architecture"));

const PAGES = [
  [Home, homeMeta],
  [Architecture, architectureMeta],
  [SetupReact, setupReactMeta],
  [SetupPython, setupPythonMeta],
  [SetupNode, setupNodeMeta],
  [SetupTensorflowPyro, setupTensorflowPyroMeta],
  [GuidesIndex, guidesMeta, { entries: guideEntries }],
  [AISystemPatterns, aiSystemPatternsMeta],
  [CloudArchitectureIndex, cloudArchitectureIndexMeta, { entries: cloudArchEntries }],
  [ClaudeArchitectureIndex, claudeArchitectureIndexMeta, { entries: claudeArchEntries }],
  [PromptsIndex, promptsMeta],
  [PromptLibrary, promptLibraryMeta],
  [OperatorOS, operatorOsMeta],
  [Challenge, challengeMeta],
  [Community, communityMeta],
  [NewsIndex, newsIndexMeta, { entries: newsEntries }],
  [ModelsDirectory, modelsMeta, { entries: modelEntries }],
  [Glossary, glossaryMeta, { entries: glossaryEntries }],
];

// Guide-shaped entries (guides/cloud-architecture/claude-architecture) all
// render through the same GuidePage template, one static page per file.
const GUIDE_SECTIONS = [
  ["guides", guideEntries],
  ["cloud-architecture", cloudArchEntries],
  ["claude-architecture", claudeArchEntries],
];

export function renderAll() {
  const staticPages = PAGES.map(([Component, meta, props = {}]) => ({
    meta,
    html: renderToStaticMarkup(<Component {...props} />),
  }));
  const promptPages = PROMPTS.map((entry) => ({
    meta: promptMeta(entry),
    html: renderToStaticMarkup(<PromptDay entry={entry} />),
  }));
  const newsPages = newsEntries.map((entry) => ({
    meta: newsMeta(entry),
    html: renderToStaticMarkup(<NewsArticle entry={entry} />),
  }));
  const modelPages = modelEntries.map((entry) => ({
    meta: modelMeta(entry),
    html: renderToStaticMarkup(<ModelEntry entry={entry} />),
  }));
  const guidePages = GUIDE_SECTIONS.flatMap(([section, entries]) =>
    entries.map((entry) => ({
      meta: guideMeta(entry, section),
      html: renderToStaticMarkup(<GuidePage entry={entry} section={section} />),
    }))
  );
  return [...staticPages, ...promptPages, ...newsPages, ...modelPages, ...guidePages];
}
