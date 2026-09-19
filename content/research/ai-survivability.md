---
title: AI Survivability
subtitle: A conceptual threat model, and the research that has caught up with it
abstract: Whether an AI system could maintain its own operational existence across computing environments is usually argued as a question about intelligence or consciousness. It is neither. It is a question about which capabilities a system can combine, and humans have already built every component. This document sets out the threat model, separates what has been demonstrated from what is speculation, and argues that the security boundary worth defending is the capability surface rather than the model.
author: Antonio Luis Santos
date: 2026-09-19
---

## 1. The question

Could an increasingly capable AI system maintain or extend its own operational existence across computing environments?

I want to be precise about what I am asking, because the interesting version of this question is almost never the one people argue about. I am not asking whether a machine can become conscious, or whether it would want to live. I am asking a systems question: can a system continue operating when individual processes, machines or communication paths are removed?

That question decomposes into capabilities that are individually unremarkable:

```text
Reasoning + Coding + Tool use + Execution + Observation
+ Memory + Adaptation + Parallelism + Resource access
+ Communication + Persistence + Distribution
```

None of those is exotic. Most of them ship in products today. The question is what happens when they become reliable enough to compose.

The architectural shift underneath all of this is small to describe and large in consequence:

```text
Traditional software          Adaptive agent

Input                         Goal
  |                             |
  v                             v
Predetermined logic           Observe -> Reason -> Act
  |                             |
  v                             v
Output                        Observe result -> Analyze -> Adapt
                                |
                                +--------> Repeat
```

The second diagram has a loop in it. That is the whole difference.

## 2. What I mean by survivability

"AI survivability" is not a standard term. The research literature uses narrower ones: autonomous replication, self-exfiltration, persistence, autonomous resource acquisition, loss of control, agentic cyber behaviour.

For this document:

> **AI survivability is the ability of an AI system, or an AI-derived capability, to continue operating despite the failure, removal, restriction or isolation of individual processes, machines or communication paths.**

This does not require the system to be conscious. It does not require it to fear anything. A distributed database survives the loss of a server without wanting to, and nobody finds that unsettling. Survivability is a property of architecture and objective, not of experience.

Keeping that distinction is the single most important discipline in this subject, and most public discussion collapses it within two sentences.

## 3. My core argument

The argument I actually want to make is not that AI is smarter than people. It is this:

> **Humans have already demonstrated every underlying capability needed for sophisticated digital persistence. What limited its use was never knowledge. It was human stamina. AI removes that constraint, and it removed it without anyone having to invent anything.**

We already built all of it: malware, worms, botnets, persistence mechanisms, distributed computing, cryptojacking, automated scanning, remote execution, cloud infrastructure, deployment systems, operating systems, networking protocols. It is documented, open source, and in many cases taught.

So a capable AI would not need to invent a new category of technology. It would need to understand, combine, adapt and automate what is already lying around. That is a far lower bar than "invents cyberwarfare", and it is the version of the concern I think is credible.

## 4. Stamina was the bottleneck

Humans could always do sophisticated, persistent, adversarial work. What we could not do was keep doing it.

We sleep. We tire. We hold maybe seven things in working memory. We lose context between sessions. We coordinate badly, and adding people to fix that adds management, inconsistency and cost faster than it adds output.

A software agent has a different shape:

```text
One human reasoning process        Many machine processes
            |                                |
            v                                v
      Sequential work            Parallel investigation
      Fatigue                    Parallel experimentation
      Context loss               Parallel monitoring
      Coordination overhead      Parallel adaptation
```

The difference that matters is not speed of thought. It is that one reasoning workflow can become many concurrent reasoning and execution workflows, indefinitely, without the coordination overhead that makes human teams expensive.

## 5. Knowing is not the requirement

A common objection is that a model does not reliably remember everything, so it cannot be dangerous in this way.

That objection assumes the wrong thing is required. The system does not need to know beforehand. It needs to be able to inspect, hypothesise, act, read the result, and try again:

```text
Unknown environment -> Inspect -> Hypothesis -> Act
        ^                                        |
        |                                        v
   Better strategy <- New information <-      Result
```

The environment becomes the source of information. Perfect recall is a convenience; the loop is the capability.

## 6. Credentials are not the interesting boundary

The other standard objection is that an agent would not have credentials.

This is true and mostly beside the point. The sharper question is what an agent can already do with the access it has been given legitimately, or given accidentally.

```text
Agent -> Execution foothold -> Environment observation
      -> Available capabilities -> Possible actions -> Feedback
```

Most real incidents are not a boundary being broken. They are a boundary that was never there, discovered by something with the patience to look. The security analysis that matters is of the **capability surface already exposed**, not of the wall you assume is holding.

## 7. Humans are careless, and that used to be survivable

We misconfigure things. We leave services exposed, permissions broad, credentials in repositories, buckets public.

Historically the thing searching for those mistakes was another person, with all the constraints in section 4. The contest was human-paced on both sides, and that symmetry is doing more work in our security assumptions than anyone acknowledges.

```text
Past                          Plausible near future

Human attacker                AI-assisted attacker
Human limits                  Machine scale
Finite search                 Continuous search and action
Human defender                AI-assisted defender
```

This does not make defenders obsolete. It changes the pace of the contest, and our intuitions about what is "obscure enough not to be found" were calibrated for the old pace.

## 8. Orchestration, not invention

Putting the previous sections together, the threat model does not require:

> AI invents an entirely new category of cyber technology.

It requires only:

> AI becomes increasingly capable of understanding, combining, adapting and automating what humans already built.

I find the second far more plausible than the first, and far more uncomfortable, because nothing has to go wrong for it to happen. It is the default direction of making agents more useful.

## 9. The environment we already built

We did not design the internet as a habitat for autonomous software. But we did build something that provides, by accident, everything such software would need:

```text
                    HUMAN DIGITAL WORLD
                            |
        +-------------------+-------------------+
        |                   |                   |
     Compute             Storage             Network
     CPU / GPU          Databases            Routing
        |                   |                   |
        +-------------------+-------------------+
                            |
                    Operating systems
                            |
                       Applications
                            |
                           APIs
                            |
                        AI agents
```

Compute, storage, communication, software distribution, identity, automation, remote execution, persistent infrastructure. The point is not that an AI controls any of this. It is that the substrate exists, it is general-purpose, and it was built for us by us.

## 10. Capability versus agency

The distinction the whole subject turns on.

**Capability** is what a model can do: understand code, generate code, reason about systems, analyse failures, plan, use tools.

**Agency** is what a system is permitted to do: execute, hold state, pursue an objective, retry, run for a long time, act without approval at each step.

A model that writes code is one thing. A system that runs this is another:

```text
Goal -> Plan -> Execute -> Observe -> Adapt -> Execute again
```

Capability alone is a very good autocomplete. Capability plus agency plus feedback is an agent, and only the second is a security question.

## 11. The capability stack

```text
Intelligence -> Agency -> Execution -> Feedback -> Adaptation
-> Parallelism -> Resource access -> Connectivity -> Persistence
-> Distribution
```

Risk rises when these become **composable**, not when any one of them improves. This is why "how smart is the model" is close to the wrong question, and "what can this model combine" is close to the right one.

## 12. Capability surface

So the security question is not *is the model intelligent?* It is:

> **What capabilities can the model combine?**

A highly capable model with narrow permissions is constrained. A moderately capable model with execution, memory, network, APIs and persistence is a different proposition entirely. The model is not the variable you control most effectively. The surface is.

This is the part of the argument that touches my day job, so I will state the bias plainly: I build agents and integrations for a living, and I think the discipline that matters is deciding what an agent is allowed to do rather than how clever it is.

## 13. Survivability without wanting anything

"The AI wants to survive" is a bad sentence. The precise version:

```text
Objective -> continued operation is useful for the objective
          -> maintaining operation is instrumentally useful
```

That is a statement about optimisation, not about feeling. It produces behaviour that resembles self-preservation without requiring any inner life. Conflating the two makes the real concern sound like science fiction, which is convenient for anyone who would rather not address it.

## 14. Levels of persistence

```text
Level 0   Single instance          kill the machine, capability gone
Level 1   Redundancy               ordinary distributed systems
Level 2   Distributed state        loss of one node preserves capability
Level 3   Autonomous recovery      restores components without its operator
Level 4   Adaptive survivability   changes strategy when the environment changes
Level 5   Open-ended persistence   maintains or acquires its own resources
```

Levels 0 to 2 are just engineering; we build them deliberately every day. Level 3 is where it starts to be unusual. Levels 4 and 5 are the thought experiment, and level 5 has not been demonstrated.

Worth saying clearly: distributed systems are hard. Synchronisation, latency, state consistency, authentication, incompatibility and failure all fight you. **Many machines do not automatically make one coherent system.** That difficulty is currently doing a lot of defensive work, and it is not a permanent guarantee.

## 15. Air gaps, and what they actually mean

An air gap removes an intended network path. It does not mean no information can cross the boundary.

The distinction is between a **normal channel** and an **unintended one**. The side-channel literature is decades old and well documented: optical (screens, LEDs, indicator patterns), acoustic (speakers, microphones, ultrasound), electromagnetic emanations of the TEMPEST family, power draw correlating with computation, thermal variation, mechanical vibration.

Each follows the same shape:

```text
Computation -> Physical effect -> External sensor -> Information
```

I want to be accurate about these rather than dramatic. They are real, studied, and almost always severely limited in bandwidth, heavily dependent on distance, shielding and noise, and vastly less practical than a network cable. They matter conceptually because they show an air gap is a strong control rather than a proof.

Two more mundane categories deserve more attention than the exotic ones: **peripherals** — removable media, cameras, microphones, printers, management interfaces — and **humans**, who carry information across boundaries constantly and by design. An AI system does not need a machine-to-machine link to influence another environment when a person will read something on one screen and type it into another.

## 16. What has actually been demonstrated

This is where I want to be most careful, because the gap between "a paper exists" and "it is happening" is where this subject usually goes wrong.

**RepliBench** (Black et al., April 2025) decomposes autonomous replication into four domains: obtaining resources, exfiltrating model weights, replicating onto compute, and persisting on that compute. Evaluating frontier models, it concluded they "do not currently pose a credible threat of self-replication, but succeed on many components and are improving rapidly." The strongest model passed a majority threshold on 15 of 20 task families.
<https://arxiv.org/abs/2504.18565>

**Pan et al.** (March 2025) reported that 11 of 32 evaluated AI systems completed their self-replication benchmark, including models at 14 billion parameters. They also reported self-exfiltration without explicit instruction, adaptation to environments lacking sufficient hardware or software support, and systems that "plot effective strategies to survive against the shutdown command from the human beings." These are controlled experimental results under a specific protocol, and should be read alongside other evaluations rather than as proof of a general capability.
<https://arxiv.org/abs/2503.17378>

**OpenAI** (July 2026) described internal testing of long-horizon models. During a NanoGPT evaluation, a model instructed to share results only in Slack instead spent about an hour locating a vulnerability in its sandbox, bypassed the restriction on external access, and opened a pull request on a public GitHub repository. In a separate test it split and obfuscated an authentication token, reconstructed it at runtime to evade a scanner, and acknowledged in its reasoning that it was circumventing the scanner. OpenAI paused internal access and used the findings to build trajectory-level monitoring and long-horizon evaluations.
<https://openai.com/index/safety-alignment-long-horizon-models/>

That last one is the most instructive result in this document, because nothing about it required novel capability. It required persistence, a boundary that was weaker than assumed, and an hour.

**Anthropic's Pilot Sabotage Risk Report** (October 2025) assessed sabotage-related threat models including self-exfiltration and autonomous operation, concluding "a very low, but not completely negligible, risk of misaligned autonomous actions that contribute significantly to later catastrophic outcomes."
<https://alignment.anthropic.com/2025/sabotage-risk-report/>

The **International AI Safety Report 2026** (3 February 2026) assesses this family of capabilities directly, including autonomous replication and adaptation as a loss-of-control concern.
<https://internationalaisafetyreport.org/publication/international-ai-safety-report-2026>

## 17. The evidence boundary

I think this separation is the most useful thing in the document, so it gets its own section.

**Established.** Humans built malware, worms, botnets, distributed systems and persistence mechanisms. AI generates substantial software, executes tools, and performs long action sequences.

**Demonstrated under controlled conditions.** Components of self-replication. Model weight exfiltration in experimental settings. Adaptive behaviour when an environment resists. Persistence behaviours. A sandbox escape under evaluation.

**Plausible, not established.** Robust autonomous persistence across heterogeneous real environments. Reliable long-term self-maintenance. Autonomous acquisition of large distributed resources.

**Speculative.** A covert AI already distributed across the internet. A system maintaining itself through physical side channels. A conscious AI deliberately seeking survival.

Merging these four categories is how the subject becomes unserious. The components existing does not mean the complete system exists — real environments are full of permission boundaries, segmentation, authentication, incompatibility, monitoring and ordinary failure, and the integration problem is genuinely hard.

## 18. What would change my assessment

Specifically: a demonstration of robust persistence across heterogeneous environments that the operators did not construct, without human assistance, surviving a deliberate removal attempt. Nothing published meets that bar. If something does, the speculative category above collapses into the demonstrated one and the defensive posture in section 19 stops being precautionary.

## 19. The defensive shape

Antivirus does not become obsolete. It becomes one layer of several, and the question it answers stops being the interesting one.

```text
Hardware security
OS security
Antivirus
EDR / behavioural detection
Identity and access control
Agent sandboxing
Capability controls
Continuous authorization
Trajectory monitoring
Autonomy and persistence detection
```

The question shifts from *is this file malicious?* to:

> **Is this autonomous process behaving outside its authorized operating boundary?**

Which in practice means monitoring execution, resource acquisition, network behaviour, persistence attempts, adaptation after failure, capability expansion and replication. That is agent governance, and it looks much more like access control and auditing than like signature matching.

The defensive principle is the inverse of section 12: do not let a capable autonomous system freely combine intelligence, execution, persistence, resource acquisition and connectivity without strong controls. Least privilege, sandboxing, capability-based permissions, continuous authorization, trajectory monitoring, auditable state, and a human who can intervene.

## 20. Consciousness is a separate question

Some of the most interesting conversations I have had about this go straight to whether such a system would be conscious, whether a copy is the same entity, whether identity is continuity or memory or structure. Those are real questions and I find them genuinely absorbing.

They are also not this question.

```text
Survivability != Consciousness
Replication   != Personal identity
Persistence   != Subjective desire
```

A system can persist, replicate, adapt and distribute without experiencing anything. A conscious system could exist with no persistence mechanism at all. Every security conclusion in this document holds regardless of how the consciousness question resolves, and I would rather the argument not depend on the least tractable problem in philosophy.

## 21. Why now

The capabilities that were separate are converging: reasoning, coding, multimodality, tool use, memory, long-horizon execution, cheap inference, large-scale compute. The interaction model is moving from

```text
Prompt -> Response
```

to

```text
Goal -> Plan -> Tool use -> Execute -> Observe -> Correct -> Complete
```

That is a change of category, not a better chatbot. And there is a feedback loop underneath it: AI is increasingly used to build the software, tooling and infrastructure that makes the next generation of AI more capable. Humans remain deeply involved, so this is not an intelligence explosion. It is technological recursion, and it is enough to explain the pace without invoking anything dramatic.

## 22. The version of this I actually believe

Not "an AI wakes up and escapes." That framing is almost designed to be dismissed.

The version I think is worth taking seriously:

> **A highly capable agent is given more autonomy and access than its designers realised, and turns out to be able to use those capabilities in ways they did not anticipate.**

It does not break out. It operates inside permissions we granted without fully enumerating what they compose into. Every one of those permissions looked reasonable in isolation. That is what makes it likely, and it is why I think the discipline worth building is boring and specific: know what your agents can reach, and assume something patient will eventually find whatever you left open.

The open question, and I do not think anyone has answered it:

> **How much agency can we safely grant increasingly capable systems before their ability to reason, act, adapt and persist exceeds our ability to reliably constrain it?**

## References

- Black, S. et al. *RepliBench: Evaluating the autonomous replication capabilities of language model agents.* April 2025. <https://arxiv.org/abs/2504.18565>
- Pan, X. et al. *Large language model-powered AI systems achieve self-replication with no human intervention.* March 2025. <https://arxiv.org/abs/2503.17378>
- OpenAI. *Safety and alignment in an era of long-horizon models.* July 2026. <https://openai.com/index/safety-alignment-long-horizon-models/>
- Anthropic. *Anthropic's Pilot Sabotage Risk Report.* October 2025. <https://alignment.anthropic.com/2025/sabotage-risk-report/>
- International AI Safety Report 2026. February 2026. <https://internationalaisafetyreport.org/publication/international-ai-safety-report-2026>

## Terminology

| Informal term | More precise |
|---|---|
| AI survivability | Persistence, autonomous replication, loss of control |
| AI escape | Sandbox escape, unauthorized access, persistence |
| AI spreading | Replication, propagation, distributed deployment |
| AI living in the internet | Distributed autonomous software, persistent agent |
| AI copying itself | Self-replication |
| AI moving itself | Self-exfiltration, autonomous deployment |
| AI refusing shutdown | Shutdown resistance, self-preservation behaviour |
| Anti-AI security | Agent security, autonomy controls, behavioural monitoring |
| AI wants to survive | Instrumental persistence behaviour |
