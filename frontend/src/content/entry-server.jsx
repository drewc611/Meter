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
import ModelsDirectory, { meta as modelsMeta } from "./pages/ModelsDirectory.jsx";
import Glossary, { meta as glossaryMeta } from "./pages/Glossary.jsx";
import TenDisciplines, { meta as tenDisciplinesMeta } from "./pages/guides/TenDisciplines.jsx";
import FourteenDomains, { meta as fourteenDomainsMeta } from "./pages/guides/FourteenDomains.jsx";
import FourControlBoundaries, { meta as fourControlBoundariesMeta } from "./pages/guides/FourControlBoundaries.jsx";
import AISystemPatterns, { meta as aiSystemPatternsMeta } from "./pages/guides/AISystemPatterns.jsx";
import AIEvaluationMethods, { meta as aiEvaluationMethodsMeta } from "./pages/guides/AIEvaluationMethods.jsx";
import RagFailureModes, { meta as ragFailureModesMeta } from "./pages/guides/RagFailureModes.jsx";
import ContextEngineering, { meta as contextEngineeringMeta } from "./pages/guides/ContextEngineering.jsx";
import MultiCloudHybridArchitecture, { meta as multiCloudMeta } from "./pages/guides/MultiCloudHybridArchitecture.jsx";
import ServerlessArchitecturePatterns, { meta as serverlessMeta } from "./pages/guides/ServerlessArchitecturePatterns.jsx";
import MicroservicesVsMonolith, { meta as microservicesMeta } from "./pages/guides/MicroservicesVsMonolith.jsx";
import EventDrivenArchitecture, { meta as eventDrivenMeta } from "./pages/guides/EventDrivenArchitecture.jsx";
import CloudNetworkingFundamentals, { meta as cloudNetworkingMeta } from "./pages/guides/CloudNetworkingFundamentals.jsx";
import DisasterRecoveryMultiRegion, { meta as disasterRecoveryMeta } from "./pages/guides/DisasterRecoveryMultiRegion.jsx";
import CloudSecurityZeroTrust, { meta as cloudSecurityMeta } from "./pages/guides/CloudSecurityZeroTrust.jsx";
import CloudCostOptimization, { meta as cloudCostMeta } from "./pages/guides/CloudCostOptimization.jsx";
import CloudProvidersCompared, { meta as cloudProvidersMeta } from "./pages/guides/CloudProvidersCompared.jsx";
import ChoosingACloudProvider, { meta as choosingCloudProviderMeta } from "./pages/guides/ChoosingACloudProvider.jsx";
import AgenticLoopWithClaude, { meta as agenticLoopMeta } from "./pages/guides/AgenticLoopWithClaude.jsx";
import ClaudeToolUse, { meta as claudeToolUseMeta } from "./pages/guides/ClaudeToolUse.jsx";
import ClaudeAndMCP, { meta as claudeMcpMeta } from "./pages/guides/ClaudeAndMCP.jsx";
import PromptCachingArchitecture, { meta as promptCachingMeta } from "./pages/guides/PromptCachingArchitecture.jsx";
import ClaudeComputerUse, { meta as claudeComputerUseMeta } from "./pages/guides/ClaudeComputerUse.jsx";
import ExtendedThinkingArchitecture, { meta as extendedThinkingMeta } from "./pages/guides/ExtendedThinkingArchitecture.jsx";
import PromptLibrary, { meta as promptLibraryMeta } from "./pages/PromptLibrary.jsx";
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
  [AISystemPatterns, aiSystemPatternsMeta],
  [AIEvaluationMethods, aiEvaluationMethodsMeta],
  [RagFailureModes, ragFailureModesMeta],
  [ContextEngineering, contextEngineeringMeta],
  [MultiCloudHybridArchitecture, multiCloudMeta],
  [ServerlessArchitecturePatterns, serverlessMeta],
  [MicroservicesVsMonolith, microservicesMeta],
  [EventDrivenArchitecture, eventDrivenMeta],
  [CloudNetworkingFundamentals, cloudNetworkingMeta],
  [DisasterRecoveryMultiRegion, disasterRecoveryMeta],
  [CloudSecurityZeroTrust, cloudSecurityMeta],
  [CloudCostOptimization, cloudCostMeta],
  [CloudProvidersCompared, cloudProvidersMeta],
  [ChoosingACloudProvider, choosingCloudProviderMeta],
  [AgenticLoopWithClaude, agenticLoopMeta],
  [ClaudeToolUse, claudeToolUseMeta],
  [ClaudeAndMCP, claudeMcpMeta],
  [PromptCachingArchitecture, promptCachingMeta],
  [ClaudeComputerUse, claudeComputerUseMeta],
  [ExtendedThinkingArchitecture, extendedThinkingMeta],
  [PromptsIndex, promptsMeta],
  [PromptLibrary, promptLibraryMeta],
  [Challenge, challengeMeta],
  [Community, communityMeta],
  [NewsIndex, newsIndexMeta],
  [ModelsDirectory, modelsMeta],
  [Glossary, glossaryMeta],
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
