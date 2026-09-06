import ContentLayout from "../../components/ContentLayout.jsx";
import Toc from "../../components/Toc.jsx";

const CATEGORY_TABLE = [
  [
    "Hyperscaler",
    "AWS, Microsoft Azure, Google Cloud Platform",
    "Largest breadth of managed services and global footprint; general-purpose default",
  ],
  [
    "Specialized enterprise",
    "Oracle Cloud Infrastructure, IBM Cloud, Alibaba Cloud",
    "A specific installed base, region, or existing vendor relationship, not general-purpose breadth",
  ],
  [
    "Developer-focused",
    "DigitalOcean, Linode / Akamai",
    "Smaller catalog, simpler pricing, aimed at small teams and conventional workloads",
  ],
  [
    "Edge / CDN-first",
    "Cloudflare, Fly.io",
    "Compute distributed close to users by default, grown outward from an edge-network origin",
  ],
];

function CategoryTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Examples</th>
          <th>What actually distinguishes it</th>
        </tr>
      </thead>
      <tbody>
        {CATEGORY_TABLE.map((row) => (
          <tr key={row[0]}>
            <td>{row[0]}</td>
            <td>{row[1]}</td>
            <td>{row[2]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const meta = {
  outFile: "cloud-architecture/cloud-providers-compared.html",
  title: "Cloud Providers Compared: AWS, Azure, GCP, and Beyond — Merit AC Guides",
  description:
    "A reference guide to what actually distinguishes AWS, Microsoft Azure, and Google Cloud from each other and from the specialized, developer-focused, and edge-first providers around them.",
};

export default function CloudProvidersCompared() {
  return (
    <ContentLayout active="cloud-architecture" wide>
      <span className="kicker">Guide · infrastructure architecture</span>
      <h1>Cloud providers compared: AWS, Azure, GCP, and beyond</h1>
      <p className="lead">
        Most comparisons of cloud providers are written by someone selling one of them. This one
        isn't trying to rank them — it's trying to describe, as plainly as possible, what each
        category of provider actually is, who tends to use it, and why. "Which cloud is best" is
        a question with no stable answer; "what does this provider's positioning actually mean
        for a team like mine" is a question this guide can help with. For the follow-up question —
        how to actually decide, for a specific workload — see{" "}
        <a href="/cloud-architecture/choosing-a-cloud-provider">
          Choosing a cloud provider: a decision framework
        </a>
        .
      </p>

      <Toc
        items={[
          { href: "#hyperscaler", label: "1. What a hyperscaler is" },
          { href: "#aws", label: "2. AWS" },
          { href: "#azure", label: "3. Microsoft Azure" },
          { href: "#gcp", label: "4. Google Cloud Platform" },
          { href: "#second-tier", label: "5. The specialized second tier" },
          { href: "#developer-focused", label: "6. Developer-focused, simplicity-first" },
          { href: "#edge-first", label: "7. Edge and CDN-first platforms" },
          { href: "#decision-factors", label: "8. What actually drives a choice" },
          { href: "#wrong-question", label: "9. Why \"which is best\" is the wrong question" },
        ]}
      />

      <h2 id="hyperscaler">1. What a hyperscaler is</h2>
      <p>
        "Hyperscaler" gets used loosely, but it points at something real: a small number of
        providers — AWS, Microsoft Azure, and Google Cloud Platform, with some lists also
        including Alibaba Cloud — that operate at a scale of global data-center footprint,
        breadth of managed services, and capital investment that no other provider currently
        matches. That scale is the actual differentiator, not any single feature. A hyperscaler
        can offer dozens of regions across continents, hundreds of individually managed services
        spanning compute, storage, databases, networking, machine learning, IoT, and more, and
        the kind of redundancy and global backbone network that comes from operating
        infrastructure at the scale these three companies already operate it at for their own
        products.
      </p>
      <p>The table below is a rough map of the categories this guide covers, before going into each one individually.</p>
      <CategoryTable />
      <p>
        That breadth creates a gravitational pull that's worth naming directly, because it's the
        thing every other section of this guide sits downstream of. Once an organization has
        meaningfully adopted one hyperscaler's identity system, networking model, and a handful
        of its managed services, every additional workload is cheaper to add to that same
        provider than to stand up somewhere else — not because the other provider is worse, but
        because the integration, tooling, and institutional knowledge already exist in one place.
        This is a large part of why cloud decisions, once made, tend to compound rather than stay
        neutral.
      </p>

      <h2 id="aws">2. AWS</h2>
      <p>
        Amazon Web Services is widely regarded as the first mover among the modern cloud
        providers, having launched its core infrastructure services in the mid-2000s well before
        "cloud computing" was a mainstream category. That head start shows up today mostly as
        breadth: AWS is generally understood to have the largest and most granular catalog of
        managed services of any provider, often with multiple options for the same general job
        (several different managed database engines, several different container orchestration
        approaches, and so on). Its positioning has historically leaned toward infrastructure-level
        building blocks — give a team a very large set of primitives and let them compose what
        they need — rather than a small number of highly opinionated products.
      </p>
      <p>
        That breadth is also its most commonly cited drawback: a large catalog with a lot of
        overlapping options means more decisions for a team to make, and AWS's console and service
        naming are widely described as less approachable to newcomers than some competitors'. AWS
        is generally used by organizations that want maximum flexibility and are willing to invest
        in the expertise to navigate a large service catalog, and it tends to be the default
        starting point for teams and hiring markets where AWS experience is already the most
        common baseline skill.
      </p>

      <h2 id="azure">3. Microsoft Azure</h2>
      <p>
        Microsoft Azure's defining characteristic is its integration with the rest of Microsoft's
        enterprise software estate — Active Directory and Entra ID for identity, Microsoft 365,
        Windows Server, and the broader enterprise licensing relationships many large
        organizations already have with Microsoft. For a company that already runs on
        Microsoft's identity and productivity stack, extending that same relationship into cloud
        infrastructure is a materially smaller lift than adopting an unrelated provider's identity
        model from scratch, and this is generally understood to be Azure's strongest and most
        durable competitive position rather than any single technical feature.
      </p>
      <p>
        Azure is generally regarded as particularly strong for organizations with a long
        enterprise-software history, regulated industries with existing Microsoft compliance
        relationships, and hybrid deployments that need to bridge on-premises Windows-based
        infrastructure with cloud services. Teams evaluating Azure primarily for its technical
        merits in isolation, without weighing the existing-ecosystem fit, are often missing the
        actual reason organizations choose it.
      </p>

      <h2 id="gcp">4. Google Cloud Platform</h2>
      <p>
        Google Cloud Platform's services largely originated as externalized versions of
        infrastructure Google built to run its own internal products at very large scale — this
        lineage is most visible in Kubernetes, which originated inside Google (drawing on its
        internal Borg cluster-management system) before being open-sourced and becoming the
        de facto standard for container orchestration industry-wide. GCP is widely regarded as
        having a relative strength in data analytics and machine learning infrastructure, an area
        that traces directly back to Google's own internal needs around search, advertising, and
        large-scale data processing.
      </p>
      <p>
        GCP generally carries a reputation — deserved or not — as the most developer- and
        engineering-culture-oriented of the three hyperscalers, with particular strength claimed
        in data pipelines, analytics warehousing, and Kubernetes-native workloads specifically. It
        is generally understood to have a smaller enterprise sales and services footprint than AWS
        or Azure, which shows up in practice as GCP being a more common choice for
        data-and-ML-heavy startups and less common as a default for large legacy enterprises
        migrating from on-premises infrastructure — though that gap is not a fixed rule, just a
        general pattern in how the three are typically discussed.
      </p>
      <p>
        It's worth naming the risk of over-indexing on any one provider's origin story, including
        this one. "Google built it for itself, so it must be technically best" is a marketing
        narrative as much as an engineering conclusion — GCP's Kubernetes lineage explains why the
        service exists and why Google's engineers have deep institutional familiarity with the
        underlying orchestration model, not that a workload automatically runs better on GCP than
        on a mature managed Kubernetes offering from another hyperscaler. Lineage explains
        positioning; it doesn't substitute for checking a specific service's actual current
        maturity, which is exactly the first item in the decision checklist covered in the
        companion guide.
      </p>

      <h2 id="second-tier">5. The specialized second tier</h2>
      <p>
        Below the three hyperscalers sits a set of providers that don't compete on the same
        breadth of catalog or global footprint, but that hold real, specific positions worth
        understanding on their own terms rather than as "smaller AWS."
      </p>
      <p>
        <b>Oracle Cloud Infrastructure (OCI)</b> is generally positioned around Oracle's own
        database products — organizations already running Oracle Database, especially in
        situations where the database itself is a long-term, deeply embedded commitment, are
        OCI's clearest audience, and Oracle has generally marketed OCI heavily toward
        enterprise migration deals for exactly that installed base. It is not generally viewed as
        a first choice for greenfield workloads with no existing Oracle relationship.
      </p>
      <p>
        <b>IBM Cloud</b> occupies an adjacent but distinct position, generally associated with
        enterprise customers who have long-standing IBM relationships — including, in some cases,
        mainframe systems IBM has supported for decades — and who value IBM's enterprise support
        and consulting relationship as much as the cloud platform itself. It's a smaller player by
        general market visibility than the three hyperscalers, with a customer base that skews
        toward organizations already deep in IBM's broader enterprise technology and services
        ecosystem.
      </p>
      <p>
        <b>Alibaba Cloud</b> holds a position the other providers on this list don't: it's
        generally regarded as the dominant cloud provider within China specifically, and it has a
        broader presence across other parts of Asia as well. For an organization with a genuine
        operational or customer presence in China, Alibaba Cloud is frequently the practical
        default given China's specific regulatory environment for data and internet
        infrastructure — a consideration that simply doesn't apply to organizations without that
        footprint, which is exactly why it's easy to overlook Alibaba Cloud entirely from outside
        that market and equally easy to underrate it from inside that market.
      </p>

      <h2 id="developer-focused">6. Developer-focused, simplicity-first providers</h2>
      <p>
        A separate category of provider — DigitalOcean and Linode (now part of Akamai) are the
        most commonly cited examples — competes on a fundamentally different axis than the
        hyperscalers: a smaller, more curated set of products, pricing that's generally described
        as simpler and easier to reason about up front, and a console and documentation set that's
        widely regarded as friendlier to a small team or an individual developer who doesn't want
        to learn a large, general-purpose cloud platform just to run a straightforward
        application.
      </p>
      <p>
        These providers are generally not trying to compete with AWS, Azure, or GCP on the number
        of managed services offered, and that's the point rather than a shortcoming — a small team
        running a handful of virtual machines, a managed database, and object storage for a
        conventional web application often has no real use for a hyperscaler's deeper catalog, and
        pays in complexity for services it will never touch. This category is generally a strong
        fit for smaller teams, straightforward workloads without exotic managed-service
        requirements, and teams that want to get infrastructure running quickly without a
        dedicated cloud-infrastructure specialist on staff.
      </p>

      <h2 id="edge-first">7. Edge and CDN-first platforms</h2>
      <p>
        A newer category of provider started at the network edge — content delivery, DDoS
        protection, edge caching — and has since grown outward into general-purpose compute.
        Cloudflare is the clearest example, with its Workers platform letting developers run code
        directly at edge locations close to end users rather than in a small number of centralized
        regions; Fly.io occupies an adjacent space, focused on running full applications (not just
        edge functions) distributed close to users globally. Both are generally positioned around
        low-latency, globally distributed deployment as the default rather than an afterthought,
        which is a meaningfully different starting assumption than a traditional region-based
        hyperscaler deployment.
      </p>
      <div className="card">
        <p style={{ marginBottom: 0 }}>
          <b>Disclosed example:</b> this site, Merit AC, runs partly on Cloudflare Workers and
          partly on Fly.io. We're naming that here as a real, working example of what an
          edge-first deployment actually looks like in practice — not as an endorsement dressed up
          as objectivity. Your workload's fit with either platform depends on the same factors
          covered in section 8, not on what we happen to use.
        </p>
      </div>
      <p>
        This category tends to fit workloads where latency to a geographically distributed user
        base is a first-order concern, or where a team wants a simpler deployment model than
        managing infrastructure across several traditional regions directly. It's generally a
        poorer fit for workloads with deep dependencies on a large catalog of traditional managed
        services — a heavyweight relational database with complex operational requirements, for
        instance — since that isn't what these platforms are built around.
      </p>

      <h2 id="decision-factors">8. What actually drives a choice</h2>
      <p>
        Setting the categories aside, the factors that should actually drive a provider decision
        are the same regardless of which provider ends up winning:
      </p>
      <ul>
        <li>
          <b>Existing team expertise and hiring pool.</b> A team that already knows a provider's
          console, CLI, and IAM model deeply is more productive on day one than the same team
          learning a "better" provider from scratch — and the local hiring market's familiarity
          with a given provider is a real, ongoing cost or benefit, not a one-time consideration.
        </li>
        <li>
          <b>Which specific managed services the workload actually needs.</b> A workload with a
          genuine, specific dependency — a particular database engine, a particular
          machine-learning accelerator, a particular queuing service — should generally go where
          that service is mature, not where the rest of the stack happens to already live.
        </li>
        <li>
          <b>Data-residency and compliance requirements.</b> Some providers have a stronger or
          more certified regional presence in specific jurisdictions than others; when a
          regulatory requirement is genuinely non-negotiable, it can rule providers out before any
          other factor gets considered.
        </li>
        <li>
          <b>Existing organizational relationships and contracts.</b> An enterprise licensing
          agreement, a negotiated committed-spend contract, or a long-standing vendor relationship
          creates real switching costs and real leverage that exist independently of which
          platform is technically preferable in the abstract.
        </li>
      </ul>
      <p>
        None of these four factors is individually decisive in every case, and they sometimes
        point in different directions for the same decision — a compliance requirement might
        favor one provider while the team's existing expertise favors another. When that happens,
        the resolution isn't a formula that spits out a single correct answer; it's an honest
        conversation about which factor actually carries more risk if it's wrong. A compliance
        miss can be an existential problem. A team spending an extra few weeks ramping up on an
        unfamiliar console usually isn't. Weigh accordingly rather than averaging the factors as
        if they were equally consequential.
      </p>

      <h2 id="wrong-question">9. Why "which is best" is the wrong question</h2>
      <p>
        Every section above describes tradeoffs, not a ranking, because there isn't a ranking to
        give honestly. AWS's breadth is a genuine advantage for a team that wants maximum
        flexibility and a genuine liability for a small team that just wanted three services and a
        working deployment by Friday. Azure's Microsoft integration is decisive for an
        organization already running on that stack and irrelevant to one that isn't. GCP's
        data-and-Kubernetes strength matters enormously for an analytics-heavy workload and not at
        all for a workload that never touches either. None of that is a hedge — it's the actual
        shape of the decision.
      </p>
      <p>
        The useful question isn't "which cloud is best," it's "which provider's tradeoffs fit this
        specific workload and this specific team" — and because workloads and teams genuinely
        differ, that answer legitimately differs too. A guide that claimed otherwise would be
        selling something. For a structured way to work through that question for your own
        situation, see{" "}
        <a href="/cloud-architecture/choosing-a-cloud-provider">
          Choosing a cloud provider: a decision framework
        </a>
        , and for the specific question of running across more than one provider at once, see{" "}
        <a href="/cloud-architecture/multi-cloud-and-hybrid-cloud-architecture">
          Multi-cloud and hybrid cloud architecture
        </a>
        .
      </p>
    </ContentLayout>
  );
}
