// A directory of AI models and tools -- not news, a living reference. Every
// entry needs a real, checkable source in `sourceUrl` and a `verifiedDate`
// marking when its facts were last confirmed -- this space moves fast
// (pricing changes, models get deprecated), so a stale, unverified entry is
// worse than no entry. Re-verify and bump `verifiedDate` on a spot-check
// rather than trusting an old entry indefinitely; see
// merit-ai-team/skills/merit-growth/SKILL.md's Content arm section for the
// discipline this follows.
//
// Each entry: { slug, name, maker, category, description, pricingNote,
// sourceUrl, verifiedDate: "YYYY-MM-DD" }. `pricingNote` is a short factual
// band ("free tier + paid API"), never a precise dollar figure -- those go
// stale within weeks in this market and this site doesn't publish a number
// it can't keep current. `category` is one of: llm, coding-assistant,
// image-generation, agent-framework, voice, other.
export const MODELS = [
  {
    slug: "claude",
    name: "Claude (Opus 5 / Sonnet 5 / Haiku 4.5)",
    maker: "Anthropic",
    category: "llm",
    description:
      "Anthropic's frontier model family. Opus 5 is the top-capability tier, Sonnet 5 is the balanced default, Haiku 4.5 is the fast/cheap tier. Models from the 4.6 generation onward ship the full 1M-token context window at standard rates.",
    pricingNote: "Free tier + paid API, tiered by model (Opus priced well above Sonnet/Haiku)",
    sourceUrl: "https://www.anthropic.com/pricing",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "gpt-5-6",
    name: "GPT-5.6 (Sol / Terra / Luna)",
    maker: "OpenAI",
    category: "llm",
    description:
      "OpenAI's current frontier family, reaching general availability July 9, 2026. Sol targets frontier capability, Terra is the balanced production tier, Luna is the cost-sensitive volume tier. All three share a 1.05M-token context window and 128K max output.",
    pricingNote: "Free tier + paid API, tiered by model; Luna and Terra both saw price cuts in late July 2026",
    sourceUrl: "https://openai.com/index/gpt-5-6/",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "gemini-3",
    name: "Gemini 3",
    maker: "Google",
    category: "llm",
    description:
      "Google's frontier model, spanning Pro/Flash/Flash-Lite tiers with a single API covering text, images, video, audio, embeddings, and code execution. Paid consumer plans moved from fixed daily prompt caps to compute-based usage limits in 2026.",
    pricingNote: "Free tier + paid API; consumer plans from ~$5/mo to $99+/mo",
    sourceUrl: "https://ai.google.dev/pricing",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "llama-4",
    name: "Llama 4 (Scout / Maverick)",
    maker: "Meta",
    category: "llm",
    description:
      "Meta's open-weight model family and its first built on a mixture-of-experts architecture. Maverick is a 400B-parameter model requiring multi-GPU/enterprise hardware; Scout is the practical self-hosting option, with a 10-million-token context window.",
    pricingNote: "Open weights, free to self-host; no official per-token API cost from Meta",
    sourceUrl: "https://ai.meta.com/llama/",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "deepseek-v4",
    name: "DeepSeek V4 (Pro / Flash)",
    maker: "DeepSeek",
    category: "llm",
    description:
      "Open-weight (MIT-licensed) model family that shipped April 24, 2026. V4-Pro is a 1.6T-parameter MoE model (49B active) for complex reasoning/coding/agentic work; V4-Flash is a lighter 284B-parameter model (13B active) for speed and cost.",
    pricingNote: "Open weights + low-cost paid API, well below comparable closed frontier models",
    sourceUrl: "https://www.deepseek.com/",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "cursor",
    name: "Cursor",
    maker: "Anysphere",
    category: "coding-assistant",
    description:
      "An AI-native code editor built as a fork of VS Code, with deep agent-mode integration for multi-file edits and codebase-wide changes.",
    pricingNote: "Free tier + paid tiers from ~$20/mo; heavy daily agent use commonly runs $60-100/mo per Cursor's own docs",
    sourceUrl: "https://cursor.com/pricing",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "github-copilot",
    name: "GitHub Copilot",
    maker: "GitHub (Microsoft)",
    category: "coding-assistant",
    description:
      "The IDE-integrated coding assistant, now billing agent mode and premium models through metered AI Credits (as of June 1, 2026) while standard completions stay unmetered on paid plans.",
    pricingNote: "Paid individual tier from ~$10/mo; team tier from ~$19/seat",
    sourceUrl: "https://github.com/features/copilot/plans",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "claude-code",
    name: "Claude Code",
    maker: "Anthropic",
    category: "coding-assistant",
    description:
      "Anthropic's agentic coding CLI/IDE tool for deep codebase understanding and autonomous multi-file work, included with Claude Pro/Max subscriptions.",
    pricingNote: "Included in Claude Pro (~$20/mo) and Max (~$100-200/mo) plans",
    sourceUrl: "https://www.anthropic.com/claude-code",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "windsurf",
    name: "Windsurf",
    maker: "Windsurf",
    category: "coding-assistant",
    description:
      "An AI-native code editor competing directly with Cursor. Retired its credit-based pricing for daily/weekly usage quotas on March 19, 2026.",
    pricingNote: "Free tier + paid tiers from ~$20/mo; team tier from ~$40/user",
    sourceUrl: "https://windsurf.com/pricing",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "midjourney",
    name: "Midjourney",
    maker: "Midjourney, Inc.",
    category: "image-generation",
    description:
      "Subscription-only AI image generator known for stylistic coherence out of the box. No longer offers a free trial; all access requires a paid plan.",
    pricingNote: "Paid only, four tiers from ~$10/mo to ~$120/mo, gated by fast-GPU-hours per month",
    sourceUrl: "https://www.midjourney.com/pricing",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "stable-diffusion",
    name: "Stable Diffusion",
    maker: "Stability AI",
    category: "image-generation",
    description:
      "Open-source image generation model that can be downloaded and self-hosted, or accessed through third-party hosted APIs. Requires real technical setup to match Midjourney's out-of-the-box aesthetic coherence.",
    pricingNote: "Free to self-host (own compute cost); hosted APIs bill per image, typically fractions of a cent at scale",
    sourceUrl: "https://stability.ai/stable-image",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "elevenlabs",
    name: "ElevenLabs",
    maker: "ElevenLabs",
    category: "voice",
    description:
      "AI voice generation and cloning platform, offering text-to-speech and real-time conversational voice agents. Uses a credit system (roughly 1 credit per 2 characters of text).",
    pricingNote: "Free tier (attribution required) + paid tiers from ~$5/mo; conversational agents bill separately per minute",
    sourceUrl: "https://elevenlabs.io/pricing",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "langchain",
    name: "LangChain / LangGraph",
    maker: "LangChain, Inc.",
    category: "agent-framework",
    description:
      "The most widely adopted open-source framework for building LLM applications and agents, with over 1,000 pre-built integrations. LangGraph, its stateful multi-actor agent framework, reached general availability in 2026; LangSmith is the paid hosted observability/eval layer.",
    pricingNote: "Core library open-source (MIT) and free; LangSmith free tier + paid team/enterprise plans",
    sourceUrl: "https://www.langchain.com/",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    maker: "Perplexity AI",
    category: "other",
    description:
      "AI-powered search and research assistant that answers with cited sources rather than just links, plus the Comet browser agent. Positioned as a research tool, not a general chatbot.",
    pricingNote: "Free tier (~5 Pro searches/day) + Pro from ~$20/mo; developer Sonar/Search/Agent APIs billed separately",
    sourceUrl: "https://www.perplexity.ai/pricing",
    verifiedDate: "2026-08-23",
  },
  {
    slug: "sora-2",
    name: "Sora 2",
    maker: "OpenAI",
    category: "other",
    description:
      "OpenAI's video generation model, billed per second of output (Sora 2 Pro costs more at higher resolutions). Worth knowing for what it signals as much as for current access: OpenAI discontinued the standalone Sora consumer app on April 26, 2026, cut free-tier video access in January 2026, and has announced the Sora 2 API itself stops accepting requests on September 24, 2026 -- a fast-moving product even by this market's standards.",
    pricingNote: "API-only, per-second billing; consumer access is Plus/Pro subscribers only, and the API's own shutdown is already announced",
    sourceUrl: "https://openai.com/sora/",
    verifiedDate: "2026-08-23",
  },
];
