/* Storage abstraction with fallback to localStorage */
if(!window.storage){
  window.storage = {
    get: async (key, encrypt) => {
      try{
        const val = localStorage.getItem(key);
        return val ? {value: val} : null;
      }catch(e){ return null; }
    },
    set: async (key, val, encrypt) => {
      try{ localStorage.setItem(key, val); return true; }catch(e){ return false; }
    }
  };
}

const TRACKS = {
  dev: { label:"Claude Certified Developer — Foundations", short:"CCDV-F", domains:DOMAINS_DEV,
         mockCounts:{d2:18,d5:9,d1:8,d6:6,d8:6,d7:4,d3:1,d4:1}, mockTotal:53, examMinutes:120, passPct:72 },
  arch: { label:"Claude Certified Architect — Foundations", short:"CCAR-F", domains:DOMAINS_ARCH,
          mockCounts:{a1:16,a2:12,a3:12,a4:11,a5:9}, mockTotal:60, examMinutes:120, passPct:72 },
  assoc: { label:"Claude Certified Associate — Foundations", short:"CCAO-F", domains:DOMAINS_ASSOC,
           mockCounts:{as2:13,as4:10,as6:9,as1:8,as3:7,as5:7,as7:6}, mockTotal:60, examMinutes:120, passPct:72 },
  prof: { label:"Claude Certified Architect — Professional", short:"CCAR-P", domains:DOMAINS_PROF,
          mockCounts:{p3:12,p1:11,p4:10,p5:9,p6:9,p2:8,p7:4}, mockTotal:63, examMinutes:120, passPct:72 }
};

/* ============================= APP STATE ============================= */
let progress = { dev:{readSections:{}, quizBest:{}, mockHistory:[]}, arch:{readSections:{}, quizBest:{}, mockHistory:[]}, assoc:{readSections:{}, quizBest:{}, mockHistory:[]}, prof:{readSections:{}, quizBest:{}, mockHistory:[]} };
let currentTrack = "dev";
let currentRoute = "home";
let currentMockState = null;

async function loadProgress(){
  try{
    const r = await window.storage.get('claude-cert-progress-v2', false);
    if(r && r.value){
      const loaded = JSON.parse(r.value);
      progress = Object.assign(progress, loaded);
    }
  }catch(e){}
}
async function saveProgress(){
  try{ await window.storage.set('claude-cert-progress-v2', JSON.stringify(progress), false); }catch(e){}
}
function P(){ return progress[currentTrack]; }
function T(){ return TRACKS[currentTrack]; }

function domainProgress(d){
  const total = d.sections.length + 1;
  let done = 0;
  d.sections.forEach((s,i)=>{ if(P().readSections[d.id+':'+i]) done++; });
  if((P().quizBest[d.id]||0) >= 70) done++;
  return {done, total, pct: Math.round((done/total)*100)};
}
function overallPct(){
  let sum=0;
  T().domains.forEach(d=> sum += domainProgress(d).pct);
  return Math.round(sum / T().domains.length);
}

function renderSidebar(){
  document.getElementById('brand-label').innerHTML = T().short + '<small>' + T().label + '</small>';
  document.querySelectorAll('.track-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.track===currentTrack);
    b.onclick = ()=>{ currentTrack = b.dataset.track; navigate('home'); };
  });
  const nav = document.getElementById('nav-domains');
  nav.innerHTML = T().domains.map(d=>{
    const p = domainProgress(d);
    const dotClass = p.pct===100?'done':(p.pct>0?'partial':'');
    return `<button class="nav-item ${currentRoute===d.id?'active':''}" data-route="${d.id}">
      <span class="dot ${dotClass}"></span> ${d.emoji} ${d.title.split(' ').slice(0,3).join(' ')}
      <span class="nav-badge ${p.pct===100?'done':''}">${p.pct}%</span>
    </button>`;
  }).join('');
  document.querySelectorAll('#nav-domains .nav-item').forEach(btn=> btn.onclick = ()=> navigate(btn.dataset.route));
  document.querySelector('[data-route="home"]').onclick = ()=> navigate('home');
  document.querySelector('[data-route="home"]').classList.toggle('active', currentRoute==='home');
  document.querySelector('[data-route="mock"]').onclick = ()=> navigate('mock');
  document.querySelector('[data-route="mock"]').classList.toggle('active', currentRoute==='mock');
  document.getElementById('progress-fill').style.width = overallPct()+'%';
  document.getElementById('progress-pct').textContent = overallPct()+'% ready — '+T().short;
}

function navigate(route){
  currentRoute = route;
  if(route==='home') renderHome();
  else if(route==='mock') renderMockIntro();
  else { const d = T().domains.find(x=>x.id===route); if(d) renderDomain(d); }
  renderSidebar();
  window.scrollTo(0,0);
}

function trackIcon(){ return currentTrack==='dev'?'👨‍💻':currentTrack==='arch'?'🏗️':currentTrack==='assoc'?'📋':'🎓'; }
function trackHomeDesc(){
  if(currentTrack==='dev') return "Go through each topic, read the plain-language explanations, try the practice questions, then take the full mock exam. Progress saves automatically.";
  if(currentTrack==='arch') return "Overview track for the Architect exam. Many concepts overlap with Developer — this track focuses on the architectural framing and the parts that go beyond Developer.";
  if(currentTrack==='assoc') return "Track for the Associate exam — a business-user-focused certification on using Claude effectively and responsibly, no coding required. Go through each topic, try the practice questions, then take the full mock exam.";
  return "Track for the Architect Professional exam — the senior/lead-level credential above Architect Foundations. Expect more emphasis on justifying tradeoffs, stakeholder communication, and end-to-end lifecycle ownership than pure recall.";
}
function renderHome(){
  const totalQ = T().domains.reduce((s,d)=>s+d.quiz.length,0);
  document.getElementById('content').innerHTML = `
    <h1 class="page-title">${trackIcon()} ${T().label}</h1>
    <p class="subtitle">${trackHomeDesc()}</p>
    <div class="stat-grid">
      <div class="stat"><div class="num">${overallPct()}%</div><div class="lbl">Overall ready</div></div>
      <div class="stat"><div class="num">${T().domains.length}</div><div class="lbl">Topics</div></div>
      <div class="stat"><div class="num">${totalQ}</div><div class="lbl">Practice questions</div></div>
    </div>
    <h2 style="font-family:var(--serif); font-size:1.2rem; margin:0 0 14px;">Your path</h2>
    <div class="path">
      ${T().domains.map(d=>{
        const p = domainProgress(d);
        return `<div class="path-item" data-route="${d.id}">
          <div class="path-num ${p.pct===100?'done':''}">${p.pct===100?'✓':d.emoji}</div>
          <div class="path-body">
            <div class="path-title">${d.title}</div>
            <div class="path-meta">${d.weight} of the exam &middot; ${p.pct}% ready</div>
          </div>
        </div>`;
      }).join('')}
      <div class="path-item" data-route="mock">
        <div class="path-num">📝</div>
        <div class="path-body">
          <div class="path-title">Full Mock Exam</div>
          <div class="path-meta">${T().mockTotal} questions, timed, weighted like the real thing</div>
        </div>
      </div>
    </div>`;
  document.querySelectorAll('.path-item').forEach(el=> el.onclick = ()=> navigate(el.dataset.route));
}

function renderTable(t){
  return `<table class="ref"><thead><tr>${t.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${t.rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const AGENTIC_LIFECYCLE = [
  {short:"User request", t:"User sends a request"},
  {short:"Coordinator", t:"Coordinator receives it — decomposes the task, decides what's needed"},
  {short:"Spawn Subagent", t:"Coordinator spawns a Subagent (Task Tool payload: description, prompt, allowed_tools, model)"},
  {short:"Subagent wants a Tool", t:"Subagent decides it needs a Tool — requests a tool_use call"},
  {short:"PreToolUse", t:"PreToolUse Hook fires — can block, modify, or approve before anything runs"},
  {short:"Tool executes", t:"Tool actually executes — built-in, custom, or an MCP server"},
  {short:"PostToolUse", t:"PostToolUse Hook fires — can validate, normalize, or log the real result"},
  {short:"Result → Coordinator", t:"Result flows back up: Subagent → Coordinator"},
  {short:"Final synthesis", t:"Coordinator synthesizes the final answer and returns it to the user"}
];

function renderLifecycle(d){
  if(!d.archHighlights) return '';
  const archClass = currentTrack==='arch' ? ' arch' : '';
  const hiIndices = Object.keys(d.archHighlights).map(Number).sort((a,b)=>a-b);
  const boxes = hiIndices.map((i,pos)=>{
    return `<div class="flow-node hi${archClass}">
      <span class="flow-badge">${pos+1}</span>
      <span>${AGENTIC_LIFECYCLE[i].short}</span>
    </div>`;
  }).join('');
  const captions = hiIndices.map((i,pos)=>{
    const topics = d.archHighlights[i].join(', ');
    return `<div class="flow-caption">
      <span class="flow-badge">${pos+1}</span>
      <span class="flow-caption-text"><b>${AGENTIC_LIFECYCLE[i].t}.</b> Covers: ${topics}.</span>
    </div>`;
  }).join('');
  return `<div class="lifecycle-wrap">
    <div class="lifecycle-label">Where this domain sits in the agentic lifecycle</div>
    <div class="lifecycle-sub">Every Claude-based system runs the same underlying loop — user request, coordinator, subagent, tool call gated by hooks, result, synthesis. Below is just the part of that loop THIS domain is actually about, in order.</div>
    <div class="flow-row">${boxes}</div>
    <div class="flow-captions">${captions}</div>
  </div>`;
}

function renderDomain(d){
  const pillClass = currentTrack==='arch' ? 'weight-pill arch' : 'weight-pill';
  let html = `
    <div class="${pillClass}">${d.weight} of the exam</div>
    <h1 class="page-title">${d.emoji} ${d.title}</h1>
    <p class="subtitle">${d.intro}</p>
    ${renderLifecycle(d)}
  `;
  d.sections.forEach((s,i)=>{
    const key = d.id+':'+i;
    const isRead = !!P().readSections[key];
    html += `<div class="card">
      <h2>${s.h}</h2>
      ${(s.p||[]).map(par=>`<p>${par}</p>`).join('')}
      ${s.table?renderTable(s.table):''}
      ${s.analogy?`<div class="analogy"><b>Think of it like this</b>${s.analogy}</div>`:''}
      ${s.why?`<div class="why"><b>Why it matters</b>${s.why}</div>`:''}
      ${s.why2?`<div class="why"><b>Common mistake</b>${s.why2}</div>`:''}
      ${s.deep?`<div class="deep"><b>Extra detail</b>${s.deep}</div>`:''}
      ${s.code?`<h3>Example</h3><pre><code>${escapeHtml(s.code)}</code></pre>`:''}
      ${s.codeExplain?`<p>${s.codeExplain}</p>`:''}
      <button class="mark-btn ${isRead?'done':''}" data-key="${key}">${isRead?'✓ Marked as understood':'Mark as understood'}</button>
    </div>`;
  });
  html += `<div class="card" id="quiz-card">
    <h2>Check your understanding</h2>
    <p style="margin-bottom:20px;">${d.quiz.length} questions. Answer them all, then see your score. 70%+ marks this topic's quiz complete.</p>
    <div id="quiz-body"></div>
  </div>`;
  document.getElementById('content').innerHTML = html;

  document.querySelectorAll('.mark-btn').forEach(btn=>{
    btn.onclick = async ()=>{
      const key = btn.dataset.key;
      P().readSections[key] = !P().readSections[key];
      btn.classList.toggle('done', P().readSections[key]);
      btn.textContent = P().readSections[key] ? '✓ Marked as understood' : 'Mark as understood';
      await saveProgress();
      renderSidebar();
    };
  });
  renderQuiz(d);
}

function shuffleOptions(q){
  const order = q.opts.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [order[i],order[j]] = [order[j],order[i]];
  }
  return {...q, opts:order.map(i=>q.opts[i]), correct:order.indexOf(q.correct)};
}

function renderQuiz(d){
  const body = document.getElementById('quiz-body');
  const quizShuffled = d.quiz.map(shuffleOptions);
  const answers = new Array(quizShuffled.length).fill(null);
  body.innerHTML = quizShuffled.map((q,qi)=>`
    <div class="quiz-q" data-qi="${qi}">
      <p class="qtext">${qi+1}. ${q.q}</p>
      ${q.opts.map((o,oi)=>`<button class="opt" data-oi="${oi}">${o}</button>`).join('')}
      <div class="explain"></div>
    </div>
  `).join('') + `<div id="quiz-result"></div>`;

  quizShuffled.forEach((q,qi)=>{
    const qEl = body.querySelector(`.quiz-q[data-qi="${qi}"]`);
    qEl.querySelectorAll('.opt').forEach(optBtn=>{
      optBtn.onclick = ()=>{
        if(answers[qi]!==null) return;
        const oi = parseInt(optBtn.dataset.oi);
        answers[qi] = oi;
        qEl.querySelectorAll('.opt').forEach(b=>{
          b.setAttribute('disabled','');
          const boi = parseInt(b.dataset.oi);
          if(boi === q.correct) b.classList.add('correct');
          else if(boi === oi) b.classList.add('wrong');
        });
        const ex = qEl.querySelector('.explain');
        ex.textContent = (oi===q.correct?'✓ Correct. ':'✗ Not quite. ') + q.explain;
        ex.classList.add('show');
        checkQuizDone();
      };
    });
  });

  async function checkQuizDone(){
    if(answers.every(a=>a!==null)){
      const correctCount = answers.filter((a,i)=>a===quizShuffled[i].correct).length;
      const pct = Math.round((correctCount/quizShuffled.length)*100);
      P().quizBest[d.id] = Math.max(P().quizBest[d.id]||0, pct);
      await saveProgress();
      renderSidebar();
      document.getElementById('quiz-result').innerHTML = `
        <div class="quiz-summary">
          <b>${correctCount} / ${quizShuffled.length} correct (${pct}%)</b>
          ${pct>=70? "Nice — this topic's quiz is marked complete." : "Below 70% — consider re-reading the sections above, then retry."}
          <div style="margin-top:12px;"><button class="ghost-btn" id="retry-quiz">Retry quiz</button></div>
        </div>`;
      document.getElementById('retry-quiz').onclick = ()=> renderQuiz(d);
    }
  }
}

/* ---------- Mock Exam ---------- */
function buildMockExam(){
  const counts = T().mockCounts;
  let pool = [];
  T().domains.forEach(d=>{
    const need = counts[d.id] || 0;
    if(need<=0) return;
    let items = d.quiz.map(q=>({...q, domain:d.title}));
    let chosen = [];
    while(chosen.length < need){ chosen = chosen.concat(items.sort(()=>Math.random()-0.5)); }
    chosen = chosen.slice(0, need);
    pool = pool.concat(chosen);
  });
  return pool.sort(()=>Math.random()-0.5).map(shuffleOptions);
}

function renderMockIntro(){
  const history = P().mockHistory || [];
  document.getElementById('content').innerHTML = `
    <h1 class="page-title">📝 Full Mock Exam — ${T().short}</h1>
    <p class="subtitle">${T().mockTotal} questions, weighted like the real blueprint. Real exam is ${T().examMinutes} minutes — this timer matches it.</p>
    <div class="card">
      <h2>Ready when you are</h2>
      <p>Answer each question and move through all ${T().mockTotal}. You can jump between questions freely. At the end you'll get your score and a breakdown by topic.</p>
      <button class="big-btn" id="start-mock">Start timed mock exam (${T().examMinutes}:00)</button>
    </div>
    ${history.length? `<div class="card"><h2>Past attempts</h2>${history.slice().reverse().map(h=>`<p>${new Date(h.date).toLocaleString()} — <b>${h.score}/${T().mockTotal} (${h.pct}%)</b> ${h.pct>=T().passPct?'— pass zone (720+ equivalent)':''}</p>`).join('')}</div>`:''}
  `;
  document.getElementById('start-mock').onclick = startMock;
}

function startMock(){
  currentMockState = {
    questions: buildMockExam(),
    answers: new Array(T().mockTotal).fill(null),
    idx: 0,
    endsAt: Date.now() + T().examMinutes*60*1000
  };
  renderMockQuestion();
  currentMockState.timerInterval = setInterval(tickMockTimer, 1000);
}

function tickMockTimer(){
  const el = document.getElementById('mock-timer');
  if(!el || !currentMockState) return;
  const remaining = Math.max(0, currentMockState.endsAt - Date.now());
  const m = Math.floor(remaining/60000), s = Math.floor((remaining%60000)/1000);
  el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
  if(remaining<=0){ clearInterval(currentMockState.timerInterval); finishMock(); }
}

function renderMockQuestion(){
  const st = currentMockState;
  const total = T().mockTotal;
  const q = st.questions[st.idx];
  document.getElementById('content').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
      <h1 class="page-title" style="margin:0;">Question ${st.idx+1} / ${total}</h1>
      <div class="timer" id="mock-timer">--:--</div>
    </div>
    <div class="exam-nav">${st.questions.map((qq,i)=>`<button class="${st.answers[i]!==null?'answered':''} ${i===st.idx?'current':''}" data-i="${i}">${i+1}</button>`).join('')}</div>
    <div class="card">
      <div class="${currentTrack==='arch'?'weight-pill arch':'weight-pill'}">${q.domain}</div>
      <p class="qtext" style="font-size:1.05rem;">${q.q}</p>
      ${q.opts.map((o,oi)=>`<button class="opt" style="${st.answers[st.idx]===oi?'border-color:var(--accent);background:var(--accent-soft);':''}" data-oi="${oi}">${o}</button>`).join('')}
    </div>
    <div style="display:flex; justify-content:space-between; margin-top:20px;">
      <button class="ghost-btn" id="mock-prev" ${st.idx===0?'disabled':''}>← Previous</button>
      ${st.idx===total-1 ? `<button class="big-btn" id="mock-submit">Submit exam</button>` : `<button class="big-btn" id="mock-next">Next →</button>`}
    </div>
  `;
  tickMockTimer();
  document.querySelectorAll('.exam-nav button').forEach(b=> b.onclick=()=>{ st.idx=parseInt(b.dataset.i); renderMockQuestion(); });
  document.querySelectorAll('#content .opt').forEach(b=> b.onclick=()=>{ st.answers[st.idx]=parseInt(b.dataset.oi); renderMockQuestion(); });
  const prev = document.getElementById('mock-prev'); if(prev) prev.onclick=()=>{ st.idx--; renderMockQuestion(); };
  const next = document.getElementById('mock-next'); if(next) next.onclick=()=>{ st.idx++; renderMockQuestion(); };
  const submit = document.getElementById('mock-submit'); if(submit) submit.onclick=finishMock;
}

async function finishMock(){
  if(currentMockState.timerInterval) clearInterval(currentMockState.timerInterval);
  const st = currentMockState;
  const total = T().mockTotal;
  let correct=0;
  const byDomain = {};
  st.questions.forEach((q,i)=>{
    const got = st.answers[i]===q.correct;
    if(got) correct++;
    byDomain[q.domain] = byDomain[q.domain] || {c:0,t:0};
    byDomain[q.domain].t++;
    if(got) byDomain[q.domain].c++;
  });
  const pct = Math.round((correct/total)*100);
  P().mockHistory = P().mockHistory || [];
  P().mockHistory.push({date:Date.now(), score:correct, pct});
  await saveProgress();

  document.getElementById('content').innerHTML = `
    <h1 class="page-title">Exam complete</h1>
    <div class="card" style="text-align:center;">
      <div style="font-family:var(--serif); font-size:3rem; font-weight:700; color:${pct>=T().passPct?'var(--good)':'var(--bad)'};">${correct}/${total}</div>
      <p style="font-size:1.1rem;">${pct}% correct ${pct>=T().passPct? "— you're in the pass zone (roughly 720+ scaled score territory)" : "— below the typical pass zone, keep studying the weaker topics below"}</p>
    </div>
    <div class="card">
      <h2>Score by topic</h2>
      ${Object.entries(byDomain).map(([name,v])=>{
        const p = Math.round((v.c/v.t)*100);
        return `<div style="margin-bottom:12px;"><div style="display:flex; justify-content:space-between; font-size:.9rem; margin-bottom:4px;"><span>${name}</span><span>${v.c}/${v.t} (${p}%)</span></div><div class="progress-shell"><div class="progress-fill" style="width:${p}%;"></div></div></div>`;
      }).join('')}
    </div>
    <div style="display:flex; gap:12px;">
      <button class="big-btn" id="back-home">Back to home</button>
      <button class="ghost-btn" id="retry-mock">Take another mock exam</button>
    </div>
  `;
  document.getElementById('back-home').onclick = ()=> navigate('home');
  document.getElementById('retry-mock').onclick = startMock;
  renderSidebar();
}

/* ---------- init ---------- */
(async function init(){
  await loadProgress();
  renderSidebar();
  navigate('home');
})();
