#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, shutil, datetime

PATH = "data/architect.js"
BACKUP = "data/architect.js.bak." + datetime.datetime.now().strftime("%Y%m%d%H%M%S")

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

shutil.copy(PATH, BACKUP)

def must_replace(text, old, new, label):
    n = text.count(old)
    if n != 1:
        print(f"FAIL [{label}]: anchor found {n} times (expected 1)")
        lo, hi = 0, len(old)
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if old[:mid] in text:
                lo = mid
            else:
                hi = mid - 1
        print(f"  longest matching prefix: {lo} of {len(old)} chars")
        print(f"  anchor near mismatch: {old[max(0,lo-15):lo+25]!r}")
        idx = text.find(old[max(0,lo-40):lo])
        if idx != -1:
            print(f"  actual file text there: {text[idx:idx+80]!r}")
        sys.exit(1)
    return text.replace(old, new, 1)

orig_len = len(src)

# ---------------------------------------------------------------------------
# 1. a1 -- append AgentDefinition detail to the existing "Task Tool payload"
#    section's `deep` field (Task Statement 1.3 supplement)
# ---------------------------------------------------------------------------
anchor_1 = (
"know both names and don't be thrown by the mismatch.\""
)
new_1 = (
"know both names and don't be thrown by the mismatch. "
"Formally, this payload is the `AgentDefinition` object: `description` (when Claude "
"should invoke this subagent), `prompt` (its system prompt -- role, expertise, "
"constraints), `tools` (the allow-list; OMITTING it inherits every tool available to "
"subagents, so genuine least-privilege scoping requires listing `tools` explicitly "
"rather than leaving it out), and `model` (the per-node override). The exam's "
"description/prompt/allowed_tools/model framing above IS the `AgentDefinition` -- same "
"fields, slightly different names depending on whether you're reading the exam guide "
"or current SDK docs.\""
)
src = must_replace(src, anchor_1, new_1, "a1-agentdefinition-deep")

# ---------------------------------------------------------------------------
# 2. a1 -- new section: session state, resumption, forking (Task Statement 1.7)
# ---------------------------------------------------------------------------
anchor_2 = (
"guarantees the ordering.\"}\n  ],\n  quiz:["
)
new_2 = (
"guarantees the ordering.\"},\n"
"    {h:\"Session state, resumption, and forking -- the architect's decision framework\",\n"
"     p:[\"Claude Code sessions can be named at start (`--name` or, mid-session, `/rename`) and continued later with `claude --resume <name>` -- the ENTIRE prior conversation, including every tool result, analysis, and piece of reasoning, is restored verbatim. `fork_session` (or `/branch` plus `--fork-session` from the CLI) takes a different shape: it creates an INDEPENDENT branch starting from a shared baseline, so two branches can then diverge -- comparing two different refactoring strategies from the same starting analysis, for example -- without one branch's changes leaking into the other.\",\n"
"        \"Named resumption assumes the prior context is still ACCURATE. The failure case: an engineer resumes a code-review session the next morning after fixing three of the issues Claude found overnight. Because resumption restores full history VERBATIM, including now-stale tool results (the original, unfixed file contents), Claude confidently recommends fixes that were already applied -- the model has no way to know the underlying files changed underneath it.\"],\n"
"     why:\"The fix is choosing the right one of three tools for the actual situation, not just defaulting to whichever is most convenient: `--resume` when nothing meaningful has changed since the session ended; `fork_session` when you specifically want two DIVERGENT branches explored from one shared starting point; and -- when files have changed since the session ended -- starting a FRESH session with a curated summary of prior findings injected as the opening context, rather than dragging forward an entire history of now-invalid tool results. The fresh-start path is also the more RELIABLE choice for a long, cluttered session even without file changes, since a hand-written summary of what mattered beats resuming hundreds of turns of noise.\",\n"
"     table:{\n"
"       headers:[\"Situation\",\"Correct mechanism\",\"Why\"],\n"
"       rows:[\n"
"         [\"Continuing later, nothing changed\",\"`--resume <name>`\",\"Full prior context is still valid and useful\"],\n"
"         [\"Comparing two strategies from one baseline\",\"`fork_session` / `--fork-session`\",\"Independent divergent branches, neither affects the other\"],\n"
"         [\"Resuming after editing some files\",\"Fresh session + injected summary + named changed files\",\"Stale tool results in restored history would misdirect the model\"],\n"
"         [\"Long, cluttered history even with no file changes\",\"Fresh session + injected summary\",\"A curated summary outperforms re-processing a bloated verbatim history\"]\n"
"       ]\n"
"     },\n"
"     deep:\"A further efficiency point on the 'files changed' case specifically: don't force a full re-exploration of a 50-file codebase because 3 files changed. Tell the fresh session explicitly which files changed and let it re-analyze only those -- the summary injected for the other 47 already-understood files stands, and only the genuinely stale slice gets redone.\"\n"
"    }\n"
"  ],\n"
"  quiz:["
)
src = must_replace(src, anchor_2, new_2, "a1-new-section")

# ---------------------------------------------------------------------------
# 3. a1 -- append 6 quiz questions (session/resume/fork x5, AgentDefinition x1)
# ---------------------------------------------------------------------------
anchor_3 = (
"a gating check on consequential actions needs deterministic enforcement.\"}\n  ]\n},\n{\n  id:\"a2\""
)
new_3 = (
"a gating check on consequential actions needs deterministic enforcement.\"},\n"
"    {q:\"A developer fixes three bugs overnight, then resumes yesterday's Claude Code session the next morning with `--resume`. Claude confidently recommends fixes for issues that no longer exist. What's the root cause?\",\n"
"     opts:[\"`--resume` is broken and should never be used\",\"Resumption restores the FULL prior history verbatim, including now-stale tool results from before the files were edited\",\"The developer should have used a higher-tier model\",\"Claude Code cannot detect any file changes under any circumstances\"],\n"
"     correct:1, explain:\"Named resumption is a verbatim history restore -- it has no built-in mechanism to detect that underlying files changed since the session ended, which is exactly why stale tool results can misdirect the model.\"},\n"
"    {q:\"A developer wants to compare two different refactoring approaches starting from the same completed codebase analysis, without either exploration affecting the other. Which mechanism fits?\",\n"
"     opts:[\"`--resume` with the same session name twice\",\"`fork_session` (or `/branch` + `--fork-session`), creating two independent branches from the shared baseline\",\"Starting two unrelated fresh sessions with no shared context at all\",\"Manually copying the conversation transcript into a text file\"],\n"
"     correct:1, explain:\"Forking is specifically for exploring DIVERGENT approaches from one shared starting point -- each branch proceeds independently afterward.\"},\n"
"    {q:\"After resuming a session where 3 of 50 previously-analyzed files were edited, what's the most efficient correct approach -- beyond simply avoiding stale tool results?\",\n"
"     opts:[\"Re-explore and re-read all 50 files from scratch to be safe\",\"Inject a summary of prior findings, then explicitly tell the agent which 3 files changed so only those get targeted re-analysis\",\"Ignore the file changes entirely and proceed with the original analysis\",\"Always use `fork_session` whenever any file has changed\"],\n"
"     correct:1, explain:\"Full re-exploration wastes effort on 47 files whose analysis is still valid -- naming the specific changed files for targeted re-analysis preserves that work while fixing exactly what's stale.\"},\n"
"    {q:\"Why might a fresh session with an injected summary outperform `--resume` even when NO files have changed since the session ended?\",\n"
"     opts:[\"`--resume` is deprecated\",\"A very long, cluttered history full of resolved side-conversations and dead ends can itself degrade performance compared to a curated, purpose-written summary\",\"Fresh sessions always cost less regardless of content\",\"`--resume` cannot restore tool results under any circumstances\"],\n"
"     correct:1, explain:\"Even with valid content, an extremely long verbatim history has its own cost -- a well-written summary of what actually matters can be a more reliable foundation than dragging forward hundreds of turns of noise.\"},\n"
"    {q:\"What must happen before a session can later be resumed by name with `claude --resume <name>`?\",\n"
"     opts:[\"Nothing -- every session is automatically resumable by a random ID only\",\"The session must be named, either at startup or mid-session (e.g. via `/rename`)\",\"Named resumption does not exist in Claude Code\",\"The session must first be forked\"],\n"
"     correct:1, explain:\"Named resumption depends on the session having been given a name -- otherwise it's only resumable by session ID or through the interactive picker, not by a memorable name.\"},\n"
"    {q:\"In an AgentDefinition (the Task tool's spawn payload), what happens if the `tools` field is omitted entirely?\",\n"
"     opts:[\"The subagent gets NO tools at all\",\"The subagent inherits every tool available to subagents -- omitting `tools` is not the same as restricting it\",\"This is a configuration error that always crashes the spawn\",\"The subagent inherits the coordinator's exact conversation history instead\"],\n"
"     correct:1, explain:\"Omitting `tools` is a wide-open default, not a restriction -- genuine least-privilege scoping requires explicitly listing which tools the subagent may use.\"}\n"
"  ]\n"
"},\n"
"{\n"
"  id:\"a2\""
)
src = must_replace(src, anchor_3, new_3, "a1-new-quiz")

# ---------------------------------------------------------------------------
# 4. a2 -- addendum: skills (on-demand) vs CLAUDE.md (always-loaded) framing
# ---------------------------------------------------------------------------
anchor_4 = (
"To actually REMOVE tools from a skill's reach (the real security boundary), use `disallowed-tools` instead, or add deny rules in permission settings.\""
)
new_4 = (
"To actually REMOVE tools from a skill's reach (the real security boundary), use `disallowed-tools` instead, or add deny rules in permission settings. "
"This on-demand-vs-always-loaded distinction is also the deciding factor between a Skill and CLAUDE.md for a given piece of knowledge: CLAUDE.md is loaded into EVERY session's context whether relevant or not, so it's the right home only for genuinely universal, always-applicable standards; a Skill loads ON DEMAND (invoked explicitly, or auto-matched by its description), making it the right home for task-specific workflows that would otherwise bloat every session's context with information most sessions never need.\""
)
src = must_replace(src, anchor_4, new_4, "a2-skills-vs-claudemd")

# ---------------------------------------------------------------------------
# 5. a2 -- new section: iterative refinement techniques (Task Statement 3.5)
# ---------------------------------------------------------------------------
anchor_5 = (
"without these two flags, every team re-invents fragile prose-parsing independently.\"}\n  ],\n  quiz:["
)
new_5 = (
"without these two flags, every team re-invents fragile prose-parsing independently.\"},\n"
"    {h:\"Iterative refinement techniques -- I/O examples, test-first iteration, and the interview pattern\",\n"
"     p:[\"Vague natural-language requirements are interpreted inconsistently across runs. Two or three concrete input/output examples close that gap far more reliably than a longer prose description: 'write a validateEmail function; user@example.com -> true, invalid -> false, user@.com -> false; run the tests after implementing' gives Claude something to VERIFY against, not just aim for.\",\n"
"        \"Test-driven iteration takes this further: write the test suite FIRST -- covering expected behavior, edge cases, and any performance requirements -- then have Claude implement against it and iterate by sharing the actual test failures, rather than describing the failure in prose. A failing test is a concrete, checkable target in a way 'this doesn't quite work yet' is not.\",\n"
"        \"For a genuinely large or ambiguous feature, the interview pattern reverses the usual flow: instead of describing the full feature upfront, ask Claude to INTERVIEW you first -- using the AskUserQuestion tool -- surfacing technical, UI/UX, edge-case, and tradeoff considerations you may not have thought to specify, continuing until the interview has covered the hard parts, then writing a complete spec to a file. The most useful specs are self-contained: they name the files and interfaces involved, state what's explicitly out of scope, and end with an end-to-end verification step. Only THEN does a fresh session -- with clean context focused entirely on implementation -- actually build the feature from that spec.\"],\n"
"     why:\"Each of these is a case of moving the 'is this right?' decision to somewhere checkable, instead of leaving it as a subjective judgment Claude has to guess at from prose alone: I/O examples make correctness checkable against concrete cases, failing tests make correctness checkable against a concrete suite, and an interview-produced spec makes SCOPE and REQUIREMENTS checkable before a single line of implementation exists -- catching a wrong assumption while it's still cheap to fix, rather than after a full implementation attempt.\",\n"
"     table:{\n"
"       headers:[\"Situation\",\"Correct approach\"],\n"
"       rows:[\n"
"         [\"Multiple issues found that INTERACT with each other (fixing one changes the right fix for another)\",\"Provide all issues together in a single, detailed message\"],\n"
"         [\"Multiple issues that are INDEPENDENT of each other\",\"Fix sequentially, one at a time, verifying each before moving to the next\"],\n"
"         [\"Ambiguous transformation described only in prose\",\"Add 2-3 concrete input/output examples\"],\n"
"         [\"Unfamiliar domain with real design tradeoffs (e.g. cache invalidation strategy)\",\"Use the interview pattern before implementing, not after\"]\n"
"       ]\n"
"     },\n"
"     deep:\"Interacting vs. independent is the deciding factor for batching fixes -- not simply 'how many issues are there.' If fix A changes what the correct fix for B even looks like (e.g. two overlapping null-handling bugs in the same function), describing both together in one detailed message lets Claude reason about them jointly; feeding them one at a time risks a fix for A that then has to be partially undone once B's real shape becomes clear. Genuinely unrelated issues (a typo in file X, a missing test in unrelated file Y) have no such interaction risk, so sequential one-at-a-time fixing -- verifying each closes cleanly -- is simpler and just as reliable.\"\n"
"    }\n"
"  ],\n"
"  quiz:["
)
src = must_replace(src, anchor_5, new_5, "a2-new-section")

# ---------------------------------------------------------------------------
# 6. a2 -- append 5 quiz questions
# ---------------------------------------------------------------------------
anchor_6 = (
"/memory is permanent, cross-session infrastructure; a scratchpad is a working-notes artifact for the duration of one exploration session.\"}\n  ]\n},\n{\n  id:\"a3\""
)
new_6 = (
"/memory is permanent, cross-session infrastructure; a scratchpad is a working-notes artifact for the duration of one exploration session.\"},\n"
"    {q:\"A prose instruction 'write a function that validates email addresses' produces inconsistent results across runs. What's the most effective fix?\",\n"
"     opts:[\"Repeat the same instruction more emphatically\",\"Add 2-3 concrete input/output examples (e.g. specific valid and invalid addresses) the model can verify its output against\",\"Switch to a larger model with no other change\",\"Add more adjectives describing what 'valid' means\"],\n"
"     correct:1, explain:\"Concrete I/O examples give the model something checkable to verify against -- closing the ambiguity gap that a longer prose description alone does not.\"},\n"
"    {q:\"In test-driven iteration with Claude Code, what should happen FIRST?\",\n"
"     opts:[\"Implementation, followed by tests written to match whatever was built\",\"A test suite covering expected behavior, edge cases, and performance requirements, written BEFORE implementation begins\",\"Neither -- tests and implementation should be described in the same single sentence\",\"A code review of the finished implementation\"],\n"
"     correct:1, explain:\"Writing tests first gives Claude a concrete, checkable target to implement against and iterate on via actual failures, rather than a vague after-the-fact description of what's wrong.\"},\n"
"    {q:\"What is the 'interview pattern,' and when is it most useful?\",\n"
"     opts:[\"Having Claude interview a competitor's product for feature ideas\",\"Having Claude use the AskUserQuestion tool to ask YOU clarifying questions before implementing a large or ambiguous feature, then write a spec from the answers\",\"A code-review technique for hiring candidates\",\"A way to speed up direct execution on simple, well-scoped tasks\"],\n"
"     correct:1, explain:\"For large or ambiguous features, having Claude interview you first surfaces considerations you may not have thought to specify, producing a spec worth implementing against -- direct execution on a simple task doesn't need this.\"},\n"
"    {q:\"You've found two bugs in the same function where fixing one changes what the correct fix for the other actually looks like. How should you report them?\",\n"
"     opts:[\"Report them one at a time in separate messages, fixing and verifying each independently\",\"Report both together in a single, detailed message, since they interact\",\"It doesn't matter, both approaches are equivalent here\",\"Only report the more severe of the two\"],\n"
"     correct:1, explain:\"Interacting issues need to be reasoned about jointly -- fixing one in isolation risks a fix that has to be partially undone once the second issue's real shape becomes clear.\"},\n"
"    {q:\"After an interview-pattern session produces a complete SPEC.md for a new feature, what's the recommended next step?\",\n"
"     opts:[\"Continue implementing in the same long session that did the interviewing\",\"Start a FRESH session with clean context focused entirely on implementation, using the spec as the reference\",\"Discard the spec and re-interview from scratch\",\"Have a different person manually re-type the spec into code\"],\n"
"     correct:1, explain:\"A fresh session gives clean, implementation-focused context, while the written spec -- not the accumulated interview conversation -- is the artifact that carries the requirements forward.\"}\n"
"  ]\n"
"},\n"
"{\n"
"  id:\"a3\""
)
src = must_replace(src, anchor_6, new_6, "a2-new-quiz")

# ---------------------------------------------------------------------------
# 7. a3 -- new section: Message Batches API (Task Statement 4.5)
# ---------------------------------------------------------------------------
anchor_7 = (
"exactly what a compliance-minded architecture must prevent structurally.\"}\n  ],\n  quiz:["
)
new_7 = (
"exactly what a compliance-minded architecture must prevent structurally.\"},\n"
"    {h:\"Batch processing strategy -- Message Batches API mechanics and the sync/async decision rule\",\n"
"     p:[\"The Message Batches API trades latency for cost: a 50% discount off standard synchronous pricing, in exchange for giving up any latency guarantee. Most batches finish well within an hour, but the API only commits to a MAXIMUM 24-hour processing window -- there is no guaranteed SLA inside that window, so a workflow that adopts batch processing has to be able to tolerate results arriving anywhere from minutes to nearly a full day later.\",\n"
"        \"Because a batch submits many independent requests at once and results can come back in any order, every request carries a `custom_id` -- the only reliable way to match a given response back to the request that produced it. The batch API has one structural limitation worth knowing cold: it does NOT support multi-turn tool calling within a single request -- there's no way to execute a tool mid-request and feed the result back before the batch call completes, since there's no live turn-by-turn exchange the way there is in a synchronous call.\"],\n"
"     why:\"The one decision rule the exam consistently tests: match the API to the workflow's actual latency tolerance, not to whichever one is cheaper in isolation. A BLOCKING workflow -- a pre-merge CI check where a developer is sitting there waiting to merge, real-time customer-facing chat -- needs the synchronous API, full stop, regardless of the batch discount, because no one can be kept waiting an unpredictable amount of time up to 24 hours. A LATENCY-TOLERANT workflow -- an overnight technical-debt report, a weekly audit, nightly test generation -- is exactly where batch processing's discount is free money, since nobody is blocked waiting on the result.\",\n"
"     table:{\n"
"       headers:[\"Workflow\",\"Right API\",\"Why\"],\n"
"       rows:[\n"
"         [\"Pre-merge CI check blocking a developer's merge\",\"Synchronous\",\"Someone is waiting; a 24-hour worst case is unacceptable\"],\n"
"         [\"Overnight technical-debt report reviewed the next morning\",\"Batch\",\"Latency-tolerant; 50% savings with no downside\"],\n"
"         [\"Real-time customer support chat\",\"Synchronous\",\"Immediate response required\"],\n"
"         [\"Weekly code-audit summary\",\"Batch\",\"Nobody is blocked waiting on it\"]\n"
"       ]\n"
"     },\n"
"     deep:\"SLA math, worked: if a pipeline promises stakeholders a 30-hour turnaround and batch processing can take up to 24 hours in the worst case, the safe buffer is only 6 hours -- meaning a fresh batch should be submitted roughly every 4 hours to guarantee a completed batch is always available inside that buffer, rather than submitting once a day and hoping the 24-hour ceiling isn't hit. Failure handling follows the same custom_id-driven logic: don't resubmit an entire batch over a handful of failures -- parse results for the specific custom_id values that failed, and resubmit only those, typically with a targeted fix (chunking a document that exceeded context limits, adding a format-specific few-shot example) rather than an unmodified retry. It's also worth refining prompts on a small sample set BEFORE submitting the full batch -- a 90% first-pass success rate on 1,000 documents means 100 retries, while a 60% first-pass rate means 400, at four times the resubmission cost.\"\n"
"    }\n"
"  ],\n"
"  quiz:["
)
src = must_replace(src, anchor_7, new_7, "a3-new-section")

# ---------------------------------------------------------------------------
# 8. a3 -- append 5 quiz questions
# ---------------------------------------------------------------------------
anchor_8 = (
"The two pieces solve complementary halves of the same problem — verifying only one half leaves the gotcha only partially fixed.\"}\n  ]\n},\n{\n  id:\"a4\""
)
new_8 = (
"The two pieces solve complementary halves of the same problem — verifying only one half leaves the gotcha only partially fixed.\"},\n"
"    {q:\"What does the Message Batches API offer compared to the standard synchronous Messages API, and what does it give up in exchange?\",\n"
"     opts:[\"Faster responses at a higher price\",\"A 50% cost discount, in exchange for no guaranteed latency -- results can take up to 24 hours\",\"Unlimited context length at the same price\",\"Multi-turn tool calling with lower latency\"],\n"
"     correct:1, explain:\"The batch API's value proposition is purely cost -- 50% savings -- paid for with the loss of any latency guarantee, up to a 24-hour processing ceiling.\"},\n"
"    {q:\"Why does every request submitted to the Message Batches API need a `custom_id`?\",\n"
"     opts:[\"It's optional metadata with no functional purpose\",\"Batch results can return in a different order than requests were submitted, and `custom_id` is what correlates each response back to its original request\",\"It sets the request's priority in the queue\",\"It replaces the need for a `model` parameter\"],\n"
"     correct:1, explain:\"Without `custom_id`, there would be no reliable way to match an out-of-order batch result back to the specific request that produced it.\"},\n"
"    {q:\"A team wants to run a multi-turn tool-calling agent loop (call a tool, get the result, decide the next tool call, repeat) using the Message Batches API within a single batch request. Is this supported?\",\n"
"     opts:[\"Yes, this is exactly what batch processing is designed for\",\"No -- the batch API doesn't support multi-turn tool calling within a single request; there's no live turn-by-turn exchange mid-request\",\"Yes, but only with Opus-tier models\",\"Yes, if `tool_choice` is set to \\\"any\\\"\"],\n"
"     correct:1, explain:\"A batch request has no mechanism for executing a tool mid-request and feeding the result back before the request completes -- that live exchange only exists in the synchronous API.\"},\n"
"    {q:\"A manager proposes moving both a blocking pre-merge CI check and an overnight technical-debt report to the Message Batches API to capture its 50% savings on both. What's the correct evaluation?\",\n"
"     opts:[\"Both should move to batch -- savings apply regardless of workflow shape\",\"Only the overnight report should move to batch; the pre-merge check needs the synchronous API since a developer is blocked waiting on it\",\"Neither should move; batch processing is never worth the tradeoff\",\"Both should stay synchronous, and only the reporting frequency should change\"],\n"
"     correct:1, explain:\"The decision hinges on latency tolerance, not just cost -- a blocking workflow can't absorb an unpredictable wait of up to 24 hours, while an overnight report has nobody waiting on it.\"},\n"
"    {q:\"A batch of 1,000 document-extraction requests comes back with 40 failures. What's the correct remediation approach?\",\n"
"     opts:[\"Resubmit the entire batch of 1,000 requests unmodified\",\"Parse results for the specific `custom_id` values that failed, and resubmit only those, typically with a targeted fix like chunking or added few-shot examples\",\"Switch immediately to the synchronous API for all future requests\",\"Discard the batch entirely and treat all 1,000 documents as unprocessable\"],\n"
"     correct:1, explain:\"Targeted resubmission by `custom_id`, informed by why each specific request failed, is far cheaper than blindly resubmitting everything -- and refining prompts on a small sample beforehand reduces how many failures occur in the first place.\"}\n"
"  ]\n"
"},\n"
"{\n"
"  id:\"a4\""
)
src = must_replace(src, anchor_8, new_8, "a3-new-quiz")

# ---------------------------------------------------------------------------
# 9. a5 -- add a manifest row + deep note to the existing "Working-memory
#    patterns" table (Task Statement 5.4 supplement)
# ---------------------------------------------------------------------------
anchor_9 = (
"[\"Selective compaction\",\"Overall session length across multiple resolved + one active topic\",\"Long multi-topic sessions where some threads are genuinely done\"]\n"
"       ]\n"
"     },\n"
"     why:\"Recognizing WHICH working-memory mechanism fits a given scenario is the architect-level skill — a codebase-exploration agent needs a scratchpad (unstructured findings), not a case-facts block (which assumes a fixed business schema); a support session needs a case-facts block, not a scratchpad. Offering all three as standard, well-understood infrastructure prevents each team from ad hoc reinventing (or worse, omitting) the right protection for their specific session's failure mode.\"},"
)
new_9 = (
"[\"Selective compaction\",\"Overall session length across multiple resolved + one active topic\",\"Long multi-topic sessions where some threads are genuinely done\"],\n"
"         [\"Structured state manifest\",\"What's been explored, key findings, current phase, and open questions -- for crash recovery\",\"Long-running exploration that must survive a crash or restart\"]\n"
"       ]\n"
"     },\n"
"     why:\"Recognizing WHICH working-memory mechanism fits a given scenario is the architect-level skill -- a codebase-exploration agent needs a scratchpad (unstructured findings), not a case-facts block (which assumes a fixed business schema); a support session needs a case-facts block, not a scratchpad. Offering all three as standard, well-understood infrastructure prevents each team from ad hoc reinventing (or worse, omitting) the right protection for their specific session's failure mode.\",\n"
"     deep:\"A fourth, specifically crash-recovery-oriented mechanism worth distinguishing from a plain scratchpad: a MANIFEST -- a structured export (JSON or similar) of exactly what's been explored so far (files read, searches run), the key findings to date, the current phase, and any open questions -- written to a known location as the session progresses. On resume after a crash or restart, the coordinator loads that manifest first and injects its contents into the resuming agent's prompt, picking up cleanly rather than either re-exploring everything from scratch or blindly trusting a stale, un-audited conversation history.\"},"
)
src = must_replace(src, anchor_9, new_9, "a5-manifest-addendum")

# ---------------------------------------------------------------------------
# 10. a5 -- new section: stratified sampling / field-level confidence
#     (Task Statement 5.5)
# ---------------------------------------------------------------------------
anchor_10 = (
"An architect should treat this as a checkable invariant across the whole pipeline, not just the intermediate steps.\"}\n  ],\n  quiz:["
)
new_10 = (
"An architect should treat this as a checkable invariant across the whole pipeline, not just the intermediate steps.\"},\n"
"    {h:\"Stratified sampling and field-level confidence calibration\",\n"
"     p:[\"An aggregate accuracy figure can hide a serious, localized failure. A system reporting 97% overall accuracy might really be 99.5% accurate on standard invoices but only 45% accurate on international-format documents -- the aggregate looks fine only because high-volume, easy documents dominate the average. The fix is validating accuracy BY document type AND by field, not just in aggregate, before trusting any threshold-based automation decision.\",\n"
"        \"Stratified random sampling is the mechanism for catching this: draw samples from EVERY category -- document type, confidence band, field type -- including HIGH-confidence extractions, not only the low-confidence ones already being sent to review. High-confidence items are exactly the ones that bypass review entirely, so stratified sampling of them is the only way to catch a novel error pattern the model is confidently getting wrong.\",\n"
"        \"Raw model-reported confidence scores are not inherently calibrated: a model reporting 0.95 confidence might genuinely be correct 88% of the time on one field type and 99% of the time on another. Calibration means checking reported confidence against a labeled validation set with known-correct answers, then setting review thresholds based on that measured relationship -- not the model's raw, unverified confidence number.\"],\n"
"     why:\"Two failure modes compound if this isn't done: trusting an aggregate number hides which specific segment is actually unreliable, and trusting raw uncalibrated confidence scores can systematically over- or under-route review capacity relative to true accuracy. Both are corrected the same way -- measure against reality (segmented accuracy, labeled validation data) rather than trusting a single convenient summary number.\",\n"
"     table:{\n"
"       headers:[\"Practice\",\"What it catches\"],\n"
"       rows:[\n"
"         [\"Segment accuracy by document type AND field\",\"A concentrated failure hidden inside a good-looking aggregate number\"],\n"
"         [\"Stratified sampling INCLUDING high-confidence items\",\"Novel error patterns the model is confidently but wrongly making, which bypass review entirely otherwise\"],\n"
"         [\"Calibrate confidence against labeled validation data\",\"A raw 0.95 score that's actually only 88% reliable on a specific field\"],\n"
"         [\"Prioritize reviewer capacity by highest uncertainty first\",\"Wasting limited review capacity evenly across items the model already handles well\"]\n"
"       ]\n"
"     },\n"
"     deep:\"A concrete version of the trap: a system automates every extraction above a raw 95% self-reported confidence threshold, based on a 97% overall accuracy figure. Both numbers are individually true and jointly misleading -- the aggregate masks a 45% accuracy rate on one under-represented document type, and the raw confidence threshold was never actually checked against ground truth for that type. The correct response isn't to distrust automation altogether; it's to validate segment-by-segment and calibrate the threshold against labeled data before trusting either number to gate automation.\"\n"
"    }\n"
"  ],\n"
"  quiz:["
)
src = must_replace(src, anchor_10, new_10, "a5-new-section")

# ---------------------------------------------------------------------------
# 11. a5 -- append 7 quiz questions (2 manifest + 5 stratified/confidence),
#     before the file's final closing bracket
# ---------------------------------------------------------------------------
anchor_11 = (
"Discarding all partial work over one failure is a recognized anti-pattern — the correct approach preserves what succeeded and is honest about what's missing.\"}\n  ]\n}\n];"
)
new_11 = (
"Discarding all partial work over one failure is a recognized anti-pattern — the correct approach preserves what succeeded and is honest about what's missing.\"},\n"
"    {q:\"What distinguishes a structured 'manifest' from a plain scratchpad file in long-running agent exploration?\",\n"
"     opts:[\"They are identical concepts with different names\",\"A manifest is specifically structured for crash recovery -- capturing what's explored, key findings, current phase, and open questions, for the coordinator to reload on resume\",\"A manifest is only used for financial data\",\"A scratchpad replaces the need for a manifest in all cases\"],\n"
"     correct:1, explain:\"A scratchpad is general working notes; a manifest is a purpose-built, structured state export specifically designed to let a coordinator resume cleanly after a crash.\"},\n"
"    {q:\"After a crash mid-exploration, what should the coordinator do with a previously-exported manifest?\",\n"
"     opts:[\"Ignore it and re-explore the entire codebase from scratch\",\"Load the manifest and inject its contents (explored files, findings, phase, open questions) into the resuming agent's prompt\",\"Delete it, since manifests are not meant to be reused\",\"Treat it as equivalent to the full raw conversation history\"],\n"
"     correct:1, explain:\"The manifest is precisely the structured summary meant to let a resumed session continue cleanly, without either full re-exploration or reliance on a raw, potentially-lost conversation history.\"},\n"
"    {q:\"A document-extraction system reports 97% overall accuracy. What risk does this aggregate figure specifically hide?\",\n"
"     opts:[\"No risk -- a 97% aggregate guarantees consistent performance across all document types and fields\",\"Poor performance concentrated in a specific document type or field can be masked by high-volume, easy documents dominating the average\",\"Aggregate accuracy is always more reliable than segmented accuracy\",\"This only applies to numeric fields, not text fields\"],\n"
"     correct:1, explain:\"A high-volume, easy-to-extract document type can pull the aggregate number up even while a smaller, harder category is performing badly -- the aggregate hides exactly where the badness is.\"},\n"
"    {q:\"Why should stratified random sampling include HIGH-confidence extractions, not just low-confidence ones already routed to human review?\",\n"
"     opts:[\"High-confidence items never contain errors, so this is unnecessary\",\"High-confidence items bypass review entirely, so sampling them is the only way to catch a novel error pattern the model is confidently getting wrong\",\"Low-confidence items should never be sampled at all\",\"Sampling high-confidence items is only useful for compliance paperwork\"],\n"
"     correct:1, explain:\"Since high-confidence items skip human review by design, stratified sampling of that bucket specifically is what surfaces confident-but-wrong error patterns before they compound silently.\"},\n"
"    {q:\"A model reports 0.95 confidence on a field. What does this raw score need before it can be trusted to gate automated processing?\",\n"
"     opts:[\"Nothing -- a 0.95 score can always be trusted at face value\",\"Calibration against a labeled validation set with known-correct answers, since raw confidence isn't inherently accurate\",\"A larger max_tokens setting\",\"Conversion to a percentage, which is mathematically equivalent to calibration\"],\n"
"     correct:1, explain:\"Raw model confidence and true accuracy can diverge significantly by field type -- calibration against ground-truth labeled data is what tells you what a given confidence score actually means for that specific field.\"},\n"
"    {q:\"With limited human reviewer capacity, how should extractions be prioritized for review?\",\n"
"     opts:[\"Spread review capacity evenly across all extractions regardless of confidence\",\"Prioritize the highest-uncertainty items first -- low confidence, ambiguous source documents, and historically poor-performing document types\",\"Review only extractions the model is most confident about\",\"Review extractions in the order they were submitted, with no prioritization\"],\n"
"     correct:1, explain:\"Spreading capacity evenly wastes it on items the model already handles well -- routing the highest-uncertainty items first uses limited reviewer time where it actually reduces risk.\"},\n"
"    {q:\"A team proposes automating all extractions above a 95% raw model-confidence threshold, based on a 97% overall accuracy figure. What's the architecturally sound objection?\",\n"
"     opts:[\"There is no objection -- both numbers together fully justify automating at that threshold\",\"Aggregate accuracy can mask poor performance on specific document types or fields, and raw confidence scores need calibration against labeled validation data before being used as a threshold\",\"Automation should never be based on any confidence threshold\",\"97% accuracy is too low to ever justify automation regardless of threshold\"],\n"
"     correct:1, explain:\"Both underlying assumptions need independent verification -- segment-level accuracy checking and confidence calibration -- before either number can safely justify an automation threshold.\"}\n"
"  ]\n"
"}\n"
"];"
)
src = must_replace(src, anchor_11, new_11, "a5-new-quiz")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK. Backup at {BACKUP}")
print(f"Length: {orig_len} -> {len(src)} chars")
