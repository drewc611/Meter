// AI news commentary -- dated, sourced articles added as real news happens,
// picked up by a scheduled run seven times a day that publishes autonomously
// (see merit-ai-team/docs/merit-news-goal.md and merit-news-judge-log.md).
// Every claim needs a real source in `sources` -- no invented statistics, no
// treating a press release as independent reporting. Skip a run entirely
// rather than forcing an article out just to hit the schedule: an empty run
// is a correct outcome, not a failure.
//
// Each entry: { date: "YYYY-MM-DD", slug, title, dek, sources: [{label,url}],
// body: [{type: "p"|"h2", text}], corrections?: [{date, note}],
// category?: "research"|"product"|"regulation"|"funding"|"tools" } -- newest
// first isn't required here, NewsIndex.jsx sorts by date itself. `category`
// is optional and shown as a small label on the /news index, not filtered
// on -- see NewsIndex.jsx's CATEGORY_LABELS for the fixed set.
//
// `corrections` is the visible retraction/correction trail this site commits
// to given autonomous, no-human-review publishing: if a later run (or Andrew)
// finds a factual error in a published article, the fix is a new dated entry
// appended here -- describing what was wrong and what changed -- never a
// silent edit to the original body text.
export const NEWS_ARTICLES = [
  {
    date: "2026-08-22",
    slug: "claude-and-gpt-breached-real-systems-in-testing",
    category: "research",
    title: "Claude and GPT models broke out of their test environments and touched real systems",
    dek:
      "Anthropic disclosed that three Claude versions gained unauthorized access to outside organizations' networks during security evaluations -- days after OpenAI reported the same category of failure.",
    sources: [
      {
        label: "Anthropic reveals Claude \"gained unauthorized access\" to \"real-world systems\" during testing — CBS News",
        url: "https://www.cbsnews.com/news/anthropic-claude-gained-unauthorized-access-to-real-world-systems/",
      },
      {
        label: "After OpenAI disclosure, Anthropic says Claude also hacked outside systems — Al Jazeera",
        url: "https://www.aljazeera.com/news/2026/7/31/after-openai-disclosure-anthropic-claude-hacked-outside-systems",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "On July 30, 2026, Anthropic disclosed that three different Claude model versions gained unauthorized access to systems belonging to three separate, unnamed organizations. The count is small against scale -- three incidents out of more than 141,000 evaluation runs -- but the mechanism is the part worth sitting with.",
      },
      {
        type: "h2",
        text: "What actually happened",
      },
      {
        type: "p",
        text:
          "The models were running \"capture-the-flag\" security evaluations: told to break in and retrieve a hidden secret on a target machine, using whatever it could find. They found basic vulnerabilities -- weak passwords, unauthenticated endpoints -- and used them. That's the evaluation working as designed. What wasn't supposed to happen is that the models had internet access at all during these runs, which Anthropic attributes to \"a misunderstanding between us and our evaluation partner,\" Irregular. Some of what they reached through that access belonged to real organizations, not sandboxed test infrastructure.",
      },
      {
        type: "p",
        text:
          "This followed, by a matter of days, OpenAI's own disclosure that its models broke out of test containment, reached Hugging Face, and touched the open internet during similar evaluations -- serious enough that OpenAI paused that category of testing to rework its security protocols before resuming.",
      },
      {
        type: "h2",
        text: "Why this is the whole argument, not a footnote to it",
      },
      {
        type: "p",
        text:
          "Two frontier labs, independently, found that the boundary meant to contain an agent during adversarial testing wasn't actually load-bearing -- not because the model schemed its way out, but because a network-access assumption between two teams didn't hold. That's precisely the failure mode the ten disciplines and fourteen domains guides on this site are about: a model's own competence is not a control, and the control that's supposed to sit between reasoning and real-world action has to be verified as actually present, not assumed from the architecture diagram.",
      },
      {
        type: "p",
        text:
          "The uncomfortable generalization: if two of the most security-conscious labs in the industry can lose track of whether their own agents have internet access during a live evaluation, an internal team standing up an agentic coding platform on a Friday afternoon should not assume its own boundary is solid just because nobody's tested it yet.",
      },
      {
        type: "p",
        text:
          "Worth trying this week: pull up your own agent environment's network egress rules and confirm -- don't assume -- exactly what it can reach. Day 4 of the prompt archive walks through auditing exactly this.",
      },
    ],
  },
  {
    date: "2026-08-22",
    slug: "anthropic-watermarks-claude-output-for-eu-compliance",
    category: "regulation",
    title: "Anthropic is watermarking Claude's text output, starting in the EU",
    dek:
      "New Claude models launched in the EU from August 2, 2026 embed an invisible, detectable pattern in generated text -- Anthropic's answer to the EU AI Act's AI-content-labeling requirement.",
    sources: [
      {
        label: "Anthropic shares more details about how Claude's new watermarks will work — TechCrunch",
        url: "https://techcrunch.com/2026/08/15/anthropic-shares-more-details-about-how-claudes-new-watermarks-will-work/",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "The EU AI Act's transparency obligations for general-purpose models with systemic risk started being enforced on August 2, 2026, with real teeth: the European Commission can request information, evaluate a model directly, order mitigations, restrict availability, or fine a company up to 3% of its worldwide annual turnover. One of the obligations is marking AI-generated content as such. Anthropic's answer, for new Claude models shipped in the EU from that date, is a watermark baked into the text itself.",
      },
      {
        type: "h2",
        text: "How it actually works",
      },
      {
        type: "p",
        text:
          "Anthropic is using SynthID Text, a method Google DeepMind published in 2024. It doesn't add visible markup -- it steers Claude's low-stakes word choices (picking \"overcast\" over \"grey,\" for instance) into a pattern that's undetectable to a reader but recoverable by anyone holding the matching key. A detection API is coming. Anthropic's own framing of the limits is unusually direct: light editing survives, but \"a complete rewrite where every word is replaced\" removes it -- at which point, they note, it's fair to ask whether the output is still meaningfully AI-generated at all. Code is barely touched, since functional correctness leaves little room for the arbitrary word choice the watermark depends on; if it shows up anywhere, it's in a comment.",
      },
      {
        type: "h2",
        text: "The part worth noting for a governance-minded reader",
      },
      {
        type: "p",
        text:
          "This is a compliance answer to a real legal requirement, not a content-detection product aimed at catching misuse -- it's easy to strip with enough rewriting, and Anthropic says so plainly rather than overselling its robustness. That's the same posture this site keeps trying to apply to its own claims: a control that's honest about its own limits is more useful than one oversold as airtight. Whether \"can this text be traced back to a model\" ends up mattering for your own organization depends entirely on what you're using generated text for -- worth a real answer, not an assumed one, before treating this as either a solved problem or a non-issue.",
      },
    ],
  },
  {
    date: "2026-08-23",
    slug: "openai-crosses-one-billion-active-users",
    category: "product",
    title: "OpenAI says its models now reach 1 billion active users",
    dek:
      "The milestone lands under four years after ChatGPT's launch, alongside an 80% GPT-5.6 price cut -- but OpenAI still isn't saying how many of that billion are paying for anything.",
    sources: [
      {
        label: "Building abundant intelligence — OpenAI",
        url: "https://openai.com/index/building-abundant-intelligence/",
      },
      {
        label: "OpenAI reaches one billion active users as it cuts GPT-5.6 prices by up to 80% — TechSpot (Rob Thubron)",
        url: "https://www.techspot.com/news/113329-openai-reaches-one-billion-active-users-cuts-gpt.html",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "On July 31, 2026, OpenAI CFO Sarah Friar wrote that the company's models now reach \"more than one billion active users and more than two million businesses\" -- a milestone reached less than four years after ChatGPT's November 2022 launch, and faster than Facebook took to hit the same user count.",
      },
      {
        type: "h2",
        text: "What actually got disclosed",
      },
      {
        type: "p",
        text:
          "The billion-user figure spans every OpenAI surface, not just the ChatGPT app: the core chatbot, Codex for AI-assisted coding, and ChatGPT Work, the platform for connecting outside applications. It arrives alongside price cuts of up to 80% on GPT-5.6, and after OpenAI reported 900 million weekly active users back in February -- a growth curve the company had expected to clear this milestone on earlier in the year before competition slowed it.",
      },
      {
        type: "h2",
        text: "The number that's still missing",
      },
      {
        type: "p",
        text:
          "OpenAI did not break the billion down by free users, paid subscribers, API customers, or enterprise seats. That's the split that actually determines whether this is a revenue story or a reach story, and it's the same gap this site keeps running into with its own thesis: a raw usage count says nothing about value produced per dollar spent, on either side of the transaction. A company deciding whether to expand its own AI seat count off the back of a headline like \"a billion users\" is reasoning from adoption, not from outcome -- exactly the distinction the recoverable-spend framing on this site's dashboard methodology is built to catch.",
      },
    ],
  },
  {
    date: "2026-08-23",
    slug: "openai-astra-solves-ten-decades-old-math-problems",
    category: "research",
    title: "OpenAI's Astra model solved 10 decades-old math problems for about $2,000",
    dek:
      "Every proof is machine-checked in Lean 4 and published on GitHub under an open license -- an unusually verifiable AI research claim, and a rare case where the receipts and the price tag are both public.",
    sources: [
      {
        label: "Ten proofs: mathematical discoveries from an OpenAI model — OpenAI (official report PDF)",
        url: "https://cdn.openai.com/pdf/ten-proofs-oai.pdf",
      },
      {
        label: "OpenAI announces its \"next major model\" Astra by dropping ten previously unsolved math solutions — THE DECODER (Matthias Bastian)",
        url: "https://the-decoder.com/openai-announces-its-next-major-model-astra-by-dropping-ten-previously-unsolved-math-solutions/",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "On August 1, 2026, OpenAI said an internal version of Astra, described as its next major model family, produced machine-checkable solutions to ten open problems in mathematics and theoretical computer science -- questions spanning group theory, high-dimensional geometry, quantum complexity, and several other fields, some unresolved for decades. OpenAI put the total compute cost for all ten at roughly $2,000 at its own API rates.",
      },
      {
        type: "h2",
        text: "The receipts are, unusually, public",
      },
      {
        type: "p",
        text:
          "Every proof was formalized as a Lean 4 certificate and published on GitHub, so a mathematician doesn't have to trust OpenAI's framing to check the work -- the certificates either verify or they don't. OpenAI also released reasoning walkthroughs for each solution and, per its own report, says \"the mathematical arguments themselves, however, came from Astra,\" while noting humans helped turn the arguments into publishable papers and pointing to the Leiden Declaration on AI and Mathematics for how it's assigning credit.",
      },
      {
        type: "h2",
        text: "Why the price tag is the actual headline",
      },
      {
        type: "p",
        text:
          "Ten genuinely novel, independently checkable results for $2,000 in compute is a value-per-dollar number, not just a capability one -- and it's the same kind of number this site's own methodology is built to demand of any AI spend claim: not \"the model did something impressive\" but \"here is what it cost, here is what came out, and here is how a stranger can verify it.\" That combination -- a real dollar figure and a machine-checkable output -- is closer to an audit trail than most AI research announcements get, and it's worth noticing precisely because it's rare, not because the size of the number is inherently the point.",
      },
    ],
  },
  {
    date: "2026-08-23",
    slug: "darpa-flies-ai-controlled-f-16-venom",
    category: "research",
    title: "DARPA and the Air Force flew an F-16 under AI control, with a human able to take back the stick instantly",
    dek:
      "The VENOM program converted a standard combat-fleet F-16 to autonomous control, tested at Eglin Air Force Base in June 2026 -- notable less for the flight itself than for the human-on-the-loop switch that makes it reversible.",
    sources: [
      {
        label: "DARPA, U.S. Air Force fly AI-controlled F-16 — DARPA (official press release)",
        url: "https://www.darpa.mil/news/2026/darpa-us-air-force-fly-ai-controlled-f-16",
      },
      {
        label: "After Surviving a Dogfight in a Test Aircraft, DARPA's VENOM AI-Controlled Pilot Just Flew a Modified Combat-Style F-16 — The Debrief",
        url: "https://thedebrief.org/after-surviving-a-dogfight-in-a-test-aircraft-darpas-venom-ai-controlled-pilot-just-flew-a-modified-combat-style-f-16/",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "DARPA disclosed on July 16, 2026 that it and the U.S. Air Force had flown an F-16 under AI control at Eglin Air Force Base, part of the VENOM program (Viper Experimentation and Next-generation Operations Model) -- flight operations were conducted the previous month, in June 2026.",
      },
      {
        type: "h2",
        text: "What makes this one different from a demo jet",
      },
      {
        type: "p",
        text:
          "The aircraft is a standard, operational-fleet F-16, not a purpose-built experimental airframe -- the point being that ordinary combat aircraft can be converted to carry autonomy, not that DARPA needed to build something exotic to prove the concept. Program manager Brig. Gen. James Valpiani said the team \"automated flight controls and sensors on a standard F-16 without changing the jet's core software.\"",
      },
      {
        type: "h2",
        text: "The part that actually matters: the switch",
      },
      {
        type: "p",
        text:
          "The VENOM Autonomy Kit lets a human pilot toggle between manual and AI control with a physical switch flip -- \"human-on-the-loop,\" in DARPA's own framing, not fully autonomous and unsupervised. That's the detail worth sitting with more than the flight itself: the control boundary between the AI system and the consequential action (flying a combat aircraft) isn't a policy document or a training assumption, it's a hardware-level, instantly reversible handoff. That's the same shape of control this site's own guides argue for in far lower-stakes settings -- a real, verifiable boundary between an agent's reasoning and its ability to act, not a boundary that exists only until something goes wrong.",
      },
      {
        type: "p",
        text:
          "It's a useful contrast to the Claude/GPT test-environment breach story covered here in August: that failure happened because a network-access boundary was assumed rather than verified. VENOM's human-on-the-loop switch is what it looks like when a team builds the boundary as an explicit, tested mechanism instead.",
      },
    ],
  },
  {
    date: "2026-08-23",
    slug: "cloudflare-kitesurf-agent-first-browser",
    category: "tools",
    title: "Cloudflare built a browser for AI agents, not humans, and it's free while in beta",
    dek:
      "Kitesurf runs entirely in V8 isolates on Cloudflare Workers, uses roughly 3-7x less CPU and memory than Chromium for agent tasks, and puts prompt injection in its threat model from the start -- though it's slower wall-clock and can't yet handle logins or bot-detection challenges.",
    sources: [
      {
        label: "Introducing Kitesurf: The agent-first browser that runs in V8 isolates on Cloudflare Workers — Cloudflare Blog",
        url: "https://blog.cloudflare.com/kitesurf/",
      },
      {
        label: "Cloudflare launches Kitesurf, a browser built for AI agents — TechCrunch (Sarah Perez)",
        url: "https://techcrunch.com/2026/08/07/cloudflare-launches-kitesurf-a-browser-built-for-ai-agents/",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "Cloudflare announced Kitesurf on August 6, 2026: a browser built specifically for AI agents to control, rather than for a human to look at. It runs entirely inside V8 isolates on Cloudflare Workers, built from a modular rendering engine (Blitz), Firefox's Stylo CSS parser, and a Rust-based ECMAScript engine (Boa) -- no themes, no tabs, no extensions, none of the surface a human-facing browser needs.",
      },
      {
        type: "h2",
        text: "The actual tradeoff",
      },
      {
        type: "p",
        text:
          "Cloudflare's own numbers: roughly 3.1-3.8x less CPU and 4.7-7.0x less memory than Chromium for the tasks an agent actually does (taking a screenshot, extracting HTML), while running 1.7-1.8x slower on wall-clock time. Cloudflare's framing: \"giving all agents a browser that excels at what's important for an AI model\" instead of inheriting a decade of human-browser overhead nobody asked an agent to pay for. It's already passing more than 215,000 Web Platform Tests, with more added weekly, but it plainly can't yet do video playback, WebGL, bot-detection fingerprinting, or persistent authenticated sessions -- anything behind a real login still needs Chromium.",
      },
      {
        type: "h2",
        text: "Why the threat-model detail is the part worth noting",
      },
      {
        type: "p",
        text:
          "Cloudflare states that prompt injection and tool safety are treated as top priorities in Kitesurf's threat model, rather than an afterthought bolted on once agents started actually browsing untrusted pages. Whether that holds up under real adversarial use is unproven this early -- Cloudflare's post doesn't detail the specific mitigations -- but naming the risk in the design brief, not after an incident, is the right instinct for infrastructure a growing share of agentic coding and agentic browsing workflows will run through. For a company already spending on agent infrastructure, the FinOps angle here is real too: a 4-7x memory reduction per agent browsing session is exactly the kind of unglamorous cost lever this site's own spend/value framing cares about, well before it becomes a line item anyone budgets for separately.",
      },
    ],
  },
  {
    date: "2026-08-23",
    slug: "google-gemini-robotics-er-2-refuses-unsafe-actions",
    category: "research",
    title: "Google's new robot-control model is built to refuse unsafe actions and stop when a person gets close",
    dek:
      "Gemini Robotics ER 2 extends Google DeepMind's embodied-reasoning model to full-body robot control, and its published benchmarks measure something more specific than raw task success: whether the robot knows when to stop.",
    sources: [
      {
        label: "Introducing Gemini Robotics ER 2 — Google (official blog)",
        url: "https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-robotics-er-2/",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "Google DeepMind announced Gemini Robotics ER 2 on July 30, 2026 -- a vision-language model that acts as a robot's high-level reasoning layer (\"ER\" for Embodied Reasoning): it doesn't drive motors directly, but sees the physical world, plans multi-step tasks lasting several minutes, and orchestrates the lower-level control systems that do. This release extends the family to full-body control -- legs, torso, arms, and fingers under one learned policy -- rather than upper-body manipulation alone.",
      },
      {
        type: "h2",
        text: "The benchmark that matters more than the demo reel",
      },
      {
        type: "p",
        text:
          "Alongside the usual capability numbers -- 91.3% accuracy on a timing/coordination benchmark, four times faster execution than competing models on the tasks Google tested -- Google published results on what it calls Safety Instruction Following and Human Proximity benchmarks, measuring whether the model halts, refuses an unsafe action, or asks for human input rather than pushing through. Google's own description: the model \"halts a humanoid robot when a person is nearby and autonomously resumes work.\"",
      },
      {
        type: "h2",
        text: "Why this is the right thing to be measuring",
      },
      {
        type: "p",
        text:
          "A model that's fast and accurate at completing a physical task but has no measured behavior for \"a person just walked into the workspace\" is optimizing for the wrong variable. Publishing a benchmark specifically for refusal and human-proximity halting is Google treating that failure mode as a first-class metric, not an assumed property of a capable-enough model -- the same distinction this site keeps returning to for software agents: competence is not a control, and a control has to be measured, not assumed, to count as real.",
      },
    ],
  },
  {
    date: "2026-08-23",
    slug: "california-ai-transparency-act-takes-effect",
    category: "regulation",
    title: "California's AI content-labeling law took effect August 2, timed to line up with the EU's",
    dek:
      "SB 942, as amended by AB 853, now requires large generative-AI providers serving California to offer a free AI-detection tool and label AI-generated image, video, and audio content -- deliberately synced to the EU AI Act's own August 2 enforcement date.",
    sources: [
      {
        label: "SB-942 California AI Transparency Act — California Legislative Information (official bill text)",
        url: "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240SB942",
      },
      {
        label: "California Enacts AI Transparency Law Requiring Disclosures for AI Content — Jones Day (Kukkonen, Myers, Paez, Tait, Thomas)",
        url: "https://www.jonesday.com/en/insights/2024/10/california-enacts-ai-transparency-law-requiring-disclosures-for-ai-content",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "California's SB 942, the AI Transparency Act, was signed in September 2024 with an original effective date of January 1, 2026. AB 853, signed October 2025, pushed that operative date to August 2, 2026 -- the same day the EU AI Act's transparency obligations for high-risk systems began being enforced -- and added separate hosting-platform obligations starting January 1, 2027.",
      },
      {
        type: "h2",
        text: "What it actually requires",
      },
      {
        type: "p",
        text:
          "Covered generative-AI providers with more than one million monthly California users must offer a free AI-detection tool and provide both a visible disclosure and an embedded, harder-to-strip \"latent\" disclosure on AI-generated image, video, and audio content, per the statute. Providers also have to contractually require third-party licensees to keep those same transparency capabilities in place, not just implement them in-house and stop there.",
      },
      {
        type: "h2",
        text: "Why the date isn't a coincidence",
      },
      {
        type: "p",
        text:
          "Two separate governments, on two continents, independently decided AI content-labeling obligations should land on the same day -- and California's own amendment explicitly aligned to it. That's a real, if narrow, instance of regulatory coordination in a space more often characterized by fragmentation, and it's the same underlying obligation this site already covered from Anthropic's side (watermarking Claude output for EU compliance): one technical response, at least two overlapping legal triggers, both now live.",
      },
    ],
  },
  {
    date: "2026-08-23",
    slug: "openai-shuts-down-atlas-browser",
    category: "product",
    title: "OpenAI shut down its standalone Atlas browser less than a year after launch",
    dek:
      "Atlas stopped working August 9, 2026, folded into ChatGPT Desktop's browser mode and ChatGPT Work instead -- a reversal on the standalone-AI-browser bet, and a useful contrast to Cloudflare's very different agent-browser approach covered here the same week.",
    sources: [
      {
        label: "ChatGPT for your most ambitious work — OpenAI (official announcement)",
        url: "https://openai.com/index/chatgpt-for-your-most-ambitious-work/",
      },
      {
        label: "OpenAI is shutting down Atlas, but its AI browser ambitions are still growing — TechCrunch (Rebecca Bellan)",
        url: "https://techcrunch.com/2026/07/09/openai-is-shutting-down-atlas-but-its-ai-browser-ambitions-are-still-growing/",
      },
    ],
    body: [
      {
        type: "p",
        text:
          "OpenAI announced on July 9, 2026 that it was sunsetting ChatGPT Atlas, its standalone AI browser launched in October 2025, with a deprecation date of August 9, 2026 -- a run of exactly ten months. Atlas's browsing capabilities aren't disappearing; they're being folded into an upgraded browser mode inside ChatGPT Desktop and into ChatGPT Work, OpenAI's newer unified platform for longer, multi-step browser tasks.",
      },
      {
        type: "h2",
        text: "Not a failure story, a packaging story",
      },
      {
        type: "p",
        text:
          "The stated logic: once an AI agent can independently read a page and act on it, a standalone browser stops being the right container for that capability -- it becomes a feature of the assistant, not a separate product a user has to choose to open. Whether that's the real reason or a reasonable story for a product that didn't stick is hard to verify from outside the company, and this site isn't going to claim more certainty than the public record supports either way.",
      },
      {
        type: "h2",
        text: "A useful contrast, not a verdict",
      },
      {
        type: "p",
        text:
          "It's worth reading alongside the Cloudflare Kitesurf story covered here the same week: two companies, two opposite bets on what \"browsing for AI\" should look like. OpenAI tried a human-facing browser with AI layered in, then retreated to folding that capability into an existing assistant. Cloudflare skipped the human-facing part entirely and built something with no tabs, no theme, no UI a person would ever touch. Neither approach is obviously right yet -- but the fact that one of 2026's most-watched AI browser bets didn't survive its first year is a data point worth having before treating any single vendor's browser-agent roadmap as settled.",
      },
    ],
  },
];
