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
import CloudArchitectureIndex, { meta as cloudArchitectureIndexMeta } from "./pages/CloudArchitectureIndex.jsx";
import MultiCloudHybridArchitecture, { meta as multiCloudMeta } from "./pages/cloud-architecture/MultiCloudHybridArchitecture.jsx";
import ServerlessArchitecturePatterns, { meta as serverlessMeta } from "./pages/cloud-architecture/ServerlessArchitecturePatterns.jsx";
import MicroservicesVsMonolith, { meta as microservicesMeta } from "./pages/cloud-architecture/MicroservicesVsMonolith.jsx";
import EventDrivenArchitecture, { meta as eventDrivenMeta } from "./pages/cloud-architecture/EventDrivenArchitecture.jsx";
import CloudNetworkingFundamentals, { meta as cloudNetworkingMeta } from "./pages/cloud-architecture/CloudNetworkingFundamentals.jsx";
import DisasterRecoveryMultiRegion, { meta as disasterRecoveryMeta } from "./pages/cloud-architecture/DisasterRecoveryMultiRegion.jsx";
import CloudSecurityZeroTrust, { meta as cloudSecurityMeta } from "./pages/cloud-architecture/CloudSecurityZeroTrust.jsx";
import CloudCostOptimization, { meta as cloudCostMeta } from "./pages/cloud-architecture/CloudCostOptimization.jsx";
import CloudProvidersCompared, { meta as cloudProvidersMeta } from "./pages/cloud-architecture/CloudProvidersCompared.jsx";
import ChoosingACloudProvider, { meta as choosingCloudProviderMeta } from "./pages/cloud-architecture/ChoosingACloudProvider.jsx";
import ClaudeArchitectureIndex, { meta as claudeArchitectureIndexMeta } from "./pages/ClaudeArchitectureIndex.jsx";
import AgenticLoopWithClaude, { meta as agenticLoopMeta } from "./pages/claude-architecture/AgenticLoopWithClaude.jsx";
import ClaudeToolUse, { meta as claudeToolUseMeta } from "./pages/claude-architecture/ClaudeToolUse.jsx";
import ClaudeAndMCP, { meta as claudeMcpMeta } from "./pages/claude-architecture/ClaudeAndMCP.jsx";
import PromptCachingArchitecture, { meta as promptCachingMeta } from "./pages/claude-architecture/PromptCachingArchitecture.jsx";
import ClaudeComputerUse, { meta as claudeComputerUseMeta } from "./pages/claude-architecture/ClaudeComputerUse.jsx";
import ExtendedThinkingArchitecture, { meta as extendedThinkingMeta } from "./pages/claude-architecture/ExtendedThinkingArchitecture.jsx";
import PromptLibrary, { meta as promptLibraryMeta } from "./pages/PromptLibrary.jsx";
import OperatorOS, { meta as operatorOsMeta } from "./pages/OperatorOS.jsx";
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
  [CloudArchitectureIndex, cloudArchitectureIndexMeta],
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
  [ClaudeArchitectureIndex, claudeArchitectureIndexMeta],
  [AgenticLoopWithClaude, agenticLoopMeta],
  [ClaudeToolUse, claudeToolUseMeta],
  [ClaudeAndMCP, claudeMcpMeta],
  [PromptCachingArchitecture, promptCachingMeta],
  [ClaudeComputerUse, claudeComputerUseMeta],
  [ExtendedThinkingArchitecture, extendedThinkingMeta],
  [PromptsIndex, promptsMeta],
  [PromptLibrary, promptLibraryMeta],
  [OperatorOS, operatorOsMeta],
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
