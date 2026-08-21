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

const PAGES = [
  [Home, homeMeta],
  [Architecture, architectureMeta],
  [SetupReact, setupReactMeta],
  [SetupPython, setupPythonMeta],
  [SetupNode, setupNodeMeta],
  [SetupTensorflowPyro, setupTensorflowPyroMeta],
  [GuidesIndex, guidesMeta],
  [PromptsIndex, promptsMeta],
  [Challenge, challengeMeta],
];

export function renderAll() {
  return PAGES.map(([Component, meta]) => ({
    meta,
    html: renderToStaticMarkup(<Component />),
  }));
}
