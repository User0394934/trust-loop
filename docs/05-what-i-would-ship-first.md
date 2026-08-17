# What I would ship first

Six workflows is a portfolio, not a roadmap. If someone handed me this problem and one engineer, here is the order I
would go in and why. The reasoning matters more than the order. Argue with it.

---

## 1. Replay Cassette: deterministic replay

**Why first:** it is the dependency. Every other item on this list is a feature you evaluate by running it repeatedly,
and today running things repeatedly costs money and returns different answers. Build this and the cost of every
subsequent experiment drops to roughly zero. Skip it and everything downstream is throttled by a token budget.

**Smallest shippable version:** record and replay for one provider, keyed on the canonical request hash, tape in
Postgres, an explicit re-record flag. No TTL, no coverage report, no UI beyond a toggle.

**How I would know it worked:** share of eval runs served from tape. If that number is not above 80% within a month of
a team adopting it, the hashing is too strict and I have got the canonicalisation wrong.

## 2. Silent Success Detector: the failure class nobody instruments

**Why second:** it is the only item here that addresses a failure people are already suffering and cannot currently
see. Errors and latency are monitored everywhere. "Completed successfully, output quietly wrong" is monitored nowhere,
and it is the one that reaches a customer.

**Smallest shippable version:** for any AI node with an output parser attached, record the output's shape and a couple
of cheap distribution statistics per execution. Alert when today's distribution diverges from the trailing baseline. No
semantic comparison, no LLM-as-judge, just shape and distribution, because those are cheap and catch a surprising
share of it.

**How I would know it worked:** incidents where the first signal came from this rather than from a customer complaint.
That is a hard metric to move and an honest one.

## 3. Determinism Advisor: placement, not correctness

**Why third and not first:** it is the idea I like most, and I am deliberately not putting it first. It is advisory:
it changes behaviour by persuasion, and persuasion features are easy to ship and easy to ignore. Items 1 and 2 change
what is *possible*. This changes what people *choose*. Both matter, but capability before advice.

**Smallest shippable version:** five signals derived from data n8n already stores (node type for blast radius, write
versus read for reversibility, execution count, token cost, output-parser presence for output shape) plus one
user-declared signal for whether the step needs judgement. One recommendation per AI node, dismissible, with the
reasoning shown.

**How I would know it worked:** share of flagged AI Agent nodes removed or replaced within 30 days. Not
recommendations generated. If people read it and change nothing, it failed.

## 4. Regret Log: make human-in-the-loop earn its place

**Why fourth:** approval gates are the most common trust mechanism and the least examined one. Measuring override rate
is cheap, and the finding is usually uncomfortable in a useful way: most gates turn out to be theatre, and one or two
turn out to be places the model should never have been.

**Smallest shippable version:** log every approval decision with the AI's proposal, the human's final action, and
whether they differed. Report override rate per workflow. Do not auto-tune thresholds yet. Show the number first and
let a human decide, because a tool that silently lowers your safety gates will be turned off the first time it is
wrong.

**How I would know it worked:** reduction in approval-queue volume with no increase in bad outcomes. Both halves
required; the first alone is just removing oversight.

## 5. Skill Extractor: discovery over guesswork

**Why fifth:** highest ceiling, longest lead time. It needs a corpus of workflow structures and a privacy story before
it can produce anything, and the payoff is a better template library rather than a fixed incident. Genuinely valuable,
genuinely not urgent.

**Smallest shippable version:** an internal report for the product team, not a user-facing feature. Top ten
sub-shapes rebuilt by three or more independent builders this month. Read it for a quarter before shipping anything
based on it.

## 6. Trust Ledger: the one that is a business decision, not a feature

**Why last, and why it might be first:** this is the only item on the list that is not really mine to sequence. Putting
public grades on community templates changes the relationship with the people who wrote them, and a template author
who wakes up to a D on their most-installed workflow is entitled to be upset. That is a leadership call about
ecosystem strategy, not a prioritisation call about engineering effort.

If the answer is yes, it is the most defensible item here, because only the platform can compute it. Only n8n sees
executions across every install of every template. If the answer is no, it should not be built at all, and building it
quietly first would be the wrong way to find out.

**The one rule I would insist on if it does get built:** a template with no evals is capped at 49 out of 100 regardless
of install count. Popularity is not evidence. That cap is the entire mechanism: it is how you get a large community to
adopt eval practice without writing a single document arguing that they should.

---

## What I deliberately left off

**LLM-as-judge scoring for output quality.** It is the obvious next thing and I do not trust it yet as a gate. It is
useful for triage and directional signal; it is not the kind of evidence I would put in front of an auditor, and I have
seen judge models drift without anyone noticing. I would ship it clearly labelled as advisory, never as a pass/fail.

**A visual eval-authoring UI.** Attractive, and it solves the wrong problem. The reason people do not write evals is
not that authoring is hard, it is that running them is expensive. Fix the cost first, then find out whether authoring
was ever the bottleneck.

**Prompt version control.** Real problem, but git already exists and a worse in-product version would just fragment
where the truth lives.
