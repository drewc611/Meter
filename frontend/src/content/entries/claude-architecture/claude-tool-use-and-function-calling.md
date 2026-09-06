---
title: Claude tool use and function calling architecture
description: >-
  A design-level look at tool use with Claude — writing tool descriptions that
  actually work, parallel versus sequential calls, error contracts,
  authorization, and structured output.
kicker: Guide · architecture
lead: >-
  Tool use is the mechanism that lets Claude do more than talk — but the
  mechanism itself is simple. What separates a tool integration that works
  reliably from one that's a constant source of confusing model behavior is
  almost entirely design: how the tools are described, how failure is
  communicated back, and how authority is enforced independently of what the
  model asks for. This guide stays at that design level.
wide: true
tileMeta: >-
  Tool descriptions as an API contract, parallel vs. sequential calls, error
  design
---
## 1\. The mechanism

At a conceptual level, tool use has four moving parts. You describe the tools available to Claude as named, typed definitions — what each one does and what parameters it accepts. Given a task and the conversation so far, the model decides whether any tool is relevant and, if so, requests a call to a specific tool with specific argument values it has chosen. Your code — not the model — actually executes that call against the real system it targets. The result comes back to the model as part of the next turn, and the model incorporates it into whatever it says or does next.

The exact message format varies across tool-using APIs and versions, but the stable shape is the same one described in the companion guide on the agentic loop: a model turn that requests a named tool with structured input, and a following turn that supplies the result correlated to that specific request. Nothing in this guide depends on any one API's exact field names — what's true regardless of the specifics is that the model never touches the outside world directly. It only ever asks; your code decides whether and how to actually do it.

That last sentence is worth sitting with, because a lot of the rest of this guide is downstream of it. If the model only ever asks, then everything about whether the ask succeeds — whether it's well-specified, whether it's allowed, what happens when it fails — is entirely something your system designs, not something the model's capability determines on its own.

## 2\. Descriptions as a design surface

It's tempting to treat a tool's description as a formality — a sentence or two so the code is self-documenting, written quickly and rarely revisited. In practice, the description is the tool's entire interface to the model: it's the only information the model has about when the tool is appropriate, what its parameters mean, and how it differs from other tools that might look similar. A vague or ambiguous description doesn't produce a vague or ambiguous tool call — it produces a confident, well-formed call to the wrong tool, or to the right tool with the wrong arguments, because the model filled the gap the description left with its own best guess.

This is exactly the same discipline as writing a docstring for a function a colleague will call without reading its implementation. A colleague given `def process(data, mode)` with no further explanation will guess at what `mode` accepts and get it wrong some fraction of the time — not because they're careless, but because the interface didn't tell them enough to get it right. A model facing an equally underspecified tool definition is in the same position, except it can't ask a follow-up question in a hallway the way a colleague might; it has to commit to an argument value based on whatever the description and the surrounding conversation implied.

The failure shows up most often when two tools are genuinely similar but subtly different in scope — a common situation once a tool set grows past a handful of entries. A `search_customers(query)` tool and a `search_orders(query)` tool are easy for a model to conflate if their descriptions both just say "searches for records matching a query," because nothing in either description tells the model which one applies when a user asks about "the customer's recent purchase." A description that instead says exactly what the tool searches, what the query matches against (name and email, versus order ID and product name), and what it explicitly does _not_ cover, gives the model the information it needs to pick correctly — and gives a human reviewer of the tool call the same information, which matters when the review is happening after the fact from a log rather than in the moment.

> **Treat a tool description like a docstring aimed at a careful but literal-minded developer** who cannot see your code and cannot ask you a clarifying question mid-task: say what the tool does, what each parameter means and what values it accepts, what it returns, and — often the most load-bearing part — what it explicitly does not do, especially relative to any similarly named or similarly scoped tool nearby.

## 3\. Parallel vs. sequential calls

Some tasks require several tool calls that are genuinely independent of one another — none needs the others' results to proceed — and some require a real dependency chain, where one call's output is necessary input to the next. Treating these as the same case in either direction costs something real.

Serializing independent calls — running them one at a time, waiting for each result before issuing the next, when nothing about the second call actually depends on the first — costs latency for no benefit. Fetching this week's weather for three unrelated cities to answer "which of these three has the best forecast this weekend" doesn't need city two's result before requesting city three's; a harness that supports issuing multiple tool calls from a single model turn and executing them concurrently gets the answer in roughly the time of one call instead of three.

Going the other way — parallelizing calls that actually have a dependency — costs correctness, not just time, and is the more dangerous mistake of the two. If step two genuinely needs the output of step one (look up a customer's account ID, then use that ID to fetch their order history), executing both at once because the harness defaults to parallel execution means step two runs with a missing or stale argument. This isn't a hypothetical edge case; it's the default failure mode of any system that treats "the model requested two tool calls in one turn" as automatic permission to run them concurrently without checking whether one's input is actually the other's output.

In practice this means the harness — not the model, and not a blanket policy — needs a way to tell the two situations apart. Sometimes that's structural: if a tool call's arguments don't reference anything from another pending call's result, it's very likely independent. Sometimes it has to be explicit: a tool definition can make a dependency visible by requiring, as an argument, exactly the kind of value another tool produces as output (an order-lookup tool that requires a `customer_id` makes the dependency on a customer-lookup tool obvious from the type signature alone, without needing the model to say so in words).

## 4\. Error handling as part of the tool contract

What a tool returns when it fails matters as much as what it returns when it succeeds, and it's the part of tool design most likely to be treated as an afterthought — write the happy path carefully, let failures throw whatever the underlying library throws, move on. The cost of that shortcut lands on the model, which has to decide what to do next with nothing but an opaque error to go on.

An opaque failure — a raw stack trace, a bare `"Error: request failed"`, an HTTP status code with no further context — gives the model exactly one useful fact: something went wrong. It has no way to tell whether trying again is likely to help (a transient network issue), whether trying again with different arguments would help (invalid input, a permission scope that's too narrow, a resource that doesn't exist under that name), or whether the whole approach needs to change (the tool doesn't do what the model assumed it does). Faced with that uncertainty, a model will often do the least-wrong-looking thing, which is frequently to retry the identical call — the exact unproductive loop the stopping-condition design in the agentic loop guide has to exist to catch.

A structured, specific failure response changes what the model can do with the same situation. Compare a bare exception to a result that says, in effect, "invalid argument: `region` must be one of \['us-east-1', 'us-west-2', 'eu-west-1'\], got 'us-east'" — the second version gives the model an actionable correction it can apply on the very next call, and the difference between those two outcomes is entirely a design choice made once, in the tool's implementation, rather than something that has to be re-solved by the model at every failure.

```
# pseudocode — illustrative shape
# Opaque failure: the model has nothing to act on but "something broke."
def get_forecast(city):
    response = weather_api.fetch(city)   # raises on a bad city name
    return response.json()

# Structured failure: the model can correct its next call.
def get_forecast(city):
    if city not in KNOWN_CITIES:
        return {"error": "unknown_city", "message": f"'{city}' not recognized",
                "did_you_mean": closest_matches(city, KNOWN_CITIES)}
    response = weather_api.fetch(city)
    if not response.ok:
        return {"error": "upstream_unavailable", "retryable": True}
    return {"result": response.json()}
```

The distinction worth designing in deliberately is between a retryable failure (a transient upstream outage — trying again, maybe after a short delay, is reasonable) and a non-retryable one (an invalid argument, a resource that doesn't exist — retrying with the same arguments will never succeed, and only a different argument value or a different approach will). A tool contract that marks which kind of failure occurred saves the model from having to guess, and saves your stopping-condition logic from having to distinguish "an agent making steady progress through legitimate retries" from "an agent stuck retrying something that structurally cannot succeed" after the fact from the outside.

## 5\. Scoping and authorization

The model choosing to call a tool is not, by itself, authorization for that call to succeed — and treating a model's decision as sufficient authority is the same architectural mistake this site's [governed agentic DevSecOps guide](/guides/ten-disciplines-of-governed-agentic-devsecops#architecture-rule) describes as its foundational rule for coding agents specifically: keep reasoning separate from authority. The principle carries over unchanged to tool use generally, whatever the agent is actually for. A model can reason well about _what_ action would accomplish the task and still have no legitimate say over _whether_ that action is allowed to happen — those are different questions, decided by different code, and conflating them is how a well-behaved model making a reasonable-looking request ends up producing an unauthorized action.

Concretely, this means a tool's own implementation — not the model, and not the fact that the model was given the tool's definition at all — is what enforces scope. A `delete_file(path)` tool that will delete anything the underlying process's credentials can reach is delegating its authorization decision entirely to whatever the model happens to request, which means the tool's real permission boundary is "whatever the process can do," not "whatever the tool is supposed to do." The fix isn't better prompting that asks the model to only delete safe things — it's the tool itself checking the requested path against an allowed scope before acting, and refusing (with a structured, specific error, per the previous section) when the request falls outside it, regardless of how reasonable the model's stated justification for the request sounds.

This separation is also what makes tool descriptions (section 2) safe to write generously. Because the description's job is only to help the model choose and phrase a call correctly, not to serve as the actual security boundary, you're free to describe a tool's full intended capability clearly without worrying that a good description alone widens what the model can actually get away with — the tool's own enforcement code is what keeps the real boundary in place no matter how the request was phrased or reasoned about.

## 6\. Structured output vs. true tool use

A close relative of tool use is worth distinguishing explicitly, because the two get used interchangeably in casual conversation despite doing different jobs architecturally. True tool use exists to let the model trigger a real action with a real side effect in the world — send an email, write a row to a database, call an external API that changes something. Structured output uses the same tool-call-shaped mechanism purely to force the model's response into a specific, machine-parseable schema, with no side effect at all: the "tool" being called is really just a schema definition, and calling it doesn't do anything except produce data shaped the way you asked for.

The reason this distinction matters architecturally, not just semantically, is that the two cases have entirely different requirements around the concerns covered above. A structured- output "tool" that just extracts fields from a document into a fixed JSON shape needs none of the authorization enforcement from section 5 — there's no real action to authorize, only a formatting constraint — and its "error handling" is a validation check on the shape of the output, not a real-world failure mode like an upstream API timing out. Treating it with the full weight of a true action-taking tool's design requirements is wasted effort; treating a true action-taking tool as if it were just structured output — skipping authorization because "it's just calling a function" — is the opposite mistake, and the more dangerous one.

A useful test when a new tool is being designed: ask what happens in the world if the call executes with no further consequence you're tracking. If the honest answer is "nothing outside this conversation changes," it's structured output, and the design effort belongs in getting the schema right. If the honest answer involves a system, a record, or a person outside the model call being affected, it's true tool use, and everything in sections 2 through 5 of this guide applies to it in full.

## 7\. Worked example: revising a tool description

Take a concrete task: an internal support agent needs a tool that lets it look up a customer's subscription status to answer billing questions. A first draft, written quickly:

```
{
  "name": "get_customer_info",
  "description": "Gets information about a customer.",
  "parameters": {
    "id": "string"
  }
}
```

This is a real tool definition and it will work, in the sense that the model can call it and get a response back — but it under-specifies almost everything a model needs to use it well. "Information about a customer" doesn't say what fields come back, so the model can't predict whether the answer to "is this customer's plan active" is even in scope without calling it and finding out. "`id`: string" doesn't say what kind of ID — an account number, an email address, an internal database key — and if the support conversation the model is handling only has a customer's email on hand, the model is left guessing whether that's a valid input or whether it needs a different tool first to resolve an email into whatever ID this one actually wants. Nothing in the description distinguishes this tool from a hypothetical `get_customer_orders` or `get_customer_billing_history` that might exist alongside it.

A revised version closes each of those gaps directly:

```
{
  "name": "get_subscription_status",
  "description":
    "Looks up a customer's current subscription plan, billing status, and renewal date. " +
    "Does NOT return order history, support ticket history, or payment method details — " +
    "use get_order_history or get_payment_methods for those. " +
    "Returns an error if the customer has no active or past subscription on record.",
  "parameters": {
    "customer_email": {
      "type": "string",
      "description":
        "The customer's account email address, exactly as they use it to log in. " +
        "Not their support-ticket contact email if different — use the account email."
    }
  }
}
```

The rename from `get_customer_info` to `get_subscription_status` alone does real work — it tells the model what's actually inside without opening the definition. The explicit "does NOT return" list preempts exactly the tool-conflation failure from section 2: faced with a question about a customer's last order, the model now has a positive signal to look for a different tool instead of guessing that this one might cover it. Naming the parameter `customer_email` instead of the ambiguous `id`, and specifying which of a customer's several possible email addresses is meant, removes a guess the model previously had to make silently — and removes a class of wrong tool calls that would have looked plausible in a log (a syntactically valid call with a semantically wrong argument) but returned data for the wrong lookup path or failed with an unhelpful error.

None of these changes touch what the tool actually does under the hood — the implementation could be identical between the two versions. The revision changes model behavior entirely through the description and the parameter contract, which is the point this guide keeps returning to: for a model that only ever sees a tool through its definition, that definition_is_ the tool, as far as deciding when and how to use it is concerned.

For how these individual tool calls fit into a full agent loop — including where in the loop an approval gate belongs, and how tool-execution logs support the stopping-condition logic this guide's error-handling section leans on — see [Building agents with Claude: the agentic loop](/claude-architecture/building-agents-with-claude-the-agentic-loop).
