import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";
import Code from "../../components/Code.jsx";

export const meta = {
  outFile: "claude-architecture/claude-and-mcp.html",
  title: "Claude and MCP: The Model Context Protocol — Merit AC Guides",
  description:
    "How the Model Context Protocol standardizes the wiring between Claude and external tools and data — and the real architectural decision of when a custom integration is enough versus when a reusable MCP server is worth building.",
};

export default function ClaudeAndMCP() {
  return (
    <ContentLayout active="claude-architecture" wide>
      <span className="kicker">Guide · agent architecture</span>
      <h1>Claude and MCP: the Model Context Protocol as an integration pattern</h1>
      <p className="lead">
        Every application that connects a model like Claude to something outside itself — a database,
        a filesystem, an internal API, a search index — has to solve the same unglamorous problem: how
        does the model discover what's available, and how does a call from the model actually reach
        the external system safely. The Model Context Protocol (MCP) is Anthropic's open answer to
        that problem: a standard interface between a client (the application or agent harness embedding
        Claude) and a server (something exposing tools, data, or prompt templates over that interface).
        This guide is about the architecture that standard makes possible, not about any specific
        server's internals — the pattern applies whether the server in question is one your team wrote
        in an afternoon or a widely used connector someone else maintains.
      </p>

      <Toc
        items={[
          { href: "#the-problem", label: "1. The problem before a standard protocol" },
          { href: "#core-architecture", label: "2. Core architecture: client and server" },
          { href: "#three-things", label: "3. Tools, resources, and prompts" },
          { href: "#decoupling-benefit", label: "4. The real benefit of decoupling" },
          { href: "#trust-boundary", label: "5. Trust boundaries and authorization" },
          { href: "#local-vs-remote", label: "6. Local vs. remote MCP servers" },
          { href: "#worked-example", label: "7. Worked example: custom tool or MCP server?" },
        ]}
      />

      <h2 id="the-problem">1. The problem before a standard protocol</h2>
      <p>
        Before a shared protocol existed, wiring a model up to an external tool meant writing bespoke
        integration code for that specific tool, against that specific application's internal
        conventions for how tools get defined, invoked, and returned to the model. A team building a
        support bot that needed to look up orders wrote one integration against their order database.
        A different team building an internal coding assistant that needed the same order database
        wrote a second, unrelated integration — different argument shapes, different error handling,
        different assumptions about what the model harness expected back. Multiply that by every
        tool-model pairing in an organization and the result is a combinatorial mess: N tools times M
        applications, each cell in that grid its own one-off integration, none of it reusable across
        the other cells even when the underlying tool never changed.
      </p>
      <p>
        MCP collapses that grid. It defines a standard way for a server to describe what it exposes —
        its tools, its data, its prompt templates — and a standard way for a client to discover and use
        that surface, independent of which application embeds the client or which model the application
        happens to be using. An integration built once against the protocol, on the server side, works
        with any MCP-compatible client, not just the one application it was originally built for. That
        is the entire point of standardizing the interface: it turns an integration from a
        property of one application into a property of the tool itself.
      </p>
      <p>
        It's worth being precise about what MCP actually standardizes, because it's easy to overstate.
        It does not standardize what a tool does, how well it does it, or whether it's safe to call —
        those are still entirely up to whoever built the server. What it standardizes is the shape of
        the conversation: how a client asks a server what's available, how it invokes something the
        server offers, and how results and errors come back. That's a narrower claim than "MCP makes
        every integration good," but it's the claim that actually removes the N-times-M problem, because
        the interface — not the tool's quality or safety — was the thing being reimplemented every time.
      </p>

      <h2 id="core-architecture">2. Core architecture: client and server</h2>
      <p>
        MCP splits responsibility cleanly down one line: a server exposes a defined set of
        capabilities over the protocol, and a client — embedded in the application or agent harness
        that's actually running Claude — discovers what a connected server offers and mediates between
        the model and that server. Neither side needs to know much about the other's internals. The
        server doesn't need to know it's being called from a coding agent versus a chat app versus a
        research assistant; the client doesn't need bespoke code for each different server it connects
        to, because every server speaks the same protocol regardless of what it's backed by.
      </p>
      <p>
        Concretely, an MCP server is a small program — it might be a thin wrapper around an existing
        API, a database connection with a fixed set of allowed queries, or a purpose-built service —
        that answers a defined set of protocol messages: "what do you offer," "run this tool with these
        arguments," "give me this resource," "here's a prompt template, fill it in." An MCP client
        lives inside the harness that's driving the model: it's the piece of code that, on startup,
        asks each connected server what it exposes, translates that into a form the model's tool-calling
        interface understands, and routes the model's resulting tool calls to the right server and
        brings the results back into the conversation. The harness — the actual agent loop, the code
        that decides when to call the model, how to handle its response, how to loop until the task is
        done — sits around the client and doesn't need separate logic per external system; it only
        needs to speak MCP once.
      </p>
      <p>
        This is a client-server split in the ordinary networking sense, not a Claude-specific one — the
        protocol doesn't care which model is on the other end of the client, and nothing about it is
        exclusive to Claude. What makes it relevant here is that Claude's agentic surfaces (both the
        API's tool-use mechanics and agent harnesses built on top of it) are built to speak MCP as a
        client, which is what makes the rest of this guide — the reuse benefit, the trust questions, the
        local-versus-remote tradeoff — actually apply to systems built with Claude rather than being a
        purely abstract protocol description.
      </p>

      <h2 id="three-things">3. Tools, resources, and prompts — the three things a server can expose</h2>
      <p>
        MCP defines three distinct kinds of things a server can offer, and the distinction between them
        is worth taking seriously — conflating them is a common source of over-engineered servers that
        expose everything as a tool when a resource would have been simpler and cheaper.
      </p>
      <div className="card">
        <p style={{ marginBottom: "8px" }}>
          <b>Tools.</b> Callable actions with a defined input schema and a defined output shape — the
          same conceptual thing as a function-calling tool in a direct API integration, just exposed
          over MCP's transport instead of defined inline in one application's code. A tool is the right
          shape for anything that <em>does</em> something or requires arguments to know what to fetch:
          "create a ticket with this title and description," "run this query with these parameters,"
          "send this message to this channel." The model decides when to call it and with what
          arguments; the server decides what actually happens when it's called.
        </p>
        <p style={{ marginBottom: "8px" }}>
          <b>Resources.</b> Read-only data a server makes available for a client to attach to a
          conversation — a file, a database record, a configuration document — without necessarily
          requiring the model to construct a tool call to get it. Resources are the right shape for
          content that exists independent of any specific request and doesn't need arguments to
          identify: a project's README, a customer record by a known ID, a log file. Where a tool
          models an action, a resource models a piece of context the application can choose to include.
        </p>
        <p style={{ marginBottom: 0 }}>
          <b>Prompts.</b> Reusable, parameterized prompt templates a server can offer to any connected
          client — a structured way to package "here's a well-tested prompt for doing X, fill in these
          slots" so that the prompt engineering lives with the server (and its author, who understands
          the underlying system best) rather than being re-derived by every application that wants to
          use it. This is the least commonly used of the three in practice, but it matters architecturally
          for the same reason tools and resources do: it moves something that used to be duplicated
          per application into a single, shared, maintained place.
        </p>
      </div>
      <p>
        The practical rule of thumb: if the model needs to decide, per turn, whether and how to invoke
        something with specific arguments, it's a tool. If it's context that would be useful to have
        available and doesn't need per-call arguments to resolve, it's a resource. Reaching for a tool
        by default, even for things that are really just static or slowly-changing data, adds an
        unnecessary decision point to the model's action space and an unnecessary round-trip to get
        something that could have been attached directly.
      </p>

      <h2 id="decoupling-benefit">4. The real benefit of decoupling</h2>
      <p>
        The architectural payoff of splitting client and server this cleanly is ownership. A team that
        owns an internal system — a ticketing platform, a data warehouse, a deployment pipeline — can
        build and maintain exactly one MCP server for it, and every MCP-compatible agent or application
        in the organization can use that server without the ticketing team ever needing to learn, or
        support, the internals of each different agent framework that wants to talk to their system.
        Before MCP, "let people build agents against our system" implicitly meant "maintain N different
        integration contracts, one per consuming team's framework of choice," which is a support burden
        that scales with how popular the system becomes internally — exactly backwards from what you'd
        want.
      </p>
      <p>
        This is also what makes MCP servers a genuine unit of reuse across organizational boundaries,
        not just within one company. A server built to expose a common piece of infrastructure — version
        control, project tracking, a class of database — can be written once and used by any team, at
        any company, running any MCP-compatible client, the same way a well-designed library gets reused
        across projects that have nothing else in common. That's a different value proposition than a
        one-off tool integration built into a single application: the integration effort is amortized
        across every future consumer instead of paid once per consumer.
      </p>
      <p>
        The decoupling cuts both ways, though, and it's worth naming the cost side plainly. A server
        meant to be reused by unknown future clients has to be more conservative about its interface
        than a tool built for one specific application — it can't assume anything about how a
        particular harness manages context, retries, or error presentation, because it doesn't know
        which harness will be calling it. Designing a good general-purpose MCP server takes more
        discipline than writing a tool for a single, known caller, for the same reason a published
        library's public API deserves more care than a private helper function used in one place.
      </p>

      <h2 id="trust-boundary">5. Trust boundaries and authorization</h2>
      <p>
        Connecting to an MCP server — especially one your team didn't build — means trusting a set of
        claims you generally can't verify from the client side alone: that the server's tools do what
        their descriptions say, that the server only touches the data it claims to touch, and that its
        own internal authorization actually enforces what it says it enforces. None of that is
        different in kind from trusting any other third-party API; MCP doesn't introduce a new category
        of risk so much as it makes third-party tool integration frictionless enough that teams reach
        for it more often, which means the trust question comes up more often too.
      </p>
      <p>
        The principle that matters here is the same one that governs tool design generally: authorization
        has to be enforced independently of what the model requests, never inferred from the model's own
        assurance that a call is safe. That applies just as much to the enforcement happening
        <em> inside</em> an MCP server as it does to any other tool in an agent's toolkit. A server that
        exposes a <code>delete_record</code> tool and simply trusts that whatever arguments the model
        supplied are authorized — because the model is "just following the user's instructions" — has
        the exact same authority gap as a custom tool built the same careless way; wrapping it in the
        protocol doesn't add a check that wasn't designed in. See{" "}
        <a href="/guides/ten-disciplines-of-governed-agentic-devsecops">
          The ten disciplines of governed agentic DevSecOps
        </a>
        , specifically the architecture-rule and tool-design disciplines, for the fuller version of why
        that separation matters and what it looks like to get it right — everything there about a
        custom tool's own internal enforcement applies unchanged to an MCP server's.
      </p>
      <div className="card">
        <p>
          <b>A concrete question worth asking before adding any MCP server to an agent's toolkit:</b>{" "}
          if this server's authorization checks are wrong or missing, what's the actual blast radius —
          and is that decided by the server's own design, or does it depend on trusting that the model
          will only ask for things it should? If the answer depends on the model's good judgment rather
          than an independent check the server enforces regardless of what's asked, that's the same
          architecture gap discipline 1 of the DevSecOps guide describes, just relocated to a server you
          may not have written.
        </p>
      </div>
      <p>
        This is also why connecting an agent to an unfamiliar MCP server deserves the same scrutiny as
        installing any other third-party code that will run with some amount of access to your data or
        systems — reading what the server's tools claim to do is not the same as verifying what they
        actually do, and a server description is, in the end, still just text the server chose to
        publish about itself.
      </p>

      <h2 id="local-vs-remote">6. Local vs. remote MCP servers</h2>
      <p>
        MCP servers come in two broad deployment shapes, and the difference is more than a networking
        detail — it changes what the server can reasonably be trusted to do and what operational
        properties an application built around it inherits.
      </p>
      <p>
        A <b>local</b> server runs as a process on the same machine as the client — commonly used for
        filesystem access, local developer tools, or anything that needs to touch resources that only
        make sense in the context of one machine (a local Git repository, a local build tool, files on
        disk). Because it's running locally, it typically communicates with the client over a simple,
        low-latency local channel rather than a network protocol, and it inherits whatever permissions
        the process it's running under already has. That's convenient — no separate deployment, no
        network round-trip — but it also means the server's blast radius is whatever that local user
        account can touch, which is worth remembering before pointing a local filesystem server at
        anything more sensitive than a scratch directory.
      </p>
      <p>
        A <b>remote</b> server runs elsewhere and is reached over the network — the shape that makes
        sense for a shared internal system (a company's ticketing platform, a shared database) that
        many different clients, possibly on many different machines, all need to reach the same way.
        Remote servers introduce the ordinary considerations that come with any networked service: real
        latency on every call, the server's own availability becoming a dependency of every application
        that uses it, and a genuine network-trust boundary — the server is now a separate, independently
        operated system, reachable by anything else that can reach it, and its own authentication and
        network exposure become part of what you're trusting when you connect to it.
      </p>
      <p>
        Neither shape is strictly better; they suit different jobs. A local server is the right choice
        when the resource genuinely only exists locally and only one client will ever need it. A remote
        server is the right choice when the resource is shared infrastructure that many clients and
        many users need to reach consistently, and the operational cost of running and securing a
        network service is worth paying for that consistency. Picking the wrong one — standing up a
        network service for something that only ever runs on one developer's laptop, or building a
        local-only integration for something that five different teams actually need — tends to show up
        later as either wasted operational overhead or an integration that quietly gets reimplemented
        four more times because it was never reachable from anywhere else.
      </p>

      <h2 id="worked-example">7. Worked example: custom tool integration or a proper MCP server?</h2>
      <p>
        The decision that actually comes up in practice isn't "should we use MCP" in the abstract — it's
        "for this specific integration, is a custom tool built directly into our application good
        enough, or does this deserve a standalone MCP server other things can reuse." That's a real
        tradeoff with a real answer, not a default to reach for MCP everywhere.
      </p>
      <Code wrap>{`Scenario: a customer-support agent needs to look up order status from the
company's internal orders database.

Option A — a custom tool, built directly into the support agent's own
application code:
  - Fast to build: one function, one schema, wired directly into this one
    agent's tool list.
  - No protocol overhead, no separate process or service to run and monitor.
  - Only usable by this one application. If the billing team's agent, or the
    internal ops dashboard, later needs the same order lookup, they each
    write their own version against the same database — and now there are
    three integrations to keep in sync with the schema, not one.

Option B — a standalone MCP server for the orders database, maintained by
the team that owns that system:
  - More upfront work: a real service, with its own deployment, its own
    authorization checks independent of any calling agent, its own
    versioning as the database schema evolves.
  - Usable immediately by any MCP-compatible client — the support agent, the
    billing team's agent, the ops dashboard — without the orders team
    needing to understand any of those callers individually.
  - The orders team now owns one authorization surface to secure and audit,
    instead of trusting that every application team that reimplements
    "query the orders table" got the authorization checks right on their
    own.`}</Code>
      <p>
        The deciding factor is almost never "which is technically easier to build" — a custom tool
        usually wins that comparison, especially the first time. It's whether more than one consumer
        realistically needs this integration, now or in the foreseeable future, and whether the thing
        being exposed is sensitive or complex enough that having one team own its authorization and
        maintenance, rather than N teams each reimplementing it, is worth the extra upfront cost of
        building a real server. A one-off internal script that only ever needs to read a config file for
        a single agent almost never earns an MCP server. A shared system with real access-control
        implications that multiple teams want to build agents against almost always does — and building
        it as a custom tool the first time a second team asks for the same access is usually the moment
        the decision gets made for you anyway, just later and with more integrations already depending
        on the old, unshared version.
      </p>
    </ContentLayout>
  );
}
