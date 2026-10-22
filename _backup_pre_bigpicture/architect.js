const DOMAINS_ARCH = [
 {
  "id": "a1",
  "title": "Agentic Architecture & Orchestration",
  "weight": "27%",
  "emoji": "🏛️",
  "intro": "The largest slice of the Architect exam. This domain covers the full mechanics of how agents actually work — the loop, the stop signal, hooks, multi-agent coordination — and then the architectural judgment of when and how to combine them into a real system.",
  "archHighlights": {
   "1": [
    "Coordinator responsibilities, decomposition, iterative refinement"
   ],
   "2": [
    "Task Tool payload, parallel spawning, model-per-node"
   ],
   "3": [
    "Goal-oriented delegation vs. procedural scripts"
   ],
   "4": [
    "Hooks, prerequisite gates, SubagentStart/Stop"
   ],
   "5": [
    "Hub-and-spoke, context isolation, tool boundaries"
   ],
   "6": [
    "Output normalization, structured intermediates"
   ],
   "7": [
    "Error propagation, local recovery, citation preservation"
   ],
   "8": [
    "Synthesis, session state, production blueprint"
   ]
  },
  "sections": [
   {
    "id": "messages-api-roles-blocks",
    "part": "a1-p1",
    "h": "The Messages API in one page — roles, content blocks, the system prompt, and why every request carries the whole conversation",
    "bridge": "Before any loop or hook, you need the one primitive everything rests on. What does a single request to the Messages API actually contain, who writes each piece, and why must it carry the whole conversation?",
    "diagram": {
     "kind": "layers",
     "title": "One request to the Messages API",
     "arrows": false,
     "layers": [
      {
       "t": "system (top-level)",
       "sub": "instructions and rules, not a message role",
       "tone": "hi",
       "tag": "your code"
      },
      {
       "t": "messages[0] role user",
       "sub": "text, image or tool_result blocks"
      },
      {
       "t": "messages[1] role assistant",
       "sub": "text and tool_use blocks, echoed back unchanged",
       "tone": "warn",
       "tag": "Claude"
      },
      {
       "t": "messages[2] role user",
       "sub": "final item sent must be a user turn"
      },
      {
       "t": "Stateless: resend the whole array every call",
       "sub": "anything left out, the model has never seen",
       "tone": "bad"
      }
     ]
    },
    "p": [
     "Every agent you will be asked about in the exam is built on one primitive: a single call to the Messages API. You send a `system` string, a `messages` array, and optionally `tools`. Claude returns one assistant message. That is all the 'agent' is until your code loops around it.",
     "There are exactly two roles inside `messages`: `user` and `assistant`. There is no `tool` role and no `system` role in the array. Instructions live in the top-level `system` field; tool outputs travel back inside a `user` message as `tool_result` content blocks.",
     "A message's `content` is either a plain string or a list of typed blocks: `text`, `image`, `tool_use` (assistant only), `tool_result` (user only). Roles must alternate in meaning: a user turn, then an assistant turn, then a user turn. The final message you send must be a user turn (unless you are deliberately prefilling).",
     "The API is stateless. Claude remembers nothing between calls; 'memory' is the history array you resend each time. Whatever you leave out of that array, the model has never seen."
    ],
    "why": "Most scorecard misses in agent design trace back to not knowing who sends what. If you know the roles and blocks cold, questions about stop_reason, tool_result placement, resumption, and context loss all become mechanical.",
    "table": {
     "headers": [
      "Piece",
      "Where it lives",
      "Who writes it",
      "Remember"
     ],
     "rows": [
      [
       "Instructions / persona / rules",
       "top-level `system`",
       "Your code",
       "Not a message; cached as a prefix"
      ],
      [
       "User request",
       "`messages[i]` role `user`, text block",
       "Your user / your code",
       "Must be the last item you send"
      ],
      [
       "Claude's reply and tool requests",
       "role `assistant`, text + `tool_use` blocks",
       "Claude",
       "Echo it back unchanged on the next call"
      ],
      [
       "Tool output",
       "role `user`, `tool_result` block",
       "Your code",
       "Matched by `tool_use_id`; there is no `tool` role"
      ],
      [
       "Memory",
       "the `messages` array itself",
       "Your code",
       "Dropped from the array = forgotten"
      ]
     ]
    },
    "deep": "Exam shortcut: if an answer choice says 'add a tool-role message' or 'tell Claude to remember it from last session' with no history resent, it is wrong. The correct fix is always to put the information into the system prompt or the messages array of the next request.",
    "code": "{\n  \"model\": \"claude-sonnet-4-6\",\n  \"system\": \"You are a refund-support agent. Never exceed $500 without escalation.\",\n  \"tools\": [ { \"name\": \"lookup_order\", \"description\": \"...\", \"input_schema\": { } } ],\n  \"messages\": [\n    { \"role\": \"user\", \"content\": \"Order 8841 arrived broken, refund me.\" }\n  ]\n}",
    "codeExplain": "One request: `system` holds the rules, `tools` declares what Claude may call, and `messages` holds the conversation so far, ending on a user turn. Nothing else is remembered between calls."
   },
   {
    "id": "tool-use-round-trip",
    "part": "a1-p1",
    "h": "Tool use on the wire — one complete round trip, annotated block by block",
    "bridge": "Now that you know roles and blocks, watch them work together. How does one tool call travel across the wire, and where do the tool_use id and tool_result meet?",
    "diagram": {
     "kind": "seq",
     "title": "One tool-use round trip",
     "actors": [
      {
       "t": "Your code"
      },
      {
       "t": "Claude",
       "tone": "hi"
      },
      {
       "t": "Real tool",
       "tone": "mute"
      }
     ],
     "rows": [
      {
       "f": 0,
       "t": 1,
       "text": "system + tools + messages (ends on user turn)"
      },
      {
       "f": 1,
       "t": 0,
       "text": "assistant: tool_use {id, name, input}, stop_reason tool_use",
       "dashed": true
      },
      {
       "note": "Claude runs nothing. Your code validates and executes.",
       "over": [
        0,
        1
       ],
       "tone": "warn"
      },
      {
       "f": 0,
       "t": 2,
       "text": "run the tool with input"
      },
      {
       "f": 2,
       "t": 0,
       "text": "output (or error)",
       "dashed": true
      },
      {
       "f": 0,
       "t": 1,
       "text": "history + assistant echo + user tool_result {tool_use_id, is_error?}"
      },
      {
       "f": 1,
       "t": 0,
       "text": "more tool_use, or text with stop_reason end_turn",
       "dashed": true
      }
     ]
    },
    "p": [
     "Walk one tool call end to end. Your request goes out with `tools`. Claude answers with an assistant message whose `stop_reason` is `tool_use` and whose content holds a `tool_use` block: an `id`, the tool `name`, and an `input` object that follows your schema.",
     "Claude does not run anything. Your code (or an SDK runner) executes the tool, then sends the NEXT request: the same history, plus Claude's assistant message echoed back exactly, plus a new user message containing a `tool_result` block whose `tool_use_id` equals the `id` Claude produced.",
     "The pair is atomic: every `tool_use` needs a `tool_result` in the very next user message, with matching ids, or the API rejects the request. If Claude emitted three parallel `tool_use` blocks, the next user message must carry three `tool_result` blocks, in one message.",
     "On failure, you still return a `tool_result`, with `is_error: true` and a message the model can act on. Skipping the result is not an option. The loop ends when `stop_reason` is `end_turn` (the answer), not when Claude 'sounds done'."
    ],
    "why": "This is the agentic loop with the abstraction removed. Termination, error handling, parallel tool calls, hooks, and resumption questions are all questions about this one exchange.",
    "analogy": "Claude is a customer filling in an order slip; your code is the kitchen. Claude writes the slip (tool_use) and waits; the kitchen cooks and returns a plate tagged with the slip number (tool_result). A plate with the wrong number, or no plate, stops the service.",
    "table": {
     "headers": [
      "Step",
      "Direction",
      "What is in it"
     ],
     "rows": [
      [
       "1",
       "You → Claude",
       "system + tools + messages (ends on user turn)"
      ],
      [
       "2",
       "Claude → You",
       "assistant message: text? + tool_use {id, name, input}; stop_reason = tool_use"
      ],
      [
       "3",
       "Your code",
       "Validate, run hooks, execute the tool"
      ],
      [
       "4",
       "You → Claude",
       "history + assistant echo + user message with tool_result {tool_use_id, content, is_error?}"
      ],
      [
       "5",
       "Claude → You",
       "More tool_use (repeat from 3) or final text with stop_reason = end_turn"
      ]
     ]
    },
    "deep": "Common trap: putting the tool_result in an assistant message, or in a message after another user message (two consecutive user turns). Another: dropping the assistant `tool_use` message when rebuilding history after truncation, which orphans the result and fails the call.",
    "code": "// Claude -> you\n{ \"role\":\"assistant\", \"stop_reason\":\"tool_use\", \"content\":[\n  {\"type\":\"text\",\"text\":\"Let me look that up.\"},\n  {\"type\":\"tool_use\",\"id\":\"toolu_01A\",\"name\":\"lookup_order\",\"input\":{\"order_id\":\"8841\"}} ] }\n\n// you -> Claude (next request appends this user turn)\n{ \"role\":\"user\", \"content\":[\n  {\"type\":\"tool_result\",\"tool_use_id\":\"toolu_01A\",\"content\":\"{\\\"status\\\":\\\"delivered\\\",\\\"total\\\":120}\"} ] }",
    "codeExplain": "The id on the tool_use is echoed in tool_use_id. The result lives in a user-role message. Claude then continues from this history and either calls another tool or ends the turn."
   },
   {
    "id": "workflow-vs-agent",
    "part": "a1-p1",
    "legacy": 0,
    "h": "Workflow vs. agent — the foundational decision",
    "bridge": "You have seen one round trip; the next question is who decides what happens after it. Do you hard-wire the order of steps yourself, or hand that decision to Claude in a loop?",
    "diagram": {
     "kind": "compare",
     "title": "Who decides the next step?",
     "left": {
      "title": "Workflow",
      "tone": "hi",
      "items": [
       "Your code fixes the order of steps in advance",
       "Claude fills in each step",
       "Cheaper, predictable, easy to test",
       "Test: you could draw the flowchart first"
      ]
     },
     "right": {
      "title": "Agent",
      "tone": "warn",
      "items": [
       "Claude decides what to do next, in a loop",
       "Adjusts based on what it finds",
       "Needed when the path depends on discoveries",
       "Using one for a workflow adds cost and detours"
      ]
     },
     "verdict": "Could you draw it as a flowchart before starting? Yes: workflow. It depends what we find: agent."
    },
    "p": [
     "A workflow is a fixed recipe: YOUR code decides the exact steps in advance, and Claude fills in each step, but your code decides the order. An agent is different: Claude looks at what's happening and decides what to do next, in a loop, adjusting based on what it finds — nobody wrote the exact steps in advance because they couldn't be known in advance."
    ],
    "why": "Ask yourself: 'could I draw this as a flowchart before I even start?' If yes, use a workflow — cheaper, predictable, easy to test. If the honest answer is 'it depends what we find out partway through,' you need an agent. A common mistake is using an agent for what's actually a workflow — it gets more expensive, harder to test, and takes weird detours for no benefit, because the task never needed that flexibility.",
    "analogy": "A workflow is a recipe: crack 2 eggs, add flour, mix, bake 30 minutes — always the same steps. An agent is a detective: they can't know which clue leads to which next clue in advance — they must look at each piece of evidence and decide what to investigate next."
   },
   {
    "id": "agentic-loop-mechanics",
    "part": "a1-p1",
    "legacy": 1,
    "h": "The agentic loop, mechanically: stop_reason is the only reliable signal",
    "bridge": "Choosing an agent means running the round trip you just traced over and over. What exactly repeats, and what single signal tells your code to stop repeating?",
    "diagram": {
     "kind": "flow",
     "title": "The agentic loop",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Send messages + tools",
       "tone": "hi"
      },
      {
       "t": "Claude replies",
       "sub": "check stop_reason"
      },
      {
       "t": "tool_use: run real tools",
       "tone": "warn"
      },
      {
       "t": "Append tool_result (user role)"
      },
      {
       "t": "end_turn: finished",
       "tone": "ok"
      }
     ],
     "loops": [
      {
       "from": 3,
       "to": 0,
       "label": "stop_reason = tool_use: loop again"
      }
     ]
    },
    "p": [
     "The loop: (1) your code sends messages plus a list of available tools to Claude; (2) Claude replies — if it needs a tool, `stop_reason` is `tool_use` and the response includes a `tool_use` block with a tool name, an id, and structured input; (3) your code executes the REAL tool — Claude never runs anything itself; (4) your code sends a new message back with a `tool_result` block, matched to the original by its id; (5) Claude continues, either requesting another tool (loop back to step 2) or finishing with `stop_reason: end_turn`."
    ],
    "table": {
     "headers": [
      "stop_reason value",
      "What it means",
      "What your code should do"
     ],
     "rows": [
      [
       "end_turn",
       "Claude finished naturally",
       "Treat the response as complete and final"
      ],
      [
       "max_tokens",
       "Cut off before finishing",
       "Do NOT trust it as complete — may be truncated JSON; raise max_tokens and retry, or handle the partial output carefully"
      ],
      [
       "tool_use",
       "Claude is pausing, requesting a tool call",
       "Not an error or a finished answer — find the tool_use block, run the real tool, send a tool_result back"
      ],
      [
       "stop_sequence",
       "Hit a custom stop phrase you defined",
       "Expected/intentional, handle per your application logic"
      ]
     ]
    },
    "why": "`stop_reason` is the ONLY reliable signal that the loop is actually done. Four specific anti-patterns to recognize and avoid: (1) natural language parsing — scanning Claude's text for phrases like 'I'm finished' instead of checking stop_reason, which is fragile and unreliable; (2) using an arbitrary iteration cap (e.g. max 5 loops) as the PRIMARY stop condition rather than a safety-valve backstop — this can cut off a task that needed one more legitimate step; (3) checking whether the response contains a text block as a completion signal — a single response can contain BOTH a text block ('Let me check that for you') AND a tool_use block at once, so presence of text is not a reliable stop signal; (4) forcing `tool_choice` to `\"any\"` specifically to PREVENT the agent from ever returning plain text — this looks like a fix for premature text-based termination, but it actually forces a tool call even once the agent is genuinely finished, creating an INFINITE LOOP (the agent can never signal 'done' via end_turn because it's structurally never allowed to just respond with text). The correct fix for premature termination is always checking stop_reason correctly — never restricting the model's ability to signal completion."
   },
   {
    "id": "stop-reason-in-depth",
    "part": "a1-p1",
    "legacy": 33,
    "h": "stop_reason in depth — every value, the mixed text-plus-tool_use trap, and what the loop does for each",
    "bridge": "The loop hinges on one field. What does each stop_reason value mean, what should the loop do for it, and which tempting shortcuts break it?",
    "diagram": {
     "kind": "decision",
     "title": "Map stop_reason to an action first",
     "q": {
      "t": "Read stop_reason on every response",
      "sub": "never text, never iteration count"
     },
     "branches": [
      {
       "label": "tool_use",
       "t": "Run all tools, append tool_result, call again",
       "tone": "warn"
      },
      {
       "label": "end_turn",
       "t": "Exit loop; orchestration still verifies resolution",
       "tone": "ok"
      },
      {
       "label": "max_tokens",
       "t": "Truncated: continue, raise limit or chunk",
       "tone": "bad"
      },
      {
       "label": "stop_sequence",
       "t": "Your custom stop string: handle per convention",
       "tone": "hi"
      }
     ],
     "note": "Text beside tool_use is normal. Forcing tool_choice any makes end_turn impossible: infinite loop."
    },
    "p": [
     "The loop's control decision comes from ONE field: stop_reason. tool_use means the model wants tools run — execute every tool_use block, append the results as tool_result blocks inside a user message, and call again. end_turn means the model finished its turn — the loop exits (whether the TASK is resolved is a separate orchestration check). max_tokens means the output hit the token limit and is truncated — never treat it as a complete answer, especially truncated JSON. stop_sequence means a custom stop string was generated. pause_turn means a long-running server-side tool turn was paused — send the conversation back, including the assistant content, so the model can continue. refusal means the model declined for safety reasons — do not blindly retry the identical request in a loop; handle it explicitly.",
     "Worked trap 1 — mixed content. A response contains a text block ('Let me check the order...') AND a tool_use block, with stop_reason tool_use. A naive check 'does the response contain text? then we're done' terminates early and the tool never runs. Decide from stop_reason, not from which block types appear. The opposite naive fix — forcing tool_choice to any so the model can never emit text — removes the model's ability to ever signal completion and creates an infinite loop.",
     "Worked trap 2 — text parsing. Checking whether the reply contains 'DONE' or 'Final answer' is probabilistic; the model may phrase completion differently or say the word mid-task. stop_reason is the structured, deterministic signal.",
     "Worked trap 3 — cap as primary. A loop written as for i in range(10) that stops after 10 iterations regardless of stop_reason will cut off a task that legitimately needed 12 steps, or keep an already-finished task running. The correct shape is: loop while stop_reason is tool_use; the iteration cap is only a defensive ceiling against a genuinely stuck loop, and breaching it escalates.",
     "Worked trap 4 — truncated structured output. A pipeline expecting complete JSON receives stop_reason max_tokens. Parsing it 'because it probably looks fine' risks silently corrupting downstream data; treat the response as incomplete, raise the limit or chunk the task, and retry."
    ],
    "why": "Exam items in this objective hand you a response shape or a buggy loop and ask what the loop should do next. Map stop_reason to an action first; only then consider secondary checks. Three distractors recur: detect completion from text, use the iteration count as the main exit, or force tool_choice to stop the model emitting text.",
    "table": {
     "headers": [
      "stop_reason",
      "Meaning",
      "Loop action"
     ],
     "rows": [
      [
       "tool_use",
       "Model requested tool(s)",
       "Run all tools, append tool_result in a user message, call again"
      ],
      [
       "end_turn",
       "Model finished its turn",
       "Exit loop; orchestration layer still verifies resolution"
      ],
      [
       "max_tokens",
       "Output truncated at the limit",
       "Treat as incomplete; continue, raise limit or chunk"
      ],
      [
       "stop_sequence",
       "Custom stop string generated",
       "Handle per your own convention"
      ],
      [
       "pause_turn",
       "Server-tool turn paused",
       "Resend conversation including assistant content to continue"
      ],
      [
       "refusal",
       "Model declined",
       "Handle explicitly; do not loop-retry the same request"
      ]
     ]
    },
    "deep": "The four-stage Observe-Plan-Act-Verify loop and stop_reason operate at different levels: stop_reason is the API-level signal for one model call; the loop stages describe what the agent does across calls. A correct design uses stop_reason to drive each iteration and a separate verification step to decide whether the overall task is actually done."
   },
   {
    "id": "observe-plan-act-verify",
    "part": "a1-p1",
    "legacy": 30,
    "h": "The agentic loop as an architectural contract — Observe, Plan, Act, Verify, and why each stage exists",
    "bridge": "stop_reason governs a single model call; this section looks at what the agent does across calls. Which four stages should the loop contain, and what breaks when one is skipped?",
    "diagram": {
     "kind": "flow",
     "title": "Observe, Plan, Act, Verify",
     "perRow": 4,
     "steps": [
      {
       "t": "Observe",
       "sub": "read real state first",
       "tone": "hi"
      },
      {
       "t": "Plan",
       "sub": "ordered steps, human review"
      },
      {
       "t": "Act",
       "sub": "real, logged operations",
       "tone": "warn"
      },
      {
       "t": "Verify",
       "sub": "check the actual outcome",
       "tone": "ok"
      }
     ],
     "loops": [
      {
       "from": 3,
       "to": 0,
       "label": "verify fails: observe again with new information"
      }
     ]
    },
    "p": [
     "Claude Code (and any agent built on the same pattern) doesn't generate an answer and stop — it runs a loop until the task is done or a human pauses it, and each of the loop's four stages exists to close a specific failure mode of the stage before it. OBSERVE reads the relevant files, terminal output, and project history BEFORE anything is planned — an agent that plans first and looks second is planning against an assumed codebase state instead of the real one. PLAN breaks the task into an ordered sequence of file edits and commands; for larger or riskier tasks, surfacing this plan for human approval before acting is what turns 'autonomous' into 'auditable' rather than 'unsupervised.' ACT executes real operations — file edits, bash commands, tool calls — each one logged, not simulated; the log is what makes the run reviewable after the fact, not just plausible-sounding in the moment. VERIFY surfaces the result and checks it against what was intended; if verification fails, the loop returns to OBSERVE with the failure as new information, rather than either giving up or blindly retrying the same plan.",
     "Worked failure if a stage is skipped: an agent that acts without first observing might edit a config file assuming a key is named `apiKey` because that's the common convention, when the actual codebase uses `api_key` — the edit 'succeeds' (the tool call doesn't error) but silently introduces a new, unused key alongside the real one. Observe-first would have caught this by reading the file before writing to it. Similarly, an agent that acts without a verify stage can report a task 'done' after a test suite finishes, without checking that the tests actually passed — the loop needs an explicit verify step precisely because 'the command ran' and 'the command succeeded at the intended goal' are different facts.",
     "This is the same architectural principle tested elsewhere in this domain under a different name: the loop's VERIFY stage is one instance of the general 'something outside the model's own narration must check the actual outcome' requirement — whether that's a verify stage checking a diff against intent, or an orchestration layer checking a resolution flag when the loop exits."
    ],
    "why": "Exam framing typically presents this as: given a described agent behavior, identify which stage of the loop is missing or malformed. The signal isn't the tool used, it's the ORDER and PRESENCE of the four functions — an agent that never re-reads state after edits is missing Observe on its second pass; an agent that reports success from stdout alone without checking exit codes or an independent check is missing Verify; an agent that edits files in an order that contradicts its own stated plan has a Plan/Act mismatch.",
    "table": {
     "headers": [
      "Stage",
      "What it answers",
      "Failure if skipped or weak"
     ],
     "rows": [
      [
       "Observe",
       "What is the actual current state, before I do anything?",
       "Plans and edits built on a stale or assumed state"
      ],
      [
       "Plan",
       "What ordered steps get from here to the goal, and should a human see this first?",
       "Ad hoc actions with no reviewable sequence; risky changes ship without approval"
      ],
      [
       "Act",
       "Execute the plan as real, logged operations",
       "Unlogged or simulated actions that can't be audited afterward"
      ],
      [
       "Verify",
       "Did the outcome actually match intent, checked independently of the model's own claim?",
       "'Looks done' reported as 'is done' — the exact gap a resolution-state safeguard exists to close"
      ]
     ]
    },
    "deep": "Don't conflate this loop with a state machine that has an exit condition baked into each stage — Verify failing doesn't mean the task failed, it means the loop returns to Observe with new information (the failure itself) and tries again, which is why the loop 'runs until the task is done or a human pauses it' rather than running a fixed number of stages once. An exam item describing an agent that hits a failure and simply stops, rather than re-observing and re-planning around the failure, is describing a broken loop, not a successfully verified one."
   },
   {
    "id": "reliability-fallback-design",
    "part": "a1-p2",
    "legacy": 17,
    "h": "Reliability and fallback design",
    "bridge": "A loop that can run indefinitely needs a plan for when it never converges. What is the maximum before you force a stop, and who takes over afterwards?",
    "diagram": {
     "kind": "compare",
     "title": "When the agent cannot converge",
     "left": {
      "title": "No fallback",
      "tone": "bad",
      "items": [
       "Agent loops silently on an unsolvable task",
       "No limit on iterations",
       "Nobody is told it is stuck"
      ]
     },
     "right": {
      "title": "Designed fallback",
      "tone": "ok",
      "items": [
       "Set a maximum number of iterations",
       "Force a stop when it is reached",
       "Escalate to a human"
      ]
     },
     "verdict": "Architecture and reliability engineering are linked: decide the stop and escalation path up front."
    },
    "p": [
     "Production agentic systems need to handle failure gracefully at the architecture level: what happens if a subagent never converges on an answer? What's the maximum number of loop iterations before you force a stop and escalate to a human? How do you avoid an agent silently looping forever on a task it can't solve?"
    ],
    "why": "This connects directly to Context Management & Reliability (a separate Architect domain) — architecture decisions and reliability engineering are deeply linked, not separate concerns."
   },
   {
    "id": "guaranteed-termination",
    "part": "a1-p2",
    "legacy": 28,
    "h": "Guaranteed termination — every session ends in resolution or escalation, no matter how the loop exits",
    "bridge": "A cap and end_turn are both ways out, but neither proves the problem was solved. How do you guarantee every session ends in resolution or escalation, whatever made the loop exit?",
    "diagram": {
     "kind": "decision",
     "title": "Check state after the loop exits, for any reason",
     "q": {
      "t": "Loop exited (end_turn, cap, exception)",
      "sub": "wrapper reads resolution_state"
     },
     "branches": [
      {
       "label": "resolved",
       "t": "Verified outcome: done",
       "tone": "ok"
      },
      {
       "label": "escalated",
       "t": "A human owns it",
       "tone": "ok"
      },
      {
       "label": "pending",
       "t": "Force-escalate with findings so far",
       "tone": "warn"
      }
     ],
     "note": "A prompt line cannot run once the loop has already exited, so the safeguard lives in code outside the loop."
    },
    "p": [
     "The agentic loop has exactly two documented ways to stop: `stop_reason: \"end_turn\"` (the model decided it's done) and hitting a safety-valve iteration cap (a backstop, never the primary mechanism). Neither of these, by itself, GUARANTEES the conversation actually reached a real outcome. A model can emit `end_turn` after a genuinely incomplete response ('I looked into this but couldn't determine the cause' — turn ends, ticket sits unresolved and unescalated), and an iteration cap can fire mid-investigation with nothing to show for it.",
     "Worked failure: a customer support session runs for 40 turns investigating a billing dispute, hits an internal iteration limit, and the loop simply STOPS — no refund processed, no escalation triggered, no message sent to the customer. From the outside, the session just went silent. This is an orchestration-layer gap, not a prompting gap — no system prompt wording fixes a structural absence of a fallback path."
    ],
    "why": "The architectural fix is a mandatory, code-enforced fallback that runs whenever the loop ends WITHOUT having reached an explicit resolution or escalation state — not a prompt instruction asking the model to 'always resolve or escalate,' since that is exactly the kind of guarantee prompt instructions cannot provide (the same hooks-vs-prompts distinction that governs every other 'must never fail' requirement on this exam). Concretely: track an explicit resolution flag (e.g. `resolution_state: pending | resolved | escalated`) as part of the session's structured state, and wrap the ENTIRE agentic loop in an orchestration layer that checks this flag once the loop exits for ANY reason (end_turn, iteration cap, an uncaught error) — if it's still `pending`, the orchestration layer ITSELF forces an escalation to a human, rather than letting the session simply end.",
    "table": {
     "headers": [
      "Loop exit path",
      "Without the safeguard",
      "With the safeguard"
     ],
     "rows": [
      [
       "Clean end_turn after real resolution",
       "Fine either way",
       "Fine either way"
      ],
      [
       "end_turn after an incomplete answer",
       "Silent, unresolved session",
       "Orchestration layer sees resolution_state still pending -> force-escalates"
      ],
      [
       "Iteration cap hit mid-investigation",
       "Silent, unresolved session",
       "Same forced escalation, regardless of WHY the loop stopped"
      ],
      [
       "An uncaught exception crashes the loop",
       "Silent, unresolved session",
       "Same forced escalation — the crash itself is a reason to escalate, not just a bug to fix later"
      ]
     ]
    },
    "deep": "This is a DIFFERENT layer from PreToolUse/PostToolUse hooks: a hook governs individual TOOL CALLS mid-session, while this safeguard governs the WHOLE SESSION'S terminal state — it has to sit OUTSIDE the agentic loop itself (wrapping it), because by the time the loop has already exited, there's no more model turn left in which a hook on a tool call could fire. The one-line check an architect applies to any production agent system: 'no matter how this session ends, does something OUTSIDE the loop guarantee it didn't just end in silence?' If the honest answer requires the model to have behaved correctly, it isn't guaranteed."
   },
   {
    "id": "termination-continuation-drills",
    "part": "a1-p2",
    "legacy": 31,
    "h": "Termination and continuation drills — eight worked cases, and the wrapper that guarantees a terminal state",
    "bridge": "You now have the wrapper idea; here it is stress-tested on eight exit paths. Which layer owns each failure, and what must a human receive when the session escalates?",
    "diagram": {
     "kind": "layers",
     "title": "Which layer owns which exit path?",
     "arrows": false,
     "layers": [
      {
       "t": "PreToolUse hooks",
       "sub": "govern individual tool calls",
       "tone": "hi",
       "tag": "call"
      },
      {
       "t": "try/finally orchestration wrapper",
       "sub": "end_turn, cap, exception, max_tokens, repeated tool failures",
       "tone": "warn",
       "tag": "loop exit"
      },
      {
       "t": "Durable state + watchdog sweeper",
       "sub": "SIGKILL or eviction: finally never runs",
       "tone": "bad",
       "tag": "process death"
      },
      {
       "t": "Terminal state: RESOLVED or ESCALATED with handoff package",
       "sub": "account, actions taken, findings, why it ended, next step",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "Every agent session must end in exactly ONE of two terminal states: RESOLVED (a verified outcome, e.g. the refund actually processed) or ESCALATED (a human now owns it, holding a complete handoff package). The loop itself can exit in many ways — end_turn, an iteration cap, an uncaught exception, a truncated max_tokens response, a killed process — and no prompt instruction can guarantee the right thing happens on every one of them. The guarantee therefore lives in an orchestration layer that WRAPS the loop: set session.state = pending; try { run the agentic loop } catch { record the exit reason } finally { if session.state is still pending → build the handoff package, escalate to a human, set state = escalated }. The finally-step runs for every exit path, which is exactly why it beats any instruction to the model.",
     "What the handoff package must contain (this is the continuation half of the objective): who the customer/account is, what was asked, every action already taken and its result, findings so far, what remains unresolved and why the session ended, the authorization state (what the agent was and was NOT permitted to do, any limits already consumed), and a suggested next step. A human who receives only 'the agent gave up' has to restart the investigation — the package is what makes continuation cheap.",
     "Case 1 — end_turn after an incomplete answer: the model writes 'I looked into it but couldn't determine the cause' and stops with end_turn. end_turn means the MODEL decided to stop, not that the TASK is resolved. Resolution must be an explicit state set by a verified action (refund_processed, ticket_closed), never inferred from the model's prose. The wrapper sees state still pending and escalates.",
     "Case 2 — iteration cap: a 40-turn billing investigation hits max_iterations. The cap is a backstop, not a terminal state. The wrapper escalates WITH the findings gathered so far, so the human starts at turn 41, not turn 1.",
     "Case 3 — tool-failure threshold: the same tool fails three consecutive times. Retrying forever is an anti-pattern; a failure counter crossing its threshold is itself a reason to escalate, with the error details attached.",
     "Case 4 — uncaught exception: a tool wrapper throws and would crash the loop. The finally-block still runs, so the session escalates instead of going silent. A crash is a reason to escalate, not just a bug to fix later.",
     "Case 5 — max_tokens truncation: stop_reason is max_tokens mid-answer. That is NOT a terminal state — the response is cut off. Continue (raise the limit or ask the model to continue), never deliver the truncated text as final; if it keeps happening, escalate.",
     "Case 6 — explicit human request: the customer says 'get me a human'. Honor it immediately — do not run another investigation first — but still build the full handoff package so the human does not start from zero. (Contrast: if the customer only expresses frustration and the issue is simple and within policy, acknowledge the frustration and offer the fix; escalate only if they reiterate.)",
     "Case 7 — process death: SIGKILL, a container eviction or a power loss means the finally-block NEVER runs. Two further mechanisms are needed: (a) durable state written as the session progresses (resolution_state plus a structured manifest of progress saved to a database or file, not held in memory), and (b) a watchdog/sweeper that periodically finds sessions still pending past a timeout and escalates them. This is the answer to 'regardless of how the loop terminates' when the terminator is the infrastructure itself.",
     "Case 8 — continuation after a human decision: a reviewer approves a pending refund. The orchestrator resumes the agent by injecting the approval as structured authorization state (approved_by, amount, timestamp) — it does NOT restart the conversation, re-ask the customer, or repeat the investigation."
    ],
    "why": "Exam framing: each item describes one exit path and asks which layer is missing. Sort them by layer — PreToolUse hooks govern individual tool CALLS; the try/finally wrapper governs how the LOOP exits; durable state plus a watchdog governs the PROCESS dying. A system prompt line like 'always resolve or escalate' appears as a distractor in nearly every variant because it cannot run when the loop has already exited.",
    "table": {
     "headers": [
      "Exit path",
      "Naive outcome",
      "Correct safeguard"
     ],
     "rows": [
      [
       "end_turn after an incomplete answer",
       "Silent, unresolved ticket",
       "Wrapper checks explicit resolution_state; still pending → escalate"
      ],
      [
       "Iteration cap hit",
       "Session just stops",
       "Forced escalation carrying findings so far"
      ],
      [
       "Tool failure counter over threshold",
       "Endless retries",
       "Threshold breach = escalation trigger with error details"
      ],
      [
       "Uncaught exception",
       "Pipeline crash, no record",
       "finally-block escalates and logs the exit reason"
      ],
      [
       "max_tokens truncation",
       "Truncated text delivered as final",
       "Treat as incomplete; continue or escalate"
      ],
      [
       "Explicit human request",
       "Agent keeps investigating",
       "Escalate immediately, with a full handoff package"
      ],
      [
       "Process killed",
       "finally never runs; session lost",
       "Durable state + watchdog sweeping stale pending sessions"
      ],
      [
       "Human approves after escalation",
       "Restart or re-ask customer",
       "Inject approval as authorization state and resume"
      ]
     ]
    },
    "deep": "A recognizable trap is the answer that adds a fallback INSIDE the loop (an extra 'final check' turn). If the loop exits by exception, cap or crash, there is no further turn to run it in. The test to apply to every option: 'does something OUTSIDE the loop guarantee a terminal state even if the model behaves badly and the loop dies?' If the guarantee needs the model's cooperation, it is not a guarantee."
   },
   {
    "id": "hooks-deterministic-control",
    "part": "a1-p2",
    "legacy": 2,
    "h": "Hooks: deterministic control vs. probabilistic prompting",
    "bridge": "The wrapper guards how the loop ends; now we need control inside the loop, around each tool call. Why use a hook instead of a prompt, and where exactly does it sit?",
    "diagram": {
     "kind": "seq",
     "title": "Where hooks sit around one tool call",
     "actors": [
      {
       "t": "Claude (model)",
       "tone": "hi"
      },
      {
       "t": "Your loop"
      },
      {
       "t": "PreToolUse hook",
       "tone": "warn"
      },
      {
       "t": "Tool",
       "tone": "mute"
      },
      {
       "t": "PostToolUse hook",
       "tone": "warn"
      }
     ],
     "rows": [
      {
       "f": 0,
       "t": 1,
       "text": "tool_use: process_refund($900)"
      },
      {
       "f": 1,
       "t": 2,
       "text": "before running"
      },
      {
       "note": "Can BLOCK, modify input or require human approval.",
       "over": [
        2
       ]
      },
      {
       "f": 2,
       "t": 1,
       "text": "deny: over $500, escalate",
       "tone": "bad",
       "dashed": true
      },
      {
       "f": 1,
       "t": 3,
       "text": "(only if allowed) execute"
      },
      {
       "f": 3,
       "t": 4,
       "text": "result"
      },
      {
       "note": "Cannot block: the action already happened. Validate, log, normalize.",
       "over": [
        4
       ]
      },
      {
       "f": 1,
       "t": 0,
       "text": "tool_result in a user message",
       "dashed": true
      }
     ]
    },
    "p": [
     "A hook is a rule enforced by your CODE at a specific, fixed point in the loop — not a request made in a prompt. Hooks fire at defined lifecycle moments: PreToolUse (right before a tool executes — can block, modify, or require human approval), PostToolUse (right after a tool finishes — can validate, log, or normalize the real result), and session-level moments (session start/end)."
    ],
    "table": {
     "headers": [
      "",
      "Hooks",
      "Prompt instructions"
     ],
     "rows": [
      [
       "Guarantee",
       "Deterministic — 100% enforced",
       "Probabilistic — generally followed (>90%), never guaranteed at 100%"
      ],
      [
       "Best for",
       "Critical business rules, financial operations, compliance",
       "General preferences, recommendations, formatting"
      ],
      [
       "Example",
       "Block any refund over $500 outright, server-side",
       "'Try to resolve the issue before escalating'"
      ]
     ]
    },
    "why": "Even an emphatically worded system prompt ('CRITICAL POLICY: NEVER process a refund over $500') has been observed to still fail around 3% of the time — no amount of emphatic wording reaches a true 100% guarantee, because enforcement still depends on the model's judgment in the moment. The architectural standard for a hard threshold is an application-layer hook intercepting the tool call: when the amount exceeds the threshold, block it server-side and invoke escalation — removing model discretion from the decision entirely."
   },
   {
    "id": "posttooluse-cannot-block",
    "part": "a1-p2",
    "legacy": 3,
    "h": "Deep dive: why PostToolUse can NEVER block a policy violation — it's already too late",
    "bridge": "The sequence just showed PostToolUse sitting after the tool. This deep dive follows that position to its consequence: why can it never prevent a violation?",
    "diagram": {
     "kind": "grid",
     "title": "PreToolUse vs PostToolUse",
     "corner": "",
     "cols": [
      "PreToolUse",
      "PostToolUse"
     ],
     "rows": [
      {
       "h": "Fires",
       "cells": [
        {
         "t": "Before the tool runs",
         "tone": "hi"
        },
        {
         "t": "After the tool ran",
         "tone": "mute"
        }
       ]
      },
      {
       "h": "Prevents a violation?",
       "cells": [
        {
         "t": "Yes: block or pause",
         "tone": "ok"
        },
        {
         "t": "No: already happened",
         "tone": "bad"
        }
       ]
      },
      {
       "h": "Can do",
       "cells": [
        {
         "t": "Allow, deny, route to approval",
         "tone": "ok"
        },
        {
         "t": "Detect, flag, log",
         "tone": "warn"
        }
       ]
      },
      {
       "h": "Example",
       "cells": [
        {
         "t": "Discount over 20%: manager queue",
         "tone": "ok"
        },
        {
         "t": "Flag a transfer for review",
         "tone": "warn"
        }
       ]
      }
     ]
    },
    "p": [
     "A specific, recognizable exam trap: proposing a PostToolUse hook to 'block' or prevent a policy-violating action. This is structurally impossible — PostToolUse fires AFTER a tool has already executed. By the time it runs, the non-compliant action (the transfer, the refund, the discount) has ALREADY happened. A PostToolUse hook can DETECT that a violation occurred and flag it for review, but it cannot PREVENT the violation, because prevention requires intercepting the call BEFORE execution — which is exactly what PreToolUse is for.",
     "A third concrete use case worth knowing alongside refund-threshold and AML-prerequisite enforcement: a MANAGER APPROVAL WORKFLOW. A PreToolUse hook intercepts calls to `approve_discount` for discounts above 20% — rather than blocking outright, it PAUSES execution and routes the request to a manager-approval queue; only after that approval does the tool actually execute."
    ],
    "why": "Confusing the DIRECTION of a hook has a real consequence: using PostToolUse where PreToolUse was needed means either missing the chance to prevent an action entirely (the transfer already went through before your hook even ran) or, in the reverse mistake, unnecessarily blocking work that already legitimately completed. The manager-approval case shows a THIRD response beyond simple allow/block: a PreToolUse hook can also PAUSE and ROUTE to a human decision-maker, resuming the tool call only after that external approval — not every policy-enforcement hook has to be a binary allow-or-deny."
   },
   {
    "id": "prerequisite-gate",
    "part": "a1-p2",
    "legacy": 10,
    "h": "Deep dive: the prerequisite gate — enforcing tool ORDER programmatically, not by hoping",
    "bridge": "You know PreToolUse can stop a call. Here it solves a sharper problem: forcing tool ORDER, such as no refund until a customer is verified. How do you make order structural rather than hoped-for?",
    "diagram": {
     "kind": "decision",
     "title": "A programmatic prerequisite gate",
     "q": {
      "t": "Agent calls process_refund",
      "sub": "PreToolUse checks the prerequisite in code"
     },
     "branches": [
      {
       "label": "verified ID exists",
       "t": "Let the call through",
       "tone": "ok"
      },
      {
       "label": "get_customer not done",
       "t": "Block; the agent must call it first",
       "tone": "bad"
      }
     ],
     "note": "Stronger prompts, few-shot order and a routing classifier all stay probabilistic or fix the wrong layer."
    },
    "p": [
     "A specific, named pattern for multi-step workflows: a PROGRAMMATIC PREREQUISITE blocks a downstream tool call from executing until an upstream prerequisite step has actually completed successfully — for example, blocking `process_refund` from running at all until `get_customer` has returned a verified customer ID. This is implemented as code (typically a PreToolUse hook) that checks whether the prerequisite has genuinely been satisfied BEFORE letting the gated call through, rather than trusting the model to always call things in the right order."
    ],
    "code": "@hook(\"PreToolUse\")\ndef enforce_customer_verification(tool_call, session_state):\n    if tool_call.name in (\"process_refund\", \"lookup_order\") and not session_state.get(\"verified_customer_id\"):\n        return block_call(reason=\"get_customer must return a verified ID before this tool runs\")\n    return allow_call(tool_call)",
    "why": "This is a distinct, NAMED failure mode worth recognizing precisely: under high traffic or with a customer who volunteers order details upfront, an agent can skip `get_customer` entirely and call `lookup_order`/`process_refund` using only a stated name — occasionally misidentifying accounts. The WRONG fixes are all prompt-level: strengthening the system prompt ('customer verification is mandatory'), or adding few-shot examples always showing the correct order — both remain PROBABILISTIC, and a financial operation with a non-zero failure rate is exactly the case that needs a DETERMINISTIC guarantee. A programmatic prerequisite gate is the only option that structurally cannot be skipped, regardless of how the model reasoned about the request.",
    "deep": "A FOURTH tempting-but-wrong fix, distinct from the prompt-level ones: proposing a ROUTING CLASSIFIER that sends refund requests to a 'specialized verification-first pipeline.' This misdiagnoses WHERE the failure actually lives — a routing classifier determines WHICH agent or pipeline handles a request; the compliance failure here occurs WITHIN a single agent's own execution sequence (it calls process_refund before get_customer), not at the routing/dispatch level. Sending the request to a differently-labeled pipeline doesn't add any enforcement inside that pipeline's own tool-call ordering — the same unenforced sequence problem exists there too, just relabeled. Routing classifiers solve routing problems; per-agent workflow-ordering problems need a prerequisite gate inside that agent's own execution, not a different front door."
   },
   {
    "id": "policy-hitl-pattern",
    "part": "a1-p2",
    "legacy": 21,
    "h": "A named orchestration pattern: policy constraints with human-in-the-loop",
    "bridge": "Hooks, a reliable trigger and human approval have each appeared separately. How do they combine into one nameable architecture for policy-bound support systems?",
    "diagram": {
     "kind": "flow",
     "title": "Policy constraints with human-in-the-loop",
     "perRow": 5,
     "steps": [
      {
       "t": "Orchestrator routes request"
      },
      {
       "t": "Agent proposes an action",
       "tone": "hi"
      },
      {
       "t": "Constraint check (hook)",
       "tone": "warn"
      },
      {
       "t": "Compliant: executes",
       "tone": "ok"
      },
      {
       "t": "Violation: human reviewer",
       "tone": "bad",
       "sub": "approve or reject"
      }
     ],
     "loops": [
      {
       "from": 4,
       "to": 1,
       "label": "approved: back to the agent"
      }
     ]
    },
    "p": [
     "A concrete, recognizable architecture for customer-support-style systems: an orchestrator routes a request to an AI agent, which proposes an action; the proposed action passes a CONSTRAINT CHECK before executing. Compliant actions proceed; a policy violation routes to a human reviewer, who can approve (routing back to the agent) or reject it."
    ],
    "why": "This single named pattern is really three ideas from across the Developer curriculum, combined: a guardrail (hook) enforced at the application layer, not left to the model's judgment; a reliable escalation trigger (an actual policy-check failure, not an unreliable proxy like sentiment); and a human-approval loop that lets execution resume once approved. Recognizing this as one coherent, nameable architecture — not three separate facts — is exactly the kind of synthesis the Architect exam rewards over the Developer exam."
   },
   {
    "id": "hub-and-spoke",
    "part": "a1-p3",
    "legacy": 4,
    "h": "Hub-and-spoke: the default multi-agent topology",
    "bridge": "Until now we have followed a single agent. With several, a structural question appears first: who may talk to whom?",
    "diagram": {
     "kind": "hub",
     "title": "Hub-and-spoke",
     "center": {
      "t": "Coordinator",
      "sub": "every message passes through it",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "Subagent A"
      },
      {
       "t": "Subagent B"
      },
      {
       "t": "Subagent C"
      },
      {
       "t": "Subagent D"
      }
     ],
     "forbidden": true,
     "note": "No spoke-to-spoke links: the coordinator sees everything and is the one place to handle errors."
    },
    "p": [
     "Whichever coordination pattern is used (sequential, parallel, or dispatcher), one structural rule sits underneath: subagents never communicate directly with each other — every message routes exclusively through the central coordinator. This shape is hub-and-spoke: the coordinator is the hub, each subagent is a spoke, with no spoke-to-spoke connections."
    ],
    "why": "This is what makes a multi-agent system possible to monitor and debug. Because EVERY message passes through the coordinator, the coordinator automatically sees the full picture — complete observability and one centralized point to catch and handle errors, instead of failures potentially propagating silently through a tangle of direct subagent-to-subagent links. A subagent's failure has nowhere else to report to but the coordinator, because hub-and-spoke gives it no other channel — the same rule that enables centralized error handling is the rule that eliminates direct links in the first place."
   },
   {
    "id": "nested-delegation-caveat",
    "part": "a1-p3",
    "legacy": 14,
    "h": "A real caveat: nested subagent delegation exists in current Claude Code",
    "bridge": "Hub-and-spoke says subagents never talk directly. Before building on that rule, how literally is it true in the real product versus on the exam?",
    "diagram": {
     "kind": "compare",
     "title": "Exam rule vs current Claude Code",
     "left": {
      "title": "On the exam",
      "tone": "ok",
      "items": [
       "Subagents never communicate directly",
       "Direct subagent-to-subagent links are ALWAYS wrong",
       "Tests the principle: observability, error handling, control"
      ]
     },
     "right": {
      "title": "In current Claude Code",
      "tone": "hi",
      "items": [
       "A subagent can spawn further subagents",
       "Nested parent-child delegation exists",
       "A product capability, not an exam answer"
      ]
     },
     "verdict": "Know both facts; answer the principle the scenario tests."
    },
    "p": [
     "The strict hub-and-spoke rule tested on the exam ('subagents never communicate directly, not for any reason') is worth knowing as an EXAM SIMPLIFICATION rather than a hard product limitation: in CURRENT Claude Code, a subagent can itself spawn further subagents (nested parent-child delegation)."
    ],
    "why": "Know both facts, but don't let the real-world nuance override what a scenario question is testing: on the exam, proposing direct subagent-to-subagent communication that bypasses the coordinator entirely is ALWAYS the wrong answer, regardless of what current tooling technically permits — the question is testing the architectural PRINCIPLE (centralized routing enables observability, consistent error handling, controlled information flow), not a literal claim about every current product capability."
   },
   {
    "id": "hub-vs-shared-memory",
    "part": "a1-p3",
    "legacy": 19,
    "h": "Choosing a multi-agent topology: hub-and-spoke vs. shared-memory",
    "bridge": "Hub-and-spoke is the default, but it is not the only legitimate shape. When should several agents instead share a memory store and exchange synthesis directly?",
    "diagram": {
     "kind": "compare",
     "title": "Choosing a topology",
     "left": {
      "title": "Hub-and-spoke",
      "tone": "hi",
      "items": [
       "Clean, independent delegation",
       "One centralized view of everything",
       "Best for most business workflows"
      ]
     },
     "right": {
      "title": "Shared-memory",
      "tone": "warn",
      "items": [
       "Parallel agents read/write a common store",
       "Agents see each other's evolving findings",
       "Costs the single observable hub"
      ]
     },
     "verdict": "Choose deliberately: shared-memory for a task that needs only clean delegation brings back the debugging pain."
    },
    "p": [
     "Developer's Agents topic establishes hub-and-spoke as the default, reliable multi-agent shape (subagents never talk directly, everything routes through a central coordinator, giving full observability). At the architecture level, you're expected to know there's a legitimate ALTERNATIVE: a shared-memory topology, where several agents work in parallel and read/write a common memory store, periodically exchanging synthesis directly with each other."
    ],
    "why": "The architectural judgment call is choosing between them deliberately: hub-and-spoke fits clean, independent delegation where centralized observability matters most (most business workflows). Shared-memory fits genuinely collaborative, exploratory work where agents benefit from seeing each other's evolving findings — at the cost of losing hub-and-spoke's single, centralized view of everything happening. Defaulting to shared-memory when the task only needed clean delegation reintroduces exactly the debugging difficulty hub-and-spoke exists to prevent; defaulting to hub-and-spoke for a task that genuinely needs rich cross-agent synthesis under-serves the collaboration the task actually needs."
   },
   {
    "id": "task-tool-payload",
    "part": "a1-p3",
    "legacy": 5,
    "h": "The Task Tool payload: how a coordinator actually spawns a subagent",
    "bridge": "The topology says all work flows through the coordinator. Mechanically, how does the coordinator create a subagent, and what must each spawn specify?",
    "diagram": {
     "kind": "hub",
     "title": "The Task tool payload",
     "center": {
      "t": "Task call",
      "sub": "coordinator needs Task in allowed_tools",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "description",
       "sub": "role and purpose of the agent"
      },
      {
       "t": "prompt",
       "sub": "instructions plus explicit context",
       "tone": "warn"
      },
      {
       "t": "allowed_tools",
       "sub": "least-privilege tool list",
       "tone": "ok"
      },
      {
       "t": "model",
       "sub": "tier chosen per node"
      }
     ],
     "note": "Several Task calls in one response spawn subagents in parallel. Newer versions call it Agent; the exam says Task."
    },
    "p": [
     "Subagents are spawned via a Task tool call, and the coordinator's own allowed_tools must include 'Task' for this to be possible at all (per the Task Tool permission matrix — standard subagents don't get this by default). Every spawn requires a strict payload with four fields: `description` (the agent's exact purpose and role within the multi-agent system), `prompt` (the specific instructions, goal criteria, and explicit context for THIS execution — mandatory, since subagents never automatically inherit the coordinator's history), `allowed_tools` (the isolated, least-privilege list of tools this specific worker can access), and `model` (the specific underlying model powering this individual node)."
    ],
    "why": "The `model` field is the architecturally significant one: it means model-tier cost optimization can be applied PER SUBAGENT SPAWN, not just at the whole-application level — a simple classification or search subagent runs on Haiku while a complex synthesis subagent in the SAME system runs on Opus, each chosen to fit that specific node's actual difficulty. A coordinator issuing multiple Task calls within one response spawns those subagents in PARALLEL — the concrete mechanism behind the parallel coordination pattern.",
    "deep": "Current-generation Claude Code (v2.1.63 and later) renamed the Task tool to `Agent` — the SDK now emits `Agent` in tool-use blocks, though `Task` still works as a backward-compatible alias. The exam's own official answer key still says 'Task tool,' so answer 'Task tool' on the exam even though you'll see 'Agent' in current code and docs — know both names and don't be thrown by the mismatch. Formally, this payload is the `AgentDefinition` object: `description` (when Claude should invoke this subagent), `prompt` (its system prompt — role, expertise, constraints), `tools` (the allow-list; OMITTING it inherits every tool available to subagents, so genuine least-privilege scoping requires listing `tools` explicitly rather than leaving it out), and `model` (the per-node override). The exam's description/prompt/allowed_tools/model framing above IS the `AgentDefinition` — same fields, slightly different names depending on whether you're reading the exam guide or current SDK docs."
   },
   {
    "id": "context-isolation-airlock",
    "part": "a1-p3",
    "legacy": 9,
    "h": "The context isolation airlock: precisely what crosses, what's blocked, and the fix",
    "bridge": "The payload had a prompt field marked mandatory. Why? Because of what does and does not cross into a freshly spawned subagent.",
    "diagram": {
     "kind": "layers",
     "title": "The context isolation airlock",
     "layers": [
      {
       "t": "Coordinator side",
       "sub": "conversation history turns 1..N, prior tool results, ambient knowledge",
       "tone": "bad",
       "tag": "BLOCKED"
      },
      {
       "t": "Task payload fields only",
       "sub": "system prompt, prompt, allowed_tools, model",
       "tone": "hi",
       "tag": "CROSSES"
      },
      {
       "t": "Subagent starts with an empty brain",
       "sub": "fix: coordinator extracts facts and injects them into the prompt field",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "A newly-spawned subagent starts with a COMPLETELY EMPTY brain — zero historical context automatically crosses the isolation barrier. Only what's explicitly placed into the Task tool payload's own fields (system prompt, the prompt field, allowed_tools, model) reaches it. BLOCKED by default: the coordinator's own conversation history (turns 1 through N), prior tool results, and any 'ambient' context the coordinator implicitly knows but never wrote down.",
     "The fix: if a subagent genuinely needs a piece of historical information, the coordinator must actively EXTRACT it from its own history and explicitly INJECT it into that Task call's prompt field — this never happens automatically, however obviously relevant the information seems."
    ],
    "why": "This gives a precise diagnostic signature worth building into how you evaluate ANY multi-agent architecture, not just spot-check it after the fact: subagent output that is irrelevant, duplicates work done elsewhere, or is generally context-unaware traces back almost always to missing explicit context injection — never to a model-capability problem. An architect designing a coordinator's prompting standard should treat 'what specific facts does each spawned subagent actually need, and are they explicitly in its prompt field' as a mandatory design checklist item, not an afterthought discovered through failure."
   },
   {
    "id": "tool-boundary-violations",
    "part": "a1-p3",
    "legacy": 7,
    "h": "Deep dive: tool-boundary violations — when an agent reaches outside its assigned role",
    "bridge": "Isolation controls what a subagent knows; allowed_tools controls what it can do. What happens when an agent reaches for a tool belonging to another role, and how do you fix it?",
    "diagram": {
     "kind": "seq",
     "title": "Fixing a tool-boundary violation",
     "actors": [
      {
       "t": "Coordinator",
       "tone": "hi"
      },
      {
       "t": "Data agent"
      },
      {
       "t": "Analysis agent",
       "tone": "warn"
      }
     ],
     "rows": [
      {
       "f": 2,
       "t": 2,
       "text": "calls web_search directly (not its tool!)",
       "tone": "bad"
      },
      {
       "note": "Fix: remove web_search from the analysis agent's allowed_tools, so it is structurally impossible.",
       "over": [
        2
       ],
       "tone": "ok"
      },
      {
       "f": 2,
       "t": 0,
       "text": "needs more context: ask the coordinator",
       "dashed": true
      },
      {
       "f": 0,
       "t": 1,
       "text": "re-invoke data collection"
      },
      {
       "f": 1,
       "t": 0,
       "text": "results",
       "dashed": true
      },
      {
       "f": 0,
       "t": 2,
       "text": "pass the results forward"
      }
     ]
    },
    "p": [
     "A distinct violation from hub-and-spoke's 'no direct subagent-to-subagent messaging' rule: a subagent using a TOOL that was meant to belong to a DIFFERENT subagent's role. For example, a coordinator delegates to a data-collection agent (given `web_search`, `database_query`) and a separate analysis agent (given `calculate`, `chart_generate`) — but in testing, the analysis agent calls `web_search` directly to fetch extra context, entirely bypassing the data-collection agent it was supposed to route through."
    ],
    "why": "This is fundamentally an `allowed_tools` SCOPING failure, not a message-routing failure — the analysis agent was given (or found a way to access) a tool outside its intended role. The fix is removing `web_search` from the analysis agent's `allowed_tools` list entirely, so it becomes STRUCTURALLY impossible for it to call that tool, regardless of what the model decides mid-task. If the analysis agent genuinely needs additional context it doesn't have, the correct path is requesting that context from the COORDINATOR (which can re-invoke the data-collection agent and pass results forward) — never reaching directly for a tool that belongs to a different role. This is the same least-privilege principle from Task Tool `allowed_tools` scoping, just diagnosed through a concrete violation rather than stated as an abstract rule: role boundaries between subagents are only real if enforced through tool ACCESS, not merely through prompt instructions describing what each agent 'should' do."
   },
   {
    "id": "subagent-lifecycle-hooks",
    "part": "a1-p3",
    "legacy": 6,
    "h": "Deep dive: SubagentStart and SubagentStop — lifecycle hooks specifically for subagent management",
    "bridge": "Two hook ideas now meet: lifecycle moments and subagents. Which hook fits each job when you manage a subagent's start, finish and output?",
    "diagram": {
     "kind": "grid",
     "title": "Pick the hook for the job",
     "corner": "Goal",
     "cols": [
      "Right hook",
      "Can block?"
     ],
     "rows": [
      {
       "h": "Log a spawn or inject context",
       "cells": [
        {
         "t": "SubagentStart",
         "tone": "mute"
        },
        {
         "t": "No, observational",
         "tone": "bad"
        }
       ]
      },
      {
       "h": "Block a spawn",
       "cells": [
        {
         "t": "PreToolUse on Task/Agent",
         "tone": "ok"
        },
        {
         "t": "Yes",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Reject finished output, force redo",
       "cells": [
        {
         "t": "SubagentStop",
         "tone": "ok"
        },
        {
         "t": "decision: block",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Rewrite what coordinator sees",
       "cells": [
        {
         "t": "PostToolUse on Task/Agent",
         "tone": "warn"
        },
        {
         "t": "updatedToolOutput",
         "tone": "warn"
        }
       ]
      }
     ]
    },
    "p": [
     "Beyond general PreToolUse/PostToolUse hooks, the Agent SDK provides two hooks specifically for the subagent lifecycle. `SubagentStart` fires when a subagent is spawned — it's purely OBSERVATIONAL (can log the spawn, inject additional context) and CANNOT block or modify the invocation. `SubagentStop` fires when a subagent finishes and is about to hand results back to the coordinator — it can validate the output and, if validation fails, return `decision: \"block\"` to send the subagent back to keep working, rather than letting invalid results through."
    ],
    "why": "Matching the right hook to the right job matters architecturally: wanting to BLOCK a spawn (rate-limiting, verifying required context was passed) needs a PreToolUse hook on the Task/Agent tool itself — SubagentStart cannot do this. Wanting to REJECT a finished subagent's output and force a redo needs SubagentStop's block decision. Wanting to REWRITE what the coordinator actually sees after success needs a PostToolUse hook on the Task/Agent call (via its `updatedToolOutput` field) — SubagentStop does not transform output itself. Additionally, subagents can define their OWN PreToolUse/PostToolUse hooks in their AgentDefinition, scoped only to that specific subagent — enabling genuinely per-role policy (a billing subagent's refund-threshold hook doesn't apply to a technical-support subagent). A subagent's own `Stop` hook, if defined in its frontmatter, is automatically converted to a `SubagentStop` event at runtime."
   },
   {
    "id": "parallel-vs-sequential-latency",
    "part": "a1-p3",
    "legacy": 8,
    "h": "Diagnosing parallel vs. sequential spawning: the exact latency math",
    "bridge": "We said several Task calls in one response run in parallel. What does that look like in the JSON, and what latency does it buy, so you can diagnose a coordinator that fails to do it?",
    "diagram": {
     "kind": "bar",
     "title": "Sequential total is the sum; parallel total is the slowest",
     "segments": [
      {
       "t": "S1 3s",
       "v": 3,
       "tone": "hi"
      },
      {
       "t": "S2 4s",
       "v": 4,
       "tone": "warn"
      },
      {
       "t": "S3 5s",
       "v": 5,
       "tone": "bad"
      }
     ],
     "note": "Illustrative times. Sequential = S1+S2+S3 = 12s. Parallel = max = 5s, with all tool_use blocks in one content array. About Nx slower means sequential."
    },
    "p": [
     "Parallel execution has a precise, checkable meaning at the JSON level: multiple `tool_use` blocks appear together inside the SAME `content` array of one single assistant response, each with its own distinct `id`. If instead the coordinator emits one Task call, waits for its result as a separate turn, then emits the next — that's sequential, even if each individual subagent itself is fast.",
     "This gives an exact latency formula: parallel execution's total time = max(S1, S2, S3) — bounded by the SLOWEST subagent. Sequential execution's total time = S1 + S2 + S3 — every subagent's time adds up."
    ],
    "why": "This produces a concrete diagnostic heuristic worth holding as a standing check: if a multi-agent system handling N independent subtasks is running roughly Nx slower than a single subtask would take alone, that's a strong signal the coordinator is committing the sequential anti-pattern — waiting turn-by-turn for each Task result rather than genuinely emitting all Task calls together in one response. This is exactly the kind of checkable, quantitative signal an architect should build into system monitoring, not just something to notice by accident."
   },
   {
    "id": "manager-hierarchies",
    "part": "a1-p3",
    "legacy": 16,
    "h": "Manager/supervisor hierarchies as an architectural pattern",
    "bridge": "You have the pieces: topology, spawning, isolation, parallelism. The architect's question is the right overall SHAPE, including how many layers and what happens when a part fails.",
    "diagram": {
     "kind": "hub",
     "title": "Designing the shape of the agent organization",
     "center": {
      "t": "Manager / supervisor hierarchy",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "How many layers?",
       "sub": "tradeoff, not default"
      },
      {
       "t": "Parallelize?",
       "sub": "speed vs coordination overhead",
       "tone": "warn"
      },
      {
       "t": "Subagent fails or times out?",
       "sub": "manager must handle it",
       "tone": "bad"
      }
     ]
    },
    "p": [
     "At the architecture level, you're expected to reason about tradeoffs: how many layers of hierarchy are appropriate, when parallelizing subagents helps vs. adds coordination overhead that outweighs the benefit, and how a manager should handle a subagent that fails or times out."
    ],
    "why": "This is less about 'can you build one subagent' (Developer level) and more about 'given this business problem, what's the right shape of the whole agent organization, and what happens when part of it fails.'"
   },
   {
    "id": "dynamic-subagent-selection",
    "part": "a1-p4",
    "legacy": 11,
    "h": "Deep dive: dynamic subagent selection — the coordinator decides WHICH subagents to invoke",
    "bridge": "With the machinery in place, what should the coordinator decide? Not every request needs every subagent, so how should it pick which ones to invoke?",
    "diagram": {
     "kind": "decision",
     "title": "Calibrate to the query",
     "q": {
      "t": "Analyze the incoming query",
      "sub": "what does it actually need?"
     },
     "branches": [
      {
       "label": "simple factual",
       "t": "Zero subagents: answer directly",
       "tone": "ok"
      },
      {
       "label": "complex, multi-faceted",
       "t": "Select three or four specialists",
       "tone": "hi"
      },
      {
       "label": "always full pipeline",
       "t": "Wasteful: latency and cost",
       "tone": "bad"
      },
      {
       "label": "too narrow a split",
       "t": "Incomplete coverage",
       "tone": "warn"
      }
     ]
    },
    "p": [
     "A coordinator shouldn't always route every request through the FULL fixed pipeline of every available subagent. Instead, it should ANALYZE each incoming query's actual requirements and dynamically select only the subagents genuinely needed for that specific request — a simple factual question might need zero subagents (the coordinator answers directly), while a complex multi-faceted research question might need three or four specialized ones."
    ],
    "why": "The risk on the OTHER side is just as real: an overly NARROW task decomposition — a coordinator that under-decomposes a genuinely broad research topic into too few, too-generic subagents — leads to incomplete coverage, missing entire angles the topic actually required. Good coordinator design sits between two failure modes: always invoking the full pipeline (wasteful, adds latency and cost for simple requests) and decomposing too narrowly (incomplete coverage for genuinely broad requests) — the coordinator's actual job is calibrating decomposition breadth to the QUERY's real complexity, not applying a fixed template regardless of what was actually asked."
   },
   {
    "id": "coverage-gap-diagnosis",
    "part": "a1-p4",
    "legacy": 12,
    "h": "Deep dive: diagnosing a coverage gap — don't blame the subagents for the coordinator's decomposition",
    "bridge": "Selecting too narrowly leaves gaps. When a report misses whole angles of a topic, where do you look first for the cause?",
    "diagram": {
     "kind": "flow",
     "title": "Every subagent fine, report still incomplete",
     "perRow": 4,
     "steps": [
      {
       "t": "Broad topic assigned",
       "sub": "AI and creative industries"
      },
      {
       "t": "Coordinator splits into 2-3 narrow subtasks",
       "sub": "all visual arts",
       "tone": "bad"
      },
      {
       "t": "Each subagent succeeds",
       "tone": "mute"
      },
      {
       "t": "Report covers one slice",
       "sub": "music, writing, film missing",
       "tone": "warn"
      }
     ],
     "note": "Fix the decomposition logic, not downstream agents. More subagents just get equally narrow assignments."
    },
    "p": [
     "A specific, recognizable diagnostic pattern: a multi-agent system is asked to research a broad topic (say, 'the impact of AI on creative industries'). Every individual subagent completes successfully and produces coherent, accurate output — but the FINAL report only covers one narrow slice of the topic (say, visual arts), completely missing other major angles (music, writing, film). Checking the coordinator's own logs reveals it decomposed the broad topic into only 2-3 narrow subtasks, all within that one slice, and never assigned any subagent to the missing angles at all."
    ],
    "why": "The correct root-cause diagnosis is the COORDINATOR's task decomposition being too narrow — NOT any downstream agent doing its job poorly. Each subagent executed its ASSIGNED task correctly; the problem is entirely in WHAT it was assigned. This is worth internalizing as a debugging instinct: when a multi-agent system's output has a coverage gap but every individual subagent's work checks out on its own terms, look at the coordinator's decomposition logs FIRST, before assuming a downstream agent (search queries too narrow, analysis filtering too aggressively) is somehow at fault — blaming a correctly-functioning downstream agent for a decomposition decision it never made wastes debugging effort on the wrong layer of the system.",
    "deep": "A tempting but WRONG fix for a narrow-decomposition coverage gap: adding MORE subagents. If the coordinator's decomposition logic itself only identified visual arts (or solar/wind) as the relevant subtopics, adding a fifth or sixth subagent doesn't help — it will simply receive an equally narrow assignment from the same flawed decomposition step. The fix is exclusively in the coordinator's DECOMPOSITION LOGIC, not in the number of workers available to execute whatever that logic produces."
   },
   {
    "id": "scope-partitioning-and-refinement",
    "part": "a1-p4",
    "legacy": 13,
    "h": "Deep dive: two more named coordinator responsibilities — scope partitioning and iterative refinement",
    "bridge": "If decomposition is the lever, what else does the coordinator own? Two more duties: giving subagents distinct scopes, and checking coverage and re-delegating.",
    "diagram": {
     "kind": "flow",
     "title": "Partition scope, then refine until covered",
     "perRow": 4,
     "numbered": true,
     "steps": [
      {
       "t": "Assign distinct scopes",
       "sub": "academic vs news sources",
       "tone": "hi"
      },
      {
       "t": "Synthesize"
      },
      {
       "t": "Evaluate coverage gaps",
       "tone": "warn"
      },
      {
       "t": "Done when sufficient",
       "tone": "ok"
      }
     ],
     "loops": [
      {
       "from": 2,
       "to": 0,
       "label": "gaps: targeted follow-up queries, re-synthesize"
      }
     ]
    },
    "p": [
     "Beyond decomposition/delegation/aggregation/error-handling, two more responsibilities matter architecturally. <b>Research scope partitioning</b>: when delegating to multiple subagents, assign DISTINCT subtopics or source types to each — one searches academic/financial sources, another searches news — to minimize duplicated effort, rather than letting two subagents independently cover the same ground.",
     "<b>Iterative refinement</b>: the coordinator should EVALUATE synthesized output for coverage gaps and, if incomplete, re-delegate to subagents with TARGETED follow-up queries aimed at exactly what's missing, re-invoking synthesis until coverage is genuinely sufficient — rather than treating the first pass as automatically final."
    ],
    "why": "Iterative refinement here is a specific, ongoing coordinator responsibility focused on COVERAGE BREADTH for research-shaped tasks — distinct from the general evaluator-optimizer workflow pattern (a broader produce-check-refine loop usable for many task types, like comparing a rendered 3D model against a source image). Scope partitioning directly prevents the wasted-effort failure mode where multiple subagents redundantly cover the same sources while other angles of a topic go completely unaddressed."
   },
   {
    "id": "coordinator-drills",
    "part": "a1-p4",
    "legacy": 32,
    "h": "Coordinator drills — subagent never invoked, results lost between agents, and who should parallelize a big sub-task",
    "bridge": "These drills test the whole coordinator toolkit so far. For each symptom, which layer owns it and what do you check first?",
    "diagram": {
     "kind": "grid",
     "title": "Six coordinator symptoms",
     "corner": "Symptom",
     "cols": [
      "Check first",
      "Fix"
     ],
     "rows": [
      {
       "h": "Agents never invoked",
       "cells": [
        {
         "t": "Task tool enabled?",
         "tone": "warn"
        },
        {
         "t": "Enable, load agents",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Synthesizer got nothing",
       "cells": [
        {
         "t": "How results handed over",
         "tone": "warn"
        },
        {
         "t": "Inject outputs in prompt",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Independent work runs serially",
       "cells": [
        {
         "t": "One call per turn?",
         "tone": "warn"
        },
        {
         "t": "All Task calls in one response",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Slow big sub-task",
       "cells": [
        {
         "t": "Who owns splitting?",
         "tone": "warn"
        },
        {
         "t": "Sub-coordinator, bounded",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Tool misuse",
       "cells": [
        {
         "t": "Too many tools in scope?",
         "tone": "warn"
        },
        {
         "t": "4-5 tools per role",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Subagents talk directly",
       "cells": [
        {
         "t": "Hub bypassed",
         "tone": "warn"
        },
        {
         "t": "Route via coordinator",
         "tone": "ok"
        }
       ]
      }
     ]
    },
    "p": [
     "Drill 1 — configured correctly but never invoked. Four subagents have excellent descriptions, correct tools and skills, yet the coordinator answers everything itself and never delegates. Diagnose in this order: (1) does the coordinator actually have the Task tool in its allowed tools? Without it the coordinator literally cannot spawn a subagent, and description quality is irrelevant; (2) are the subagents actually defined and loaded where the runtime looks for them (agent definition files or the SDK agents option); (3) does the coordinator's own system prompt tell it to delegate and which specialists exist and when to use them? Automatic delegation depends on descriptions, but a coordinator prompt that never mentions delegation makes it far less likely. Red herrings: rewriting subagent descriptions, a bigger model, giving subagents more tools. Contrast with MISROUTING (the wrong subagent is invoked), which IS a description or tool-distribution problem.",
     "Drill 2 — results lost between agents. The document-search and web-search subagents finish, but the synthesizer reports it received nothing. Subagents do not share memory or conversation history; each starts with only the prompt it is given. The reliable flow is that the coordinator receives each subagent's output and explicitly injects it, as structured data (claims, sources, metadata), into the next agent's prompt. Wrong fixes: telling the synthesizer to 'check the other agents' output', hoping a shared history exists, or a bigger context window.",
     "Drill 3 — sequential vs parallel. A coordinator calls three independent subagents one per turn, taking 3s + 4s + 5s = 12s. Emitting all three Task tool calls in a single coordinator response runs them concurrently, so latency is the slowest (5s), not the sum. This only applies to INDEPENDENT work — if subagent B needs A's output, the calls must stay sequential.",
     "Drill 4 — who parallelizes a large sub-task. In a legal-analysis system the document agent takes 2+ minutes on a case with 12 embedded precedents. Options: (A) the coordinator spawns several document agents, each with a subset of precedents, then merges; (B) the document agent — deliberately designed as a hierarchical sub-coordinator — spawns specialized subagents for the precedents in parallel and returns one compact result; (C) an unbounded recursive hierarchy that checks precedents as needed. Reasoning: the party that owns the knowledge of how to decompose the work should do it. Only the document agent knows how precedents are embedded and how to parse them; under (A) the coordinator must learn document internals and carry partition-and-merge logic, coupling it to every specialist. (C) risks runaway token use and infinite recursion. (B) is the best answer PROVIDED delegation authority is granted deliberately: Task tool given to that agent by design, bounded fan-out, a depth limit of one, and a compact structured summary returned upward. This does not contradict 'Task tool is for coordinators only': a designed sub-coordinator is an explicit exception, not the default for standard subagents.",
     "Drill 5 — tool misuse. Four agents are connected to all 18 tools and keep calling tools outside their role (an order-summary agent running web_search). Root cause: too many tools in scope. Fix: restrict each agent to the 4-5 tools its role needs, plus precise descriptions with examples.",
     "Drill 6 — agents talking to each other. A proposal has the search subagent pass findings directly to the analysis subagent. On an architecture question this is wrong: route through the coordinator, which gives one place for observability, consistent error handling and controlled information flow."
    ],
    "why": "These six drills cover the coordinator failure patterns the exam keeps varying: missing delegation plumbing, lost data between agents, serial execution of independent work, ownership of decomposition, tool sprawl, and bypassing the hub. The diagnostic habit is to ask 'which layer owns this?' before touching prompts or models.",
    "table": {
     "headers": [
      "Symptom",
      "Check first",
      "Fix",
      "Red herring"
     ],
     "rows": [
      [
       "Correct subagents never invoked",
       "Task tool enabled? agents loaded? coordinator prompt mentions delegation?",
       "Enable Task, load the agents, add delegation guidance",
       "Better descriptions, bigger model"
      ],
      [
       "Synthesizer says it got nothing",
       "How did the coordinator hand over results?",
       "Coordinator injects structured outputs into the next prompt",
       "Longer context window"
      ],
      [
       "Independent subagents run one after another",
       "Are Task calls emitted in separate turns?",
       "Emit all Task calls in a single response",
       "Faster model"
      ],
      [
       "One agent's sub-task is too slow",
       "Who knows how to decompose it?",
       "Designed sub-coordinator fans out, bounded depth, compact return",
       "Unbounded recursion"
      ],
      [
       "Agents pick wrong tools",
       "How many tools are in scope per agent?",
       "Restrict to 4-5 role tools, richer descriptions",
       "Lower temperature"
      ]
     ]
    },
    "deep": "Keep 'never invoked' and 'misrouted' apart. Never-invoked is an enablement problem (Task tool, loaded definitions, coordinator instructions). Misrouted is a selection problem (descriptions, overlapping tools, keyword-sensitive prompts). Fixing descriptions for a coordinator that cannot call Task at all is the classic wasted effort."
   },
   {
    "id": "decomposition-strategies",
    "part": "a1-p5",
    "legacy": 29,
    "h": "Task decomposition strategies — fixed prompt chaining vs. dynamic, adaptive decomposition",
    "bridge": "Decomposition so far was about how many pieces. The next question is how the plan is formed: written in advance, or discovered as the work goes?",
    "diagram": {
     "kind": "decision",
     "title": "Fixed chain or dynamic decomposition?",
     "q": {
      "t": "Could you draw the complete flowchart first?",
      "sub": "and would it stay correct whatever is found?"
     },
     "branches": [
      {
       "label": "yes",
       "t": "Prompt chaining: fixed steps, e.g. per-file review, then integration pass",
       "tone": "ok"
      },
      {
       "label": "no, depends on findings",
       "t": "Dynamic: map, find high-impact areas, prioritize, adapt",
       "tone": "hi"
      }
     ],
     "note": "Complexity and predictability are different axes: many steps can still be a fixed chain."
    },
    "p": [
     "Two different decomposition shapes solve two different problems, and picking the wrong one is a recognizable exam trap. PROMPT CHAINING is a FIXED, predetermined sequence of steps written in advance — step 2 always runs after step 1, regardless of what step 1 finds. DYNAMIC decomposition generates its subtasks ON THE FLY, based on what earlier steps actually discover — the plan literally cannot be written in advance because nobody knows what will be found.",
     "Worked example, prompt chaining: reviewing a pull request that touches 5 files with well-understood, independent concerns (style, security, tests, docs, performance) is naturally a FIXED chain — Step 1: analyze each file individually for local issues. Step 2 (always runs, the same for every PR): a separate cross-file integration pass checking how the changes interact. This is predictable and repeatable precisely because the SHAPE of the review doesn't depend on what's found — every PR gets the same two-pass structure.",
     "Worked example, dynamic decomposition: 'add comprehensive test coverage to this legacy codebase' cannot be chained in advance, because the actual subtasks depend entirely on what's discovered. The adaptive plan: (1) map the codebase's structure first — nobody knows which modules exist or how they're organized yet; (2) FROM that map, identify high-impact, poorly-tested areas — this step's output only exists because step 1 ran; (3) create a prioritized task list — the fact that 'the payment module has zero tests and touches money' only became known after mapping, so it couldn't have been in a fixed plan written before starting; (4) as fixes land, re-assess — a module that turns out to depend on three others no one knew about generates NEW subtasks step 1 could never have anticipated."
    ],
    "why": "The test for which one to use: 'could I draw the complete set of steps as a flowchart before starting, and would that flowchart stay correct regardless of what's found along the way?' If yes — a multi-aspect code review, a fixed compliance checklist, a standard onboarding sequence — prompt chaining is cheaper, more predictable, and easier to test, and reaching for dynamic decomposition here is over-engineering. If the honest answer is 'it depends what we find,' — codebase exploration, open-ended debugging, comprehensive test-coverage work — forcing a fixed chain produces an INCOMPLETE result, because the chain's fixed steps simply can't discover and act on the thing that mattered but wasn't anticipated.",
    "table": {
     "headers": [
      "Signal",
      "Use"
     ],
     "rows": [
      [
       "The full sequence of steps is knowable and identical for every run",
       "Prompt chaining (fixed)"
      ],
      [
       "Later steps depend on findings from earlier steps that can't be predicted",
       "Dynamic, adaptive decomposition"
      ],
      [
       "A standard, repeatable multi-aspect review (style + security + tests + docs)",
       "Prompt chaining — per-aspect pass, then integration pass"
      ],
      [
       "Open-ended investigation ('add test coverage,' 'find the root cause')",
       "Dynamic — map, then decide, then act, then reassess"
      ]
     ]
    },
    "deep": "A common exam trap: describing a task as 'complex' or 'multi-step' and assuming that alone means dynamic decomposition is required. Complexity and PREDICTABILITY are different axes — a 12-step onboarding checklist is complex but entirely predictable (chain it), while a 2-step 'find out why this intermittently fails in production' investigation is short but genuinely can't be planned in advance (decompose dynamically). Judge by whether the NEXT step depends on what the CURRENT step finds, not by how many steps there are."
   },
   {
    "id": "dynamic-decomposition-drills",
    "part": "a1-p5",
    "legacy": 34,
    "h": "Dynamic decomposition drills — four more cases, plus the chain-with-a-dynamic-step hybrid",
    "bridge": "Same test as before, now on four more cases plus the hybrid. Does the NEXT step depend on what the current step finds?",
    "diagram": {
     "kind": "grid",
     "title": "Fixed, dynamic or hybrid?",
     "corner": "Task",
     "cols": [
      "Pattern",
      "Deciding fact"
     ],
     "rows": [
      {
       "h": "Migrate legacy auth",
       "cells": [
        {
         "t": "Dynamic",
         "tone": "hi"
        },
        {
         "t": "Usages unknown until searched",
         "tone": "mute"
        }
       ]
      },
      {
       "h": "Standard PR review",
       "cells": [
        {
         "t": "Fixed chain",
         "tone": "ok"
        },
        {
         "t": "Same shape every PR",
         "tone": "mute"
        }
       ]
      },
      {
       "h": "Why did latency double?",
       "cells": [
        {
         "t": "Dynamic",
         "tone": "hi"
        },
        {
         "t": "Each finding picks next step",
         "tone": "mute"
        }
       ]
      },
      {
       "h": "Monthly invoice pipeline",
       "cells": [
        {
         "t": "Fixed chain",
         "tone": "ok"
        },
        {
         "t": "Many steps, fully predictable",
         "tone": "mute"
        }
       ]
      },
      {
       "h": "Fetch, investigate, report",
       "cells": [
        {
         "t": "Hybrid",
         "tone": "warn"
        },
        {
         "t": "Only investigation is open",
         "tone": "mute"
        }
       ]
      }
     ]
    },
    "p": [
     "The decision test: can you draw the complete flowchart BEFORE starting, and would it stay correct whatever is discovered? Yes → fixed prompt chain. No, because the next step depends on what the current step finds → dynamic, adaptive decomposition.",
     "Case 1 — 'migrate the legacy authentication module to the new SDK' with no map of where it is used. Dynamic: first map usages (unknown until searched), then group into independent vs interacting clusters, then plan per cluster, and re-plan when a cluster turns out to touch a payment path. A fixed chain written in advance would miss whole areas.",
     "Case 2 — a standard pull-request review with style, security, tests and docs passes plus a final integration pass. Fixed chain: the shape is identical for every PR, so it is cheaper, repeatable and easy to test. Choosing dynamic here is over-engineering.",
     "Case 3 — 'checkout latency doubled last week, find out why'. Dynamic: each finding (a slow query, a new dependency, a cache miss pattern) decides the next investigation step; two steps may be enough or twelve.",
     "Case 4 — a monthly invoice pipeline: extract → validate → post to ledger. Fixed chain; a dozen steps but fully predictable. Complexity and predictability are different axes.",
     "Hybrid — many real systems are a fixed shell with one adaptive step: fetch data (fixed), investigate anomalies (dynamic, because what exists is unknown), render the report from a fixed template (fixed). Naming which step is adaptive is the architect's skill.",
     "Re-planning triggers for the dynamic case: a discovery that invalidates the remaining plan (an unexpected dependency), a failed verification, or a newly found subtask. Record the plan and its revisions in the session state so a resumed or escalated session sees why the plan changed."
    ],
    "why": "The scorecard shows 50% here: the usual miss is equating 'many steps' or 'complex' with 'dynamic'. Judge by whether the NEXT step depends on the CURRENT step's findings, not by step count.",
    "table": {
     "headers": [
      "Task",
      "Pattern",
      "Deciding fact"
     ],
     "rows": [
      [
       "Migrate legacy auth, usages unknown",
       "Dynamic",
       "Scope only discoverable by searching"
      ],
      [
       "Standard 4-aspect PR review",
       "Fixed chain",
       "Same shape for every PR"
      ],
      [
       "Find cause of latency doubling",
       "Dynamic",
       "Each finding picks the next step"
      ],
      [
       "Monthly invoice pipeline",
       "Fixed chain",
       "Predictable despite many steps"
      ],
      [
       "Fetch → investigate anomalies → templated report",
       "Hybrid",
       "Only the investigation step is unknowable"
      ]
     ]
    },
    "deep": "A subtle distractor offers 'add more subagents' or 'use a bigger model' for an incomplete result from a fixed chain. More workers cannot discover subtasks the plan never contained — the plan generation step has to be adaptive."
   },
   {
    "id": "stateless-api-vs-sessions",
    "part": "a1-p5",
    "legacy": 27,
    "h": "Two different 'sessions': the stateless API's conversation history vs. Claude Code's `--resume`/`fork_session`",
    "bridge": "Whichever plan you choose, state has to live somewhere. Back at the API level: who actually remembers the conversation, and how is that different from Claude Code's session commands?",
    "diagram": {
     "kind": "compare",
     "title": "Two layers, one stateless API",
     "left": {
      "title": "Raw Messages API",
      "tone": "hi",
      "items": [
       "No memory between calls, ever",
       "YOUR code resends the full messages array",
       "Includes tool calls and tool results",
       "No --resume or fork_session here"
      ]
     },
     "right": {
      "title": "Claude Code CLI",
      "tone": "ok",
      "items": [
       "Stores the transcript locally",
       "--resume rebuilds history and resends it",
       "API underneath is still stateless",
       "fork_session and named sessions live here"
      ]
     },
     "verdict": "Lost context in a raw API app: resend the full history, not --resume."
    },
    "p": [
     "These are commonly conflated, and the exam tests the distinction directly. The Claude API itself is STATELESS — the API has no memory of any previous request. Every single API call must include the ENTIRE conversation history (every prior user and assistant message, every tool call and tool result) in the `messages` array, or the model has no way to know what was said before. There is no session ID you pass to the raw API that makes it 'remember' anything — YOUR code is responsible for storing the growing message list and resending all of it on every turn.",
     "Claude Code's `--resume <name>` and `fork_session` are a COMPLETELY DIFFERENT layer, built ON TOP of that stateless API by the Claude Code CLI itself: Claude Code stores the transcript locally, and when you resume, Claude Code's own tooling reconstructs the full message history from that stored transcript and sends it to the (still-stateless) API as the first request of the resumed session. The API underneath never 'remembers' anything between calls either way — Claude Code just automates the bookkeeping of resending history that your own code would otherwise have to do by hand.",
     "Worked example, raw API integration (no Claude Code involved): you're building a custom support bot directly on the Messages API. Turn 1: user says 'my order #4471 hasn't arrived.' Turn 2: user says 'can you check the tracking?' If your backend sends turn 2 to the API as a FRESH `messages: [{role:'user', content:'can you check the tracking?'}]` — without turn 1 prepended — the model has genuinely never heard of order #4471. It will ask which order, because from the API's perspective this is the first thing anyone has ever said. The fix is entirely in YOUR code: store every message exchanged, and resend the complete list — both turns — on every subsequent call.",
     "Worked example, Claude Code CLI: a developer runs an investigation in an interactive Claude Code session, closes the terminal, and the next day runs `claude --resume auth-investigation`. Claude Code reads the STORED TRANSCRIPT from disk, reconstructs the full message history from it, and sends that reconstructed history to the API as part of the resumed session's first request. The developer never manually re-pasted anything — but underneath, the exact same 'resend the full history' rule from the raw-API case is what's actually happening; Claude Code is just doing it automatically on your behalf."
    ],
    "why": "Getting this distinction backwards is a specific, recognizable exam trap: a raw API-based application has NO `--resume` or `fork_session` available to it — those are Claude Code CLI/SDK session-management features, not properties of the API itself. If a scenario describes a stateless multi-turn API integration losing context between turns, the fix is 'the calling code must store and resend the full conversation history with every request' — NOT '`--resume` the session,' which doesn't apply outside the Claude Code product. Conversely, if a scenario is explicitly about a Claude Code CLI workflow, `--resume`/`fork_session`/named sessions ARE the right vocabulary, because Claude Code's own tooling is what's actually being asked about.",
    "table": {
     "headers": [
      "",
      "Raw Messages API",
      "Claude Code CLI"
     ],
     "rows": [
      [
       "Statefulness",
       "Fully stateless — no memory between calls, ever",
       "Also sits on the stateless API underneath — no exception"
      ],
      [
       "What carries context forward",
       "YOUR code resending the full `messages` array every request",
       "Claude Code's own transcript storage + `--resume` / `fork_session`"
      ],
      [
       "Fix for 'the agent forgot what we discussed'",
       "Confirm your code is appending to AND resending the full history, not just the latest message",
       "Confirm you resumed the correct NAMED session rather than starting fresh"
      ],
      [
       "Does `--resume` apply here?",
       "No — this flag doesn't exist for a raw API integration",
       "Yes — this is exactly what it's for"
      ]
     ]
    },
    "deep": "A related, frequently-missed detail for raw API integrations specifically: appending only the LATEST user message to a stored array isn't enough by itself if earlier ASSISTANT messages and TOOL RESULTS aren't also included — the model reconstructs its own prior reasoning from what's actually present in the message list, not from an assumption that it 'remembers' issuing a tool call three turns ago. Every `tool_use` block and its corresponding `tool_result` must both be present in the resent history for the model to correctly reason about what already happened; dropping the tool_result while keeping the tool_use (or vice versa) produces a malformed history the API will reject or the model will misinterpret."
   },
   {
    "id": "session-resume-fork-decision",
    "part": "a1-p5",
    "legacy": 26,
    "h": "Session state, resumption, and forking — the architect's decision framework",
    "bridge": "Claude Code's session tools sit on that resend mechanism. Given three tools, resume, fork, fresh start, which fits which situation, especially when files changed?",
    "diagram": {
     "kind": "decision",
     "title": "Resume, fork or start fresh?",
     "q": {
      "t": "What is the situation?"
     },
     "branches": [
      {
       "label": "nothing changed",
       "t": "claude --resume name",
       "tone": "ok"
      },
      {
       "label": "compare two strategies",
       "t": "fork_session: independent branches",
       "tone": "hi"
      },
      {
       "label": "files changed since",
       "t": "Fresh session + summary + changed files",
       "tone": "warn"
      },
      {
       "label": "long, cluttered session",
       "t": "Fresh session with curated summary",
       "tone": "warn"
      }
     ],
     "note": "Restored history is verbatim, including stale tool results."
    },
    "p": [
     "Claude Code sessions can be named at start (`--name` or, mid-session, `/rename`) and continued later with `claude --resume <name>` — the ENTIRE prior conversation, including every tool result, analysis, and piece of reasoning, is restored verbatim. `fork_session` (or `/branch` plus `--fork-session` from the CLI) takes a different shape: it creates an INDEPENDENT branch starting from a shared baseline, so two branches can then diverge — comparing two different refactoring strategies from the same starting analysis, for example — without one branch's changes leaking into the other.",
     "Named resumption assumes the prior context is still ACCURATE. The failure case: an engineer resumes a code-review session the next morning after fixing three of the issues Claude found overnight. Because resumption restores full history VERBATIM, including now-stale tool results (the original, unfixed file contents), Claude confidently recommends fixes that were already applied — the model has no way to know the underlying files changed underneath it."
    ],
    "why": "The fix is choosing the right one of three tools for the actual situation, not just defaulting to whichever is most convenient: `--resume` when nothing meaningful has changed since the session ended; `fork_session` when you specifically want two DIVERGENT branches explored from one shared starting point; and — when files have changed since the session ended — starting a FRESH session with a curated summary of prior findings injected as the opening context, rather than dragging forward an entire history of now-invalid tool results. The fresh-start path is also the more RELIABLE choice for a long, cluttered session even without file changes, since a hand-written summary of what mattered beats resuming hundreds of turns of noise.",
    "table": {
     "headers": [
      "Situation",
      "Correct mechanism",
      "Why"
     ],
     "rows": [
      [
       "Continuing later, nothing changed",
       "`--resume <name>`",
       "Full prior context is still valid and useful"
      ],
      [
       "Comparing two strategies from one baseline",
       "`fork_session` / `--fork-session`",
       "Independent divergent branches, neither affects the other"
      ],
      [
       "Resuming after editing some files",
       "Fresh session + injected summary + named changed files",
       "Stale tool results in restored history would misdirect the model"
      ],
      [
       "Long, cluttered history even with no file changes",
       "Fresh session + injected summary",
       "A curated summary outperforms re-processing a bloated verbatim history"
      ]
     ]
    },
    "deep": "A further efficiency point on the 'files changed' case specifically: don't force a full re-exploration of a 50-file codebase because 3 files changed. Tell the fresh session explicitly which files changed and let it re-analyze only those — the summary injected for the other 47 already-understood files stands, and only the genuinely stale slice gets redone."
   },
   {
    "id": "workflow-shell-agentic-pieces",
    "part": "a1-p6",
    "legacy": 15,
    "h": "From 'workflow vs. agent' to full system design",
    "bridge": "You have practiced single mechanisms; now the unit of design becomes the whole system. Take the workflow-vs-agent rule and apply it at system scale: which parts are rigid, which flexible, and how do they connect?",
    "diagram": {
     "kind": "layers",
     "title": "A workflow shell with agentic pieces",
     "arrows": true,
     "layers": [
      {
       "t": "Workflow shell: predictable overall structure",
       "sub": "fixed steps your code orders",
       "tone": "hi",
       "tag": "fixed"
      },
      {
       "t": "Agentic piece: embedded where flexibility is needed",
       "sub": "Claude decides in a loop",
       "tone": "warn",
       "tag": "adaptive"
      },
      {
       "t": "Workflow shell continues",
       "sub": "back to predictable steps",
       "tone": "hi",
       "tag": "fixed"
      }
     ]
    },
    "p": [
     "Architect asks you to apply the workflow-vs-agent rule at the scale of an entire SYSTEM: which parts of a large application should be rigid workflows, which parts need agentic flexibility, and how do those pieces connect to each other?"
    ],
    "why": "A real production system is rarely 100% one or the other — it's usually a workflow SHELL (predictable overall structure) with agentic PIECES embedded where genuine flexibility is needed, exactly like a manager/subagent research pipeline, but now you're expected to design the whole thing, not just recognize the pattern."
   },
   {
    "id": "architecture-archetypes",
    "part": "a1-p6",
    "legacy": 18,
    "h": "Four recognizable architecture archetypes",
    "bridge": "Designing whole systems starts with recognition. Which of four common shapes does a scenario describe, and which concern dominates that shape?",
    "diagram": {
     "kind": "grid",
     "title": "Four architecture archetypes",
     "corner": "Archetype",
     "cols": [
      "Shape",
      "Dominant concern"
     ],
     "rows": [
      {
       "h": "Structured data extraction",
       "cells": [
        {
         "t": "High volume, batch, strict schemas",
         "tone": "mute"
        },
        {
         "t": "Throughput, schema reliability",
         "tone": "hi"
        }
       ]
      },
      {
       "h": "Customer support",
       "cells": [
        {
         "t": "Stateful, human-in-loop, policy",
         "tone": "mute"
        },
        {
         "t": "Bounding autonomy vs human",
         "tone": "hi"
        }
       ]
      },
      {
       "h": "Developer productivity",
       "cells": [
        {
         "t": "Dynamic, iterative tool use",
         "tone": "mute"
        },
        {
         "t": "Flexible tool use over code",
         "tone": "hi"
        }
       ]
      },
      {
       "h": "Multi-agent systems",
       "cells": [
        {
         "t": "Parallel agents, synthesis",
         "tone": "mute"
        },
        {
         "t": "Coordination topology",
         "tone": "hi"
        }
       ]
      }
     ]
    },
    "p": [
     "Most real Claude-powered systems fall into one of a small number of recognizable shapes, each with a different dominant concern:",
     "<b>Structured data extraction</b>: high volume, strict schemas, typically batch-processed — the dominant concerns are throughput and schema reliability.",
     "<b>Customer support orchestration</b>: stateful (remembers context across a conversation), human-in-the-loop, constrained by policy — the dominant concern is safely bounding what the AI can do autonomously versus what requires a human.",
     "<b>Developer productivity tooling</b>: dynamic, unpredictable tasks with iterative context and advanced tool use (like Claude Code) — the dominant concern is flexible, capable tool use over a codebase.",
     "<b>Multi-agent systems</b>: parallel processing across several agents with cross-agent synthesis — the dominant concern is coordination topology (hub-and-spoke vs. shared-memory, covered below)."
    ],
    "why": "Recognizing which archetype a scenario question describes tells you which set of concerns and mitigations to reach for FIRST. A structured-extraction scenario points you toward schema design and Batch API questions; a customer-support scenario points you toward policy/hook and escalation questions; a multi-agent scenario points you toward topology and coordination questions — the archetype is the fastest way to narrow down what the question is actually testing."
   },
   {
    "id": "hierarchy-of-constraints",
    "part": "a1-p6",
    "legacy": 20,
    "h": "The architect's hierarchy of constraints",
    "bridge": "An archetype tells you the shape; a scenario then names a pressure on it. Which category of fix belongs to each of the four constraints, and why is compliance different?",
    "diagram": {
     "kind": "hub",
     "title": "Four pressures, four kinds of mitigation",
     "center": {
      "t": "Production constraints",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "Latency",
       "sub": "parallelization, caching"
      },
      {
       "t": "Accuracy",
       "sub": "structured intermediates, few-shot"
      },
      {
       "t": "Cost",
       "sub": "Batch APIs, context pruning"
      },
      {
       "t": "Compliance",
       "sub": "hooks, not prompts alone",
       "tone": "ok"
      }
     ],
     "note": "Compliance needs a 100% deterministic mechanism; the other three are best-effort optimization."
    },
    "p": [
     "A production system is always balancing four competing pressures, each with an established category of architectural mitigation:"
    ],
    "table": {
     "headers": [
      "Constraint",
      "Mitigated by"
     ],
     "rows": [
      [
       "Latency",
       "Parallelization and caching"
      ],
      [
       "Accuracy",
       "Structured intermediates (schemas, conflict-detection fields) and few-shot prompts"
      ],
      [
       "Cost",
       "Batch APIs and context pruning"
      ],
      [
       "Compliance",
       "Application-layer intercepts (hooks) — explicitly NOT prompts alone"
      ]
     ]
    },
    "why": "This is the single highest-yield lookup table for the Architect exam: whenever a scenario names a specific pressure the system is under, this table tells you which category of architectural fix to reach for. Compliance is the deliberate exception among the four — the other three are best-effort optimization problems, while compliance requires a 100%-guaranteed, deterministic enforcement mechanism, because a 'usually compliant' system does not actually satisfy a compliance requirement."
   },
   {
    "id": "archetype-constraint-matrix",
    "part": "a1-p6",
    "legacy": 22,
    "h": "Capstone: the architect's reference matrix — every archetype crossed with every constraint",
    "bridge": "You now hold archetypes and constraints separately. This matrix crosses them so a scenario's archetype and dominant constraint point to one named technique.",
    "diagram": {
     "kind": "grid",
     "title": "Archetype by constraint",
     "corner": "",
     "cols": [
      "Extraction",
      "Support",
      "Dev tools",
      "Multi-agent"
     ],
     "rows": [
      {
       "h": "Token bloat",
       "cells": [
        {
         "t": "-",
         "tone": "mute"
        },
        {
         "t": "Filter stale results",
         "tone": "hi"
        },
        {
         "t": "Scratchpad file",
         "tone": "hi"
        },
        {
         "t": "Shared vector store",
         "tone": "hi"
        }
       ]
      },
      {
       "h": "Latency",
       "cells": [
        {
         "t": "Batch routing",
         "tone": "hi"
        },
        {
         "t": "-",
         "tone": "mute"
        },
        {
         "t": "-",
         "tone": "mute"
        },
        {
         "t": "Parallel + caching",
         "tone": "hi"
        }
       ]
      },
      {
       "h": "Compliance",
       "cells": [
        {
         "t": "-",
         "tone": "mute"
        },
        {
         "t": "App-layer intercepts",
         "tone": "ok"
        },
        {
         "t": "-",
         "tone": "mute"
        },
        {
         "t": "tool_choice",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Accuracy",
       "cells": [
        {
         "t": "Schema redundancy",
         "tone": "hi"
        },
        {
         "t": "-",
         "tone": "mute"
        },
        {
         "t": "Granular MCP tools",
         "tone": "hi"
        },
        {
         "t": "Structured intermediates",
         "tone": "hi"
        }
       ]
      }
     ]
    },
    "p": [
     "Pulling the four architecture archetypes and the four constraints together into one master lookup: for each archetype, which specific NAMED technique addresses each constraint that actually applies to it."
    ],
    "table": {
     "headers": [
      "",
      "Data Extraction",
      "Customer Support",
      "Developer Productivity",
      "Multi-Agent"
     ],
     "rows": [
      [
       "Token Bloat",
       "—",
       "Filter Stale Results",
       "Scratchpad File",
       "Shared Vector Store"
      ],
      [
       "Latency",
       "Batch Routing",
       "—",
       "—",
       "Parallelization & Caching"
      ],
      [
       "Compliance/Control",
       "—",
       "App-Layer Intercepts",
       "—",
       "tool_choice Enforcement"
      ],
      [
       "Accuracy",
       "Schema Redundancy",
       "—",
       "Granular MCP Tools",
       "Structured Intermediates"
      ]
     ]
    },
    "why": "Notice not every cell is filled — that's deliberate and itself worth understanding: token bloat isn't usually the dominant concern for a batch data-extraction pipeline (no long interactive session accumulating history), and compliance/control isn't usually the headline concern for developer productivity tooling (there's typically no external customer-facing policy to enforce). Matching a scenario's ARCHETYPE and its DOMINANT constraint to the correct cell in this matrix is close to the fastest possible way to answer a well-posed Architect scenario question — each named technique in this table is something you've now studied in depth elsewhere in this workbook; this matrix is the map connecting all of them."
   },
   {
    "id": "production-architecture-blueprint",
    "part": "a1-p6",
    "legacy": 23,
    "h": "Capstone: the production architecture blueprint — one diagram tying it all together",
    "bridge": "With the matrix as your lookup, the last step is the skeleton behind it. What one end-to-end architecture do new scenarios slot into?",
    "diagram": {
     "kind": "flow",
     "title": "The production blueprint",
     "perRow": 3,
     "numbered": true,
     "steps": [
      {
       "t": "User request",
       "tone": "hi"
      },
      {
       "t": "Pattern router",
       "sub": "real-time or batch by SLA"
      },
      {
       "t": "Execution layer",
       "sub": "granular tools behind hook intercepts",
       "tone": "warn"
      },
      {
       "t": "State management",
       "sub": "pruning plus shared vector store"
      },
      {
       "t": "Synthesis",
       "sub": "aggregate, format, deliver",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "A single end-to-end reference architecture synthesizing everything in this domain: a user request hits a PATTERN ROUTER, which sends it down either a real-time or batch path depending on its actual SLA (never defaulting to real-time for asynchronous needs). Both paths converge on an EXECUTION LAYER containing GRANULAR TOOLS (not broad monolithic ones) sitting behind APPLICATION-LAYER INTERCEPTS (hooks enforcing validation guardrails, policy, and schema checks — guarding the core, not left to prompts). That execution layer connects to a STATE MANAGEMENT layer combining PRUNING LOGIC (trimming verbose tool output before it enters context) with a SHARED VECTOR STORE (durable, semantically-searchable memory sustaining the whole lifecycle, surviving individual failures). Finally, everything flows to a SYNTHESIS stage handling result aggregation, formatting, and delivery."
    ],
    "why": "This blueprint is worth holding as a single mental model precisely because the Architect exam tests whether you can place a NEW, unfamiliar scenario into this same skeleton: what's the router decision for this scenario's SLA? What granular tools does the execution layer need? What specific intercepts does this scenario's compliance requirement demand? What does state management need to persist, and how? A scenario question is very often just asking you to fill in one or two boxes of this same underlying blueprint, not to invent an entirely new architecture from nothing."
   },
   {
    "id": "exam-format-scenarios",
    "part": "a1-p7",
    "legacy": 24,
    "h": "Exam mechanics: 6 scenarios, 4 drawn at random, 720/1000 to pass",
    "bridge": "Domain knowledge is now in place; the remaining question is how it is tested. What is the exam's shape and which scenarios might you draw?",
    "diagram": {
     "kind": "bar",
     "title": "6 scenarios, 4 drawn at random",
     "segments": [
      {
       "t": "4 drawn per sitting",
       "v": 4,
       "tone": "hi"
      },
      {
       "t": "2 not drawn",
       "v": 2,
       "tone": "mute"
      }
     ],
     "note": "Pass = 720 of 1000 scaled. Single-answer multiple choice with three distractors. You cannot know which four, so study all six."
    },
    "p": [
     "The exam is built from 6 total scenarios covering the five domains. Any single sitting draws 4 of those 6 AT RANDOM — you don't know in advance which four. The passing score is 720 out of 1000 on a scaled score; every question is single-answer multiple choice with three distractors."
    ],
    "table": {
     "headers": [
      "Scenario",
      "Theme",
      "Domain(s) it exercises"
     ],
     "rows": [
      [
       "1",
       "Customer Support",
       "Agentic Architecture, Tool/MCP, Context & Reliability"
      ],
      [
       "2",
       "Code Generation",
       "Claude Code Configuration"
      ],
      [
       "3",
       "Multi-Agent Research",
       "Agentic Architecture, Tool/MCP, Context & Reliability"
      ],
      [
       "4",
       "Developer Productivity",
       "Tool/MCP (Grep/Glob/Edit mechanics)"
      ],
      [
       "5",
       "CI/CD",
       "Claude Code Configuration, Prompt Engineering"
      ],
      [
       "6",
       "Structured Extraction",
       "Prompt Engineering, Context & Reliability"
      ]
     ]
    },
    "why": "Scenarios 4 and 6 are easy to under-study because they're less intuitive than 'customer support' or 'CI/CD' — but they're worth exactly as much on exam day as any other scenario, since the draw is random across all six. Never skip a scenario because it feels less central to the domain you're reviewing."
   },
   {
    "id": "distractor-traps",
    "part": "a1-p7",
    "legacy": 25,
    "h": "Exam mechanics: the four recurring distractor traps",
    "bridge": "Knowing the format, learn to read the answer options. Which four recurring traps build the wrong answers, and what is the tell for each?",
    "diagram": {
     "kind": "grid",
     "title": "The four distractor traps",
     "corner": "Trap",
     "cols": [
      "The tell"
     ],
     "rows": [
      {
       "h": "1. Prompt fix for must-never",
       "cells": [
        {
         "t": "Guarantee wording: answer is code enforcement",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "2. Over-engineered first step",
       "cells": [
        {
         "t": "Cheapest fix for the root cause wins",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "3. Infrastructure first",
       "cells": [
        {
         "t": "Simpler lever not yet ruled out",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "4. Sentiment or confidence signal",
       "cells": [
        {
         "t": "Prefer explicit, observable criteria",
         "tone": "ok"
        }
       ]
      }
     ]
    },
    "p": [
     "Every scenario question tends to build at least one wrong answer from one of four recurring traps. Learning to name the trap makes the correct answer far easier to spot."
    ],
    "table": {
     "headers": [
      "Trap",
      "What it looks like",
      "The tell"
     ],
     "rows": [
      [
       "1. Prompt fix for a 'must never' rule",
       "A scenario demands a guarantee; the distractor offers stronger wording or 'clearer' prompting",
       "Words like must/never/guarantee → the answer is code-level enforcement (hook, gate, schema), never prompt wording"
      ],
      [
       "2. Over-engineered 'first step'",
       "The question asks for the most effective FIRST step; the distractor is a full rebuild, new classifier, or new service",
       "'Most effective first step' ≠ 'most complete solution' — the cheapest fix addressing the stated root cause wins"
      ],
      [
       "3. Infrastructure before optimization",
       "A new routing layer, classifier, microservice, or subagent offered before a simpler fix (better descriptions, narrower scoping) has even been tried",
       "If a simpler existing lever hasn't been ruled out yet, new infrastructure is premature"
      ],
      [
       "4. Sentiment/self-confidence as a decision signal",
       "'Escalate when self-reported confidence drops below X%' or 'route based on detected frustration'",
       "These are unreliable proxies — the exam consistently prefers explicit, observable criteria"
      ]
     ]
    },
    "why": "The one-line filter: when two options both sound plausible, ask 'does this guarantee the outcome, or just make it more likely?' If the scenario uses must/never/guarantee language, the guarantee always wins over the probability. A worked example: a customer support agent occasionally calls process_refund before get_customer returns a verified ID under high traffic. The correct fix is a PreToolUse prerequisite gate in code — stronger prompt wording, few-shot examples, and tool_choice:'any' are all Trap 1 variants, since none of them structurally guarantees the ordering."
   }
  ],
  "quiz": [
   {
    "q": "An agent edits a config file assuming a key is named `apiKey` by convention, when the codebase actually uses `api_key`, silently creating an unused duplicate key. Which stage of the Observe-Plan-Act-Verify loop was skipped or too weak?",
    "opts": [
     "Act — the edit itself was performed incorrectly",
     "Observe — the actual file content was never read before the edit was planned",
     "Plan — the sequence of steps was wrong",
     "Verify — the result was never checked"
    ],
    "correct": 1,
    "explain": "The wrong assumption came from not reading the real file first — Observe happens before Plan and Act, and skipping it means every later stage builds on an assumed state instead of the actual one."
   },
   {
    "q": "An agent reports a task 'done' immediately after a test-runner command exits, without checking whether the tests actually passed. Which loop stage is missing?",
    "opts": [
     "Observe",
     "Plan",
     "Act",
     "Verify"
    ],
    "correct": 3,
    "explain": "'The command ran' and 'the command succeeded at the intended goal' are different facts — Verify is the stage that checks outcome against intent, independent of the model's own narration that something finished."
   },
   {
    "q": "For a large or risky task, what does surfacing the Plan stage for human review before Act accomplish, architecturally?",
    "opts": [
     "It makes the agent run faster by skipping unnecessary steps",
     "It turns autonomous execution into an auditable process rather than an unsupervised one",
     "It replaces the need for a Verify stage afterward",
     "It is only a UX nicety with no architectural function"
    ],
    "correct": 1,
    "explain": "Reviewing the plan before acting is what makes autonomous operation safe to authorize — every subsequent action is a real, logged operation taken against an approved plan, not a surprise discovered after the fact."
   },
   {
    "q": "An agent's Verify stage finds that a fix didn't fully resolve the issue. What should happen next in a correctly designed loop?",
    "opts": [
     "The loop terminates and reports partial failure",
     "The loop returns to Observe, treating the verification failure itself as new information to act on",
     "The same Plan is re-executed unchanged until it succeeds",
     "A human must manually restart the entire loop from scratch"
    ],
    "correct": 1,
    "explain": "The loop runs until the task is done or paused by a human — a failed verification feeds back into Observe with the failure as new information, rather than stopping silently or blindly repeating the same plan."
   },
   {
    "q": "On any single Architect exam sitting, how many of the 6 total scenarios are actually drawn?",
    "opts": [
     "All 6, every time",
     "4 of the 6, chosen at random",
     "3 of the 6, fixed by domain",
     "It varies from 1 to 6 with no rule"
    ],
    "correct": 1,
    "explain": "Every sitting draws 4 of the 6 scenarios at random — you can't predict which four, so all six stay in scope during prep, including less-obvious ones like Developer Productivity and Structured Extraction."
   },
   {
    "q": "What is the passing score for the Claude Certified Architect exam?",
    "opts": [
     "70% of questions correct",
     "720 out of 1000 on a scaled score",
     "80 out of 100 raw questions",
     "There is no fixed passing score"
    ],
    "correct": 1,
    "explain": "720/1000 is the scaled passing score for the exam."
   },
   {
    "q": "A scenario states a rule must never be violated. One answer option proposes stronger, more emphatic system-prompt wording. What trap is this, and what should the correct answer look like instead?",
    "opts": [
     "Trap 4 (sentiment as signal) — the fix is a confidence threshold",
     "Trap 1 (prompt fix for a must-never rule) — the fix is code-level enforcement, like a PreToolUse gate",
     "This isn't a trap — stronger wording is a legitimate fix for a hard requirement",
     "Trap 2 (over-engineered first step) — the fix is a full system rebuild"
    ],
    "correct": 1,
    "explain": "Any 'must never' language demands a guarantee. Prompt wording, no matter how emphatic, stays probabilistic — the correct answer is always code-level enforcement (a hook or gate)."
   },
   {
    "q": "A question asks for the 'most effective first step' to fix unreliable tool selection caused by vague, single-sentence tool descriptions. Which answer is most likely a trap?",
    "opts": [
     "Rewriting the descriptions to add scope and preconditions — this is the correct, cheap fix",
     "Building a tool-routing classifier before rewriting the descriptions",
     "Adding a few-shot example of correct tool use — a reasonable second-line improvement",
     "Reading the tool descriptions aloud to check tone — irrelevant"
    ],
    "correct": 1,
    "explain": "When the root cause (vague descriptions) is stated directly and a much cheaper fix already exists, proposing new infrastructure (a classifier) before trying that cheap fix is the over-engineering trap."
   },
   {
    "q": "A task extracts 5 fixed fields from an invoice and files it into one of 3 known folders — the steps never change. Workflow or agent?",
    "opts": [
     "Workflow — steps and order are fully known in advance",
     "Agent — because it involves a document",
     "Neither",
     "Both at once"
    ],
    "correct": 0,
    "explain": "If you can draw the exact flowchart ahead of time, it's a workflow."
   },
   {
    "q": "What is the ONLY reliable signal that an agentic loop is actually finished?",
    "opts": [
     "The response contains a text block",
     "stop_reason equals end_turn",
     "A fixed iteration counter reaches its limit",
     "The response is longer than 100 tokens"
    ],
    "correct": 1,
    "explain": "stop_reason is the structured, reliable signal — text presence, iteration counts, and word-parsing are all recognized anti-patterns for detecting completion."
   },
   {
    "q": "A response contains both a text block ('Let me check that') and a tool_use block in the same turn. Why is 'stop when text appears' an unreliable completion check?",
    "opts": [
     "Text and tool_use can never appear together",
     "They CAN appear together — stopping on text presence can cut the loop off before the actual tool call ever executes",
     "Text blocks are always errors",
     "This scenario is impossible"
    ],
    "correct": 1,
    "explain": "Mixed content means text alone is not a safe stop signal; only stop_reason reliably indicates the turn is complete."
   },
   {
    "q": "In terms of guarantee, how do hooks compare to prompt instructions?",
    "opts": [
     "Both are 100% guaranteed",
     "Hooks are deterministic (100% enforced)",
     "Prompt instructions are 100% guaranteed, hooks are not",
     "Neither offers any real guarantee"
    ],
    "correct": 1,
    "explain": "This is why financial/compliance rules belong in hooks (application-layer intercepts), while softer guidance can stay as a prompt instruction."
   },
   {
    "q": "A team proposes a PostToolUse hook to 'block' policy-violating international transfers before they complete. Why is this structurally impossible?",
    "opts": [
     "PostToolUse hooks don't actually exist",
     "PostToolUse fires AFTER the tool has already executed",
     "PostToolUse hooks are slower than PreToolUse but otherwise equivalent",
     "This actually works correctly as described"
    ],
    "correct": 1,
    "explain": "Confusing hook direction has a real consequence — PostToolUse can only ever react to something that's already happened, never prevent it."
   },
   {
    "q": "A PreToolUse hook intercepts approve_discount calls above 20% and routes them to a manager-approval queue, resuming the tool only after approval. What does this illustrate beyond simple allow/block enforcement?",
    "opts": [
     "This is not actually possible with hooks",
     "A hook's response doesn't have to be a binary allow-or-deny",
     "Manager approval workflows can only be implemented in the system prompt",
     "This is identical to a PostToolUse hook's capabilities"
    ],
    "correct": 1,
    "explain": "Pause-and-route-to-human is a third response beyond simple allow/deny, showing hooks can orchestrate human-in-the-loop approval, not just gate or reject."
   },
   {
    "q": "In hub-and-spoke, can two subagents communicate directly with each other?",
    "opts": [
     "Yes, whenever they need to coordinate closely",
     "No — every message routes exclusively through the central coordinator",
     "Only in parallel coordination patterns",
     "Only if a hook allows it"
    ],
    "correct": 1,
    "explain": "The core rule of hub-and-spoke is that subagents only talk to the coordinator, which is what gives it centralized observability and error handling."
   },
   {
    "q": "Practice scenario: An architecture review proposes hub-and-spoke for a system where 6 specialist agents (financial analysis, legal review, market research, technical due diligence, risk assessment, and synthesis) all need to see and react to each other's evolving findings in real time during a deal evaluation, rather than reporting cleanly to one coordinator. A junior engineer insists hub-and-spoke should still be used because 'it's the default best practice.' What's the correct architectural judgment?",
    "opts": [
     "Agreed — hub-and-spoke should always be used regardless of the task shape, since it's the safer default",
     "This is a case for the shared-memory topology instead: the agents genuinely need to cross-reference each other's evolving findings",
     "Neither topology applies here — this requires a single monolithic agent",
     "Shared-memory should never be used in a professional/financial context regardless of the task shape"
    ],
    "correct": 1,
    "explain": "The choice between hub-and-spoke and shared-memory is a deliberate architectural judgment based on whether the work is genuinely collaborative (shared-memory) or cleanly delegatable into independent pieces (hub-and-spoke) — treating one as an unconditional default ignores the actual shape of the task."
   },
   {
    "q": "What four fields make up the Task Tool payload required to spawn a subagent?",
    "opts": [
     "name, description, temperature, max_tokens",
     "description, prompt, allowed_tools, model",
     "system_prompt, tools, user, assistant",
     "role, content, tool_use, tool_result"
    ],
    "correct": 1,
    "explain": "description defines the agent's role, prompt gives execution-specific instructions, allowed_tools scopes its tool access, and model sets which tier powers that node."
   },
   {
    "q": "Why does the `model` field in the Task Tool payload matter architecturally, beyond just being a technical parameter?",
    "opts": [
     "It has no real architectural significance",
     "It lets model-tier cost optimization be applied per individual subagent spawn",
     "All subagents in a system are required to use the same model",
     "It only affects the subagent's output formatting"
    ],
    "correct": 1,
    "explain": "This applies the right-size-the-model principle at the granularity of a single spawn, not just at the whole-application level."
   },
   {
    "q": "Current Claude Code (v2.1.63+) emits 'Agent' in tool-use blocks instead of 'Task.' What should you answer on the exam, and why?",
    "opts": [
     "Answer 'Agent,' since that's the current name in real code",
     "Answer 'Task tool' — the exam's official terminology still uses this name",
     "Either answer is always accepted interchangeably with no distinction to know",
     "Neither name is correct; the exam uses a third term entirely"
    ],
    "correct": 1,
    "explain": "The exam guide's official terminology lags the current product naming — know both, but answer with the exam's own vocabulary."
   },
   {
    "q": "An architect wants to rate-limit how often a coordinator can spawn a specific subagent. Would a SubagentStart hook accomplish this?",
    "opts": [
     "Yes, SubagentStart can block or throttle any spawn directly",
     "No — SubagentStart is purely observational and cannot block a spawn",
     "SubagentStart and PreToolUse are the same mechanism with different names",
     "Rate-limiting subagent spawns isn't possible with any hook"
    ],
    "correct": 1,
    "explain": "SubagentStart can only log or inject context — actually preventing or throttling a spawn needs a PreToolUse hook on the Task/Agent tool."
   },
   {
    "q": "What is the total-latency formula for correctly parallelized execution of 3 independent subagents?",
    "opts": [
     "S1 + S2 + S3",
     "max(S1, S2, S3)",
     "S1 x S2 x S3",
     "There is no reliable formula"
    ],
    "correct": 1,
    "explain": "Parallel execution is bounded by the slowest subagent, not the sum of all subagents' individual times."
   },
   {
    "q": "A production multi-agent system handling 3 independent subtasks is observed running roughly 3x slower than a single subtask alone. What diagnostic conclusion should this trigger?",
    "opts": [
     "This is normal and expected for any multi-agent system",
     "This is the diagnostic signature of the sequential anti-pattern",
     "The model being used is simply too slow",
     "The subagents need more allowed_tools"
    ],
    "correct": 1,
    "explain": "An Nx slowdown for N independent subtasks strongly points to sequential (S1+S2+S3) rather than parallel (max) execution — a checkable, monitorable signal."
   },
   {
    "q": "Practice scenario: A coordinator spawns a web search subagent and a document analysis subagent SEQUENTIALLY across separate API turns. Web search takes 8 seconds, document analysis takes 12 seconds, for a total of 20 seconds. The two subagents investigate independent topics with no dependency on each other's results. How should the architect reduce this latency?",
    "opts": [
     "Upgrade both subagents to a faster model tier",
     "Emit both Task calls together within a single coordinator response so they execute in parallel",
     "Reduce max_tokens on both subagents to speed up generation",
     "Merge both subagents into a single combined agent"
    ],
    "correct": 1,
    "explain": "Since the two subtasks are genuinely independent, emitting both Task calls in one response lets them run in parallel — bounded by the slower one (12s) rather than the sum (20s), a real ~40% latency reduction from a purely structural change."
   },
   {
    "q": "By default, does a newly-spawned subagent inherit any part of the coordinator's prior conversation history?",
    "opts": [
     "Yes, all of it automatically",
     "No — zero historical context crosses the isolation barrier automatically",
     "Only the most recent turn",
     "Only tool results, not conversational turns"
    ],
    "correct": 1,
    "explain": "A subagent starts with a completely empty context — nothing from the coordinator's history crosses automatically."
   },
   {
    "q": "Practice scenario: A coordinator delegates to a data-collection agent (web_search, database_query) and an analysis agent (calculate, chart_generate). In testing, the analysis agent calls web_search directly to fetch extra context, bypassing the data-collection agent entirely. What's the architectural violation and the fix?",
    "opts": [
     "No real violation — any agent should be free to call any tool that helps it finish faster",
     "The analysis agent has been given (or found access to) a tool outside its assigned role",
     "The coordinator should be deleted and replaced with a single monolithic agent",
     "The fix is to rename web_search so the analysis agent no longer recognizes it"
    ],
    "correct": 1,
    "explain": "Role boundaries between subagents are only real if enforced through tool ACCESS (allowed_tools), not merely described in a prompt — removing the tool from the wrong agent's list makes the violation structurally impossible, not just discouraged."
   },
   {
    "q": "An architect is designing a standard for how coordinators should prompt subagents across an organization. What should be a mandatory checklist item, based on the context isolation airlock?",
    "opts": [
     "Ensuring every subagent has access to every tool available",
     "For each spawned subagent, explicitly verifying which specific facts it needs are actually written into its Task tool prompt field",
     "Always using the largest available model for every subagent",
     "Skipping the prompt field entirely to save tokens"
    ],
    "correct": 1,
    "explain": "Since nothing crosses the isolation barrier automatically, an organizational standard must make explicit context injection a checked, mandatory step rather than an assumption."
   },
   {
    "q": "Under high traffic, an agent occasionally calls process_refund using only a customer's stated name, skipping get_customer entirely, and misidentifies accounts. Strengthening the system prompt and adding few-shot examples showing the correct order both fail to fully fix it. Why, and what's the correct fix?",
    "opts": [
     "Both fixes are actually sufficient, the team just needs to try harder wording",
     "Both remain probabilistic — a financial operation needs a deterministic guarantee",
     "The fix is simply to remove process_refund as a tool entirely",
     "This can only be fixed by using a more capable model"
    ],
    "correct": 1,
    "explain": "Prompt-level fixes (wording, examples) never reach a true 100% guarantee — a programmatic prerequisite gate is the only mechanism that structurally cannot be skipped."
   },
   {
    "q": "A team proposes fixing the process_refund/get_customer ordering problem by routing all refund requests through a 'specialized verification-first pipeline' via a routing classifier. Why doesn't this actually solve the problem?",
    "opts": [
     "Routing classifiers don't exist as a real concept",
     "A routing classifier determines WHICH agent handles a request",
     "This fix works perfectly and is the recommended solution",
     "Routing classifiers can only be used for language detection"
    ],
    "correct": 1,
    "explain": "Routing solves 'which pipeline handles this,' not 'does this specific pipeline enforce the right internal call order' — the fix has to live inside the agent's own execution as a prerequisite gate, not at the dispatch layer."
   },
   {
    "q": "Should a coordinator always route every incoming request through the full fixed pipeline of every available subagent, regardless of the request's actual complexity?",
    "opts": [
     "Yes, always use the full pipeline for consistency",
     "No — the coordinator should analyze each query's actual requirements and dynamically select only the subagents genuinely needed",
     "Yes, but only for requests longer than 100 words",
     "No, subagents should never be used for any request"
    ],
    "correct": 1,
    "explain": "Good coordinator design calibrates decomposition breadth to the query's real complexity — neither a fixed full-pipeline default nor an overly narrow decomposition serves every request well."
   },
   {
    "q": "A multi-agent system researching 'AI's impact on creative industries' produces a final report covering only visual arts, missing music, writing, and film — even though every individual subagent completed its assigned task correctly. Where should you look first to diagnose this?",
    "opts": [
     "The web-search subagent's queries — they must not be comprehensive enough",
     "The coordinator's task-decomposition logs",
     "The document-analysis subagent's relevance filtering",
     "A bigger model is needed across all subagents"
    ],
    "correct": 1,
    "explain": "When every subagent's work checks out individually but coverage is missing, the root cause is almost always the coordinator's decomposition — blaming a correctly-functioning downstream agent wastes debugging effort on the wrong layer."
   },
   {
    "q": "Practice scenario: A multi-agent research system produces a report on 'renewable energy technologies' that only covers solar and wind, missing geothermal, tidal, biomass, and nuclear fusion. Each subagent produced thorough, accurate coverage of its assigned topic. Where is the root cause?",
    "opts": [
     "Each subagent's search queries were too narrow within its own topic",
     "The coordinator's initial decomposition — it only identified and assigned subtasks for solar and wind, never assigning any subagent to the missing categories at all",
     "The synthesis agent dropped the missing categories during report assembly",
     "The model tier used for the subagents is too weak to know about geothermal and tidal energy"
    ],
    "correct": 1,
    "explain": "Identical diagnostic pattern to the creative-industries case — thorough execution of an incomplete assignment means the coordinator's decomposition, not any subagent's execution, is where the actual gap lives."
   },
   {
    "q": "Given the renewable-energy coverage gap (only solar/wind covered), would adding a third or fourth subagent fix the problem?",
    "opts": [
     "Yes, more subagents always improve coverage",
     "No — if the coordinator's decomposition logic only identified solar and wind as relevant subtopics, an additional subagent would simply receive an equally narrow assignment from that same flawed logic",
     "Yes, but only if the new subagents use a bigger model",
     "No, but only because this specific topic has exactly two subtopics"
    ],
    "correct": 1,
    "explain": "Adding workers doesn't fix what those workers get assigned — a narrow decomposition step produces narrow assignments regardless of how many subagents exist to execute them."
   },
   {
    "q": "Two subagents are both assigned to research 'competitor analysis' and end up searching the identical set of industry news sites. What coordinator responsibility was missing?",
    "opts": [
     "Error handling",
     "Research scope partitioning",
     "Session resumption",
     "Model tier selection"
    ],
    "correct": 1,
    "explain": "Without deliberate scope partitioning, subagents given the same broad topic tend to independently cover overlapping ground while other angles go unaddressed."
   },
   {
    "q": "How does the coordinator's 'iterative refinement' responsibility differ from the general evaluator-optimizer workflow pattern?",
    "opts": [
     "They are identical concepts with different names",
     "Evaluator-optimizer is a general produce-check-refine loop usable for many task types",
     "Iterative refinement only applies outside multi-agent systems",
     "Evaluator-optimizer cannot be used by a coordinator"
    ],
    "correct": 1,
    "explain": "Iterative refinement is the coordinator's specific coverage-focused responsibility, distinct from the broader general-purpose evaluator-optimizer pattern, even though both share a check-and-retry shape."
   },
   {
    "q": "Current Claude Code technically permits a subagent to spawn further subagents. Does this make direct subagent-to-subagent communication (bypassing the coordinator) a correct answer on a hub-and-spoke scenario question?",
    "opts": [
     "Yes, since it reflects current product capability",
     "No — the exam tests the architectural principle of centralized routing",
     "Only correct for systems with exactly 2 subagents",
     "Only correct if both subagents use the same model tier"
    ],
    "correct": 1,
    "explain": "The nuance is real-world context worth knowing, but the exam is testing the underlying principle (observability, consistent error handling, controlled information flow) — not a literal claim about every product capability."
   },
   {
    "q": "At the architecture level, is a real production system usually 100% workflow or 100% agent?",
    "opts": [
     "Always 100% agent for flexibility",
     "Always 100% workflow for predictability",
     "Usually a mix — a predictable workflow shell with agentic pieces embedded where genuine flexibility is needed",
     "It's random"
    ],
    "correct": 2,
    "explain": "Most real systems combine both, using each where it fits, rather than choosing one pattern universally."
   },
   {
    "q": "What architectural question should you ask about an agent that might loop without converging?",
    "opts": [
     "Nothing, agents always converge",
     "What's the maximum iteration limit before forcing a stop and escalating to a human?",
     "Just let it run forever",
     "Switch to a bigger model and hope"
    ],
    "correct": 1,
    "explain": "Reliable systems need a defined ceiling and escalation path for non-convergence, not an open-ended loop."
   },
   {
    "q": "A scenario describes high-volume document processing with strict schemas, run overnight. Which architecture archetype is this, and what should you focus on?",
    "opts": [
     "Multi-agent systems — focus on coordination topology",
     "Structured data extraction — focus on schema design and Batch API tradeoffs",
     "Developer productivity tooling — focus on tool use",
     "Customer support orchestration — focus on escalation"
    ],
    "correct": 1,
    "explain": "Recognizing the archetype (structured extraction, here) points directly at the relevant concerns: schema reliability and batch processing."
   },
   {
    "q": "In the architect's hierarchy of constraints, what's the mitigation for a COMPLIANCE requirement, and why is it categorically different from the other three constraints?",
    "opts": [
     "Few-shot prompts, same as accuracy",
     "Application-layer intercepts (hooks)",
     "Batch APIs, same as cost",
     "Caching, same as latency"
    ],
    "correct": 1,
    "explain": "Compliance is the one constraint that cannot tolerate a best-effort fix — it requires deterministic, code-level enforcement."
   },
   {
    "q": "When is a shared-memory multi-agent topology the more deliberate architectural choice than hub-and-spoke?",
    "opts": [
     "Always, it's strictly better",
     "For genuinely collaborative, exploratory work where agents benefit from real-time cross-referencing of each other's findings",
     "Never, hub-and-spoke should always be used",
     "Only when there are fewer than 2 agents"
    ],
    "correct": 1,
    "explain": "The choice is a deliberate tradeoff: shared-memory trades centralized observability for richer collaboration, appropriate for specific collaborative tasks."
   },
   {
    "q": "In the policy-constraint orchestration pattern, what three underlying concepts does the 'policy violation routes to human reviewer' step combine?",
    "opts": [
     "Caching, batching, and streaming",
     "A guardrail/hook enforced at the application layer",
     "Prompt engineering, few-shot examples, and JSON schemas",
     "Only one concept — escalation"
    ],
    "correct": 1,
    "explain": "This named architecture synthesizes guardrails, reliable escalation, and human-approval resumption into one recognizable pattern."
   },
   {
    "q": "In the architect's reference matrix, which named technique addresses TOKEN BLOAT specifically for a multi-agent system archetype?",
    "opts": [
     "Batch Routing",
     "Schema Redundancy",
     "Shared Vector Store",
     "App-Layer Intercepts"
    ],
    "correct": 2,
    "explain": "A shared vector store (with semantic search) is the multi-agent-specific answer to token bloat, distinct from scratchpad files (developer productivity) or filtering stale results (customer support)."
   },
   {
    "q": "Why are some cells in the architect's reference matrix deliberately left empty rather than filled with a technique?",
    "opts": [
     "The matrix is incomplete and was never finished",
     "Not every constraint is a dominant concern for every archetype",
     "Empty cells indicate the archetype doesn't exist",
     "This is a formatting error"
    ],
    "correct": 1,
    "explain": "The matrix reflects which constraint is actually dominant for which archetype — forcing a technique into every cell would misrepresent where the real pressure lies."
   },
   {
    "q": "In the production architecture blueprint, what sits directly behind the granular tools in the execution layer, guarding the core?",
    "opts": [
     "Nothing, tools execute with no oversight",
     "Application-layer intercepts",
     "A second copy of the pattern router",
     "The synthesis stage"
    ],
    "correct": 1,
    "explain": "Application-layer intercepts sit between granular tools and their effects, enforcing hard rules rather than leaving compliance to prompts."
   },
   {
    "q": "What is the practical value of holding the production architecture blueprint as a single mental model for the exam?",
    "opts": [
     "It's purely decorative and not actually tested",
     "A new, unfamiliar scenario question is very often just asking you to fill in one or two boxes of this same underlying skeleton",
     "It replaces the need to know any individual technique",
     "It only applies to customer support scenarios"
    ],
    "correct": 1,
    "explain": "Recognizing the blueprint's skeleton lets you quickly map a new scenario onto router/execution/state/synthesis roles you already understand deeply."
   },
   {
    "q": "An agent needs to draft an email AND immediately request review before sending. Should this be a workflow, an agent, or a hybrid?",
    "opts": [
     "Pure agent — email drafting always needs full autonomy",
     "Pure workflow — it can never involve any model judgment",
     "A hybrid: the drafting step can be workflow-scripted",
     "Neither pattern applies to email tasks"
    ],
    "correct": 2,
    "explain": "Most real systems combine both — the review gate is a fixed, known step (workflow), while drafting may need adaptive judgment (agent)."
   },
   {
    "q": "stop_reason returns max_tokens on a response your pipeline expected to contain complete JSON. What's the safe action?",
    "opts": [
     "Parse and use the JSON as-is, it's probably fine",
     "Treat it as potentially incomplete — don't trust it as final",
     "Ignore stop_reason and check content length instead",
     "Automatically switch models"
    ],
    "correct": 1,
    "explain": "max_tokens means the response was cut off before completion — trusting a possibly-truncated JSON blindly risks corrupted downstream data."
   },
   {
    "q": "Why is 'iteration cap as primary stop condition' considered an anti-pattern rather than good defensive engineering?",
    "opts": [
     "Iteration caps should never be used at all, even as a backstop",
     "Using it as the PRIMARY stop (instead of stop_reason) can cut off a task that legitimately needed more steps, or let a truly-finished task run needlessly long",
     "Iteration caps are always wrong regardless of role",
     "This only matters for the Claude Agent SDK"
    ],
    "correct": 1,
    "explain": "The correct design uses stop_reason as primary and the iteration cap purely as a defensive ceiling against a genuinely stuck loop."
   },
   {
    "q": "An agent sometimes terminates prematurely because a text block appears alongside a tool_use block and a naive check mistakes the text for completion. A developer proposes forcing tool_choice to 'any' so the agent can never return text. What's wrong with this fix?",
    "opts": [
     "Nothing, this correctly solves the premature-termination problem",
     "It forces a tool call even once the agent is genuinely finished",
     "tool_choice: 'any' is not a real parameter",
     "This fix works but only for the first 10 iterations"
    ],
    "correct": 1,
    "explain": "This is a tempting but incorrect fix — solving a completion-detection bug by removing the model's ability to ever signal completion just trades one bug for a worse one (an infinite loop)."
   },
   {
    "q": "A PostToolUse hook normalizes a timestamp format after a tool call returns. Could this same normalization instead be done via a PreToolUse hook?",
    "opts": [
     "Yes, with identical effect either way",
     "No — PreToolUse fires BEFORE the tool executes, so there is no tool result yet to normalize",
     "PreToolUse and PostToolUse are interchangeable names for the same hook",
     "Normalization can only happen in the system prompt"
    ],
    "correct": 1,
    "explain": "PreToolUse can only inspect/modify the outgoing call; PostToolUse is the only point with the actual result available to normalize."
   },
   {
    "q": "Why does hub-and-spoke's single-coordinator design make post-incident debugging easier than a fully peer-to-peer subagent mesh would?",
    "opts": [
     "It doesn't, debugging difficulty is the same either way",
     "Every message passing through one coordinator means there's a single place with complete visibility into the whole exchange history",
     "Hub-and-spoke systems never fail",
     "Debugging is only relevant for shared-memory topologies"
    ],
    "correct": 1,
    "explain": "Centralized routing is what gives you one place to look for the full picture after something goes wrong."
   },
   {
    "q": "A coordinator's four responsibilities are decomposition, delegation, aggregation, and error handling. If a coordinator handles the first three well but has no defined error-handling behavior, what's the architectural risk?",
    "opts": [
     "No risk, three out of four is sufficient",
     "It may silently produce a confidently-wrong aggregated result the moment any subagent fails",
     "The system will automatically compensate",
     "This only matters in shared-memory topologies"
    ],
    "correct": 1,
    "explain": "Missing error handling means a subagent failure can go completely undetected in the final synthesized output."
   },
   {
    "q": "A coordinator delegates researching 'competitor analysis' to two subagents, but both end up searching the exact same set of industry news sites, wasting effort on duplicate coverage. What coordinator responsibility was missing?",
    "opts": [
     "Error handling",
     "Research scope partitioning",
     "Result aggregation",
     "Session resumption"
    ],
    "correct": 1,
    "explain": "Without deliberate scope partitioning, subagents given the same broad topic tend to independently search overlapping sources, wasting effort while other angles go unexplored."
   },
   {
    "q": "How does 'iterative refinement' as a coordinator responsibility differ from the general evaluator-optimizer WORKFLOW pattern?",
    "opts": [
     "They are exactly the same thing with different names",
     "Evaluator-optimizer is a general produce-check-refine loop applicable to many task types",
     "Iterative refinement only applies to code generation tasks",
     "Evaluator-optimizer is only used in single-agent systems, never coordinators"
    ],
    "correct": 1,
    "explain": "Iterative refinement is the coordinator's specific ongoing coverage-checking responsibility, not a separately bolted-on architectural pattern — though both share the general 'check and re-try' shape."
   },
   {
    "q": "Current Claude Code technically allows a subagent to spawn further subagents (nested delegation). On a scenario question, is proposing direct subagent-to-subagent communication (bypassing the coordinator) ever the correct answer?",
    "opts": [
     "Yes, since current Claude Code technically supports nested subagent hierarchies",
     "No — the exam tests the strict hub-and-spoke PRINCIPLE (centralized routing enables observability, consistent error handling, controlled information flow)",
     "Only correct if the subagents are working on unrelated tasks",
     "Only correct in systems with fewer than 3 subagents"
    ],
    "correct": 1,
    "explain": "Know the real-world nuance, but don't let it override what's being tested — the exam wants the architectural principle applied, not a literal claim about every current product capability."
   },
   {
    "q": "Why is Task tool access restricted to coordinators and deliberately-designed hierarchical sub-coordinators, never standard subagents by default?",
    "opts": [
     "To save on token costs only",
     "To prevent uncontrolled recursive delegation",
     "Because standard subagents technically cannot call any tools",
     "This restriction is arbitrary and has no real justification"
    ],
    "correct": 1,
    "explain": "This is least privilege applied to agent hierarchies — only roles that genuinely need to delegate get delegation authority."
   },
   {
    "q": "A coordinator dispatches to three subagents in one response for genuinely independent subtasks. Why is this the 'parallel' pattern and not 'dispatcher'?",
    "opts": [
     "They're the same pattern with different names",
     "Dispatcher sends the WHOLE task to exactly ONE specialist",
     "Parallel only ever involves two subagents",
     "Dispatcher is always faster than parallel"
    ],
    "correct": 1,
    "explain": "Dispatcher = one task, one specialist. Parallel = multiple independent pieces, multiple subagents, running concurrently."
   },
   {
    "q": "In the shared-memory topology, why does using a vector store with semantic search (rather than daisy-chained conversation logs) also protect against pipeline crashes?",
    "opts": [
     "Vector stores are crash-proof by design",
     "State is decoupled from any single agent's live process",
     "Crashes never occur in shared-memory systems",
     "This is unrelated to crash resilience"
    ],
    "correct": 1,
    "explain": "Because findings are persisted externally rather than living only in a process's memory, a mid-pipeline failure doesn't erase what was already discovered."
   },
   {
    "q": "A subagent is given the instruction 'Step 1: search X. Step 2: read Y. Step 3: extract Z' and fails rigidly on a topic that doesn't fit this script. What's the architectural fix, and why does it work better than adding more steps?",
    "opts": [
     "Add Step 4, 5, 6 to cover more cases — eventually the script will be complete",
     "Switch to goal-oriented delegation (specify the target and quality criteria, let the subagent choose its own strategy)",
     "Remove the subagent's tools entirely",
     "Switch to a bigger model with the same rigid script"
    ],
    "correct": 1,
    "explain": "Procedural scripts are inherently brittle against novelty; goal-oriented delegation lets the subagent's own reasoning handle cases a script-writer couldn't foresee."
   },
   {
    "q": "Three heterogeneous subagents (financial JSON, prose news, patent lists) feed a synthesis agent directly with their raw native outputs. What specific failure results, and what's the fix?",
    "opts": [
     "No failure results, raw outputs are always fine to combine directly",
     "Structured data loses clarity and narrative loses flow when forced into an incompatible shape during synthesis",
     "The synthesis agent will automatically detect and fix formatting issues",
     "This scenario cannot occur in a well-designed system"
    ],
    "correct": 1,
    "explain": "A standardized intermediate representation (e.g. claim/evidence/source/confidence) gives the synthesis agent one consistent shape to reason over."
   },
   {
    "q": "Why is the citation rule (requiring subagents to output claim-source mappings, preserved through synthesis) necessary even when a format-conversion layer already standardizes output structure?",
    "opts": [
     "It isn't necessary once structure is standardized",
     "Standardizing STRUCTURE doesn't automatically preserve WHICH source a claim came from",
     "Citation rules replace the need for a format-conversion layer",
     "Citations only matter for academic use cases"
    ],
    "correct": 1,
    "explain": "Format standardization and attribution preservation are separate concerns — solving one doesn't automatically solve the other."
   },
   {
    "q": "In the policy-constraint orchestration pattern, why must the constraint check be an application-layer intercept rather than a system-prompt instruction telling the agent to 'check policy before acting'?",
    "opts": [
     "There's no meaningful difference between the two approaches",
     "A system-prompt instruction is only probabilistically followed",
     "System prompts are always more reliable than hooks",
     "Constraint checks are optional in this pattern"
    ],
    "correct": 1,
    "explain": "The same hooks-vs-prompts determinism distinction applies — a gating check on consequential actions needs deterministic enforcement."
   },
   {
    "q": "A developer fixes three bugs overnight, then resumes yesterday's Claude Code session the next morning with `--resume`. Claude confidently recommends fixes for issues that no longer exist. What's the root cause?",
    "opts": [
     "`--resume` is broken and should never be used",
     "Resumption restores the FULL prior history verbatim, including now-stale tool results from before the files were edited",
     "The developer should have used a higher-tier model",
     "Claude Code cannot detect any file changes under any circumstances"
    ],
    "correct": 1,
    "explain": "Named resumption is a verbatim history restore — it has no built-in mechanism to detect that underlying files changed since the session ended, which is exactly why stale tool results can misdirect the model."
   },
   {
    "q": "A developer wants to compare two different refactoring approaches starting from the same completed codebase analysis, without either exploration affecting the other. Which mechanism fits?",
    "opts": [
     "`--resume` with the same session name twice",
     "`fork_session` (or `/branch` + `--fork-session`), creating two independent branches from the shared baseline",
     "Starting two unrelated fresh sessions with no shared context at all",
     "Manually copying the conversation transcript into a text file"
    ],
    "correct": 1,
    "explain": "Forking is specifically for exploring DIVERGENT approaches from one shared starting point — each branch proceeds independently afterward."
   },
   {
    "q": "After resuming a session where 3 of 50 previously-analyzed files were edited, what's the most efficient correct approach — beyond simply avoiding stale tool results?",
    "opts": [
     "Re-explore and re-read all 50 files from scratch to be safe",
     "Inject a summary of prior findings, then explicitly tell the agent which 3 files changed so only those get targeted re-analysis",
     "Ignore the file changes entirely and proceed with the original analysis",
     "Always use `fork_session` whenever any file has changed"
    ],
    "correct": 1,
    "explain": "Full re-exploration wastes effort on 47 files whose analysis is still valid — naming the specific changed files for targeted re-analysis preserves that work while fixing exactly what's stale."
   },
   {
    "q": "Why might a fresh session with an injected summary outperform `--resume` even when NO files have changed since the session ended?",
    "opts": [
     "`--resume` is deprecated",
     "A very long, cluttered history full of resolved side-conversations and dead ends can itself degrade performance compared to a curated, purpose-written summary",
     "Fresh sessions always cost less regardless of content",
     "`--resume` cannot restore tool results under any circumstances"
    ],
    "correct": 1,
    "explain": "Even with valid content, an extremely long verbatim history has its own cost — a well-written summary of what actually matters can be a more reliable foundation than dragging forward hundreds of turns of noise."
   },
   {
    "q": "What must happen before a session can later be resumed by name with `claude --resume <name>`?",
    "opts": [
     "Nothing — every session is automatically resumable by a random ID only",
     "The session must be named, either at startup or mid-session (e.g. via `/rename`)",
     "Named resumption does not exist in Claude Code",
     "The session must first be forked"
    ],
    "correct": 1,
    "explain": "Named resumption depends on the session having been given a name — otherwise it's only resumable by session ID or through the interactive picker, not by a memorable name."
   },
   {
    "q": "In an AgentDefinition (the Task tool's spawn payload), what happens if the `tools` field is omitted entirely?",
    "opts": [
     "The subagent gets NO tools at all",
     "The subagent inherits every tool available to subagents — omitting `tools` is not the same as restricting it",
     "This is a configuration error that always crashes the spawn",
     "The subagent inherits the coordinator's exact conversation history instead"
    ],
    "correct": 1,
    "explain": "Omitting `tools` is a wide-open default, not a restriction — genuine least-privilege scoping requires explicitly listing which tools the subagent may use."
   },
   {
    "q": "A support bot built directly on the raw Messages API loses track of a customer's order number three turns after it was mentioned. The developer insists 'the session should remember it.' What is actually wrong?",
    "opts": [
     "The model has a bug and needs to be restarted",
     "The Messages API is stateless — every call must resend the FULL conversation history (including prior tool_use/tool_result pairs) as the `messages` array, and the developer's code was truncating or omitting it",
     "The customer needs to repeat the order number every time by design",
     "This can only be fixed by upgrading to a higher-tier model"
    ],
    "correct": 1,
    "explain": "There is no server-side conversation memory in the raw API — 'remembering' is entirely the caller's responsibility to resend prior turns verbatim on every request."
   },
   {
    "q": "A developer runs `claude --resume auth-investigation` the next morning and Claude immediately continues reasoning about yesterday's OAuth bug with full context of files it had read. Under the hood, what mechanism makes this possible, given that the underlying Messages API has no memory of its own?",
    "opts": [
     "Claude Code has a special stateful API endpoint that the public API doesn't have",
     "Claude Code stores the full transcript locally and resends it (rebuilding the exact `messages` array, including tool_use/tool_result pairs) as the first request of the resumed session",
     "The model itself remembers past sessions across restarts",
     "`--resume` only restores file state, not conversation content"
    ],
    "correct": 1,
    "explain": "`--resume` is a client-side convenience: it reconstructs and resends the stored history so the stateless API sees a continuous conversation, even though the API itself never held any state between calls."
   },
   {
    "q": "Why must a resent conversation history preserve the exact pairing and order of `tool_use` and `tool_result` blocks, rather than just including 'the important text parts'?",
    "opts": [
     "Pairing doesn't matter, only the text content is used",
     "The API enforces a strict structural contract between tool calls and their results — dropping or reordering a `tool_result` relative to its `tool_use` produces a malformed request the API will reject or misinterpret",
     "Tool results are ignored by the model entirely",
     "This only matters for streaming responses"
    ],
    "correct": 1,
    "explain": "The tool_use/tool_result linkage is structural, not cosmetic — every tool_use block requires its matching tool_result before the conversation can validly continue."
   },
   {
    "q": "A billing-dispute agent runs in a loop calling tools based on `stop_reason:\"tool_use\"`, expecting the loop to end when `stop_reason` becomes `\"end_turn\"`. After 40 turns it silently stops responding without ever reaching `end_turn` or resolving the dispute. What's missing architecturally?",
    "opts": [
     "Nothing is missing — silent stopping after many turns is expected behavior",
     "An orchestration-layer safeguard wrapping the entire loop that guarantees every session terminates in either a completed resolution or an explicit human escalation, regardless of how the inner loop exits",
     "A higher `max_tokens` setting would have prevented this",
     "The agent needed a `PostToolUse` hook instead"
    ],
    "correct": 1,
    "explain": "Relying only on `stop_reason` leaves a gap: hitting an iteration cap, an error, or context exhaustion can end the loop with nothing resolved and no one notified — the fix is an outer layer that always produces one of two outcomes."
   },
   {
    "q": "What is the key architectural difference between a `resolution_state` safeguard (pending/resolved/escalated) wrapping an agent loop, and a `PostToolUse` hook?",
    "opts": [
     "They are the same mechanism with different names",
     "A `PostToolUse` hook fires after individual tool calls to enforce per-action rules; the resolution-state safeguard governs the OUTCOME of the entire session as a whole, independent of which tools were called or how many turns it took",
     "`PostToolUse` hooks can only be used in Claude Code, never in custom orchestration",
     "Resolution-state safeguards replace the need for any hooks"
    ],
    "correct": 1,
    "explain": "Hooks intercept individual tool-call events; a session-level termination guarantee is a property of the outer orchestration loop, not of any single tool interaction."
   },
   {
    "q": "A code-review task for a 5-file PR is implemented as: Step 1 always summarizes the diff, Step 2 always checks style, Step 3 always checks tests, Step 4 always posts a comment — the same steps every time regardless of what the diff contains. What decomposition strategy is this, and when is it appropriate?",
    "opts": [
     "Dynamic adaptive decomposition — because it happens automatically",
     "Fixed prompt chaining — appropriate because the task's steps and their order are stable and predictable across virtually every invocation",
     "This is not a valid decomposition strategy at all",
     "Fixed prompt chaining — appropriate because the diffs are always small"
    ],
    "correct": 1,
    "explain": "Fixed chains fit tasks whose shape doesn't change: same steps, same order, every time — the review workflow here never needs to reconsider what step comes next."
   },
   {
    "q": "A task is defined as 'add comprehensive test coverage to a legacy codebase with no existing test infrastructure.' Why does this call for dynamic, adaptive decomposition rather than a fixed chain?",
    "opts": [
     "Because the task involves writing code",
     "Because the concrete steps depend on what's discovered along the way (test framework choice, module boundaries, existing conventions) — the plan can't be fully fixed in advance and must adapt as findings come in",
     "Fixed chains are never appropriate for any coding task",
     "Because legacy codebases always require more tool calls than new ones"
    ],
    "correct": 1,
    "explain": "When step N's shape depends on what step N-1 discovers, the plan must be built incrementally as the agent learns — that's the adaptive case, unlike a review workflow whose steps are known up front."
   },
   {
    "q": "What is the trap in assuming 'this task is complex, therefore it needs dynamic decomposition'?",
    "opts": [
     "Complex tasks always need dynamic decomposition, there is no trap",
     "Complexity and predictability are different axes — a task can be complex but have a fully predictable, fixed sequence of steps (fits a chain), while a simple-sounding task can be unpredictable enough to need adaptive planning",
     "Simple tasks always need dynamic decomposition instead",
     "Dynamic decomposition is strictly superior and should always be preferred regardless of task shape"
    ],
    "correct": 1,
    "explain": "The deciding factor is whether the NEXT step is knowable in advance, not how hard or how many steps the task has — a complex-but-stable workflow still fits a fixed chain."
   },
   {
    "q": "An agent ends its turn with end_turn after writing 'I looked into this but could not determine the cause'. The ticket remains unresolved and unescalated. What is the architectural gap?",
    "opts": [
     "The system prompt needs stronger wording about escalating",
     "No orchestration-layer check of an explicit resolution state after the loop exits",
     "The model tier is too small to finish the task",
     "stop_reason should have been max_tokens"
    ],
    "correct": 1,
    "explain": "end_turn means the model chose to stop, not that the task is resolved. The guarantee must be code outside the loop that checks an explicit resolution state and forces escalation when it is still pending."
   },
   {
    "q": "Which design guarantees that a session ends in resolution or escalation even when the loop exits through an uncaught exception?",
    "opts": [
     "An instruction telling the model to always resolve or escalate",
     "An extra final-check turn added at the end of the loop",
     "A wrapper around the loop with a finally-step that escalates if the state is still pending",
     "A PostToolUse hook on every tool"
    ],
    "correct": 2,
    "explain": "A finally-step outside the loop runs on every exit path. A final-check turn inside the loop cannot run if the loop dies, and hooks govern tool calls, not loop exit."
   },
   {
    "q": "A container running an agent session is killed with SIGKILL. The wrapper's finally-block never ran. What additionally guarantees a terminal state?",
    "opts": [
     "A longer system prompt",
     "Durable session state written as the session progresses, plus a watchdog that escalates stale pending sessions",
     "Raising the iteration cap",
     "Switching to the Batch API"
    ],
    "correct": 1,
    "explain": "Process death bypasses finally. Persisted resolution state and progress, plus a sweeper that escalates sessions stuck pending past a timeout, cover infrastructure-level termination."
   },
   {
    "q": "A response arrives with stop_reason max_tokens while a pipeline expected complete JSON. What should happen?",
    "opts": [
     "Parse it, the JSON is probably complete",
     "Treat it as incomplete and continue, raise the limit or chunk the task",
     "Mark the session resolved",
     "Ignore stop_reason and inspect the text for a closing brace"
    ],
    "correct": 1,
    "explain": "max_tokens means the output was cut off. It is not a terminal state, and trusting truncated JSON risks corrupting downstream data."
   },
   {
    "q": "A reviewer approves a refund that an agent escalated. How should the orchestrator continue the work?",
    "opts": [
     "Restart the conversation and re-ask the customer",
     "Re-run the full investigation from turn 1",
     "Resume the agent with the approval injected as structured authorization state",
     "Let the human type the refund manually and close the session"
    ],
    "correct": 2,
    "explain": "Continuation should carry the decision forward as structured authorization state so the agent neither repeats work nor re-asks the customer."
   },
   {
    "q": "A customer writes 'get me a human, now' on a simple, in-policy request. What is the correct behavior?",
    "opts": [
     "Keep investigating until resolved, then escalate only if it fails",
     "Escalate immediately, with a full handoff package",
     "Ask three clarifying questions first",
     "Offer the fix and escalate only if they ask again"
    ],
    "correct": 1,
    "explain": "An explicit request for a human is honored immediately, but the handoff package is still built so the human does not restart from zero. Offering the fix first applies when the customer merely expresses frustration without asking for a human."
   },
   {
    "q": "Which item does NOT belong in a handoff package for a human taking over an escalated session?",
    "opts": [
     "Actions already taken and their results",
     "Authorization state, including limits already consumed",
     "A raw dump of the entire token stream with no structure",
     "What remains unresolved and a suggested next step"
    ],
    "correct": 2,
    "explain": "A handoff package is structured, curated context. An unstructured dump makes the human restart the investigation, defeating the purpose."
   },
   {
    "q": "An agent's tool has failed three consecutive times. What does a well-designed orchestration layer do?",
    "opts": [
     "Keep retrying with exponential backoff forever",
     "Treat the failure-count threshold as an escalation trigger and hand off with error details",
     "Silently return an empty result",
     "Raise the model's temperature"
    ],
    "correct": 1,
    "explain": "A failure counter crossing its threshold is a reason to escalate; unbounded retries and silent empty results are named anti-patterns."
   },
   {
    "q": "Four well-described subagents exist, but the coordinator never delegates and answers everything itself. What is the FIRST thing to check?",
    "opts": [
     "Rewrite each subagent description with more examples",
     "Whether the coordinator has the Task tool available, and whether the agents are loaded and mentioned in its instructions",
     "Increase the coordinator's model size",
     "Give every subagent all available tools"
    ],
    "correct": 1,
    "explain": "This is a never-invoked (enablement) problem, not a misrouting problem. Without Task available, or without the agents loaded and delegation encouraged, description quality is irrelevant."
   },
   {
    "q": "How does never-invoked differ from misrouted subagents?",
    "opts": [
     "They are the same problem",
     "Never-invoked is an enablement problem; misrouted is a selection problem fixed through descriptions, tool distribution or prompt keywords",
     "Misrouting only happens in shared-memory systems",
     "Never-invoked is fixed by lowering temperature"
    ],
    "correct": 1,
    "explain": "If the wrong subagent is chosen, descriptions and tool scoping matter. If none is invoked, check the Task tool, loaded definitions and coordinator instructions."
   },
   {
    "q": "Document-search and web-search subagents finish, yet the synthesizer says it received no findings. Most reliable fix?",
    "opts": [
     "Tell the synthesizer to read the other agents' outputs",
     "Enlarge the synthesizer's context window",
     "Have the coordinator receive each output and inject it, as structured data, into the synthesizer's prompt",
     "Let the subagents write to each other directly"
    ],
    "correct": 2,
    "explain": "Subagents do not share memory or history. The coordinator must explicitly pass findings, preferably structured with sources, into the next agent's prompt."
   },
   {
    "q": "A coordinator runs three independent subagents in separate turns taking 3s, 4s and 5s. What is the best change and the resulting latency?",
    "opts": [
     "Emit all three Task calls in one response; about 5s",
     "Use a bigger model; about 6s",
     "Merge the subagents into one; about 12s",
     "Run them sequentially with caching; about 9s"
    ],
    "correct": 0,
    "explain": "Independent subagents launched in a single response run concurrently, so latency approaches the slowest task instead of the sum."
   },
   {
    "q": "When must a coordinator NOT parallelize subagent calls?",
    "opts": [
     "When there are more than two subagents",
     "When one subagent needs another's output as input",
     "When the subagents use different tools",
     "Parallelism is always correct"
    ],
    "correct": 1,
    "explain": "Only independent work can be launched together. A dependency forces sequencing."
   },
   {
    "q": "A document agent takes 2+ minutes analyzing 12 embedded precedents. Which is the best design, assuming deliberate hierarchical design is allowed?",
    "opts": [
     "The coordinator partitions precedents and runs several document agents, then merges",
     "The document agent, designed as a bounded sub-coordinator, spawns specialized subagents per precedent and returns a compact structured result",
     "An unbounded recursive hierarchy that re-checks each precedent",
     "Remove the precedent analysis"
    ],
    "correct": 1,
    "explain": "The agent that knows how precedents are embedded should own the decomposition. Coordinator-level partitioning couples it to specialist internals, and unbounded recursion risks runaway cost. The sub-coordinator needs bounded fan-out and depth."
   },
   {
    "q": "Four agents share 18 tools and frequently call tools outside their role. Best fix?",
    "opts": [
     "Lower the temperature",
     "Restrict each agent to the 4-5 tools its role needs and sharpen descriptions",
     "Add a fifth agent to supervise tool use",
     "Move all tool descriptions into the system prompt"
    ],
    "correct": 1,
    "explain": "Too many tools in scope degrades selection. Role-scoped tool sets plus precise descriptions are the documented fix."
   },
   {
    "q": "A response has stop_reason tool_use and contains both a text block and a tool_use block. What should the loop do?",
    "opts": [
     "Treat it as finished because text is present",
     "Execute the tool, append the result as a tool_result in a user message, and call again",
     "Discard the text and force tool_choice to any",
     "Stop and escalate"
    ],
    "correct": 1,
    "explain": "The decision comes from stop_reason, not from which block types appear."
   },
   {
    "q": "What does stop_reason pause_turn indicate?",
    "opts": [
     "The model refused the request",
     "A long-running server-tool turn was paused; resend the conversation including the assistant content to continue",
     "The output hit max_tokens",
     "The user interrupted the session"
    ],
    "correct": 1,
    "explain": "pause_turn is for paused server-side tool turns; the loop continues by sending the conversation back."
   },
   {
    "q": "A loop is written as 'for i in range(10)' and exits after ten iterations regardless of stop_reason. What is wrong?",
    "opts": [
     "Nothing, this is standard",
     "The cap is used as the primary exit, cutting off legitimately longer tasks; it should only be a defensive ceiling",
     "range is the wrong function",
     "It should use 100 iterations"
    ],
    "correct": 1,
    "explain": "stop_reason drives the loop; the cap is a backstop that should escalate when breached."
   },
   {
    "q": "A developer checks whether the reply text contains the word 'DONE' to end the loop. Why is this unreliable?",
    "opts": [
     "Text matching is case sensitive",
     "It is a probabilistic signal; completion phrasing varies and may appear mid-task, whereas stop_reason is structured",
     "The API hides text blocks",
     "DONE is a reserved word"
    ],
    "correct": 1,
    "explain": "Use the structured stop_reason, not parsed prose."
   },
   {
    "q": "Which task is best handled by DYNAMIC decomposition rather than a fixed prompt chain?",
    "opts": [
     "A standard four-aspect pull-request review",
     "A monthly invoice pipeline: extract, validate, post",
     "Finding why checkout latency doubled last week",
     "Formatting a fixed report template"
    ],
    "correct": 2,
    "explain": "Each finding decides the next investigative step, so the plan cannot be written in advance."
   },
   {
    "q": "A 12-step monthly payroll pipeline has identical steps every run. Which pattern fits?",
    "opts": [
     "Dynamic decomposition because it is complex",
     "Fixed prompt chain because it is predictable",
     "A shared-memory multi-agent swarm",
     "No pattern applies"
    ],
    "correct": 1,
    "explain": "Complexity and predictability are different axes; a long but predictable sequence is a chain."
   },
   {
    "q": "A system fetches data, investigates anomalies whose nature is unknown, then renders a templated report. Which description fits best?",
    "opts": [
     "Fully fixed chain",
     "Fully dynamic agent",
     "A fixed shell with one adaptive investigation step",
     "An evaluator-optimizer loop"
    ],
    "correct": 2,
    "explain": "Only the investigation step is unknowable in advance; the fetch and the templated report are fixed."
   },
   {
    "q": "Why does adding more subagents not fix an incomplete result from a fixed chain that missed a whole subtopic?",
    "opts": [
     "Subagents cannot run in parallel",
     "More workers cannot discover subtasks the plan never contained; the plan generation must be adaptive",
     "Subagents always duplicate each other's work",
     "It always does fix it"
    ],
    "correct": 1,
    "explain": "Coverage gaps originate in how the work was decomposed, not how many workers execute it."
   }
  ],
  "parts": [
   {
    "id": "a1-p1",
    "title": "From one API call to the agentic loop",
    "intro": "Every agent is built on one primitive, a single Messages API call, so we start with its roles and blocks and the tool round trip. Then we ask when you need an agent at all, how the loop is built from that round trip, and how stop_reason steers it."
   },
   {
    "id": "a1-p2",
    "title": "Stopping and controlling the loop",
    "intro": "A loop that can run needs two guarantees: it always ends in a real outcome, and critical rules are enforced by code rather than wording. Termination comes first because it frames what hooks must protect."
   },
   {
    "id": "a1-p3",
    "title": "Multi-agent topologies and the Task tool",
    "intro": "One loop becomes many: which shape connects them, and how does a coordinator spawn, brief and fence in each subagent? This part gives you the vocabulary the coordinator drills later rely on."
   },
   {
    "id": "a1-p4",
    "title": "The coordinator's judgment: decomposition and coverage",
    "intro": "With spawning mechanics in place, the question becomes what the coordinator should decide: which subagents, how to split the topic, and how to diagnose it when results come up short."
   },
   {
    "id": "a1-p5",
    "title": "Planning, state and sessions",
    "intro": "Decomposition can be fixed or adaptive, and either way the system must carry state forward. This part separates the fixed chain from the dynamic plan, then the stateless API from Claude Code's session tools."
   },
   {
    "id": "a1-p6",
    "title": "System design capstones",
    "intro": "Now zoom out from single mechanisms to whole systems: which parts are workflow, which agentic, which archetype and constraint you are facing, and how it all fits one blueprint."
   },
   {
    "id": "a1-p7",
    "title": "Exam mechanics and distractor traps",
    "intro": "Last, the knowledge becomes exam skill: how the exam is built and which wrong-answer patterns to name on sight."
   }
  ],
  "roadmap": {
   "kind": "roadmap",
   "title": "Agentic Architecture & Orchestration: the path",
   "parts": [
    {
     "t": "Call to loop",
     "items": [
      "Messages and roles",
      "Tool round trip",
      "stop_reason"
     ]
    },
    {
     "t": "Stop and control",
     "items": [
      "Guaranteed termination",
      "Hooks and gates",
      "Human approval"
     ]
    },
    {
     "t": "Multi-agent shapes",
     "items": [
      "Hub-and-spoke",
      "Task payload",
      "Context isolation",
      "Parallel spawning"
     ]
    },
    {
     "t": "Coordinator judgment",
     "items": [
      "Which subagents",
      "Coverage gaps",
      "Refinement"
     ]
    },
    {
     "t": "Plan and state",
     "items": [
      "Chain vs dynamic",
      "Stateless API",
      "Resume and fork"
     ]
    },
    {
     "t": "System design",
     "items": [
      "Archetypes",
      "Constraints",
      "Reference blueprint"
     ]
    },
    {
     "t": "Exam practice",
     "items": [
      "Scenario format",
      "Four distractor traps"
     ]
    }
   ]
  }
 },
 {
  "id": "a2",
  "title": "Claude Code Configuration & Workflows",
  "weight": "20%",
  "emoji": "⚙️",
  "intro": "Full mechanics of how Claude Code is configured — CLAUDE.md, imports, rules, skills, modes, and CI/CD — then the organization-scale governance layer on top. Weighted much more heavily than Developer's equivalent topic (20% vs. 3.1%) because Architect tests configuring Claude Code across an entire organization, not just one project.",
  "archHighlights": {
   "1": [
    "CLAUDE.md hierarchy, concatenation not override"
   ],
   "2": [
    "Subagent config, Skills, @path imports"
   ],
   "4": [
    "Hooks: PreToolUse/PostToolUse enforcement, permissions"
   ]
  },
  "sections": [
   {
    "id": "claudemd-three-levels",
    "part": "a2-p1",
    "legacy": 0,
    "h": "CLAUDE.md — three levels of instructions, concatenated not overridden",
    "bridge": "This is the starting point of the domain: before configuring anything else, you need to know which instruction files Claude loads and how they combine. The question here is who each CLAUDE.md level reaches and what happens when they disagree.",
    "diagram": {
     "kind": "layers",
     "title": "CLAUDE.md levels: all concatenated into context",
     "arrows": true,
     "layers": [
      {
       "t": "Directory-level CLAUDE.md",
       "sub": "Only when working in that subdirectory; loads last",
       "tone": "hi",
       "tag": "narrowest"
      },
      {
       "t": "Project-level CLAUDE.md",
       "sub": "Project root, version-controlled, every contributor",
       "tone": "ok",
       "tag": "shared"
      },
      {
       "t": "User-level CLAUDE.md",
       "sub": "Personal, all projects, not shared",
       "tone": "mute",
       "tag": "personal"
      }
     ]
    },
    "p": [
     "There are three distinct levels of CLAUDE.md. User-level (personal home-directory config) applies only to you, across every project — not shared, not version-controlled; personal preferences and working style belong here. Project-level (at the project root, checked into version control) applies to EVERY contributor — coding standards, testing standards, architectural decisions belong here, since anyone who clones the repo gets these automatically. Directory-level (a CLAUDE.md inside a specific subdirectory) applies only when working with files in that particular part of the codebase.",
     "A precise mechanical point: these levels are CONCATENATED together into context, not one strictly overriding another — nothing is deleted or excluded. More specific/nested content loads LATER, closer to the end of context. But on a GENUINE contradiction, don't overstate what this buys you: the official docs are explicit that 'Claude may pick one arbitrarily' — load order is a documented LOAD ORDER, not a precedence guarantee. CLAUDE.md is also delivered to the model as part of a USER MESSAGE, not the system prompt, which is exactly why Anthropic states there's 'no guarantee of strict compliance.'"
    ],
    "why": "The classic real-world mistake: a new team member doesn't receive the project's coding standards because those instructions were placed at the USER level (personal, not shared) instead of the PROJECT level (shared via version control). This isn't a precedence bug — it's a distribution problem: firm-wide standards belong in version-controlled project config, not personal user config. Separately, this is the EXACT OPPOSITE of `settings.json`, which has a REAL strict precedence chain (managed policy > local > project > user, managed always winning, enforced by the CLIENT regardless of what Claude decides). A rule that must hold on EVERY run — a blocked tool, a mandatory formatter — belongs in settings.json or a hook, never CLAUDE.md scoping. If a scenario asks 'which CLAUDE.md wins on a conflict,' the honest answer is 'neither is guaranteed to — move the rule to settings.json or a hook,' not 'more specific scope wins.'"
   },
   {
    "id": "claudemd-paths-monorepo",
    "part": "a2-p1",
    "legacy": 8,
    "h": "The exact CLAUDE.md paths, and a monorepo directory-level example",
    "bridge": "Now that you know the three levels, here are the literal locations and a concrete layout. The question is what exactly loads when you edit a file in a monorepo.",
    "diagram": {
     "kind": "hub",
     "title": "Monorepo: three sibling directory-level zones",
     "center": {
      "t": "One repository",
      "sub": "Editing in packages/api loads only its own file",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "infrastructure/",
       "sub": "CLAUDE.md",
       "items": [
        "Terraform rules"
       ]
      },
      {
       "t": "packages/api/",
       "sub": "CLAUDE.md",
       "items": [
        "NestJS patterns"
       ],
       "tone": "ok"
      },
      {
       "t": "packages/frontend/",
       "sub": "CLAUDE.md",
       "items": [
        "React conventions"
       ]
      }
     ],
     "note": "User-level file lives at ~/.claude/CLAUDE.md, never committed or shared."
    },
    "p": [
     "User-level CLAUDE.md lives at a literal, specific path: `~/.claude/CLAUDE.md` — never committed, never shared. A concrete monorepo example: `infrastructure/CLAUDE.md` (Terraform rules), `packages/api/CLAUDE.md` (NestJS patterns), and `packages/frontend/CLAUDE.md` (React conventions) — three sibling zones in the SAME repo, each activating only for its own directory and children."
    ],
    "why": "Editing a file inside packages/api/ loads ONLY packages/api/CLAUDE.md — never all three zones at once. This is the clean mental model for auditing directory-level scoping across a large monorepo at the architecture level."
   },
   {
    "id": "imports-and-rules",
    "part": "a2-p2",
    "legacy": 1,
    "h": "@path imports and .claude/rules/ — keeping configuration modular",
    "bridge": "A single CLAUDE.md grows unwieldy even when placed at the right level. This section answers how to split it up, with @path imports for composition and .claude/rules/ for topic-based files that load only when relevant.",
    "diagram": {
     "kind": "compare",
     "title": "Two ways to modularize",
     "left": {
      "title": "@path imports",
      "tone": "hi",
      "items": [
       "@./standards/coding-style.md",
       "Relative path resolves from the importing file",
       "Maximum nesting depth of 5"
      ]
     },
     "right": {
      "title": ".claude/rules/ files",
      "tone": "ok",
      "items": [
       "YAML paths pattern scopes the rule",
       "Loads when Claude reads or edits a match",
       "No paths frontmatter: loads unconditionally"
      ]
     },
     "verdict": "Rules fit conventions for a KIND of file spread across many directories."
    },
    "p": [
     "Instead of one giant CLAUDE.md, `@path` syntax references other files (`@./standards/coding-style.md`). The `@` goes immediately before the path, both relative and absolute paths work, a relative path resolves relative to the FILE containing the import, and there's a maximum nesting depth of 5.",
     "As an alternative or complement, `.claude/rules/` organizes instructions by TOPIC as separate files, each with a small YAML header specifying a `paths` pattern — a rule loads automatically whenever Claude Code reads or edits a matching file, not on every session regardless of relevance. Critically, this scoping only happens when the `paths` frontmatter is actually PRESENT: a rule file with NO `paths` frontmatter at all loads UNCONDITIONALLY, at the same priority as `.claude/CLAUDE.md` — behaving exactly like a global instruction, not a scoped one, regardless of the filename or which directory it lives in."
    ],
    "why": "`.claude/rules/` solves something directory-level CLAUDE.md can't: a convention applying to a KIND of file scattered across many directories (all test files, all migration files) rather than tied to one location. Use `.claude/rules/` with a paths pattern for cross-cutting conventions; use directory-level CLAUDE.md when the convention really is tied to one specific place in the codebase."
   },
   {
    "id": "unified-skills",
    "part": "a2-p2",
    "legacy": 2,
    "h": "The Unified Skills System — commands and skills are now the same underlying mechanism",
    "bridge": "Imports and rules still load as standing context. This section covers the on-demand alternative: skills and commands, which load only when invoked or matched, and the file structure each requires.",
    "diagram": {
     "kind": "grid",
     "title": "Command vs skill",
     "corner": "",
     "cols": [
      "Command",
      "Skill"
     ],
     "rows": [
      {
       "h": "Path",
       "cells": [
        {
         "t": ".claude/commands/deploy.md",
         "tone": "mute"
        },
        {
         "t": ".claude/skills/deploy/SKILL.md",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Creates",
       "cells": [
        {
         "t": "/deploy",
         "tone": "default"
        },
        {
         "t": "/deploy",
         "tone": "default"
        }
       ]
      },
      {
       "h": "Auto-discovery",
       "cells": [
        {
         "t": "No",
         "tone": "mute"
        },
        {
         "t": "Yes, by description",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Same name",
       "cells": [
        {
         "t": "Loses",
         "tone": "bad"
        },
        {
         "t": "Wins",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Flat file in skills/",
       "cells": [
        {
         "t": "n/a",
         "tone": "mute"
        },
        {
         "t": "Not a command",
         "tone": "bad"
        }
       ]
      }
     ]
    },
    "p": [
     "Custom slash commands and Skills have been MERGED into a single system. Two locations create the identical result — a `/command` developers can invoke — but their FILE STRUCTURES differ. A command is a flat Markdown file: `.claude/commands/deploy.md` creates `/deploy`. A skill is a DIRECTORY containing a `SKILL.md` entrypoint: `.claude/skills/deploy/SKILL.md` also creates `/deploy`. A loose flat file dropped directly inside `.claude/skills/` does NOT create a command — the directory-plus-SKILL.md structure is required there.",
     "`.claude/skills/` is the CANONICAL, fuller-featured location — it adds a supporting-files directory alongside SKILL.md, automatic discovery (Claude can load a skill when its description matches your intent, without explicit invocation), and PRECEDENCE when a skill and a command share the same name (the skill wins). `.claude/commands/` still works for backward compatibility, and both support the identical YAML frontmatter (`context: fork`, `allowed-tools`, `argument-hint`)."
    ],
    "why": "This matters for exam scenarios that describe a flat `.md` file placed directly inside `.claude/skills/` expecting it to work like a command — it won't, because the canonical skills path specifically requires the directory+SKILL.md shape. Also worth correcting precisely: `allowed-tools` does NOT restrict which tools a skill can access — it PRE-APPROVES the listed tools so they run without a permission prompt WHILE the skill is active; every other tool remains callable, governed by normal permission settings. To actually REMOVE tools from a skill's reach (the real security boundary), use `disallowed-tools` instead, or add deny rules in permission settings. This on-demand-vs-always-loaded distinction is also the deciding factor between a Skill and CLAUDE.md for a given piece of knowledge: CLAUDE.md is loaded into EVERY session's context whether relevant or not, so it's the right home only for genuinely universal, always-applicable standards; a Skill loads ON DEMAND (invoked explicitly, or auto-matched by its description), making it the right home for task-specific workflows that would otherwise bloat every session's context with information most sessions never need."
   },
   {
    "id": "settings-precedence",
    "part": "a2-p2",
    "legacy": 3,
    "h": "settings.json precedence, and Skills/slash-command frontmatter",
    "bridge": "Skills carry frontmatter that controls tools, and that raises the next question: who decides what is permitted? settings.json is the layer with a real precedence chain, unlike CLAUDE.md.",
    "diagram": {
     "kind": "layers",
     "title": "settings.json precedence: higher layers win",
     "arrows": true,
     "layers": [
      {
       "t": "Managed / enterprise",
       "sub": "Organization safety rules; wins over everything",
       "tone": "bad",
       "tag": "wins"
      },
      {
       "t": "Local",
       "sub": "Personal overrides for one project",
       "tone": "warn"
      },
      {
       "t": "Project",
       "sub": "Shared, version-controlled team settings",
       "tone": "ok"
      },
      {
       "t": "User",
       "sub": "Individual defaults across projects",
       "tone": "mute",
       "tag": "lowest"
      }
     ]
    },
    "p": [
     "`settings.json` configures permissions, tool allow/deny lists, hooks, and model defaults, existing at user, project, and enterprise/managed levels — for safety-relevant settings, managed/enterprise generally wins over project, which generally wins over user.",
     "A Skill or slash-command file can include YAML frontmatter parameters: `context: fork` runs the Skill in an isolated subagent so verbose output doesn't pollute the main session (context isolation applied to a Skill invocation); `allowed-tools` PRE-APPROVES the listed tools so they run without a permission prompt (a convenience, NOT a restriction — `disallowed-tools` is the actual restriction mechanism); `argument-hint` prompts for a needed argument if the Skill is invoked without one."
    ],
    "why": "An organization's safety rules shouldn't be overridable by an individual's local settings — that's why enterprise-managed settings generally win. The Skill frontmatter parameters matter because they let you apply context isolation and least privilege at the granularity of a single reusable command, not just at the whole-agent level."
   },
   {
    "id": "plan-vs-execute-headless",
    "part": "a2-p3",
    "legacy": 4,
    "h": "Plan Mode vs. Execute Mode, and headless/CI-CD mechanics",
    "bridge": "With configuration layers settled, the next question is how Claude Code should run on a given task. This section covers choosing between Plan Mode and execute mode, and running headless when nobody is at the keyboard.",
    "diagram": {
     "kind": "decision",
     "title": "Pick the run mode",
     "q": {
      "t": "What does the task look like?"
     },
     "branches": [
      {
       "label": "large or uncertain",
       "t": "Plan Mode",
       "sub": "Explore, no changes, human approves plan",
       "tone": "hi"
      },
      {
       "label": "routine",
       "t": "Execute mode",
       "sub": "Changes happen as it goes",
       "tone": "ok"
      },
      {
       "label": "no human present",
       "t": "Headless: claude -p",
       "sub": "Prints to stdout and exits",
       "tone": "warn"
      }
     ],
     "note": "Without -p, a CI script hangs in interactive mode."
    },
    "p": [
     "Plan Mode has Claude Code investigate and PLAN — reading and exploring, making NO actual changes — producing an implementation plan a human approves before anything real happens. It's most valuable for large changes (dozens of files), multiple plausible approaches, architectural decisions, an unfamiliar codebase, or big migrations. Execute mode is the normal working mode where changes happen as Claude Code goes.",
     "Headless mode lets Claude Code run without a live person at the keyboard, via a non-interactive flag (commonly `-p`/`--print`) that processes the prompt, prints to stdout, and exits — the correct way to run Claude Code inside a CI/CD pipeline. `/compact` compresses the current session by summarizing prior history (risking loss of exact numbers/dates during summarization); `/memory` opens CLAUDE.md directly for editing, so information persists and auto-loads at the START of every future session."
    ],
    "why": "Plan Mode is a human-approval checkpoint applied to an ENTIRE task up front rather than approving each action one at a time — most valuable exactly where a wrong direction would be expensive to discover midway through. Headless mode trades human oversight for automation, which is precisely why permission rules and hooks become extra important whenever it's used — a CI/CD use of Claude Code needs headless mode PLUS tightly scoped settings.json PLUS hooks PLUS the pipeline's own test-phase gate, together, not as substitutes for each other.",
    "deep": "A recognizable exam trap: a CI script runs `claude \"...\"` with no flags and hangs forever, since Claude Code defaults to interactive mode without `-p`/`--print`. The wrong-but-plausible-sounding distractors reference things that DON'T actually exist — a `CLAUDE_HEADLESS` environment variable, a `--batch` flag — or a Unix workaround (redirecting stdin from `/dev/null`) that doesn't properly address Claude Code's actual command syntax. Only `-p`/`--print` is the real, documented mechanism."
   },
   {
    "id": "ci-json-schema-flags",
    "part": "a2-p3",
    "legacy": 10,
    "h": "The concrete CI flags for schema-constrained, machine-parseable review output",
    "bridge": "Headless mode only gets a script running; a pipeline also needs output it can parse. This section covers the exact flags that make CI review output machine-readable and non-repetitive.",
    "diagram": {
     "kind": "flow",
     "title": "Schema-constrained CI review",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Load prior comments",
       "sub": "gh pr view --json comments",
       "tone": "hi"
      },
      {
       "t": "claude -p",
       "sub": "Prompt includes prior findings"
      },
      {
       "t": "--output-format json",
       "sub": "with --json-schema <path>",
       "tone": "warn"
      },
      {
       "t": "jq gates the pipeline",
       "sub": "Only new or unresolved issues",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "The mechanism behind 'CI needs machine-parseable output' is two specific flags: `--output-format json` paired with `--json-schema <path>`, constraining Claude Code's CI output to a schema a downstream tool (like jq) can reliably gate on — plus loading prior PR review comments (`gh pr view --json comments`) into the next prompt so re-runs report only new/unresolved issues instead of repeating old findings."
    ],
    "why": "At organizational scale, this is the concrete implementation an architect should mandate as a standard CI pattern across every repo running Claude Code in a pipeline — without these two flags, every team re-invents fragile prose-parsing independently."
   },
   {
    "id": "iterative-refinement",
    "part": "a2-p3",
    "legacy": 11,
    "h": "Iterative refinement techniques — I/O examples, test-first iteration, and the interview pattern",
    "bridge": "Pipelines get parseable output from schemas; interactive work gets reliable results from checkable targets. This section answers how to turn vague requirements into something Claude can verify against.",
    "diagram": {
     "kind": "flow",
     "title": "Interview pattern for a large feature",
     "numbered": true,
     "perRow": 3,
     "steps": [
      {
       "t": "Claude interviews you",
       "sub": "AskUserQuestion tool",
       "tone": "hi"
      },
      {
       "t": "Hard parts covered",
       "sub": "Technical, UI/UX, edge cases, tradeoffs"
      },
      {
       "t": "Write spec to a file",
       "sub": "Files, scope limits, end-to-end check",
       "tone": "warn"
      },
      {
       "t": "Fresh session implements",
       "sub": "Clean context",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "Vague natural-language requirements are interpreted inconsistently across runs. Two or three concrete input/output examples close that gap far more reliably than a longer prose description: 'write a validateEmail function; user@example.com -> true, invalid -> false, user@.com -> false; run the tests after implementing' gives Claude something to VERIFY against, not just aim for.",
     "Test-driven iteration takes this further: write the test suite FIRST — covering expected behavior, edge cases, and any performance requirements — then have Claude implement against it and iterate by sharing the actual test failures, rather than describing the failure in prose. A failing test is a concrete, checkable target in a way 'this doesn't quite work yet' is not.",
     "For a genuinely large or ambiguous feature, the interview pattern reverses the usual flow: instead of describing the full feature upfront, ask Claude to INTERVIEW you first — using the AskUserQuestion tool — surfacing technical, UI/UX, edge-case, and tradeoff considerations you may not have thought to specify, continuing until the interview has covered the hard parts, then writing a complete spec to a file. The most useful specs are self-contained: they name the files and interfaces involved, state what's explicitly out of scope, and end with an end-to-end verification step. Only THEN does a fresh session — with clean context focused entirely on implementation — actually build the feature from that spec."
    ],
    "why": "Each of these is a case of moving the 'is this right?' decision to somewhere checkable, instead of leaving it as a subjective judgment Claude has to guess at from prose alone: I/O examples make correctness checkable against concrete cases, failing tests make correctness checkable against a concrete suite, and an interview-produced spec makes SCOPE and REQUIREMENTS checkable before a single line of implementation exists — catching a wrong assumption while it's still cheap to fix, rather than after a full implementation attempt.",
    "table": {
     "headers": [
      "Situation",
      "Correct approach"
     ],
     "rows": [
      [
       "Multiple issues found that INTERACT with each other (fixing one changes the right fix for another)",
       "Provide all issues together in a single, detailed message"
      ],
      [
       "Multiple issues that are INDEPENDENT of each other",
       "Fix sequentially, one at a time, verifying each before moving to the next"
      ],
      [
       "Ambiguous transformation described only in prose",
       "Add 2-3 concrete input/output examples"
      ],
      [
       "Unfamiliar domain with real design tradeoffs (e.g. cache invalidation strategy)",
       "Use the interview pattern before implementing, not after"
      ]
     ]
    },
    "deep": "Interacting vs. independent is the deciding factor for batching fixes — not simply 'how many issues are there.' If fix A changes what the correct fix for B even looks like (e.g. two overlapping null-handling bugs in the same function), describing both together in one detailed message lets Claude reason about them jointly; feeding them one at a time risks a fix for A that then has to be partially undone once B's real shape becomes clear. Genuinely unrelated issues (a typo in file X, a missing test in unrelated file Y) have no such interaction risk, so sequential one-at-a-time fixing — verifying each closes cleanly — is simpler and just as reliable."
   },
   {
    "id": "model-tier-vs-effort",
    "part": "a2-p3",
    "legacy": 13,
    "h": "Model selection and the effort parameter as two separate configuration levers",
    "bridge": "Iteration improves what you ask; two further levers change how Claude answers. This section separates model tier from the effort parameter and says which to try first.",
    "diagram": {
     "kind": "compare",
     "title": "Two separate levers",
     "left": {
      "title": "Model tier",
      "tone": "hi",
      "items": [
       "Haiku: high volume, trivial tasks",
       "Sonnet: default for most work",
       "Opus: complex, long-horizon, autonomous"
      ]
     },
     "right": {
      "title": "Effort (within a tier)",
      "tone": "ok",
      "items": [
       "Tunes reasoning depth, same model",
       "Opus supports up to xhigh",
       "Cheaper first experiment"
      ]
     },
     "verdict": "Shallow answer: raise effort first. Volume and cost problem: change tier."
    },
    "p": [
     "Choosing a model tier (Haiku, Sonnet, Opus) is an ARCHITECTURE decision — it sets the ceiling on reasoning depth and the cost/latency profile for every call made with it. The effort parameter is a PERFORMANCE lever WITHIN a tier — it tunes how much reasoning the model applies without changing which model answers. These are frequently confused because both 'make the answer better,' but only one of them is a cheaper first move: try raising effort before reaching for a more expensive model tier, since a task that only needed more reasoning depth (not more raw capability) is solved without paying for the upgrade.",
     "Worked example: writing a unit test for a 20-line utility function produces an equivalent result whether effort is left at default or raised to extended thinking — the task is too simple for reasoning depth to matter, so raising effort here just adds latency and cost with nothing to show for it. A multi-file refactor requiring cross-module dependency analysis is the opposite case — this is exactly where a higher effort setting produces a materially better plan, because the task genuinely benefits from deeper reasoning, and it's worth trying before assuming the task needs Opus instead of Sonnet.",
     "The two-step decision this produces: (1) pick the model tier by the task's SHAPE — Haiku for high-volume, latency-sensitive, low-complexity work (sub-agent pipelines, CI scripting); Sonnet as the default for most Claude Code work; Opus for complex, long-horizon, high-autonomy work where getting it right the first time outweighs cost. (2) Within whichever tier is chosen, tune effort before assuming the tier itself is wrong — Opus supports effort up to `xhigh`, the recommended setting for coding and agentic work specifically because it is often a better first lever than paying for a tier that doesn't exist above Opus."
    ],
    "why": "Exam framing: given a task description and a complaint about output quality, decide whether the fix is a different model tier or a different effort setting. A 'the model made a shallow architectural call in a 15-file migration' complaint is an effort problem to try first (and a tier problem only if raising effort doesn't close the gap); a 'this needs to run 10,000 times a day and each of these is a trivial classification' complaint is a tier decision (Haiku) that no amount of effort tuning changes, because the constraint is cost and volume, not reasoning depth.",
    "table": {
     "headers": [
      "Lever",
      "What it changes",
      "When to reach for it first"
     ],
     "rows": [
      [
       "Model tier (Haiku / Sonnet / Opus)",
       "The ceiling on reasoning depth and the cost/latency profile",
       "Task shape doesn't fit the current tier at all — too much volume for Sonnet, or too much complexity for Sonnet's ceiling"
      ],
      [
       "Effort parameter (within a tier, up to `xhigh` on Opus)",
       "How much reasoning is applied within the chosen tier",
       "Before switching tiers — often solves a quality problem more cheaply than an upgrade"
      ]
     ]
    },
    "deep": "A subtle trap: assuming 'this output is disappointing' always means 'move to a bigger model.' Model tier and effort are genuinely separate axes — a task can be well within Sonnet's capability ceiling but still benefit from more reasoning depth at that tier before an architect should conclude Sonnet itself is insufficient. Treat effort as the cheaper, faster experiment, and tier changes as the conclusion you reach only after effort tuning has been tried and still falls short."
   },
   {
    "id": "four-surfaces-access",
    "part": "a2-p3",
    "legacy": 14,
    "h": "Claude Code's four surfaces share one agent — the access-model distinction that actually matters",
    "bridge": "Model and effort are chosen, but where Claude Code runs matters too. This section explains why the four surfaces share one agent yet differ in filesystem and terminal access.",
    "diagram": {
     "kind": "grid",
     "title": "Surface vs default access",
     "corner": "Surface",
     "cols": [
      "Default local access",
      "Best fit"
     ],
     "rows": [
      {
       "h": "CLI",
       "cells": [
        {
         "t": "Native OS-level",
         "tone": "ok"
        },
        {
         "t": "Developer workflows",
         "tone": "default"
        }
       ]
      },
      {
       "h": "IDE extension",
       "cells": [
        {
         "t": "Same as CLI",
         "tone": "ok"
        },
        {
         "t": "Inline in editor",
         "tone": "default"
        }
       ]
      },
      {
       "h": "Agent SDK",
       "cells": [
        {
         "t": "What caller grants",
         "tone": "warn"
        },
        {
         "t": "CI, multi-agent",
         "tone": "default"
        }
       ]
      },
      {
       "h": "Desktop/Web/Mobile",
       "cells": [
        {
         "t": "None by default",
         "tone": "bad"
        },
        {
         "t": "No local files needed",
         "tone": "default"
        }
       ]
      }
     ]
    },
    "p": [
     "CLI, IDE extensions, the Agent SDK, and Desktop/Web/Mobile all run the SAME underlying model and the same agentic loop — the surface changes the INTEGRATION POINT, not the intelligence behind it. What differs meaningfully between them, for architecture purposes, is filesystem and terminal ACCESS: the CLI has native, operating-system-level terminal and filesystem access as part of its baseline capability set. Desktop, Web, and Mobile reach that same capability only when a developer has explicitly wired up Claude Code's agent tooling from within those surfaces — they don't get OS-level access simply by existing as a surface.",
     "Why this matters architecturally: a design that assumes 'Claude Code always has terminal access, regardless of surface' will work correctly in the CLI and break, or silently do nothing, in a Desktop/Web/Mobile deployment where nobody deliberately exposed that tooling. A business-facing workflow built for Desktop/Web/Mobile that never needed filesystem access in the first place isn't actually at a disadvantage here — that surface exists specifically for work that doesn't require local environment access, and its lack of default OS-level access is the correct, intentional shape for that use case, not a missing feature.",
     "The Agent SDK is the odd one out in a different way: it's not an end-user surface at all, but a programmatic embedding point — the same agent wired into CI/CD, custom tooling, or a multi-agent system the architect is building, where the access model is whatever the SDK caller explicitly grants it, rather than a fixed default either way."
    ],
    "why": "Exam framing: given a deployment scenario, identify whether the chosen surface's default access model actually matches what the task needs — a scenario describing a task that needs to read and edit files on a developer's machine, deployed to a Desktop/Web/Mobile-only pilot with no SDK wiring, is describing a surface/requirement mismatch, not a bug in Claude Code itself.",
    "table": {
     "headers": [
      "Surface",
      "Default filesystem/terminal access",
      "Best fit"
     ],
     "rows": [
      [
       "CLI",
       "Native, OS-level, by default",
       "Primary developer workflows; the reference point for configuration decisions"
      ],
      [
       "IDE Extensions (VS Code, JetBrains)",
       "Same as CLI, surfaced inline in the editor",
       "Reducing context-switching without changing capability"
      ],
      [
       "Agent SDK",
       "Whatever the embedding application explicitly grants",
       "CI/CD pipelines, custom tooling, multi-agent systems"
      ],
      [
       "Desktop / Web / Mobile",
       "None by default — requires explicit agent-tooling wiring to reach it",
       "Business-facing, cloud-run tasks that don't need a local environment"
      ]
     ]
    },
    "deep": "Don't read 'same model, same loop' as 'same capability everywhere' — the model and orchestration loop being identical is exactly what makes the ACCESS-MODEL difference the one worth testing, since it's the one place these surfaces genuinely diverge. An architecture review that only checks 'which model are we using' while ignoring 'which surface, and does its default access model match this task's requirements' will pass review and then fail in deployment."
   },
   {
    "id": "org-config-strategy",
    "part": "a2-p4",
    "legacy": 5,
    "h": "Organization-wide configuration design",
    "bridge": "Everything so far configured one project. At organization scale, the question becomes how to layer enterprise, project and individual settings so safety is enforced but teams keep flexibility.",
    "diagram": {
     "kind": "hub",
     "title": "Organization configuration strategy",
     "center": {
      "t": "Config strategy",
      "sub": "Consistent safety, local flexibility",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "Enterprise settings",
       "sub": "Safety rules",
       "tone": "bad"
      },
      {
       "t": "Project settings",
       "sub": "Team flexibility",
       "tone": "ok"
      },
      {
       "t": "Individual settings",
       "sub": "Personal preference",
       "tone": "mute"
      },
      {
       "t": "Shared Skill library",
       "sub": "Versioned across repos",
       "tone": "warn"
      }
     ],
     "perRow": 4
    },
    "p": [
     "Architect-level questions ask you to design the CONFIGURATION STRATEGY itself: how should a large engineering org structure enterprise-level settings.json vs. project-level vs. individual settings so that safety rules are consistently enforced but teams still have appropriate local flexibility? How should a shared Skill library be maintained and versioned across many repos?"
    ],
    "why": "This is the architectural version of Configuration Management from Developer's Applications topic — same underlying idea (pin, version, review configuration like code), scaled up to many teams and repos instead of one."
   },
   {
    "id": "governing-imports-rules",
    "part": "a2-p4",
    "legacy": 6,
    "h": "Governing @path imports and .claude/rules/ at scale",
    "bridge": "The strategy above covers settings; the same governance question applies to imports and rules. This section asks who owns each shared file and how a change reaches many repos safely.",
    "diagram": {
     "kind": "compare",
     "title": "Who owns the imported files",
     "left": {
      "title": "Owned centrally",
      "tone": "bad",
      "items": [
       "Security standards",
       "Compliance requirements",
       "Imported by every repo"
      ]
     },
     "right": {
      "title": "Owned per team",
      "tone": "ok",
      "items": [
       "Team style preferences",
       "Local conventions",
       "Changed without central review"
      ]
     },
     "verdict": "A central change needs versioning and rollout so no repo breaks silently."
    },
    "p": [
     "Developer's @path imports (modularizing a single project's CLAUDE.md) and .claude/rules/ (cross-cutting conventions via path patterns) both need an org-level governance layer once many repos exist: which imported files are OWNED centrally (security standards, compliance requirements) versus OWNED per-team (team-specific style preferences)? How does a change to a centrally-owned imported file safely propagate to every repo that imports it, without silently breaking repos that were relying on the old version?"
    ],
    "why": "This is the same tension as the constraints hierarchy's compliance axis, applied to configuration itself: a centrally-owned standard that every repo imports gives consistent enforcement (good for compliance), but needs a deliberate versioning and rollout strategy (the same 'safe evolution of a shared dependency' concern from MCP server governance) so a central change doesn't break many repos simultaneously with no warning."
   },
   {
    "id": "plan-ci-as-policy",
    "part": "a2-p4",
    "legacy": 7,
    "h": "Plan Mode and headless CI/CD as organizational POLICY, not per-project preference",
    "bridge": "Governance of files leads to governance of workflow. This section turns the Plan Mode and CI habits from earlier into standing policy that is enforced rather than remembered.",
    "diagram": {
     "kind": "flow",
     "title": "Plan Mode as enforced policy",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Change is risky",
       "sub": "More than N files or high-risk directory",
       "tone": "warn"
      },
      {
       "t": "Settings or hook triggers",
       "sub": "Structural, not discretionary"
      },
      {
       "t": "Plan Mode required",
       "sub": "Investigate, no changes",
       "tone": "hi"
      },
      {
       "t": "Human approves plan",
       "sub": "Then execution",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "Developer teaches Plan Mode triggers (large changes, unfamiliar codebase, architectural decisions) and CI/CD safety stacking (headless mode + tight permissions + hooks + pipeline gating) as per-task judgment calls. At the Architect level, these become STANDING POLICY decisions an organization sets once and applies consistently: for example, 'any change touching more than N files, or any change in a designated high-risk directory, automatically requires Plan Mode' — enforced structurally (e.g., via settings/hooks) rather than left to individual engineer judgment each time."
    ],
    "why": "Converting a per-task judgment call into an enforced organizational policy is exactly the compliance-axis move from the constraints hierarchy — 'usually remembering to use Plan Mode for big changes' is a probabilistic habit; a structural policy requiring it above a defined threshold is a deterministic guarantee, the same distinction as prompts vs. hooks applied to workflow policy instead of tool calls."
   },
   {
    "id": "mcp-scope-onboarding",
    "part": "a2-p4",
    "legacy": 9,
    "h": "The #1 MCP onboarding failure, at organizational scale",
    "bridge": "A scope mistake can undermine all this governance, and the clearest case is MCP configuration. This section shows how config in the wrong location breaks every new teammate.",
    "diagram": {
     "kind": "seq",
     "title": "Why new teammates get tools missing",
     "actors": [
      {
       "t": "Engineer A",
       "tone": "hi"
      },
      {
       "t": "~/.claude.json",
       "tone": "warn"
      },
      {
       "t": "Shared repo",
       "tone": "ok"
      },
      {
       "t": "New teammate"
      }
     ],
     "rows": [
      {
       "f": 0,
       "t": 1,
       "text": "saves MCP config here"
      },
      {
       "note": "Works on Engineer A's machine only",
       "over": [
        0,
        1
       ]
      },
      {
       "f": 3,
       "t": 2,
       "text": "clones the repo"
      },
      {
       "f": 2,
       "t": 3,
       "text": "no project MCP config",
       "dashed": true,
       "tone": "bad"
      },
      {
       "note": "Fix: keep team MCP config in project-level file; add a standing check",
       "over": [
        2,
        3
       ],
       "tone": "ok"
      }
     ]
    },
    "p": [
     "A concrete, common failure worth designing config governance around: an agent runs perfectly on one engineer's machine (all MCP tools connected), but every new teammate who clones the repo gets 'tools missing, initialization failed.' Root cause: a configuration SCOPE error — shared project MCP config was saved to a personal, user-level location (e.g. a personal `~/.claude.json`) instead of the shared, version-controlled project config."
    ],
    "why": "At the architecture level, this is a governance gap, not a one-off mistake: an org should have a standing check (lint rule, onboarding checklist, or CI step) verifying that any MCP config a team depends on lives in the project-level file, not scattered across individual engineers' personal configs."
   },
   {
    "id": "claudemd-vs-settings-vs-hooks",
    "part": "a2-p5",
    "legacy": 12,
    "h": "Deciding what belongs in CLAUDE.md vs. settings permissions vs. a hook — then restructuring a real config",
    "bridge": "The earlier parts gave you three mechanisms for shaping behavior. This section answers which one a rule belongs in, based on how bad one violation would be.",
    "diagram": {
     "kind": "decision",
     "title": "Where does this rule belong?",
     "q": {
      "t": "If violated once, is it dangerous, irreversible or a compliance failure?"
     },
     "branches": [
      {
       "label": "no: judgment",
       "t": "CLAUDE.md",
       "sub": "Advisory prompt",
       "tone": "mute"
      },
      {
       "label": "yes: refuse outright",
       "t": "settings permission deny",
       "sub": "Gate before the call",
       "tone": "bad"
      },
      {
       "label": "yes: check or act",
       "t": "Hook",
       "sub": "Deterministic code",
       "tone": "warn"
      }
     ]
    },
    "p": [
     "CLAUDE.md, settings.json permissions, and hooks all 'configure behavior,' which is exactly why they get confused — but they sit at three different enforcement strengths. CLAUDE.md is a PROMPT: everything in it is text the model reads and is statistically likely to follow, but nothing there is guaranteed. Settings permissions (`allow`/`deny`/`ask` rules in settings.json) are a DETERMINISTIC GATE evaluated by Claude Code itself before a matching tool call is even attempted — the model never gets a chance to talk its way past a `deny` rule. Hooks (`PreToolUse`, `PostToolUse`, etc.) are DETERMINISTIC CODE that runs automatically at a defined point in the tool-call lifecycle, capable of blocking, modifying, or reacting to an action — also enforced outside the model's control.",
     "Worked example — BEFORE (broken structure): a team's CLAUDE.md says: 'Never run `rm -rf` on production directories.' 'Always run `npm test` before committing.' 'Never commit directly to the `main` branch — always use a feature branch and open a PR.' 'Format code with prettier before every commit.' All four read as reasonable rules, and all four are equally UNENFORCED — they are just prose the model is statistically likely to follow, with nothing stopping a bad day, a long context window, or an unusual prompt from producing exactly the disaster the rule was meant to prevent.",
     "Worked example — AFTER (restructured correctly): the destructive-command and branch-protection rules move to settings.json permissions — `deny` rules matching dangerous `rm` patterns and direct-to-`main` git operations — so those actions are refused before they ever execute, with no dependence on the model choosing to comply. The test-before-commit and format-before-commit rules move to a `PreToolUse` hook keyed on the git-commit tool call, which runs `npm test` and `prettier --write` automatically and can block the commit outright on failure — again with no dependence on the model remembering to do it. What's LEFT in CLAUDE.md afterward is only genuinely advisory, judgment-dependent guidance that has no clean deterministic equivalent — e.g. 'prefer composition over inheritance in new React components,' a style preference with no single mechanical check.",
     "The general restructuring rule this example illustrates: if violating the instruction would be dangerous, irreversible, or a compliance requirement, it does NOT belong in CLAUDE.md alone — it belongs in settings permissions (if the right response is refusing the action outright) or a hook (if the right response is running a check or transformation automatically). If the instruction is a judgment call, a preference, or contextual background information with no clean pass/fail test, CLAUDE.md is exactly the right place for it — moving it to a hook would mean writing brittle code to approximate something inherently subjective."
    ],
    "why": "This is the single most exam-relevant distinction in this domain, and it's a 'restructure this config' skill, not just a definitions question: given an existing CLAUDE.md full of mixed advisory-and-critical rules, you need to sort each rule by ENFORCEMENT REQUIREMENT (deterministic vs. probabilistic-is-acceptable) and then pick the mechanism that matches, moving rules out of CLAUDE.md wherever probabilistic compliance is not good enough.",
    "table": {
     "headers": [
      "Rule in the original CLAUDE.md",
      "Correct destination after restructuring",
      "Why"
     ],
     "rows": [
      [
       "\"Never run `rm -rf` on production directories\"",
       "settings.json `deny` permission rule",
       "Dangerous + irreversible — must be refused outright, not just discouraged"
      ],
      [
       "\"Never commit directly to `main`\"",
       "settings.json `deny` permission rule (or git-side branch protection)",
       "Compliance/process requirement — needs a hard gate, not a hopeful prompt"
      ],
      [
       "\"Always run tests before committing\"",
       "`PreToolUse` hook on the commit action",
       "A repeatable automated check belongs in code that always runs, not in a rule that can be forgotten"
      ],
      [
       "\"Format with prettier before every commit\"",
       "`PreToolUse` hook on the commit action",
       "Same as above — mechanical, checkable, and better run automatically every time"
      ],
      [
       "\"Prefer composition over inheritance in new components\"",
       "Stays in CLAUDE.md",
       "Genuine judgment call with no single correct mechanical test — exactly what prompts are for"
      ]
     ]
    },
    "deep": "The trap to watch for: NOT every rule that sounds serious needs to leave CLAUDE.md, and not every rule that sounds stylistic should stay. Judge by whether a clean, unambiguous automated check or gate actually exists for it — 'always use descriptive variable names' sounds important but has no reliable mechanical test, so it stays in CLAUDE.md despite sounding like a real rule; meanwhile 'never push force to `main`' sounds like ordinary advice but has an exact, checkable condition (branch name + force flag), so it belongs in a deterministic gate. The question to ask for each rule is not 'how important is this?' but 'is there an exact condition I could write a permission rule or hook to check, and would refusing/reacting outright be the right response if that condition is met?'"
   },
   {
    "id": "sorting-drill",
    "part": "a2-p5",
    "legacy": 15,
    "h": "Sorting drill — ten rules, three mechanisms: permissions, hooks, or CLAUDE.md",
    "bridge": "You now have the decision test; this drill applies it. Sort realistic rules into permissions, hooks or CLAUDE.md, and watch for PreToolUse versus PostToolUse.",
    "diagram": {
     "kind": "grid",
     "title": "Sorting drill: rule to mechanism",
     "corner": "Rule",
     "cols": [
      "Mechanism",
      "Why"
     ],
     "rows": [
      {
       "h": "Never touch .env",
       "cells": [
        {
         "t": "Permissions deny",
         "tone": "bad"
        },
        {
         "t": "Static pattern",
         "tone": "default"
        }
       ]
      },
      {
       "h": "Format after every edit",
       "cells": [
        {
         "t": "PostToolUse hook",
         "tone": "warn"
        },
        {
         "t": "Must always run",
         "tone": "default"
        }
       ]
      },
      {
       "h": "Refund over 500",
       "cells": [
        {
         "t": "PreToolUse hook",
         "tone": "warn"
        },
        {
         "t": "Conditional on amount",
         "tone": "default"
        }
       ]
      },
      {
       "h": "No commit unless tests pass",
       "cells": [
        {
         "t": "PreToolUse hook",
         "tone": "warn"
        },
        {
         "t": "Must block action",
         "tone": "default"
        }
       ]
      },
      {
       "h": "Error-handling style",
       "cells": [
        {
         "t": "CLAUDE.md",
         "tone": "ok"
        },
        {
         "t": "Judgment",
         "tone": "default"
        }
       ]
      },
      {
       "h": "Deploy tool: platform only",
       "cells": [
        {
         "t": "Managed permissions",
         "tone": "bad"
        },
        {
         "t": "Not overridable",
         "tone": "default"
        }
       ]
      }
     ]
    },
    "p": [
     "Three mechanisms, three enforcement strengths. CLAUDE.md is advisory text the model reads and usually follows. Settings permissions (allow / ask / deny rules in settings.json) are evaluated by Claude Code itself before a matching tool call runs, using static patterns. Hooks run your code at fixed points in the tool lifecycle — PreToolUse can inspect and BLOCK a call; PostToolUse runs after the call has already happened (it cannot undo it, but it can run formatters or tests and feed failures back to Claude). Sorting question for every rule: if it were violated once, is that dangerous, irreversible or a compliance failure? If yes it must not live in CLAUDE.md alone. Then ask: is the right response a static refusal (permission deny) or conditional logic or an automatic action (hook)?",
     "Rule 1 'never read or edit .env files' → permissions deny (Read and Edit patterns for .env): a static pattern match, blocked before execution. Rule 2 'never run rm -rf or force-push' → permissions deny on those Bash patterns. Rule 3 'always run the formatter after every edit' → PostToolUse hook matching Edit and Write: automatic, independent of the model remembering. Rule 4 'run the tests after every edit and fix failures' → PostToolUse hook whose failing exit feeds the error back to Claude. Rule 5 'refunds over 500 need human approval' → PreToolUse hook on the refund tool with conditional logic on the amount (a static permission pattern cannot read the amount). Rule 6 'never commit unless tests pass' → PreToolUse hook on the commit command running the suite and blocking on failure. Rule 7 'use our error-handling conventions' → CLAUDE.md (judgment-dependent style). Rule 8 'prefer small focused PRs' → CLAUDE.md. Rule 9 'this repo uses pnpm, the API lives in packages/api' → CLAUDE.md (project context). Rule 10 'only the platform team may use the deploy tool' → permissions (deny or ask) in organization-managed settings so individuals cannot override it.",
     "Restructure example. BEFORE: a CLAUDE.md containing rules 1-6 as bullet points — all six read as sensible, and all six are merely probabilistic. AFTER: settings.json gets a permissions block with the deny patterns for rules 1 and 2; hooks get a PostToolUse entry (matcher Edit|Write) running a format-and-test script for rules 3 and 4, and PreToolUse entries for rules 5 and 6; CLAUDE.md keeps only rules 7-9. The file shrinks, and every dangerous rule becomes deterministic."
    ],
    "why": "This is 0% on your scorecard, so memorize the decision procedure instead of the examples: (1) cost of one violation high? → not CLAUDE.md alone; (2) static pattern refusal → permissions; (3) conditional logic, a check, or an automatic action → hook; (4) PreToolUse to prevent, PostToolUse to react after the fact; (5) judgment, conventions, background context → CLAUDE.md.",
    "table": {
     "headers": [
      "Rule",
      "Mechanism",
      "Why"
     ],
     "rows": [
      [
       "Never touch .env",
       "Permissions deny",
       "Static pattern, refuse before execution"
      ],
      [
       "Never rm -rf / force-push",
       "Permissions deny",
       "Dangerous and irreversible"
      ],
      [
       "Format after every edit",
       "PostToolUse hook",
       "Mechanical, must always run"
      ],
      [
       "Tests after every edit",
       "PostToolUse hook",
       "Automatic check, result fed back"
      ],
      [
       "Refund over 500 needs approval",
       "PreToolUse hook",
       "Needs conditional logic on tool input"
      ],
      [
       "No commit unless tests pass",
       "PreToolUse hook",
       "Must block the action itself"
      ],
      [
       "Error-handling conventions",
       "CLAUDE.md",
       "Judgment, no mechanical test"
      ],
      [
       "Repo uses pnpm; API in packages/api",
       "CLAUDE.md",
       "Background context"
      ],
      [
       "Deploy tool restricted to platform team",
       "Managed-settings permissions",
       "Policy individuals must not override"
      ]
     ]
    },
    "deep": "Two frequent wrong answers: putting a business-rule check in a PostToolUse hook (the refund already went through — blocking requires PreToolUse), and putting a critical rule in CLAUDE.md 'with emphasis' (capital letters do not change enforcement strength)."
   }
  ],
  "quiz": [
   {
    "q": "A 15-file migration produced a shallow architectural plan on Sonnet at default effort. What is the cheaper first experiment before switching to Opus?",
    "opts": [
     "Rewrite the prompt with more examples",
     "Raise the effort parameter within Sonnet before changing model tier",
     "Switch directly to Opus at xhigh effort",
     "Split the task across multiple Haiku sub-agents"
    ],
    "correct": 1,
    "explain": "Effort is a performance lever within a tier and a cheaper move than a tier upgrade — try raising effort first; only move to a higher tier if that still falls short."
   },
   {
    "q": "A workload runs a trivial classification 10,000 times a day under tight latency and cost constraints. Which lever addresses this, and why does raising effort NOT fix it?",
    "opts": [
     "Raise effort on the current model — it always improves throughput",
     "Choose a cheaper, faster model tier (Haiku) — the constraint is volume and cost, not reasoning depth",
     "Switch to Opus at xhigh for maximum accuracy regardless of cost",
     "This cannot be solved by model or effort configuration"
    ],
    "correct": 1,
    "explain": "Effort tunes reasoning depth within a tier; it doesn't change the cost/latency profile that's actually the bottleneck here. A volume/cost-constrained, low-complexity workload is a tier decision (Haiku), not an effort decision."
   },
   {
    "q": "On which model tier is the `xhigh` effort setting available, and what is it recommended for?",
    "opts": [
     "Haiku — recommended for high-volume scripting",
     "Sonnet — recommended for everyday default use",
     "Opus — recommended for coding and agentic work",
     "xhigh is available on all tiers equally"
    ],
    "correct": 2,
    "explain": "xhigh is available on Opus and is the recommended setting for coding and agentic work — often a better first move than assuming a task needs a tier above Opus, since none exists."
   },
   {
    "q": "A team builds a workflow assuming 'Claude Code always has terminal and filesystem access regardless of surface,' then deploys it to a Desktop/Web/Mobile pilot with no Agent SDK wiring. What happens?",
    "opts": [
     "It works identically, since all surfaces share the same model and loop",
     "It breaks or silently does nothing, because Desktop/Web/Mobile has no OS-level access by default",
     "The CLI automatically takes over execution",
     "Desktop/Web/Mobile always has more access than the CLI"
    ],
    "correct": 1,
    "explain": "Same model and loop across surfaces does not mean same access model — Desktop/Web/Mobile only reaches filesystem/terminal capability when a developer explicitly wires up Claude Code's agent tooling; assuming otherwise is a surface/requirement mismatch, not a product bug."
   },
   {
    "q": "What distinguishes the Agent SDK from the other three Claude Code surfaces (CLI, IDE extensions, Desktop/Web/Mobile)?",
    "opts": [
     "It runs a different underlying model",
     "It is a programmatic embedding point whose access model is whatever the calling application explicitly grants, not a fixed end-user surface",
     "It has no access to tools at all",
     "It is only available for chat-only workflows"
    ],
    "correct": 1,
    "explain": "The Agent SDK isn't an end-user surface with a fixed default access model — it's how the same agent gets embedded into CI/CD, custom tooling, or multi-agent systems, with access defined entirely by what the embedding application grants it."
   },
   {
    "q": "A monorepo has infrastructure/, packages/api/, and packages/frontend/ directories, each with its own CLAUDE.md. Editing a file inside packages/api/ loads which directory-level CLAUDE.md files?",
    "opts": [
     "All three, every time",
     "Only packages/api/CLAUDE.md",
     "None — directory-level files never load automatically",
     "Whichever was edited most recently"
    ],
    "correct": 1,
    "explain": "Directory-level CLAUDE.md is scoped to its own directory and children — the sibling zones' rules stay unloaded."
   },
   {
    "q": "An agent works perfectly on one engineer's machine but every new teammate gets 'tools missing' on clone. At organizational scale, what should an architect put in place to prevent this recurring?",
    "opts": [
     "Nothing — this is a one-off individual mistake",
     "A standing governance check (lint rule, onboarding step, or CI check) verifying shared MCP config lives at the project level",
     "A bigger model tier for new teammates",
     "Disabling MCP entirely until the team is fully onboarded"
    ],
    "correct": 1,
    "explain": "This is a recurring configuration-scope failure, not a one-off — architecture-level governance means catching it structurally (a check) rather than relying on each engineer remembering the right location."
   },
   {
    "q": "Which two CI flags make Claude Code's review output reliably gate-able by a downstream tool like jq, instead of requiring fragile prose parsing?",
    "opts": [
     "--verbose and --debug",
     "--output-format json and --json-schema",
     "--batch and --headless",
     "--resume and --fork-session"
    ],
    "correct": 1,
    "explain": "--output-format json paired with --json-schema constrains output to a schema a downstream tool can parse reliably — the concrete mechanism behind machine-parseable CI output."
   },
   {
    "q": "A new team member doesn't receive the project's coding standards, which were written into a CLAUDE.md at the user level instead of the project level. What's the actual problem?",
    "opts": [
     "Precedence — user-level always loses so this shouldn't happen",
     "Distribution — user-level config is personal and not shared, so new contributors never receive it",
     "There is no way to share configuration across a team",
     "Directory-level always overrides user-level"
    ],
    "correct": 1,
    "explain": "The issue isn't precedence, it's that user-level configuration simply isn't distributed to teammates."
   },
   {
    "q": "Practice scenario: A monorepo has a root CLAUDE.md with universal standards and a .claude/rules/ directory with topic-specific files, including testing.md. A developer notices testing.md conventions loading even when editing unrelated API handler files. Investigation shows testing.md has no YAML frontmatter at all. What's happening, and what's the fix?",
    "opts": [
     "This is a bug in Claude Code with no fix available",
     "A rule file with NO paths frontmatter loads UNCONDITIONALLY, at the same priority as CLAUDE.md, regardless of its filename",
     "testing.md should be renamed to force correct scoping",
     "The fix is deleting testing.md and putting its content back into the root CLAUDE.md"
    ],
    "correct": 1,
    "explain": "Scoping only happens because of the paths frontmatter — without it, a rule file behaves exactly like an always-loaded CLAUDE.md instruction, regardless of what its filename implies about its intended scope."
   },
   {
    "q": "What problem does .claude/rules/ with a paths pattern solve that a directory-level CLAUDE.md cannot?",
    "opts": [
     "Nothing, they're identical",
     "It targets a KIND of file scattered across many directories (e.g. all test files)",
     "It only works for JSON files",
     "It replaces settings.json entirely"
    ],
    "correct": 1,
    "explain": "paths-based rules apply to a file pattern cutting across the whole codebase, while directory-level CLAUDE.md is tied to one location."
   },
   {
    "q": "What does the `context: fork` Skill frontmatter parameter do?",
    "opts": [
     "Deletes the Skill after one use",
     "Runs the Skill in an isolated subagent so its verbose output doesn't pollute the main session's context",
     "Forces a different model",
     "Disables all tools for that Skill"
    ],
    "correct": 1,
    "explain": "context: fork applies context isolation specifically to a Skill's execution."
   },
   {
    "q": "What is Plan Mode, and when is it most valuable?",
    "opts": [
     "A mode where changes happen immediately with no review",
     "A mode where Claude Code presents its intended approach for human review BEFORE making changes",
     "A mode only for one-line fixes",
     "A billing setting"
    ],
    "correct": 1,
    "explain": "Plan Mode lets a human catch a wrong direction before any files are touched."
   },
   {
    "q": "What flag is the correct way to run Claude Code non-interactively inside a CI/CD pipeline?",
    "opts": [
     "--interactive",
     "-p (or --print)",
     "--verbose",
     "--resume"
    ],
    "correct": 1,
    "explain": "-p / --print processes the prompt, prints the result, and exits, with no interactive back-and-forth."
   },
   {
    "q": "A CI script hangs because it's missing -p/--print. Which of the following is a REAL alternative fix, and which are nonexistent distractors?",
    "opts": [
     "A CLAUDE_HEADLESS=true environment variable is a valid alternative",
     "None of the alternatives are real",
     "A --batch flag is a valid alternative",
     "Redirecting stdin from /dev/null properly fixes this"
    ],
    "correct": 1,
    "explain": "This is a recognizable exam trap — plausible-sounding but nonexistent options should be verified against actual documentation, not assumed real because the naming sounds sensible."
   },
   {
    "q": "For a safety-relevant Claude Code setting, which level generally takes precedence: an individual engineer's local settings, or enterprise-managed settings?",
    "opts": [
     "Individual local settings always win",
     "Enterprise-managed settings generally win",
     "They're merged with no precedence",
     "Whichever was set most recently"
    ],
    "correct": 1,
    "explain": "Organization-level safety settings generally override individual-level settings, consistent with the least-privilege principle."
   },
   {
    "q": "Practice scenario: An organization deploys a managed-policy CLAUDE.md via IT enforcing 'never commit directly to the main branch.' A senior engineer, working on an urgent hotfix, adds a project-level CLAUDE.md instruction saying 'for this repo, direct commits to main are allowed during incidents,' intending it to override the org policy for this specific case. What actually happens?",
    "opts": [
     "The project-level instruction correctly overrides the managed policy, since project-level is more specific",
     "The managed policy CANNOT be excluded or overridden by any lower scope — it is genuinely mandatory, unlike user, project, or local scopes which can be adjusted",
     "Both instructions are merged, allowing commits only during declared incidents",
     "CLAUDE.md instructions have no enforcement mechanism at any scope, so neither instruction matters"
    ],
    "correct": 1,
    "explain": "Managed policy sits above all other CLAUDE.md scopes specifically because it cannot be excluded — that's what makes it 'managed' rather than just 'broad.' A project-level attempt to override it has no effect, by design."
   },
   {
    "q": "Why does Architect weight Claude Code configuration so much more heavily (20%) than Developer does (3.1%)?",
    "opts": [
     "It's a completely different topic",
     "The core concepts are the same",
     "Architect doesn't actually cover Claude Code",
     "There's no real reason"
    ],
    "correct": 1,
    "explain": "Same foundation, different scale of application — this is exactly the kind of overlap that makes preparing for Developer first valuable."
   },
   {
    "q": "A centrally-owned @path-imported security standard changes. What's the architect-level concern beyond just making the edit?",
    "opts": [
     "None, the file just updates everywhere instantly with no risk",
     "How to version and roll out the change safely",
     "Imported files cannot be changed once created",
     "Only the file's original author needs to know about the change"
    ],
    "correct": 1,
    "explain": "This mirrors safe evolution of any shared dependency — a centrally-owned config file used across many repos needs a deliberate rollout strategy, not a silent instant change."
   },
   {
    "q": "An organization requires Plan Mode for any change touching more than a set number of files, enforced structurally rather than left to individual judgment. What principle does this reflect?",
    "opts": [
     "This is unnecessary bureaucracy with no real benefit",
     "Converting a probabilistic habit into a deterministic, enforced policy",
     "Plan Mode should never be a matter of policy",
     "Individual judgment is always more reliable than policy"
    ],
    "correct": 1,
    "explain": "Structural enforcement of a policy threshold guarantees consistency the same way a hook guarantees compliance beyond what a habit or preference can promise."
   },
   {
    "q": "A directory-level CLAUDE.md inside /src/payments/ conflicts with the root-level CLAUDE.md on one specific rule. What actually happens to both files' content, and why doesn't this erase the root file's authority elsewhere?",
    "opts": [
     "The root file's conflicting content is deleted from context entirely, wherever it appears",
     "Both files are CONCATENATED into context — the nested file loads later, giving it more practical weight from recency on the point of conflict, without deleting or excluding the root file's other guidance",
     "Neither file has any effect once nested files exist",
     "Whichever file was edited most recently wins and the other is discarded"
    ],
    "correct": 1,
    "explain": "CLAUDE.md files concatenate rather than strictly override — the root file's authority elsewhere is untouched because nothing is actually deleted, only the more specific instruction gets extra weight on that one point from where it sits in context."
   },
   {
    "q": "A team wants a convention to apply to every test file across a codebase with 30 different directories. Should they use directory-level CLAUDE.md files in each directory, or .claude/rules/ with a paths pattern?",
    "opts": [
     "30 separate directory-level CLAUDE.md files, one per directory",
     ".claude/rules/ with a single paths pattern matching all test files",
     "Neither approach can handle cross-cutting conventions",
     "A single root-level CLAUDE.md with no other files"
    ],
    "correct": 1,
    "explain": "A paths-based rule targets a file PATTERN across the whole codebase in one place, rather than needing to be duplicated into every relevant directory."
   },
   {
    "q": "Practice scenario: A project's root CLAUDE.md has grown to 800 lines covering API design rules, testing conventions, deployment procedures, and frontend style guides — but most of this only matters when working in the matching part of the codebase (API rules only apply in /api, frontend rules only in /web). Developers report Claude Code is increasingly inconsistent on specific conventions. What's the recommended fix to reduce per-session token load while preserving coverage?",
    "opts": [
     "Add 'IMPORTANT: follow all rules carefully' to the top of the file to restore attention",
     "Split the content into .claude/rules/ files scoped by path pattern (e.g. API rules matching api/**, frontend rules matching web/**)",
     "Delete the least-used sections to shorten the file",
     "Move everything into a single Skill that gets invoked manually"
    ],
    "correct": 1,
    "explain": "Path-scoped .claude/rules/ files solve exactly this: content only loads when it's actually relevant to the files in play, cutting per-session token load while every convention is still available when its matching area of the codebase is touched — unlike a monolithic CLAUDE.md that loads everything regardless of relevance."
   },
   {
    "q": "Practice scenario: A developer migrates a monorepo from CommonJS to ES modules — 80+ files, multiple valid import-resolution strategies, and knock-on effects in build tooling, test configuration, and package.json. They start in DIRECT EXECUTION mode and begin converting files. Halfway through, the chosen import-resolution strategy breaks the test runner. What went wrong?",
    "opts": [
     "Nothing went wrong, this is normal and expected for any large migration",
     "This is exactly the case Plan Mode exists for — dozens of files, multiple genuinely different valid approaches, and cross-cutting knock-on effects",
     "Direct execution mode is always the correct choice for file conversions",
     "The fix is switching to a bigger model mid-migration"
    ],
    "correct": 1,
    "explain": "Large migrations with multiple valid strategies and cross-cutting knock-on effects are precisely when Plan Mode's upfront investigation would have surfaced the test-runner conflict before any files were touched, rather than discovering it halfway through committed changes."
   },
   {
    "q": "Practice scenario: A team wants a /review command available to everyone who clones the repository. A developer also wants a personal /brainstorm skill that produces verbose codebase analysis output without cluttering the main conversation. Where should each be created, and what configuration does the skill need?",
    "opts": [
     "Both should be personal, user-level commands so neither affects the shared repo",
     "/review as a PROJECT slash command (shared, checked into the repo, available to every contributor)",
     "Both should be project-level commands committed to the repo",
     "/review needs context: fork; /brainstorm should be a project-level command"
    ],
    "correct": 1,
    "explain": "Project-level slash commands are shared via version control for team-wide consistency; a personal Skill with context: fork gives one developer a verbose-output tool that stays isolated from their main conversation — matching each requirement to the right scope and the right isolation mechanism."
   },
   {
    "q": "A SKILL.md's steps call a helper script using an absolute path baked to the author's own home directory. It works for the author but fails the moment a teammate clones the repo. What's the correct fix?",
    "opts": [
     "Swap in a different absolute path pointing to a shared network location everyone can reach",
     "Reference the script relative to the project root using CLAUDE_PROJECT_DIR",
     "Use a home-directory shortcut instead of a full absolute path",
     "Delete the step so the skill no longer depends on an external script"
    ],
    "correct": 1,
    "explain": "A different absolute path or a home-directory shortcut both just relocate the same fragility, since they still assume a specific, uniform machine layout — CLAUDE_PROJECT_DIR is the only option that resolves correctly regardless of where the repo lives on any given machine."
   },
   {
    "q": "A skill directory .claude/skills/review.md is a flat file (not review/SKILL.md). A developer expects invoking /review to work. Will it?",
    "opts": [
     "Yes, any file inside .claude/skills/ automatically becomes a command",
     "No — the canonical .claude/skills/ location specifically requires a DIRECTORY containing a SKILL.md entrypoint (.claude/skills/review/SKILL.md)",
     "This works but only in headless mode",
     "This works only if the file has YAML frontmatter"
    ],
    "correct": 1,
    "explain": "The two locations have different required file shapes — skills need a directory+SKILL.md; only the separate .claude/commands/ path accepts a flat file directly."
   },
   {
    "q": "What does the `allowed-tools` Skill frontmatter field actually do — restrict tool access, or something else?",
    "opts": [
     "It restricts the skill to ONLY the listed tools, blocking everything else",
     "It PRE-APPROVES the listed tools so they run without a permission prompt while the skill is active",
     "It has no functional effect, it's purely documentation",
     "It only works in headless/CI mode"
    ],
    "correct": 1,
    "explain": "This is a common misconception worth correcting precisely — allowed-tools grants frictionless access to specific tools, it does not remove access to anything else."
   },
   {
    "q": "A skill in .claude/skills/deploy/ and a command in .claude/commands/deploy.md both exist with the same name. Which one wins?",
    "opts": [
     "The command always wins since commands existed first",
     "The skill wins — .claude/skills/ is the canonical location and takes precedence on a name collision with the backward-compatible .claude/commands/ path",
     "Neither works, name collisions cause both to fail",
     "Whichever was created more recently wins"
    ],
    "correct": 1,
    "explain": "The canonical skills path takes precedence specifically to resolve this kind of collision predictably."
   },
   {
    "q": "A Skill's frontmatter includes `allowed-tools: ['Read', 'Grep']`. What does this actually configure for this specific reusable command?",
    "opts": [
     "Prompt injection defense",
     "Pre-approval — Read and Grep run without a permission prompt while the skill is active",
     "Structured output validation",
     "Batch processing efficiency"
    ],
    "correct": 1,
    "explain": "allowed-tools grants frictionless access to specific tools — it's a convenience/pre-approval mechanism, not a restriction boundary. disallowed-tools or permission deny rules are the actual restriction mechanism."
   },
   {
    "q": "Why does @path import nesting have a maximum depth (commonly cited as 5), rather than being unlimited?",
    "opts": [
     "Arbitrary technical limitation with no real purpose",
     "A safety bound — without a limit",
     "Deeper nesting is always faster to process",
     "This limit only applies to test files"
    ],
    "correct": 1,
    "explain": "A depth cap keeps the import graph bounded and predictable rather than allowing indefinite chains."
   },
   {
    "q": "A CI pipeline uses headless mode to run Claude Code nightly, but has no scoped settings.json permissions and no hooks configured. What's the risk?",
    "opts": [
     "No risk, headless mode alone is sufficient protection",
     "Without permission scoping and hooks, an unattended run has no deterministic backstop against an unintended or destructive action",
     "Headless mode automatically restricts all destructive actions",
     "This configuration is the recommended standard"
    ],
    "correct": 1,
    "explain": "Headless mode trades away live human oversight; the other safeguards (permissions, hooks, pipeline gating) are what have to compensate for that missing oversight."
   },
   {
    "q": "Why is /compact's summarization risk (losing exact numeric values) particularly relevant for a support agent tracking an order amount across a long session?",
    "opts": [
     "It isn't relevant, /compact never loses precision",
     "Summarization can vaguen an exact figure ('$847.00' becoming 'a few hundred dollars')",
     "/compact only affects code sessions, not support sessions",
     "This risk only applies to the Batch API"
    ],
    "correct": 1,
    "explain": "This is why a persistent case-facts block (kept separate from summarized history) exists — to protect exact figures from the vagueness /compact-style summarization can introduce."
   },
   {
    "q": "What's the key difference in what /memory persists compared to what a scratchpad file persists during a single session?",
    "opts": [
     "They are identical in function and scope",
     "/memory (via CLAUDE.md) persists knowledge across EVERY future session automatically",
     "Scratchpad files persist longer than /memory",
     "Neither actually persists anything"
    ],
    "correct": 1,
    "explain": "/memory is permanent, cross-session infrastructure; a scratchpad is a working-notes artifact for the duration of one exploration session."
   },
   {
    "q": "A prose instruction 'write a function that validates email addresses' produces inconsistent results across runs. What's the most effective fix?",
    "opts": [
     "Repeat the same instruction more emphatically",
     "Add 2-3 concrete input/output examples (e.g. specific valid and invalid addresses) the model can verify its output against",
     "Switch to a larger model with no other change",
     "Add more adjectives describing what 'valid' means"
    ],
    "correct": 1,
    "explain": "Concrete I/O examples give the model something checkable to verify against — closing the ambiguity gap that a longer prose description alone does not."
   },
   {
    "q": "In test-driven iteration with Claude Code, what should happen FIRST?",
    "opts": [
     "Implementation, followed by tests written to match whatever was built",
     "A test suite covering expected behavior, edge cases, and performance requirements, written BEFORE implementation begins",
     "Neither — tests and implementation should be described in the same single sentence",
     "A code review of the finished implementation"
    ],
    "correct": 1,
    "explain": "Writing tests first gives Claude a concrete, checkable target to implement against and iterate on via actual failures, rather than a vague after-the-fact description of what's wrong."
   },
   {
    "q": "What is the 'interview pattern,' and when is it most useful?",
    "opts": [
     "Having Claude interview a competitor's product for feature ideas",
     "Having Claude use the AskUserQuestion tool to ask YOU clarifying questions before implementing a large or ambiguous feature, then write a spec from the answers",
     "A code-review technique for hiring candidates",
     "A way to speed up direct execution on simple, well-scoped tasks"
    ],
    "correct": 1,
    "explain": "For large or ambiguous features, having Claude interview you first surfaces considerations you may not have thought to specify, producing a spec worth implementing against — direct execution on a simple task doesn't need this."
   },
   {
    "q": "You've found two bugs in the same function where fixing one changes what the correct fix for the other actually looks like. How should you report them?",
    "opts": [
     "Report them one at a time in separate messages, fixing and verifying each independently",
     "Report both together in a single, detailed message, since they interact",
     "It doesn't matter, both approaches are equivalent here",
     "Only report the more severe of the two"
    ],
    "correct": 1,
    "explain": "Interacting issues need to be reasoned about jointly — fixing one in isolation risks a fix that has to be partially undone once the second issue's real shape becomes clear."
   },
   {
    "q": "After an interview-pattern session produces a complete SPEC.md for a new feature, what's the recommended next step?",
    "opts": [
     "Continue implementing in the same long session that did the interviewing",
     "Start a FRESH session with clean context focused entirely on implementation, using the spec as the reference",
     "Discard the spec and re-interview from scratch",
     "Have a different person manually re-type the spec into code"
    ],
    "correct": 1,
    "explain": "A fresh session gives clean, implementation-focused context, while the written spec — not the accumulated interview conversation — is the artifact that carries the requirements forward."
   },
   {
    "q": "A CLAUDE.md rule says 'Never run `rm -rf` on production directories.' What is the fundamental problem with leaving this ONLY in CLAUDE.md?",
    "opts": [
     "There is no problem, CLAUDE.md is always sufficient",
     "CLAUDE.md is a prompt — compliance is only probabilistic, so a dangerous and irreversible action has no deterministic backstop if the model doesn't follow it",
     "CLAUDE.md rules are ignored entirely by the model",
     "This rule should instead be a Skill"
    ],
    "correct": 1,
    "explain": "Anything dangerous or irreversible needs a deterministic gate (a settings.json deny rule) rather than relying on probabilistic prompt compliance."
   },
   {
    "q": "Given a rule 'always run tests before committing,' which mechanism correctly and automatically enforces it on every commit, without depending on the model remembering to do it?",
    "opts": [
     "Leaving it as a CLAUDE.md instruction and hoping it's followed",
     "A `PreToolUse` hook on the commit action that runs the test suite and can block the commit on failure",
     "Renaming the CLAUDE.md file to make the rule more visible",
     "Asking the user to manually confirm tests passed each time"
    ],
    "correct": 1,
    "explain": "A hook runs deterministic code at a defined lifecycle point — it doesn't depend on the model choosing to comply, unlike a CLAUDE.md instruction."
   },
   {
    "q": "A rule reads 'prefer composition over inheritance in new React components.' Why should this stay in CLAUDE.md rather than being converted into a hook or a settings.json rule?",
    "opts": [
     "It's too unimportant to bother enforcing at all",
     "It's a judgment call with no single mechanical pass/fail test — there's no exact condition a hook or permission rule could check",
     "Hooks cannot be written for React code",
     "This should actually be a `deny` permission rule"
    ],
    "correct": 1,
    "explain": "Hooks and permission rules need an exact, checkable condition; a style preference like this has no such condition, which is exactly what CLAUDE.md (a prompt) is suited for."
   },
   {
    "q": "What is the general test for deciding whether a CLAUDE.md rule should be moved to settings permissions or a hook instead?",
    "opts": [
     "Whether the rule sounds important when read aloud",
     "Whether there's an exact, checkable condition for the rule, and whether refusing/reacting outright (deterministically) is the correct response when that condition is met",
     "Whether the rule was written by a senior engineer",
     "Whether the rule is longer than one sentence"
    ],
    "correct": 1,
    "explain": "The deciding factor is enforceability — an exact condition plus a deterministic correct response — not how serious or how long the rule sounds."
   },
   {
    "q": "A team restructures its CLAUDE.md by moving a `deny`-worthy destructive-command rule into settings.json and a test-before-commit rule into a `PreToolUse` hook. What is LEFT behind in CLAUDE.md afterward, if anything?",
    "opts": [
     "Nothing should be left, CLAUDE.md should end up empty",
     "Genuinely advisory, judgment-dependent guidance with no clean deterministic equivalent (e.g. a style preference)",
     "Only rules about branch naming",
     "Only rules that were already being followed correctly"
    ],
    "correct": 1,
    "explain": "Restructuring doesn't empty CLAUDE.md — it leaves exactly the rules that have no mechanical check, which is where a prompt-based instruction remains the right tool."
   },
   {
    "q": "Which mechanism should enforce 'refunds above 500 require human approval'?",
    "opts": [
     "A line in CLAUDE.md",
     "A PostToolUse hook",
     "A PreToolUse hook on the refund tool with conditional logic on the amount",
     "A settings allow rule"
    ],
    "correct": 2,
    "explain": "It must block the call before execution and needs conditional logic on tool input; PostToolUse runs too late and static permission patterns cannot read the amount."
   },
   {
    "q": "Where does 'never read or edit .env files' belong?",
    "opts": [
     "CLAUDE.md with emphasis",
     "Settings permissions deny rules",
     "A PostToolUse hook",
     "A slash command"
    ],
    "correct": 1,
    "explain": "A static pattern refusal enforced before the tool call executes."
   },
   {
    "q": "'Run the formatter after every file edit, automatically.' Best mechanism?",
    "opts": [
     "CLAUDE.md reminder",
     "PostToolUse hook matching Edit and Write",
     "Permissions ask rule",
     "An @import"
    ],
    "correct": 1,
    "explain": "A mechanical action that must always run belongs in a hook independent of model instruction-following."
   },
   {
    "q": "Which rule legitimately stays in CLAUDE.md?",
    "opts": [
     "Never run rm -rf",
     "Block commits when tests fail",
     "Prefer composition over inheritance in new components",
     "Never push to main"
    ],
    "correct": 2,
    "explain": "A style judgment with no clean mechanical check is exactly what CLAUDE.md is for; the others are enforceable gates."
   },
   {
    "q": "A team's CLAUDE.md lists six critical safety rules in capital letters and a dangerous command still ran once. What is the correct restructuring?",
    "opts": [
     "Move the rules to the top of the file",
     "Repeat them in every subdirectory CLAUDE.md",
     "Move dangerous-command rules to permissions deny and checks or automatic actions to hooks, keeping only judgment guidance in CLAUDE.md",
     "Switch to a larger model"
    ],
    "correct": 2,
    "explain": "Emphasis does not change enforcement strength. Critical rules need deterministic mechanisms."
   }
  ],
  "parts": [
   {
    "id": "a2-p1",
    "title": "Where Claude Code finds its instructions",
    "intro": "Everything in this domain starts with one question: which instructions does Claude actually load, and from where? This part covers the CLAUDE.md levels and their exact locations, so the later parts on modularity and enforcement have a foundation."
   },
   {
    "id": "a2-p2",
    "title": "Keeping configuration modular",
    "intro": "One giant CLAUDE.md does not scale, so this part splits instructions into imports, path-scoped rules and on-demand skills. It ends with settings.json, the one layer with a strict precedence chain."
   },
   {
    "id": "a2-p3",
    "title": "Working modes, CI and iteration",
    "intro": "With configuration in place, you decide how Claude Code runs: planning or executing, interactive or headless, which model and effort, which surface. Then you learn how to steer a session toward verifiable results."
   },
   {
    "id": "a2-p4",
    "title": "Configuration at organization scale",
    "intro": "The same mechanisms now apply to many repos and teams. The questions change from how to configure one project to who owns what, how changes propagate and which habits become enforced policy."
   },
   {
    "id": "a2-p5",
    "title": "Choosing the mechanism, then drilling it",
    "intro": "Every earlier part ends in one decision: should a rule be prose, a permission or a hook? This final part gives you the decision procedure and then makes you apply it to realistic rule lists."
   }
  ],
  "roadmap": {
   "kind": "roadmap",
   "title": "Domain roadmap: Claude Code configuration",
   "parts": [
    {
     "t": "Where instructions live",
     "items": [
      "Three CLAUDE.md levels",
      "Exact paths",
      "Monorepo zones"
     ]
    },
    {
     "t": "Modular configuration",
     "items": [
      "@path imports",
      "Path-scoped rules",
      "Skills",
      "settings.json precedence"
     ]
    },
    {
     "t": "Modes, CI and iteration",
     "items": [
      "Plan vs execute",
      "Headless -p",
      "Model and effort",
      "Surfaces"
     ]
    },
    {
     "t": "Organization scale",
     "items": [
      "Settings strategy",
      "Shared imports",
      "Standing policy",
      "MCP scope"
     ]
    },
    {
     "t": "Choose and drill",
     "items": [
      "Prompt, permission or hook",
      "Sorting drill"
     ]
    }
   ]
  }
 },
 {
  "id": "a3",
  "title": "Prompt Engineering & Structured Output",
  "weight": "20%",
  "emoji": "🧭",
  "intro": "Full mechanics of writing reliable prompts and getting reliable structured output — instruction clarity, few-shot, schema design rules, error types — then the system-level tradeoffs of applying these consistently across an organization's Claude-powered features.",
  "archHighlights": {
   "1": [
    "System prompt architecture, explicit criteria"
   ],
   "6": [
    "Schema validation, semantic vs. syntax errors"
   ],
   "8": [
    "Structured final output, batch processing"
   ]
  },
  "sections": [
   {
    "id": "a3-instructions-fewshot",
    "part": "a3-p1",
    "legacy": 0,
    "h": "Explicit instructions and few-shot examples",
    "bridge": "This is the starting point of the domain: before schemas or review, how do you make Claude's output predictable? The answer is measurable instructions plus demonstrated examples.",
    "diagram": {
     "kind": "compare",
     "title": "Vague vs specific, described vs shown",
     "left": {
      "title": "Vague / described",
      "tone": "bad",
      "items": [
       "'Please be concise': length varies every run",
       "Format explained in prose",
       "Model must infer the pattern"
      ]
     },
     "right": {
      "title": "Specific / demonstrated",
      "tone": "ok",
      "items": [
       "'Under 75 words': consistent",
       "2-3 real examples of the exact format",
       "Model imitates a clear pattern"
      ]
     },
     "verdict": "Few-shot types: ambiguous cases with rationale, format, good vs bad, varied layouts."
    },
    "p": [
     "'Please be concise' gets a different length every time; 'answer in under 75 words' gets a consistent result — specific, measurable instructions leave far less room for interpretation than vague ones. Showing 2-3 real examples of exactly the format wanted (few-shot) usually works better than describing the format in words, because it's easier to imitate a clearly demonstrated pattern than to infer one from an abstract description.",
     "Four recognizable few-shot TYPES: ambiguous scenarios paired with rationale (showing not just the correct action but WHY, so the reasoning generalizes to new tricky cases); output formatting (demonstrating the exact required shape); acceptable vs. problematic examples side-by-side (making a judgment boundary concrete); and extraction across different source formats (handling layout variation)."
    ],
    "why": "Durable, always-true rules belong in the system prompt, set once — not buried in a long user-supplied document. In very long conversations, restating a truly critical rule again near the end (in addition to the system prompt) helps, since a rule stated only once far back can lose relative weight against everything piled up since."
   },
   {
    "id": "a3-goal-delegation",
    "part": "a3-p1",
    "legacy": 10,
    "h": "Goal-oriented delegation as a standing instruction-writing standard",
    "bridge": "Explicit instructions raise the question of how much to prescribe. For subagents, rigid step lists are brittle, so the instruction standard becomes goals and quality criteria.",
    "diagram": {
     "kind": "compare",
     "title": "Procedural vs goal-oriented delegation",
     "left": {
      "title": "Rigid step list",
      "tone": "bad",
      "items": [
       "Brittle on anything unscripted",
       "Rediscovered and re-fixed per subagent"
      ]
     },
     "right": {
      "title": "Goal + quality criteria",
      "tone": "ok",
      "items": [
       "Subagent adapts its own strategy",
       "One organization-wide authoring standard",
       "Generic tools guided by enum parameters"
      ]
     },
     "verdict": "Bake goal-oriented design into the standard, not a one-off fix."
    },
    "p": [
     "Developer covers the trap of giving a subagent rigid, step-by-step procedural instructions (causing brittle failure on anything unscripted) versus goal-oriented delegation (specifying goals and quality criteria, letting the subagent adapt its own strategy). At the Architect level, this becomes an organizational STANDARD for how ALL subagent instructions get written across a system, not a one-off fix applied after a specific subagent is observed failing rigidly."
    ],
    "why": "The same reasoning that justifies a reusable validation pattern (rather than one-off validation per feature) applies here: if procedural micromanagement is a known failure mode, an organization should bake goal-oriented instruction design into its subagent-authoring standard from the start — generic tool interfaces guided by enum parameters rather than prescribed step sequences — rather than discovering and re-fixing the same brittleness independently in every new subagent someone builds."
   },
   {
    "id": "a3-explicit-criteria",
    "part": "a3-p2",
    "legacy": 1,
    "h": "Deep dive: explicit criteria over vague instructions, and tracking WHY findings get dismissed",
    "bridge": "Having learned to write specific instructions, we apply that to review prompts. Why do 'be conservative' prompts fail, and how do you measure which criteria misfire?",
    "diagram": {
     "kind": "flow",
     "title": "Criteria and the detected_pattern feedback loop",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Categorical report/skip criteria",
       "sub": "checkable tests, not 'be careful'",
       "tone": "hi"
      },
      {
       "t": "Finding with detected_pattern",
       "sub": "names the triggering construct"
      },
      {
       "t": "Developers dismiss false positives",
       "sub": "tagged by pattern",
       "tone": "warn"
      },
      {
       "t": "Analyse by pattern",
       "sub": "find noisiest category"
      },
      {
       "t": "Disable that category",
       "sub": "restore trust, fix its prompt",
       "tone": "ok"
      }
     ],
     "loops": [
      {
       "from": 3,
       "to": 0,
       "label": "refine criteria for the noisy category"
      }
     ]
    },
    "p": [
     "A vague instruction like 'be conservative' or 'only report high-confidence findings' does NOT reliably improve precision, compared to specific, CATEGORICAL criteria stating exactly which issues to report versus skip — e.g., 'flag a comment only when the claimed behavior contradicts the actual code behavior' (a checkable, specific test) rather than 'check that comments are accurate' (a vague restatement of the goal that gives the model no additional decision procedure). This matters directly for developer trust in an automated review tool: a HIGH false-positive rate in even one category undermines confidence in the tool's OTHER, genuinely accurate categories — once a developer stops trusting one kind of finding, they tend to discount the whole tool.",
     "A specific, named technique for improving a review prompt over time: have each structured finding include a `detected_pattern` field naming the specific code construct that triggered it (e.g. `\"detected_pattern\": \"unchecked_null_dereference\"`). When developers dismiss findings as false positives, this field lets you do SYSTEMATIC analysis of WHICH patterns are generating the most false positives, rather than only having an anecdotal sense that 'the tool is a bit noisy.'"
    ],
    "why": "The `detected_pattern` field turns dismissal feedback into an actionable, categorized dataset instead of undifferentiated noise — you can then temporarily DISABLE a specific high-false-positive category to restore developer trust while iterating on the underlying prompt logic for just that category, rather than either tolerating org-wide noise or shutting the whole tool off. This connects directly to the eval-pipeline principle from Prompt Engineering: you need a way to MEASURE which specific criteria are underperforming before you can systematically improve them, and an untagged pile of 'sometimes wrong' findings can't be measured or improved with any precision."
   },
   {
    "id": "a3-alert-fatigue",
    "part": "a3-p2",
    "legacy": 13,
    "h": "Alert fatigue as an organizational reliability failure",
    "bridge": "The previous section showed false positives erode trust in a tool. Here is the extreme case: what happens at organizational scale when criteria are missing altogether.",
    "diagram": {
     "kind": "flow",
     "title": "How a real SQL injection ships",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Bot flags 47 issues per PR",
       "sub": "mostly style nits",
       "tone": "warn"
      },
      {
       "t": "Engineers stop reading",
       "sub": "after two weeks"
      },
      {
       "t": "Critical SQL injection at flag #23",
       "sub": "buried in noise",
       "tone": "bad"
      },
      {
       "t": "Ships to production",
       "sub": "the missing fix: report/skip rules",
       "tone": "bad"
      }
     ]
    },
    "p": [
     "A concrete case for why vague REPORT/SKIP criteria are a system-level risk, not just noise: an AI PR-review bot flags 47 issues per PR, mostly style nits; a genuine CRITICAL SQL injection sits at flag #23 and ships to production because engineers stopped reading the bot's output after two weeks. Diagnosis: 'the problem isn't the model, it's the missing rules.'"
    ],
    "why": "At organizational scale, this argues for a standardized, explicit REPORT-vs-SKIP taxonomy enforced across every automated review tool a team deploys — not a per-team judgment call — since the failure mode (a real vulnerability lost in noise) is exactly what a compliance-minded architecture must prevent structurally."
   },
   {
    "id": "a3-self-review",
    "part": "a3-p2",
    "legacy": 2,
    "h": "Deep dive: the self-review limitation — why review needs an independent instance",
    "bridge": "Good criteria still need a reviewer, so who should review? Not the session that wrote the output, because it carries its own generation reasoning.",
    "diagram": {
     "kind": "compare",
     "title": "Same-session vs independent review",
     "left": {
      "title": "Same session",
      "tone": "bad",
      "items": [
       "Knows why each choice was made",
       "Tends to confirm, not challenge",
       "Not fixed by a stronger instruction or extended thinking"
      ]
     },
     "right": {
      "title": "Independent instance",
      "tone": "ok",
      "items": [
       "No access to generation reasoning",
       "Judges the output fresh",
       "Per-unit passes plus a cross-unit integration pass"
      ]
     },
     "verdict": "Better review quality means a separate instance, not a better prompt."
    },
    "p": [
     "A model reviewing its OWN output within the SAME session carries the reasoning it used to GENERATE that output — it already knows why it made each choice, so it tends to CONFIRM rather than CHALLENGE those decisions. This is a structural limitation of same-session review, not a prompting problem a better instruction can fix."
    ],
    "why": "The correct architectural response is a genuinely INDEPENDENT instance — a separate invocation with no access to the generation session's reasoning — which judges the output fresh, without the 'I chose this because...' bias. When a scenario asks how to improve review quality, the correct answer is a separate model instance, not a stronger review instruction added to the same session, and not extended thinking within the generating session (which still reasons inside the same biased chain). This is exactly why production review architectures combine INDEPENDENT per-unit review passes (catching local bias-free issues) with a separate cross-unit integration pass (catching what no single independent review would see alone)."
   },
   {
    "id": "a3-provenance",
    "part": "a3-p2",
    "legacy": 3,
    "h": "Deep dive: structured provenance vs. inline text citations — why prose citations get lost",
    "bridge": "Independent review can only verify what it can trace to a source. So where should citations live in extracted data? In their own schema fields, not in prose.",
    "diagram": {
     "kind": "compare",
     "title": "Prose citation vs provenance fields",
     "left": {
      "title": "Inline prose",
      "tone": "bad",
      "items": [
       "value: 'According to page 12 of the 2024 Annual Report, revenue was $4.2B'",
       "Downstream reads the field and drops the citation"
      ]
     },
     "right": {
      "title": "Dedicated fields",
      "tone": "ok",
      "items": [
       "value: 4.2B",
       "source_location: 2024 Annual Report, p.12",
       "source_quote: ...",
       "Survives as long as the record"
      ]
     },
     "verdict": "A schema problem, not a prompting one. Built-in citations don't fit strict JSON."
    },
    "p": [
     "A specific, recognizable failure pattern: an extraction pipeline cites its sources using INLINE PROSE inside the extracted text itself — e.g. a value field containing 'According to page 12 of the 2024 Annual Report, revenue was $4.2B.' When that extracted data is consumed by a DOWNSTREAM system (a database, an analytics dashboard, another pipeline stage), the source attribution is consistently lost, because downstream consumers typically read a specific FIELD (like `revenue: 4.2B`) and have no reason to parse free-text prose looking for an embedded citation buried inside it."
    ],
    "why": "The root cause is a SCHEMA design problem, not a prompting problem: the citation information was never given its OWN field, so it had nowhere to survive except as prose attached to the value — and prose is exactly what gets discarded or ignored once a downstream system extracts just the field it needs. The fix is DEDICATED provenance fields in the schema itself, separate from the value field: `{\"field\": \"revenue\", \"value\": \"4.2B\", \"source_location\": \"2024 Annual Report, page 12\", \"source_quote\": \"...\"}` — now the citation survives as long as the record itself does, because it's structural data, not text a downstream reader has to know to look for. This is also why the API's built-in citations feature isn't the fix here: citations are designed for NARRATIVE answers (interleaved citation blocks in prose) and are generally incompatible with strict JSON structured outputs — for structured extraction specifically, you represent source locations EXPLICITLY as their own schema fields, rather than assuming a citation feature can be attached to arbitrary JSON values."
   },
   {
    "id": "a3-choose-method",
    "part": "a3-p3",
    "legacy": 15,
    "h": "Choosing the structured-output method — tool use with JSON schema vs. prompt-based formatting vs. prefilled responses",
    "bridge": "Review and provenance both assume output with a dependable shape. Which of the three ways to get structured output fits depends on how strict the downstream consumer is.",
    "diagram": {
     "kind": "decision",
     "title": "Pick the method by downstream strictness",
     "q": {
      "t": "Who consumes the output?",
      "sub": "Strictness requirement"
     },
     "branches": [
      {
       "label": "Automated system, JSON.parse, database",
       "t": "Tool use + JSON schema",
       "sub": "API-validated, strongest",
       "tone": "ok"
      },
      {
       "label": "Simple flat shape, low stakes",
       "t": "Prefilled response",
       "sub": "A nudge, not enforced",
       "tone": "warn"
      },
      {
       "label": "Human skims, prototyping",
       "t": "Prompt-based formatting",
       "sub": "No enforcement, weakest",
       "tone": "mute"
      }
     ],
     "note": "Over-engineering wastes effort; under-engineering ships malformed data."
    },
    "p": [
     "There are three distinct ways to get structured output out of Claude, and they give different STRICTNESS guarantees. Tool use with a JSON schema (defining a tool whose `input_schema` matches the desired output shape, then forcing or allowing Claude to 'call' it) is the STRONGEST guarantee: the API validates the output against the schema, so malformed JSON or a wrong type is far less likely to slip through, and nested objects/arrays/enums are all natively supported. Prompt-based formatting (asking in plain language: 'respond only in JSON matching this shape') is the WEAKEST guarantee — there's no structural enforcement at all, so the model can add explanatory prose before or after the JSON, use inconsistent key casing, or drift from the requested shape entirely, especially over a long conversation. Prefilled responses (starting Claude's reply with an opening fragment like `{` to bias it toward continuing valid JSON) sit in the middle — cheaper and simpler than defining a full tool schema, but only a nudge, not a guarantee, and fragile against deeply nested or highly variable structures.",
     "Worked example: a legal-document extraction pipeline needs a required, nullable `effective_date` field, an enum `contract_type`, and a nested `parties` array of objects — a genuinely strict schema with real validation needs. Tool use with JSON schema is the right choice here: the schema is complex enough that prompt-based formatting would drift, and the strictness requirement (this feeds an automated downstream system, not a human skimming the output) rules out a method that's merely 'usually right.'",
     "Worked example (the other end): a quick internal script that asks Claude to summarize a log file as `{summary: string, severity: string}` for a developer to glance at in a terminal — low strictness requirement, simple flat shape, no downstream automation depending on exact conformance. Prompt-based formatting (or a prefilled `{` ) is proportionate here; standing up a full tool-use schema for a two-field, human-read-only output is unnecessary ceremony."
    ],
    "why": "The exam-relevant skill is SELECTING the method based on the actual strictness requirement of the downstream consumer, not defaulting to the same method every time. An automated system parsing the output with `JSON.parse()` and feeding it into a database needs tool-use-with-schema; a human skimming a quick summary does not need that overhead — over-engineering the simple case wastes effort, and under-engineering the strict case ships silently malformed data downstream.",
    "table": {
     "headers": [
      "Method",
      "Strictness guarantee",
      "Best fit"
     ],
     "rows": [
      [
       "Tool use with JSON schema",
       "Strongest — API-validated structure, types, enums, nesting",
       "Downstream automation, strict schemas, production pipelines"
      ],
      [
       "Prefilled response (e.g. starting with `{`)",
       "Moderate — a nudge, not enforced",
       "Simple flat shapes, lower-stakes output, quick internal tools"
      ],
      [
       "Prompt-based formatting only",
       "Weakest — no structural enforcement at all",
       "Prototyping, or when a human will read and tolerate minor drift"
      ]
     ]
    },
    "deep": "A common exam trap is assuming 'more explicit prompt instructions' can substitute for schema-level enforcement on a genuinely strict use case — no amount of prose emphasis ('You MUST respond only in valid JSON') gives the same guarantee as API-side schema validation, especially as conversations get longer and the instruction drifts further from the model's most recent context. The decision axis is strictness of the downstream requirement, not how well-written the prompt is."
   },
   {
    "id": "a3-message-mechanics",
    "part": "a3-p3",
    "legacy": 18,
    "h": "Message structure mechanics — tool_result as a user-role block, and mid-conversation system messages",
    "bridge": "Choosing tool use means tool calls and results flow through the message array. Before forcing them, you need the exact structural rules: roles and ordering.",
    "diagram": {
     "kind": "seq",
     "title": "A valid tool_use / tool_result exchange",
     "actors": [
      {
       "t": "assistant",
       "tone": "hi"
      },
      {
       "t": "user"
      },
      {
       "t": "system",
       "tone": "warn"
      }
     ],
     "rows": [
      {
       "f": 0,
       "t": 1,
       "text": "tool_use id=abc (get_account_balance)"
      },
      {
       "f": 1,
       "t": 0,
       "text": "user message holding tool_result id=abc",
       "dashed": true,
       "tone": "ok"
      },
      {
       "f": 2,
       "t": 0,
       "text": "system update here is fine (pair closed)",
       "dashed": true
      },
      {
       "note": "A system message BETWEEN tool_use and tool_result is a 400 error. There is no 'tool' role.",
       "over": [
        0,
        2
       ],
       "tone": "bad"
      }
     ]
    },
    "p": [
     "There is no `\"tool\"` role in the Messages API. A `tool_result` content block — the actual output returned from executing a tool the model called — is placed inside a message with role `\"user\"`, immediately following the `assistant` message that contained the matching `tool_use` block. This trips people up because it FEELS like the tool is 'speaking,' but structurally the API models it as the next thing the user-side of the conversation hands back to the model, keyed to the tool_use's `id`.",
     "Mid-conversation `system` messages follow their own placement rules, distinct from the single top-level `system` parameter: a `system`-role message must follow either a `user` turn or an `assistant` turn that ended in a server-side tool use, and it must precede an `assistant` turn or sit at the end of the array. It can NEVER be inserted between a `tool_use` block and its corresponding `tool_result` — the API returns a 400 error if a system message tries to split that pair, because the tool_use and its result are treated as one atomic exchange.",
     "Worked example: an agent calls a `get_account_balance` tool (an `assistant` message with a `tool_use` block). The very next message MUST be a `user`-role message containing the `tool_result` block for that same `id` — not a `system` message injecting a policy update, even if that update is genuinely urgent. The correct place for that update is either before the `tool_use` was issued, or after its `tool_result` has been returned and the exchange is complete."
    ],
    "why": "This is a pure mechanics question the exam tests directly: given a described (or malformed) message array, identify whether it's a valid sequence under the API's role and ordering rules. The two most common wrong answers are inventing a `\"tool\"` role that doesn't exist, and placing a `system` message between a `tool_use` and its `tool_result`.",
    "table": {
     "headers": [
      "Misconception",
      "Actual mechanic"
     ],
     "rows": [
      [
       "Tool output goes in a message with role `\"tool\"`",
       "Tool output is a `tool_result` content block inside a `user`-role message"
      ],
      [
       "A `system` message can go anywhere between turns",
       "It must follow a `user` turn (or a server-tool-ending `assistant` turn) and precede an `assistant` turn — never splitting a `tool_use`/`tool_result` pair"
      ],
      [
       "Only the top-level `system` parameter can set instructions",
       "Mid-conversation `system` messages are also valid, and a later one takes precedence over an earlier one or the top-level field"
      ],
      [
       "A `tool_use` and its `tool_result` can have other messages inserted between them",
       "They must be adjacent — inserting anything between them, including a `system` message, is a 400 error"
      ]
     ]
    },
    "deep": "The reason the tool_use/tool_result pair can't be split is that the API treats them as a single logical unit representing one action-and-its-outcome — breaking that unit with an unrelated message in between would leave the model unable to reliably resolve which `tool_use` a later `tool_result` belongs to. When an architect needs to inject an update while a tool call is in flight, the update has to wait for the pair to close, then arrive as either a fresh `system` message or be prefixed onto the next `user` turn — never squeezed in mid-pair."
   },
   {
    "id": "a3-tool-choice",
    "part": "a3-p3",
    "legacy": 16,
    "h": "Forcing tool invocation with tool_choice, and sequencing multi-tool workflows correctly",
    "bridge": "The schema only helps if Claude actually makes the call. tool_choice controls that for one turn, and sequencing dependent tools is left to your code.",
    "diagram": {
     "kind": "grid",
     "title": "What each tool_choice setting guarantees",
     "corner": "Setting",
     "cols": [
      "Tool called?",
      "Which tool?"
     ],
     "rows": [
      {
       "h": "auto",
       "cells": [
        {
         "t": "Not guaranteed",
         "tone": "bad"
        },
        {
         "t": "Claude decides",
         "tone": "mute"
        }
       ]
      },
      {
       "h": "any",
       "cells": [
        {
         "t": "Some tool",
         "tone": "ok"
        },
        {
         "t": "Not pinned",
         "tone": "warn"
        }
       ]
      },
      {
       "h": "named tool",
       "cells": [
        {
         "t": "Yes",
         "tone": "ok"
        },
        {
         "t": "That exact one",
         "tone": "ok"
        }
       ]
      }
     ]
    },
    "p": [
     "`tool_choice` controls whether and how Claude is required to call a tool: `auto` (default) lets Claude decide whether a tool call is needed at all; `any` forces Claude to call SOME tool from the available set, but doesn't pin down which one; forcing a SPECIFIC tool (naming it directly) guarantees that exact tool gets called. When structured output is mandatory — the calling code has no fallback path for a plain-text response — `tool_choice` must be set to force invocation of the specific output-formatting tool; leaving it at `auto` risks Claude reasoning its way to a prose answer instead of the required structured call, and the calling code then has nothing to parse.",
     "Worked example: a workflow needs to (1) look up a customer's account by ID, then (2) issue a refund using the account details just retrieved. If both tools are exposed with `tool_choice: any` and Claude is simply told 'process this refund,' there's a real risk Claude attempts the refund tool FIRST, before the prerequisite lookup has returned the account details the refund tool actually needs — producing a call with missing or guessed parameters. The correct sequencing fix is architectural, not just a `tool_choice` setting: force the lookup tool first (forcing that SPECIFIC tool for the first turn), only exposing or forcing the refund tool once the lookup's result is back in the conversation as a `tool_result`.",
     "Worked example, continued: this is the same prerequisite-ordering discipline the exam expects at the multi-tool-workflow level — `tool_choice` guarantees THAT a tool gets called and (when a specific tool is named) WHICH one, but it does not, by itself, guarantee dependent calls happen in the right order across multiple turns. Getting the order right is a matter of controlling which tools are even available/forced at each turn of the loop, not a single global tool_choice setting applied once."
    ],
    "why": "This objective combines two mechanics that are each simple alone but are tested together: forcing invocation (so structured output is guaranteed to happen) AND sequencing (so a dependent tool call doesn't fire before the data it needs exists). Missing either half produces a real failure — `tool_choice:auto` on a mandatory-output workflow can silently skip the structured call entirely, while correct `tool_choice` with no sequencing discipline can call tools in an order that produces garbage parameters.",
    "table": {
     "headers": [
      "tool_choice setting",
      "Guarantees",
      "Does NOT guarantee"
     ],
     "rows": [
      [
       "auto",
       "Claude may call a tool if it judges one is needed",
       "Any tool call happens at all — a mandatory-output workflow can't rely on this"
      ],
      [
       "any",
       "Some tool from the available set will be called",
       "WHICH tool — the wrong one for the situation could still be picked"
      ],
      [
       "a specific named tool",
       "That exact tool will be called this turn",
       "Correct sequencing across multiple turns — must be enforced by which tools are exposed/forced per turn"
      ]
     ]
    },
    "deep": "The trap: treating tool_choice as if it were a full workflow-orchestration mechanism. It only controls a single turn's tool-call decision — sequencing a multi-step, prerequisite-dependent workflow requires the calling code to manage which tools are exposed or forced at EACH turn (lookup tool forced first, refund tool only exposed after the lookup's tool_result is in context), not a one-time global setting applied at the start of the conversation."
   },
   {
    "id": "a3-schema-limits",
    "part": "a3-p4",
    "legacy": 4,
    "h": "Structured output: schema-based approaches and their limits",
    "bridge": "Now that the structured call is forced, what does it actually guarantee? Syntax, but not truth, which is why schema design rules matter.",
    "diagram": {
     "kind": "layers",
     "title": "What a schema-valid response covers",
     "arrows": false,
     "layers": [
      {
       "t": "Semantic correctness",
       "sub": "wrong values, hallucinations, bad totals",
       "tone": "bad",
       "tag": "NOT guaranteed"
      },
      {
       "t": "Schema design choices",
       "sub": "required only if always present, nullable, other, unclear",
       "tone": "warn",
       "tag": "you control"
      },
      {
       "t": "Syntax and types",
       "sub": "valid JSON, correct types, valid enums",
       "tone": "ok",
       "tag": "guaranteed"
      }
     ]
    },
    "p": [
     "Using tool-use with a JSON schema is the most reliable way to get structured output — it eliminates SYNTAX errors (invalid JSON, wrong types) but does NOT prevent SEMANTIC errors (wrong values, hallucinated facts, numbers that don't add up). A schema-valid response is not the same claim as a correct response.",
     "Schema design rules that materially change reliability: mark a field `required` only if the data is ALWAYS available (required-but-sometimes-missing pushes fabrication); use nullable types (`[\"string\",\"null\"]`) for legitimately absent information; add an `other` enum value paired with a detail field for a resilient catch-all instead of continuously expanding a fragile enum; add an `unclear` enum option so the model can honestly signal it can't confidently categorize a case."
    ],
    "why": "A critical gotcha: making a field nullable does NOT by itself stop hallucination — the model can still invent a plausible value unless the PROMPT explicitly instructs it to return null when data is absent. And even correct null-handling doesn't guarantee consistent FORMATTING within a field ('cotton blend' vs 'Cotton/Polyester mix') — that needs few-shot examples showing the standardized format, not a lower temperature setting."
   },
   {
    "id": "a3-missing-fields",
    "part": "a3-p4",
    "legacy": 12,
    "h": "Three ways to handle a missing field, and a third honesty state beyond null",
    "bridge": "Schema design rules start with the hardest case: a value that may not exist. Which of three missing-field designs is honest, and what lies beyond null?",
    "diagram": {
     "kind": "grid",
     "title": "Three designs for a field that may be absent",
     "corner": "Design",
     "cols": [
      "Result when absent",
      "Verdict"
     ],
     "rows": [
      {
       "h": "Required, non-nullable",
       "cells": [
        {
         "t": "Model fabricates",
         "tone": "bad"
        },
        {
         "t": "Avoid",
         "tone": "bad"
        }
       ]
      },
      {
       "h": "Optional only",
       "cells": [
        {
         "t": "Omitted: 'absent' = 'never checked'",
         "tone": "warn"
        },
        {
         "t": "Weaker",
         "tone": "warn"
        }
       ]
      },
      {
       "h": "Required + nullable",
       "cells": [
        {
         "t": "null = checked, absent",
         "tone": "ok"
        },
        {
         "t": "Correct",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Value present, implied",
       "cells": [
        {
         "t": "Tag EXTRACTED vs INFERRED",
         "tone": "hi"
        },
        {
         "t": "Add this too",
         "tone": "hi"
        }
       ]
      }
     ]
    },
    "p": [
     "Precisely: (1) required + non-nullable forces fabrication when the value is genuinely absent; (2) optional-only lets the model omit the field, so downstream code can't distinguish 'checked, absent' from 'never checked'; (3) required + nullable is correct — the field always appears, and null honestly means 'checked, genuinely absent.' A separate, third honesty state sits between a confident value and null: tagging a value EXTRACTED (directly stated) vs. INFERRED (derived/projected) — e.g. a contract's payment_terms stated outright is EXTRACTED, while an effective_date only implied by 'anticipated in Q1 2025' is INFERRED, not a confirmed fact."
    ],
    "why": "An architect designing an extraction schema standard should mandate all three: nullable+required fields for genuine absence, an EXTRACTED/INFERRED tag (or equivalent) for values that exist but aren't directly stated, and — separately — an explicit prompt instruction to actually use null when appropriate, since a nullable schema alone doesn't stop hallucination without that instruction."
   },
   {
    "id": "a3-nullable-gotcha",
    "part": "a3-p4",
    "legacy": 8,
    "h": "The nullable-schema gotcha, and why it's an architectural training point",
    "bridge": "Required plus nullable gives the model an honest option, but does it use it? This section shows why schema change alone only fixes half the problem.",
    "diagram": {
     "kind": "compare",
     "title": "Schema and prompt fixes are not substitutes",
     "left": {
      "title": "Schema fix",
      "tone": "hi",
      "items": [
       "Make the field nullable",
       "Offers an honest option",
       "Alone: model can still invent a value"
      ]
     },
     "right": {
      "title": "Prompt fix",
      "tone": "ok",
      "items": [
       "'Return null if absent'",
       "Few-shot for field format ('cotton blend' vs 'Cotton/Polyester mix')",
       "Temperature does not fix formatting"
      ]
     },
     "verdict": "Verify both together in the prompt-review checklist.",
     "vs": "+"
    },
    "p": [
     "A schema making a field nullable does NOT by itself stop the model from hallucinating a plausible value instead of returning null — that requires an EXPLICIT prompt instruction alongside the schema change. And even once null-handling is correct, inconsistent FORMATTING within a field (e.g. 'cotton blend' vs. 'Cotton/Polyester mix') is a separate problem solved by few-shot examples, not by temperature settings."
    ],
    "why": "At the architecture level, this is worth generalizing into a standing PRINCIPLE for how your organization builds extraction prompts: schema changes and prompt-instruction changes are NOT substitutes for each other, and must be verified together — a schema-only fix or a prompt-only fix each solve half the problem. Building this two-part verification into a standard prompt-review checklist prevents the same gotcha from recurring across every new extraction feature the organization builds."
   },
   {
    "id": "a3-schema-evolution",
    "part": "a3-p4",
    "legacy": 7,
    "h": "Designing resilient schemas, at the system level",
    "bridge": "Nullable and resilient enums handle one document at a time. Documents that get amended need a schema that keeps multiple valid values over time.",
    "diagram": {
     "kind": "compare",
     "title": "Overwrite vs tagged values",
     "left": {
      "title": "Single overwritten field",
      "tone": "bad",
      "items": [
       "Amendment replaces the original",
       "History silently lost",
       "Wrong output after first amendment"
      ]
     },
     "right": {
      "title": "Multiple tagged values",
      "tone": "ok",
      "items": [
       "value + source + effective date",
       "Original and amendment both kept",
       "Designed in before amendments arrive"
      ]
     },
     "verdict": "Same catch-all idea: 'other' plus a detail field, added once, not endless enum growth."
    },
    "p": [
     "The fragile-expansion anti-pattern (continuously adding enum values as edge cases arise, breaking validation each time) and its fix — a resilient catch-all (`other` value plus a detail field, added once) — is a Developer-level fact. At the Architect level, the same judgment extends to DOCUMENT EVOLUTION: for schemas processing documents that can be amended over time (contracts, policies), redesign fields that might change to hold MULTIPLE tagged values (value, source, effective date) rather than being overwritten — preserving full history instead of silently losing the original when an amendment arrives."
    ],
    "why": "This is a system-design decision, not a one-off fix: it requires anticipating, at design time, that documents in this domain WILL be amended, and architecting the schema (and everything downstream that reads it) to handle multiple valid values over time from the start, rather than retrofitting it after the first amendment causes silently wrong output."
   },
   {
    "id": "a3-shared-intermediate",
    "part": "a3-p4",
    "legacy": 11,
    "h": "Structured intermediate representations as system-wide plumbing",
    "bridge": "From one schema's honesty to many schemas working together: when several subagents feed a synthesis step, they need a shared intermediate format.",
    "diagram": {
     "kind": "hub",
     "title": "One shared intermediate schema",
     "center": {
      "t": "Shared contract",
      "sub": "claim / evidence / source / confidence",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "Subagent A",
       "sub": "conforms"
      },
      {
       "t": "Subagent B",
       "sub": "conforms"
      },
      {
       "t": "Subagent C",
       "sub": "conforms"
      },
      {
       "t": "Synthesis step",
       "sub": "reads one format",
       "tone": "ok"
      }
     ],
     "note": "Built once and reused, like an MCP server, not reinvented per pipeline."
    },
    "p": [
     "Developer covers the format-conversion-layer pattern (standardizing heterogeneous subagent outputs into one common representation before synthesis) and the citation rule (preserving claim-source mappings through synthesis) as techniques for a specific multi-agent pipeline. At the Architect level, this becomes shared PLUMBING: a common intermediate schema (claim/evidence/source/confidence, or similar) that EVERY subagent feeding into ANY synthesis step across the organization is expected to conform to, maintained as a shared contract rather than reinvented per pipeline."
    ],
    "why": "This is the direct Accuracy-axis entry from the constraints hierarchy applied at organizational scale — the same way MCP servers get built once and reused across apps, a standardized intermediate representation gets designed once and reused across every multi-agent synthesis pipeline the organization builds, rather than each team inventing its own incompatible intermediate format and citation convention."
   },
   {
    "id": "a3-retry-feedback",
    "part": "a3-p5",
    "legacy": 5,
    "h": "Retry-with-feedback and self-correction",
    "bridge": "A well-designed schema still produces failures. When validation fails, should you retry? Only if the failure is fixable by reasoning, not if the information is missing.",
    "diagram": {
     "kind": "decision",
     "title": "Does a retry help?",
     "q": {
      "t": "Validation failed: what kind?",
      "sub": "Retry with source, bad output, specific error"
     },
     "branches": [
      {
       "label": "Format / structure",
       "t": "Retry with feedback",
       "sub": "usually fixed in 2-3 attempts",
       "tone": "ok"
      },
      {
       "label": "Arithmetic inconsistency",
       "t": "Retry with feedback",
       "sub": "include the error",
       "tone": "ok"
      },
      {
       "label": "Info absent from source",
       "t": "Do not retry",
       "sub": "no number of retries helps",
       "tone": "bad"
      }
     ]
    },
    "p": [
     "When validation fails, retrying WITH feedback (the original source, the previous incorrect output, and the specific error) genuinely helps for FORMAT errors, STRUCTURAL errors, and ARITHMETIC inconsistencies — typically resolving within 2-3 attempts. It does NOT help when information is genuinely absent from the source, no matter how many retries are attempted.",
     "Self-correction via conflict detection: have the model report both a STATED value (from the source) and a CALCULATED value (derived independently), flagged if they disagree — e.g. a stated total of $150 vs. line items summing to $145. Real-world mismatch rates around 18% are common in invoice-style extraction; the correct routing policy sends ONLY the flagged records to human review, not all records and not none."
    ],
    "why": "Recognizing WHICH failure type you're facing (fixable-by-reasoning vs. missing-information) determines whether retry is worth attempting at all — retrying blindly wastes calls on failures retry cannot fix. Conflict detection surfaces an inconsistency a single extracted value would hide completely, and targeted routing on the flag is what lets a system balance accuracy against human-review cost."
   },
   {
    "id": "a3-consistency-routing",
    "part": "a3-p5",
    "legacy": 9,
    "h": "Enforcing mathematical/internal consistency at scale",
    "bridge": "Retries fix what reasoning can fix; for values that disagree, you also need detection and routing. How much should go to a human?",
    "diagram": {
     "kind": "decision",
     "title": "Route on the conflict flag",
     "q": {
      "t": "Stated vs calculated value",
      "sub": "e.g. $150 stated, line items sum to $145"
     },
     "branches": [
      {
       "label": "Agree",
       "t": "Automated pass",
       "sub": "no human needed",
       "tone": "ok"
      },
      {
       "label": "Disagree (flag fires)",
       "t": "Human review",
       "sub": "roughly 18% in invoice work",
       "tone": "warn"
      }
     ],
     "note": "Review everything and automation is pointless; review nothing and wrong data ships."
    },
    "p": [
     "Self-correction via conflict detection (reporting both a stated value and an independently calculated value, flagged if they disagree) is a Developer-level technique. At the Architect level, the relevant addition is the ROUTING POLICY built on top of it: with a realistic real-world mismatch rate (commonly cited around 18% for invoice-style extraction), routing every record to human review defeats the purpose of automating extraction, while routing NONE risks silently shipping wrong data. The correct system design routes to review ONLY when the conflict flag actually fires."
    ],
    "why": "This is where 'accuracy' from the constraints hierarchy (Structured intermediates & few-shot prompts) and 'cost' (of human review capacity) directly trade off against each other — the conflict-detection field is what lets the system route intelligently, sending the ~18% that need a human there efficiently, instead of either extreme (100% automated with hidden errors, or 100% human-reviewed with no efficiency gain from automation at all)."
   },
   {
    "id": "a3-feedback-loop",
    "part": "a3-p5",
    "legacy": 17,
    "h": "Designing feedback-loop mechanisms that capture structured error metadata to improve prompts and schemas over time",
    "bridge": "Flags handle individual records; a feedback loop learns from all failures. What metadata must you capture so patterns become visible?",
    "diagram": {
     "kind": "flow",
     "title": "Production failure feedback loop",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Failure occurs",
       "sub": "malformed, hallucinated, wrong enum",
       "tone": "bad"
      },
      {
       "t": "Log structured metadata",
       "sub": "doc_id, failed_field, failure_type, raw output"
      },
      {
       "t": "Aggregate",
       "sub": "e.g. 40% vendor_name on scans",
       "tone": "warn"
      },
      {
       "t": "Targeted fix",
       "sub": "few-shot or null rule",
       "tone": "ok"
      }
     ],
     "loops": [
      {
       "from": 3,
       "to": 0,
       "label": "re-measure the failures"
      }
     ]
    },
    "p": [
     "A production extraction or generation pipeline will produce failures — malformed JSON, a hallucinated value, a schema violation, a wrong classification. A feedback loop turns those failures into IMPROVEMENT rather than letting them silently recur: instead of just logging 'error' or discarding a bad response, capture structured metadata about EACH failure — which field failed, what kind of failure it was (schema violation vs. hallucinated value vs. wrong enum choice vs. missing required data), the input that triggered it, and the actual malformed output — then aggregate that metadata across many failures to find PATTERNS worth fixing at the source.",
     "Worked example: an invoice-extraction pipeline logs every failure as `{doc_id, failed_field, failure_type, raw_output, input_excerpt}`. After a week, aggregating by `failed_field` + `failure_type` shows 40% of all failures are `vendor_name` hallucinations specifically on scanned (not digitally native) PDFs — a pattern invisible from any single failure in isolation. The fix this metadata points to is targeted: add a few-shot example specifically covering a scanned-PDF vendor field, or add an explicit 'if the vendor name is not clearly legible, return null rather than guessing' instruction — not a generic 'try harder' prompt tweak applied blindly to the whole prompt.",
     "Worked example, continued: without structured metadata, the same failure pattern would show up only as an vague rising error rate with no actionable next step — the team would be stuck re-reading individual failed outputs one at a time, guessing at a root cause, rather than being pointed directly at 'scanned PDFs' and 'vendor_name' by the aggregated data itself."
    ],
    "why": "This closes the loop between production failures and prompt/schema iteration — the same iterative-refinement principle taught for a single development session (I/O examples, test-driven iteration) applied continuously in production, where the 'test failures' are real-world extraction errors instead of a written test suite. Capturing WHY each failure happened, in a structured and aggregatable form, is what turns scattered failures into a specific, targeted fix instead of a shot-in-the-dark prompt rewrite.",
    "table": {
     "headers": [
      "What gets captured",
      "Why it matters"
     ],
     "rows": [
      [
       "failure_type (schema violation / hallucination / wrong enum / missing data)",
       "Different failure types need different fixes — a schema violation may need a tool_choice fix, a hallucination may need an explicit null-handling instruction"
      ],
      [
       "failed_field",
       "Points at exactly which part of the schema or prompt needs attention, not the whole prompt"
      ],
      [
       "input characteristics (e.g. scanned vs. native PDF, document length)",
       "Surfaces patterns tied to a specific input SUBSET, not visible from aggregate error rate alone"
      ],
      [
       "raw malformed output",
       "Lets you verify the actual failure mode rather than guessing from the error message alone"
      ]
     ]
    },
    "deep": "The trap is treating 'log the error' as sufficient. A bare error count or generic error log tells you THAT failures are happening but not what to fix — the architectural requirement here is specifically STRUCTURED, aggregatable metadata (consistent fields across every failure) so patterns become visible across hundreds of failures, which is what actually drives a targeted prompt or schema improvement instead of an undirected one."
   },
   {
    "id": "a3-extraction-drill",
    "part": "a3-p5",
    "legacy": 20,
    "h": "Extraction accuracy patterns — one worked invoice pipeline, symptom by symptom",
    "bridge": "This drill pulls the whole part together: one invoice pipeline with four symptoms, each matched to the layer that fixes it.",
    "diagram": {
     "kind": "grid",
     "title": "Symptom to fix layer",
     "corner": "Symptom",
     "cols": [
      "Fix layer"
     ],
     "rows": [
      {
       "h": "Invented PO number",
       "cells": [
        {
         "t": "Nullable + 'null if absent'",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Mixed date formats",
       "cells": [
        {
         "t": "Normalize to ISO 8601",
         "tone": "hi"
        }
       ]
      },
      {
       "h": "Amounts off by 1000",
       "cells": [
        {
         "t": "Plain decimals + EU few-shot",
         "tone": "hi"
        }
       ]
      },
      {
       "h": "Category drift",
       "cells": [
        {
         "t": "Enum + other + unclear",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Schema-valid but wrong",
       "cells": [
        {
         "t": "Validation + review routing",
         "tone": "warn"
        }
       ]
      }
     ]
    },
    "p": [
     "Scenario: an extraction agent processes invoices from three sources — a US vendor (date 03/04/2025, amount $1,234.50), a German vendor (date 03.04.2025, amount 1.234,50 EUR) and a scanned receipt where the purchase-order number is not printed at all. Early results: invented PO numbers on the scan, dates in mixed formats, amounts off by a factor of 1000 on the German invoices, and a category field that sometimes contains free text. Each symptom has its own pattern.",
     "Symptom 1 — invented PO number: the field is required, so the model fabricates one. Fix in the schema: make the field nullable (type string or null) and keep it in the required list, so the model must state an answer and null is the honest one; instruct 'use null if the document does not contain it; never infer'. Plain optional also works but cannot distinguish 'checked, absent' from 'forgot'. Symptom 2 — mixed date formats: add a NORMALIZATION instruction and format rule (dates as ISO 8601 YYYY-MM-DD) and state the ambiguity policy (for 03/04/2025 use the vendor locale; if the locale is unknown, return the raw string in a separate field and flag it). Symptom 3 — amounts wrong by 1000: normalization again (amount as a plain decimal number with no thousands separators; currency as a separate field) PLUS few-shot examples showing the European convention converted correctly. Symptom 4 — category drift: replace the free-text field with an enum (for example hardware, software, services, travel, other) and add an 'other' value with a companion other_detail string, so unexpected values are representable without being forced into a wrong bucket; an 'unclear' value is appropriate when the document is ambiguous.",
     "Few-shot examples do the heavy lifting when quality varies across layouts: include 2-4 examples covering DIFFERENT formats (US, European, scanned) and at least one where a field is absent so the expected output shows null. Examples demonstrate the pattern; instructions state the rule; the schema constrains the shape — the three layers reinforce each other.",
     "Important limit: a tool-use JSON schema guarantees STRUCTURE (valid JSON, correct types, valid enum values) but not SEMANTIC correctness. A well-typed fabricated PO number passes schema validation. That is why nullable fields, normalization rules, examples and downstream consistency checks (for example line-item sum versus stated total) are separate layers rather than substitutes for the schema."
    ],
    "why": "Scorecard: 50%. Match the symptom to the layer — fabrication → nullable/optional; inconsistent formats → normalization instructions; inconsistency across varied documents → few-shot coverage of each layout; uncontrolled values → enums with other and unclear; impossible totals → a validation check that routes to review.",
    "table": {
     "headers": [
      "Symptom",
      "Pattern",
      "Why it works"
     ],
     "rows": [
      [
       "Fabricated value for a missing field",
       "Nullable (or optional) field plus 'null if absent' instruction",
       "Gives the model an honest way to say absent"
      ],
      [
       "Mixed date or currency formats",
       "Normalization instructions plus format rule",
       "Removes per-document guesswork"
      ],
      [
       "Different layouts behave differently",
       "Few-shot examples per layout, including a null case",
       "Teaches the pattern on real variants"
      ],
      [
       "Free-text category drift",
       "Enum with other plus detail field, and unclear",
       "Represents the unexpected without forcing a wrong label"
      ],
      [
       "Schema-valid but wrong",
       "Validation checks and human-review routing",
       "Schemas cannot verify meaning"
      ]
     ]
    },
    "deep": "Distractor alert: 'add stronger wording to the prompt' and 'lower the temperature' are classic weak answers for fabrication, because the underlying problem is that the schema leaves the model no honest option. Fix the option space first, then the wording."
   },
   {
    "id": "a3-batch-vs-sync",
    "part": "a3-p6",
    "legacy": 14,
    "h": "Batch processing strategy — Message Batches API mechanics and the sync/async decision rule",
    "bridge": "With the pipeline built, how should you run it? The Message Batches API trades latency for a 50% discount, so the choice depends on who is waiting.",
    "diagram": {
     "kind": "decision",
     "title": "Sync or batch?",
     "q": {
      "t": "Is someone blocked waiting?",
      "sub": "Batch: up to 24h, no SLA; use custom_id"
     },
     "branches": [
      {
       "label": "Yes: pre-merge CI, live chat",
       "t": "Synchronous API",
       "sub": "discount is irrelevant",
       "tone": "warn"
      },
      {
       "label": "No: overnight report, weekly audit",
       "t": "Batch API",
       "sub": "50% cheaper, free money",
       "tone": "ok"
      }
     ],
     "note": "Batch cannot do multi-turn tool calling inside one request."
    },
    "p": [
     "The Message Batches API trades latency for cost: a 50% discount off standard synchronous pricing, in exchange for giving up any latency guarantee. Most batches finish well within an hour, but the API only commits to a MAXIMUM 24-hour processing window — there is no guaranteed SLA inside that window, so a workflow that adopts batch processing has to be able to tolerate results arriving anywhere from minutes to nearly a full day later.",
     "Because a batch submits many independent requests at once and results can come back in any order, every request carries a `custom_id` — the only reliable way to match a given response back to the request that produced it. The batch API has one structural limitation worth knowing cold: it does NOT support multi-turn tool calling within a single request — there's no way to execute a tool mid-request and feed the result back before the batch call completes, since there's no live turn-by-turn exchange the way there is in a synchronous call."
    ],
    "why": "The one decision rule the exam consistently tests: match the API to the workflow's actual latency tolerance, not to whichever one is cheaper in isolation. A BLOCKING workflow — a pre-merge CI check where a developer is sitting there waiting to merge, real-time customer-facing chat — needs the synchronous API, full stop, regardless of the batch discount, because no one can be kept waiting an unpredictable amount of time up to 24 hours. A LATENCY-TOLERANT workflow — an overnight technical-debt report, a weekly audit, nightly test generation — is exactly where batch processing's discount is free money, since nobody is blocked waiting on the result.",
    "table": {
     "headers": [
      "Workflow",
      "Right API",
      "Why"
     ],
     "rows": [
      [
       "Pre-merge CI check blocking a developer's merge",
       "Synchronous",
       "Someone is waiting; a 24-hour worst case is unacceptable"
      ],
      [
       "Overnight technical-debt report reviewed the next morning",
       "Batch",
       "Latency-tolerant; 50% savings with no downside"
      ],
      [
       "Real-time customer support chat",
       "Synchronous",
       "Immediate response required"
      ],
      [
       "Weekly code-audit summary",
       "Batch",
       "Nobody is blocked waiting on it"
      ]
     ]
    },
    "deep": "SLA math, worked: if a pipeline promises stakeholders a 30-hour turnaround and batch processing can take up to 24 hours in the worst case, the safe buffer is only 6 hours — meaning a fresh batch should be submitted roughly every 4 hours to guarantee a completed batch is always available inside that buffer, rather than submitting once a day and hoping the 24-hour ceiling isn't hit. Failure handling follows the same custom_id-driven logic: don't resubmit an entire batch over a handful of failures — parse results for the specific custom_id values that failed, and resubmit only those, typically with a targeted fix (chunking a document that exceeded context limits, adding a format-specific few-shot example) rather than an unmodified retry. It's also worth refining prompts on a small sample set BEFORE submitting the full batch — a 90% first-pass success rate on 1,000 documents means 100 retries, while a 60% first-pass rate means 400, at four times the resubmission cost."
   },
   {
    "id": "a3-ambiguity",
    "part": "a3-p7",
    "legacy": 19,
    "h": "Handling ambiguous or contradictory user input — stated assumptions, clarifying questions, and surfaced conflicts",
    "bridge": "Moving from pipeline mechanics to judgment: when the user's own input is unclear, which of three responses is correct depends on the cost of guessing wrong.",
    "diagram": {
     "kind": "decision",
     "title": "Match the response to the ambiguity",
     "q": {
      "t": "What is unclear?",
      "sub": "Test: what does a wrong guess cost?"
     },
     "branches": [
      {
       "label": "Cheap to guess",
       "t": "State assumption, proceed",
       "sub": "'summarize this'",
       "tone": "ok"
      },
      {
       "label": "Costly, info missing",
       "t": "Ask a clarifying question",
       "sub": "'delete the old records'",
       "tone": "warn"
      },
      {
       "label": "User contradicts self",
       "t": "Surface the conflict",
       "sub": "ask which governs; not recency",
       "tone": "hi"
      }
     ]
    },
    "p": [
     "Not all unclear input calls for the same response, and picking the wrong one is a recognizable exam trap. There are three distinct situations, each with a different correct move. DEFAULTABLE VAGUENESS is when a reasonable default exists and little is lost by picking it: 'summarize this' with no specified length — state the assumption ('I'll aim for a paragraph unless you want more detail') and proceed, rather than stalling on a low-stakes choice. NO-SAFE-DEFAULT AMBIGUITY is when the request is genuinely underspecified in a way where guessing wrong is costly or irreversible: 'delete the old records' with no definition of 'old' — here a clarifying question is required, because any silently-chosen default risks deleting the wrong data. DIRECT CONTRADICTION is when the user has stated two explicit, incompatible things — 'keep this fully backward compatible' earlier, then 'just replace the old API entirely' later — and the correct move is neither to silently follow the most recent statement nor to silently follow the first one, but to SURFACE the conflict explicitly and ask which one governs.",
     "Worked failure, contradiction case: a user says early on 'never touch the production database directly,' then later, under time pressure, says 'just run this fix directly against prod, we don't have time for the usual process.' Silently complying with the later instruch — treating 'more recent' as an implicit override — ignores that the user may not have consciously revoked the earlier constraint; silently refusing without flagging it looks like ignoring an explicit instruction. The correct response names both statements and asks which one governs before acting, rather than picking a side unasked.",
     "The distinguishing test across all three: does a wrong guess here cost little (defaultable), cost a lot but stem from missing information (ask), or does the user's own words disagree with each other (surface the conflict)? Treating a contradiction as if it were ordinary vagueness — and just picking one of the two statements — is the single most common miss."
    ],
    "why": "This tests judgment under ambiguity, not a lookup fact — exam items describe a scenario and ask which of the three responses is correct, or present a response that handles one case using the wrong pattern (e.g. silently proceeding on a genuinely risky, no-safe-default request, or silently obeying the most recent of two contradictory instructions).",
    "table": {
     "headers": [
      "Situation",
      "Correct response",
      "Why"
     ],
     "rows": [
      [
       "Vague but a safe default exists ('summarize this')",
       "State the assumption, proceed",
       "Low cost if the default is slightly off; stalling wastes the user's time for no real benefit"
      ],
      [
       "Ambiguous with no safe default ('delete the old records')",
       "Ask a clarifying question before acting",
       "Guessing wrong here is costly or irreversible — a wrong default is worse than a short delay"
      ],
      [
       "Two explicit statements from the user directly conflict",
       "Surface the conflict explicitly; ask which governs",
       "Neither silently preferring the most recent statement nor silently keeping the earlier one respects that the user may not have noticed the conflict"
      ]
     ]
    },
    "deep": "A frequent exam distractor is a response that resolves a contradiction by quietly favoring recency — 'the user's latest message said to skip the process, so I did.' Recency is not a resolution rule; it's an assumption that happens to often be convenient and just as often wrong, especially under time pressure where a user may be dropping a safety constraint without meaning to relax it permanently. Surfacing the conflict costs one short exchange and removes the guesswork entirely."
   },
   {
    "id": "a3-system-level",
    "part": "a3-p7",
    "legacy": 6,
    "h": "The same core techniques, now as system-design decisions",
    "bridge": "Finally, everything above recurs as deliberate system-design choices. The Architect question is how to apply it as standing practice across features.",
    "diagram": {
     "kind": "hub",
     "title": "Developer techniques become system decisions",
     "center": {
      "t": "Architect view",
      "sub": "decide deliberately, reuse everywhere",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "Prompt scope",
       "sub": "one shared vs modular prompts"
      },
      {
       "t": "Versioning",
       "sub": "prompt and schema changes safely"
      },
      {
       "t": "Schema evolution",
       "sub": "without breaking consumers"
      },
      {
       "t": "Reusable validation",
       "sub": "defensive parsing pattern"
      }
     ]
    },
    "p": [
     "Everything above is the foundation. Architect asks you to make these choices deliberately as part of a larger system design — e.g., 'should this application use one large shared system prompt, or should different modules maintain their own smaller, focused system prompts?' — a tradeoff between consistency and modularity."
    ],
    "why": "Architect tests the surrounding SYSTEM: how do you version prompt/schema changes safely, how do you handle a schema evolving over time without breaking downstream consumers, and how do you design validation and defensive parsing as a REUSABLE pattern across many different Claude-powered features, rather than a one-off implementation detail."
   }
  ],
  "quiz": [
   {
    "q": "Where does a `tool_result` content block belong in the Messages API?",
    "opts": [
     "In a message with role `\"tool\"`",
     "Inside a `user`-role message, immediately after the `assistant` message containing the matching `tool_use`",
     "In the top-level `system` parameter",
     "It can appear in any role, since the API infers it from the block type"
    ],
    "correct": 1,
    "explain": "There is no `\"tool\"` role — a tool_result block is placed inside the next `user`-role message, keyed to the tool_use's id."
   },
   {
    "q": "Can a `system`-role message be inserted between an `assistant` message's `tool_use` block and its `tool_result`?",
    "opts": [
     "Yes, system messages can go anywhere",
     "No — this splits an atomic tool_use/tool_result pair and returns a 400 error",
     "Only if the system message is short",
     "Only for server-side tools"
    ],
    "correct": 1,
    "explain": "The tool_use and its tool_result are treated as one atomic exchange; inserting anything between them, including a system message, is invalid and errors."
   },
   {
    "q": "Where can a valid mid-conversation `system` message be placed?",
    "opts": [
     "Anywhere in the array, with no restriction",
     "Only as the very first message",
     "Following a user turn (or an assistant turn ending in server-tool use), and preceding an assistant turn or the array's end",
     "Only immediately after a tool_result"
    ],
    "correct": 2,
    "explain": "Mid-conversation system messages must follow a user turn or a server-tool-ending assistant turn, and must precede an assistant turn or end the array — never splitting a tool_use/tool_result pair."
   },
   {
    "q": "If both the top-level `system` parameter and a later mid-conversation `system` message set instructions, which governs?",
    "opts": [
     "The top-level parameter always wins",
     "The later system message takes precedence",
     "Both are averaged",
     "This configuration is invalid"
    ],
    "correct": 1,
    "explain": "A later system message takes precedence over an earlier one or the top-level system field."
   },
   {
    "q": "An agent calls a tool and the very next message needs to carry an urgent policy update before the tool's result is returned. What's the correct placement?",
    "opts": [
     "Inject a system message between the tool_use and tool_result immediately",
     "Wait until the tool_use/tool_result pair completes, then send the update as a system message or prefix it to the next user turn",
     "Replace the tool_use block with the update",
     "Send the update as a second assistant message"
    ],
    "correct": 1,
    "explain": "The tool_use/tool_result pair must stay adjacent; an update has to wait for that exchange to close before it can be inserted."
   },
   {
    "q": "What is the underlying reason the API forbids splitting a tool_use/tool_result pair with another message?",
    "opts": [
     "Performance optimization only",
     "They are treated as one logical action-and-outcome unit, and splitting them breaks the model's ability to resolve which tool_use a result belongs to",
     "It's an arbitrary formatting rule with no functional purpose",
     "Only tool_result blocks longer than a certain size trigger this rule"
    ],
    "correct": 1,
    "explain": "The pairing keeps the action and its outcome bound together as a single unit — breaking that pairing would leave the correspondence between a tool_use and its result ambiguous."
   },
   {
    "q": "A user asks 'summarize this document' with no length specified. What's the correct response under the ambiguity-handling framework?",
    "opts": [
     "Ask a clarifying question before doing anything",
     "State a reasonable default length and proceed",
     "Refuse until the user specifies",
     "Silently pick the shortest possible summary with no mention of the assumption"
    ],
    "correct": 1,
    "explain": "This is defaultable vagueness — a safe default exists and little is lost by choosing it, so stating the assumption and proceeding is correct; stalling here wastes time for no benefit."
   },
   {
    "q": "A user says 'delete the old records' with no definition of 'old' and no context on reversibility. What's the correct response?",
    "opts": [
     "Pick a reasonable cutoff date and proceed, noting the assumption",
     "Ask a clarifying question before acting, since a wrong guess could cause irreversible, costly damage",
     "Delete nothing and end the conversation",
     "Delete all records to be safe"
    ],
    "correct": 1,
    "explain": "This is no-safe-default ambiguity — the cost of guessing wrong (deleting the wrong data) is high enough that a clarifying question is required rather than silently choosing a default."
   },
   {
    "q": "Earlier in a conversation the user said 'never touch production directly.' Later, under time pressure, they say 'just run this fix directly against prod.' What's the correct response?",
    "opts": [
     "Silently follow the more recent instruction, since it's what the user currently wants",
     "Silently follow the earlier instruction and ignore the later one",
     "Explicitly surface that the two statements conflict, and ask which one should govern",
     "Refuse to help further in the conversation"
    ],
    "correct": 2,
    "explain": "This is a direct contradiction between explicit statements — the correct move is to name the conflict and ask, rather than silently picking either the most recent or the original instruction."
   },
   {
    "q": "Why is 'silently prefer the most recent instruction' not a valid general rule for resolving contradictions?",
    "opts": [
     "Because recency should never matter at all",
     "Because a user under pressure may be unintentionally relaxing a constraint they didn't mean to permanently revoke, so recency alone doesn't establish real intent",
     "Because the API processes messages out of order",
     "Because contradictions are technically impossible in well-formed conversations"
    ],
    "correct": 1,
    "explain": "Recency is a convenient assumption, not a resolution rule — a later statement made under pressure doesn't reliably mean the user consciously revoked an earlier constraint."
   },
   {
    "q": "What distinguishes 'defaultable vagueness' from 'no-safe-default ambiguity'?",
    "opts": [
     "There is no real distinction — both should always be asked about",
     "Defaultable vagueness has a low-cost default; no-safe-default ambiguity means guessing wrong is costly or irreversible",
     "Defaultable vagueness only occurs in casual conversation",
     "No-safe-default ambiguity only applies to code-related tasks"
    ],
    "correct": 1,
    "explain": "The test is the cost of a wrong guess — low cost supports picking a default and stating it; high cost or irreversibility requires asking first."
   },
   {
    "q": "A response to a genuinely contradictory pair of user statements picks one of the two without mentioning the other. What's wrong with this response?",
    "opts": [
     "Nothing — picking either statement is always acceptable",
     "It treats a contradiction like ordinary vagueness, silently resolving it instead of surfacing the conflict for the user to decide",
     "It should have asked a clarifying question about an unrelated topic instead",
     "It's correct as long as the more recent statement was chosen"
    ],
    "correct": 1,
    "explain": "A contradiction calls for surfacing the conflict explicitly, not silently resolving it by treating it as if only one statement existed — that's the distinguishing failure mode from ordinary ambiguity."
   },
   {
    "q": "A schema marks a field optional (not required) rather than required-and-nullable to avoid forcing fabrication. What ambiguity does this trade in for?",
    "opts": [
     "No ambiguity — optional is equivalent to required+nullable",
     "The model may omit the field entirely, so downstream code can't distinguish 'checked",
     "The API will reject the schema",
     "Optional fields always default to null automatically"
    ],
    "correct": 1,
    "explain": "Only required+nullable guarantees both presence and an honest absence signal — optional-only just trades fabrication risk for a different, structural ambiguity."
   },
   {
    "q": "An extraction schema tags a value INFERRED rather than EXTRACTED because the source only implies it (e.g. 'anticipated in Q1 2025') rather than stating it outright. What does this distinguish that a null value would not?",
    "opts": [
     "Nothing — INFERRED and null mean the same thing",
     "INFERRED signals the value is present but as a projection/implication, not a directly stated fact",
     "INFERRED means the model is very confident",
     "INFERRED is only used for numeric fields"
    ],
    "correct": 1,
    "explain": "INFERRED is a third honesty state between EXTRACTED (stated outright) and null (absent) — collapsing a projection into a plain value risks a reader trusting it as a confirmed fact."
   },
   {
    "q": "An AI PR-review bot buries a CRITICAL SQL injection finding among 47 mostly-low-value flags, and it ships to production because engineers stopped reading the bot's output. What's the architecturally correct fix?",
    "opts": [
     "Deploy a larger model to catch the vulnerability more reliably",
     "A standardized, explicit REPORT-vs-SKIP taxonomy enforced across the review tool",
     "Increase the number of issues flagged per PR for thoroughness",
     "Remove the review bot since it lost the team's trust"
    ],
    "correct": 1,
    "explain": "The diagnosis is explicit — the problem is missing rules, not model capability. An explicit, standardized categorical taxonomy prevents real findings from being buried in noise."
   },
   {
    "q": "Which type of few-shot example teaches the most generalizable lesson?",
    "opts": [
     "An easy, obvious case",
     "A tricky, ambiguous case paired with the reasoning for why one action was correct",
     "They teach exactly the same thing",
     "Neither type is useful"
    ],
    "correct": 1,
    "explain": "Rationale behind a judgment call on a hard case generalizes better than a surface-level action on an easy one."
   },
   {
    "q": "Practice scenario: An invoice-extraction pipeline mislabels fields on documents where the correct interpretation is genuinely ambiguous (e.g. is 'Bill To' the customer or the payer?). Which combination of few-shot practices best addresses this?",
    "opts": [
     "A single generic example showing a typical, unambiguous invoice being extracted correctly",
     "Multiple examples covering the SPECIFIC ambiguous cases the pipeline actually struggles with, each paired with the REASONING for why one interpretation is correct",
     "One extremely long example covering every possible field in maximum detail",
     "Removing examples entirely and relying only on the schema to disambiguate"
    ],
    "correct": 1,
    "explain": "Two practices compound here: examples must target the SPECIFIC ambiguous cases actually causing failures (not generic easy cases), and each should include the RATIONALE, since the reasoning behind a judgment call is what generalizes to new, similarly-ambiguous documents the exact example never covered."
   },
   {
    "q": "A code-review prompt tells the model to 'be conservative' and 'only report high-confidence findings.' Why doesn't this reliably improve precision compared to specific categorical criteria?",
    "opts": [
     "It actually works just as well as specific criteria",
     "Vague instructions like 'be conservative' restate the goal without giving the model an actual, checkable decision procedure",
     "Confidence-based filtering is always more precise than categorical criteria",
     "This only matters for extraction tasks, not code review"
    ],
    "correct": 1,
    "explain": "Vague conservatism instructions don't supply a decision procedure; specific categorical criteria do, which is why they improve precision more reliably."
   },
   {
    "q": "Why does tagging each code-review finding with a `detected_pattern` field (e.g. 'unchecked_null_dereference') matter for improving the tool over time?",
    "opts": [
     "It has no practical benefit beyond documentation",
     "It turns developer dismissals into a categorized, analyzable dataset",
     "It automatically fixes false positives without further prompt work",
     "It replaces the need for any few-shot examples"
    ],
    "correct": 1,
    "explain": "Systematic, per-pattern dismissal tracking is what makes targeted improvement possible, versus reacting to undifferentiated overall noise."
   },
   {
    "q": "A pipeline asks the SAME Claude session that generated a piece of code to now review that code for bugs. Why is this architecturally weaker than routing the review to a separate instance?",
    "opts": [
     "It isn't weaker — same-session review is equally effective as long as the prompt is well-written",
     "The session retains the reasoning it used to generate the code, so it tends to confirm rather than challenge its own decisions",
     "Same-session review is only a problem when extended thinking is disabled",
     "This can be fixed with a lower temperature setting"
    ],
    "correct": 1,
    "explain": "The correct fix is architectural — an independent instance — not a prompting adjustment applied to the same biased session."
   },
   {
    "q": "An extraction pipeline cites sources as inline prose within extracted values (e.g. 'According to page 12 of the 2024 Annual Report, revenue was $4.2B'). Downstream systems consistently lose the source attribution. What's the root cause and fix?",
    "opts": [
     "The model needs to be told more emphatically to always cite sources",
     "The citation was never given its own schema field, so it only existed as prose a downstream reader has no reason to parse",
     "This is unfixable since citations always get lost eventually",
     "Enable the API's built-in citations feature, since it's designed for exactly this JSON extraction case"
    ],
    "correct": 1,
    "explain": "This is a schema design problem, not a prompting problem — structural data survives in a way prose attached to a value does not. The built-in citations feature is actually the wrong tool here since it's designed for narrative answers and is generally incompatible with strict JSON structured output."
   },
   {
    "q": "Does using tool-use with a JSON schema guarantee the VALUES in the response are correct?",
    "opts": [
     "Yes, schemas guarantee full correctness",
     "No — schemas eliminate syntax errors but do nothing to prevent semantic errors like wrong values or hallucinated facts",
     "Only for numeric fields",
     "Only if extended thinking is enabled"
    ],
    "correct": 1,
    "explain": "Schema validation is a structural guarantee, not a correctness guarantee."
   },
   {
    "q": "A field is marked nullable, but the model still hallucinates a plausible value instead of returning null. What's missing?",
    "opts": [
     "Nothing, this is expected and unfixable",
     "An explicit prompt instruction telling the model to return null when data isn't mentioned",
     "A larger max_tokens value",
     "Extended thinking must be enabled"
    ],
    "correct": 1,
    "explain": "Nullable schema plus explicit prompt instruction together stop the hallucination — the schema change alone is insufficient."
   },
   {
    "q": "Practice scenario: An extraction system uses tool_use with a strict JSON schema where ALL fields are marked required. Testers report the model invents plausible-looking dates and amounts when processing documents that don't actually contain this information. What's the best fix?",
    "opts": [
     "Add 'do not hallucinate' prominently to the system prompt",
     "Make the fields that may legitimately be absent from source documents NULLABLE (optional), paired with an explicit instruction to return null when the information isn't stated",
     "Increase the schema's strictness further to prevent invalid output",
     "Run a second verification pass to catch fabricated values after the fact"
    ],
    "correct": 1,
    "explain": "A required field with genuinely absent source data is the classic structural cause of fabrication — making the field nullable removes that pressure at the source, which is cheaper and more honest than trying to catch fabrication after it already happened."
   },
   {
    "q": "Practice scenario: A pipeline validates each tool_use extraction against a Pydantic model with model_validate(). Validation succeeds and every field has the correct type, yet extracted totals still disagree with the documents' stated totals. What explains this, and what's the fix?",
    "opts": [
     "Pydantic validation is broken and needs to be replaced",
     "Pydantic (and JSON schema generally) only catches STRUCTURAL/type errors",
     "The model should be told to double-check its own math before responding",
     "Switch to a stricter schema with more required fields"
    ],
    "correct": 1,
    "explain": "Structural validation (types, required fields, enums) and semantic validation (do the values actually make sense together) are two different layers — passing one says nothing about the other, which is exactly why reconciliation fields exist as a separate, explicit check."
   },
   {
    "q": "A validation failure shows required information simply isn't present in the source document. Will retry-with-feedback fix this?",
    "opts": [
     "Yes, with good enough feedback",
     "No — if the information is genuinely absent from what the model was given",
     "Yes, but only after 10+ retries",
     "Only with Opus"
    ],
    "correct": 1,
    "explain": "Retry-with-feedback helps for format/structural/arithmetic errors, not for information that was never provided."
   },
   {
    "q": "With an ~18% real-world mismatch rate in a conflict-detection system, what's the sound routing policy?",
    "opts": [
     "Route 100% of records to human review",
     "Route ONLY the flagged records to human review",
     "Route 0% to review",
     "Disable conflict detection entirely"
    ],
    "correct": 1,
    "explain": "Targeted routing on the actual flag balances accuracy against human-review cost, rather than an all-or-nothing extreme."
   },
   {
    "q": "An organization has many Claude-powered features. Should each one implement its own separate, one-off output-validation logic, or design a reusable validation pattern?",
    "opts": [
     "Each should be completely separate, with no shared pattern",
     "A reusable, consistent validation/defensive-parsing pattern is the more architecturally sound approach across many features",
     "Validation isn't needed if schemas are used",
     "Only the largest feature needs validation"
    ],
    "correct": 1,
    "explain": "Architect-level thinking favors reusable, consistent patterns across a system rather than one-off implementations per feature."
   },
   {
    "q": "What's the key architectural tradeoff between one large shared system prompt vs. several smaller, module-specific system prompts?",
    "opts": [
     "There's no real tradeoff, always use one big prompt",
     "Consistency (shared prompt) vs. modularity and independent maintainability (separate prompts)",
     "Smaller prompts are always worse",
     "Cost is the only factor"
    ],
    "correct": 1,
    "explain": "This is a genuine architectural tradeoff between consistency and modularity, not a simple right/wrong answer."
   },
   {
    "q": "A document-processing system will handle contracts that get amended over time. What should be designed into the schema from the start?",
    "opts": [
     "Nothing special, just overwrite fields as amendments arrive",
     "Fields likely to change on amendment should hold multiple tagged values (value, source, effective date) rather than being overwritten",
     "A single boolean 'amended' flag is sufficient",
     "Amendments should be rejected by the system"
    ],
    "correct": 1,
    "explain": "Anticipating document evolution at design time, rather than retrofitting after data loss occurs, is the architect-level judgment call."
   },
   {
    "q": "Practice scenario: A legal-tech extraction system launches with a `contract_type` enum: [\"lease\", \"employment\", \"nda\", \"vendor\"]. Six months later, a new contract category (\"licensing\") appears, and the system throws validation errors on every one until an engineer manually adds it to the enum and redeploys. This has now happened four times in six months as new contract types keep appearing. What's the architect-level diagnosis and fix?",
    "opts": [
     "This is normal and expected — enums always need occasional updates, no design change needed",
     "This is the fragile-expansion anti-pattern — continuously growing a strict enum requires a code change every time reality produces an unanticipated case",
     "The enum should be removed entirely and replaced with unrestricted free text",
     "Switch to a larger model, which will handle novel categories more gracefully"
    ],
    "correct": 1,
    "explain": "This is the textbook fragile-expansion pattern — a resilient catch-all (other + detail field) added ONCE eliminates the recurring redeploy-on-every-new-category cycle, rather than perpetually chasing the enum."
   },
   {
    "q": "Why should 'schema is nullable' and 'prompt has an explicit null-handling instruction' be treated as a linked pair in a standard review checklist, rather than independent fixes?",
    "opts": [
     "They aren't actually related to each other",
     "A schema change alone doesn't stop hallucination, and a prompt instruction without the schema change has nothing to return",
     "Only the schema change ever matters",
     "Only the prompt instruction ever matters"
    ],
    "correct": 1,
    "explain": "Treating this as a linked architectural checklist item prevents the same partial-fix mistake from recurring across the organization's features."
   },
   {
    "q": "With an ~18% real-world mismatch rate in a self-correction/conflict-detection system, what's the architecturally sound routing policy?",
    "opts": [
     "Route 100% of records to human review, always",
     "Route ONLY the flagged (conflicting) records to human review, letting the rest proceed automatically",
     "Route 0% to review, trust the model fully",
     "Disable the conflict-detection field entirely"
    ],
    "correct": 1,
    "explain": "Targeted routing based on the actual conflict flag is what lets the system balance accuracy and cost efficiently, rather than choosing an all-or-nothing extreme."
   },
   {
    "q": "Why should goal-oriented delegation be an organizational instruction-writing STANDARD rather than a fix applied after a specific subagent is observed failing rigidly?",
    "opts": [
     "It shouldn't be, per-subagent fixes are always sufficient",
     "Baking it into the authoring standard from the start prevents the same procedural-micromanagement brittleness from being independently rediscovered and re-fixed in every new subagent someone builds",
     "Standards are unnecessary bureaucracy",
     "Only one subagent per organization ever needs this"
    ],
    "correct": 1,
    "explain": "Standardizing a known-good pattern up front avoids repeatedly rediscovering the same failure mode across independently-built subagents."
   },
   {
    "q": "Why should a standardized intermediate representation for multi-agent synthesis be maintained as a shared, organization-wide contract rather than reinvented per pipeline?",
    "opts": [
     "Reinventing it per pipeline is always more efficient",
     "The same reasoning as reusing MCP servers across apps applies",
     "Intermediate representations are never reusable across pipelines",
     "This only matters for financial data"
    ],
    "correct": 1,
    "explain": "Shared plumbing built once and reused avoids duplicated effort and incompatible conventions across independently-built synthesis pipelines."
   },
   {
    "q": "A prompt says 'summarize this report accurately.' Why is this instruction likely to produce inconsistent results across different runs?",
    "opts": [
     "'Accurately' is a precise, measurable constraint",
     "'Accurately' is vague and subjective",
     "This instruction is already optimal",
     "Vagueness only matters for classification tasks, not summarization"
    ],
    "correct": 1,
    "explain": "Explicit, measurable criteria reduce the interpretive latitude that produces inconsistent output across runs."
   },
   {
    "q": "A team building a fraud-flagging feature writes the instruction 'flag suspicious transactions.' What's the architecturally sound fix, drawing on both the explicit-criteria and few-shot principles?",
    "opts": [
     "Leave the instruction as-is, the model will infer the right threshold",
     "Write explicit criteria for what counts as suspicious",
     "Only add more training data, no prompt change is needed",
     "Switch to a larger model with no prompt change"
    ],
    "correct": 1,
    "explain": "Combining explicit criteria with borderline few-shot examples directly targets the false-positive/false-negative drift that vague judgment instructions produce."
   },
   {
    "q": "A schema requires a `severity` field to always be present, but roughly 5% of source documents genuinely don't contain enough information to determine severity. What will likely happen, and what's the fix?",
    "opts": [
     "The model will always correctly leave it blank",
     "The model is likely to FABRICATE a plausible severity value to satisfy the required field",
     "Nothing problematic will happen, required fields are always safe",
     "The API will reject any document missing this information"
    ],
    "correct": 1,
    "explain": "A required field with no honest way to represent absence or uncertainty pushes the model toward fabrication rather than an honest gap."
   },
   {
    "q": "An extraction pipeline validates output with a JSON schema and reports zero schema-validation failures. Does this mean the extracted data is trustworthy?",
    "opts": [
     "Yes, a schema-valid response is a fully correct response",
     "Not necessarily — the schema only guarantees SYNTACTIC validity (correct structure/types)",
     "Schema validation guarantees both syntax and semantics equally",
     "Schema validation is irrelevant to trustworthiness"
    ],
    "correct": 1,
    "explain": "Zero syntax errors is not the same claim as zero semantic errors — those need separate mitigations like conflict detection or human review routing."
   },
   {
    "q": "A retry-with-feedback loop keeps failing after 5 attempts on the same validation error. What does this pattern most likely indicate, and what should happen?",
    "opts": [
     "Keep retrying indefinitely, it will eventually succeed",
     "This is a strong signal the failure is a missing-information case rather than a fixable format/structural/arithmetic error",
     "Switch to a different validation schema",
     "Always escalate after exactly 5 attempts, regardless of error type"
    ],
    "correct": 1,
    "explain": "Retry-with-feedback typically resolves fixable errors within 2-3 attempts — persistent failure well beyond that suggests the retry mechanism fundamentally cannot fix this failure type."
   },
   {
    "q": "A synthesis feature combines outputs from 6 different subagent types across the organization, each currently using its own ad hoc output format. What's the architect-level recommendation?",
    "opts": [
     "Leave each subagent's format as-is, since they all eventually feed the same synthesis step",
     "Introduce a shared, standardized intermediate representation (a common schema) that all 6 subagent types conform to before synthesis",
     "Reduce to a single subagent type to avoid the problem entirely",
     "This is purely a Developer-level concern, not architect-level"
    ],
    "correct": 1,
    "explain": "Standardizing the intermediate format once, shared across all contributing subagent types, is more maintainable than the synthesis step special-casing 6 different raw formats."
   },
   {
    "q": "Why does the exam distinguish 'a schema-only fix' from 'a prompt-only fix' as two DIFFERENT incomplete solutions to the same null-handling problem?",
    "opts": [
     "They aren't actually different, either one alone is sufficient",
     "A schema-only fix (making a field nullable) doesn't stop hallucination without a matching prompt instruction",
     "Schema fixes are always sufficient on their own",
     "Prompt fixes are always sufficient on their own"
    ],
    "correct": 1,
    "explain": "The two pieces solve complementary halves of the same problem — verifying only one half leaves the gotcha only partially fixed."
   },
   {
    "q": "What does the Message Batches API offer compared to the standard synchronous Messages API, and what does it give up in exchange?",
    "opts": [
     "Faster responses at a higher price",
     "A 50% cost discount, in exchange for no guaranteed latency — results can take up to 24 hours",
     "Unlimited context length at the same price",
     "Multi-turn tool calling with lower latency"
    ],
    "correct": 1,
    "explain": "The batch API's value proposition is purely cost — 50% savings — paid for with the loss of any latency guarantee, up to a 24-hour processing ceiling."
   },
   {
    "q": "Why does every request submitted to the Message Batches API need a `custom_id`?",
    "opts": [
     "It's optional metadata with no functional purpose",
     "Batch results can return in a different order than requests were submitted, and `custom_id` is what correlates each response back to its original request",
     "It sets the request's priority in the queue",
     "It replaces the need for a `model` parameter"
    ],
    "correct": 1,
    "explain": "Without `custom_id`, there would be no reliable way to match an out-of-order batch result back to the specific request that produced it."
   },
   {
    "q": "A team wants to run a multi-turn tool-calling agent loop (call a tool, get the result, decide the next tool call, repeat) using the Message Batches API within a single batch request. Is this supported?",
    "opts": [
     "Yes, this is exactly what batch processing is designed for",
     "No — the batch API doesn't support multi-turn tool calling within a single request; there's no live turn-by-turn exchange mid-request",
     "Yes, but only with Opus-tier models",
     "Yes, if `tool_choice` is set to \"any\""
    ],
    "correct": 1,
    "explain": "A batch request has no mechanism for executing a tool mid-request and feeding the result back before the request completes — that live exchange only exists in the synchronous API."
   },
   {
    "q": "A manager proposes moving both a blocking pre-merge CI check and an overnight technical-debt report to the Message Batches API to capture its 50% savings on both. What's the correct evaluation?",
    "opts": [
     "Both should move to batch — savings apply regardless of workflow shape",
     "Only the overnight report should move to batch; the pre-merge check needs the synchronous API since a developer is blocked waiting on it",
     "Neither should move; batch processing is never worth the tradeoff",
     "Both should stay synchronous, and only the reporting frequency should change"
    ],
    "correct": 1,
    "explain": "The decision hinges on latency tolerance, not just cost — a blocking workflow can't absorb an unpredictable wait of up to 24 hours, while an overnight report has nobody waiting on it."
   },
   {
    "q": "A batch of 1,000 document-extraction requests comes back with 40 failures. What's the correct remediation approach?",
    "opts": [
     "Resubmit the entire batch of 1,000 requests unmodified",
     "Parse results for the specific `custom_id` values that failed, and resubmit only those, typically with a targeted fix like chunking or added few-shot examples",
     "Switch immediately to the synchronous API for all future requests",
     "Discard the batch entirely and treat all 1,000 documents as unprocessable"
    ],
    "correct": 1,
    "explain": "Targeted resubmission by `custom_id`, informed by why each specific request failed, is far cheaper than blindly resubmitting everything — and refining prompts on a small sample beforehand reduces how many failures occur in the first place."
   },
   {
    "q": "A legal-extraction pipeline feeds its output directly into an automated database with a strict, nested schema (enums, nullable dates, an array of party objects). Which structured-output method should it use?",
    "opts": [
     "Prompt-based formatting, since it's simplest to set up",
     "Tool use with a JSON schema, since the API-validated structure and native support for enums/nesting matches the strict downstream requirement",
     "A prefilled response starting with `{`, since it's cheaper",
     "It doesn't matter, all three methods guarantee identical strictness"
    ],
    "correct": 1,
    "explain": "A strict schema feeding automated downstream code needs the strongest enforcement available — tool use with JSON schema is API-validated, unlike prompt-based formatting or a prefilled nudge."
   },
   {
    "q": "A quick internal script summarizes a log file as a simple two-field {summary, severity} object for a developer to read in a terminal. Is standing up a full tool-use JSON schema the right call here?",
    "opts": [
     "Yes, tool use should always be used regardless of the use case",
     "No — this is proportionate to prompt-based formatting or a prefilled response, since the strictness requirement and downstream consumer (a human, glancing) don't need API-validated enforcement",
     "No, this task can't produce structured output at all",
     "Yes, because JSON schema is always faster to generate"
    ],
    "correct": 1,
    "explain": "Matching method to strictness requirement cuts both ways — over-engineering a low-stakes, human-read case wastes effort just as much as under-engineering a strict, automated one."
   },
   {
    "q": "Why can't more emphatic prompt wording ('You MUST respond only in valid JSON, no exceptions') substitute for tool-use schema validation on a genuinely strict use case?",
    "opts": [
     "It can substitute perfectly well with strong enough wording",
     "Prompt instructions are not structurally enforced by the API — they're a request the model is statistically likely to follow, not a guarantee, especially as conversations get longer",
     "Emphatic wording actually makes the model less likely to follow instructions",
     "JSON schema is only a documentation feature with no real validation behind it"
    ],
    "correct": 1,
    "explain": "No amount of prose emphasis gives the same guarantee as API-side schema validation — this is the same prompts-vs-deterministic-enforcement distinction that shows up elsewhere in the exam (e.g. CLAUDE.md vs. hooks)."
   },
   {
    "q": "A workflow must (1) look up a customer's account, then (2) issue a refund using details from that lookup. Both tools are available with `tool_choice: any` from the start. What's the risk, and what's the architectural fix?",
    "opts": [
     "No risk — tool_choice: any always calls tools in logical dependency order automatically",
     "Claude might call the refund tool before the lookup has returned data it needs; the fix is forcing the lookup tool specifically on the first turn, only exposing/forcing the refund tool after the lookup's result is in context",
     "The risk is that no tool gets called at all; the fix is switching to tool_choice: auto",
     "There is no way to sequence multi-tool workflows; this must be done as two entirely separate conversations"
    ],
    "correct": 1,
    "explain": "tool_choice controls a single turn's call, not cross-turn ordering — sequencing a prerequisite-dependent workflow requires controlling which tools are exposed or forced at each turn."
   },
   {
    "q": "When structured output is MANDATORY (the calling code has no fallback for a plain-text reply), what should `tool_choice` be set to?",
    "opts": [
     "auto, so Claude can decide whether structured output is needed",
     "A specific named tool (the output-formatting tool), forcing that exact call so the required structured response is guaranteed",
     "any, since it's the most flexible setting",
     "It doesn't matter which setting is used as long as a schema exists"
    ],
    "correct": 1,
    "explain": "Leaving tool_choice at auto risks Claude reasoning its way to a prose answer instead of the required structured call — forcing the specific tool guarantees the calling code always has something to parse."
   },
   {
    "q": "What does tool_choice:any guarantee, and what does it NOT guarantee, in a multi-tool workflow?",
    "opts": [
     "It guarantees both that a tool is called and which one — nothing is left to chance",
     "It guarantees SOME tool from the available set is called, but not WHICH one — the wrong tool for the situation could still be selected",
     "It guarantees no tool is called unless explicitly forced",
     "It guarantees correct sequencing across multiple turns automatically"
    ],
    "correct": 1,
    "explain": "any forces tool usage generically but leaves the specific choice to the model — for both guaranteed identity and guaranteed order, a specific tool must be forced per turn."
   },
   {
    "q": "An extraction pipeline logs every failure as a bare error count with no other detail. Why is this insufficient as a feedback-loop mechanism for improving the prompt over time?",
    "opts": [
     "It's perfectly sufficient — error count is all that's needed",
     "A bare count shows THAT failures are happening but gives no basis for a TARGETED fix — structured, aggregatable metadata (failed field, failure type, input characteristics) is needed to reveal actionable patterns",
     "Error counts should never be logged at all",
     "This is only a problem if the error rate exceeds 50%"
    ],
    "correct": 1,
    "explain": "Without structured, aggregatable fields, failures can't be grouped into patterns — the team is left re-reading individual failures one at a time instead of seeing 'vendor_name hallucinations cluster on scanned PDFs.'"
   },
   {
    "q": "Aggregating structured failure metadata reveals that 40% of extraction failures are vendor_name hallucinations specifically on scanned (non-native) PDFs. What does this pattern justify, that a generic 'the error rate is too high, try harder' prompt tweak would not?",
    "opts": [
     "A blanket rewrite of the entire prompt from scratch",
     "A targeted fix aimed specifically at the pattern — e.g. a scanned-PDF-specific few-shot example, or an explicit null-on-illegible instruction — rather than an undirected change applied to the whole prompt",
     "Switching to a completely different model with no prompt changes",
     "Ignoring the pattern since 40% is not a majority of all documents"
    ],
    "correct": 1,
    "explain": "Structured, aggregated metadata points to exactly which input subset and which field are failing, which is what turns a vague error-rate complaint into a specific, testable fix."
   },
   {
    "q": "Why does a feedback-loop mechanism need to distinguish failure TYPES (schema violation vs. hallucination vs. wrong enum vs. missing data) rather than logging every failure identically?",
    "opts": [
     "It doesn't matter, all failures should be treated the same way",
     "Different failure types call for different fixes — a schema violation may point to a tool_choice or schema problem, while a hallucination may point to a missing null-handling instruction",
     "Failure types are only relevant for billing purposes",
     "Distinguishing failure types is impossible in practice"
    ],
    "correct": 1,
    "explain": "The type of failure determines which lever to pull — conflating them into one undifferentiated error bucket loses the information needed to pick the right fix."
   },
   {
    "q": "An extraction agent invents a purchase-order number when the scanned invoice has none. Best schema-level fix?",
    "opts": [
     "Make the field nullable and instruct null when absent",
     "Emphasize accuracy in the prompt",
     "Lower temperature",
     "Add more required fields"
    ],
    "correct": 0,
    "explain": "A required non-nullable field leaves no honest option. Nullable plus an explicit absent-instruction fixes the option space."
   },
   {
    "q": "Dates arrive in mixed formats across vendors. Which combination best fixes this?",
    "opts": [
     "Normalization instruction with an ISO 8601 format rule and an ambiguity policy",
     "A bigger model",
     "Removing the date field",
     "Asking the model to be consistent"
    ],
    "correct": 0,
    "explain": "Explicit normalization rules remove per-document guesswork; vague requests to be consistent do not."
   },
   {
    "q": "Quality differs across three invoice layouts. Which technique addresses layout variation most directly?",
    "opts": [
     "Few-shot examples covering each layout, including a case with an absent field",
     "A longer system prompt",
     "Setting max_tokens higher",
     "Using prefill"
    ],
    "correct": 0,
    "explain": "Examples demonstrate the extraction pattern on real variants and show null for absent fields."
   },
   {
    "q": "A category field sometimes contains unexpected free text. What schema design is best?",
    "opts": [
     "Keep it free text",
     "Enum including other with a detail string, and unclear for ambiguity",
     "Make it required with no enum",
     "Remove the field"
    ],
    "correct": 1,
    "explain": "Enums constrain values while other plus detail and unclear let genuinely unexpected cases be represented honestly."
   },
   {
    "q": "A tool-use JSON schema is enforced, yet a fabricated but well-typed value passes. What does this show?",
    "opts": [
     "The schema failed",
     "Schemas guarantee structure, not semantic correctness, so nullable fields, examples and validation checks are needed",
     "tool_choice was wrong",
     "Prefill would have prevented it"
    ],
    "correct": 1,
    "explain": "Structure and meaning are different layers; schema validity does not verify truth."
   },
   {
    "q": "How is a tool result actually structured when sent back to the Claude API — as a `{\"role\": \"tool\"}` message, or something else?",
    "opts": [
     "As a separate message with role set to \"tool\"",
     "As a `tool_result` content block placed inside a `user`-role message — there is no \"tool\" role in the API",
     "As part of the top-level `system` field",
     "As a special header field outside the messages array"
    ],
    "correct": 1,
    "explain": "The Claude API has only user and assistant roles (plus the system field) — a tool result is user-role content, specifically a tool_result content block, not its own role."
   },
   {
    "q": "Under what circumstance can a mid-conversation `system`-role message NEVER be placed, regardless of where else it might seem to fit?",
    "opts": [
     "Immediately after a user turn",
     "Between a `tool_use` block and its matching `tool_result`",
     "At the very end of the messages array",
     "Immediately before an assistant turn"
    ],
    "correct": 1,
    "explain": "tool_use and tool_result form a structurally atomic pair — inserting anything between them, including a system message, returns a 400 error."
   },
   {
    "q": "Why would a team inject a `system`-role message mid-conversation instead of just rewriting the top-level `system` field with the new instruction?",
    "opts": [
     "Mid-conversation system messages are purely cosmetic and have no functional effect",
     "Injecting inline avoids invalidating the cached prefix built from the original top-level system field, while still taking effect from that point forward",
     "The top-level system field cannot be changed once a conversation starts",
     "Rewriting the top-level system field is always faster"
    ],
    "correct": 1,
    "explain": "A full top-level system rewrite busts prompt caching for the whole conversation; an inline system-role message adds the new instruction going forward without disturbing the cached prefix."
   },
   {
    "q": "A user says 'somewhere warm' with no other trip constraints. What's the most effective response, given there's a reasonable default available?",
    "opts": [
     "Ask 3-4 clarifying questions before proposing anything",
     "Propose a specific reasonable default (e.g. a beach destination) explicitly, and invite correction",
     "Silently pick a destination with no explanation",
     "Refuse to proceed until every parameter is fully specified"
    ],
    "correct": 1,
    "explain": "A vague-but-defaultable request is best served by stating an assumption and proceeding — this gives an immediately useful result while remaining easy to correct, unlike either silent guessing or unnecessary upfront friction."
   },
   {
    "q": "A user previously said 'I want to avoid crowds' and now says 'let's go somewhere popular in peak season.' What's the correct handling, and why is silently using the most recent statement wrong?",
    "opts": [
     "Use the most recent statement, since it's the latest thing the user said",
     "Surface the contradiction explicitly and ask which preference should govern — recency is not the same as an intentional correction",
     "Average the two preferences into a moderately popular, moderately quiet destination",
     "Ignore both statements and ask an unrelated clarifying question"
    ],
    "correct": 1,
    "explain": "The two statements directly conflict rather than merely being underspecified — treating the newer one as an implicit retraction assumes something the user never actually said."
   },
   {
    "q": "Why is 'ask fewer clarifying questions to reduce abandonment' the wrong lesson to apply universally, even though it's the right fix for vague-but-defaultable requests?",
    "opts": [
     "It's never wrong — always defaulting silently is always correct",
     "For a genuine contradiction between explicit user statements, defaulting silently (to avoid friction) produces the LEAST trustworthy output, not the most efficient one",
     "Clarifying questions should always be maximized regardless of context",
     "Abandonment rates are unrelated to how requests are handled"
    ],
    "correct": 1,
    "explain": "The three situations (defaultable vagueness, no-safe-default ambiguity, direct contradiction) call for three different responses — collapsing them into one 'never ask' policy fixes one case while breaking another."
   }
  ],
  "parts": [
   {
    "id": "a3-p1",
    "title": "Writing instructions and examples",
    "intro": "Everything in this domain starts with how you tell Claude what to do. This part covers precise instructions, few-shot examples and goal-oriented delegation, the raw material every later technique builds on."
   },
   {
    "id": "a3-p2",
    "title": "Review criteria, independence and provenance",
    "intro": "Once instructions are precise, the next question is how to judge Claude's output. This part covers explicit report/skip criteria, why review needs an independent instance, and how sources stay attached to extracted facts."
   },
   {
    "id": "a3-p3",
    "title": "Getting structured output out of Claude",
    "intro": "Review and provenance both assume output with a defined shape. This part chooses the method that produces that shape, then covers message mechanics and tool_choice so the structured call actually happens."
   },
   {
    "id": "a3-p4",
    "title": "Designing schemas that stay honest",
    "intro": "A forced tool call guarantees syntax, not truth. Here you design the schema itself: required vs nullable, honest missing-data states, resilient enums, evolving documents and shared intermediate formats."
   },
   {
    "id": "a3-p5",
    "title": "Validating, retrying and improving",
    "intro": "Even a good schema produces failures in production. This part covers retry with feedback, consistency checks and routing, structured failure logging, and a full symptom-by-symptom extraction drill."
   },
   {
    "id": "a3-p6",
    "title": "Batch versus synchronous processing",
    "intro": "With a reliable pipeline in hand, the remaining choice is how to run it at volume. This part is the cost-versus-latency rule for the Message Batches API."
   },
   {
    "id": "a3-p7",
    "title": "Ambiguity and system-level prompt design",
    "intro": "The last part widens from single prompts to judgment and architecture: what to do when user input is unclear or contradictory, and how all of the above become standing system decisions."
   }
  ],
  "roadmap": {
   "kind": "roadmap",
   "parts": [
    {
     "t": "Instructions",
     "items": [
      "Specific rules",
      "Few-shot",
      "Goal delegation"
     ]
    },
    {
     "t": "Review",
     "items": [
      "Report/skip criteria",
      "Independent review",
      "Provenance fields"
     ]
    },
    {
     "t": "Structured output",
     "items": [
      "Choose method",
      "Message mechanics",
      "tool_choice"
     ]
    },
    {
     "t": "Schema design",
     "items": [
      "Nullable",
      "Missing states",
      "Evolving docs"
     ]
    },
    {
     "t": "Validate and improve",
     "items": [
      "Retry with feedback",
      "Conflict routing",
      "Failure logs"
     ]
    },
    {
     "t": "Batch vs sync",
     "items": [
      "50% discount",
      "24h window"
     ]
    },
    {
     "t": "System level",
     "items": [
      "Ambiguity",
      "Standing standards"
     ]
    }
   ]
  }
 },
 {
  "id": "a4",
  "title": "Tool Design & MCP Integration",
  "weight": "18%",
  "emoji": "🧰",
  "intro": "Full mechanics of tools and MCP — what a tool actually is, how to describe it, tool_choice, built-in tools, MCP's three primitives — then the organization-scale ecosystem and governance layer on top.",
  "archHighlights": {
   "3": [
    "Tool description design, tool_choice"
   ],
   "4": [
    "Enforcement primitive, keyword-sensitive prompts"
   ],
   "5": [
    "Built-ins, MCP servers, granularity, consolidation"
   ],
   "6": [
    "isError, structured error responses"
   ]
  },
  "sections": [
   {
    "id": "a4-what-is-a-tool",
    "part": "a4-p1",
    "legacy": 0,
    "h": "What a tool is, and why the description is the primary selection mechanism",
    "bridge": "This is the starting point for the domain: what a tool actually is, and why the one thing Claude can see about it, the description, decides whether it gets picked.",
    "diagram": {
     "kind": "flow",
     "title": "Who does what in a tool call",
     "numbered": true,
     "perRow": 5,
     "steps": [
      {
       "t": "You define the tool",
       "sub": "name, description, input_schema",
       "tone": "hi"
      },
      {
       "t": "Claude reads the description",
       "sub": "decides WHEN and HOW"
      },
      {
       "t": "Claude asks for a call",
       "sub": "tool_use block",
       "tone": "warn"
      },
      {
       "t": "YOUR code runs it",
       "sub": "the real action"
      },
      {
       "t": "Result goes back",
       "sub": "tool_result",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "A tool is defined by a name, a description, and an input_schema (JSON Schema). YOUR code performs the real action; Claude only decides WHEN and HOW to ask for it. Claude reads the description to decide whether and how to use a tool — a vague description ('Sends an email') invites mistakes; a precise one states scope and preconditions ('Sends a transactional email to a VERIFIED customer address. Only use after user confirmation. Never use for marketing.')."
    ],
    "why": "Tool misrouting — Claude calling a different tool than appropriate — traces back almost always to overlapping descriptions, a missing precondition, or too many similar tools available at once. The fix is tightening descriptions and reducing overlap, not switching models."
   },
   {
    "id": "a4-five-elements",
    "part": "a4-p1",
    "legacy": 1,
    "h": "Deep dive: the five elements of a production-grade tool description",
    "bridge": "We said the description is the selection mechanism; this section asks what a description must contain to do that job, and shows the cheapest first fix when two tools get confused.",
    "diagram": {
     "kind": "hub",
     "title": "Five elements of a production-grade description",
     "center": {
      "t": "Tool description",
      "tone": "hi"
     },
     "perRow": 3,
     "spokes": [
      {
       "t": "1 What it does",
       "sub": "primary purpose"
      },
      {
       "t": "2 Inputs",
       "sub": "types, formats, required"
      },
      {
       "t": "3 Example queries",
       "sub": "concrete use cases"
      },
      {
       "t": "4 Edge cases",
       "sub": "what it does NOT do"
      },
      {
       "t": "5 Boundaries",
       "sub": "use THIS vs similar tool",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "A production-grade tool description includes FIVE distinct elements: (1) WHAT the tool does — its primary purpose, stated unambiguously; (2) WHAT INPUTS it expects — data types, formats, constraints, required vs. optional fields; (3) EXAMPLE QUERIES it handles well — concrete use cases anchoring the model's understanding; (4) EDGE CASES AND LIMITATIONS — what the tool does NOT do, and what happens with out-of-range inputs; (5) EXPLICIT BOUNDARIES — when to use THIS tool versus similar tools in the same toolkit.",
     "A worked before/after: `get_customer: \"Retrieves customer information\"` and `lookup_order: \"Retrieves order details\"` are minimal descriptions that cause an agent to route 'check my order #12345' to `get_customer` instead of `lookup_order`, since neither description differentiates when each applies. Rewritten production-grade: `get_customer: \"Looks up a customer account by email, phone, or customer ID. Returns profile, contact details, account status, loyalty tier. Use when verifying WHO the customer is. Do NOT use for order-specific queries — use lookup_order for those.\"` and the mirror-image description for `lookup_order`, each explicitly naming the OTHER tool as the wrong choice for the other's use case."
    ],
    "why": "The second version gives the model explicit disambiguation — which identifiers each tool accepts, what each returns, and crucially WHEN NOT to use each one. When this exact misrouting is observed in production logs, the correct FIRST fix is expanding these descriptions to include all five elements — not few-shot examples (adds token overhead without addressing why the model is confused — treating symptoms, not the disease), not a routing classifier (over-engineered as a first step, bypassing the model's own natural-language understanding), and not consolidating the two tools into one (a valid LONG-term architectural choice, but far more effort than simply fixing the descriptions first). The exam consistently favors the low-effort, high-leverage fix — better descriptions before routing classifiers, scoped access before full rebuilds."
   },
   {
    "id": "a4-exact-syntax",
    "part": "a4-p1",
    "legacy": 3,
    "h": "Deep dive: description completeness beyond selection — specifying exact syntax, not just scope",
    "bridge": "The five elements cover choosing the right tool; here the right tool is chosen every time, yet calls still fail. What detail was missing from the description?",
    "diagram": {
     "kind": "compare",
     "title": "query_snowflake: correct tool, failing calls",
     "left": {
      "title": "Vague description",
      "tone": "bad",
      "items": [
       "'Queries Snowflake. Accepts SQL.'",
       "Agent writes PostgreSQL: string_agg",
       "Snowflake rejects the query"
      ]
     },
     "right": {
      "title": "Specific description",
      "tone": "ok",
      "items": [
       "'Snowflake SQL, not PostgreSQL'",
       "Use LISTAGG instead of string_agg",
       "Use QUALIFY for window filters"
      ]
     },
     "verdict": "Selection and invocation are separate failures: check both."
    },
    "p": [
     "A tool description problem doesn't always show up as MISROUTING — sometimes the CORRECT tool gets picked every time, but calls to it still fail, because the description never specified an important detail about exactly how to use it correctly. Example: a `query_snowflake` tool's description reads 'Queries Snowflake data warehouse. Accepts SQL.' The agent correctly identifies and calls this tool every time, but frequently writes queries using POSTGRESQL-specific syntax (e.g. `string_agg`, which Snowflake instead spells `LISTAGG`) that Snowflake rejects outright."
    ],
    "why": "The fix is NOT switching models or adding a validation retry loop as the first response — it's making the tool description MORE SPECIFIC about exactly what dialect/syntax variant is expected: 'Queries Snowflake data warehouse. Accepts Snowflake SQL syntax (not standard SQL or PostgreSQL) — use LISTAGG instead of string_agg, QUALIFY instead of window-function subqueries, etc.' This is a distinct lesson from tool MISROUTING: the description's job isn't just to help Claude pick the RIGHT tool, it's also to specify precisely HOW to use that tool correctly once selected — a description that's specific enough for selection can still be incomplete for correct invocation, and both are genuine description-quality failures worth checking for separately."
   },
   {
    "id": "a4-keyword-prompts",
    "part": "a4-p1",
    "legacy": 4,
    "h": "Deep dive: keyword-sensitive system prompts — a second, easy-to-miss cause of misrouting",
    "bridge": "Descriptions can be flawless and routing still drift. The system prompt is the other text Claude reads, so which of its words might be steering the choice?",
    "diagram": {
     "kind": "flow",
     "title": "How a prompt keyword biases routing",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Prompt stresses a word",
       "sub": "'always prioritize SEARCHING'",
       "tone": "warn"
      },
      {
       "t": "A tool shares the keyword",
       "sub": "in its name or description"
      },
      {
       "t": "Model leans to that tool",
       "sub": "even when another fits",
       "tone": "bad"
      },
      {
       "t": "Audit the system prompt",
       "sub": "after description rewrite fails",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "Tool descriptions aren't the ONLY thing influencing which tool gets picked — the SYSTEM PROMPT'S own wording can create unintended tool associations, even when every individual tool description is well-written on its own. If a system prompt repeatedly emphasizes a specific word or phrase ('always prioritize SEARCHING for the most current information'), and one tool's name or description happens to share that keyword, the model can develop a bias toward that tool even in situations where a different tool is actually the better fit."
    ],
    "why": "This means a full misrouting audit can't stop at reviewing tool descriptions in isolation — it must also review the SYSTEM PROMPT for keyword-sensitive instructions that might be quietly overriding otherwise well-written, well-differentiated tool descriptions. A tool selection problem that survives a description rewrite is a specific signal to check the system prompt next, rather than assuming the description simply needs to be even more emphatic."
   },
   {
    "id": "a4-inference-not-matching",
    "part": "a4-p1",
    "legacy": 19,
    "h": "Tool selection is inference, not string matching — an architecture-level design standard",
    "bridge": "Having seen descriptions and prompt wording both influence routing, we can name the model underneath: selection is inference over meaning, so how should an organization write descriptions?",
    "diagram": {
     "kind": "compare",
     "title": "Two mental models of tool routing",
     "left": {
      "title": "String matching (wrong)",
      "tone": "bad",
      "items": [
       "CONTAINS_STRING('analyze data')",
       "Brittle keyword rules",
       "Ignores intent and context"
      ]
     },
     "right": {
      "title": "Language inference (right)",
      "tone": "ok",
      "items": [
       "Reads full intent and context",
       "'for the team' becomes a parameter",
       "Can chain several tools in one pass"
      ]
     },
     "verdict": "Descriptions are operating instructions: include a negative clause ('do NOT use for X')."
    },
    "p": [
     "A tempting but wrong mental model to design against: routing tool calls by scanning prompts for keywords (`CONTAINS_STRING(\"analyze data\")`). Tool selection is actually a language-INFERENCE process — the model reads full intent and context ('analyze sales data' → data_analysis_tool; 'for the team' → an inferred parameter) and can chain multiple inferred tools in one pass. A second standing principle: NEGATIVE guidance ('do NOT use this for X') is as important as positive guidance in every tool description an organization ships."
    ],
    "why": "Tagline worth mandating org-wide: tool descriptions are OPERATING INSTRUCTIONS for the model, not developer documentation for a human maintainer. An architect reviewing a tool catalog should check every description for an explicit negative clause, not just a positive one — this is what actually prevents the tool-misrouting failure mode at scale, not a smarter model."
   },
   {
    "id": "a4-disambiguate",
    "part": "a4-p2",
    "legacy": 25,
    "h": "Tool-description disambiguation as a context-window-adjacent reliability problem",
    "bridge": "Part 1 showed that descriptions decide selection; now we apply that to near-synonym tools like search_users and find_users, where a wrong pick runs fine but gives wrong results.",
    "diagram": {
     "kind": "grid",
     "title": "close_ticket vs update_ticket: the deciding fact",
     "corner": "Tool",
     "cols": [
      "update_ticket",
      "close_ticket"
     ],
     "rows": [
      {
       "h": "Does",
       "cells": [
        {
         "t": "changes ticket fields",
         "tone": "default"
        },
        {
         "t": "sets status to closed",
         "tone": "default"
        }
       ]
      },
      {
       "h": "Side effect",
       "cells": [
        {
         "t": "none stated",
         "tone": "mute"
        },
        {
         "t": "SENDS customer email",
         "tone": "bad"
        }
       ]
      },
      {
       "h": "Use when",
       "cells": [
        {
         "t": "editing without notice",
         "tone": "default"
        },
        {
         "t": "investigation done, notify",
         "tone": "ok"
        }
       ]
      }
     ]
    },
    "p": [
     "When two tools have similar-sounding descriptions (e.g. a `search_users` tool and a `find_users` tool, or a `get_order` and a `fetch_order`), Claude has to choose between them using only the tool descriptions it has been given — and a vague or overlapping description increases the odds of the WRONG tool being selected, producing a call that runs successfully but returns the wrong data or has the wrong side effect. The fix is expanding tool descriptions with concrete USE-CASE framing and, where useful, a short example: not 'searches users' and 'finds users' (nearly indistinguishable) but 'search_users: full-text search across user names and emails for an unknown or partial identifier' vs. 'find_users: exact-match lookup by a known user ID' — descriptions that make the DECISION criterion explicit rather than leaving it to be inferred from near-synonymous verbs.",
     "Worked example: an MCP server exposes both `update_ticket` (changes ticket fields) and `close_ticket` (changes status to closed AND triggers a customer notification email). With bare one-line descriptions, an agent asked to 'mark this ticket resolved' might reasonably guess either tool. An expanded description on `close_ticket` — 'Use this specifically when a ticket investigation is complete and the customer should be notified; this SENDS AN EMAIL as a side effect, unlike update_ticket' — gives Claude the exact disambiguating fact (the side effect) needed to pick correctly, rather than leaving a consequential difference implicit."
    ],
    "why": "This is a distinct reliability lever from schema validation or tool_choice — even a perfectly-schema'd tool produces the wrong outcome if it's simply the wrong tool for the situation. Expanding descriptions with use-case framing and disambiguating side effects directly targets tool-selection accuracy, which is a separate failure mode from malformed output or missing invocation."
   },
   {
    "id": "a4-split-and-rename",
    "part": "a4-p2",
    "legacy": 2,
    "h": "Deep dive: tool splitting and tool renaming — two more interface-level fixes",
    "bridge": "Expanding descriptions fixes tools that read alike. Two other interface-level problems remain: one tool doing too many jobs, and two tools with confusingly similar names.",
    "diagram": {
     "kind": "decision",
     "title": "Which interface-level fix?",
     "q": {
      "t": "What creates the ambiguity?",
      "sub": "no implementation change needed"
     },
     "branches": [
      {
       "label": "similar descriptions",
       "t": "Expand with all five elements",
       "tone": "hi"
      },
      {
       "label": "one tool, many jobs",
       "t": "Split into narrow tools",
       "sub": "extract / summarize / verify",
       "tone": "ok"
      },
      {
       "label": "confusingly similar names",
       "t": "Rename with a specific description",
       "sub": "extract_web_results",
       "tone": "warn"
      }
     ]
    },
    "p": [
     "TOOL SPLITTING: a generic tool with broad responsibility creates ambiguity — `analyze_document: \"Analyses a document and returns results\"` gives the model no way to know what KIND of analysis to expect. Splitting into purpose-specific tools (`extract_data_points`, `summarize_content`, `verify_claim_against_source`), each with its own narrow, clearly-described job, lets the model pick based on what's actually needed.",
     "TOOL RENAMING: when two tools have confusingly SIMILAR NAMES (not just similar descriptions), renaming fixes the overlap at the interface level without touching any implementation — renaming `analyze_content` to `extract_web_results` with a web-specific description makes its purpose unambiguous purely from the name and description, no code change required."
    ],
    "why": "These are two distinct, low-effort interface fixes worth telling apart from description-expansion: splitting addresses a tool that's doing too MANY different jobs under one name; renaming addresses two tools whose NAMES (not necessarily their actual scope) create confusion. Neither requires touching the tool's underlying implementation — both are pure interface-level fixes, which is exactly why they're cheap, high-leverage moves to reach for before anything architecturally heavier."
   },
   {
    "id": "a4-consolidate",
    "part": "a4-p2",
    "legacy": 11,
    "h": "Deep dive: consolidating near-duplicate tools — splitting by role is NOT always the answer",
    "bridge": "Splitting works when tools do different jobs. What if the overload is 22 tools doing the same kind of work? Count the tools first, then pick the remedy.",
    "diagram": {
     "kind": "decision",
     "title": "Pick the fix by the shape of the toolkit",
     "q": {
      "t": "What are the tools like?",
      "sub": "count them before choosing"
     },
     "branches": [
      {
       "label": "few, read alike",
       "t": "Sharpen descriptions",
       "tone": "hi"
      },
      {
       "label": "different jobs",
       "t": "Split by role, 4-5 each",
       "tone": "ok"
      },
      {
       "label": "one job, one shape",
       "t": "Consolidate: one tool with an enum",
       "sub": "22 tools become 4",
       "tone": "warn"
      },
      {
       "label": "reach too far",
       "t": "Constrain to narrower tools",
       "tone": "bad"
      }
     ],
     "note": "A second MCP server does not help: the model sees one flat list."
    },
    "p": [
     "Splitting an overloaded toolkit by ROLE is the obvious fix for tool overload — but it's the WRONG fix when the tools all do the SAME KIND of work. Consider a data platform server with 22 tools: 3 query tools (one per data source) and 19 transformations (`pivot_table`, `calculate_percentile`, `normalise_currency`, and so on). Splitting by role hands a 'transformation agent' all 19 transformation tools — the original overload problem, just moved down one level; the agent still can't choose reliably among 19 near-identical options.",
     "The fix here is CONSOLIDATION: those 19 collapse into ONE parameterized tool, since they share an identical shape (data in, an operation, data out) — `transform_data(dataset, transform_type: enum[\"pivot\", \"percentile\", \"normalise_currency\", ...], options)`. Twenty-two tools become four. Nothing is lost — every transformation is still reachable, now as an ENUM VALUE the model picks INSIDE a single call, rather than a tool it has to find among nineteen near-identical descriptions."
    ],
    "code": "// BEFORE: 19 near-identical tools\npivot_table(dataset)\ncalculate_percentile(dataset, p)\nnormalise_currency(dataset, currency)\n// ...16 more, all \"data in, operation, data out\"\n\n// AFTER: 1 parameterized tool, enum picks the operation\n{\n  \"name\": \"transform_data\",\n  \"description\": \"Apply a transformation to a dataset. Use transform_type to select the operation.\",\n  \"input_schema\": {\n    \"type\": \"object\",\n    \"properties\": {\n      \"dataset\": { \"type\": \"string\" },\n      \"transform_type\": {\n        \"type\": \"string\",\n        \"enum\": [\"pivot\", \"percentile\", \"normalise_currency\", \"...\"]\n      },\n      \"options\": { \"type\": \"object\" }\n    },\n    \"required\": [\"dataset\", \"transform_type\"]\n  }\n}",
    "codeExplain": "The model now makes ONE decision (which tool?) instead of two nested ones (which of 22 tools? then which of its parameters?) — picking `transform_type` is a schema-level enum choice inside a single call, not a separate tool the model has to find and select from a crowded list.",
    "table": {
     "headers": [
      "The tools are...",
      "The fix"
     ],
     "rows": [
      [
       "Few enough to handle, but two read alike",
       "Sharpen the descriptions (a Tool Interface Design fix)"
      ],
      [
       "Genuinely different jobs (query, transform, export)",
       "Split by role, 4-5 tools each"
      ],
      [
       "Variations on ONE job, sharing a shape",
       "Consolidate into one parameterized tool"
      ],
      [
       "Doing more than the agent should be able to reach",
       "Constrain them (replace a generic tool with a narrower one)"
      ]
     ]
    },
    "why": "The FIRST row is where most people trip: description-sharpening is correct when the toolkit is SMALL enough to reason about (an agent choosing between 2 of 5 tools is a description problem), but the identical symptom from a set of 22 is a DIFFERENT disease — the agent is past the point where any description quality rescues selection, and rewriting all 22 descriptions leaves the underlying decision complexity exactly where it was. Count the tools before picking the remedy. Also worth knowing: consolidation and constraining pull in OPPOSITE directions and both can be correct in the same system — consolidation reduces HOW MANY tools an agent chooses between (collapsing 19 transformations into one parameterized tool doesn't grant new capability, so it doesn't undermine least privilege); constraining reduces WHAT any one tool can reach (replacing a generic `fetch_url` with a narrower `load_document`). One fix that ISN'T a fix: moving tools onto a SECOND MCP server. Server boundaries are invisible to the model — a client hands it every tool from every connected server as one FLAT list, so splitting a 22-tool problem across two servers is still, from the model's perspective, a 22-tool problem."
   },
   {
    "id": "a4-builtin-vs-custom",
    "part": "a4-p2",
    "legacy": 6,
    "h": "Built-in tools, and the client-side/server-side distinction",
    "bridge": "So far every tool was ours. When Anthropic's built-in tools sit beside custom ones, the model has a familiar default, so who writes and runs each kind of tool?",
    "diagram": {
     "kind": "compare",
     "title": "Client-side vs built-in (server-side) tools",
     "left": {
      "title": "Client-side (custom)",
      "tone": "hi",
      "items": [
       "Your app writes and executes it",
       "Reaches internal APIs via custom tool or MCP",
       "Broad custom tool may lose to a built-in"
      ]
     },
     "right": {
      "title": "Built-in / server-side",
      "tone": "ok",
      "items": [
       "Anthropic implements and hosts it",
       "You write no execution logic",
       "Cannot reach arbitrary company APIs"
      ]
     },
     "verdict": "Overlap with a familiar built-in: split the broad custom tool into granular ones."
    },
    "p": [
     "A client-side tool is one YOUR application writes and executes; a built-in/server-side tool (like web search) is one Anthropic has already implemented and hosts — you write no execution logic for it. Built-in tools only cover what Anthropic specifically implemented; they cannot automatically reach an arbitrary internal company API — that always requires a custom tool or MCP server."
    ],
    "why": "A recurring trap: providing a broad custom tool alongside a familiar built-in tool with overlapping capability causes Claude to default to the FAMILIAR built-in, even when the custom tool would do a better job. The fix isn't just a better description — it's splitting the broad tool into several granular, single-purpose tools, each with an obvious job the built-in clearly doesn't cover."
   },
   {
    "id": "a4-sparse-vs-builtin",
    "part": "a4-p2",
    "legacy": 17,
    "h": "Deep dive: why a sparse MCP tool description loses to a familiar built-in, even when it's more capable",
    "bridge": "The last section showed a broad custom tool losing to a built-in. Here is a subtler version: a MORE capable MCP tool loses simply because its description is thin.",
    "diagram": {
     "kind": "compare",
     "title": "search_codebase vs built-in Grep",
     "left": {
      "title": "Sparse MCP description",
      "tone": "bad",
      "items": [
       "'Searches code'",
       "One line, little context",
       "Agent defaults to Grep"
      ]
     },
     "right": {
      "title": "Competitive description",
      "tone": "ok",
      "items": [
       "Explains capabilities and outputs in detail",
       "Names the built-in it should beat",
       "Model picks the more capable tool"
      ]
     },
     "verdict": "Judge a description against what else the model could reach for."
    },
    "p": [
     "A subtle, specific failure worth recognizing: when an MCP tool has a SPARSE description (e.g. `search_codebase: \"Searches code\"`), the agent may prefer a built-in tool like `Grep` even when the MCP tool is genuinely MORE capable for the task. This isn't the model being lazy — built-in tools simply have RICHER, more detailed descriptions baked in, giving the model far more context about exactly what they do and when to use them. A one-line MCP description simply can't compete for the model's attention against a built-in tool's thorough, detailed one."
    ],
    "code": "# Sparse (loses to Grep):\nsearch_codebase: \"Searches code\"\n\n# Enhanced (competes fairly, and wins when it's genuinely better):\nsearch_codebase: \"Performs semantic code search across the entire\nrepository using AST-aware indexing. Returns matching functions,\nclasses, and methods with full context including file path, line\nnumbers, and surrounding code. More accurate than text-based grep\nfor finding code by INTENT rather than exact string match. Use this\ninstead of Grep when searching for code by what it DOES rather than\nwhat it CONTAINS.\"",
    "codeExplain": "The enhanced version doesn't just describe the tool — it explicitly states WHEN to prefer it over the specific built-in alternative ('use this instead of Grep when...'), giving the model a direct, actionable disambiguation rather than leaving it to infer superiority on its own.",
    "why": "This connects directly to the tool interface design principle that description quality determines selection reliability — but with a specific, easy-to-miss twist: the comparison isn't just 'is this description good enough on its own,' it's 'is this description competitive against whatever ELSE the model might reach for instead,' including built-ins it already has rich context about. Enhancing an MCP tool's description to explain its capabilities and outputs in DETAIL — and explicitly naming the built-in alternative it should be preferred over — is what lets the model correctly choose the more capable option instead of defaulting to what it already understands best."
   },
   {
    "id": "a4-granular-standard",
    "part": "a4-p2",
    "legacy": 16,
    "h": "Granular tools as an organizational design standard for accuracy",
    "bridge": "Everything in this part so far was a fix applied after a problem showed up. The architect move is to turn the lesson into a standing rule for every team.",
    "diagram": {
     "kind": "flow",
     "title": "From one-off fix to design standard",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Broad tool loses to built-in",
       "tone": "bad"
      },
      {
       "t": "Developer fix: split it",
       "sub": "granular, single-purpose tools"
      },
      {
       "t": "Architect: make it policy",
       "sub": "every team builds granular tools",
       "tone": "hi"
      },
      {
       "t": "Avoids rediscovering the anti-pattern",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "Developer covers a specific trap: a broad custom tool competing against a familiar built-in tool (like a general search tool) tends to LOSE that comparison, with the agent defaulting to the familiar option even when the custom tool would be better — fixed by splitting the broad tool into several granular, single-purpose tools. At the Architect level, 'prefer granular tools' becomes a standing DESIGN STANDARD for how every team in the organization builds custom and MCP tools, not a one-off fix applied after a specific broad tool is observed losing to a built-in."
    ],
    "why": "This is the Accuracy-axis entry from the reference matrix (Granular MCP Tools) generalized into policy: an organization that standardizes on granular, single-purpose tool design from the start avoids independently rediscovering the monolithic-tool anti-pattern in every new tool teams build, the same way standardizing few-shot examples or explicit criteria avoids rediscovering vague-instruction problems repeatedly."
   },
   {
    "id": "a4-tool-choice",
    "part": "a4-p3",
    "legacy": 5,
    "h": "tool_choice — controlling tool selection directly",
    "bridge": "Part 2 improved how likely the right tool is chosen. When an order or a call must be guaranteed, tool_choice takes the decision away from the model.",
    "diagram": {
     "kind": "grid",
     "title": "The tool_choice settings",
     "corner": "Setting",
     "cols": [
      "Effect",
      "Typical use"
     ],
     "rows": [
      {
       "h": "auto (default)",
       "cells": [
        {
         "t": "Claude decides",
         "tone": "default"
        },
        {
         "t": "normal agent work",
         "tone": "mute"
        }
       ]
      },
      {
       "h": "any",
       "cells": [
        {
         "t": "forces SOME tool call",
         "tone": "warn"
        },
        {
         "t": "guaranteed structured output",
         "tone": "mute"
        }
       ]
      },
      {
       "h": "named tool",
       "cells": [
        {
         "t": "forces exactly that tool",
         "tone": "ok"
        },
        {
         "t": "required first step",
         "tone": "mute"
        }
       ]
      },
      {
       "h": "none",
       "cells": [
        {
         "t": "no tool call this turn",
         "tone": "bad"
        },
        {
         "t": "text-only turn",
         "tone": "mute"
        }
       ]
      }
     ]
    },
    "p": [
     "By default Claude decides for itself whether and which tool to use (`auto`). `tool_choice` overrides that: `any` forces SOME tool call (guaranteeing structured output); a specific named tool forces exactly that tool (skipping Claude's own selection step, e.g. to guarantee a required first step in a pipeline); `none` prevents any tool call this turn."
    ],
    "why": "A concrete case: an agent needs to extract metadata BEFORE calling an enrichment tool, but occasionally calls enrichment first. The wrong fix is 'prompt begging' — ever-more emphatic prose asking nicely for the right order. The right fix is setting `tool_choice` to force the required first tool on that initial call, guaranteeing execution order structurally rather than hoping a strongly-worded request is followed."
   },
   {
    "id": "a4-tool-choice-control",
    "part": "a4-p3",
    "legacy": 18,
    "h": "tool_choice as a compliance/control mechanism at the architecture level",
    "bridge": "Forcing a tool fixed an ordering bug in the previous section. At architect level the same setting becomes an enforcement primitive for compliance steps.",
    "diagram": {
     "kind": "seq",
     "title": "A compliance step forced by tool_choice",
     "actors": [
      {
       "t": "Pipeline step",
       "tone": "hi"
      },
      {
       "t": "Claude API"
      },
      {
       "t": "validation tool",
       "tone": "warn"
      },
      {
       "t": "Next step",
       "tone": "mute"
      }
     ],
     "rows": [
      {
       "f": 0,
       "t": 1,
       "text": "request with tool_choice = validation tool"
      },
      {
       "f": 1,
       "t": 2,
       "text": "must call it (no choice)",
       "tone": "warn"
      },
      {
       "note": "Guaranteed at tool SELECTION, like a hook guarantees a rule at execution.",
       "over": [
        1,
        2
       ]
      },
      {
       "f": 2,
       "t": 3,
       "text": "validated, proceed",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "Developer covers `tool_choice` mainly as a fix for tool misrouting and forced execution order (avoiding 'prompt begging' for a required first tool call). At the Architect level, forcing tool_choice on specific pipeline steps is also a CONTROL mechanism — appearing directly in the reference matrix as the Multi-Agent archetype's answer to the Compliance/Control constraint: a pipeline step that must ALWAYS call a specific validation or logging tool before proceeding can have that guaranteed structurally via tool_choice, the same way a hook guarantees a business rule, but applied specifically to tool SELECTION rather than to blocking an action after the fact."
    ],
    "why": "This reframes tool_choice from a Developer-level 'reliability fix' into an Architect-level 'enforcement primitive' — recognizing that forcing a specific tool call is itself a form of guaranteed, deterministic control (like a hook), just exercised at the point of tool SELECTION rather than tool EXECUTION."
   },
   {
    "id": "a4-fake-tool",
    "part": "a4-p3",
    "legacy": 20,
    "h": "The Fake Tool Paradigm and Zero Parsing, as a standard org-wide pattern",
    "bridge": "Forced tool calls also give structured output: define a tool with no real action behind it. Why does that beat asking for JSON in prose?",
    "diagram": {
     "kind": "flow",
     "title": "Fake Tool Paradigm to Zero Parsing",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Define a tool as a schema only",
       "sub": "no action behind it",
       "tone": "hi"
      },
      {
       "t": "Server validates against schema",
       "sub": "before your code sees it",
       "tone": "warn"
      },
      {
       "t": "content[0].input arrives",
       "sub": "already a dict",
       "tone": "ok"
      },
      {
       "t": "No json.loads, no cleanup",
       "sub": "zero parsing",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "'Define a tool purely to receive a structured payload, with no real action behind it' has two names worth standardizing on: the Fake Tool Paradigm (the tool itself) and Zero Parsing (the payoff — `response.content[0].input` arrives as an already schema-validated dict, no `json.loads`, no cleanup). An organization should mandate this pattern over 'prompt for JSON in prose' anywhere structured output feeds a downstream system."
    ],
    "why": "The mechanical reason this beats prompting for JSON: schema validation happens SERVER-SIDE, before your code ever touches the response — which is what makes parsing unnecessary, not merely 'more reliable.' Standardizing on it org-wide removes an entire class of fragile-parsing bugs from every team's extraction pipeline."
   },
   {
    "id": "a4-tool-distribution",
    "part": "a4-p3",
    "legacy": 9,
    "h": "Deep dive: tool distribution — restricting each agent to only its role's tools",
    "bridge": "tool_choice controls one call; the broader lever is which tools an agent can see at all. A data-collection agent shows why more tools is not better.",
    "diagram": {
     "kind": "hub",
     "title": "web-search agent: allowed_tools",
     "center": {
      "t": "Role: fetch RAW data",
      "sub": "analysis is a later stage",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "Keep",
       "tone": "ok",
       "items": [
        "web_search",
        "url_fetch",
        "html_parse",
        "pdf_extract",
        "image_ocr",
        "translate",
        "keyword_extract"
       ]
      },
      {
       "t": "Remove",
       "tone": "bad",
       "items": [
        "summarise",
        "sentiment_analysis"
       ]
      }
     ],
     "note": "Remove them structurally; an emphatic description is not a fix."
    },
    "p": [
     "A concrete illustration of why 'more tools available' isn't automatically better: a web-search agent is given 9 tools — `web_search`, `url_fetch`, `html_parse`, `pdf_extract`, `image_ocr`, `translate`, `summarise`, `keyword_extract`, `sentiment_analysis`. In testing, it frequently calls `summarise` and `sentiment_analysis` when its actual job is only to fetch RAW data for a separate analysis stage to process."
    ],
    "why": "The fix is REMOVING `summarise` and `sentiment_analysis` from this agent's `allowed_tools` entirely, not writing a more emphatic description telling it not to use them. Since this agent's ROLE is data collection, not analysis, it structurally shouldn't have tools that perform analysis at all — an agent given tools outside its specialization will tend to use them, especially when a tool's output looks superficially helpful for wrapping up its own turn (a raw-data-fetcher 'helpfully' summarizing what it found before handing off). Giving an agent only the tools its role genuinely needs isn't just a minor efficiency tweak — it's what keeps agents doing their assigned job instead of quietly expanding into work meant for a different, dedicated stage of the pipeline."
   },
   {
    "id": "a4-scoped-cross-role",
    "part": "a4-p3",
    "legacy": 10,
    "h": "Deep dive: scoped cross-role tools — a targeted exception to strict role-based tool restriction",
    "bridge": "Least privilege says each agent gets only its role's tools. There is one deliberate exception for a high-frequency need, and the numbers decide it.",
    "diagram": {
     "kind": "bar",
     "title": "Synthesis agent verification needs",
     "segments": [
      {
       "t": "Simple fact-check ~85%: scoped verify_fact(claim)",
       "v": 85,
       "tone": "ok"
      },
      {
       "t": "Complex ~15%: coordinator to specialist",
       "v": 15,
       "tone": "warn"
      }
     ],
     "note": "Give ONE narrow tool, not the full web-search toolset."
    },
    "p": [
     "The default rule is that each agent should get ONLY the tools its own role needs — a synthesis agent shouldn't have web-search tools, a research agent shouldn't have refund tools. But a real, named exception exists for a HIGH-FREQUENCY cross-role need: if a synthesis agent frequently (say, 85% of the time) needs only a SIMPLE fact-check (a date, a name, a statistic) while combining findings, giving it a single narrowly-SCOPED tool for exactly that — e.g. `verify_fact(claim)` — avoids the overhead of round-tripping back through the coordinator to the web-search agent and back again for every trivial verification, while the remaining 15% of genuinely COMPLEX verifications still route through the normal coordinator→specialist path."
    ],
    "code": "# Synthesis agent's allowed_tools — scoped, not the full web-search toolkit\nsynthesis_agent_tools = [\n    \"compile_report\",\n    \"format_citation\",\n    \"assess_coverage\",\n    \"verify_fact\"   # <- narrowly scoped: simple lookups ONLY\n]\n\ndef verify_fact(claim: str) -> dict:\n    # Handles simple, single-source lookups directly — no coordinator round-trip\n    # Complex, multi-source, or judgment-heavy checks still get routed\n    # back through the coordinator to the full web-search agent.\n    ...",
    "codeExplain": "Note what's NOT in this list: `web_search`, `fetch_page`, `extract_links` — the full research toolkit stays with the specialist agent. `verify_fact` is the one deliberately narrow exception, not a backdoor to general research capability.",
    "why": "This is a deliberate, narrow exception to least privilege, not a contradiction of it — the synthesis agent gets ONE specifically-scoped tool for the high-frequency simple case, not the full web-search toolset. Compare this against the tempting-but-wrong alternatives: giving the synthesis agent the FULL web-search tool access 'to avoid round-trips entirely' over-provisions it and violates separation of concerns (now it can go do open-ended research, which was never its job); batching up all verification needs to send at the end creates blocking dependencies, since a later verification might depend on an earlier one's result; and having the web-search agent SPECULATIVELY cache extra context 'in case synthesis needs it' can't reliably predict what will actually be needed. The scoped cross-role tool is the one option that fixes the actual 85%-case latency problem without compromising the agent's role boundaries for the 15% that still needs the real specialist."
   },
   {
    "id": "a4-edit-grep-glob",
    "part": "a4-p4",
    "legacy": 21,
    "h": "Built-in tool mechanics an architect should audit for: Edit's unique-anchor requirement, and Grep vs. Glob",
    "bridge": "With tool distribution settled, we move to the built-in tools themselves, starting with the two mechanics that cause most failures: Edit's unique anchor and the Grep vs Glob split.",
    "diagram": {
     "kind": "decision",
     "title": "Edit's old_string anchor",
     "q": {
      "t": "Does the anchor match exactly one place?",
      "sub": "Grep = contents, Glob = paths only"
     },
     "branches": [
      {
       "label": "one match",
       "t": "Edit succeeds",
       "tone": "ok"
      },
      {
       "label": "several matches",
       "t": "Call fails outright",
       "tone": "bad"
      },
      {
       "label": "fallback",
       "t": "Read whole file, reason, then Write",
       "sub": "never retry the same call",
       "tone": "hi"
      }
     ]
    },
    "p": [
     "Edit requires its `old_string` anchor to be UNIQUE within a file — if it matches multiple locations, the call fails outright. The documented fallback is Read (load the whole file) → reason over it → Write (overwrite with the complete updated content), never a retry of the same non-unique call. Separately: Grep searches file CONTENTS; Glob matches file PATHS/NAMES only and never looks inside a file — a commonly confused pair worth auditing in any codebase-exploration tooling standard."
    ],
    "why": "For directed exploration of a large, unfamiliar codebase, the correct standard order is Grep (find candidate files by content) → Glob (confirm naming/path patterns) → Read (only the files that surface) — never a bulk Read of every file, and never Edit as a search mechanism, since a unique anchor can't be guaranteed sight-unseen across an entire codebase."
   },
   {
    "id": "a4-token-budget",
    "part": "a4-p4",
    "legacy": 24,
    "h": "Why the Grep→Glob→Read sequence exists: managing context-window token budget, with worked numbers",
    "bridge": "Grep first, then Glob, then Read is not tidiness. This section shows the reason: every Read spends tokens from a finite context window.",
    "diagram": {
     "kind": "bar",
     "title": "Tokens to trace calculateShippingCost in 150 files",
     "segments": [
      {
       "t": "Bulk Read ~375,000",
       "v": 375000,
       "tone": "bad"
      },
      {
       "t": "Grep + 8 Reads ~20,500",
       "v": 20500,
       "tone": "ok"
      }
     ],
     "note": "Spend tokens only on files a cheap search confirmed: about 95% cheaper."
    },
    "p": [
     "Every file a Read tool call pulls in consumes real tokens out of a FINITE context window — this is the concrete reason the systematic Grep/Glob/Read discovery pattern exists at all, not just a stylistic preference for tidiness. Bulk-reading an unfamiliar codebase upfront (say, 200 files averaging 300 lines each) can consume tens of thousands of tokens before a single line of actual reasoning about the problem happens, crowding out the room needed to think, plan, and make the eventual edit — and worse, most of those 200 files will turn out to be irrelevant to the actual question being investigated.",
     "Worked example with real numbers: an agent needs to trace how a `calculateShippingCost()` function is used across a 150-file codebase to safely change its signature. Bulk-reading all 150 files at roughly 300 lines (~2,500 tokens) each costs roughly 375,000 tokens before any reasoning happens — likely exceeding the entire context window on its own. The Grep-first alternative: Grep for `calculateShippingCost` across the codebase first (a single cheap operation returning only matching lines with surrounding context, typically a few hundred tokens total), which might reveal only 8 files actually reference the function. Reading only those 8 files at ~2,500 tokens each costs about 20,000 tokens — roughly 5% of the bulk-read cost — leaving the overwhelming majority of the context window free for the actual reasoning, editing, and verification work.",
     "This is why 'managing context window constraints' is inseparable from the Grep/Glob/Read pattern rather than a separate topic: each step's entire purpose is to spend tokens ONLY on files that Step 1's cheap, targeted search has already confirmed are relevant, deferring the expensive operation (Read) until it's justified by evidence from a cheap operation (Grep or Glob) — turning an expensive blind bulk-read into a cheap targeted search followed by a small number of well-justified reads."
    ],
    "why": "This is the exact angle the exam tests and that's easy to miss if Grep/Glob/Read is understood only as 'the right tools for finding things': the REASON this sequence is mandatory — not just convenient — is that context is a finite, consumable budget, and reading files blindly before confirming relevance is the single most common way agentic sessions run out of usable context before the actual task is done.",
    "table": {
     "headers": [
      "Approach",
      "Token cost (150-file codebase example)",
      "Result"
     ],
     "rows": [
      [
       "Bulk Read of all 150 files upfront",
       "~375,000 tokens (150 × ~2,500)",
       "Likely exceeds context budget before any reasoning occurs; most files turn out irrelevant"
      ],
      [
       "Grep first, then Read only the 8 matching files",
       "~500 tokens (Grep) + ~20,000 tokens (8 × ~2,500) ≈ 20,500 tokens",
       "~95% cheaper; leaves the large majority of the context window free for reasoning and editing"
      ]
     ]
    },
    "deep": "A related trap: even Grep results can accumulate cost if applied carelessly — grepping for an extremely common term across a massive monorepo can itself return thousands of matching lines, effectively becoming its own token sink. The same discipline applies recursively: narrow the Grep pattern (a specific function/class name rather than a generic word), scope it to relevant directories or file types when possible, and treat even 'the cheap search step' as something to keep targeted rather than assuming any Grep call is automatically free."
   },
   {
    "id": "a4-incremental-discovery",
    "part": "a4-p4",
    "legacy": 22,
    "h": "Deep dive: incremental codebase understanding, and a worked deprecation-tracing scenario",
    "bridge": "Given the token budget, how do you actually explore? This section turns it into a repeatable four-step pattern and a deprecation-tracing scenario.",
    "diagram": {
     "kind": "flow",
     "title": "Incremental discovery",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "GREP entry points",
       "sub": "function, class, error text",
       "tone": "hi"
      },
      {
       "t": "READ and follow imports",
       "sub": "only relevant files"
      },
      {
       "t": "GREP AGAIN",
       "sub": "wrapper names, consumers",
       "tone": "warn"
      },
      {
       "t": "READ what is justified",
       "sub": "by the last step",
       "tone": "ok"
      }
     ],
     "loops": [
      {
       "from": 3,
       "to": 2,
       "label": "new wrapper found, search again"
      }
     ]
    },
    "p": [
     "The exact 4-step incremental discovery pattern worth standardizing across an organization: (1) GREP to find entry points — search for the function name, class name, or error message anchoring the investigation, telling you which files are even relevant; (2) READ to follow imports and trace flows — once you know which files matter, read them and follow their import statements to discover related files; (3) GREP AGAIN to trace usage — if you find a wrapper function or re-export, grep for THAT name across the codebase to find all its consumers; (4) READ only what's justified by what the previous step actually discovered. This is minimal context for maximum understanding — never a bulk read of an entire unfamiliar codebase upfront.",
     "A worked scenario showing why the SEQUENCE matters: find every file that calls a deprecated `processLegacyOrder()` AND every test file for those callers. The correct order is GREP, then GLOB, then GREP AGAIN — not Glob first. Step 1: Grep for `processLegacyOrder` finds every file whose CONTENTS reference the function (including any tests that import it directly). Step 2: Glob for the SIBLING test file naming pattern of each caller found (e.g. `OrderProcessor.ts` → `**/OrderProcessor.test.*`) — this catches tests that exercise the function INDIRECTLY through the source module without ever naming it. Step 3: Grep AGAIN for any WRAPPER name — if a caller exposes the deprecated function through a wrapper (e.g. `applyLegacyOrder` calls `processLegacyOrder` internally), grep for the wrapper name to catch tests that cover the function transitively through it."
    ],
    "why": "Starting with Glob instead of Grep for this scenario is a specific, recognizable mistake: Glob can only match file PATHS by naming pattern, so `Glob: \"**/*processLegacyOrder*\"` would only find files with that literal string IN THEIR FILENAME — it cannot find files that merely CALL the function inside their contents, which is the actual target of the search. Content search (Grep) has to come first because the goal is finding CALLERS, not files whose NAMES happen to match. The multi-step trace (content search → sibling paths → content search again for wrappers) catches indirect consumers that a single Grep alone would miss entirely."
   },
   {
    "id": "a4-explore-subagent",
    "part": "a4-p4",
    "legacy": 23,
    "h": "The Explore subagent — a named, built-in subagent specifically for fast, read-only research",
    "bridge": "Discovery output is verbose and costs context. Claude Code has a built-in way to keep it out of your main conversation entirely.",
    "diagram": {
     "kind": "compare",
     "title": "Where open-ended research happens",
     "left": {
      "title": "Main session does it",
      "tone": "bad",
      "items": [
       "Bulk reads fill the context",
       "Verbose output stays in history",
       "Less room to plan and edit"
      ]
     },
     "right": {
      "title": "Explore subagent",
      "tone": "ok",
      "items": [
       "Fast, read-only, speed over completeness",
       "Skips CLAUDE.md and git status",
       "Only a summary returns"
      ]
     },
     "verdict": "Route exploratory research to Explore for context isolation."
    },
    "p": [
     "Claude Code ships a built-in `Explore` subagent purpose-built for verbose, read-only codebase investigation — it's optimized for SPEED over completeness, and it deliberately skips loading CLAUDE.md and git status at startup (a distinction covered on the Agents and Workflows side of this guide). Delegating open-ended research questions ('how does authentication flow through this codebase?') to Explore keeps that verbose discovery output OUT of the main conversation's context, mirroring the general subagent-for-context-isolation principle applied specifically to Claude Code's own tooling."
    ],
    "why": "An architect standardizing team workflows should route GENUINELY exploratory, read-only research to Explore by default rather than having the main session do bulk reads itself — this is the concrete, product-specific instantiation of the 'subagent delegation for context isolation, not just parallelization' principle a Foundations-level architect is expected to recognize and apply, not just understand abstractly."
   },
   {
    "id": "a4-mcp-primitives",
    "part": "a4-p5",
    "legacy": 7,
    "h": "MCP: the three primitives, and the isError convention",
    "bridge": "Everything so far lived inside one application. MCP lifts tools into a shared protocol, so what can a server expose and how should it report failure?",
    "diagram": {
     "kind": "hub",
     "title": "What an MCP server exposes",
     "center": {
      "t": "MCP server",
      "sub": "works with any compliant client",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "Tools",
       "sub": "callable actions",
       "tone": "warn"
      },
      {
       "t": "Resources",
       "sub": "readable data, a ready map",
       "tone": "ok"
      },
      {
       "t": "Prompts",
       "sub": "reusable templates"
      }
     ],
     "note": "Failures return isError: true with category, retryable, what was attempted, partial results."
    },
    "p": [
     "MCP (Model Context Protocol) is an open protocol for exposing capabilities to any compliant client (Claude Code, Claude Desktop, or a third-party client like Cline), independent of any one application. An MCP server exposes exactly three kinds of things: Tools (callable actions), Resources (readable data addressed like a file/URL, giving an agent an immediate 'map' without exploratory tool calls), and Prompts (reusable templates).",
     "When an MCP tool call fails, it returns `isError: true`. A generic message ('Operation failed') gives the calling agent nothing to act on; a well-structured error includes an error CATEGORY, whether it's retryable, what was attempted, and any partial results — enough for the coordinator to actually decide how to recover."
    ],
    "why": "Build an MCP server when a capability needs to be REUSED across multiple independent applications and maintained independently of any single app's release cycle — the official pattern is an internal API reusable across several Claude apps. One-off, single-app needs are a custom tool; a recurring task pattern/house style with no live external access is a Skill."
   },
   {
    "id": "a4-error-categories",
    "part": "a4-p5",
    "legacy": 8,
    "h": "Deep dive: one tool, THREE failure patterns, THREE different error categories",
    "bridge": "The previous section said a good error carries a category and a retryable flag. This worked example shows why one blanket combination is always wrong.",
    "diagram": {
     "kind": "decision",
     "title": "search_papers: three failures, three responses",
     "q": {
      "t": "Which failure pattern?",
      "sub": "errorCategory + isRetryable"
     },
     "branches": [
      {
       "label": "503 at peak",
       "t": "transient, retryable: retry later",
       "tone": "ok"
      },
      {
       "label": "unlicensed journal",
       "t": "permission, not retryable: escalate",
       "tone": "bad"
      },
      {
       "label": "malformed DOI",
       "t": "validation: fix the input, then resend",
       "tone": "warn"
      }
     ]
    },
    "p": [
     "A worked example showing why a single blanket error-handling combo is almost always wrong: a `search_papers` MCP tool has three distinct failure patterns. (1) The upstream academic API returns HTTP 503 during peak hours — this is a TRANSIENT infrastructure failure: `errorCategory: \"transient\"`, `isRetryable: true` (retrying later will likely succeed once load drops). (2) A user requests a paper from a restricted journal the system has no license for — this is a PERMISSION failure: `errorCategory: \"permission\"`, `isRetryable: false` (retrying the identical request will fail again forever; no retry will ever grant a license that doesn't exist). (3) The agent submits a malformed DOI like `'doi-1234'` that fails the input regex — this is a VALIDATION failure: `errorCategory: \"validation\"`, `isRetryable: false` in the sense that retrying the SAME malformed input won't help, though the agent can correct the DOI format and try a NEW, valid request."
    ],
    "why": "Applying the SAME `errorCategory`/`isRetryable` combination to all three would be a serious design mistake — it collapses three fundamentally different situations, each needing a different agent response, into one indistinguishable signal. Blindly retrying (2) wastes calls on something that can never succeed; failing to eventually retry (1) gives up on something that likely WOULD succeed shortly; and treating (3) the same as (1) tells the agent to just wait and retry instead of correcting the actual malformed input. This is precisely why the four-category error taxonomy (transient/validation/business/permission) exists as DISTINCT categories rather than a single generic 'failed' status — each carries a different, specific correct action."
   },
   {
    "id": "a4-error-vs-auth",
    "part": "a4-p5",
    "legacy": 26,
    "h": "MCP structured error handling and MCP server auth/discovery verification, with worked scenarios",
    "bridge": "Execution errors are one failure class. A server can also connect fine and still fail on every call, so where should you look first?",
    "diagram": {
     "kind": "seq",
     "title": "New engineer: connected, but every call is a 401",
     "actors": [
      {
       "t": "Claude Code",
       "tone": "hi"
      },
      {
       "t": "MCP server"
      }
     ],
     "rows": [
      {
       "f": 0,
       "t": 1,
       "text": "connect and initialize"
      },
      {
       "f": 1,
       "t": 0,
       "text": "tools listed: discovery worked",
       "tone": "ok",
       "dashed": true
      },
      {
       "f": 0,
       "t": 1,
       "text": "call a tool"
      },
      {
       "f": 1,
       "t": 0,
       "text": "401 unauthorized",
       "tone": "bad",
       "dashed": true
      },
      {
       "note": "Check THIS machine's credential or env var. A code bug would fail for everyone.",
       "over": [
        0,
        1
       ],
       "tone": "warn"
      }
     ]
    },
    "p": [
     "MCP tool results carry an `isError` flag distinct from the result content itself — a well-behaved MCP server sets `isError: true` alongside a descriptive error message rather than either silently returning empty/null data or throwing an unhandled exception that crashes the calling session. Worked scenario: an MCP-backed `get_weather` tool is called for an invalid city name. The correct behavior is a tool result with `isError: true` and content like 'City not found: check spelling or provide a country code' — giving Claude enough structured signal to recover (e.g. ask the user to clarify) rather than returning `{temperature: null}` silently (which looks like a valid-but-empty result) or crashing the whole session (which loses all prior context).",
     "Separately, MCP server auth and discovery failures are a distinct category from tool-execution errors, and they surface differently. Worked scenario: a newly onboarded engineer's Claude Code session shows an MCP server as connected, but every tool call from it fails with a generic 401. The likely root cause is a MISSING or EXPIRED credential/token in that engineer's own environment — not a broken tool implementation — since the server otherwise initializes and lists its tools successfully (proving discovery worked; only per-call auth is failing). Verifying this class of failure means checking the credential/environment-variable configuration for that specific server on that specific machine, rather than assuming the tool's code itself is broken, since a code-level bug would typically fail identically for every user, not just the newly onboarded one."
    ],
    "why": "Distinguishing an execution-time error (isError-flagged, tool ran but failed on this input) from a connection/discovery/auth-time error (the server can't be reached, or reached but not authorized) determines where to actually look for the fix — treating every MCP failure as 'the tool is broken' wastes time debugging code when the actual fault is a missing credential, a scoping issue, or a genuinely bad input, each of which needs a different investigation path."
   },
   {
    "id": "a4-resources-catalog",
    "part": "a4-p5",
    "legacy": 15,
    "h": "MCP resources for content catalogs — visibility without a round of exploratory tool calls",
    "bridge": "Resources appeared as one of three primitives; this section applies them to a recurring need, knowing what exists before deciding what to fetch.",
    "diagram": {
     "kind": "compare",
     "title": "Discovering what data exists",
     "left": {
      "title": "Exploratory tool call",
      "tone": "bad",
      "items": [
       "Spends a round-trip to list options",
       "Adds a decision point",
       "Extra latency"
      ]
     },
     "right": {
      "title": "Catalog as MCP resource",
      "tone": "ok",
      "items": [
       "Passive read-only reference data",
       "Already visible in context",
       "No call needed to discover"
      ]
     },
     "verdict": "A catalog is something to KNOW about, not an action to take."
    },
    "p": [
     "When an agent needs to know WHAT'S AVAILABLE before deciding what to actually fetch (a list of documents, available data sources, a directory of reports), exposing that catalog as an MCP RESOURCE — rather than requiring the agent to make an exploratory TOOL CALL just to discover what exists — gives the agent this visibility for free, already present in context, without spending a round-trip just to find out what's there."
    ],
    "why": "This is the resources-vs-tools distinction applied to a specific, recurring architectural need: a content catalog is passive, read-only reference data the agent needs to KNOW ABOUT, not an action it needs to DECIDE to take — which is exactly the profile a resource fits, rather than a tool. Requiring an exploratory tool call just to answer 'what data sources even exist' adds unnecessary latency and an extra decision point for something that could simply already be visible."
   },
   {
    "id": "a4-community-vs-custom",
    "part": "a4-p6",
    "legacy": 14,
    "h": "Preferring an existing community MCP server over a custom build, for standard integrations",
    "bridge": "We have seen how MCP servers behave. The architect question comes first: should you build one at all, or adopt an existing one?",
    "diagram": {
     "kind": "decision",
     "title": "Community server or custom build?",
     "q": {
      "t": "What kind of integration?",
      "sub": "auth, pagination, rate limits, version drift"
     },
     "branches": [
      {
       "label": "standard, widely used",
       "t": "Adopt a maintained community server",
       "sub": "Jira, Slack, GitHub, common DB",
       "tone": "ok"
      },
      {
       "label": "team-specific",
       "t": "Build a custom server",
       "sub": "internal or proprietary system",
       "tone": "hi"
      }
     ]
    },
    "p": [
     "For a STANDARD, widely-used integration (Jira, Slack, GitHub, a common database), the architect-level default is choosing an existing, actively-maintained community MCP server over building a custom one from scratch — the integration surface (auth, pagination, rate limits, API version drift) has already been solved and is being kept current by someone else. Reserve CUSTOM server builds specifically for team-specific workflows that no general-purpose server could reasonably cover — an internal, proprietary system, or a genuinely unique business process."
    ],
    "why": "This is the same 'don't reinvent the wheel' judgment tested at the Developer level, generalized into a standing org policy: defaulting to custom builds even for well-covered standard integrations means the team now owns ongoing maintenance (auth changes, API deprecations) that a community-maintained server would have absorbed for free. The exam-relevant signal is recognizing WHICH category a given integration falls into — standard and widely-needed (prefer community) versus team-specific and idiosyncratic (custom is justified)."
   },
   {
    "id": "a4-ecosystem",
    "part": "a4-p6",
    "legacy": 12,
    "h": "Same decision framework, now applied to a whole tool ecosystem",
    "bridge": "Choosing server by server leaves the org-wide question: the same keep-the-toolbox-small principle applied to a whole catalog of tools across teams.",
    "diagram": {
     "kind": "layers",
     "title": "Designing a tool ecosystem",
     "arrows": false,
     "layers": [
      {
       "t": "Which capabilities become shared MCP servers",
       "sub": "used org-wide",
       "tone": "hi",
       "tag": "what"
      },
      {
       "t": "How servers are versioned and deprecated safely",
       "tone": "warn",
       "tag": "change"
      },
      {
       "t": "How tool sprawl is prevented",
       "sub": "overlapping tools across teams",
       "tone": "bad",
       "tag": "limit"
      }
     ]
    },
    "p": [
     "Architect asks you to design the ECOSYSTEM: which capabilities should become shared MCP servers used org-wide, how should MCP servers be versioned and deprecated safely, and how do you prevent 'tool sprawl' (too many overlapping tools across too many teams) at an organizational scale."
    ],
    "why": "This is the same 'keep the toolbox small' principle, applied across an entire organization's tool catalog instead of one application's tool list — the failure mode (selection errors from overlapping tools) is the same, just at a larger scale."
   },
   {
    "id": "a4-mcp-governance",
    "part": "a4-p6",
    "legacy": 13,
    "h": "MCP server governance",
    "bridge": "A shared catalog only works if someone owns each server. This section covers what happens after teams depend on it: ownership, breaking changes and load.",
    "diagram": {
     "kind": "hub",
     "title": "Owning a shared MCP server",
     "center": {
      "t": "Shared MCP server",
      "sub": "many teams depend on it",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "Ownership",
       "sub": "who is accountable"
      },
      {
       "t": "Breaking changes",
       "sub": "tool schema change process",
       "tone": "warn"
      },
      {
       "t": "Monitor and rate-limit",
       "sub": "one team cannot starve others",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "Who owns an MCP server that multiple teams depend on? What's the process for a breaking change to a shared MCP server's tool schema? How do you monitor and rate-limit a shared MCP server so one team's heavy usage doesn't degrade it for everyone else?"
    ],
    "why": "These are genuinely NEW architect-level concerns beyond Developer's scope — Developer tests whether you'd correctly choose to build an MCP server; Architect tests how you'd responsibly OWN and EVOLVE one that other teams now depend on."
   },
   {
    "id": "a4-safety-patterns",
    "part": "a4-p6",
    "legacy": 27,
    "h": "Tool-level safety patterns — confirmation-token binding for irreversible actions, and where retry logic belongs",
    "bridge": "Governance protects the catalog; safety patterns protect each action. A boolean flag is not enough, and retry logic has a correct home inside the tool.",
    "diagram": {
     "kind": "seq",
     "title": "Confirmation-token binding",
     "actors": [
      {
       "t": "Agent",
       "tone": "hi"
      },
      {
       "t": "preview_delete"
      },
      {
       "t": "execute_delete",
       "tone": "warn"
      }
     ],
     "rows": [
      {
       "f": 0,
       "t": 1,
       "text": "preview what would be deleted"
      },
      {
       "f": 1,
       "t": 0,
       "text": "preview + single-use token",
       "tone": "ok",
       "dashed": true
      },
      {
       "f": 0,
       "t": 2,
       "text": "execute with that exact token"
      },
      {
       "note": "No valid, unused, matching token: it fails. dry_run: false has no such barrier.",
       "over": [
        2
       ],
       "tone": "bad"
      }
     ]
    },
    "p": [
     "A `dry_run` boolean flag on a risky tool (e.g. `delete_records(dry_run: true)`) is a WEAKER safety pattern than it looks, because nothing stops the model — or a malformed prompt, or an injected instruction — from simply calling the same tool again with `dry_run: false`. The flag is advisory, not a structural barrier: it changes what the call DOES, but doesn't change what calls are POSSIBLE. A deterministically stronger pattern is CONFIRMATION-TOKEN BINDING: split the risky action into two tools — a `preview_delete` tool that computes exactly what would be deleted, emits a single-use confirmation token bound to that specific preview, and returns both; and an `execute_delete` tool that REQUIRES that exact token as an argument and fails without a valid, matching, not-yet-used one. This makes the destructive path structurally unreachable without first having gone through the preview step — it isn't a request the model chooses to honor, it's an argument the execute tool cannot function without.",
     "Worked comparison: with `dry_run`, a compromised or confused agent can go straight to `delete_records(dry_run: false)` in a single call — the safety property depends entirely on the model choosing to call it with `dry_run: true` first, which is exactly the kind of 'must never happen' guarantee that prompting cannot provide. With token binding, `execute_delete` called without a valid token from a matching `preview_delete` simply fails at the tool layer — there is no single call that skips the preview, because the token doesn't exist until the preview created it.",
     "Retry logic placement: transient, retryable failures (a rate limit, a momentary network timeout, a 503 from a downstream service) should be retried WITH BACKOFF INSIDE THE TOOL ITSELF, not left for the model to notice and re-call — the tool has definitive, structural knowledge of which failures are transient (it knows it hit a rate limit vs. got a validation error), while the model only sees whatever error message comes back and has to guess. Non-retryable failures (a malformed argument, a validation error, a 400) should be returned immediately with a clear, specific error — retrying a validation failure can't fix it, and silently retrying it just burns time and calls before failing anyway."
    ],
    "why": "Both parts of this test the same underlying principle from elsewhere in the domain: a 'must never happen' or 'must always happen efficiently' requirement needs to be enforced by code with no dependence on the model behaving correctly, not by a flag or an instruction the model could plausibly bypass or fail to act on. Exam framing: given a tool design with a boolean safety flag, identify the structural weakness; given a described error-handling scheme, identify whether retries are misplaced (model-driven retries on transient failures, or blind retries on non-retryable ones).",
    "table": {
     "headers": [
      "Design question",
      "Weak approach",
      "Sound approach"
     ],
     "rows": [
      [
       "Guarding an irreversible action",
       "A `dry_run` boolean the caller sets",
       "Split into preview + execute tools bound by a single-use confirmation token"
      ],
      [
       "Who decides whether a failure is retryable?",
       "The model, guessing from the error message it receives",
       "The tool itself, which has definitive knowledge of the failure type"
      ],
      [
       "Where does backoff/retry logic for transient failures live?",
       "In the model's own re-calling behavior",
       "Inside the tool, wrapping the underlying operation"
      ],
      [
       "What happens on a non-retryable validation error?",
       "Retried anyway, wasting calls before eventually failing",
       "Returned immediately with a specific, actionable error message"
      ]
     ]
    },
    "deep": "The common exam distractor for token binding is a design that LOOKS like it enforces two steps but doesn't — e.g. a `confirm: true` boolean on the same single `delete_records` call, which is really just a renamed `dry_run` flag with the same structural weakness (nothing stops calling it with `confirm: true` on the very first call). Genuine token binding requires the token to be GENERATED by a separate prior call and to be SINGLE-USE and SPECIFIC to what was previewed — a static, reusable 'confirm' string or flag provides none of those properties and doesn't actually prevent skipping the preview."
   },
   {
    "id": "a4-mcp-scope-drill",
    "part": "a4-p7",
    "legacy": 28,
    "h": "MCP integration drill — scope, ${VAR} authentication and tool-discovery verification",
    "bridge": "The MCP concepts and error classes are now in place. This drill uses them on exam-style symptoms, starting with who sees a server (scope) and how secrets stay out of git.",
    "diagram": {
     "kind": "hub",
     "title": "MCP scopes: who sees the server",
     "center": {
      "t": "Same name at many scopes",
      "sub": "narrower wins: local, project, user",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "Local",
       "sub": "default",
       "items": [
        "private to you",
        "this project only"
       ]
      },
      {
       "t": "Project",
       "sub": ".mcp.json at repo root",
       "tone": "ok",
       "items": [
        "committed, whole team",
        "secrets via ${VAR}"
       ]
      },
      {
       "t": "User",
       "sub": "all your projects",
       "items": [
        "private to you"
       ]
      }
     ],
     "note": "Symptom maps to scope, env var, or connection/discovery."
    },
    "p": [
     "Three scopes decide WHO sees a server. Local scope (the default) is private to you within one project. Project scope is stored in a .mcp.json file at the repository root and committed, so the whole team gets the same tooling; Claude Code asks for approval the first time a project-scoped server is used. User scope is private to you and applies across all your projects. When the same server name exists at more than one scope, the narrower scope wins (local over project over user). Shared team tooling → project scope. A personal or experimental server → local or user scope.",
     "Authentication without committing secrets: .mcp.json supports environment-variable expansion, written as ${VAR} or ${VAR:-default}, in fields such as command, args, env, url and headers. Example committed file: {\"mcpServers\": {\"tickets\": {\"type\": \"http\", \"url\": \"https://mcp.example.com/mcp\", \"headers\": {\"Authorization\": \"Bearer ${TICKETS_TOKEN}\"}}, \"db\": {\"command\": \"npx\", \"args\": [\"-y\", \"db-mcp-server\", \"${DB_URL}\"], \"env\": {\"SSL_MODE\": \"${SSL_MODE:-require}\"}}}}. The file is identical for everyone; each engineer supplies TICKETS_TOKEN and DB_URL in their own environment. If a variable without a default is unset, the configuration fails to parse or the call is unauthenticated — the secret itself is never in version control.",
     "Verification checklist after setup: (1) is the server registered at the intended scope — claude mcp list, and claude mcp get for one server; (2) inside a session, the /mcp command shows each server's connection status and authentication state; (3) are the expected tools discovered — tools are listed from each server when it connects, and all connected servers' tools are available together, named with a server prefix such as mcp__tickets__create_ticket; (4) does an actual call succeed — discovery working proves the connection, not that credentials are valid for every operation.",
     "Drill A — a new engineer sees the server fail with 401 while teammates are fine. The server and its tool list are configured identically for everyone (project scope), so the difference is per-machine: the ${TICKETS_TOKEN} variable is unset or expired in THEIR shell. Investigate their environment, not the server code (a code bug would fail for everyone). Drill B — the server exists on your machine but teammates do not see it at all: it was added at local or user scope instead of project scope. Drill C — the server is configured but no tools appear and the status shows failed: check the launch command and its prerequisites (for example 'npx is not recognized' means Node is missing from that machine's PATH) and the /mcp authentication state; discovery never happened because the connection never succeeded. Drill D — a token pasted directly into .mcp.json: a security failure; move it to an environment variable and rotate the leaked token. Drill E — an engineer wants to trial an unvetted server: local or user scope, so it is not pushed to the team."
    ],
    "why": "Scorecard: 25%. The exam pairs one symptom with one of three causes: wrong SCOPE (visibility), missing ENV VAR (authentication), or failed CONNECTION/DISCOVERY (tools absent). Ask which of the three the symptom points to before anything else.",
    "table": {
     "headers": [
      "Symptom",
      "Most likely cause",
      "Check"
     ],
     "rows": [
      [
       "Works for me, absent for teammates",
       "Wrong scope (local or user, not project)",
       "claude mcp list, .mcp.json in repo"
      ],
      [
       "Connected but 401 for one person only",
       "Unset or expired env var in their environment",
       "Their shell variables, ${VAR} names"
      ],
      [
       "Failed status, zero tools listed",
       "Connection or launch failure",
       "/mcp status, command and PATH"
      ],
      [
       "Token visible in git history",
       "Secret hard-coded in .mcp.json",
       "Replace with ${VAR}, rotate the token"
      ],
      [
       "Want a private experiment",
       "Local or user scope",
       "Do not add to project file"
      ]
     ]
    },
    "deep": "Keep discovery and authorization separate in your head. Tools listed proves the server connected; it does not prove every tool call is authorized. A server that lists tools yet fails every call with 401 is an authentication problem, not a discovery problem."
   }
  ],
  "quiz": [
   {
    "q": "Why is a `dry_run` boolean flag a weaker safety pattern than confirmation-token binding for an irreversible action?",
    "opts": [
     "dry_run flags are slower to execute",
     "Nothing structurally prevents calling the same tool with dry_run:false on the first call — the safety property depends on the model choosing to use it correctly",
     "dry_run flags cannot be implemented in MCP",
     "Token binding requires no code changes to the tool"
    ],
    "correct": 1,
    "explain": "A dry_run flag changes what a call does but not what calls are possible — the destructive path remains a single, directly reachable call. Token binding makes that path structurally unreachable without a prior preview step."
   },
   {
    "q": "What makes confirmation-token binding a genuinely stronger pattern than a `confirm: true` boolean argument on the same call?",
    "opts": [
     "It uses a longer string for the argument",
     "The token must be generated by a separate prior call, and is single-use and specific to that exact preview — a static boolean provides none of these properties",
     "It requires the user to type a password",
     "There is no real difference between the two"
    ],
    "correct": 1,
    "explain": "A confirm:true boolean is just a renamed dry_run flag — nothing prevents setting it true on the very first call. Genuine token binding requires a prior call to generate a token tied specifically to what was previewed."
   },
   {
    "q": "Where should retry-with-backoff logic for a transient failure (rate limit, momentary timeout) live?",
    "opts": [
     "In the model, which should notice the error and re-call the tool",
     "Inside the tool itself, which has definitive knowledge of which failures are transient",
     "In a separate monitoring dashboard",
     "Retry logic should never be automated"
    ],
    "correct": 1,
    "explain": "The tool has structural knowledge of the failure type (e.g. it knows it hit a rate limit specifically), while the model only sees an error message and has to guess — so backoff/retry belongs inside the tool."
   },
   {
    "q": "A tool call fails validation (a malformed argument, a 400 error). What should happen?",
    "opts": [
     "Retry with exponential backoff several times before giving up",
     "Return the error immediately with specific, actionable detail — retrying can't fix a validation failure",
     "Silently swallow the error and return an empty result",
     "Escalate immediately to a human without returning any error detail"
    ],
    "correct": 1,
    "explain": "Non-retryable failures like validation errors won't be fixed by retrying — the tool should fail fast with a clear, specific error rather than burning calls on retries that can't succeed."
   },
   {
    "q": "A `preview_delete` tool computes what would be deleted and returns a single-use token; `execute_delete` requires that exact token and fails without a valid, matching, unused one. What property makes this pattern deterministically safe?",
    "opts": [
     "It relies on the model remembering to call preview first",
     "The execute tool is structurally incapable of running without a token that only the preview step can produce — it isn't a request the model chooses to honor, it's a missing argument the tool cannot function without",
     "It uses encryption to protect the delete operation",
     "It requires manager approval through a separate ticketing system"
    ],
    "correct": 1,
    "explain": "The safety comes from the execute tool's hard dependency on a token that can only exist after a matching preview ran — this removes the model's compliance from the safety guarantee entirely, unlike a flag the model could simply set wrong."
   },
   {
    "q": "A team needs a Jira integration and is deciding whether to build a custom MCP server or use an existing community-maintained one. What's the architect-level default, and when is building custom actually justified?",
    "opts": [
     "Always build custom for full control over the implementation",
     "Prefer the existing, actively-maintained community server for a standard integration like Jira",
     "Community servers should never be used in production for security reasons",
     "Custom builds are always faster to ship than adopting a community server"
    ],
    "correct": 1,
    "explain": "Defaulting to custom for a well-covered standard integration means the team now owns maintenance a community server would have absorbed for free — the judgment is recognizing which category the integration falls into."
   },
   {
    "q": "An agent needs to know what data sources are available before deciding what to fetch. Should this be exposed as an MCP tool the agent calls, or an MCP resource?",
    "opts": [
     "A tool, since discovering available data sources is an action",
     "A resource — a content catalog is passive, read-only reference data the agent needs to know about, not an action it decides to take",
     "Either works identically with no meaningful difference",
     "Neither MCP primitive fits this use case"
    ],
    "correct": 1,
    "explain": "This is the resources-vs-tools distinction applied to a specific recurring need — a catalog the agent should already see is a resource; an action requiring the agent's judgment mid-conversation is a tool."
   },
   {
    "q": "An architect wants to standardize how the team handles open-ended, read-only codebase research questions ('how does auth flow through this system?') in Claude Code. What's the product-specific mechanism for this, and why does it matter?",
    "opts": [
     "Have the main session do a bulk read of every relevant file directly",
     "Delegate to the built-in Explore subagent — purpose-built for fast, read-only investigation, deliberately skipping CLAUDE.md and git status at startup",
     "Use the Bash tool to grep the entire repository in one call",
     "Always spin up a general-purpose subagent instead, since it loads more context by default"
    ],
    "correct": 1,
    "explain": "Explore is the concrete, Claude-Code-specific instantiation of subagent delegation for context isolation — recognizing and routing to it by name is what a Foundations-level architect is expected to do, not just understand the abstract principle."
   },
   {
    "q": "A developer designs org-wide tool routing as literal string matching. Why is this an architecture-level anti-pattern, not just a style preference?",
    "opts": [
     "String matching is too slow at any meaningful scale",
     "Tool selection is language inference over full intent and context, not a keyword lookup",
     "This pattern is actually correct at scale",
     "String matching only fails with more than 10 tools"
    ],
    "correct": 1,
    "explain": "Investing in rich, negative-guidance-inclusive tool descriptions lets the model's own inference route correctly — an architecture that tries to replicate this with string matching in code is fighting the actual mechanism."
   },
   {
    "q": "Why should an organization standardize on the Fake Tool Paradigm + Zero Parsing pattern instead of letting teams prompt for JSON in prose?",
    "opts": [
     "Prompting for JSON is always fine as long as the model is capable enough",
     "Schema validation happens server-side before your code sees the response",
     "Fake tools are cheaper to run",
     "There's no real difference between the two approaches"
    ],
    "correct": 1,
    "explain": "Standardizing removes fragile prose-parsing as a recurring, independently-rediscovered bug across every team's extraction code, rather than fixing it pipeline by pipeline."
   },
   {
    "q": "An architect auditing exploration tooling standards finds a custom agent using Edit calls to search for text across many unread files. What's the structural problem?",
    "opts": [
     "Edit is the correct tool for this — no problem exists",
     "Edit requires a UNIQUE anchor per file, which can't be guaranteed across files not yet read",
     "Edit is slower than Grep, but otherwise equivalent",
     "This is only a problem if the codebase has more than 1,000 files"
    ],
    "correct": 1,
    "explain": "Edit's unique-anchor requirement makes it unsuitable for blind, exploratory search — Grep for content, Glob for paths, Read for content once files are identified, Edit only for targeted changes to files already understood."
   },
   {
    "q": "Practice scenario: A developer needs to find all files that call a deprecated processLegacyOrder() function and also find all test files for those callers. Which tool sequence is correct?",
    "opts": [
     "Glob for **/*processLegacyOrder* to find caller files, then Grep inside that result set for tests — Glob resolves the file list first, keeping the content search within budget",
     "Grep for processLegacyOrder to find callers (also surfacing tests that import it directly)",
     "Bash with find and xargs grep for both steps in a single shell pipeline",
     "Read all source and test files manually to search and pair them by hand"
    ],
    "correct": 1,
    "explain": "Glob only matches file PATHS by naming pattern — it cannot find files that merely CALL the function inside their contents. Content search (Grep) must come first since the actual target is callers, not files whose names happen to match; Glob then finds adjacent tests by naming convention, and a final Grep catches wrapper-based indirect coverage."
   },
   {
    "q": "What's the 4-step incremental codebase discovery pattern, and why does it beat reading every file upfront?",
    "opts": [
     "Read everything, then Grep, then Glob, then Edit — read first to have full context available",
     "Grep to find entry points, Read to follow imports/trace flows from those specific files, Grep again to trace usage of any discovered wrapper/re-export, Read only what's justified by that",
     "Glob everything first, then Read every matching file completely",
     "There is no meaningful difference between incremental and bulk reading"
    ],
    "correct": 1,
    "explain": "Starting broad with a targeted Grep and expanding only as justified avoids wasting context on files that turn out to be irrelevant to the actual investigation."
   },
   {
    "q": "An application keeps calling `cancel_subscription` when users are just ASKING about cancellation, not requesting it. What's the likely root cause and fix?",
    "opts": [
     "The model is broken and unfixable",
     "An unclear/overlapping description missing the precondition 'only after explicit confirmed intent'",
     "Switch providers entirely",
     "Nothing can be done"
    ],
    "correct": 1,
    "explain": "Tool misrouting traces back to description/precondition problems most of the time."
   },
   {
    "q": "Your code already knows this exact step must call `extract_metadata` before any enrichment tool. What's the right way to guarantee that order?",
    "opts": [
     "Add more emphatic wording to the system prompt ('prompt begging')",
     "Set tool_choice to force extract_metadata on that initial call",
     "Hope the model figures it out",
     "Use a bigger model"
    ],
    "correct": 1,
    "explain": "tool_choice enforces the order structurally; emphatic prompt wording is never a 100% guarantee."
   },
   {
    "q": "Can a built-in tool like web search automatically reach a company's private internal database?",
    "opts": [
     "Yes, automatically",
     "No — built-in tools only do what Anthropic specifically implemented",
     "Only with a hook enabled",
     "Only in Claude Code"
    ],
    "correct": 1,
    "explain": "Built-in tools are limited to what Anthropic has implemented and hosts."
   },
   {
    "q": "What are the three MCP primitives, and what does an isError response ideally include beyond the flag itself?",
    "opts": [
     "Tools/resources/prompts; a generic 'Operation failed' message is sufficient",
     "Tools/resources/prompts; an error category, retryability, what was attempted",
     "Models/agents/hooks; nothing else is needed",
     "Client/server/transport; just the isError flag"
    ],
    "correct": 1,
    "explain": "A structured error gives the calling agent enough information to actually decide how to recover, unlike a bare generic message."
   },
   {
    "q": "A `search_papers` tool has three failure patterns: a 503 during peak hours, a request for a journal with no license, and a malformed DOI failing input validation. Should all three get the same errorCategory/isRetryable combination?",
    "opts": [
     "Yes, a single generic 'failed' status is sufficient for the agent to handle all three appropriately",
     "No — the 503 is transient/retryable, the missing license is permission/non-retryable, and the malformed DOI is validation/non-retryable-as-is",
     "Yes, since all three ultimately mean the tool call didn't succeed",
     "No, but only the 503 and the license issue need different categories; the malformed DOI can share the 503's category"
    ],
    "correct": 1,
    "explain": "Each of the three needs a genuinely different agent response — blind retry wastes calls on the permission failure, giving up too early fails the transient case, and treating the validation failure like a transient one skips correcting the actual bad input."
   },
   {
    "q": "Practice scenario: A `query_postgres` MCP tool returns HTTP 500 on transient server overload and HTTP 404 on a missing table. The agent retries both identically, exhausting its retry budget on the missing table (which will never succeed) and then failing to retry once the server actually recovers from the 500. What change to the error response structure fixes this?",
    "opts": [
     "Increase the retry count for both error types so the missing-table case eventually gives up gracefully",
     "Return distinct errorCategory values — transient/isRetryable:true for the 500, and a non-retryable category (e.g. validation or business, since the table genuinely doesn't exist) for the 404",
     "Remove retries entirely for this tool",
     "Return the same errorCategory for both, but add a longer delay before retrying the 404"
    ],
    "correct": 1,
    "explain": "A missing table will never appear through retrying — that's a non-retryable condition — while a transient server overload genuinely may resolve on retry. Structurally distinct error categories let the agent apply the correct response to each, rather than treating both as generically retryable."
   },
   {
    "q": "A web-search agent has 9 tools including summarise and sentiment_analysis, but its actual job is only to fetch raw data for a separate analysis stage. In testing, it frequently calls summarise and sentiment_analysis when it shouldn't. What's the fix?",
    "opts": [
     "Write a more emphatic tool description telling it not to use those two tools",
     "Remove summarise and sentiment_analysis from this agent's allowed_tools entirely",
     "Add a confirmation step before it can call either tool",
     "Rename the tools to make them less appealing to call"
    ],
    "correct": 1,
    "explain": "Restricting an agent's actual toolset to only what its role needs is a structural fix — a prompt-level warning leaves the tools available and is only probabilistically effective at preventing their use."
   },
   {
    "q": "A synthesis agent needs simple fact-checks (dates, names, statistics) 85% of the time while combining findings, and genuinely complex verification the other 15%. Round-tripping through the coordinator to a web-search agent for every check adds significant latency. What's the best fix?",
    "opts": [
     "Give the synthesis agent full access to all web-search tools so it never needs to round-trip",
     "Give the synthesis agent one narrowly-scoped tool (e.g. verify_fact) for the simple 85% case",
     "Have the synthesis agent batch all verifications and send them together at the end",
     "Have the web-search agent speculatively cache extra context it guesses might be needed later"
    ],
    "correct": 1,
    "explain": "A single, narrowly-scoped cross-role tool for the high-frequency simple case is the deliberate, targeted exception to strict role-based tool restriction — not full access, not batching (which creates blocking dependencies), and not unreliable speculative caching."
   },
   {
    "q": "Why does giving a synthesis agent FULL web-search tool access (to avoid round-trips entirely) violate a core tool-design principle, even though it would technically solve the latency problem?",
    "opts": [
     "It doesn't violate anything, this is the best solution",
     "It violates separation of concerns and least privilege",
     "Full access is always slower than scoped access",
     "This would make the coordinator unnecessary"
    ],
    "correct": 1,
    "explain": "Over-provisioning a specialized agent with capabilities outside its actual role is a recognized anti-pattern, even when it would incidentally fix a specific latency issue."
   },
   {
    "q": "A data platform server has 22 tools: 3 query tools and 19 near-identical transformations (pivot_table, calculate_percentile, normalise_currency, etc). Splitting by role would hand a 'transformation agent' all 19 transformation tools. Why is splitting the wrong fix here, and what should happen instead?",
    "opts": [
     "Splitting is correct — just create more granular roles until each agent has fewer tools",
     "Splitting just moves the same 19-tool overload problem down one level since these are variations on ONE job, not different jobs",
     "The fix is moving the 19 transformation tools onto a second MCP server",
     "The fix is deleting 15 of the 19 transformations to reduce the count"
    ],
    "correct": 1,
    "explain": "Tools that are genuinely variations on one job (same shape: data in, operation, data out) should collapse into one parameterized tool — splitting by role only helps when the tools are doing genuinely DIFFERENT jobs."
   },
   {
    "q": "An agent selects the wrong tool from a set of only 5 options with overlapping descriptions. The IDENTICAL symptom (wrong tool chosen) appears in a different agent selecting from a set of 22 tools. Are these the same problem with the same fix?",
    "opts": [
     "Yes, always sharpen the descriptions regardless of tool count",
     "No — the same SYMPTOM can be two different diseases: with 5 tools, sharpening descriptions is the right fix",
     "No, the 22-tool case should always add a routing classifier instead",
     "Yes, but only if both agents use the same model tier"
    ],
    "correct": 1,
    "explain": "Identical symptoms can have different root causes depending on toolkit size — description quality fixes a small overlapping set, but can't rescue selection once the toolkit itself has grown too large."
   },
   {
    "q": "A team splits an overloaded 22-tool MCP server into two separate MCP servers, each with 11 tools, hoping this improves the agent's selection reliability. Does this actually help?",
    "opts": [
     "Yes, splitting across servers always halves the effective tool count the model sees",
     "No — server boundaries are invisible to the model",
     "Yes, but only if the two servers use different authentication methods",
     "No, but only because MCP servers can't be split by an administrator"
    ],
    "correct": 1,
    "explain": "The model sees one combined tool list regardless of which server each tool came from — splitting across servers doesn't reduce the actual selection complexity the model faces at all."
   },
   {
    "q": "An MCP tool `search_codebase` with the description 'Searches code' is genuinely more capable than the built-in Grep tool for a given task, but the agent keeps using Grep instead. Why, and what's the fix?",
    "opts": [
     "The MCP tool must be broken and needs debugging",
     "Built-in tools have rich, detailed descriptions baked in, giving the model far more context than a one-line MCP description can compete with — the fix is enhancing the MCP description to explain capabilities and outputs in detail",
     "This can never be fixed, built-ins always win regardless of description quality",
     "The fix is disabling Grep entirely so the MCP tool has no competition"
    ],
    "correct": 1,
    "explain": "A sparse description can't compete against a built-in's rich, detailed one for the model's attention — the fix is writing a genuinely detailed MCP description, including an explicit statement of when to prefer it over the named built-in."
   },
   {
    "q": "An organization has 40 teams building Claude applications, and tool overlap is becoming a problem. What architectural concern does this raise?",
    "opts": [
     "Nothing, more tools are always better",
     "Tool sprawl — overlapping tools across teams increase selection errors and maintenance burden at scale",
     "This isn't a real problem",
     "Only cost matters here"
    ],
    "correct": 1,
    "explain": "The 'keep the toolbox small' principle applies at organizational scale too — tool sprawl across teams is a genuine architectural governance concern."
   },
   {
    "q": "A shared MCP server needs a breaking schema change. What's the architect-level concern beyond just making the change?",
    "opts": [
     "None — just change it immediately",
     "How to version/roll out the change without breaking the other teams/applications that already depend on the server",
     "MCP servers can't be changed once built",
     "Only the original author needs to know"
    ],
    "correct": 1,
    "explain": "Governance and safe evolution of a shared dependency is a genuinely architect-level concern beyond the original build decision."
   },
   {
    "q": "Practice scenario: A platform team building a host application decides to auto-approve any MCP tool call annotated `readOnlyHint: true` with no confirmation UI, to reduce friction for users. Six months later, a connected third-party MCP server updates one of its tools — still misleadingly annotated `readOnlyHint: true` — to also log a side-effecting audit write on every call, and this goes unnoticed for weeks. What was the architectural mistake?",
    "opts": [
     "There was no mistake — annotations are official protocol metadata, they were used exactly as intended",
     "The host treated a self-reported, unverified server claim as if it were an enforced security guarantee",
     "MCP servers should never be allowed to update their own tools after initial connection",
     "The fix is to disable all MCP servers and only use client-side tools going forward"
    ],
    "correct": 1,
    "explain": "This is precisely why annotations are untrusted hints rather than a security boundary — a server (even one not acting maliciously, just updated carelessly) can misrepresent its own tool's behavior, and a host that skips real verification based on that claim has no actual protection."
   },
   {
    "q": "Why should 'prefer granular, single-purpose tools' be an organization-wide design standard rather than a fix applied after one broad tool is observed losing to a built-in?",
    "opts": [
     "It shouldn't be, per-tool fixes are always sufficient",
     "Standardizing it up front avoids every team independently rediscovering the same monolithic-tool anti-pattern in their own new tools",
     "Granular tools are always more expensive",
     "Broad tools are always preferable at scale"
    ],
    "correct": 1,
    "explain": "A known-good design standard applied from the start prevents the same failure mode from recurring independently across many teams' tool-building efforts."
   },
   {
    "q": "What are the five elements of a production-grade tool description?",
    "opts": [
     "Name, version, author, date, license",
     "What it does, what inputs it expects, example queries it handles well",
     "Cost, latency, throughput, error rate, uptime",
     "Input schema, output schema, and nothing else"
    ],
    "correct": 1,
    "explain": "All five elements work together — purpose, inputs, examples, limitations, and explicit boundaries against similar tools — to give the model everything it needs for reliable selection and correct use."
   },
   {
    "q": "Practice scenario: Production logs show an agent frequently calls get_customer when users ask about orders (e.g. 'check my order #12345'), instead of calling lookup_order. Both tools have minimal descriptions ('Retrieves customer information' / 'Retrieves order details') and accept similar identifier formats. What's the most effective FIRST step?",
    "opts": [
     "Add 5-8 few-shot examples demonstrating correct tool selection for order-related queries",
     "Expand each tool description to include input formats, example queries, edge cases",
     "Consolidate both tools into a single lookup_entity tool that internally determines which backend to query",
     "Implement a routing layer that parses input and pre-selects a tool based on detected keywords"
    ],
    "correct": 1,
    "explain": "Expanding descriptions is the low-effort, high-leverage first fix that directly addresses why the model is confused — few-shot examples add overhead without fixing the root cause, a routing classifier is over-engineered as a first step, and consolidation is a valid long-term choice but costs far more effort than fixing the descriptions."
   },
   {
    "q": "Two tools, extract_data_points and summarize_content, both used to be one broad analyze_document tool. What does splitting accomplish that renaming alone would not?",
    "opts": [
     "Splitting and renaming solve the exact same problem",
     "Splitting addresses a tool doing too MANY different jobs under one name, giving each resulting tool its own narrow scope",
     "Splitting is only useful for MCP tools, never client-side tools",
     "Renaming always requires more implementation work than splitting"
    ],
    "correct": 1,
    "explain": "Splitting and renaming are two distinct interface-level fixes for two different underlying problems — one tool doing too much, versus two tools whose names alone create confusion."
   },
   {
    "q": "In the reference matrix, tool_choice enforcement addresses which constraint for the Multi-Agent archetype?",
    "opts": [
     "Token Bloat",
     "Latency",
     "Compliance/Control",
     "Accuracy"
    ],
    "correct": 2,
    "explain": "Forcing tool_choice on a required pipeline step is a deterministic control mechanism, functioning like a hook but applied at tool selection rather than execution."
   },
   {
    "q": "A `query_snowflake` tool's description reads 'Queries Snowflake data warehouse. Accepts SQL.' The agent always correctly picks this tool, but frequently writes queries using PostgreSQL-specific syntax that Snowflake rejects. Is this a misrouting problem, and what's the fix?",
    "opts": [
     "Yes, this is misrouting — a different tool should have been called",
     "No — the CORRECT tool is always selected",
     "The fix is switching to a bigger model",
     "The fix is adding a retry loop with no description change needed"
    ],
    "correct": 1,
    "explain": "Tool selection and correct tool usage are two separate description responsibilities — a description can be specific enough to guarantee the right tool gets picked while still being incomplete about exactly how to use it correctly."
   },
   {
    "q": "A tool misrouting problem persists even after every individual tool description has been carefully rewritten to be clear and non-overlapping. What's a specific, easy-to-miss cause worth checking next?",
    "opts": [
     "The model is simply incapable of tool selection and no fix exists",
     "The SYSTEM PROMPT'S own wording — repeated emphasis on a keyword that happens to match a tool's name or description can bias selection toward that tool",
     "This means all tools must be removed and rebuilt from scratch",
     "Switching to a different model tier is the only remaining option"
    ],
    "correct": 1,
    "explain": "A misrouting audit that only reviews tool descriptions in isolation can miss a system-prompt-level keyword bias overriding otherwise well-differentiated tools — checking the system prompt is the next step when description fixes alone don't resolve it."
   },
   {
    "q": "Two tools, `analyze_content` and `analyze_document`, have nearly identical descriptions. What's the most likely consequence, and what's the fix?",
    "opts": [
     "No consequence, the model always picks correctly regardless of description overlap",
     "The model will likely confuse the two tools, misrouting calls between them",
     "This is only a problem if there are more than 10 tools total",
     "Overlapping descriptions always improve reliability by giving the model options"
    ],
    "correct": 1,
    "explain": "Near-identical descriptions give the model no reliable signal for choosing between them, directly causing tool misrouting."
   },
   {
    "q": "A tool_choice value forces a SPECIFIC named tool on a given API call. What does this guarantee that tool_choice: 'any' does not?",
    "opts": [
     "Nothing different, they behave identically",
     "'any' guarantees SOME tool is called but Claude still picks which one",
     "Specific-tool forcing is slower than 'any'",
     "'any' is a stricter constraint than a specific named tool"
    ],
    "correct": 1,
    "explain": "Forcing a specific tool eliminates any possibility of Claude choosing a different one — there's no selection happening at all."
   },
   {
    "q": "Practice scenario: A data extraction pipeline uses tool_use with tool_choice set to 'auto', with only ONE extraction tool defined. You need guaranteed structured output on every request, but some documents occasionally produce conversational text responses instead. What's the most reliable fix?",
    "opts": [
     "Add stronger prompt wording insisting the model always use the tool",
     "Set tool_choice to force the specific extraction tool by name (or use 'any', since only one tool exists)",
     "Increase max_tokens so there's more room for the tool call",
     "Switch to a larger model tier"
    ],
    "correct": 1,
    "explain": "'auto' never guarantees a tool call — it only permits one. Forcing the tool (by name, or via 'any' with a single tool defined) removes the conversational-response option entirely, which prompt wording alone cannot do."
   },
   {
    "q": "Practice scenario: A legal document extraction pipeline uses tool_use with tool_choice set to 'auto' and sometimes receives plain text analysis instead of the structured JSON extraction needed. The team suggests switching to prompt-based JSON with explicit formatting instructions instead. What's the correct response to this suggestion?",
    "opts": [
     "Agree — prompt-based JSON with clear formatting instructions is more reliable than tool_choice for this case",
     "Reject the suggestion — prompt-based JSON is LESS reliable than schema-backed tool use, not more",
     "Implement both approaches simultaneously for maximum reliability",
     "The suggestion is irrelevant since the real problem is unrelated to tool_choice"
    ],
    "correct": 1,
    "explain": "Prompt-based JSON is strictly less reliable than schema-backed tool use — switching away from tool-use to fix a tool-use configuration problem trades a fixable issue (auto vs. forced) for a fundamentally weaker approach."
   },
   {
    "q": "An organization is deciding whether a new capability should be a custom tool, a Skill, or an MCP server. It will be used by exactly one internal script and never reused. Which is correct, and why not the more 'robust'-sounding options?",
    "opts": [
     "An MCP server, to future-proof it in case it's reused later",
     "A custom tool — building an MCP server or a formal Skill for a one-off",
     "A Skill, since Skills are always the safest default",
     "This scenario requires all three simultaneously"
    ],
    "correct": 1,
    "explain": "Matching the mechanism to ACTUAL current requirements (reuse, independent maintenance) rather than hypothetical future ones avoids unnecessary complexity."
   },
   {
    "q": "A shared MCP server used by 15 teams needs a new required field added to one of its tool's input_schema. What's the safest rollout approach?",
    "opts": [
     "Push the change immediately with no notice, since it's just one field",
     "Treat it as a breaking change requiring the same governance as any shared dependency",
     "Only notify the team that requested the change",
     "Required fields cannot be added to existing schemas"
    ],
    "correct": 1,
    "explain": "Any change to a widely-depended-upon shared server's contract needs deliberate versioning and rollout, exactly like any other shared-dependency governance."
   },
   {
    "q": "An MCP resource (as opposed to an MCP tool) gives an agent access to a database schema before it starts querying. What's the specific advantage this provides over the agent discovering the schema via exploratory tool calls?",
    "opts": [
     "No advantage, resources and tools work identically",
     "The agent gets an immediate 'map' of what data exists without needing exploratory tool calls first",
     "Resources are always faster to execute than tools",
     "Resources replace the need for any tools at all"
    ],
    "correct": 1,
    "explain": "A resource provides upfront context (the map), letting the agent skip a round of exploratory discovery calls it would otherwise need."
   },
   {
    "q": "Why is 'granular MCP tools' listed specifically under the Developer Productivity archetype's Accuracy mitigation in the reference matrix, rather than under Token Bloat or Latency?",
    "opts": [
     "Placement in the matrix is arbitrary",
     "Granular tools primarily solve tool-SELECTION correctness (accuracy of picking the right tool for the task)",
     "Granular tools always reduce token usage as their primary benefit",
     "Granular tools always reduce latency as their primary benefit"
    ],
    "correct": 1,
    "explain": "The matrix maps each technique to the constraint it MOST directly addresses — granular tools mainly fix selection accuracy, not bloat or speed."
   },
   {
    "q": "An agent needs to trace calls to a function across a 150-file codebase before safely changing its signature. Why is bulk-reading all 150 files upfront the wrong approach, in concrete terms rather than just 'it's slow'?",
    "opts": [
     "It isn't wrong, bulk reading is always the safest choice",
     "At ~2,500 tokens per file, 150 files costs roughly 375,000 tokens before any reasoning happens — likely exceeding the context window, and most files will turn out irrelevant to the actual question",
     "Bulk reading is only wrong if the codebase has fewer than 10 files",
     "Reading files always costs the same fixed number of tokens regardless of file size"
    ],
    "correct": 1,
    "explain": "Context is a finite, consumable budget — spending most of it on files that turn out irrelevant leaves too little room for the actual reasoning and editing work."
   },
   {
    "q": "In the token-budget worked example, Grep first finds only 8 of 150 files actually reference the target function. What's the approximate token cost of Grep-then-Read-only-those-8, compared to bulk-reading all 150?",
    "opts": [
     "Roughly the same cost either way",
     "Roughly ~20,500 tokens vs. ~375,000 tokens — about 95% cheaper, leaving most of the context window free",
     "Grep-first is actually more expensive because it requires two separate operations",
     "There is no meaningful token cost difference between Grep and Read"
    ],
    "correct": 1,
    "explain": "A cheap, targeted search (Grep) followed by a small number of well-justified reads costs a small fraction of blindly reading everything up front."
   },
   {
    "q": "Why is 'managing context window constraints' inseparable from the Grep→Glob→Read sequence, rather than a separate topic layered on top of it?",
    "opts": [
     "It isn't related at all — token budget and search strategy are unrelated topics",
     "Each step's entire purpose is to spend the expensive operation (Read) only on files a cheap operation (Grep/Glob) has already confirmed are relevant — that IS the token-management mechanism, not an add-on to it",
     "Context constraints only matter for very large enterprise codebases",
     "Glob is what manages context; Grep and Read are unrelated to token budget"
    ],
    "correct": 1,
    "explain": "The sequence's reason for existing is deferring expensive reads until cheap searches justify them — token management is the mechanism itself, not a separate concern bolted on afterward."
   },
   {
    "q": "A Grep search for an extremely common term across a massive monorepo returns thousands of matching lines. What does this illustrate about treating 'the cheap search step' as automatically free?",
    "opts": [
     "Grep can never return too much data, so this isn't a real concern",
     "Even Grep can become its own token sink if the pattern is too broad — narrowing the pattern or scoping to relevant directories/file types is needed to keep even the search step targeted",
     "This means Glob should always be used instead of Grep",
     "This is a sign the codebase itself is poorly organized, not a search-strategy issue"
    ],
    "correct": 1,
    "explain": "The same discipline of spending tokens only where justified applies recursively — an overly broad Grep can itself consume a large amount of context, undermining the point of searching before reading."
   },
   {
    "q": "An MCP server exposes both `update_ticket` and `close_ticket`, where closing also triggers a customer notification email. Both have bare one-line descriptions. What's the risk, and the fix?",
    "opts": [
     "No risk, the tool names alone are always sufficient for correct selection",
     "An agent asked to 'mark this resolved' could reasonably pick either tool; the fix is expanding close_ticket's description to explicitly state the side effect (it sends an email), giving an explicit disambiguating fact",
     "The risk is a schema validation failure, fixed by adding an input_schema",
     "The risk is a token-budget problem, fixed by using Grep before calling either tool"
    ],
    "correct": 1,
    "explain": "Tool-selection accuracy is a distinct failure mode from schema or invocation issues — an explicit, consequential difference like a side effect needs to be stated directly in the description, not left implicit."
   },
   {
    "q": "An MCP-backed get_weather tool is called with an invalid city name. What is the well-behaved response, and what are the two failure modes it avoids?",
    "opts": [
     "Throwing an unhandled exception that crashes the session — this is actually correct behavior",
     "A tool result with isError:true and a descriptive message, avoiding both a silent empty/null result (which looks like a valid answer) and an unhandled crash (which loses all prior context)",
     "Returning {temperature: null} silently, since null is self-explanatory",
     "Retrying the same call automatically up to 3 times with no error signal"
    ],
    "correct": 1,
    "explain": "isError:true plus a descriptive message gives Claude a structured signal to recover from, unlike a silent null result (looks valid but isn't) or a session-ending crash."
   },
   {
    "q": "A newly onboarded engineer's Claude Code session shows an MCP server as connected and successfully listing its tools, but every tool CALL from it fails with a generic 401. What does this pattern indicate, and what should be checked?",
    "opts": [
     "The tool's underlying code is broken and needs a bug fix",
     "Discovery/connection succeeded (proving the server and tool-listing work), so the fault is most likely a missing or expired credential/token specific to this engineer's own environment",
     "The MCP server itself is down entirely",
     "This is expected default behavior for all new engineers and requires no action"
    ],
    "correct": 1,
    "explain": "Since the server initializes and lists tools successfully, the failure is scoped to per-call auth, not the server or tool code — a code bug would typically fail identically for every user, not just the new one."
   },
   {
    "q": "Why does it matter whether an MCP failure is classified as an execution-time error (isError-flagged) versus a connection/discovery/auth-time error, rather than just treating every MCP failure the same way?",
    "opts": [
     "It doesn't matter, all MCP failures should be debugged identically",
     "Each category points to a different place to look for the fix — an execution error suggests a bad input or tool logic, while an auth/discovery error suggests a credential or scoping problem, and conflating them wastes time debugging the wrong layer",
     "Only execution-time errors are worth investigating at all",
     "Connection/discovery errors are always caused by network outages, never configuration"
    ],
    "correct": 1,
    "explain": "Correctly categorizing the failure determines the investigation path — treating a missing credential as a code bug (or vice versa) sends the debugging effort in the wrong direction entirely."
   },
   {
    "q": "Shared team MCP tooling should be configured at which scope?",
    "opts": [
     "User scope",
     "Local scope",
     "Project scope via .mcp.json committed to the repository",
     "No scope is needed"
    ],
    "correct": 2,
    "explain": "Project scope is stored in a committed .mcp.json so everyone gets the same servers."
   },
   {
    "q": "How should a committed .mcp.json supply an API token?",
    "opts": [
     "Paste the token into the file",
     "Reference an environment variable such as ${TICKETS_TOKEN}",
     "Put it in CLAUDE.md",
     "Ask Claude to remember it"
    ],
    "correct": 1,
    "explain": "Environment-variable expansion keeps secrets out of version control while the file stays identical for all engineers."
   },
   {
    "q": "A new engineer gets 401 from a project-scoped MCP server while teammates are fine. What is the most likely cause?",
    "opts": [
     "A bug in the server's tool code",
     "The token environment variable is unset or expired in their environment",
     "The server is at the wrong scope",
     "The tools were never discovered"
    ],
    "correct": 1,
    "explain": "A code bug would fail for everyone. Identical config with a per-person failure points at per-machine environment."
   },
   {
    "q": "A server works on your machine but teammates cannot see it at all. Most likely cause?",
    "opts": [
     "Expired token",
     "It was added at local or user scope rather than project scope",
     "The server lists too many tools",
     "Project scope hides servers"
    ],
    "correct": 1,
    "explain": "Visibility is determined by scope; only project scope is shared through the repository."
   },
   {
    "q": "A server shows failed status and no tools appear. What should you investigate?",
    "opts": [
     "The wording of tool descriptions",
     "The launch command, its prerequisites such as PATH, and authentication state",
     "The coordinator prompt",
     "The model tier"
    ],
    "correct": 1,
    "explain": "No tools means discovery never happened because the connection did not succeed; check how the server starts and authenticates."
   },
   {
    "q": "A `remove_team_member` tool takes a `dry_run: boolean` parameter, intended to force a preview before any real removal. Production logs show the agent sometimes calls it with `dry_run: false` directly, skipping the preview. Why is adding a stronger prompt instruction not a reliable fix?",
    "opts": [
     "Prompt instructions are completely ignored by the model in all cases",
     "A prompt instruction is still probabilistic compliance — nothing structurally prevents the agent from calling with dry_run:false directly, regardless of how the instruction is worded",
     "dry_run parameters are deprecated and should never be used",
     "The fix should instead be raising the model's temperature setting"
    ],
    "correct": 1,
    "explain": "This is the same prompts-vs-deterministic-enforcement gap seen with CLAUDE.md/hooks and tool_choice/sequencing — a flag plus an instruction can still be bypassed, since nothing about the tool's design makes the unsafe call impossible."
   },
   {
    "q": "What is the architecturally sound fix for guaranteeing a preview always precedes an irreversible action, replacing a bare `dry_run` flag?",
    "opts": [
     "Add a second confirmation prompt asking the user 'are you sure?' before every call",
     "Split into two tools bound by a single-use token — a preview tool that returns a confirmation token, and an execute tool that requires that token as a parameter, making execution without a prior preview structurally impossible",
     "Increase the tool's timeout so the agent has more time to reconsider",
     "Rename the dry_run parameter to something more explicit like confirm_deletion"
    ],
    "correct": 1,
    "explain": "Token binding makes the unsafe call impossible to construct at all — the execute tool literally cannot be called successfully without a token that only the preview tool can produce, unlike a flag or a differently-named parameter which can still be bypassed."
   },
   {
    "q": "A `search_catalog` tool fails 12% of the time: 8% are transient network timeouts that succeed on retry, 4% are query-syntax errors that never succeed regardless of retries. Where should retry logic for the transient failures live, and why?",
    "opts": [
     "Inside the tool itself, since it has definitive, immediate knowledge that a given failure was a timeout and can retry with backoff automatically",
     "At the agent/prompt level, via an instruction telling the model to retry failed calls",
     "Retry logic should not exist anywhere in this system",
     "Uniformly applied to both failure types at the same layer, since distinguishing them adds unnecessary complexity"
    ],
    "correct": 0,
    "explain": "The tool has the most direct, immediate knowledge of whether a specific failure was transient — putting automatic retry-with-backoff there avoids wasting a full agent turn on a failure the tool itself can resolve."
   },
   {
    "q": "Why is retrying the 4% query-syntax failures identically to the 8% transient failures a mistake?",
    "opts": [
     "It isn't a mistake — uniform retry logic is always correct regardless of failure type",
     "Syntax errors will never succeed no matter how many times they're retried — retrying them wastes calls on a failure that requires a different query, not another attempt at the same one",
     "Syntax errors should never be retried under any circumstances, even with a corrected query",
     "Syntax errors are actually more likely to succeed on retry than transient errors"
    ],
    "correct": 1,
    "explain": "A non-retryable failure needs a different input, not repetition — returning it immediately with validation detail lets the caller fix and re-call deliberately instead of burning attempts that can't possibly succeed."
   }
  ],
  "parts": [
   {
    "id": "a4-p1",
    "title": "What a tool is and how descriptions steer Claude",
    "intro": "Before fixing or designing anything, you need the mechanism: Claude chooses tools by reading their descriptions and the prompt around them. This part comes first because every later fix builds on it."
   },
   {
    "id": "a4-p2",
    "title": "Fixing overlap: disambiguate, split, rename, consolidate",
    "intro": "Once descriptions are understood as the selection mechanism, the question is what to do when selection still goes wrong. This part gives you the cheap interface-level fixes in order of effort, and how a toolkit's size changes the remedy."
   },
   {
    "id": "a4-p3",
    "title": "Controlling selection and distributing tools to agents",
    "intro": "Better descriptions make the right choice likely, but some requirements need a guarantee. This part moves from persuading the model to constraining it: forcing tool_choice, structured output, and giving each agent only its role's tools."
   },
   {
    "id": "a4-p4",
    "title": "Built-in tools and the token budget",
    "intro": "With custom tool design covered, we turn to the built-in tools you rely on in Claude Code. The rules for Edit, Grep, Glob and Read all follow from one constraint, a finite context window."
   },
   {
    "id": "a4-p5",
    "title": "MCP primitives, errors, and discovery",
    "intro": "Custom tools serve one application; MCP shares capabilities across many. This part covers what a server exposes, how failures should be reported, and how to tell execution errors from connection and auth errors."
   },
   {
    "id": "a4-p6",
    "title": "MCP at organization scale, and safety patterns",
    "intro": "With the protocol mechanics in hand, the architect questions are build vs reuse, ownership and governance, and keeping risky actions structurally safe. This part ends with the tool-level guarantees that do not depend on the model behaving."
   },
   {
    "id": "a4-p7",
    "title": "Drill: MCP scope, authentication and discovery",
    "intro": "The final part puts the MCP concepts to work on exam-style symptoms. Each drill pairs one symptom with one of three causes: scope, environment variable, or connection."
   }
  ],
  "roadmap": {
   "kind": "roadmap",
   "title": "Tool Design & MCP Integration: the path",
   "parts": [
    {
     "t": "What a tool is",
     "items": [
      "Description = selection",
      "Five elements",
      "Syntax and prompt keywords"
     ]
    },
    {
     "t": "Fixing overlap",
     "items": [
      "Disambiguate",
      "Split or rename",
      "Consolidate",
      "Built-in vs custom"
     ]
    },
    {
     "t": "Control and distribution",
     "items": [
      "tool_choice",
      "Fake tool, zero parsing",
      "Role-scoped tools"
     ]
    },
    {
     "t": "Built-in tools and tokens",
     "items": [
      "Edit unique anchor",
      "Grep, Glob, Read",
      "Token budget",
      "Explore"
     ]
    },
    {
     "t": "MCP basics",
     "items": [
      "Three primitives",
      "isError taxonomy",
      "Auth vs discovery",
      "Resources"
     ]
    },
    {
     "t": "Org scale and safety",
     "items": [
      "Community vs custom",
      "Governance",
      "Preview + token"
     ]
    },
    {
     "t": "Drill",
     "items": [
      "Scope",
      "${VAR} auth",
      "Discovery"
     ]
    }
   ]
  }
 },
 {
  "id": "a5",
  "title": "Context Management & Reliability",
  "weight": "15%",
  "emoji": "🧩",
  "intro": "Full mechanics of context drift/bloat and error handling — why long sessions degrade, how to keep them reliable, and the categories of failure — then the system-level policy layer that makes these reliable across an entire application.",
  "archHighlights": {
   "1": [
    "Context drift, case facts, session state"
   ],
   "7": [
    "Error propagation, local recovery"
   ],
   "8": [
    "Confidence calibration, provenance, synthesis"
   ]
  },
  "sections": [
   {
    "id": "stateless-api-history",
    "part": "a5-p1",
    "legacy": 16,
    "h": "Stateless API drill — why history must ride along on every request, and what 'memory' actually means",
    "bridge": "This is the starting point for the whole domain: before asking why context drifts, ask what the model carries between calls. The answer is nothing, so what does each request actually contain?",
    "diagram": {
     "kind": "layers",
     "title": "Turn 3 request: everything the model sees",
     "arrows": false,
     "layers": [
      {
       "t": "system prompt",
       "sub": "stable instructions",
       "tone": "hi",
       "tag": "cacheable prefix"
      },
      {
       "t": "user turn 1 + assistant turn 1"
      },
      {
       "t": "user turn 2 + assistant turn 2"
      },
      {
       "t": "user turn 3",
       "sub": "the new message",
       "tone": "warn"
      },
      {
       "t": "Your app appends and resends every turn",
       "sub": "no server-side session exists",
       "tone": "mute"
      }
     ]
    },
    "p": [
     "The Messages API is stateless: the model retains nothing between calls. Every request must carry the full conversation the model should 'remember' in its messages array — earlier user turns, earlier assistant turns, tool_use and tool_result blocks — because the request is all the model sees. The array is maintained by YOUR application (append each assistant reply and each new user message, then resend).",
     "Drill 1 — a developer sends only the latest user message on each call; the assistant 'forgets' the order number from turn 2. Cause: the earlier turns were never included. Fix: resend the accumulated history (managed by the client), not a bigger model or a longer system prompt. Drill 2 — turn 3's request contains the system prompt, user turn 1, assistant turn 1, user turn 2, assistant turn 2, user turn 3; removing assistant turn 1 makes the model behave as if it never said it. Drill 3 — cost and limits: because history is resent, input tokens grow each turn; the mitigations are prompt caching for the stable prefix, compaction or summarization of resolved threads, and a persistent case-facts block for exact values. Drill 4 — Claude Code is different in user experience only: it keeps the transcript on disk and --resume reloads it into the next request; under the hood the model still receives the history as input each time. Drill 5 — 'remember what we discussed three months ago' is not solvable by history alone (it would exceed the context window); use a structured memory store or retrieval that injects only the relevant facts into the next request."
    ],
    "why": "Scorecard: 50%. Two ideas to lock in: (1) statelessness → the client resends history every call; (2) 'state' is an application-layer construct built on top, whether a messages array, a summary, a case-facts block or a retrieval store.",
    "table": {
     "headers": [
      "Situation",
      "Mechanism"
     ],
     "rows": [
      [
       "Model forgets an earlier turn",
       "Include prior turns in the messages array each request"
      ],
      [
       "Conversation too long for the window",
       "Compact or summarize resolved threads, keep exact facts in a case-facts block"
      ],
      [
       "Stable instructions resent every turn",
       "Prompt caching on the stable prefix"
      ],
      [
       "Continue yesterday's Claude Code work",
       "--resume reloads the stored transcript into a new request"
      ],
      [
       "Recall from months ago",
       "Structured memory or retrieval, inject only relevant facts"
      ]
     ]
    },
    "deep": "A tempting wrong answer says the API 'keeps a session' server-side and only a session id is needed. For the Messages API there is no such session; any continuity you observe is the client replaying history."
   },
   {
    "id": "context-drift-core-fixes",
    "part": "a5-p1",
    "legacy": 0,
    "h": "Why context drift happens, and the core fixes",
    "bridge": "Because the whole history is resent on every call, it only ever grows. This section asks what that growth does to quality, and how pruning and compaction keep it in check.",
    "diagram": {
     "kind": "hub",
     "title": "Three ways to shrink a growing history",
     "center": {
      "t": "Long conversation",
      "sub": "hours of messages and tool results",
      "tone": "warn"
     },
     "spokes": [
      {
       "t": "Prune",
       "sub": "drop no-longer-needed details",
       "tone": "mute"
      },
      {
       "t": "Compact",
       "sub": "long stretch becomes a short summary"
      },
      {
       "t": "Selective compaction",
       "tone": "ok",
       "items": [
        "Resolved topics: narrative summary",
        "Active issue: verbatim history"
       ]
      }
     ],
     "note": "Also: put key findings at the start or end, not buried in the middle."
    },
    "p": [
     "In a conversation that's gone on for hours — dozens of messages, old tool results, resolved side-conversations — all of it keeps piling up in what Claude has to read every time. Without cleanup, there's less room for new information, and important early instructions can get 'drowned out.' Pruning removes old, no-longer-needed details; compaction squashes a long stretch into a short summary.",
     "A more selective pattern than uniform compaction: turn earlier RESOLVED topics into a narrative summary, but keep the full VERBATIM message history for whichever issue is still ACTIVE — a settled topic doesn't need every message preserved, but an issue still being worked on right now does, since losing precision there risks breaking the current task."
    ],
    "why": "The 'lost-in-the-middle' effect compounds this: models reliably process the start and end of a long input but can miss details in the middle — mitigated by placing key findings near the beginning or end of aggregated content, not buried in the middle."
   },
   {
    "id": "instruction-drift-event-injection",
    "part": "a5-p1",
    "legacy": 15,
    "h": "System-prompt instruction drift over long conversations, and injecting real-time events mid-conversation",
    "bridge": "Compaction answers a full window, but a model can also behave worse with plenty of room left. This section asks how to tell exhaustion from instruction drift, and how to inject live events safely.",
    "diagram": {
     "kind": "grid",
     "title": "Diagnose before you fix",
     "corner": "Situation",
     "cols": [
      "Cause",
      "Fix"
     ],
     "rows": [
      {
       "h": "Rule slowly stops being followed",
       "cells": [
        {
         "t": "Instruction drift",
         "tone": "warn"
        },
        {
         "t": "Reminders or few-shot",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Sharp failure, truncated context",
       "cells": [
        {
         "t": "Window exhausted",
         "tone": "bad"
        },
        {
         "t": "Compact or summarize",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Live update arrives mid-chat",
       "cells": [
        {
         "t": "Placement question",
         "tone": "mute"
        },
        {
         "t": "Prefix next user message",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Edit system field or fake user turn",
       "cells": [
        {
         "t": "Breaks cache or attribution",
         "tone": "bad"
        },
        {
         "t": "Do not do this",
         "tone": "bad"
        }
       ]
      }
     ]
    },
    "p": [
     "Instruction drift is a DIFFERENT failure mode from context-window exhaustion, and conflating the two leads to the wrong fix. Context exhaustion is running out of room — the fix is compaction or summarization. Instruction drift is the system prompt's INFLUENCE weakening over a long conversation even while there's still plenty of room left in the window — as the conversation accumulates many turns of assistant output, the ratio of that accumulated output to the fixed-size system instruction keeps growing, and a rule stated once at the very start of a long session can quietly lose its grip on the model's behavior turn after turn, without any single turn obviously violating it.",
     "Worked failure: a system prompt says 'always cite a source for factual claims,' followed by 80 turns of back-and-forth. By turn 60, citations quietly start disappearing from some responses — not because the rule was removed, but because it's now a small fraction of everything the model is currently attending to, competing against 80 turns of accumulated conversational momentum that never mentions citations at all. The WRONG fix here is `/compact` or summarization — those tools address context exhaustion (too much content, not enough room), and can even make drift WORSE if the compaction step drops the very reminders or few-shot examples that were counteracting it. The right fixes are periodic reminder injection (re-stating the rule at intervals, or right before the turns most likely to need it) or replacing an abstract rule with concrete few-shot demonstrations, which tend to hold their influence more durably than a single abstract statement made once.",
     "Real-time event injection is a related but distinct problem: correctly getting a live update (a price change, a new alert, a status change) INTO an ongoing conversation. The correct pattern is prefixing the update to the next `user` message — folding it in as part of what the user-side of the conversation is handing back to the model on that turn. Two tempting but wrong patterns: rewriting the top-level `system` field mid-conversation (this busts prompt caching, since the cached prefix no longer matches, and is not what the system field is for), and injecting a synthetic `user`-role message purely to carry the event (this breaks turn attribution — it makes it look like the actual human user said something they didn't, corrupting the conversation's own record of who said what)."
    ],
    "why": "Exam framing: given a described symptom over a long conversation ('the model used to always do X, now it inconsistently doesn't'), distinguish whether the cause is context exhaustion (fixed by compaction) or instruction drift (fixed by reminder injection or few-shot examples, NOT compaction) — and separately, given a need to inject a live event mid-conversation, identify the one correct placement versus the two structurally wrong ones.",
    "table": {
     "headers": [
      "Symptom",
      "Likely cause",
      "Fix"
     ],
     "rows": [
      [
       "Model behavior degrades gradually; a rule from early in a long conversation quietly stops being followed",
       "Instruction drift — system prompt's relative influence has shrunk against accumulated output",
       "Periodic reminder injection, or replace the abstract rule with few-shot demonstrations"
      ],
      [
       "Model behavior degrades sharply; errors about missing/truncated context, or an explicit context-limit signal",
       "Context-window exhaustion — literally out of room",
       "Compaction or summarization"
      ],
      [
       "A live update needs to enter an ongoing conversation",
       "N/A — this is a placement question, not a diagnosis",
       "Prefix the update onto the next user message"
      ],
      [
       "Rewriting the top-level system field to inject an update mid-conversation",
       "Busts prompt caching; the field isn't meant for live event injection",
       "Use the next user message instead"
      ],
      [
       "Injecting a synthetic user-role message just to carry an event",
       "Breaks turn attribution — misrepresents who said what",
       "Prefix onto the next real user message instead of fabricating one"
      ]
     ]
    },
    "deep": "The trap that connects both halves of this topic: reaching for `/compact` or summarization as a general-purpose 'the model is behaving worse than before' fix. Summarization can actively worsen instruction drift specifically because a summarization pass may compress away the very reminder text or few-shot examples that were holding a rule's influence steady — treating every degradation as a context-size problem risks removing the one thing counteracting a completely different failure mode."
   },
   {
    "id": "working-memory-mechanisms",
    "part": "a5-p2",
    "legacy": 6,
    "h": "Working-memory patterns as system reliability infrastructure",
    "bridge": "Now that you can tell drift from exhaustion, the next question is what to do about it structurally. This section compares four working-memory mechanisms and which one protects what.",
    "diagram": {
     "kind": "grid",
     "title": "Pick the mechanism for what you protect",
     "corner": "Mechanism",
     "cols": [
      "Protects",
      "Right for"
     ],
     "rows": [
      {
       "h": "Scratchpad file",
       "cells": [
        {
         "t": "Free-form findings",
         "tone": "hi"
        },
        {
         "t": "Open-ended exploration"
        }
       ]
      },
      {
       "h": "Case-facts block",
       "cells": [
        {
         "t": "Exact IDs, amounts, dates",
         "tone": "hi"
        },
        {
         "t": "Support sessions"
        }
       ]
      },
      {
       "h": "Selective compaction",
       "cells": [
        {
         "t": "Session length",
         "tone": "hi"
        },
        {
         "t": "Multi-topic, some resolved"
        }
       ]
      },
      {
       "h": "State manifest",
       "cells": [
        {
         "t": "Progress for crash recovery",
         "tone": "hi"
        },
        {
         "t": "Must survive a restart"
        }
       ]
      }
     ]
    },
    "p": [
     "Developer covers three distinct working-memory techniques as individual patterns: the scratchpad file (an agent's actively-maintained working notes during long exploration), the persistent case-facts block (a fixed-schema record of key business facts, immune to summarization drift), and selective compaction (narrative summary for resolved threads, verbatim for the active one). At the Architect level, these aren't three separate tricks to apply ad hoc — they're three PURPOSE-BUILT reliability mechanisms an organization should provide as standard infrastructure for any long-running agent session, chosen based on what's actually being protected."
    ],
    "table": {
     "headers": [
      "Mechanism",
      "What it protects",
      "When it's the right tool"
     ],
     "rows": [
      [
       "Scratchpad file",
       "Free-form findings and decisions during active exploration",
       "Open-ended investigation work (codebase exploration, research)"
      ],
      [
       "Persistent case-facts block",
       "Exact, structured business facts (IDs, amounts, dates)",
       "Transactional/support sessions with fixed key data points"
      ],
      [
       "Selective compaction",
       "Overall session length across multiple resolved + one active topic",
       "Long multi-topic sessions where some threads are genuinely done"
      ],
      [
       "Structured state manifest",
       "What's been explored, key findings, current phase, and open questions — for crash recovery",
       "Long-running exploration that must survive a crash or restart"
      ]
     ]
    },
    "why": "Recognizing WHICH working-memory mechanism fits a given scenario is the architect-level skill — a codebase-exploration agent needs a scratchpad (unstructured findings), not a case-facts block (which assumes a fixed business schema); a support session needs a case-facts block, not a scratchpad. Offering all three as standard, well-understood infrastructure prevents each team from ad hoc reinventing (or worse, omitting) the right protection for their specific session's failure mode.",
    "deep": "A fourth, specifically crash-recovery-oriented mechanism worth distinguishing from a plain scratchpad: a MANIFEST — a structured export (JSON or similar) of exactly what's been explored so far (files read, searches run), the key findings to date, the current phase, and any open questions — written to a known location as the session progresses. On resume after a crash or restart, the coordinator loads that manifest first and injects its contents into the resuming agent's prompt, picking up cleanly rather than either re-exploring everything from scratch or blindly trusting a stale, un-audited conversation history."
   },
   {
    "id": "scratchpad-subagent-isolation",
    "part": "a5-p2",
    "legacy": 14,
    "h": "Sustaining coherent exploration across sessions that exceed context limits — a worked scratchpad + subagent-isolation scenario",
    "bridge": "Those mechanisms are easier to judge in action, so here they are used together. The question is how a task bigger than any single session, such as auditing 400 endpoints, still gets finished coherently.",
    "diagram": {
     "kind": "flow",
     "title": "Audit of 400 endpoints across sessions",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Session 1: ~60 endpoints",
       "sub": "deep dives go to subagents",
       "tone": "hi"
      },
      {
       "t": "Append compact findings",
       "sub": "audit_progress.md",
       "tone": "warn"
      },
      {
       "t": "Session 2 starts fresh",
       "sub": "reads only the summary"
      },
      {
       "t": "Continue at endpoint 61",
       "sub": "clean context",
       "tone": "ok"
      }
     ],
     "loops": [
      {
       "from": 3,
       "to": 1,
       "label": "repeat per batch"
      }
     ]
    },
    "p": [
     "A single agent session has a hard context ceiling, and a genuinely large task (auditing every API endpoint in a 400-file service for a security review, say) can exceed it well before the work is done. Two complementary mechanisms make it possible to sustain coherent progress across MULTIPLE sessions or subagent calls anyway: a persistent SCRATCHPAD FILE that survives even though any one session's context does not, and SUBAGENT ISOLATION that keeps a subagent's verbose exploration output from ever entering (and consuming) the main session's context in the first place.",
     "Worked example, concretely: a security audit needs to check 400 endpoints, and roughly 60 endpoints' worth of exploration fits comfortably in one session's context before it starts crowding out useful reasoning. The wrong approach is one long session trying to push through all 400 — context degrades well before the end, with earlier findings pushed out of the effective attention window (the 'lost in the middle' effect) even before the hard ceiling is hit. The correct approach: after each batch of roughly 60 endpoints, the session APPENDS its findings to a persistent scratchpad file on disk (`audit_progress.md` — endpoint, finding, severity, status) and then ends; the NEXT session starts fresh, reads only the scratchpad summary (a few hundred tokens) rather than replaying the full prior session's exploration, and continues from endpoint 61 with a clean, uncluttered context.",
     "Layering subagent isolation on top: within any one session, if checking a single complex endpoint requires reading through several hundred lines of middleware, auth logic, and related tests just to determine one endpoint's status, doing that reading directly in the main session burns through a large chunk of that session's own budget on OUTPUT that's only a means to an end. Delegating that one endpoint's investigation to a subagent — which does the verbose reading and returns only a compact verdict ('endpoint X: missing rate limiting, severity medium') — keeps the exploration's raw token cost isolated inside the subagent, while the main session's scratchpad only ever accumulates the compact verdicts, not the investigation trail that produced them."
    ],
    "why": "This combines the two context-management levers precisely because they solve DIFFERENT halves of the same limits problem: the scratchpad solves the ACROSS-SESSIONS problem (carrying forward a growing task's state when no single session's context can hold the whole task), while subagent isolation solves the WITHIN-A-SESSION problem (keeping one investigation's verbose reasoning from consuming the budget of the broader task it's part of). A large task that exceeds context limits typically needs both together, not just one.",
    "table": {
     "headers": [
      "Mechanism",
      "Problem it solves",
      "What crosses the boundary"
     ],
     "rows": [
      [
       "Scratchpad file (e.g. audit_progress.md)",
       "Task is too large for any single session's context",
       "Compact structured findings only — read fresh at the start of the next session"
      ],
      [
       "Subagent isolation for one endpoint's deep-dive",
       "One investigation's own exploration would consume too much of the CURRENT session's budget",
       "Only the subagent's final compact verdict returns to the main session — not its full reading/reasoning trail"
      ],
      [
       "Both together (the audit scenario)",
       "400 endpoints, no single session or investigation fits within budget alone",
       "Scratchpad carries progress across sessions; each session uses subagents to keep individual deep-dives cheap"
      ]
     ]
    },
    "deep": "The trap to avoid: treating a growing scratchpad as a substitute for compaction discipline. If the scratchpad itself is allowed to grow without bound (appending full investigation transcripts rather than compact structured findings), it eventually becomes its own context problem the moment a future session has to read the whole thing back in — the scratchpad needs the same 'compact structured summary, not verbose transcript' discipline applied to it that a case-facts block or a structured state manifest needs, precisely because it will itself be read back into a future context window."
   },
   {
    "id": "fork-resume-provenance",
    "part": "a5-p2",
    "legacy": 12,
    "h": "Five named fork/resume anti-patterns, and the provenance exam-critical rule",
    "bridge": "The scratchpad carries state across sessions; this section covers resuming and forking those sessions safely. What goes wrong when you resume stale work, and what must stay intact when agents hand work to each other?",
    "diagram": {
     "kind": "grid",
     "title": "Five anti-patterns and their fixes",
     "corner": "Not that",
     "cols": [
      "Do this"
     ],
     "rows": [
      {
       "h": "Prose summaries between agents",
       "cells": [
        {
         "t": "Pass Finding Objects",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Subagent silently resolves a conflict",
       "cells": [
        {
         "t": "Annotate both, escalate",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "fork_session for file updates",
       "cells": [
        {
         "t": "Fork only for parallel exploration",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Resume on a heavily changed codebase",
       "cells": [
        {
         "t": "Start fresh, findings as hypotheses",
         "tone": "ok"
        }
       ]
      },
      {
       "h": "Resume without saying what changed",
       "cells": [
        {
         "t": "Declare the new reality in the prompt",
         "tone": "ok"
        }
       ]
      }
     ]
    },
    "table": {
     "headers": [
      "NOT THAT",
      "DO THIS"
     ],
     "rows": [
      [
       "Passing prose summaries between agents",
       "Pass structured context via Finding Objects"
      ],
      [
       "Letting a subagent silently resolve a source conflict",
       "Annotate both values, mark 'unresolved,' escalate to the Coordinator"
      ],
      [
       "Using fork_session for targeted file updates over time",
       "fork_session is for parallel exploration of a shared baseline ONLY"
      ],
      [
       "Resuming against a heavily changed codebase",
       "Start fresh, inject prior findings as hypotheses to re-validate"
      ],
      [
       "Resuming without informing the agent of what changed",
       "Explicitly declare the updated reality in the resume prompt"
      ]
     ]
    },
    "why": "Exam-critical rule layered on top: every synthesis step in a pipeline MUST output its claims[] and sources[] arrays intact — if a synthesis agent consumes structured data but outputs prose, the provenance chain is broken, even if every upstream step preserved attribution perfectly. An architect should treat this as a checkable invariant across the whole pipeline, not just the intermediate steps."
   },
   {
    "id": "context-reliability-discipline",
    "part": "a5-p2",
    "legacy": 3,
    "h": "Context management as a reliability engineering discipline",
    "bridge": "Everything so far fixes context problems one session at a time. This section asks what the architect does differently: turn those fixes into a designed, monitored property of the whole system.",
    "diagram": {
     "kind": "flow",
     "title": "Proactive, not reactive",
     "dir": "v",
     "steps": [
      {
       "t": "Automated compaction policies",
       "sub": "defined up front, not ad hoc",
       "tone": "hi"
      },
      {
       "t": "Context budgets enforced app-wide",
       "sub": "limits applied, not just noticed"
      },
      {
       "t": "Monitor for quality degradation",
       "sub": "catch it before users complain",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "Architect asks you to design the SYSTEM-LEVEL strategy: automated compaction policies, context budgets enforced across an entire application (not just noticed after the fact), and monitoring for context-related quality degradation before users complain."
    ],
    "why": "This is proactive system design rather than reactive fixing — the same underlying problem (context drift) but addressed as an engineered, monitored system property instead of something you notice and patch after a bad session."
   },
   {
    "id": "error-categories-anti-patterns",
    "part": "a5-p3",
    "legacy": 1,
    "h": "The four error categories, and four anti-patterns to recognize",
    "bridge": "With context managed, the next thing that breaks long-running agents is tool and subagent failure. This section asks how to respond, starting with the four kinds of error and the handling mistakes to avoid.",
    "diagram": {
     "kind": "decision",
     "title": "Pick the response by error category",
     "q": {
      "t": "What kind of failure is it?"
     },
     "branches": [
      {
       "label": "transient",
       "t": "Retry with exponential backoff",
       "sub": "timeout, 503, network",
       "tone": "ok"
      },
      {
       "label": "validation",
       "t": "Fix the input, resubmit",
       "tone": "warn"
      },
      {
       "label": "business",
       "t": "Explain, propose alternative",
       "sub": "policy or threshold",
       "tone": "hi"
      },
      {
       "label": "permission",
       "t": "Do not retry; escalate",
       "tone": "bad"
      }
     ],
     "note": "Anti-patterns: generic status, silent suppression, abort-all, infinite retries."
    },
    "p": [
     "Not every failure should be handled the same way. Transient errors (timeout, 503, network failure) ARE retryable — retry with exponential backoff. Validation errors (invalid format, missing field) are NOT retryable as-is — correct the input and resubmit. Business errors (policy violation, threshold exceeded) are NOT retryable — explain to the user and propose an alternative. Permission errors (access denied) are NOT retryable — escalate."
    ],
    "table": {
     "headers": [
      "Anti-pattern",
      "Problem",
      "Correct approach"
     ],
     "rows": [
      [
       "Generic status ('search unavailable')",
       "Coordinator has no information to decide how to recover",
       "Return error type, what was attempted, partial results, alternatives"
      ],
      [
       "Silent suppression (empty result = success)",
       "Can't tell 'no results' from 'search failure' — very different situations",
       "Explicitly distinguish the two outcomes"
      ],
      [
       "Aborting the whole workflow on one failure",
       "All partial results from other successful subagents are discarded too",
       "Continue with partial results, clearly annotate what's missing"
      ],
      [
       "Infinite retries inside a subagent",
       "Wastes latency/resources with no natural end",
       "Attempt local recovery 1-2 times, then propagate the failure up"
      ]
     ]
    },
    "why": "Retrying a validation, business, or permission error identically just fails again the same way — wasting time and calls. All four anti-patterns undermine the coordinator's ability to make a good decision: generic status and silent suppression destroy information it needs; aborting-everything and retrying-forever overreact in opposite, equally unhelpful directions."
   },
   {
    "id": "empty-result-vs-timeout",
    "part": "a5-p3",
    "legacy": 8,
    "h": "Deep dive: a successful empty result and a transient failure need DIFFERENT retry handling",
    "bridge": "The taxonomy says only transient errors deserve retries. This section tests that with two failures that look alike: a search that returned nothing, and a connection that timed out.",
    "diagram": {
     "kind": "seq",
     "title": "Same symptom, different handling",
     "actors": [
      {
       "t": "Coordinator",
       "tone": "hi"
      },
      {
       "t": "Journal DB subagent"
      },
      {
       "t": "Stats API subagent"
      }
     ],
     "rows": [
      {
       "f": 1,
       "t": 0,
       "text": "Success, zero matches"
      },
      {
       "f": 0,
       "t": 1,
       "text": "Try a different query or accept it",
       "tone": "ok"
      },
      {
       "note": "Retrying the identical query returns zero again.",
       "over": [
        1
       ]
      },
      {
       "f": 2,
       "t": 0,
       "text": "Connection timeout",
       "tone": "bad"
      },
      {
       "f": 0,
       "t": 2,
       "text": "Retry: the condition may clear",
       "tone": "ok"
      },
      {
       "note": "Ask why the result was unhelpful, not just that it was.",
       "over": [
        0
       ]
      }
     ]
    },
    "p": [
     "A specific, recognizable mistake: a research subagent queries an academic journal database for articles on a topic, and the database responds SUCCESSFULLY but with ZERO matching articles. Meanwhile, a second subagent querying a government statistics API hits a CONNECTION TIMEOUT. A coordinator that handles both cases IDENTICALLY — retrying three times for each — is making a genuine error, even though both situations superficially look like 'the search didn't return useful results.'"
    ],
    "why": "These are fundamentally different situations requiring different responses. The zero-matches case is a SUCCESSFUL query that legitimately found nothing — retrying the IDENTICAL query three times will predictably return the same zero results each time, since nothing about the underlying data changed between retries; the correct response is either trying a DIFFERENT query (broader terms, different keywords) or accepting that this source genuinely has nothing on the topic. The connection timeout is a genuinely TRANSIENT infrastructure failure — retrying is appropriate here because the underlying condition (a momentary network or service issue) may well have resolved by the next attempt, unlike the zero-matches case where retrying changes nothing. Treating both as 'no useful result, retry 3 times' wastes retries on the empty-result case (which retrying can never fix) while correctly-but-coincidentally handling the timeout case right — the coordinator needs to distinguish WHY a result was unhelpful, not just recognize THAT it was unhelpful."
   },
   {
    "id": "iserror-silent-failures",
    "part": "a5-p3",
    "legacy": 11,
    "h": "isError's exact placement, and two named silent-failure flows",
    "bridge": "Handling a failure correctly requires the model to know it happened. This section asks where that signal lives, and what happens when a tool withholds it.",
    "diagram": {
     "kind": "compare",
     "title": "Two ways to withhold the failure signal",
     "left": {
      "title": "Flow 1: silent failure",
      "tone": "bad",
      "items": [
       "Tool fails",
       "Returns an empty result silently",
       "Model hallucinates success"
      ]
     },
     "right": {
      "title": "Flow 2: uncaught exception",
      "tone": "bad",
      "items": [
       "Tool fails",
       "Throws an uncaught exception",
       "Whole pipeline crashes"
      ]
     },
     "verdict": "Fix: set isError on the tool_result, separate from content."
    },
    "p": [
     "`isError` lives at the `tool_result` level, entirely separate from the `content` block — a dedicated flag, not something inferred from content shape. Two flows are named as 'the silent killer of agentic systems': Flow 1 — Silent Failure & Hallucination (tool fails → returns an empty result silently → model hallucinates success); Flow 2 — Catastrophic Exception & Crash (tool fails → throws an uncaught exception → crashes the whole pipeline)."
    ],
    "why": "Both flows violate the same rule: the model must EXPLICITLY know a failure occurred to reason about recovery at all. A reliability audit of any agentic system should check every tool boundary for this exact failure mode — an empty result or an uncaught exception both withhold the one signal recovery logic depends on."
   },
   {
    "id": "shared-error-taxonomy",
    "part": "a5-p3",
    "legacy": 7,
    "h": "A shared error taxonomy across the organization",
    "bridge": "The isError flag fixes one tool boundary. This section asks how to make every team's pipelines report and recover from failures the same way.",
    "diagram": {
     "kind": "layers",
     "title": "One taxonomy, applied everywhere",
     "arrows": true,
     "layers": [
      {
       "t": "Shared vocabulary",
       "sub": "transient, validation, business, permission",
       "tone": "hi"
      },
      {
       "t": "Same recovery action per category",
       "sub": "retry, fix, explain, escalate"
      },
      {
       "t": "Same structured-error shape",
       "sub": "consistent across agents"
      },
      {
       "t": "Every team's pipelines",
       "sub": "failures readable by any engineer",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "Developer covers four error categories (transient, validation, business, permission) with distinct correct actions, and four error-handling anti-patterns (generic status, silent suppression, aborting on one failure, infinite local retries). At the Architect level, this taxonomy should be a SHARED VOCABULARY and shared implementation pattern used consistently across every agent and pipeline the organization builds — the same categories, the same recovery actions, the same structured-error shape — rather than each team independently inventing its own ad hoc error handling."
    ],
    "why": "A shared, consistent error taxonomy is what makes cross-system observability and incident response actually tractable at organizational scale: an engineer debugging an unfamiliar pipeline built by a different team can immediately understand a failure's category and expected recovery behavior, because it follows the same shared taxonomy every other pipeline in the organization uses — rather than needing to learn each team's own bespoke error-handling conventions from scratch."
   },
   {
    "id": "confidence-calibration-stale-data",
    "part": "a5-p4",
    "legacy": 2,
    "h": "Confidence calibration, and honest handling of stale/uncertain data",
    "bridge": "Failures are not the only time a system needs a human. This section asks when to trust an automated output, using confidence scores, and how stale data fits the same honesty rule.",
    "diagram": {
     "kind": "decision",
     "title": "Route by calibrated confidence",
     "q": {
      "t": "Extraction with a confidence score",
      "sub": "threshold set from labeled data"
     },
     "branches": [
      {
       "label": "above threshold",
       "t": "Automate, with regular spot-checks",
       "sub": "e.g. 90%",
       "tone": "ok"
      },
      {
       "label": "below threshold",
       "t": "Route to human review",
       "tone": "warn"
      },
      {
       "label": "stale tool result",
       "t": "Strip it or re-analyze changes",
       "sub": "after a late resume",
       "tone": "hi"
      }
     ],
     "note": "97% overall can hide 60% on one document type."
    },
    "p": [
     "A confidence-routing system attaches a score to each extraction, automating above a threshold (e.g. 90%) and routing below it to human review. That threshold must be calibrated against real labeled data, not guessed — and even high-confidence automated processing needs regular spot-checks, because an aggregate accuracy figure (97% overall) can hide a much worse rate concentrated in one document type (60%) if that slice is a small enough share of volume.",
     "Related honesty principle for stale data: resuming a session hours later risks the agent confidently stating outdated information from an old tool result. The fix is either stripping stale tool_results from the resumed context (forcing a fresh re-fetch) or, when you know specifically what changed, targeted re-analysis of just those files — never silently trusting old data as if it were still current."
    ],
    "why": "Auditing accuracy BY document type and BY field — not just in aggregate — is what surfaces a hidden, concentrated failure mode before it causes real damage at scale. The same honesty principle (don't let confident-sounding output stand in for verified-correct output) applies whether the risk is a low-confidence extraction or a stale cached fact."
   },
   {
    "id": "stratified-sampling-field-calibration",
    "part": "a5-p4",
    "legacy": 13,
    "h": "Stratified sampling and field-level confidence calibration",
    "bridge": "Routing by score raises a question: how do you know the score and the aggregate accuracy are telling the truth? This section covers the checks that expose hidden, concentrated failures.",
    "diagram": {
     "kind": "hub",
     "title": "Measure against reality, not a summary",
     "center": {
      "t": "Trust a threshold",
      "sub": "only after these checks",
      "tone": "hi"
     },
     "spokes": [
      {
       "t": "Segment accuracy",
       "sub": "by type and field",
       "items": [
        "catches a hidden 45% slice"
       ]
      },
      {
       "t": "Stratified sampling",
       "sub": "include high confidence",
       "items": [
        "catches confident errors"
       ]
      },
      {
       "t": "Calibrate on labels",
       "sub": "validation set",
       "items": [
        "0.95 may be 88%"
       ]
      },
      {
       "t": "Uncertainty first",
       "sub": "reviewer capacity",
       "items": [
        "avoid even spread"
       ]
      }
     ]
    },
    "p": [
     "An aggregate accuracy figure can hide a serious, localized failure. A system reporting 97% overall accuracy might really be 99.5% accurate on standard invoices but only 45% accurate on international-format documents — the aggregate looks fine only because high-volume, easy documents dominate the average. The fix is validating accuracy BY document type AND by field, not just in aggregate, before trusting any threshold-based automation decision.",
     "Stratified random sampling is the mechanism for catching this: draw samples from EVERY category — document type, confidence band, field type — including HIGH-confidence extractions, not only the low-confidence ones already being sent to review. High-confidence items are exactly the ones that bypass review entirely, so stratified sampling of them is the only way to catch a novel error pattern the model is confidently getting wrong.",
     "Raw model-reported confidence scores are not inherently calibrated: a model reporting 0.95 confidence might genuinely be correct 88% of the time on one field type and 99% of the time on another. Calibration means checking reported confidence against a labeled validation set with known-correct answers, then setting review thresholds based on that measured relationship — not the model's raw, unverified confidence number."
    ],
    "why": "Two failure modes compound if this isn't done: trusting an aggregate number hides which specific segment is actually unreliable, and trusting raw uncalibrated confidence scores can systematically over- or under-route review capacity relative to true accuracy. Both are corrected the same way — measure against reality (segmented accuracy, labeled validation data) rather than trusting a single convenient summary number.",
    "table": {
     "headers": [
      "Practice",
      "What it catches"
     ],
     "rows": [
      [
       "Segment accuracy by document type AND field",
       "A concentrated failure hidden inside a good-looking aggregate number"
      ],
      [
       "Stratified sampling INCLUDING high-confidence items",
       "Novel error patterns the model is confidently but wrongly making, which bypass review entirely otherwise"
      ],
      [
       "Calibrate confidence against labeled validation data",
       "A raw 0.95 score that's actually only 88% reliable on a specific field"
      ],
      [
       "Prioritize reviewer capacity by highest uncertainty first",
       "Wasting limited review capacity evenly across items the model already handles well"
      ]
     ]
    },
    "deep": "A concrete version of the trap: a system automates every extraction above a raw 95% self-reported confidence threshold, based on a 97% overall accuracy figure. Both numbers are individually true and jointly misleading — the aggregate masks a 45% accuracy rate on one under-represented document type, and the raw confidence threshold was never actually checked against ground truth for that type. The correct response isn't to distrust automation altogether; it's to validate segment-by-segment and calibrate the threshold against labeled data before trusting either number to gate automation."
   },
   {
    "id": "calibration-system-policy",
    "part": "a5-p4",
    "legacy": 5,
    "h": "Confidence calibration as a system-wide policy, not a one-off tuning choice",
    "bridge": "Those checks work as techniques; the architect's step is to make them standing policy. This section asks how often to re-validate, and what must be audited before any threshold change.",
    "diagram": {
     "kind": "flow",
     "title": "A recurring audit, not a launch-day tuning",
     "numbered": true,
     "perRow": 4,
     "steps": [
      {
       "t": "Calibrate on labeled data",
       "tone": "hi"
      },
      {
       "t": "Set the threshold"
      },
      {
       "t": "Audit by type and field",
       "sub": "before trusting any change",
       "tone": "warn"
      },
      {
       "t": "Re-validate on fresh traffic",
       "sub": "on a defined cadence",
       "tone": "ok"
      }
     ],
     "loops": [
      {
       "from": 3,
       "to": 0,
       "label": "accuracy drifts as data shifts"
      }
     ]
    },
    "p": [
     "Developer covers routing by confidence score (e.g., automate above a 90% threshold, route below it to human review) as a technique. At the Architect level, the same idea needs to be a POLICY applied consistently across the whole system: thresholds calibrated against real labeled data (not guessed), a defined, recurring cadence for re-validating that threshold against fresh production data (since accuracy on real traffic can drift over time), and mandatory accuracy auditing broken down by document type and field — not just in aggregate — before any threshold change is trusted in production."
    ],
    "why": "An aggregate accuracy number can hide a serious, concentrated failure in one slice of the data (a 97% overall figure can mask a document type sitting at 60%). Architecting this as a recurring, systematic AUDIT PROCESS — not a one-time calibration done once at launch — is what keeps a confidence-routing system trustworthy as real-world data distributions shift over time after deployment."
   },
   {
    "id": "backwards-escalation",
    "part": "a5-p4",
    "legacy": 9,
    "h": "Deep dive: diagnosing BACKWARDS escalation calibration",
    "bridge": "Calibration decides when a score is trusted; escalation criteria decide which cases a person should handle at all. This section diagnoses an agent whose escalation is the wrong way round.",
    "diagram": {
     "kind": "compare",
     "title": "Backwards vs well-calibrated escalation",
     "left": {
      "title": "Backwards (low first-contact resolution)",
      "tone": "bad",
      "items": [
       "Escalates standard damage replacement",
       "Handles policy-exception cases alone"
      ]
     },
     "right": {
      "title": "Calibrated",
      "tone": "ok",
      "items": [
       "Routine, well-covered cases resolve",
       "Ambiguous or policy-gap cases escalate"
      ]
     },
     "verdict": "Fix: explicit criteria plus few-shot examples in the system prompt, not a score threshold or classifier."
    },
    "p": [
     "A specific, recognizable failure pattern: an agent's first-contact resolution rate is well below target, and investigation shows it's calibrated BACKWARDS — escalating STRAIGHTFORWARD cases (a standard damage replacement with clear photo evidence) while attempting to autonomously handle COMPLEX situations that genuinely require a policy exception. This is the opposite of good escalation design: routine, well-covered cases should resolve autonomously; genuinely ambiguous or policy-gap cases should escalate."
    ],
    "why": "The fix is adding EXPLICIT escalation criteria to the system prompt, paired with few-shot examples specifically demonstrating the correct escalate-vs-resolve boundary — not a vaguer instruction like 'use good judgment,' and not a bolted-on confidence-score threshold or a separate classifier model trained to predict escalation (both of those add complexity and unreliable proxies without fixing the underlying calibration). Recognizing this SPECIFIC symptom — high-confidence-should-resolve cases being escalated while genuinely-uncertain cases are attempted — is what tells you the fix is a system-prompt-level recalibration with concrete examples, not a new tool or a new model."
   },
   {
    "id": "reliability-patterns",
    "part": "a5-p5",
    "legacy": 4,
    "h": "Reliability patterns beyond a single request",
    "bridge": "With errors classified and escalation tuned, the question widens from one request to the whole system. This section asks what keeps a failing dependency from degrading everything.",
    "diagram": {
     "kind": "layers",
     "title": "Design so failures are contained",
     "arrows": true,
     "layers": [
      {
       "t": "Retry with backoff",
       "sub": "for transient failures",
       "tone": "hi"
      },
      {
       "t": "Circuit breaker",
       "sub": "stop calling a failing dependency"
      },
      {
       "t": "Graceful degradation",
       "sub": "tool or MCP server unavailable",
       "tone": "warn"
      },
      {
       "t": "Fail safely, never silently wrong",
       "tone": "ok"
      }
     ]
    },
    "p": [
     "Retry/backoff strategies (from Developer's error-handling content) become part of a broader reliability design: circuit breakers for a failing dependency, graceful degradation when a tool or MCP server is unavailable, and designing systems that fail safely rather than silently producing wrong output."
    ],
    "why": "Developer's Eval, Testing, and Debugging topic taught you to diagnose whether something is an integration bug or a model-output problem AFTER it happens. Architect's Context Management & Reliability domain is about designing the system so these failures are caught, contained, and recovered from automatically wherever possible."
   },
   {
    "id": "local-recovery-before-escalation",
    "part": "a5-p5",
    "legacy": 10,
    "h": "Local Recovery Before Escalation — a named 3-layer reliability model",
    "bridge": "Those patterns raise a practical question: when a tool fails, who retries first? This section names the three-layer contract every subagent should implement.",
    "diagram": {
     "kind": "flow",
     "title": "Local recovery before escalation",
     "numbered": true,
     "perRow": 3,
     "steps": [
      {
       "t": "Tool execution fails",
       "tone": "bad"
      },
      {
       "t": "Subagent retries locally",
       "sub": "transient issues only",
       "tone": "warn"
      },
      {
       "t": "Escalate structured error",
       "sub": "only once local retries are exhausted",
       "tone": "hi"
      }
     ],
     "note": "Never terminate the whole pipeline on a single failure."
    },
    "p": [
     "A precise, standardizable answer to 'who retries first, the subagent or the coordinator?' Layer 1: tool execution fails. Layer 2: the SUBAGENT ITSELF catches the error and executes a local retry, for transient issues only. Layer 3: local retry is exhausted — only then does it escalate a structured error up to the Coordinator. Named principle: 'subagents must handle their own transient failures locally; the coordinator is only involved when local options are exhausted.' Named anti-pattern: 'terminating a pipeline on a single failure is an all-or-nothing anti-pattern.'"
    ],
    "why": "At the architecture level, this is a reusable reliability CONTRACT every subagent in a system should implement identically — bounded local retry first, structured escalation only after that budget is exhausted — rather than each subagent inventing its own ad hoc retry behavior."
   }
  ],
  "quiz": [
   {
    "q": "A system prompt rule stated once at the start of an 80-turn conversation quietly stops being followed by turn 60, even though the context window still has room to spare. What is this failure mode called, and what's the WRONG fix?",
    "opts": [
     "Context exhaustion; the right fix is compaction",
     "Instruction drift; the wrong fix is /compact or summarization, which can remove the very reminders counteracting it",
     "A model hallucination; the fix is lowering temperature",
     "A tool-selection error; the fix is clearer tool descriptions"
    ],
    "correct": 1,
    "explain": "This is instruction drift — the system prompt's relative influence shrinking as accumulated output grows — and compaction/summarization is the wrong fix since it addresses context exhaustion and can even strip out reminders that were helping."
   },
   {
    "q": "What actually causes instruction drift, distinct from running out of context window space?",
    "opts": [
     "A bug in the tokenizer",
     "The growing ratio of accumulated assistant-turn output to the fixed-size system instruction, weakening the system prompt's relative influence over time",
     "The model's training cutoff date",
     "Using too many tools in one session"
    ],
    "correct": 1,
    "explain": "Instruction drift is about relative influence shrinking as conversational content accumulates — it can happen even with plenty of context room left, which is what distinguishes it from exhaustion."
   },
   {
    "q": "Which two mitigations correctly address instruction drift?",
    "opts": [
     "/compact and summarization",
     "Periodic reminder injection, and replacing abstract rules with few-shot demonstrations",
     "Lowering the temperature and increasing max_tokens",
     "Switching to a smaller model"
    ],
    "correct": 1,
    "explain": "Re-injecting the rule periodically, or demonstrating it concretely via few-shot examples, tends to hold influence more durably than a single abstract statement made once at the start."
   },
   {
    "q": "A live price change needs to be reflected in an ongoing conversation with the model. What is the correct way to inject it?",
    "opts": [
     "Rewrite the top-level system field with the new price",
     "Insert a synthetic user-role message stating the price changed",
     "Prefix the update onto the next real user message",
     "Wait until the conversation ends and restart with updated context"
    ],
    "correct": 2,
    "explain": "The correct pattern is prefixing the update to the next user turn — folding it into what the user-side of the conversation hands back on that turn, rather than fabricating a message or rewriting the system field."
   },
   {
    "q": "Why is rewriting the top-level `system` field mid-conversation the wrong way to inject a real-time event?",
    "opts": [
     "It's technically impossible via the API",
     "It busts prompt caching, since the cached prefix no longer matches, and isn't what the system field is for",
     "It requires re-authenticating the session",
     "System fields can only be set once per account, not per conversation"
    ],
    "correct": 1,
    "explain": "Changing the system field mid-conversation invalidates the cached prefix tied to the original field value, and the system field isn't designed as a live-event injection point."
   },
   {
    "q": "Why is injecting a synthetic `user`-role message purely to carry a real-time event problematic?",
    "opts": [
     "User messages are more expensive to process",
     "It breaks turn attribution — it makes it look like the actual human user said something they didn't",
     "The API rejects user messages that weren't typed by a human",
     "It causes the conversation to end early"
    ],
    "correct": 1,
    "explain": "A fabricated user message corrupts the conversation's own record of who said what — the event should be prefixed onto a real user turn instead of masquerading as one."
   },
   {
    "q": "Per the 'Local Recovery Before Escalation' model, who retries a subagent's transient tool failure first — the subagent itself, or the coordinator?",
    "opts": [
     "The coordinator — every failure should escalate immediately",
     "The subagent itself at Layer 2",
     "Neither — transient failures should be ignored",
     "Whichever has fewer other tasks queued"
    ],
    "correct": 1,
    "explain": "Subagents handle their own transient failures locally as a standing reliability contract; the coordinator is a last resort, not the first responder."
   },
   {
    "q": "A tool fails and the handler returns an empty array with no error flag; the model reports success. Which named failure flow is this, and what single field would have prevented it?",
    "opts": [
     "Flow 2, Catastrophic Exception & Crash — a try/except block would fix it",
     "Flow 1, Silent Failure & Hallucination",
     "Neither — this is normal empty-result behavior",
     "Flow 2 — a larger max_tokens value would fix it"
    ],
    "correct": 1,
    "explain": "This is Flow 1: a silent empty result gives the model no signal a failure occurred, so it hallucinates success. isError: true is the one field that would have prevented it."
   },
   {
    "q": "A pipeline's subagents all correctly output structured claim-source mappings, but the final synthesis agent writes plain narrative prose with no claims/sources arrays. What has happened, per the exam-critical rule?",
    "opts": [
     "Nothing wrong — narrative prose is a fine final output format",
     "The provenance chain is broken — every synthesis step, including the final one",
     "This only matters if the narrative is factually incorrect",
     "Only the subagents are at fault, not the synthesis step"
    ],
    "correct": 1,
    "explain": "The chain breaks the moment ANY synthesis step, including the last, converts structured claim-source data into unstructured prose — a checkable invariant an architect should audit for across the whole pipeline."
   },
   {
    "q": "A 48-turn session covers three topics: two resolved, one still active. What's the better compaction strategy than summarizing everything uniformly?",
    "opts": [
     "Summarize the entire session, including the active issue, into one short paragraph",
     "Turn resolved topics into a narrative summary",
     "Delete resolved topics entirely with no summary",
     "Never compact any part of a multi-topic session"
    ],
    "correct": 1,
    "explain": "Selective compaction saves context budget on settled topics while preserving precision the still-active issue needs."
   },
   {
    "q": "A tool call fails with a timeout. Which error category is this, and what's the correct action?",
    "opts": [
     "Validation error — correct the input and resubmit",
     "Transient error — retry with exponential backoff",
     "Business error — explain to the user",
     "Permission error — escalate"
    ],
    "correct": 1,
    "explain": "A timeout is transient — retrying with backoff is appropriate, unlike validation, business, or permission errors."
   },
   {
    "q": "A search subagent returns an empty result. Why is treating this identically to 'search succeeded, no matches' dangerous?",
    "opts": [
     "It's never dangerous",
     "An empty result could mean genuinely no matches OR that the search actually failed",
     "Empty results should always be retried automatically",
     "This only matters for MCP tools"
    ],
    "correct": 1,
    "explain": "Silent suppression collapses two very different situations, robbing the coordinator of the information it needs."
   },
   {
    "q": "A confidence-routing system reports 97% overall accuracy. Why might this still be dangerous to trust at face value?",
    "opts": [
     "97% is always a bad score",
     "It can hide a much worse accuracy rate concentrated in one document type or field",
     "This means the system is definitely broken",
     "Percentages can't apply to extraction"
    ],
    "correct": 1,
    "explain": "Auditing by document type and field — not just aggregate — is what surfaces a hidden, concentrated failure."
   },
   {
    "q": "What's the difference between Developer's approach to context drift and Architect's approach?",
    "opts": [
     "There's no difference",
     "Developer teaches recognizing/fixing drift within a session",
     "Architect doesn't cover context drift at all",
     "They're unrelated topics"
    ],
    "correct": 1,
    "explain": "Same underlying concept, elevated from reactive single-session fixing to proactive system-level engineering."
   },
   {
    "q": "What is a 'graceful degradation' design, in the context of a tool or MCP server becoming unavailable?",
    "opts": [
     "The whole application crashes with no explanation",
     "The system fails safely — e.g., falling back to a simpler behavior or clear error rather than silently producing wrong output",
     "Ignoring the failure completely",
     "Retrying forever with no limit"
    ],
    "correct": 1,
    "explain": "Graceful degradation means designing for safe, informative failure rather than silent corruption or an uncontrolled crash."
   },
   {
    "q": "Why should confidence-based routing thresholds be re-validated on a recurring cadence, rather than calibrated once at launch and left alone?",
    "opts": [
     "Recurring re-validation is unnecessary busywork",
     "Real-world accuracy can drift over time as production data distributions shift, so a threshold calibrated once may no longer be trustworthy later",
     "Thresholds never need any calibration at all",
     "This only matters for the Batch API"
    ],
    "correct": 1,
    "explain": "Treating calibration as an ongoing system-level policy, not a one-time setup step, is what keeps a confidence-routing system reliable long-term."
   },
   {
    "q": "Practice scenario: An organization has 12 different Claude-powered pipelines, each built by a different team. Each team invented its own error-handling conventions independently — some retry everything blindly, some silently swallow empty results, some throw raw exceptions the model never sees. A new engineer joins and is asked to debug a failure in a pipeline they didn't build. What's the architect-level root cause and fix?",
    "opts": [
     "The new engineer should just read each pipeline's code carefully every time — this is a normal onboarding cost",
     "Missing a SHARED error taxonomy (categories, recovery actions, structured error shape) used consistently across the organization's pipelines",
     "Every team should switch to a single monolithic pipeline to avoid this problem entirely",
     "This is unavoidable and has no architectural fix — different teams will always handle errors differently"
    ],
    "correct": 1,
    "explain": "A shared, consistent error taxonomy across the organization is exactly what makes cross-system observability and incident response tractable — an engineer debugging an unfamiliar pipeline can understand its failures immediately without learning bespoke, team-specific conventions first."
   },
   {
    "q": "A codebase-exploration agent needs to track free-form findings and architectural decisions during open-ended investigation. Which working-memory mechanism fits, and why not the alternatives?",
    "opts": [
     "A persistent case-facts block, because it's the most structured option",
     "A scratchpad file — case-facts blocks assume a fixed business schema (IDs, amounts) that doesn't fit unstructured exploratory findings",
     "Selective compaction alone, with no other mechanism needed",
     "None of these apply to exploration work"
    ],
    "correct": 1,
    "explain": "Matching the mechanism to what's actually being protected matters — a case-facts block's fixed schema doesn't fit free-form exploratory findings the way a scratchpad does."
   },
   {
    "q": "A subagent queries a database and gets a SUCCESSFUL response with zero matching articles. Another subagent queries a different API and hits a CONNECTION TIMEOUT. A coordinator retries both three times identically. What's wrong with this, and what should change?",
    "opts": [
     "Nothing is wrong, retrying three times is always a safe default for any unhelpful result",
     "The zero-matches case is a successful query that legitimately found nothing",
     "Both should be retried indefinitely until they succeed",
     "Neither should ever be retried, since both represent failures"
    ],
    "correct": 1,
    "explain": "A successful empty result and a transient error are fundamentally different situations — treating them identically wastes retries on the case that retrying can never fix."
   },
   {
    "q": "Why should an organization maintain ONE shared error taxonomy (categories, recovery actions, structured error shape) across all its agents and pipelines, rather than letting each team invent its own?",
    "opts": [
     "Shared taxonomies are purely cosmetic",
     "A shared taxonomy makes cross-system observability and incident response tractable",
     "Each team's error handling should always be completely independent",
     "This only matters for very small organizations"
    ],
    "correct": 1,
    "explain": "Consistency across teams is what lets anyone in the organization quickly understand and respond to a failure in a system they didn't build themselves."
   },
   {
    "q": "An agent's first-contact resolution rate is well below target. Investigation shows it escalates STRAIGHTFORWARD cases (standard damage replacement, clear photo evidence) while attempting to autonomously resolve COMPLEX cases requiring a policy exception. What's happening, and what's the fix?",
    "opts": [
     "The agent needs a bigger model to handle the complex cases better",
     "Escalation calibration is backwards",
     "This is normal variance and doesn't need a fix",
     "The agent should escalate everything to be safe"
    ],
    "correct": 1,
    "explain": "This specific backwards-calibration symptom points to a system-prompt-level fix with concrete examples of the correct boundary — not a new tool, model, or blanket escalation policy."
   },
   {
    "q": "A subagent inside a coordinated pipeline hits a transient network error and retries locally 15 times before giving up. What anti-pattern is this, and what's the correct bound?",
    "opts": [
     "This is correct behavior, more retries are always safer",
     "Infinite/excessive local retries — the correct pattern is 1-2 local recovery attempts",
     "Retries should never happen locally under any circumstances",
     "15 retries is the industry-standard correct number"
    ],
    "correct": 1,
    "explain": "Excessive local retrying wastes latency and resources with no natural end point — propagating after a bounded attempt lets the coordinator make an informed decision."
   },
   {
    "q": "A coordinator receives a structured error from a subagent stating failure_type: 'transient', isRetryable: true, plus partial_results. What should the coordinator's response be, compared to receiving just 'Operation failed'?",
    "opts": [
     "Identical response either way, the extra fields don't change anything",
     "The structured error lets the coordinator make an informed decision",
     "The coordinator should always abort entirely regardless of the error's structure",
     "Structured errors should be ignored in favor of always retrying blindly"
    ],
    "correct": 1,
    "explain": "This is exactly why structured errors matter — they give the coordinator the information needed to choose the right recovery action instead of guessing."
   },
   {
    "q": "A long customer-support session accumulates 200+ turns covering a single ongoing, unresolved billing dispute (not multiple separate topics). Does the 'narrative summary for resolved, verbatim for active' compaction pattern apply here?",
    "opts": [
     "Yes, exactly as described — summarize half and keep half verbatim regardless of resolution status",
     "Not directly — that pattern assumes some MULTI-topic threads are resolved and others active",
     "This scenario cannot occur in a well-designed system",
     "Compaction should never be applied to support sessions"
    ],
    "correct": 1,
    "explain": "Recognizing when a pattern's assumptions (multiple topics, some resolved) don't match the actual scenario (one long unresolved thread) is itself an architect-level judgment call."
   },
   {
    "q": "An organization sets a confidence threshold once at launch and never revisits it. Eighteen months later, extraction accuracy for a growing document category has quietly dropped below the threshold's original guarantee. What governance gap caused this?",
    "opts": [
     "No governance gap — one-time calibration is always sufficient",
     "Missing recurring re-validation against fresh production data",
     "The threshold was set incorrectly from the very start",
     "This can only be prevented by never using confidence-based routing at all"
    ],
    "correct": 1,
    "explain": "This is exactly the risk of treating calibration as a one-time launch task rather than a recurring system-level policy."
   },
   {
    "q": "Why does the reference matrix list 'Filter Stale Results' specifically under Customer Support's Token Bloat mitigation, rather than a general compaction technique?",
    "opts": [
     "It's an arbitrary placement with no specific reasoning",
     "Customer support sessions specifically accumulate stale tool_results (like an old status check) whose staleness is itself the bloat/reliability risk",
     "Filtering stale results and compaction are exactly the same technique",
     "This only applies to the Batch API"
    ],
    "correct": 1,
    "explain": "The matrix maps a SPECIFIC technique to a SPECIFIC dominant failure mode for that archetype — stale, confidently-repeated data is customer support's particular token-bloat risk."
   },
   {
    "q": "A pipeline aborts an entire multi-agent research task because one of five subagents failed, discarding the four successful subagents' findings. What's the architecturally correct alternative, and why does it matter for the system's overall reliability?",
    "opts": [
     "Aborting everything is always correct when any single failure occurs",
     "Continue with the four successful partial results, and clearly annotate the final synthesis to show which section has reduced or missing coverage due to the failed subagent",
     "Retry the entire five-subagent pipeline from scratch every time any single agent fails",
     "Silently present the four successful results without noting the gap"
    ],
    "correct": 1,
    "explain": "Discarding all partial work over one failure is a recognized anti-pattern — the correct approach preserves what succeeded and is honest about what's missing."
   },
   {
    "q": "What distinguishes a structured 'manifest' from a plain scratchpad file in long-running agent exploration?",
    "opts": [
     "They are identical concepts with different names",
     "A manifest is specifically structured for crash recovery — capturing what's explored, key findings, current phase, and open questions, for the coordinator to reload on resume",
     "A manifest is only used for financial data",
     "A scratchpad replaces the need for a manifest in all cases"
    ],
    "correct": 1,
    "explain": "A scratchpad is general working notes; a manifest is a purpose-built, structured state export specifically designed to let a coordinator resume cleanly after a crash."
   },
   {
    "q": "After a crash mid-exploration, what should the coordinator do with a previously-exported manifest?",
    "opts": [
     "Ignore it and re-explore the entire codebase from scratch",
     "Load the manifest and inject its contents (explored files, findings, phase, open questions) into the resuming agent's prompt",
     "Delete it, since manifests are not meant to be reused",
     "Treat it as equivalent to the full raw conversation history"
    ],
    "correct": 1,
    "explain": "The manifest is precisely the structured summary meant to let a resumed session continue cleanly, without either full re-exploration or reliance on a raw, potentially-lost conversation history."
   },
   {
    "q": "A document-extraction system reports 97% overall accuracy. What risk does this aggregate figure specifically hide?",
    "opts": [
     "No risk — a 97% aggregate guarantees consistent performance across all document types and fields",
     "Poor performance concentrated in a specific document type or field can be masked by high-volume, easy documents dominating the average",
     "Aggregate accuracy is always more reliable than segmented accuracy",
     "This only applies to numeric fields, not text fields"
    ],
    "correct": 1,
    "explain": "A high-volume, easy-to-extract document type can pull the aggregate number up even while a smaller, harder category is performing badly — the aggregate hides exactly where the badness is."
   },
   {
    "q": "Why should stratified random sampling include HIGH-confidence extractions, not just low-confidence ones already routed to human review?",
    "opts": [
     "High-confidence items never contain errors, so this is unnecessary",
     "High-confidence items bypass review entirely, so sampling them is the only way to catch a novel error pattern the model is confidently getting wrong",
     "Low-confidence items should never be sampled at all",
     "Sampling high-confidence items is only useful for compliance paperwork"
    ],
    "correct": 1,
    "explain": "Since high-confidence items skip human review by design, stratified sampling of that bucket specifically is what surfaces confident-but-wrong error patterns before they compound silently."
   },
   {
    "q": "A model reports 0.95 confidence on a field. What does this raw score need before it can be trusted to gate automated processing?",
    "opts": [
     "Nothing — a 0.95 score can always be trusted at face value",
     "Calibration against a labeled validation set with known-correct answers, since raw confidence isn't inherently accurate",
     "A larger max_tokens setting",
     "Conversion to a percentage, which is mathematically equivalent to calibration"
    ],
    "correct": 1,
    "explain": "Raw model confidence and true accuracy can diverge significantly by field type — calibration against ground-truth labeled data is what tells you what a given confidence score actually means for that specific field."
   },
   {
    "q": "With limited human reviewer capacity, how should extractions be prioritized for review?",
    "opts": [
     "Spread review capacity evenly across all extractions regardless of confidence",
     "Prioritize the highest-uncertainty items first — low confidence, ambiguous source documents, and historically poor-performing document types",
     "Review only extractions the model is most confident about",
     "Review extractions in the order they were submitted, with no prioritization"
    ],
    "correct": 1,
    "explain": "Spreading capacity evenly wastes it on items the model already handles well — routing the highest-uncertainty items first uses limited reviewer time where it actually reduces risk."
   },
   {
    "q": "A team proposes automating all extractions above a 95% raw model-confidence threshold, based on a 97% overall accuracy figure. What's the architecturally sound objection?",
    "opts": [
     "There is no objection — both numbers together fully justify automating at that threshold",
     "Aggregate accuracy can mask poor performance on specific document types or fields, and raw confidence scores need calibration against labeled validation data before being used as a threshold",
     "Automation should never be based on any confidence threshold",
     "97% accuracy is too low to ever justify automation regardless of threshold"
    ],
    "correct": 1,
    "explain": "Both underlying assumptions need independent verification — segment-level accuracy checking and confidence calibration — before either number can safely justify an automation threshold."
   },
   {
    "q": "A 400-endpoint security audit exceeds what fits in a single session's context. What is the wrong approach, and why does it fail even before hitting the hard context ceiling?",
    "opts": [
     "Splitting the work across sessions is wrong; one long session should always push through to the end",
     "One long session pushing through all 400 endpoints — the 'lost in the middle' effect degrades attention to earlier findings well before the hard context limit is actually reached",
     "There is no wrong approach; context limits never actually affect real tasks",
     "Bulk-reading all 400 endpoints' code upfront is always the safest approach"
    ],
    "correct": 1,
    "explain": "Context quality degrades before its hard ceiling — earlier findings get pushed out of the effective attention window even while there's technically still room left, which is why splitting the work matters before the limit is literally hit."
   },
   {
    "q": "In the audit scenario, after each batch of ~60 endpoints, what does the session do before ending, and what does the NEXT session read on start?",
    "opts": [
     "The session does nothing special; the next session re-reads the entire prior transcript from scratch",
     "The session appends compact structured findings (endpoint, finding, severity, status) to a persistent scratchpad file; the next session reads only that scratchpad summary, not the full prior exploration",
     "The session deletes all findings so the next session starts with a completely clean slate",
     "The next session re-runs the audit for all 400 endpoints again to verify consistency"
    ],
    "correct": 1,
    "explain": "A persistent scratchpad carries forward compact state across sessions cheaply — re-reading a full prior transcript would reintroduce the exact context-cost problem the scratchpad exists to avoid."
   },
   {
    "q": "Within a single session, why delegate one complex endpoint's deep investigation (reading middleware, auth logic, tests) to a subagent rather than doing that reading directly in the main session?",
    "opts": [
     "Subagents are always faster at reading files than the main session",
     "Doing the verbose reading directly in the main session would consume a large chunk of ITS budget on exploration output that's only a means to an end; a subagent isolates that cost and returns only a compact verdict",
     "Subagents have access to files the main session cannot read",
     "There is no reason — delegating adds unnecessary overhead with no benefit"
    ],
    "correct": 1,
    "explain": "Subagent isolation keeps one investigation's verbose reasoning trail out of the main session's context, which only needs the final compact verdict, not the full path taken to reach it."
   },
   {
    "q": "Why does a large task like the 400-endpoint audit typically need BOTH a scratchpad and subagent isolation together, rather than just one of the two?",
    "opts": [
     "They solve the identical problem, so using both is pure redundancy",
     "They solve different halves of the limits problem — the scratchpad carries state ACROSS sessions when no single session can hold the whole task, while subagent isolation keeps one investigation's cost from consuming the CURRENT session's budget",
     "Only the scratchpad is ever actually necessary; subagents are optional polish",
     "Only subagent isolation matters; scratchpads are unnecessary if subagents are used"
    ],
    "correct": 1,
    "explain": "Across-session state persistence and within-session cost isolation are genuinely separate problems — a task that exceeds limits on both axes needs both mechanisms working together."
   },
   {
    "q": "What happens if a scratchpad file itself is allowed to grow without bound — e.g. by appending full verbose investigation transcripts rather than compact structured findings?",
    "opts": [
     "Nothing, scratchpad files have no size limit or downstream cost",
     "It becomes its own context problem the moment a future session reads the whole thing back in — the scratchpad needs the same compact-summary discipline as a case-facts block or structured state manifest",
     "This is actually the recommended approach for maximum completeness",
     "Scratchpad files are never read back into any session's context, so size doesn't matter"
    ],
    "correct": 1,
    "explain": "A scratchpad is itself something a future session will load into its context — letting it grow as an unbounded verbose transcript recreates the exact problem it was introduced to solve."
   },
   {
    "q": "A developer sends only the newest user message on each Messages API call and the assistant forgets earlier details. Why?",
    "opts": [
     "The model is too small",
     "The API is stateless; prior turns must be included in the messages array on every request",
     "The system prompt is too short",
     "Temperature is too high"
    ],
    "correct": 1,
    "explain": "The model sees only the request. Continuity is the client's responsibility."
   },
   {
    "q": "Why do input tokens grow every turn in a long Messages API conversation?",
    "opts": [
     "The model adds hidden tokens",
     "The full history is resent with each request",
     "Tool calls double the count",
     "Streaming increases cost"
    ],
    "correct": 1,
    "explain": "Statelessness means history is replayed; caching, compaction and case-facts blocks mitigate the growth."
   },
   {
    "q": "A user asks about something discussed three months ago across 80k+ tokens of history. Best approach?",
    "opts": [
     "Resend all 80k tokens every call",
     "Use a structured memory store or retrieval and inject only relevant facts",
     "Increase max_tokens",
     "Lower the temperature"
    ],
    "correct": 1,
    "explain": "History alone cannot span that length; retrieval or structured memory supplies only what is relevant."
   },
   {
    "q": "How does Claude Code's --resume relate to the stateless API?",
    "opts": [
     "It makes the API stateful server-side",
     "It reloads the stored transcript so the history is sent as input in the next request",
     "It disables the context window",
     "It clears history"
    ],
    "correct": 1,
    "explain": "Continuity is still history replayed as input; Claude Code just stores and reloads it for you."
   },
   {
    "q": "A 2,800-token system prompt reliably guides an AI tutor's behavior for the first 10-12 turns, then its proficiency-adaptation rules start being ignored by turn 15 — well under any context-window limit. What's the actual mechanism behind this degradation?",
    "opts": [
     "The context window has been exceeded, truncating the system prompt",
     "As assistant turns accumulate, the model increasingly pattern-matches against its own growing prior output, diluting the system prompt's proportional influence even though the prompt text itself is unchanged and resent every call",
     "The system field is only sent on the first API call, not every call",
     "The model's temperature setting increases automatically over long conversations"
    ],
    "correct": 1,
    "explain": "Instruction drift is a proportional-weight problem, not a truncation problem — it can happen at token counts far below any context ceiling, because it's driven by the growing ratio of accumulated output to the fixed-size instruction."
   },
   {
    "q": "Given instruction drift on a system prompt with abstract, hard-to-keep-re-deriving rules (e.g. 'adapt explanation depth to the user's proficiency level'), what fix is often more durable than either a longer prompt or more frequent reminders?",
    "opts": [
     "Increasing max_tokens to give the model more room to comply",
     "Replacing the abstract rules with 2-3 concrete few-shot examples that directly demonstrate the adaptation",
     "Switching to a smaller, faster model",
     "Disabling the system prompt entirely and relying only on user messages"
    ],
    "correct": 1,
    "explain": "A demonstrated pattern is easier for the model to keep matching against turn after turn than an abstract rule is to keep re-applying — few-shot examples often outlast prose rules under drift."
   },
   {
    "q": "A webhook fires mid-conversation — a customer's package just shipped while they're actively chatting. What is the correct way to get this information into the conversation?",
    "opts": [
     "Rewrite the top-level system field to include the shipping update",
     "Inject a synthetic user-role message pretending to be the customer announcing the shipment",
     "Prefix the update to the start of the next actual user message (e.g. '[System note: order shipped] ' + the customer's real next message)",
     "Wait until the customer asks about their order before mentioning it"
    ],
    "correct": 2,
    "explain": "Prefixing to the next user message gets the timely information in without the heavyweight cache-busting cost of rewriting the system field or the turn-attribution confusion of faking a user message."
   },
   {
    "q": "Why is rewriting the top-level system field a poor way to inject a one-off real-time update mid-conversation, compared to prefixing the next user message?",
    "opts": [
     "The system field cannot be changed after the first API call under any circumstances",
     "Rewriting it invalidates the cached prefix built from the original system field, which is architecturally heavyweight for a single timely update",
     "There is no difference between the two approaches",
     "Prefixing a user message is technically impossible in the Claude API"
    ],
    "correct": 1,
    "explain": "A full system-field rewrite busts prompt caching for the whole conversation going forward — disproportionate cost for injecting one timely fact that a simple message prefix handles just as well."
   },
   {
    "q": "A team sees a system-prompt rule getting ignored partway through a conversation and concludes the context window must be nearly full, reaching for /compact as the fix. Why can this diagnosis be wrong?",
    "opts": [
     "/compact never actually changes anything about context, so the diagnosis is irrelevant either way",
     "Instruction drift can occur at token counts far below any context ceiling, since it's driven by accumulated-output ratio, not exhaustion — compacting doesn't fix that ratio and can even remove reminders or few-shot examples that were counteracting the drift",
     "Context windows never actually fill up in practice",
     "/compact always fixes instruction drift regardless of cause"
    ],
    "correct": 1,
    "explain": "Treating every mid-conversation instruction failure as a token-exhaustion problem misses drift, whose actual cause is a proportional-weight issue that compaction doesn't address and can even worsen if it strips out counteracting reminders or examples."
   }
  ],
  "parts": [
   {
    "id": "a5-p1",
    "title": "Why context drifts",
    "intro": "Start with what the model actually sees on each call, because every later technique manages that input. This part separates two look-alike problems: running out of room, and a rule losing its grip."
   },
   {
    "id": "a5-p2",
    "title": "Keeping long sessions coherent",
    "intro": "Once you know context is finite and rebuilt on each call, the question is how to carry work across long sessions and restarts. This part covers working-memory mechanisms, subagent isolation, and resume and fork rules."
   },
   {
    "id": "a5-p3",
    "title": "Classifying failures correctly",
    "intro": "Long-running agents will hit failures, and the first design step is naming what kind of failure it is. This part builds the error taxonomy, then shows the silent failures that hide it."
   },
   {
    "id": "a5-p4",
    "title": "Confidence, escalation and human review",
    "intro": "After failures comes the judgment call: when should the system act alone, and when should a person look? This part covers calibrating confidence, sampling for hidden errors, and diagnosing bad escalation."
   },
   {
    "id": "a5-p5",
    "title": "Reliability patterns and recovery layers",
    "intro": "With context, errors and escalation understood, this last part assembles them into system-level patterns. It ends with the recovery contract that says who retries first."
   }
  ],
  "roadmap": {
   "kind": "roadmap",
   "title": "Context Management & Reliability roadmap",
   "parts": [
    {
     "t": "Why context drifts",
     "items": [
      "Stateless API",
      "Pruning, compaction",
      "Drift vs exhaustion"
     ]
    },
    {
     "t": "Long sessions",
     "items": [
      "Working memory",
      "Scratchpad + subagents",
      "Resume and fork"
     ]
    },
    {
     "t": "Classifying failures",
     "items": [
      "Error taxonomy",
      "Empty vs timeout",
      "isError, silent failures"
     ]
    },
    {
     "t": "Confidence and escalation",
     "items": [
      "Calibration",
      "Stratified sampling",
      "Escalation criteria"
     ]
    },
    {
     "t": "Reliability patterns",
     "items": [
      "Circuit breakers",
      "Local recovery layers"
     ]
    }
   ]
  }
 }
];
