// AI news commentary -- dated, sourced articles added as real news happens,
// originally seeded manually and then picked up by a scheduled run three
// times a day (see merit-ai-team/docs/merit-content-goal.md for the
// automation). Every claim needs a real source in `sources` -- no invented
// statistics, no treating a press release as independent reporting. Skip a
// run entirely rather than forcing an article out just to hit the schedule:
// an empty run is a correct outcome, not a failure.
//
// Each entry: { date: "YYYY-MM-DD", slug, title, dek, sources: [{label,url}],
// body: [{type: "p"|"h2", text}] } -- newest first isn't required here,
// NewsIndex.jsx sorts by date itself.
export const NEWS_ARTICLES = [
  {
    date: "2026-08-22",
    slug: "claude-and-gpt-breached-real-systems-in-testing",
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
];
