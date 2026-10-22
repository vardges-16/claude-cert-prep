# Claude Certification Prep

A self-contained, browser-based study app covering four Claude certification tracks:

| Track | Exam code | Domains | Questions |
|---|---|---|---|
| Developer — Foundations | CCDV-F | 8 | 347 |
| Architect — Foundations | CCAR-F | 5 | 200 |
| Associate — Foundations | CCAO-F | 7 | 33 |
| Architect — Professional | CCAR-P | 7 | 35 |

Each track has: topic-by-topic lessons with worked examples, a per-topic quiz, and a full timed mock exam weighted to match the real exam's domain distribution.

This is an independent study tool. It is not affiliated with, endorsed by, or sourced verbatim from Anthropic's official exam content — it's original explanatory material written while cross-referencing publicly available exam guides.

## Running it

No build step, no server required. Just open `index.html` in a browser.

```
git clone <this-repo>
cd claude-cert-prep
open index.html        # macOS
# or just double-click index.html
```

If your browser blocks local `<script src>` loading under `file://` (some do, for local-file security reasons), serve the folder instead:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```
.
├── index.html                      # Shell: HTML markup + all CSS. Loads the JS below.
├── data/
│   ├── developer.js                 # DOMAINS_DEV — Developer track content
│   ├── architect.js                 # DOMAINS_ARCH — Architect Foundations content
│   ├── associate.js                 # DOMAINS_ASSOC — Associate content
│   └── architect-professional.js    # DOMAINS_PROF — Architect Professional content
└── js/
    └── engine.js                    # Shared app logic — shared by all four tracks
```

**Why it's split this way:** the four tracks share everything *except* their actual content — the rendering logic, the quiz engine, the mock exam builder, progress tracking, and the lifecycle diagrams are identical across tracks. Only the lessons and questions differ. So:

- To **edit or add content** for one specific exam, you only ever touch one file in `data/`. You don't need to scan the other three tracks or the app logic to make a content change.
- To **fix or improve the app itself** (add a feature, fix a rendering bug, change the quiz UI), you edit `js/engine.js` once and it applies to all four tracks automatically — no risk of the tracks drifting out of sync with each other.

### What's in `js/engine.js`

- `TRACKS` — one entry per exam, pointing at its `data/*.js` domain array, plus its mock-exam question-count distribution, pass score, and time limit
- `AGENTIC_LIFECYCLE` — the shared 9-step "agentic loop" diagram data (Coordinator → spawns Subagent → PreToolUse hook → Tool executes → PostToolUse hook → …) used to render the "where does this topic sit" diagrams
- Rendering functions: `renderHome`, `renderDomain`, `renderQuiz`, `renderLifecycle`, `renderSidebar`, `renderMockQuestion`, etc.
- Mock exam logic: `buildMockExam`, `startMock`, `tickMockTimer`
- Progress tracking: reads/writes to browser `localStorage` via `loadProgress`/`saveProgress` (implemented in engine.js's init section)

### What's in each `data/*.js` file

Each file defines one `DOMAINS_*` array. Each entry in the array is one exam domain, shaped like:

```js
{
  id: "d1",                          // short id, referenced by TRACKS.mockCounts
  title: "Agents and Workflows",
  weight: "14.7%",                   // domain's share of the real exam
  emoji: "🤖",
  intro: "...",                      // shown at the top of the domain page
  archHighlights: {                  // optional — powers the lifecycle diagram
    1: ["Workflow vs Agent, task decomposition"],
    4: ["Hooks: deterministic enforcement"],
    // key = index into AGENTIC_LIFECYCLE (0-8), value = topic labels
  },
  sections: [
    { h: "Section heading", p: ["paragraph 1", "paragraph 2"], why: "...", code: "...", codeExplain: "...", table: {...}, analogy: "..." }
  ],
  quiz: [
    { q: "Question text?", opts: ["A","B","C","D"], correct: 1, explain: "..." }
  ]
}
```

## Adding or checking content

If you're updating one exam's content (say, adding a new topic to the Developer track after reviewing an updated exam guide):

1. Open **only** `data/developer.js` — you don't need the other three files open
2. Find the right domain object by its `id`, add a new entry to its `sections` array and a matching entry to its `quiz` array
3. If you want the new topic to show up in that domain's lifecycle diagram, add an entry to `archHighlights` pointing at the relevant step index in `AGENTIC_LIFECYCLE` (see `js/engine.js`)

### Sanity-checking your changes

Before committing, it's worth verifying you haven't broken a quiz's answer indices or the mock exam's question counts. A quick Node check:

```js
node -e "
global.currentTrack='dev'; global.document={getElementById:()=>({innerHTML:''}),querySelectorAll:()=>[]};
require('./data/developer.js'); require('./data/architect.js');
require('./data/associate.js'); require('./data/architect-professional.js');
require('./js/engine.js');
DOMAINS_DEV.forEach(d => d.quiz.forEach(q => {
  if (typeof q.correct !== 'number' || !q.opts[q.correct]) console.log('BAD Q in', d.id, q.q);
}));
console.log('checked', DOMAINS_DEV.reduce((s,d)=>s+d.quiz.length,0), 'questions');
"
```

(Note: `data/*.js` files use `const` at top level, so this exact snippet needs slight adjustment to avoid redeclaration errors if you run it more than once in the same Node REPL — running it fresh each time via `node -e "..."` as above is the simplest path.)

## Progress persistence

Progress (which sections you've read, your best quiz scores, mock exam history) is saved to the browser's `localStorage`, scoped per track. It's local to whatever browser/device you're using — there's no backend or account system.

## Disclaimer

This is an independent study resource. Exam formats, domain weights, and content can change — always confirm current details against Anthropic's official certification pages before relying on anything here as your sole prep material.
