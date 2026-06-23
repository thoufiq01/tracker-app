const API = 'http://localhost:3000/api';
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

let goals = {};
let logs  = {};
let charts = {};
let calYear, calMonth;
let analyticsPeriod = 'alltime';
let selectedDate = null; // currently selected date for logging

/* ── helpers ── */
function pad(n) { return String(n).padStart(2,'0'); }
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function getWeekKeys() {
  const keys=[], today=new Date();
  for(let i=6;i>=0;i--){ const d=new Date(today); d.setDate(d.getDate()-i); keys.push(dateKey(d)); }
  return keys;
}
function getPeriodKeys() {
  if (analyticsPeriod === 'week') return getWeekKeys();
  if (analyticsPeriod === 'month') {
    const today=new Date(), keys=[];
    const year=today.getFullYear(), month=today.getMonth();
    const days=new Date(year,month+1,0).getDate();
    for(let d=1;d<=days;d++){
      const dd=new Date(year,month,d);
      if(dd<=today) keys.push(dateKey(dd));
    }
    return keys;
  }
  // all time — return all keys in logs sorted
  return Object.keys(logs).sort();
}

/* ── API ── */
async function fetchAll() {
  const [g, l] = await Promise.all([
    fetch(`${API}/goals`).then(r=>r.json()),
    fetch(`${API}/logs`).then(r=>r.json())
  ]);
  goals=g; logs=l;
}
async function postLog(habit, value, meta) {
  const res=await fetch(`${API}/log`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({date:selectedDate,habit,value,meta})
  });
  const data=await res.json();
  if(!logs[selectedDate]) logs[selectedDate]={};
  logs[selectedDate]=data.day;
}
async function deleteLog(date, habit, idx) {
  await fetch(`${API}/log`,{
    method:'DELETE', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({date,habit,entryIndex:idx})
  });
  logs=await fetch(`${API}/logs`).then(r=>r.json());
  renderAll();
}

/* ── colours ── */
const CBG  ={gym:'teal-bg', dsa:'blue-bg', webdev:'purple-bg', content:'pink-bg', food:'amber-bg', study:'orange-bg'};
const CTXT ={gym:'teal-text',dsa:'blue-text',webdev:'purple-text',content:'pink-text',food:'amber-text', study:'orange-text'};
const ICONS ={gym:'🏋️',dsa:'💻',webdev:'🌐',content:'🎬',food:'🥗',study:'📚'};
function cbg(k){ return `var(--${CBG[k]||'border'})`; }
function ctxt(k){ return `var(--${CTXT[k]||'text-2'})`; }
function icon(k){ return ICONS[k]||'📌'; }

/* ── streaks ── */
function calcStreak(key) {
  let s=0; const today=new Date();
  for(let i=0;i<730;i++){
    const d=new Date(today); d.setDate(d.getDate()-i);
    if(logs[dateKey(d)]?.[key]?.total>0) s++;
    else break;
  }
  return s;
}
function calcBestStreak(key) {
  const sorted=Object.keys(logs).sort();
  let best=0,cur=0,prev=null;
  sorted.forEach(k=>{
    if(logs[k]?.[key]?.total>0){
      if(prev){ const diff=(new Date(k+'T00:00:00')-new Date(prev+'T00:00:00'))/86400000; cur=diff===1?cur+1:1; }
      else cur=1;
      if(cur>best) best=cur;
      prev=k;
    } else { cur=0; prev=null; }
  });
  return best;
}

function renderDateHeader() {
  const d = new Date(selectedDate + 'T00:00:00');
  const isToday = selectedDate === todayKey();
  const label = d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('today-date').textContent = isToday ? label : `📅 ${label}`;
  const picker = document.getElementById('date-picker');
  if (picker) picker.value = selectedDate;
}

/* ── CARDS ── */
function renderCards() {
  const grid=document.getElementById('cards-grid');
  grid.innerHTML='';

  const isToday = selectedDate === todayKey();
  const dateBanner = !isToday ? `<div class="past-date-banner">Logging for: ${new Date(selectedDate+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>` : '';
  if (dateBanner) {
    const banner = document.createElement('div');
    banner.innerHTML = dateBanner;
    grid.appendChild(banner.firstElementChild);
  }

  Object.keys(goals).forEach(key=>{
    const g=goals[key];
    const val=(logs[selectedDate]?.[key]?.total)||0;
    const pct=Math.min(100,Math.round((val/g.goal)*100));
    const s=calcStreak(key);
    const card=document.createElement('div');
    card.className='habit-card';

    if(key==='gym'){
      /* GYM — two inputs: workout + walking */
      const walkVal=(logs[selectedDate]?.['gym_walk']?.total)||0;
      const walkGoal=g.walking?.goal||30;
      const walkPct=Math.min(100,Math.round((walkVal/walkGoal)*100));
      card.innerHTML=`
        <div class="card-head">
          <div class="card-icon" style="background:${cbg(key)}">${icon(key)}</div>
          <div><div class="card-title">${g.label}</div><div class="card-sub">Workout ${g.goal}min · Walk ${walkGoal}min</div></div>
          <div class="card-streak" style="background:${cbg(key)};color:${ctxt(key)}">🔥 ${s}d</div>
        </div>
        <div class="card-inputs">
          <div class="gym-section-label">Workout</div>
          <div class="input-row">
            <input type="number" id="inp-gym" placeholder="${g.goal}" min="0"/>
            <span class="unit">min</span>
            <button class="log-btn" id="log-gym-btn">Log</button>
          </div>
          <div class="gym-divider"></div>
          <div class="gym-section-label">Walking 🚶</div>
          <div class="input-row">
            <input type="number" id="inp-gymwalk" placeholder="${walkGoal}" min="0"/>
            <span class="unit">min</span>
            <button class="log-btn" id="log-gymwalk-btn" style="background:#0F6E56">Log</button>
          </div>
        </div>
        <div class="progress-wrap dual">
          <div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${g.color}"></div></div>
            <div class="progress-meta"><span>Workout: ${Math.round(val)}min</span><span>${pct}%</span></div>
          </div>
          <div>
            <div class="progress-bar"><div class="progress-fill" style="width:${walkPct}%;background:#0F6E56"></div></div>
            <div class="progress-meta"><span>Walk: ${Math.round(walkVal)}min</span><span>${walkPct}%</span></div>
          </div>
        </div>`;
      grid.appendChild(card);
      document.getElementById('log-gym-btn').addEventListener('click',()=>logSimple('gym'));
      document.getElementById('log-gymwalk-btn').addEventListener('click',()=>logSimple('gym_walk'));
      document.getElementById('inp-gym').addEventListener('keydown',e=>{ if(e.key==='Enter') logSimple('gym'); });
      document.getElementById('inp-gymwalk').addEventListener('keydown',e=>{ if(e.key==='Enter') logSimple('gym_walk'); });
      return;
    }

    if(key==='food'){
      const macroSum=buildMacroSummary();
      card.innerHTML=`
        <div class="card-head">
          <div class="card-icon" style="background:${cbg(key)}">${icon(key)}</div>
          <div><div class="card-title">${g.label}</div><div class="card-sub">Goal: ${g.goal} kcal/day</div></div>
          <div class="card-streak" style="background:${cbg(key)};color:${ctxt(key)}">🔥 ${s}d</div>
        </div>
        <div class="card-inputs">
          <div class="input-row"><label>Meal</label><input type="text" id="inp-food-name" placeholder="e.g. Rice bowl"/></div>
          <div class="input-row"><label>Calories</label><input type="number" id="inp-food-kcal" placeholder="500" min="0"/><span class="unit">kcal</span></div>
          <div class="macro-grid">
            <div class="macro-item"><label>Protein</label><input type="number" id="inp-food-protein" placeholder="0" min="0"/>g</div>
            <div class="macro-item"><label>Carbs</label><input type="number" id="inp-food-carbs" placeholder="0" min="0"/>g</div>
            <div class="macro-item"><label>Fats</label><input type="number" id="inp-food-fats" placeholder="0" min="0"/>g</div>
          </div>
          <div class="input-row" style="margin-top:6px"><button class="log-btn" id="log-food-btn">Log meal</button></div>
        </div>
        ${macroSum}
        <div class="progress-wrap">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${g.color}"></div></div>
          <div class="progress-meta"><span>${Math.round(val)} kcal</span><span>${pct}%</span></div>
        </div>`;
      grid.appendChild(card);
      document.getElementById('log-food-btn').addEventListener('click',logFood);
      ['inp-food-kcal','inp-food-protein','inp-food-carbs','inp-food-fats','inp-food-name'].forEach(id=>{
        document.getElementById(id)?.addEventListener('keydown',e=>{ if(e.key==='Enter') logFood(); });
      });
      return;
    }

    if(key==='study'){
      const sessionVal=(logs[selectedDate]?.['study_sessions']?.total)||0;
      const sessionGoal=g.sessions?.goal||4;
      const sessionPct=Math.min(100,Math.round((sessionVal/sessionGoal)*100));
      card.innerHTML=`
        <div class="card-head">
          <div class="card-icon" style="background:${cbg(key)}">${icon(key)}</div>
          <div><div class="card-title">${g.label}</div><div class="card-sub">Focus ${g.goal}min · Sessions ${sessionGoal}</div></div>
          <div class="card-streak" style="background:${cbg(key)};color:${ctxt(key)}">🔥 ${s}d</div>
        </div>
        <div class="card-inputs">
          <div class="gym-section-label">Focus Time</div>
          <div class="input-row">
            <input type="number" id="inp-study" placeholder="${g.goal}" min="0"/>
            <span class="unit">min</span>
            <button class="log-btn" id="log-study-btn">Log</button>
          </div>
          <div class="gym-divider"></div>
          <div class="gym-section-label">Sessions 🎯</div>
          <div class="input-row">
            <input type="number" id="inp-study-sessions" placeholder="${sessionGoal}" min="0"/>
            <span class="unit">done</span>
            <button class="log-btn" id="log-study-sessions-btn" style="background:#C2410C">Log</button>
          </div>
        </div>
        <div class="progress-wrap dual">
          <div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${g.color}"></div></div>
            <div class="progress-meta"><span>Focus: ${Math.round(val)}min</span><span>${pct}%</span></div>
          </div>
          <div>
            <div class="progress-bar"><div class="progress-fill" style="width:${sessionPct}%;background:#C2410C"></div></div>
            <div class="progress-meta"><span>Sessions: ${Math.round(sessionVal)}</span><span>${sessionPct}%</span></div>
          </div>
        </div>`;
      grid.appendChild(card);
      document.getElementById('log-study-btn').addEventListener('click',()=>logSimple('study'));
      document.getElementById('log-study-sessions-btn').addEventListener('click',()=>logSimple('study_sessions'));
      document.getElementById('inp-study').addEventListener('keydown',e=>{ if(e.key==='Enter') logSimple('study'); });
      document.getElementById('inp-study-sessions').addEventListener('keydown',e=>{ if(e.key==='Enter') logSimple('study_sessions'); });
      return;
    }

    /* standard card */
    card.innerHTML=`
      <div class="card-head">
        <div class="card-icon" style="background:${cbg(key)}">${icon(key)}</div>
        <div><div class="card-title">${g.label}</div><div class="card-sub">Goal: ${g.goal} ${g.unit}/day</div></div>
        <div class="card-streak" style="background:${cbg(key)};color:${ctxt(key)}">🔥 ${s}d</div>
      </div>
      <div class="card-inputs">
        <div class="input-row">
          <input type="number" id="inp-${key}" placeholder="${g.goal}" min="0"/>
          <span class="unit">${g.unit}</span>
          <button class="log-btn" data-key="${key}">Log</button>
        </div>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${g.color}"></div></div>
        <div class="progress-meta"><span>${Math.round(val)} ${g.unit}</span><span>${pct}%</span></div>
      </div>`;
    grid.appendChild(card);
    card.querySelector(`[data-key="${key}"]`).addEventListener('click',()=>logSimple(key));
    document.getElementById(`inp-${key}`)?.addEventListener('keydown',e=>{ if(e.key==='Enter') logSimple(key); });
  });
}

function buildMacroSummary() {
  const entries=logs[selectedDate]?.food?.entries||[];
  let protein=0,carbs=0,fats=0;
  entries.forEach(e=>{ if(e.meta){ protein+=e.meta.protein||0; carbs+=e.meta.carbs||0; fats+=e.meta.fats||0; } });
  const mg=goals.food?.macros||{protein:150,carbs:250,fats:70};
  if(!protein&&!carbs&&!fats) return '';
  return `<div class="macro-summary">
    <div class="macro-tag"><div class="macro-tag-label">Protein</div><div style="font-weight:500;color:var(--teal-text)">${Math.round(protein)}g <span style="color:var(--text-3);font-weight:400">/ ${mg.protein}g</span></div></div>
    <div class="macro-tag"><div class="macro-tag-label">Carbs</div><div style="font-weight:500;color:var(--blue-text)">${Math.round(carbs)}g <span style="color:var(--text-3);font-weight:400">/ ${mg.carbs}g</span></div></div>
    <div class="macro-tag"><div class="macro-tag-label">Fats</div><div style="font-weight:500;color:var(--amber-text)">${Math.round(fats)}g <span style="color:var(--text-3);font-weight:400">/ ${mg.fats}g</span></div></div>
  </div>`;
}

/* ── LOG ── */
async function logSimple(key) {
  const inputId = key==='gym_walk'?'inp-gymwalk':key==='study_sessions'?'inp-study-sessions':`inp-${key}`;
  const inp=document.getElementById(inputId);
  const val=parseFloat(inp.value);
  if(!val||val<=0){ inp.focus(); return; }
  if(key==='gym_walk'){
    await postLog('gym_walk',val,null);
  } else {
    await postLog(key,val,null);
  }
  inp.value='';
  renderAll();
}

async function logFood() {
  const kcal=parseFloat(document.getElementById('inp-food-kcal').value)||0;
  if(kcal<=0){ document.getElementById('inp-food-kcal').focus(); return; }
  const meta={
    meal:document.getElementById('inp-food-name').value||'Meal',
    protein:parseFloat(document.getElementById('inp-food-protein').value)||0,
    carbs:parseFloat(document.getElementById('inp-food-carbs').value)||0,
    fats:parseFloat(document.getElementById('inp-food-fats').value)||0
  };
  await postLog('food',kcal,meta);
  ['inp-food-name','inp-food-kcal','inp-food-protein','inp-food-carbs','inp-food-fats']
    .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  renderAll();
}

/* ── WEEK ROW ── */
function renderWeek() {
  const row=document.getElementById('week-row');
  const trackedKeys=Object.keys(goals);
  const total=trackedKeys.length;
  row.innerHTML='';
  getWeekKeys().forEach(k=>{
    const d=new Date(k+'T00:00:00');
    const done=trackedKeys.filter(h=>logs[k]?.[h]?.total>0).length;
    const ratio=total>0?done/total:0;
    let cls='week-dot';
    if(ratio>0&&ratio<=0.25) cls+=' p1';
    else if(ratio>0.25&&ratio<=0.5) cls+=' p2';
    else if(ratio>0.5&&ratio<1) cls+=' p3';
    else if(ratio===1) cls+=' full';
    const isSelected = k === selectedDate;
    const col=document.createElement('div'); col.className='week-day' + (isSelected?' week-day-selected':'');
    col.innerHTML=`<div class="week-day-label">${DAYS[d.getDay()]}</div><div class="${cls}">${done||''}</div>`;
    col.style.cursor='pointer';
    col.title=`Log for ${d.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`;
    col.addEventListener('click',()=>{
      selectedDate = k;
      document.getElementById('date-picker').value = k;
      renderAll();
      renderDateHeader();
    });
    row.appendChild(col);
  });
}

/* ── ANALYTICS ── */
function renderStats() {
  const keys=getPeriodKeys();
  const periodLabel = analyticsPeriod==='alltime'?'All time':analyticsPeriod==='month'?'This month':'Last 7d';
  const allHabits=[...Object.keys(goals),'gym_walk','study_sessions'];
  document.getElementById('stats-row').innerHTML = allHabits.map(key=>{
    const g=goals[key];
    const label=key==='gym_walk'?'Walking':key==='study_sessions'?'Study Sessions':g?.label||key;
    const color=key==='gym_walk'?'#0F6E56':key==='study_sessions'?'#C2410C':g?.color||'#888';
    const unit=key==='gym_walk'?'min':key==='study_sessions'?'sessions':g?.unit||'';
    const total=keys.reduce((s,k)=>s+(logs[k]?.[key]?.total||0),0);
    return `<div class="stat-card">
      <div class="stat-label">${label} · ${periodLabel}</div>
      <div><span class="stat-val" style="color:${color}">${Math.round(total)}</span><span class="stat-unit">${unit}</span></div>
    </div>`;
  }).join('');
}

function renderCharts() {
  const grid=document.getElementById('charts-grid');
  grid.innerHTML='';
  const keys=getPeriodKeys();
  const allHabits=[...Object.keys(goals),'gym_walk','study_sessions'];

  const displayKeys = keys.length>60 ? keys.slice(-60) : keys;
  const labels=displayKeys.map(k=>{
    const d=new Date(k+'T00:00:00');
    return keys.length<=14 ? DAYS[d.getDay()] : `${d.getDate()}/${d.getMonth()+1}`;
  });

  allHabits.forEach(key=>{
    const g=goals[key];
    const label=key==='gym_walk'?'Walking 🚶':key==='study_sessions'?'Study Sessions 🎯':g?.label||key;
    const color=key==='gym_walk'?'#0F6E56':key==='study_sessions'?'#C2410C':g?.color||'#888';
    const unit=key==='gym_walk'?'min':key==='study_sessions'?'sessions':g?.unit||'';
    const goalLine=key==='gym_walk'?(goals.gym?.walking?.goal||30):key==='study_sessions'?(goals.study?.sessions?.goal||4):g?.goal||0;
    const data=displayKeys.map(k=>(logs[k]?.[key]?.total)||0);
    const card=document.createElement('div'); card.className='chart-card';
    card.innerHTML=`<div class="chart-title">${label}</div><div style="position:relative;height:155px"><canvas id="chart-${key}"></canvas></div>`;
    grid.appendChild(card);
    requestAnimationFrame(()=>{
      if(charts[key]) charts[key].destroy();
      charts[key]=new Chart(document.getElementById(`chart-${key}`),{
        type:'bar',
        data:{labels,datasets:[
          {data,backgroundColor:color+'44',borderColor:color,borderWidth:1.5,borderRadius:3,barPercentage:.7},
          {type:'line',data:displayKeys.map(()=>goalLine),borderColor:color,borderDash:[4,4],borderWidth:1.5,pointRadius:0,fill:false}
        ]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{
            x:{grid:{display:false},ticks:{font:{size:10},maxTicksLimit:12,maxRotation:0}},
            y:{grid:{color:'rgba(128,128,128,.07)'},ticks:{font:{size:10},maxTicksLimit:4}}
          }
        }
      });
    });
  });
}

/* ── HISTORY ── */
function renderHistory() {
  const list=document.getElementById('history-list');
  const filter=document.getElementById('history-filter').value;
  const all=[];
  Object.keys(logs).sort().reverse().forEach(dk=>{
    const habitsToShow=filter==='all'?[...Object.keys(goals),'gym_walk','study_sessions']:[filter];
    habitsToShow.forEach(h=>{
      (logs[dk]?.[h]?.entries||[]).forEach((e,idx)=>all.push({dk,h,e,idx}));
    });
  });
  if(!all.length){ list.innerHTML='<div class="empty">No entries yet.</div>'; return; }
  list.innerHTML=''; let lastDate='';
  all.forEach(({dk,h,e,idx})=>{
    const g=goals[h];
    const label=h==='gym_walk'?'Walking 🚶':h==='study_sessions'?'Study Sessions 🎯':g?.label||h;
    const color=h==='gym_walk'?'#0F6E56':h==='study_sessions'?'#C2410C':g?.color||'#888';
    const unit=h==='gym_walk'?'min':h==='study_sessions'?'sessions':g?.unit||'';
    if(dk!==lastDate){
      const lbl=document.createElement('div'); lbl.className='history-group-label';
      lbl.textContent=new Date(dk+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
      list.appendChild(lbl); lastDate=dk;
    }
    const t=new Date(e.ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    let txt=h==='food'
      ?`${e.meta?.meal||'Meal'} — ${Math.round(e.value)} kcal`+(e.meta?.protein?` · P:${Math.round(e.meta.protein)}g C:${Math.round(e.meta.carbs||0)}g F:${Math.round(e.meta.fats||0)}g`:'')
      :`${label} — ${Math.round(e.value)} ${unit}`;
    const item=document.createElement('div'); item.className='history-item';
    item.innerHTML=`<div class="history-dot" style="background:${color}"></div><div class="history-text">${txt}</div><div class="history-meta">${t}</div><button class="history-del" data-dk="${dk}" data-h="${h}" data-idx="${idx}">×</button>`;
    list.appendChild(item);
  });
  list.querySelectorAll('.history-del').forEach(btn=>{
    btn.addEventListener('click',()=>deleteLog(btn.dataset.dk,btn.dataset.h,parseInt(btn.dataset.idx)));
  });
}

/* ── STREAK TAB ── */
function renderStreakTab() {
  const allKeys=[...Object.keys(goals),'gym_walk','study_sessions'];
  document.getElementById('streak-summary').innerHTML=allKeys.map(key=>{
    const g=goals[key];
    const label=key==='gym_walk'?'Walking 🚶':key==='study_sessions'?'Study Sessions 🎯':g?.label||key;
    const color=key==='gym_walk'?'#0F6E56':key==='study_sessions'?'#C2410C':g?.color||'#888';
    const s=calcStreak(key), b=calcBestStreak(key);
    return `<div class="streak-stat">
      <div class="streak-stat-label">${label}</div>
      <div><span class="streak-stat-val" style="color:${color}">${s}</span><span class="streak-stat-unit">d streak</span></div>
      <div class="streak-best">Best: ${b}d</div>
    </div>`;
  }).join('');
  renderCalendar();
}

/* ── CALENDAR ── */
function renderCalendar() {
  const today=new Date();
  if(calYear===undefined){ calYear=today.getFullYear(); calMonth=today.getMonth(); }
  document.getElementById('cal-month-label').textContent=`${MONTHS[calMonth]} ${calYear}`;

  const calGrid=document.getElementById('cal-grid');
  calGrid.innerHTML='';

  const allTracked=[...Object.keys(goals),'gym_walk','study_sessions'];
  const total=allTracked.length;

  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();

  for(let i=0;i<firstDay;i++){
    const e=document.createElement('div'); e.className='cal-cell empty'; calGrid.appendChild(e);
  }

  for(let day=1;day<=daysInMonth;day++){
    const d=new Date(calYear,calMonth,day);
    const k=dateKey(d);
    const done=allTracked.filter(h=>logs[k]?.[h]?.total>0).length;
    const ratio=total>0?done/total:0;

    let shade='';
    if(done===0) shade='';
    else if(done===total) shade='g4';
    else if(ratio>0.5) shade='g3';
    else if(ratio>=0.25) shade='g2';
    else shade='g1';

    const cell=document.createElement('div');
    const isSelected = k === selectedDate;
    cell.className=`cal-cell${shade?' '+shade:''}${k===todayKey()?' is-today':''}${isSelected?' is-selected':''}`;
    cell.textContent=day;
    cell.style.cursor='pointer';
    cell.title=`Log for this day${done>0?`\n${done}/${total} tasks done`:''}`;
    cell.addEventListener('click',()=>{
      selectedDate = k;
      document.getElementById('date-picker').value = k;
      renderAll();
      renderDateHeader();
      // switch to log tab
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
      document.querySelector('[data-tab="log"]').classList.add('active');
      document.getElementById('tab-log').classList.add('active');
    });
    if(done>0){
      const detail=allTracked.filter(h=>logs[k]?.[h]?.total>0)
        .map(h=>{ const g=goals[h]; return h==='gym_walk'?`Walking: ${logs[k][h].total}min`:h==='study_sessions'?`Study Sessions: ${logs[k][h].total}`:`${g?.label||h}: ${logs[k][h].total} ${g?.unit||''}`; })
        .join('\n');
      cell.title=`Click to log for this day\n${done}/${total} tasks done\n${detail}`;
    }
    calGrid.appendChild(cell);
  }
}

/* ── GOALS MODAL ── */
function renderGoalsModal() {
  document.getElementById('goals-form').innerHTML=Object.keys(goals).map(key=>{
    const g=goals[key];
    let extra='';
    if(key==='gym'){
      extra=`<div class="goal-field"><label>Walk goal</label><input type="number" data-key="gym" data-sub="walking.goal" value="${g.walking?.goal||30}" min="0"/><span class="unit-lbl">min</span></div>`;
    }
    if(key==='study'){
      extra=`<div class="goal-field"><label>Sessions goal</label><input type="number" data-key="study" data-sub="sessions.goal" value="${g.sessions?.goal||4}" min="0"/><span class="unit-lbl">sessions</span></div>`;
    }
    if(key==='food'){
      extra=`
        <div class="goal-field"><label>Protein goal</label><input type="number" data-key="food" data-macro="protein" value="${g.macros?.protein||150}" min="0"/><span class="unit-lbl">g</span></div>
        <div class="goal-field"><label>Carbs goal</label><input type="number" data-key="food" data-macro="carbs" value="${g.macros?.carbs||250}" min="0"/><span class="unit-lbl">g</span></div>
        <div class="goal-field"><label>Fats goal</label><input type="number" data-key="food" data-macro="fats" value="${g.macros?.fats||70}" min="0"/><span class="unit-lbl">g</span></div>`;
    }
    return `<div class="goal-group">
      <div class="goal-group-title"><span class="goal-badge" style="background:${g.color}"></span>${g.label}</div>
      <div class="goal-field"><label>Daily goal</label><input type="number" data-key="${key}" data-field="goal" value="${g.goal}" min="0"/><span class="unit-lbl">${g.unit}</span></div>
      ${extra}
    </div>`;
  }).join('');
}

async function saveGoals() {
  const updates={};
  document.querySelectorAll('#goals-form input').forEach(inp=>{
    const key=inp.dataset.key, field=inp.dataset.field, macro=inp.dataset.macro, sub=inp.dataset.sub;
    if(!updates[key]) updates[key]={};
    if(field) updates[key][field]=parseFloat(inp.value);
    if(macro){ if(!updates[key].macros) updates[key].macros={}; updates[key].macros[macro]=parseFloat(inp.value); }
    if(sub==='walking.goal'){ if(!updates[key].walking) updates[key].walking={}; updates[key].walking.goal=parseFloat(inp.value); }
    if(sub==='sessions.goal'){ if(!updates[key].sessions) updates[key].sessions={}; updates[key].sessions.goal=parseFloat(inp.value); }
  });
  const data=await fetch(`${API}/goals`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)}).then(r=>r.json());
  goals=data.goals;
  closeGoalsModal();
  renderAll();
}

function openGoalsModal(){ renderGoalsModal(); document.getElementById('goals-modal').style.display='flex'; }
function closeGoalsModal(){ document.getElementById('goals-modal').style.display='none'; }

/* ── RENDER ALL ── */
function renderAll() {
  renderDateHeader();
  renderCards();
  renderWeek();
  const tab=document.querySelector('.tab-content.active')?.id;
  if(tab==='tab-analytics'){ renderStats(); renderCharts(); }
  if(tab==='tab-history')   renderHistory();
  if(tab==='tab-streak')    renderStreakTab();
}

/* ── EVENTS ── */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if(btn.dataset.tab==='analytics'){ renderStats(); renderCharts(); }
    if(btn.dataset.tab==='history')   renderHistory();
    if(btn.dataset.tab==='streak')    renderStreakTab();
  });
});

document.querySelectorAll('.period-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    analyticsPeriod=btn.dataset.period;
    renderStats(); renderCharts();
  });
});

document.getElementById('history-filter').addEventListener('change',renderHistory);
document.getElementById('cal-prev').addEventListener('click',()=>{ calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); });
document.getElementById('cal-next').addEventListener('click',()=>{ calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); });
document.getElementById('btn-goals').addEventListener('click',openGoalsModal);
document.getElementById('close-goals').addEventListener('click',closeGoalsModal);
document.getElementById('goals-modal').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeGoalsModal(); });
document.getElementById('save-goals').addEventListener('click',saveGoals);

/* ── DATE PICKER ── */
document.getElementById('date-picker').addEventListener('change', e => {
  if (e.target.value) {
    selectedDate = e.target.value;
    renderAll();
  }
});

(async()=>{
  selectedDate = todayKey();
  const picker = document.getElementById('date-picker');
  picker.max = todayKey();
  picker.value = selectedDate;
  renderDateHeader();
  await fetchAll();
  renderAll();
})();
