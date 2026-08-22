// Compiled by `vite build --ssr` into a Node-runnable bundle, then executed
// by scripts/prerender-content.mjs to write each page out as plain static
// HTML. Nothing here ships to the browser -- this only runs at build time.
import { renderToStaticMarkup } from "react-dom/server";

import Home, { meta as homeMeta } from "./pages/Home.jsx";
import Architecture, { meta as architectureMeta } from "./pages/Architecture.jsx";
import SetupReact, { meta as setupReactMeta } from "./pages/SetupReact.jsx";
import SetupPython, { meta as setupPythonMeta } from "./pages/SetupPython.jsx";
import SetupNode, { meta as setupNodeMeta } from "./pages/SetupNode.jsx";
import SetupTensorflowPyro, { meta as setupTensorflowPyroMeta } from "./pages/SetupTensorflowPyro.jsx";
import GuidesIndex, { meta as guidesMeta } from "./pages/GuidesIndex.jsx";
import PromptsIndex, { meta as promptsMeta } from "./pages/PromptsIndex.jsx";
import Challenge, { meta as challengeMeta } from "./pages/Challenge.jsx";
import Community, { meta as communityMeta } from "./pages/Community.jsx";
import TenDisciplines, { meta as tenDisciplinesMeta } from "./pages/guides/TenDisciplines.jsx";
import FourteenDomains, { meta as fourteenDomainsMeta } from "./pages/guides/FourteenDomains.jsx";
import FourControlBoundaries, { meta as fourControlBoundariesMeta } from "./pages/guides/FourControlBoundaries.jsx";
import PromptDay, { promptMeta } from "./pages/PromptDay.jsx";
import { PROMPTS } from "./data/prompts.js";
import NewsIndex, { meta as newsIndexMeta } from "./pages/NewsIndex.jsx";
import NewsArticle, { newsMeta } from "./pages/NewsArticle.jsx";
import { NEWS_ARTICLES } from "./data/news.js";

const PAGES = [
  [Home, homeMeta],
  [Architecture, architectureMeta],
  [SetupReact, setupReactMeta],
  [SetupPython, setupPythonMeta],
  [SetupNode, setupNodeMeta],
  [SetupTensorflowPyro, setupTensorflowPyroMeta],
  [GuidesIndex, guidesMeta],
  [TenDisciplines, tenDisciplinesMeta],
  [FourteenDomains, fourteenDomainsMeta],
  [FourControlBoundaries, fourControlBoundariesMeta],
  [PromptsIndex, promptsMeta],
  [Challenge, challengeMeta],
  [Community, communityMeta],
  [NewsIndex, newsIndexMeta],
];

export function renderAll() {
  const staticPages = PAGES.map(([Component, meta]) => ({
    meta,
    html: renderToStaticMarkup(<Component />),
  }));
  const promptPages = PROMPTS.map((entry) => ({
    meta: promptMeta(entry),
    html: renderToStaticMarkup(<PromptDay entry={entry} />),
  }));
  const newsPages = NEWS_ARTICLES.map((entry) => ({
    meta: newsMeta(entry),
    html: renderToStaticMarkup(<NewsArticle entry={entry} />),
  }));
  return [...staticPages, ...promptPages, ...newsPages];
}
