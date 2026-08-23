// A glossary of AI terms -- evergreen reference content, not dated news.
// Standard field terminology has a lower sourcing burden than a news claim,
// but every definition here should still be accurate and written carefully,
// not padded to hit a round number. A few entries define terms this site's
// own product uses (shadow AI, rework tax) -- those are cross-checked
// against the actual product code/docs, not just general usage.
//
// Each entry: { term, slug, definition, category? }. `category` is a loose
// grouping for readability (model-architecture, training, evaluation,
// business-product) -- Glossary.jsx sorts alphabetically by `term`
// regardless of category, so this is just a label, not a filter.
export const GLOSSARY = [
  {
    term: "Agent",
    slug: "agent",
    category: "model-architecture",
    definition:
      "An LLM wired up to take actions -- calling tools, reading and writing files, hitting APIs -- in a loop, rather than just returning text. The model decides what to do next based on what the previous action returned.",
  },
  {
    term: "Agentic coding",
    slug: "agentic-coding",
    category: "model-architecture",
    definition:
      "Using an AI agent to write, edit, and run code somewhat autonomously across multiple files and steps, rather than generating one code snippet per prompt.",
  },
  {
    term: "Chain-of-thought",
    slug: "chain-of-thought",
    category: "model-architecture",
    definition:
      "Prompting or training a model to write out intermediate reasoning steps before its final answer, which tends to improve accuracy on multi-step problems.",
  },
  {
    term: "Context window",
    slug: "context-window",
    category: "model-architecture",
    definition:
      "The maximum amount of text (measured in tokens) a model can consider at once, including the prompt, any documents provided, and the conversation history. Exceeding it means older content gets dropped or the request fails.",
  },
  {
    term: "Embedding",
    slug: "embedding",
    category: "model-architecture",
    definition:
      "A numeric vector representation of text (or an image, etc.) that captures its meaning, positioning similar content close together in vector space. The basis for semantic search and retrieval.",
  },
  {
    term: "Hallucination",
    slug: "hallucination",
    category: "model-architecture",
    definition:
      "A model generating text that's fluent and confident but factually wrong or entirely made up -- a citation that doesn't exist, a statistic that was never published, an API that isn't real.",
  },
  {
    term: "Mixture of experts (MoE)",
    slug: "mixture-of-experts",
    category: "model-architecture",
    definition:
      "A model architecture where only a subset of the model's total parameters ('experts') activate for any given input, instead of the whole network running every time. Lets a model have a very large total parameter count while keeping the compute cost per request closer to a much smaller model.",
  },
  {
    term: "Model Context Protocol (MCP)",
    slug: "model-context-protocol",
    category: "model-architecture",
    definition:
      "An open protocol for connecting an AI model to external tools, data sources, and services through a standard interface, so a tool built for one MCP-compatible client can be reused across others instead of needing custom integration code per model.",
  },
  {
    term: "Multimodal",
    slug: "multimodal",
    category: "model-architecture",
    definition:
      "A model that can take in and/or generate more than one type of content -- text, images, audio, video -- rather than being limited to text alone.",
  },
  {
    term: "Open weights",
    slug: "open-weights",
    category: "model-architecture",
    definition:
      "A model whose trained parameters are published for anyone to download and run, as opposed to a closed model only accessible through a hosted API. Open weights doesn't necessarily mean the training data or code is also open.",
  },
  {
    term: "Parameter",
    slug: "parameter",
    category: "model-architecture",
    definition:
      "One of the numeric values a neural network learns during training. A model's parameter count (e.g. \"400B parameters\") is a rough proxy for its size and, loosely, its capacity -- not a direct measure of quality.",
  },
  {
    term: "Retrieval-augmented generation (RAG)",
    slug: "retrieval-augmented-generation",
    category: "model-architecture",
    definition:
      "Pairing a model with a search step: relevant documents are retrieved from an external source and inserted into the prompt before the model answers, so the response can be grounded in real, current material instead of only what the model memorized during training.",
  },
  {
    term: "Token",
    slug: "token",
    category: "model-architecture",
    definition:
      "A chunk of text (often a word, part of a word, or punctuation mark) that a model processes as a single unit. API pricing and context-window limits are both measured in tokens, not characters or words.",
  },
  {
    term: "Vibe coding",
    slug: "vibe-coding",
    category: "model-architecture",
    definition:
      "Building software mostly by describing what you want to an AI agent and accepting its output with light review, rather than writing or closely reviewing the code yourself. Fast for prototypes; the risk this site's own product is built to catch is when the same loose review carries into production work.",
  },
  {
    term: "Fine-tuning",
    slug: "fine-tuning",
    category: "training",
    definition:
      "Further training an already-trained model on a smaller, specific dataset to specialize its behavior, as opposed to prompting a general-purpose model at inference time.",
  },
  {
    term: "Reinforcement learning from human feedback (RLHF)",
    slug: "rlhf",
    category: "training",
    definition:
      "A training technique where a model's outputs are ranked or rated by humans, and that feedback is used to further train the model toward responses people actually prefer -- part of how raw pretrained models get shaped into helpful assistants.",
  },
  {
    term: "System prompt",
    slug: "system-prompt",
    category: "training",
    definition:
      "Instructions given to a model before the user's own messages, typically set by the developer rather than the end user, establishing the model's role, constraints, and behavior for the whole conversation.",
  },
  {
    term: "Temperature",
    slug: "temperature",
    category: "training",
    definition:
      "A setting that controls how random a model's output is. Low temperature makes responses more deterministic and repetitive; high temperature makes them more varied, and more prone to going off the rails.",
  },
  {
    term: "Benchmark",
    slug: "benchmark",
    category: "evaluation",
    definition:
      "A standardized test used to compare models on a specific capability (coding, math, reasoning). Worth treating skeptically in isolation -- a model can be tuned to perform well on a popular benchmark without that improvement generalizing to real-world tasks.",
  },
  {
    term: "Eval",
    slug: "eval",
    category: "evaluation",
    definition:
      "Short for evaluation -- a structured test (automated, human-graded, or model-graded) used to measure whether a model or an AI-built system is actually working, as opposed to informally trying a few prompts and eyeballing the results.",
  },
  {
    term: "Ground truth",
    slug: "ground-truth",
    category: "evaluation",
    definition:
      "The verified, correct answer or outcome that a model's output is compared against when measuring accuracy -- the reference an eval actually checks the model's work against.",
  },
  {
    term: "LLM-as-judge",
    slug: "llm-as-judge",
    category: "evaluation",
    definition:
      "Using one AI model to grade or score another model's output, instead of (or alongside) human review -- cheaper and faster than human grading at scale, but only as reliable as the judging model and the rubric it's given.",
  },
  {
    term: "Red teaming",
    slug: "red-teaming",
    category: "evaluation",
    definition:
      "Deliberately trying to make a model fail, produce harmful output, or be manipulated (via adversarial prompts, jailbreaks, edge cases) in order to find and fix weaknesses before real users find them.",
  },
  {
    term: "AI FinOps",
    slug: "ai-finops",
    category: "business-product",
    definition:
      "The practice of tracking, attributing, and managing what an organization spends on AI -- tools, API usage, seats -- the same way FinOps applies to cloud infrastructure spend.",
  },
  {
    term: "Confidence tier",
    slug: "confidence-tier",
    category: "business-product",
    definition:
      "Labeling a metric or score by how directly it was measured versus inferred, rather than presenting every number with equal certainty. This site's own product scores are explicitly confidence-tiered signals, not unqualified measurements.",
  },
  {
    term: "Prompt injection",
    slug: "prompt-injection",
    category: "business-product",
    definition:
      "An attack where malicious instructions are hidden inside content a model processes (a webpage, a document, a tool's output) so the model follows them as if they came from the legitimate user or operator, rather than treating them as untrusted data.",
  },
  {
    term: "Recoverable spend",
    slug: "recoverable-spend",
    category: "business-product",
    definition:
      "An estimate of how much AI spend an organization could get back by addressing low-value usage (high spend paired with low measured outcome or quality), rather than a call to cut AI spend broadly.",
  },
  {
    term: "Rework tax",
    slug: "rework-tax",
    category: "business-product",
    definition:
      "The share of AI-assisted work that has to be redone -- reverts, rewrites, regeneration loops -- expressed as a cost against the spend that produced it. A high rework tax means a chunk of AI spend is going toward output that didn't hold up, not toward real progress.",
  },
  {
    term: "Shadow AI",
    slug: "shadow-ai",
    category: "business-product",
    definition:
      "AI tool usage inside an organization that isn't tracked, approved, or visible to whoever owns the AI budget or security posture -- an employee's personal ChatGPT subscription used for work, an unapproved coding assistant, an API key nobody logged.",
  },
  {
    term: "Slop",
    slug: "slop",
    category: "business-product",
    definition:
      "Low-quality AI-generated output that looks plausible enough to pass a quick glance but doesn't hold up -- code that needs to be rewritten, content that needs a full rework -- as opposed to output that was genuinely useful the first time.",
  },
];
