
const GAME_META={
  five:{name:"Six to Five",sub:"Find the five-letter word",color:"#4f9164"},
  same:{name:"One and the Same",sub:"Different clues. One answer.",color:"#b58b3e"},
  quads:{name:"InCommon",sub:"Find four groups of four",color:"#c66f58"},
  mini:{name:"Daily Crossword",sub:"A quick daily crossword",color:"#587e9b"},
  trail:{name:"Unscrumble",sub:"Trace the hidden theme words",color:"#7359a3"},
  ell:{name:"Every Last Letter",sub:"Make words. Use every letter.",color:"#268d89"}
};
const GAME_ORDER=["five","same","quads","mini","trail","ell"];
const today=new Date();
today.setHours(12,0,0,0);

function localDateKey(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
const todayKey=localDateKey(today);
let archiveByDate=new Map();
let monthCursor=new Date(today.getFullYear(),today.getMonth(),1,12);
let minMonth=null,maxMonth=null,selectedKey="";

const ARCHIVE_PLAYER_KEYS={
  five:"puzzlePublicPlayerV3",
  same:"puzzlePublicOneAndTheSameV1",
  quads:"puzzlePublicQuadsV2",
  mini:"puzzlePublicMiniV2",
  trail:"puzzlePublicWordTrailV1",
  ell:"puzzlePublicEveryLastLetterV1"
};

function readStoredState(key){
  try{return JSON.parse(localStorage.getItem(key)||"{}")||{}}
  catch(_){return {}}
}

function archiveGameCompleted(game,dateKey){
  const all=readStoredState(ARCHIVE_PLAYER_KEYS[game]);
  const state=all?.[dateKey];
  if(game==="five")return !!state?.five?.complete;
  if(game==="ell")return !!(state?.complete||state?.ended);
  return !!state?.complete;
}

function completedGamesForDate(dateKey){
  return GAME_ORDER.filter(game=>archiveGameCompleted(game,dateKey));
}

function monthKey(d){return d.getFullYear()*12+d.getMonth()}
function sameMonth(a,b){return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()}
function prettyDate(key){
  const [y,m,d]=key.split("-").map(Number);
  return new Date(y,m-1,d,12).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
}

function renderCalendar(){
  const label=document.getElementById("archiveMonthLabel");
  const grid=document.getElementById("archiveCalendar");
  const empty=document.getElementById("archiveEmpty");
  label.textContent=monthCursor.toLocaleDateString(undefined,{month:"long",year:"numeric"});

  const y=monthCursor.getFullYear(),m=monthCursor.getMonth();
  const first=new Date(y,m,1,12);
  const days=new Date(y,m+1,0,12).getDate();
  const monthDates=[...archiveByDate.keys()].filter(k=>k.startsWith(`${y}-${String(m+1).padStart(2,"0")}-`));
  const puzzleCount=monthDates.reduce((sum,k)=>sum+archiveByDate.get(k).length,0);

  grid.innerHTML="";
  for(let i=0;i<first.getDay();i++){
    const spacer=document.createElement("span");
    spacer.className="archive-day";
    spacer.setAttribute("aria-hidden","true");
    grid.appendChild(spacer);
  }
  for(let day=1;day<=days;day++){
    const d=new Date(y,m,day,12);
    const key=localDateKey(d);
    const puzzles=archiveByDate.get(key)||[];
    const completed=completedGamesForDate(key).filter(game=>puzzles.some(p=>p.game===game));
    const button=document.createElement("button");
    button.type="button";
    button.className="archive-day";
    button.setAttribute("role","gridcell");
    const completedDots=completed.map(game=>`<i style="--dot-color:${GAME_META[game].color}" title="${GAME_META[game].name} completed"></i>`).join("");
    button.innerHTML=`<span class="archive-day-number">${day}</span><span class="archive-day-dots" aria-hidden="true">${completedDots}</span>`;
    if(key===todayKey)button.classList.add("is-today");
    if(puzzles.length){
      button.classList.add("is-available");
      const completionText=completed.length?`, ${completed.length} completed`:", none completed";
      button.setAttribute("aria-label",`${prettyDate(key)}, ${puzzles.length} archived ${puzzles.length===1?"puzzle":"puzzles"}${completionText}`);
      button.addEventListener("click",()=>selectDay(key,button));
    }else{
      button.disabled=true;
      button.setAttribute("aria-label",`${prettyDate(key)}, no archived puzzles`);
    }
    if(key===selectedKey)button.classList.add("is-selected");
    grid.appendChild(button);
  }

  document.getElementById("archivePrevMonth").disabled=minMonth?monthKey(monthCursor)<=monthKey(minMonth):true;
  document.getElementById("archiveNextMonth").disabled=maxMonth?monthKey(monthCursor)>=monthKey(maxMonth):true;
  empty.hidden=!!puzzleCount;
}

function selectDay(key,button){
  selectedKey=key;
  document.querySelectorAll(".archive-day.is-selected").forEach(el=>el.classList.remove("is-selected"));
  button?.classList.add("is-selected");
  const puzzles=archiveByDate.get(key)||[];
  const available=new Map(puzzles.map(p=>[p.game,p]));
  document.getElementById("archiveDayTitle").textContent=prettyDate(key);
  const viewDate=document.getElementById("archiveViewDate");
  if(viewDate)viewDate.href=`./?date=${encodeURIComponent(key)}`;
  const list=document.getElementById("archiveGameList");
  list.innerHTML=GAME_ORDER.filter(game=>available.has(game)).map(game=>{
    const meta=GAME_META[game];
    const completed=archiveGameCompleted(game,key);
    return `<a class="archive-game${completed?" is-completed":""}" href="./?date=${encodeURIComponent(key)}&game=${encodeURIComponent(game)}" style="--game-color:${meta.color}">
      <span class="archive-game-mark" aria-hidden="true"></span>
      <span class="archive-game-copy"><span class="archive-game-name">${meta.name}</span><span class="archive-game-sub">${meta.sub}</span></span>
      ${completed?'<span class="archive-completed-badge">COMPLETED</span>':""}
      <span class="archive-game-arrow" aria-hidden="true">→</span>
    </a>`;
  }).join("");
  const panel=document.getElementById("archiveDayPanel");
  panel.hidden=false;
  setTimeout(()=>{
    panel.scrollIntoView({behavior:"smooth",block:"start"});
  },30);
}

function shiftMonth(delta){
  monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()+delta,1,12);
  selectedKey="";
  document.getElementById("archiveDayPanel").hidden=true;
  renderCalendar();
}

document.getElementById("archivePrevMonth").addEventListener("click",()=>shiftMonth(-1));
document.getElementById("archiveNextMonth").addEventListener("click",()=>shiftMonth(1));
document.getElementById("archiveDayClose").addEventListener("click",()=>{
  selectedKey="";
  document.getElementById("archiveDayPanel").hidden=true;
  renderCalendar();
});

async function initArchive(){
  try{
    const res=await fetch("/data/puzzles.json",{cache:"no-store"});
    if(!res.ok)throw new Error("Could not load archive data.");
    const db=await res.json();
    const scheduled=(db.puzzles||[]).filter(p=>p.status==="scheduled"&&p.date&&p.date<todayKey&&GAME_META[p.game]);
    for(const puzzle of scheduled){
      if(!archiveByDate.has(puzzle.date))archiveByDate.set(puzzle.date,[]);
      archiveByDate.get(puzzle.date).push(puzzle);
    }
    const keys=[...archiveByDate.keys()].sort();
    if(keys.length){
      const [minY,minM]=keys[0].split("-").map(Number);
      const [maxY,maxM]=keys[keys.length-1].split("-").map(Number);
      minMonth=new Date(minY,minM-1,1,12);
      maxMonth=new Date(maxY,maxM-1,1,12);
      monthCursor=new Date(maxMonth);
    }
    renderCalendar();
  }catch(err){
    console.error(err);
    document.getElementById("archiveCalendar").innerHTML='<div class="archive-empty"><strong>Archive unavailable.</strong><span>Please try again shortly.</span></div>';
    document.getElementById("archivePrevMonth").disabled=true;
    document.getElementById("archiveNextMonth").disabled=true;
  }
}
initArchive();
