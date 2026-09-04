
const SIX_TO_FIVE_LOSS_MESSAGES=["That was a tricky one!","You’ll get the next one!","Almost had it!","That one put up a fight!","Better luck tomorrow!","Six tries just weren’t enough this time!"];
const SIX_TO_FIVE_SOLVE_MESSAGES={1:["How did you know?!","Are you psychic?!","No way!","Okay, that's suspicious…","On the first try?!"],2:["Brilliant!","Very impressive!","You caught on fast!","Excellent solve!","That was sharp!"],3:["Nice solve!","Well done!","Good thinking!","Nicely done!","You got it!"],4:["Solid work!","Good solve!","Nicely worked out!","Way to stick with it!","Well played!"],5:["Cutting it close!","Clutch solve!","Nice recovery!","You got there!","Just in time!"],6:["By the skin of your teeth!","Phew, that was close!","Last chance, nailed it!","Right at the buzzer!","Now THAT was close!"]};

/* V101 shared public-site configuration.
   Keep global game identity, panel ownership and storage access in one place. */
const PUBLIC_GAME_IDS=Object.freeze(["five","same","quads","mini","trail","ell"]);
const GAME_PANEL_IDS=Object.freeze({
  five:"fivePanel", same:"samePanel", quads:"quadsPanel",
  mini:"miniPanel", trail:"wordTrailPanel", ell:"ellPanel"
});
function readJsonStorage(key,fallback={}){
  try{
    const value=JSON.parse(localStorage.getItem(key)||"null");
    return value ?? fallback;
  }catch(e){
    return fallback;
  }
}
function writeJsonStorage(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){return false}
}
function sixToFiveResultMessage(n){const p=SIX_TO_FIVE_SOLVE_MESSAGES[n]||SIX_TO_FIVE_SOLVE_MESSAGES[6];return p[Math.floor(Math.random()*p.length)]}

/* V103.33 — Sharing V2.1. Shares lead with the player’s strongest result, add a
   second positive stat when it earns its place, and keep PuzzleNook branding quiet. */
const SHARE_GOOD_TIME_MS=Object.freeze({five:120000,quads:180000,mini:180000,trail:300000,ell:300000});
function sharePuzzleDate(value){
  if(!value)return "";
  const d=new Date(`${value}T12:00:00`);
  return d.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"});
}
function sharePuzzleUrl(game,date){
  const url=new URL(window.location.href);
  url.hash="";url.search="";
  url.searchParams.set("game",game);
  if(date)url.searchParams.set("date",date);
  return url.href;
}
function shareGoodTime(game){const ms=puzzleElapsedMs(game);return ms!=null&&ms>0&&ms<=SHARE_GOOD_TIME_MS[game]?formatElapsed(ms):""}
function shareShell(name,date,statement,game,extra=""){return `PuzzleNook · ${name}\n${sharePuzzleDate(date)}\n\n${statement}${extra?`\n\n${extra}`:""}\n\n${sharePuzzleUrl(game,date)}`}

/* V103.33 — Sharing V2.1 puzzle teaser images. Native Share attaches a clean,
   spoiler-conscious PNG teaser when the browser supports file sharing. */
function shareCanvasBase(gameName,date){
  const c=document.createElement("canvas");c.width=1080;c.height=1080;
  const x=c.getContext("2d");x.fillStyle="#f7f4ee";x.fillRect(0,0,c.width,c.height);
  x.textAlign="center";x.fillStyle="#20201e";x.font="700 42px Lato, Arial, sans-serif";x.fillText("PuzzleNook",540,82);
  x.font="700 58px Lato, Arial, sans-serif";x.fillText(gameName,540,158);
  x.fillStyle="#77736c";x.font="400 30px Lato, Arial, sans-serif";x.fillText(sharePuzzleDate(date),540,208);
  return {c,x};
}
function shareRoundRect(x,px,py,w,h,r,fill){
  x.beginPath();x.roundRect(px,py,w,h,r);x.fillStyle=fill;x.fill();
}
function shareFitText(x,text,cx,cy,maxWidth,start=34,min=19,weight=700){
  let size=start;x.font=`${weight} ${size}px Lato, Arial, sans-serif`;
  while(size>min&&x.measureText(text).width>maxWidth){size--;x.font=`${weight} ${size}px Lato, Arial, sans-serif`}
  x.fillText(text,cx,cy);
}
function shareWrapText(x,text,cx,startY,maxWidth,lineHeight,maxLines=5){
  const words=String(text||"").split(/\s+/);let line="",lines=[];
  for(const word of words){const test=line?`${line} ${word}`:word;if(x.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}
  if(line)lines.push(line);lines=lines.slice(0,maxLines);
  lines.forEach((line,i)=>x.fillText(line,cx,startY+i*lineHeight));
}
function shareOriginalQuadsWords(){
  if(!quadsPuzzle)return [];
  const a=quadsPuzzle.groups.flatMap(g=>g.items||[]);
  let seed=2166136261;for(const ch of String(quadsPuzzle.date||quadsPuzzle.id||"PuzzleNook")){seed^=ch.charCodeAt(0);seed=Math.imul(seed,16777619)}
  function rnd(){seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
function shareUnscrumbleCorner(){
  if(!wordTrailPuzzle?.grid)return {r:0,c:0};
  const rows=wordTrailPuzzle.grid.length,cols=wordTrailPuzzle.grid[0]?.length||0;
  const corners=[{r:0,c:0},{r:0,c:Math.max(0,cols-4)},{r:Math.max(0,rows-4),c:0},{r:Math.max(0,rows-4),c:Math.max(0,cols-4)}];
  const paths=wordTrailPuzzle.paths||{};
  const score=corner=>Object.values(paths).reduce((n,path)=>n+(Array.isArray(path)&&path.length&&path.every(([r,c])=>r>=corner.r&&r<corner.r+4&&c>=corner.c&&c<corner.c+4)?1:0),0);
  return corners.map((corner,i)=>({corner,i,bad:score(corner)})).sort((a,b)=>a.bad-b.bad||a.i-b.i)[0].corner;
}
async function shareTeaserBlob(game){
  let base,name="PuzzleNook-puzzle.png";
  if(game==="five"&&puzzle){
    base=shareCanvasBase("Six to Five",puzzle.date);const {c,x}=base;
    const rows=guesses.map(g=>scoreWord(g,puzzle.answer));const size=118,gap=18,total=5*size+4*gap,left=(1080-total)/2,top=310;
    const colors={good:"#638d67",present:"#718da5",bad:"#282828"};
    rows.forEach((row,r)=>row.forEach((state,col)=>shareRoundRect(x,left+col*(size+gap),top+r*(size+gap),size,size,18,colors[state]||colors.bad)));
    x.fillStyle="#77736c";x.font="400 28px Lato, Arial, sans-serif";x.fillText("My result",540,top-45);name="PuzzleNook-Six-to-Five.png";
  }else if(game==="same"&&samePuzzle){
    base=shareCanvasBase("One and the Same",samePuzzle.date);const {c,x}=base;
    x.fillStyle="#77736c";x.font="700 28px Lato, Arial, sans-serif";x.fillText("CLUE 1",540,350);
    shareRoundRect(x,150,400,780,350,38,"#ffffff");x.fillStyle="#20201e";x.font="700 46px Lato, Arial, sans-serif";
    shareWrapText(x,samePuzzle.clues?.[0]||"",540,520,650,66,4);name="PuzzleNook-One-and-the-Same.png";
  }else if(game==="quads"&&quadsPuzzle){
    base=shareCanvasBase("InCommon",quadsPuzzle.date);const {c,x}=base;const words=shareOriginalQuadsWords();
    const w=202,h=126,gap=18,left=(1080-(4*w+3*gap))/2,top=315;
    words.slice(0,16).forEach((word,i)=>{const r=Math.floor(i/4),col=i%4;shareRoundRect(x,left+col*(w+gap),top+r*(h+gap),w,h,20,"#ffffff");x.fillStyle="#20201e";x.textAlign="center";shareFitText(x,word,left+col*(w+gap)+w/2,top+r*(h+gap)+h/2+11,w-24,29,17,700)});
    name="PuzzleNook-InCommon.png";
  }else if(game==="mini"&&miniPuzzle){
    base=shareCanvasBase("Daily Crossword",miniPuzzle.date);const {c,x}=base;const grid=miniPuzzle.grid||[],rows=grid.length,cols=grid[0]?.length||0;
    const size=Math.min(112,680/Math.max(rows,cols)),left=(1080-cols*size)/2,top=300;
    grid.forEach((row,r)=>row.forEach((v,col)=>{x.fillStyle=v==="#"?"#252525":"#ffffff";x.fillRect(left+col*size,top+r*size,size,size);x.strokeStyle="#77736c";x.lineWidth=2;x.strokeRect(left+col*size,top+r*size,size,size)}));name="PuzzleNook-Daily-Crossword.png";
  }else if(game==="trail"&&wordTrailPuzzle){
    base=shareCanvasBase("Unscrumble",wordTrailPuzzle.date);const {c,x}=base,corner=shareUnscrumbleCorner(),grid=wordTrailPuzzle.grid;
    const size=150,gap=22,total=4*size+3*gap,left=(1080-total)/2,top=315;
    for(let r=0;r<4;r++)for(let col=0;col<4;col++){shareRoundRect(x,left+col*(size+gap),top+r*(size+gap),size,size,34,"#ffffff");x.fillStyle="#20201e";x.font="700 58px Lato, Arial, sans-serif";x.fillText(String(grid[corner.r+r]?.[corner.c+col]||"").toUpperCase(),left+col*(size+gap)+size/2,top+r*(size+gap)+size/2+20)}
    x.fillStyle="#77736c";x.font="400 28px Lato, Arial, sans-serif";x.fillText("A peek at today's grid",540,top-45);name="PuzzleNook-Unscrumble.png";
  }else if(game==="ell"&&ellPuzzle){
    base=shareCanvasBase("Every Last Letter",ellPuzzle.date);const {c,x}=base,grid=ellPuzzle.grid||[];
    const size=126,gap=18,total=5*size+4*gap,left=(1080-total)/2,top=300;
    grid.slice(0,5).forEach((row,r)=>row.slice(0,5).forEach((letter,col)=>{shareRoundRect(x,left+col*(size+gap),top+r*(size+gap),size,size,24,"#ffffff");x.fillStyle="#20201e";x.font="700 52px Lato, Arial, sans-serif";x.fillText(String(letter).toUpperCase(),left+col*(size+gap)+size/2,top+r*(size+gap)+size/2+18)}));
    x.fillStyle="#77736c";x.font="400 28px Lato, Arial, sans-serif";x.fillText("How many words can you spot?",540,top+5*(size+gap)+35);name="PuzzleNook-Every-Last-Letter.png";
  }else return null;
  return await new Promise(resolve=>base.c.toBlob(blob=>resolve(blob?new File([blob],name,{type:"image/png"}):null),"image/png",0.95));
}
async function nativeShareWithTeaser(game,title,text){
  if(!navigator.share)return false;
  try{
    const file=await shareTeaserBlob(game);const data={title,text};
    if(file&&navigator.canShare?.({files:[file]}))data.files=[file];
    await navigator.share(data);return true;
  }catch(e){if(e?.name!=="AbortError")console.warn("PuzzleNook share failed",e);return true}
}

function fiveShareText(){
  if(!puzzle)return "";
  const rows=guesses.map(g=>scoreWord(g,puzzle.answer).map(s=>s==="good"?"🟩":s==="present"?"🟦":"⬛").join("")).join("\n");
  const won=guesses.includes(puzzle.answer),n=guesses.length,time=shareGoodTime("five");
  let statement;
  if(won&&n===1)statement=time?`I got it on my first guess in ${time}!`:`I got it on my first guess!`;
  else if(won)statement=time?`I solved this in ${n} guesses in ${time}. Can you beat that?`:`I solved this in ${n} guesses. Can you beat that?`;
  else statement="This one got me. Can you solve it?";
  return shareShell("Six to Five",puzzle.date,statement,"five",rows);
}


/* V102.3 — universal per-game completion allowance (3 completed puzzles per game/day). */
const PUZZLENOOK_PLAY_ALLOWANCE_KEY="puzzleNookDailyGamePlaysV1";
const PUZZLENOOK_DAILY_GAME_LIMIT=3;
const PUBLIC_GAME_NAMES={five:"Six to Five",same:"One and the Same",quads:"InCommon",mini:"Daily Crossword",trail:"Unscrumble",ell:"Every Last Letter"};
function readDailyGamePlays(){
  const today=browserTodayKey();
  const all=readJsonStorage(PUZZLENOOK_PLAY_ALLOWANCE_KEY,{});
  if(all.date!==today)return {date:today,games:{}};
  all.games=all.games||{};return all;
}
function writeDailyGamePlays(all){writeJsonStorage(PUZZLENOOK_PLAY_ALLOWANCE_KEY,all)}
function dailyGamePuzzleKeys(game){return readDailyGamePlays().games?.[game]||[]}
function dailyGamePlaysUsed(game){return dailyGamePuzzleKeys(game).length}
function dailyGamePlaysLeft(game){return Math.max(0,PUZZLENOOK_DAILY_GAME_LIMIT-dailyGamePlaysUsed(game))}
function puzzleAllowanceKey(game,puz=timerPuzzleFor(game)){return puz?`${puz.date||currentDateKey()}|${puz.id}`:""}
function puzzleAlreadyCountedToday(game,puz=timerPuzzleFor(game)){const key=puzzleAllowanceKey(game,puz);return !!key&&dailyGamePuzzleKeys(game).includes(key)}
function registerDailyGameCompletion(game,puz=timerPuzzleFor(game)){
  const key=puzzleAllowanceKey(game,puz);if(!key)return false;
  const all=readDailyGamePlays();all.games[game]=all.games[game]||[];
  if(all.games[game].includes(key)){renderPlayDots();return false}
  if(all.games[game].length>=PUZZLENOOK_DAILY_GAME_LIMIT)return false;
  all.games[game].push(key);writeDailyGamePlays(all);renderPlayDots();return true;
}
window.addEventListener("resize",()=>{
  if(activeGame==="home"&&!isTodaySelected())updateHomeDashboard();
});
function renderPlayDots(){
  PUBLIC_GAME_IDS.forEach(game=>{
    const left=dailyGamePlaysLeft(game);
    document.querySelectorAll(`[data-play-dots="${game}"]`).forEach(host=>{
      host.innerHTML=[0,1,2].map(i=>`<i class="${i<left?"is-filled":""}"></i>`).join("");
      host.setAttribute("aria-label",`${left} ${left===1?"play":"plays"} remaining today`);
    });
  });
}
function openPlayLimit(game){
  const overlay=document.getElementById("playLimitOverlay"),msg=document.getElementById("playLimitMessage");
  if(msg)msg.textContent=`You've used today's 3 ${PUBLIC_GAME_NAMES[game]||"game"} plays. Come back tomorrow, your available plays will reset every day.`;
  if(overlay){
    overlay.hidden=false;
    overlay.setAttribute("aria-hidden","false");
  }
}
function closePlayLimit(){
  const overlay=document.getElementById("playLimitOverlay");
  if(overlay){
    overlay.hidden=true;
    overlay.setAttribute("aria-hidden","true");
  }
}
function storedPuzzleCompleted(game,puz){
  if(!puz?.date||!PUBLIC_GAME_IDS.includes(game))return false;
  return archivedGamePuzzleCompleted(game,puz.date);
}
function canOpenPuzzleUnderAllowance(game,puz){
  if(!puz)return true;
  if(storedPuzzleCompleted(game,puz)||puzzleAlreadyCountedToday(game,puz))return true;
  return dailyGamePlaysLeft(game)>0;
}
function canOpenGameUnderAllowance(game){
  const puz=timerPuzzleFor(game);
  if(!puz)return true;
  if(timerGameComplete(game))return true;
  return canOpenPuzzleUnderAllowance(game,puz);
}
async function fetchPuzzleForAllowanceCheck(game,dateKey){
  if(!PUBLIC_GAME_IDS.includes(game)||!/^\d{4}-\d{2}-\d{2}$/.test(dateKey||""))return null;
  try{
    const res=await fetch(`/api/puzzle/today?game=${encodeURIComponent(game)}&date=${encodeURIComponent(dateKey)}`,{cache:"no-store"});
    if(!res.ok)return null;
    return await res.json();
  }catch(err){
    console.warn("Could not preflight puzzle play allowance",err);
    return null;
  }
}

/* V103.27 — click a puzzle-view game title + play dots to open the newest
   unfinished ARCHIVED puzzle for that same game. "Archived" intentionally
   matches the Archive page definition: scheduled puzzle data with a date
   earlier than today. */
const PUBLIC_ARCHIVE_PLAYER_KEYS=Object.freeze({
  five:"puzzlePublicPlayerV3",
  same:"puzzlePublicOneAndTheSameV1",
  quads:"puzzlePublicQuadsV2",
  mini:"puzzlePublicMiniV2",
  trail:"puzzlePublicWordTrailV1",
  ell:"puzzlePublicEveryLastLetterV1"
});
let publicArchivePuzzleCache=null;

function archivedGamePuzzleCompleted(game,dateKey){
  const all=readJsonStorage(PUBLIC_ARCHIVE_PLAYER_KEYS[game],{});
  const state=all?.[dateKey];
  if(game==="five")return !!state?.five?.complete;
  if(game==="ell")return !!(state?.complete||state?.ended);
  return !!state?.complete;
}

async function getPublicArchivePuzzles(){
  if(publicArchivePuzzleCache)return publicArchivePuzzleCache;
  try{
    const res=await fetch("/data/puzzles.json",{cache:"no-store"});
    if(!res.ok)throw new Error("Could not load archive puzzle data");
    const db=await res.json();
    const today=browserTodayKey();
    publicArchivePuzzleCache=(db.puzzles||[])
      .filter(p=>p.status==="scheduled"&&p.date&&p.date<today&&PUBLIC_GAME_IDS.includes(p.game));
  }catch(err){
    console.warn("Could not load archived puzzles for game-title navigation",err);
    publicArchivePuzzleCache=[];
  }
  return publicArchivePuzzleCache;
}

async function newestPlayableArchivedPuzzle(game){
  const archived=await getPublicArchivePuzzles();
  const current=timerPuzzleFor(game);
  return archived
    .filter(p=>p.game===game)
    .filter(p=>!(current&&String(p.id)===String(current.id)))
    .filter(p=>!archivedGamePuzzleCompleted(game,p.date))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;
}

async function nextOlderPlayableArchivedPuzzle(game){
  const archived=await getPublicArchivePuzzles();
  const current=timerPuzzleFor(game);
  const before=current?.date||currentDateKey();
  return archived
    .filter(p=>p.game===game&&p.date<before)
    .filter(p=>!archivedGamePuzzleCompleted(game,p.date))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;
}


/* V103.31 — shared end-game Next Options.
   "Try another?" is offered only when the player has a play remaining AND
   there is an available, uncompleted puzzle for this game. The destination is
   always the most recent eligible puzzle, never a random archive puzzle. */
let publicAvailablePuzzleCache=null;
async function getPublicAvailablePuzzles(){
  if(publicAvailablePuzzleCache)return publicAvailablePuzzleCache;
  try{
    const res=await fetch("/data/puzzles.json",{cache:"no-store"});
    if(!res.ok)throw new Error("Could not load public puzzle data");
    const db=await res.json();
    const today=browserTodayKey();
    publicAvailablePuzzleCache=(db.puzzles||[])
      .filter(p=>p.status==="scheduled"&&p.date&&p.date<=today&&PUBLIC_GAME_IDS.includes(p.game));
  }catch(err){
    console.warn("Could not load available puzzles for end-game navigation",err);
    publicAvailablePuzzleCache=[];
  }
  return publicAvailablePuzzleCache;
}
async function newestAvailableUncompletedPuzzle(game){
  if(!PUBLIC_GAME_IDS.includes(game))return null;
  const current=timerPuzzleFor(game);
  const available=await getPublicAvailablePuzzles();
  return available
    .filter(p=>p.game===game)
    .filter(p=>!(current&&String(p.id)===String(current.id)))
    .filter(p=>!storedPuzzleCompleted(game,p))
    .sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.id)-Number(a.id))[0]||null;
}
async function configureEndgameNextOptions(game,tryButtonId){
  const button=document.getElementById(tryButtonId);
  if(!button)return;
  button.hidden=true;
  button.disabled=true;
  if(dailyGamePlaysLeft(game)<=0)return;
  const next=await newestAvailableUncompletedPuzzle(game);
  if(activeGame!==game||!timerGameComplete(game)||!next)return;
  button.hidden=false;
  button.disabled=false;
  button.dataset.nextPuzzleId=String(next.id??"");
  button.dataset.nextPuzzleDate=next.date||"";
}
async function openEndgameTryAnother(game){
  if(!PUBLIC_GAME_IDS.includes(game))return;
  if(dailyGamePlaysLeft(game)<=0){
    openPlayLimit(game);
    return;
  }
  const next=await newestAvailableUncompletedPuzzle(game);
  if(!next)return;
  if(!canOpenPuzzleUnderAllowance(game,next)){
    openPlayLimit(game);
    return;
  }

  suppressRestoredEndgames=true;
  closeFiveEndgame();
  closeGlobalEndgame();

  const [y,m,d]=next.date.split("-").map(Number);
  selectedDate=new Date(y,m-1,d,12,0,0,0);
  updateDateLabel();
  await Promise.all([
    loadFiveForSelectedDate(),
    loadEveryLastLetterForSelectedDate(),
    loadOneAndTheSameForSelectedDate(),
    loadQuadsForSelectedDate(),
    loadWordTrailForSelectedDate(),
    loadMiniForSelectedDate()
  ]);
  updateHomeDashboard();
  suppressRestoredEndgames=false;

  if(!canOpenGameUnderAllowance(game)){
    setActiveGame("home");
    history.pushState(publicHistoryState("home"),"",publicViewUrl("home"));
    openPlayLimit(game);
    return;
  }

  setActiveGame(game);
  history.pushState(publicHistoryState(game),"",publicViewUrl(game));
  window.scrollTo({top:0,behavior:"smooth"});
  focusLoadedPuzzle(game);
}
function endgameBackToHome(){
  closeFiveEndgame();
  closeGlobalEndgame();
  showHomePage();
}

let gameTitleArchiveConfirmGame=null;
let gameTitleArchiveReturnFocus=null;

function openGameTitleArchiveConfirm(game,returnFocus=null){
  if(!PUBLIC_GAME_IDS.includes(game))return;
  if(dailyGamePlaysLeft(game)<=0){
    openPlayLimit(game);
    return;
  }
  const overlay=document.getElementById("gameTitleArchiveConfirmOverlay");
  const kicker=document.getElementById("gameTitleArchiveConfirmKicker");
  const title=document.getElementById("gameTitleArchiveConfirmTitle");
  const message=document.getElementById("gameTitleArchiveConfirmMessage");
  const confirmBtn=document.getElementById("gameTitleArchiveConfirmPrimary");
  if(!overlay||!kicker||!title||!message||!confirmBtn)return;

  gameTitleArchiveConfirmGame=game;
  gameTitleArchiveReturnFocus=returnFocus instanceof HTMLElement?returnFocus:null;
  const name=PUBLIC_GAME_NAMES[game]||"Puzzle";
  kicker.textContent=name.toUpperCase();
  title.textContent=`Try another ${name} puzzle?`;
  message.textContent=`Would you like to play another ${name} puzzle from a different day?`;
  confirmBtn.textContent="Try Another";

  /* A pointer click normally leaves the game-title control focused. Remove
     that focus before opening the modal so Enter cannot reactivate it later. */
  gameTitleArchiveReturnFocus?.blur();

  overlay.hidden=false;
  overlay.setAttribute("aria-hidden","false");
  document.body.classList.add("ell-confirm-open");
  requestAnimationFrame(()=>confirmBtn.focus());
}

function closeGameTitleArchiveConfirm({restoreFocus=false}={}){
  const overlay=document.getElementById("gameTitleArchiveConfirmOverlay");
  if(!overlay||overlay.hidden)return;
  overlay.hidden=true;
  overlay.setAttribute("aria-hidden","true");
  document.body.classList.remove("ell-confirm-open");
  const returnFocus=gameTitleArchiveReturnFocus;
  gameTitleArchiveConfirmGame=null;
  gameTitleArchiveReturnFocus=null;
  if(restoreFocus&&returnFocus){
    requestAnimationFrame(()=>returnFocus.focus({preventScroll:true}));
  }
}

function focusLoadedPuzzle(game){
  /* Do not leave keyboard focus on the navigation link after changing dates.
     Put focus back into the puzzle wherever there is a natural input target;
     otherwise clear focus so the game's own keyboard handlers receive keys. */
  const active=document.activeElement;
  if(active instanceof HTMLElement)active.blur();

  requestAnimationFrame(()=>{
    if(game==="same"){
      const input=document.getElementById("sameGuessInput");
      if(input&&!input.disabled&&!input.closest(".same-hidden"))input.focus({preventScroll:true});
      return;
    }
    if(game==="mini"){
      const activeCell=document.querySelector("#miniGrid .mini-cell.active:not([disabled]), #miniGrid button:not([disabled])");
      if(activeCell instanceof HTMLElement)activeCell.focus({preventScroll:true});
      return;
    }
    if(game==="quads"){
      const tile=document.querySelector("#quadsGrid button:not([disabled])");
      if(tile instanceof HTMLElement)tile.focus({preventScroll:true});
      return;
    }
    if(game==="ell"){
      const tile=document.querySelector("#ellGrid button:not([disabled])");
      if(tile instanceof HTMLElement)tile.focus({preventScroll:true});
      return;
    }
    /* Six to Five and Unscrumble use page-level/pointer input. Blurring the
       modal control is the correct neutral focus state for those games. */
  });
}

async function openNewestPlayableArchivedPuzzle(game){
  if(!PUBLIC_GAME_IDS.includes(game))return;
  if(dailyGamePlaysLeft(game)<=0){
    openPlayLimit(game);
    return;
  }
  const next=await newestPlayableArchivedPuzzle(game);
  if(!next)return;

  suppressRestoredEndgames=true;
  closeFiveEndgame();
  closeGlobalEndgame();

  const [y,m,d]=next.date.split("-").map(Number);
  selectedDate=new Date(y,m-1,d,12,0,0,0);
  updateDateLabel();

  await Promise.all([
    loadFiveForSelectedDate(),
    loadEveryLastLetterForSelectedDate(),
    loadOneAndTheSameForSelectedDate(),
    loadQuadsForSelectedDate(),
    loadWordTrailForSelectedDate(),
    loadMiniForSelectedDate()
  ]);

  updateHomeDashboard();
  suppressRestoredEndgames=false;
  setActiveGame(game);
  history.pushState(publicHistoryState(game),"",publicViewUrl(game));
  window.scrollTo({top:0,behavior:"smooth"});
  focusLoadedPuzzle(game);
}

async function openNextOlderArchivedPuzzle(game){
  if(!PUBLIC_GAME_IDS.includes(game)||!timerGameComplete(game))return;
  const next=await nextOlderPlayableArchivedPuzzle(game);
  if(!next)return;
  if(!canOpenPuzzleUnderAllowance(game,next)){
    openPlayLimit(game);
    return;
  }

  suppressRestoredEndgames=true;
  closeFiveEndgame();
  closeGlobalEndgame();

  const [y,m,d]=next.date.split("-").map(Number);
  selectedDate=new Date(y,m-1,d,12,0,0,0);
  updateDateLabel();
  await Promise.all([
    loadFiveForSelectedDate(),
    loadEveryLastLetterForSelectedDate(),
    loadOneAndTheSameForSelectedDate(),
    loadQuadsForSelectedDate(),
    loadWordTrailForSelectedDate(),
    loadMiniForSelectedDate()
  ]);
  updateHomeDashboard();
  suppressRestoredEndgames=false;

  if(!canOpenGameUnderAllowance(game)){
    setActiveGame("home");
    history.pushState(publicHistoryState("home"),"",publicViewUrl("home"));
    openPlayLimit(game);
    return;
  }

  setActiveGame(game);
  history.pushState(publicHistoryState(game),"",publicViewUrl(game));
  window.scrollTo({top:0,behavior:"smooth"});
  focusLoadedPuzzle(game);
}

function confirmGameTitleArchiveNavigation(){
  const game=gameTitleArchiveConfirmGame;
  if(!game)return;
  closeGameTitleArchiveConfirm();
  return openNewestPlayableArchivedPuzzle(game);
}

function wireGameTitleArchiveLinks(){
  document.querySelectorAll(".game-title-with-plays").forEach(host=>{
    const dots=host.querySelector("[data-play-dots]");
    const game=dots?.dataset.playDots;
    if(!PUBLIC_GAME_IDS.includes(game)||host.dataset.archiveLinkWired)return;
    host.dataset.archiveLinkWired="1";
    host.classList.add("game-title-archive-link");
    host.setAttribute("role","button");
    host.tabIndex=0;
    host.setAttribute("aria-label",`${PUBLIC_GAME_NAMES[game]}. Try another ${PUBLIC_GAME_NAMES[game]} puzzle from a different day.`);
    host.addEventListener("click",()=>openGameTitleArchiveConfirm(game,host));
    host.addEventListener("keydown",event=>{
      if(event.key==="Enter"||event.key===" "){
        event.preventDefault();
        openGameTitleArchiveConfirm(game,host);
      }
    });
  });

  const cancel=document.getElementById("gameTitleArchiveConfirmCancel");
  const confirm=document.getElementById("gameTitleArchiveConfirmPrimary");
  const overlay=document.getElementById("gameTitleArchiveConfirmOverlay");
  if(cancel&&!cancel.dataset.archiveConfirmWired){
    cancel.dataset.archiveConfirmWired="1";
    cancel.addEventListener("click",()=>closeGameTitleArchiveConfirm({restoreFocus:true}));
  }
  if(confirm&&!confirm.dataset.archiveConfirmWired){
    confirm.dataset.archiveConfirmWired="1";
    confirm.addEventListener("click",confirmGameTitleArchiveNavigation);
  }
  if(overlay&&!overlay.dataset.archiveConfirmWired){
    overlay.dataset.archiveConfirmWired="1";
    overlay.addEventListener("click",event=>{
      if(event.target===overlay)closeGameTitleArchiveConfirm({restoreFocus:true});
    });
  }
}
/* V103.30 — completed-puzzle swipe navigation.
   A deliberate swipe RIGHT moves to the next older unfinished puzzle for the
   same game. Right is the natural "back/previous" direction when older dates
   sit to the left of the current date in chronological navigation. */
const COMPLETED_PUZZLE_SWIPE_THRESHOLD=72;
let completedPuzzleSwipeStart=null;
let completedPuzzleSwipeBusy=false;
function puzzleSwipeModalOpen(){
  return ["playLimitOverlay","gameTitleArchiveConfirmOverlay","gameInstructionsOverlay","siteUtilityOverlay"]
    .some(id=>{const el=document.getElementById(id);return el&&!el.hidden;});
}
function completedPuzzleSwipeEligible(){
  return PUBLIC_GAME_IDS.includes(activeGame)&&timerGameComplete(activeGame)&&!puzzleSwipeModalOpen();
}
function wireCompletedPuzzleSwipe(){
  const hosts=[document.getElementById("playArea"),document.getElementById("fiveEndgameOverlay"),document.getElementById("globalEndgameOverlay")].filter(Boolean);
  hosts.forEach(host=>{
    if(host.dataset.completedSwipeWired)return;
    host.dataset.completedSwipeWired="1";
    host.addEventListener("touchstart",event=>{
      if(event.touches.length!==1||!completedPuzzleSwipeEligible())return;
      const t=event.touches[0];
      completedPuzzleSwipeStart={x:t.clientX,y:t.clientY,time:Date.now()};
    },{passive:true});
    host.addEventListener("touchend",event=>{
      const start=completedPuzzleSwipeStart;
      completedPuzzleSwipeStart=null;
      if(!start||completedPuzzleSwipeBusy||!completedPuzzleSwipeEligible()||!event.changedTouches.length)return;
      const t=event.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y,elapsed=Date.now()-start.time;
      if(elapsed>1000||dx<COMPLETED_PUZZLE_SWIPE_THRESHOLD||Math.abs(dx)<Math.abs(dy)*1.35)return;
      completedPuzzleSwipeBusy=true;
      openNextOlderArchivedPuzzle(activeGame).finally(()=>{completedPuzzleSwipeBusy=false;});
    },{passive:true});
    host.addEventListener("touchcancel",()=>{completedPuzzleSwipeStart=null},{passive:true});
  });
}

function isTodaySelected(){return currentDateKey()===browserTodayKey()}
function navigateTodayHome(){
  const now=new Date();now.setHours(12,0,0,0);selectedDate=now;
  updateDateLabel();
  Promise.all([loadFiveForSelectedDate(),loadEveryLastLetterForSelectedDate(),loadOneAndTheSameForSelectedDate(),loadQuadsForSelectedDate(),loadWordTrailForSelectedDate(),loadMiniForSelectedDate()]).then(()=>{updateHomeDashboard();navigatePublicView("home");});
}
function updatePuzzleMetaLinks(){
  ["fivePuzzleMeta","samePuzzleMeta","quadsPuzzleMeta","miniPuzzleMeta","wordTrailPuzzleMeta","ellPuzzleMeta"].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const puz=puzzleForMetaId(id);el.classList.add("puzzle-date-link");el.classList.toggle("is-archived-puzzle",!!puz?.date&&puz.date!==browserTodayKey());el.setAttribute("role","link");el.tabIndex=0;
  });
}
function puzzleForMetaId(id){return id==="fivePuzzleMeta"?puzzle:id==="samePuzzleMeta"?samePuzzle:id==="quadsPuzzleMeta"?quadsPuzzle:id==="miniPuzzleMeta"?miniPuzzle:id==="wordTrailPuzzleMeta"?wordTrailPuzzle:id==="ellPuzzleMeta"?ellPuzzle:null}
async function goToPuzzleDateHome(id){
  const puz=puzzleForMetaId(id);if(!puz?.date){navigatePublicView("home");return}
  if(puz.date!==currentDateKey()){const [y,m,d]=puz.date.split("-").map(Number);selectedDate=new Date(y,m-1,d,12);updateDateLabel();await Promise.all([loadFiveForSelectedDate(),loadEveryLastLetterForSelectedDate(),loadOneAndTheSameForSelectedDate(),loadQuadsForSelectedDate(),loadWordTrailForSelectedDate(),loadMiniForSelectedDate()]);updateHomeDashboard()}
  navigatePublicView("home");
}
function wirePuzzleMetaLinks(){
  ["fivePuzzleMeta","samePuzzleMeta","quadsPuzzleMeta","miniPuzzleMeta","wordTrailPuzzleMeta","ellPuzzleMeta"].forEach(id=>{
    const el=document.getElementById(id);if(!el||el.dataset.dateLinkWired)return;el.dataset.dateLinkWired="1";
    el.addEventListener("click",()=>goToPuzzleDateHome(id));el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();goToPuzzleDateHome(id)}});
  });
}

const SIX_TO_FIVE_PLAY_KEY="sixToFivePlayHistoryV2";
const SIX_TO_FIVE_PLAY_KEY_V1="sixToFivePlayHistoryV1";
const SIX_TO_FIVE_DAILY_LIMIT=3;
let fiveTimerElapsedMs=0;
let fiveTimerStartedAt=null;

function browserTodayKey(){return dateKey(new Date())}
function formatPuzzleDate(value){
  if(!value)return "";
  const d=new Date(`${value}T12:00:00`);
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}
function readFivePlayHistory(){
  let h={completedIds:[],daily:{date:browserTodayKey(),startedIds:[]}};
  let hasV2=false;
  try{
    const stored=readJsonStorage(SIX_TO_FIVE_PLAY_KEY,null);
    if(stored){h={...h,...stored};hasV2=true}
  }catch(e){}
  if(!Array.isArray(h.completedIds))h.completedIds=[];
  if(!h.daily||h.daily.date!==browserTodayKey())h.daily={date:browserTodayKey(),startedIds:[]};
  if(!Array.isArray(h.daily.startedIds))h.daily.startedIds=[];

  // Preserve today's V64 start count, but do not trust V64's playedIds as completion
  // history because V64 incorrectly added puzzles there as soon as they were started.
  if(!hasV2){
    try{
      const v1=readJsonStorage(SIX_TO_FIVE_PLAY_KEY_V1,{});
      if(v1?.daily?.date===browserTodayKey()&&Array.isArray(v1.daily.startedIds)){
        h.daily.startedIds=[...new Set(v1.daily.startedIds.map(Number).filter(Number.isFinite))];
      }
    }catch(e){}
  }

  // Migrate only genuinely completed Six to Five puzzles from existing player state.
  try{
    const legacy=readJsonStorage(PLAYER_KEY,{});
    for(const [day,entry] of Object.entries(legacy)){
      const five=entry?.five;
      if(!five?.puzzleId)continue;
      const id=Number(five.puzzleId);
      if(five.complete&&!h.completedIds.includes(id))h.completedIds.push(id);
      if(day===browserTodayKey()&&(five.complete||(five.guesses||[]).length)&&!h.daily.startedIds.includes(id))h.daily.startedIds.push(id);
    }
  }catch(e){}
  writeFivePlayHistory(h);
  return h;
}
function writeFivePlayHistory(h){writeJsonStorage(SIX_TO_FIVE_PLAY_KEY,h)}
function registerFiveStarted(){return true}
function registerFiveCompleted(){
  if(!puzzle)return;
  const h=readFivePlayHistory(),id=Number(puzzle.id);
  if(!h.completedIds.includes(id)){h.completedIds.push(id);writeFivePlayHistory(h)}
}
function fiveDailyCount(){return dailyGamePlaysUsed("five")}
function fiveCanPlayAnother(){return dailyGamePlaysLeft("five")>0}
function puzzlePageIsForeground(){
  return document.visibilityState==="visible" && (typeof document.hasFocus!=="function" || document.hasFocus());
}
function ensureFiveTimerRunning(){
  if(activeGame!=="five" || gameComplete || !puzzlePageIsForeground())return;
  if(!fiveTimerStartedAt)fiveTimerStartedAt=Date.now();
}
function currentFiveElapsedMs(){return fiveTimerElapsedMs+(fiveTimerStartedAt?Date.now()-fiveTimerStartedAt:0)}
function stopFiveTimer(){
  if(fiveTimerStartedAt){fiveTimerElapsedMs+=Date.now()-fiveTimerStartedAt;fiveTimerStartedAt=null}
}
function formatElapsed(ms){
  if(!(Number(ms)>0))return "—";
  const total=Math.max(0,Math.round((Number(ms)||0)/1000));
  const minutes=Math.floor(total/60),seconds=total%60;
  return minutes>0?`${minutes}:${String(seconds).padStart(2,"0")}`:`0:${String(seconds).padStart(2,"0")}`;
}
function fiveStateKey(){return puzzle?.date||currentDateKey()}


const PUZZLENOOK_TIMER_KEY="puzzleNookUniversalTimersV1";
const PUZZLENOOK_TIMER_VISIBILITY_KEY="puzzleNookTimerVisibleV1";
let puzzleNookTimerTick=null;
function timerPuzzleFor(game){return game==="five"?puzzle:game==="same"?samePuzzle:game==="quads"?quadsPuzzle:game==="mini"?miniPuzzle:game==="trail"?wordTrailPuzzle:game==="ell"?ellPuzzle:null}
function timerGameComplete(game){return game==="five"?!!gameComplete:game==="same"?!!sameComplete:game==="quads"?!!quadsComplete:game==="mini"?!!miniComplete:game==="trail"?!!wordTrailComplete:game==="ell"?!!(ellComplete||ellEnded):false}
function timerRecordKey(game,puz){return puz?`${game}|${puz.date||currentDateKey()}|${puz.id}`:""}
function readPuzzleTimers(){return readJsonStorage(PUZZLENOOK_TIMER_KEY,{})||{}}
function writePuzzleTimers(all){writeJsonStorage(PUZZLENOOK_TIMER_KEY,all)}
function normalizePuzzleTimerRecord(rec){
  if(!rec)return null;
  if(rec.timerModel!=="foreground-v2"){
    /* Old incomplete records used wall-clock time from startedAt, which may include
       background/tab-closed time. Do not carry that unreliable delta forward. */
    const preserved=Number.isFinite(Number(rec.elapsedMs))?Math.max(0,Number(rec.elapsedMs)):0;
    rec.elapsedMs=preserved;
    rec.runningSince=null;
    rec.startedAt=null;
    rec.timerModel="foreground-v2";
  }
  if(!Number.isFinite(Number(rec.elapsedMs)))rec.elapsedMs=0;
  return rec;
}
function puzzleTimerCanRun(game){
  return activeGame===game && puzzlePageIsForeground() && !!timerPuzzleFor(game) && !timerGameComplete(game);
}
function pausePuzzleTimer(game){
  const puz=timerPuzzleFor(game);if(!puz)return;
  const all=readPuzzleTimers(),key=timerRecordKey(game,puz);
  let rec=normalizePuzzleTimerRecord(all[key]);if(!rec)return;
  if(rec.runningSince){
    rec.elapsedMs=Math.max(0,Number(rec.elapsedMs)||0)+Math.max(0,Date.now()-Number(rec.runningSince));
    rec.runningSince=null;
    all[key]=rec;writePuzzleTimers(all);
  }
}
function ensurePuzzleTimerStarted(game){
  const puz=timerPuzzleFor(game);if(!puz||timerGameComplete(game))return;
  const all=readPuzzleTimers(),key=timerRecordKey(game,puz);
  let rec=normalizePuzzleTimerRecord(all[key]);
  if(!rec)rec={elapsedMs:0,runningSince:null,complete:false,timerModel:"foreground-v2"};
  if(puzzleTimerCanRun(game)&&!rec.runningSince)rec.runningSince=Date.now();
  all[key]=rec;writePuzzleTimers(all);
}
function completePuzzleTimer(game){
  const puz=timerPuzzleFor(game);if(!puz)return;
  const all=readPuzzleTimers(),key=timerRecordKey(game,puz);
  let rec=normalizePuzzleTimerRecord(all[key]);if(!rec)return;
  if(!rec.complete){
    if(rec.runningSince){
      rec.elapsedMs=Math.max(0,Number(rec.elapsedMs)||0)+Math.max(0,Date.now()-Number(rec.runningSince));
      rec.runningSince=null;
    }
    rec.complete=true;rec.completedAt=Date.now();all[key]=rec;writePuzzleTimers(all);
  }
}
function puzzleElapsedMs(game){
  const puz=timerPuzzleFor(game);if(!puz)return null;
  const rec=normalizePuzzleTimerRecord(readPuzzleTimers()[timerRecordKey(game,puz)]);if(!rec)return null;
  const runningDelta=rec.runningSince&&puzzleTimerCanRun(game)?Math.max(0,Date.now()-Number(rec.runningSince)):0;
  return Math.max(0,Number(rec.elapsedMs)||0)+runningDelta;
}
function syncActivePuzzleTimer(){
  PUBLIC_GAME_IDS.forEach(game=>{
    if(game===activeGame && puzzleTimerCanRun(game))ensurePuzzleTimerStarted(game);
    else pausePuzzleTimer(game);
  });
  if(activeGame==="five"){
    if(puzzlePageIsForeground()&&!gameComplete&&fiveTimerStartedAt){} 
    else if(!puzzlePageIsForeground()||gameComplete)stopFiveTimer();
  }else{
    stopFiveTimer();
  }
  updatePuzzleTimerDisplays();
}
function puzzleTimeText(game){const ms=puzzleElapsedMs(game);return ms==null?"—":formatElapsed(ms)}
let puzzleNookTimerVisibleFallback=false;
function puzzleTimerVisiblePreference(){
  try{
    const stored=localStorage.getItem(PUZZLENOOK_TIMER_VISIBILITY_KEY);
    if(stored===null)return puzzleNookTimerVisibleFallback;
    return stored==="true";
  }catch(e){
    return puzzleNookTimerVisibleFallback;
  }
}
function setPuzzleTimerVisiblePreference(visible){
  puzzleNookTimerVisibleFallback=!!visible;
  try{
    localStorage.setItem(PUZZLENOOK_TIMER_VISIBILITY_KEY,visible?"true":"false");
  }catch(e){}
  updatePuzzleTimerDisplays();
}
function togglePuzzleTimerVisibility(){
  setPuzzleTimerVisiblePreference(!puzzleTimerVisiblePreference());
}
function updatePuzzleTimerDisplays(){
  const visible=puzzleTimerVisiblePreference();
  PUBLIC_GAME_IDS.forEach(game=>{
    if(timerGameComplete(game))completePuzzleTimer(game);
    const host=document.querySelector(`[data-game-timer="${game}"]`);if(!host)return;
    const puz=timerPuzzleFor(game);
    host.classList.toggle("timer-complete",!!puz&&timerGameComplete(game));
    host.classList.toggle("timer-hidden",!visible);
    host.setAttribute("aria-label",visible?"Hide elapsed time":"Show elapsed time");
    host.title=visible?"Hide timer":"Show timer";
    if(visible){
      host.textContent=puz?puzzleTimeText(game):"—";
    }else{
      host.innerHTML='<span class="puzzle-timer-clock" aria-hidden="true"></span>';
    }
  });
}
function activatePuzzleTimer(game){if(!PUBLIC_GAME_IDS.includes(game))return;ensurePuzzleTimerStarted(game);updatePuzzleTimerDisplays()}
function addUniversalTimerHosts(){
  Object.entries(GAME_PANEL_IDS).forEach(([game,id])=>{
    const panel=document.getElementById(id);
    const head=panel?.querySelector(".game-clean-head");
    if(!head||panel.querySelector(`[data-game-timer="${game}"]`))return;

    const row=document.createElement("div");
    row.className=`puzzle-timer-row puzzle-timer-row-${game}`;

    const timerButton=document.createElement("button");
    timerButton.type="button";
    timerButton.className="puzzle-live-timer";
    timerButton.dataset.gameTimer=game;
    timerButton.setAttribute("aria-label","Show elapsed time");
    timerButton.addEventListener("click",(event)=>{
      event.preventDefault();
      event.stopPropagation();
      togglePuzzleTimerVisibility();
    });

    const statusHostIds={
      five:"fivePuzzleStatus",
      same:"samePuzzleStatus",
      quads:"quadsPuzzleStatus",
      mini:"miniPuzzleStatus",
      trail:"wordTrailPuzzleStatus",
      ell:"ellPuzzleStatus"
    };
    const statusHost=document.getElementById(statusHostIds[game]);
    const instructionHost=panel.querySelector(`[data-timer-row-instructions="${game}"]`);
    if(instructionHost)row.appendChild(instructionHost);
    if(statusHost)row.appendChild(statusHost);
    row.appendChild(timerButton);
    head.insertAdjacentElement("afterend",row);
  });
  updatePuzzleTimerDisplays();
}

let suppressRestoredEndgames=true;

function closeFiveEndgame(){const o=document.getElementById("fiveEndgameOverlay");if(o){o.hidden=true;o.setAttribute("aria-hidden","true")}}
function buildFiveEndgameMiniGrid(){
 const host=document.getElementById("fiveEndgameMiniGrid");
 if(!host||!puzzle)return;
 host.innerHTML="";
 guesses.forEach(guess=>{
   const feedback=scoreWord(guess,puzzle.answer);
   [...guess].forEach((letter,i)=>{
     const tile=document.createElement("span");
     tile.className=`five-endgame-mini-tile ${feedback[i]||""}`;
     tile.textContent=letter;
     host.appendChild(tile);
   });
 });
}
function showFiveEndgame(){
 if(suppressRestoredEndgames||activeGame!=="five"||!puzzle||!gameComplete)return;
 const won=guesses.includes(puzzle.answer);
 const title=document.getElementById("fiveEndgameTitle");
 const answer=document.getElementById("fiveEndgameAnswer");
 const message=document.getElementById("fiveEndgameMessage");
 const share=document.getElementById("fiveEndgameShareSection");
 const stats=document.getElementById("fiveEndgameStats");
 const resultLine=document.getElementById("fiveEndgameResultLine");
 const art=document.querySelector("#fiveEndgameOverlay .five-endgame-art");
 buildFiveEndgameMiniGrid();
 if(won){
   const k=`${puzzle.answer}|${guesses.join(",")}|W`;
   if(sixToFiveResultCacheKey!==k){sixToFiveResultCache=sixToFiveResultMessage(guesses.length);sixToFiveResultCacheKey=k}
   const n=guesses.length;
   title.textContent=`Solved in ${n}.`;
   answer.hidden=true;
   message.textContent=sixToFiveResultCache;
   art.hidden=false;
   stats.innerHTML=`<div><strong>${n}</strong><span>${n===1?"GUESS":"GUESSES"}</span></div><div><strong>${puzzleTimeText("five")}</strong><span>TIME</span></div>`;
   resultLine.textContent=`Six to Five · ${formatPuzzleDate(puzzle.date)} · ${n}/6`;
   share.hidden=false;
 }else{
   const k=`${puzzle.answer}|${guesses.join(",")}|L`;
   if(sixToFiveResultCacheKey!==k){sixToFiveResultCache=SIX_TO_FIVE_LOSS_MESSAGES[Math.floor(Math.random()*SIX_TO_FIVE_LOSS_MESSAGES.length)];sixToFiveResultCacheKey=k}
   title.textContent="Not this time.";
   answer.hidden=false;
   answer.innerHTML=`The word was <strong>${puzzle.answer}</strong>`;
   message.textContent=sixToFiveResultCache;
   art.hidden=true;
   stats.innerHTML=`<div><strong>6</strong><span>GUESSES</span></div><div><strong>${puzzleTimeText("five")}</strong><span>TIME</span></div>`;
   share.hidden=false;
 }
 const o=document.getElementById("fiveEndgameOverlay");o.hidden=false;o.setAttribute("aria-hidden","false");
 configureEndgameNextOptions("five","fiveTryAnother");
}
async function shareFiveResult(kind){const text=fiveShareText();if(kind==="native"&&navigator.share){await nativeShareWithTeaser("five","Six to Five",text);return}try{await navigator.clipboard.writeText(text);const b=document.querySelector(`[data-share="${kind}"]`);if(b){const old=b.innerHTML;b.textContent="Copied ✓";setTimeout(()=>b.innerHTML=old,1200)}}catch(e){}}


/* V90 shared public end-game framework */
const GLOBAL_ENDGAME_MESSAGES={quads:{win:["Excellent grouping!","You found the connections.","Nicely sorted."],loss:["That set fought back.","A tricky group of connections.","Almost had the board."]},mini:{win:["Clean solve!","Nicely crossed.","Puzzle complete."],loss:["Puzzle revealed.","That one was a tough cross."]},trail:{win:["Every path found.","Beautiful tracing.","The whole grid came together."]},ell:{win:["Every last one!","Nothing left behind.","All 25 letters used."],loss:["A solid word hunt.","That board had more to give.","Good run."]},same:{win:["You saw the connection.","That was the one.","Nice read on the clues."],loss:["That one stayed hidden.","Four clues, one stubborn answer."]}};
let globalEndgameCurrent=null;const globalEndgameShown=new Set();
/* V103.2: Any navigation invalidates end-game callbacks that were queued
   for the previous view. This prevents a completed/restored puzzle from
   opening its modal after the player has returned Home or switched games. */
let endgameNavigationEpoch=0;
function globalPick(list){return list[Math.floor(Math.random()*list.length)]}
function globalEndgameKey(game,date,state,instanceKey=""){return `${game}|${date||currentDateKey()}|${state}${instanceKey?`|${instanceKey}`:""}`}
function globalEndgameIcon(game){if(game==="quads")return '<div class="global-emblem global-emblem-quads"><i></i><i></i><i></i><i></i></div>';if(game==="mini")return '<div class="global-emblem global-emblem-mini">'+Array.from({length:9},(_,i)=>`<i class="${[2,4,8].includes(i)?"dark":""}"></i>`).join("")+'</div>';if(game==="trail")return '<div class="global-emblem global-emblem-trail"><span>↗</span></div>';if(game==="ell")return '<div class="global-emblem global-emblem-ell"><i>E</i><i>L</i><i>L</i><i></i></div>';if(game==="same")return '<div class="global-emblem global-emblem-same"><i>1</i><i>=</i><i>1</i></div>';return ""}
const ENDGAME_STICKER_BASE="assets/endgame/";
const ENDGAME_GENERIC_WIN_STICKERS=["NeutralWin.png","NeutralWin2.png","NeutralWin4.png","NeutralWin5.png","NeutralWin6.png"];
const ENDGAME_GENERIC_LOSS_STICKERS=["NeutralLoss.png","NeutralLoss2.png"];
const endgameStickerChoices=new Map();
function endgameStickerHtml(filename){return filename?`<img class="global-endgame-sticker" src="${ENDGAME_STICKER_BASE}${filename}" alt="">`:""}
function randomEndgameSticker(pool,key){
  if(!pool?.length)return "";
  if(endgameStickerChoices.has(key))return endgameStickerChoices.get(key);
  const filename=pool[Math.floor(Math.random()*pool.length)];
  endgameStickerChoices.set(key,filename);
  return filename;
}
function endgameStickerFor({game,date,state,won,tries,used,endReason,selectionKey=""}){
  // Stickers are intentionally limited to Unscrumble, Every Last Letter,
  // and One and the Same. Other games keep their puzzle-breakdown visuals.
  const fallbackState=state||(won?"win":"loss");
  const key=`${game}|${date||currentDateKey()}|${fallbackState}${selectionKey?`|${selectionKey}`:""}`;
  if(game==="trail"&&won){
    // Unscrumble wins can use its dedicated art or any generic win sticker.
    return randomEndgameSticker(["UnscrumbleWin.png",...ENDGAME_GENERIC_WIN_STICKERS],key);
  }
  if(game==="same"&&won)return tries<=2?"GoodWin.png":"OneSameWin.png";
  if(game==="ell"&&endReason==="giveup")return "GiveUp.png";
  if(game==="ell"&&!endReason&&won&&used===25)return "GoodWin.png";
  if(game==="ell"&&endReason==="stuck"&&used===24){
    // 24 letters keeps the special Brilliant Play art in the mix, while also
    // allowing any of the generic win stickers.
    return randomEndgameSticker(["GoodWin.png",...ENDGAME_GENERIC_WIN_STICKERS],key);
  }
  if(game==="ell"&&endReason==="stuck"&&used===23){
    return randomEndgameSticker(ENDGAME_GENERIC_WIN_STICKERS,key);
  }
  return randomEndgameSticker(won?ENDGAME_GENERIC_WIN_STICKERS:ENDGAME_GENERIC_LOSS_STICKERS,key);
}
function closeGlobalEndgame(){const o=document.getElementById("globalEndgameOverlay");if(o){o.hidden=true;o.setAttribute("aria-hidden","true")}}
function globalEndgameShareText(config){return config.shareText||`${config.kicker} — ${config.resultLine||formatPuzzleDate(config.date)}`}
async function shareGlobalEndgame(kind){if(!globalEndgameCurrent)return;const text=globalEndgameShareText(globalEndgameCurrent);if(kind==="native"&&navigator.share){await nativeShareWithTeaser(globalEndgameCurrent.game,globalEndgameCurrent.kicker,text);return}try{await navigator.clipboard.writeText(text);const b=document.getElementById(kind==="copy"?"globalEndgameCopy":"globalEndgameShare");if(b){const old=b.innerHTML;b.textContent="Copied ✓";setTimeout(()=>b.innerHTML=old,1200)}}catch(e){}}
function showGlobalEndgame(config){if(suppressRestoredEndgames||activeGame!==config.game)return;const key=globalEndgameKey(config.game,config.date,config.state||"complete",config.instanceKey||"");if(globalEndgameShown.has(key))return;globalEndgameShown.add(key);globalEndgameCurrent=config;const o=document.getElementById("globalEndgameOverlay");if(!o)return;document.getElementById("globalEndgameKicker").textContent=config.kicker||"PUZZLE COMPLETE";document.getElementById("globalEndgameVisual").innerHTML=config.visualHtml||globalEndgameIcon(config.game);document.getElementById("globalEndgameTitle").textContent=config.title||"Puzzle complete.";const answer=document.getElementById("globalEndgameAnswer");answer.hidden=!config.answerHtml;answer.innerHTML=config.answerHtml||"";document.getElementById("globalEndgameMessage").textContent=config.message||"";document.getElementById("globalEndgameStats").innerHTML=(config.stats||[]).map(s=>`<div><strong>${s.value}</strong><span>${s.label}</span></div>`).join("");document.getElementById("globalEndgameResultLine").textContent=config.resultLine||"";document.getElementById("globalEndgameShareSection").hidden=config.share===false;o.dataset.game=config.game||"";o.hidden=false;o.setAttribute("aria-hidden","false");configureEndgameNextOptions(config.game,"globalEndgameTryAnother")}
function queueGlobalEndgame(config,delay=80){
  if(suppressRestoredEndgames||activeGame!==config.game)return;
  const queuedEpoch=endgameNavigationEpoch;
  setTimeout(()=>{
    if(!suppressRestoredEndgames && activeGame===config.game && queuedEpoch===endgameNavigationEpoch){
      showGlobalEndgame(config);
    }
  },delay);
}
function quadsShareText(){
  const mistakes=Math.min(4,quadsMistakes),time=shareGoodTime("quads");
  let statement;
  if(quadsWon&&mistakes===0)statement=time?`I found all four groups without a single mistake in ${time}. Can you beat that?`:`I found all four groups without a single mistake! Can you beat that?`;
  else if(quadsWon&&mistakes===1)statement=time?`I found all four groups with just one mistake in ${time}. Can you beat that?`:`I found all four groups with just one mistake. Can you beat that?`;
  else if(quadsWon)statement=time?`I found all four groups in ${time}. Can you beat that?`:`I found all four groups. Can you beat that?`;
  else statement="I couldn't find all four groups. Can you?";
  return shareShell("InCommon",quadsPuzzle.date,statement,"quads");
}
function sameShareText(tries){
  let statement;
  if(!sameWon)statement="This one stumped me. Can you figure it out?";
  else if(tries===1)statement="I got this from the very first clue! Can you match that?";
  else if(tries===2)statement="I got this from just 2 clues. How early can you solve it?";
  else if(tries===3)statement="I got this from 3 clues. Can you get it sooner?";
  else statement="I got it on the final clue. Can you solve it earlier?";
  return shareShell("One and the Same",samePuzzle.date,statement,"same");
}
function ellShareText(score,used){
  const time=shareGoodTime("ell");
  let statement;
  if(score>=250&&used===25)statement=`I used every last letter and scored ${score} points! Can you top that?`;
  else if(score>=250&&used>=24)statement=`I scored ${score} points and used ${used} of 25 letters. Can you top that?`;
  else if(score>=250)statement=`I scored ${score} points! Can you top that?`;
  else if(used===25)statement=time?`I used every last letter in ${time}! Can you do it too?`:`I used every last letter! Can you do it too?`;
  else if(used===24)statement=time?`I used 24 of 25 letters in ${time}. Can you use them all?`:`I used 24 of 25 letters. Can you use them all?`;
  else if(used===23)statement=`I used 23 of 25 letters. Can you find more?`;
  else statement=`I scored ${score} points and used ${used} of 25 letters. Can you top my result?`;
  return shareShell("Every Last Letter",ellPuzzle.date,statement,"ell");
}
function trailShareText(){
  const time=shareGoodTime("trail"),bonus=wordTrailNonThemeFound.length,hints=wordTrailHintsUsed;
  let statement;
  if(hints===0&&time)statement=`I found every theme word without a hint in ${time}. Can you beat that?`;
  else if(hints===0&&bonus>=5)statement=`I found every theme word without a hint, plus ${bonus} bonus words. Can you beat that?`;
  else if(hints===0)statement="I found every theme word without using a hint. Can you beat that?";
  else if(time&&bonus>=5)statement=`I cleared the grid in ${time} and found ${bonus} bonus words. Can you beat that?`;
  else if(time)statement=`I found every theme word in ${time}. Can you beat that?`;
  else if(bonus>=5)statement=`I found every theme word plus ${bonus} bonus words. Can you beat that?`;
  else statement="I found every theme word. Can you clear the grid?";
  return shareShell("Unscrumble",wordTrailPuzzle.date,statement,"trail");
}
function miniShareText(){
  const time=shareGoodTime("mini"),noHints=!miniLetterHintsUsed&&!miniWordHintsUsed&&!miniRevealedPuzzle;
  let statement;
  if(miniRevealedPuzzle)statement="I needed the reveal on this one. Can you solve it?";
  else if(noHints&&time)statement=`I finished this in ${time} without using a hint. Can you beat my time?`;
  else if(noHints)statement="I finished this without using a hint. Can you beat that?";
  else if(time)statement=`I finished this in ${time}. Can you beat my time?`;
  else statement="I finished today's crossword. Can you solve it too?";
  return shareShell("Daily Crossword",miniPuzzle.date,statement,"mini");
}
function quadsEndgameConfig(){if(timerGameComplete("quads"))completePuzzleTimer("quads");if(!quadsPuzzle||!quadsComplete)return null;const visual=`<div class="global-quads-result">${quadsSolved.map(g=>`<span class="${difficultyClass(g.difficulty)}">${escapeSameHtml(g.label)}</span>`).join("")}</div>`;const mistakes=Math.min(4,quadsMistakes);return{game:"quads",date:quadsPuzzle.date,state:quadsWon?"win":"loss",kicker:"INCOMMON",title:quadsWon?"All four found.":"Not this time.",message:globalPick(GLOBAL_ENDGAME_MESSAGES.quads[quadsWon?"win":"loss"]),visualHtml:visual,stats:[{value:mistakes,label:"MISTAKES"},{value:puzzleTimeText("quads"),label:"TIME"}],resultLine:`InCommon · ${formatPuzzleDate(quadsPuzzle.date)} · ${quadsWon?"Solved":`${mistakes}/4 mistakes`}`,shareText:quadsShareText()}}
function sameEndgameConfig(){if(timerGameComplete("same"))completePuzzleTimer("same");if(!samePuzzle||!sameComplete)return null;const tries=Math.max(1,Math.min(4,sameRevealed)),state=sameWon?"win":"loss";const sticker=endgameStickerFor({game:"same",date:samePuzzle.date,state,won:sameWon,tries});return{game:"same",date:samePuzzle.date,state,kicker:"ONE AND THE SAME",title:sameWon?`Solved in ${tries}.`:"Not this time.",answerHtml:`The answer was <strong>${escapeSameHtml(samePuzzle.answer)}</strong>`,message:globalPick(GLOBAL_ENDGAME_MESSAGES.same[state]),visualHtml:endgameStickerHtml(sticker),stats:[{value:sameWon?tries:4,label:"GUESSES"},{value:puzzleTimeText("same"),label:"TIME"}],resultLine:`One and the Same · ${formatPuzzleDate(samePuzzle.date)} · ${sameWon?`${tries}/4`:"—/4"}`,shareText:sameShareText(tries)}}
function ellEndgameConfig(){if(timerGameComplete("ell"))completePuzzleTimer("ell");if(!ellPuzzle||(!ellComplete&&!ellEnded))return null;const won=ellComplete,used=ellUsed(),base=ellCurrentScore(),bonus=ellCompletionBonus(used),score=base+bonus,state=won?"win":`end-${ellEndReason||"ended"}`,instanceKey=`attempt-${ellEndgameAttempt}`;const sticker=endgameStickerFor({game:"ell",date:ellPuzzle.date,state,won,used,endReason:ellEndReason,selectionKey:instanceKey});return{game:"ell",date:ellPuzzle.date,state,instanceKey,kicker:"EVERY LAST LETTER",title:won?"Every last letter!":ellEndReason==="giveup"?"Run complete.":"No more words.",message:globalPick(GLOBAL_ENDGAME_MESSAGES.ell[won?"win":"loss"]),visualHtml:endgameStickerHtml(sticker),stats:[{value:score,label:"SCORE"},{value:`${used}/25`,label:"LETTERS USED"},{value:puzzleTimeText("ell"),label:"TIME"}],resultLine:bonus?`Every Last Letter · ${formatPuzzleDate(ellPuzzle.date)} · Base ${base} + ${bonus} bonus = ${score} pts`:`Every Last Letter · ${formatPuzzleDate(ellPuzzle.date)} · ${used}/25 · ${score} pts`,shareText:ellShareText(score,used)}}
function trailEndgameConfig(){if(timerGameComplete("trail"))completePuzzleTimer("trail");if(!wordTrailPuzzle||!wordTrailComplete)return null;const total=wtAllThemeWords().length,state="win";const sticker=endgameStickerFor({game:"trail",date:wordTrailPuzzle.date,state,won:true});return{game:"trail",date:wordTrailPuzzle.date,state,kicker:"UNSCRUMBLE",title:"Grid complete.",message:globalPick(GLOBAL_ENDGAME_MESSAGES.trail.win),visualHtml:endgameStickerHtml(sticker),stats:[{value:puzzleTimeText("trail"),label:"TIME"},{value:wordTrailHintsUsed,label:"HINTS USED"},{value:wordTrailNonThemeFound.length,label:"NON-THEME WORDS"}],resultLine:`Unscrumble · ${formatPuzzleDate(wordTrailPuzzle.date)} · ${wordTrailFound.length}/${total}`,shareText:trailShareText()}}
function miniEndgameVisual(){if(!miniPuzzle)return globalEndgameIcon("mini");return `<div class="global-mini-result" style="--ge-cols:${miniCols()}">${miniPuzzle.grid.flatMap((row,r)=>row.map((solution,c)=>solution==="#"?'<i class="black"></i>':`<i>${escapeSameHtml(miniValues[miniKey(r,c)]||"")}</i>`)).join("")}</div>`}
function miniHintSummary(){
  if(miniRevealedPuzzle)return "Full Reveal";
  const parts=[];
  if(miniLetterHintsUsed)parts.push(`${miniLetterHintsUsed} Letter ${miniLetterHintsUsed===1?"Hint":"Hints"}`);
  if(miniWordHintsUsed)parts.push(`${miniWordHintsUsed} Word ${miniWordHintsUsed===1?"Hint":"Hints"}`);
  return parts.length?parts.join(" · "):"No hints";
}
function miniEndgameConfig(){if(timerGameComplete("mini"))completePuzzleTimer("mini");if(!miniPuzzle||!miniComplete)return null;const revealed=miniRevealedPuzzle;return{game:"mini",date:miniPuzzle.date,state:revealed?"revealed":"win",kicker:"DAILY CROSSWORD",title:revealed?"Puzzle revealed.":"Crossword complete.",message:globalPick(GLOBAL_ENDGAME_MESSAGES.mini[revealed?"loss":"win"]),visualHtml:miniEndgameVisual(),stats:[{value:puzzleTimeText("mini"),label:"TIME"},{value:miniHintSummary(),label:"HINTS"}],resultLine:`Daily Crossword · ${formatPuzzleDate(miniPuzzle.date)} · ${revealed?"Revealed":"Solved"}`,shareText:miniShareText()}}


const PLAYER_KEY="puzzlePublicPlayerV3";
let puzzle=null;
let guesses=[];
let currentGuess="";
let sixToFiveResultCache=null;
let sixToFiveResultCacheKey="";
let gameComplete=false;
let fiveAnimating=false;
let fiveBracketsHeld=false;
let validGuesses=new Set();
let activeGame="home";

let selectedDate=new Date();
selectedDate.setHours(12,0,0,0);

const puzzleNookLaunchParams=new URLSearchParams(window.location.search);
const puzzleNookLaunchDate=puzzleNookLaunchParams.get("date");
const puzzleNookLaunchGame=puzzleNookLaunchParams.get("game");
if(/^\d{4}-\d{2}-\d{2}$/.test(puzzleNookLaunchDate||"")){
  const [launchYear,launchMonth,launchDay]=puzzleNookLaunchDate.split("-").map(Number);
  const launchDate=new Date(launchYear,launchMonth-1,launchDay,12,0,0,0);
  if(!Number.isNaN(launchDate.getTime()))selectedDate=launchDate;
}
if(PUBLIC_GAME_IDS.includes(puzzleNookLaunchGame)){
  activeGame=puzzleNookLaunchGame;
}

function dateKey(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function currentDateKey(){ return dateKey(selectedDate); }

function updateDateLabel(){
  const full=selectedDate.toLocaleDateString(undefined,{weekday:"short",year:"numeric",month:"short",day:"numeric"});
  const compact=selectedDate.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
  const desktop=document.getElementById("todayLabel");
  const mobile=document.getElementById("mobileTodayLabel");
  if(desktop)desktop.textContent=full;
  if(mobile)mobile.textContent=compact;
}

let mainPageAvailableDateKeys=null;
async function getMainPageAvailableDateKeys(){
  if(mainPageAvailableDateKeys)return mainPageAvailableDateKeys;
  try{
    const res=await fetch("/data/puzzles.json",{cache:"no-store"});
    if(!res.ok)throw new Error("Could not load puzzle dates");
    const db=await res.json();
    const today=browserTodayKey();
    mainPageAvailableDateKeys=[...new Set((db.puzzles||[])
      .filter(p=>p.status==="scheduled"&&p.date&&p.date<=today&&PUBLIC_GAME_IDS.includes(p.game))
      .map(p=>p.date))].sort();
  }catch(err){
    console.warn("Could not determine available Main Page dates",err);
    mainPageAvailableDateKeys=[currentDateKey()];
  }
  return mainPageAvailableDateKeys;
}
async function adjacentMainPageDateKey(delta){
  const keys=await getMainPageAvailableDateKeys();
  const current=currentDateKey();
  if(!keys.length)return null;
  if(delta<0){
    for(let i=keys.length-1;i>=0;i--)if(keys[i]<current)return keys[i];
  }else{
    for(let i=0;i<keys.length;i++)if(keys[i]>current)return keys[i];
  }
  return null;
}
async function navigateMainPageDate(delta){
  if(activeGame!=="home")return;
  const key=await adjacentMainPageDateKey(delta);
  if(!key)return;
  const [y,m,d]=key.split("-").map(Number);
  selectedDate=new Date(y,m-1,d,12);
  updateDateLabel();
  suppressRestoredEndgames=true;closeFiveEndgame();closeGlobalEndgame();
  await Promise.all([loadFiveForSelectedDate(),loadEveryLastLetterForSelectedDate(),loadOneAndTheSameForSelectedDate(),loadQuadsForSelectedDate(),loadWordTrailForSelectedDate(),loadMiniForSelectedDate()]);
  suppressRestoredEndgames=false;
  updateHomeDashboard();
  navigatePublicView("home",{replace:true});
}
async function updateMainPageDateNavigation(){
  const prev=document.getElementById("mainDatePrev");
  const next=document.getElementById("mainDateNext");
  const [prevKey,nextKey]=await Promise.all([adjacentMainPageDateKey(-1),adjacentMainPageDateKey(1)]);
  if(prev)prev.disabled=!prevKey;
  if(next)next.disabled=!nextKey;
}

async function changeDay(delta){
  const target=new Date(selectedDate);target.setDate(target.getDate()+delta);target.setHours(12,0,0,0);
  const today=new Date();today.setHours(12,0,0,0);if(target>today)return;

  if(PUBLIC_GAME_IDS.includes(activeGame)){
    const targetPuzzle=await fetchPuzzleForAllowanceCheck(activeGame,dateKey(target));
    if(targetPuzzle&&!canOpenPuzzleUnderAllowance(activeGame,targetPuzzle)){
      openPlayLimit(activeGame);
      return;
    }
  }

  suppressRestoredEndgames=true;
  closeFiveEndgame();
  closeGlobalEndgame();
  selectedDate=target;
  updateDateLabel();
  await Promise.all([
    loadFiveForSelectedDate(),
    loadEveryLastLetterForSelectedDate(),
    loadOneAndTheSameForSelectedDate(),
    loadQuadsForSelectedDate(),
    loadWordTrailForSelectedDate(),
    loadMiniForSelectedDate()
  ]);
  updateHomeDashboard();
  history.replaceState(publicHistoryState(activeGame),"",publicViewUrl(activeGame));
  suppressRestoredEndgames=false;
}

async function loadDictionary(){
  const res=await fetch("/data/five-guesses.json");
  if(!res.ok) throw new Error("Could not load Six to Five dictionary.");
  const list=await res.json();
  validGuesses=new Set(list.map(w=>String(w).toUpperCase()));
}

async function loadFiveForSelectedDate(){
  puzzle=null;
  guesses=[];
  sixToFiveResultCache=null;
  sixToFiveResultCacheKey="";
  currentGuess="";
  gameComplete=false;
  fiveAnimating=false;
  fiveBracketsHeld=false;
  fiveTimerElapsedMs=0;
  fiveTimerStartedAt=null;
  document.getElementById("fiveStatus").innerHTML="";

  const date=currentDateKey();
  const res=await fetch(`/api/puzzle/today?game=five&date=${encodeURIComponent(date)}`);

  if(!res.ok){
    document.getElementById("fivePuzzleMeta").textContent="No Six to Five scheduled";
    document.getElementById("fiveGrid").innerHTML="";
    document.getElementById("keyboard").innerHTML="";
    document.getElementById("fiveStatus").innerHTML=
      '<div class="result">There is no Six to Five puzzle scheduled for this date.</div>';
    return;
  }

  puzzle=await res.json();
  document.getElementById("fivePuzzleMeta").textContent=formatPuzzleDate(puzzle.date);

  restorePlayerState();
  drawFive();
}

function fiveHardModeEnabled(){
  return document.getElementById("hardModeToggle")?.getAttribute("aria-pressed")==="true";
}
function setFiveHardMode(enabled,{save=false}={}){
  const button=document.getElementById("hardModeToggle");
  if(!button)return;
  const on=!!enabled;
  button.setAttribute("aria-pressed",String(on));
  button.classList.toggle("is-active",on);
  button.textContent=on?"Hard Mode":"Easy Mode";
  if(save)savePlayerState();
}

function restorePlayerState(){
  const all=readJsonStorage(PLAYER_KEY,{});
  const s=all[fiveStateKey()]?.five;

  if(s && s.puzzleId===puzzle.id){
    guesses=s.guesses||[];
    gameComplete=!!s.complete;
    fiveTimerElapsedMs=Number(s.elapsedMs)||0;
    fiveTimerStartedAt=null;
    setFiveHardMode(!!s.hardMode);
  }else{
    setFiveHardMode(false);
  }
}

function savePlayerState(){
  if(!puzzle) return;
  const all=readJsonStorage(PLAYER_KEY,{});
  const stateKey=fiveStateKey();
  all[stateKey]??={};
  all[stateKey].five={
    puzzleId:puzzle.id,
    guesses,
    complete:gameComplete,
    hardMode:fiveHardModeEnabled(),
    elapsedMs:currentFiveElapsedMs()
  };
  writeJsonStorage(PLAYER_KEY,all);
}


/* =========================================================
   V100.52 — DYNAMIC HOW-TO-PLAY PANEL
   ========================================================= */

const GAME_INSTRUCTIONS={
  five:{
    name:"Six to Five",
    body:`
      <p>Guess the five-letter word in six tries. Every guess must be a valid five-letter word.</p>
      <p>After each guess, we will use different colors to tell you which letters were right and which were wrong.</p>
      <div class="instructions-legend">
        <div class="instructions-legend-row"><span class="instructions-swatch five-correct"></span><span><strong>Green</strong> — correct letter, correct spot</span></div>
        <div class="instructions-legend-row"><span class="instructions-swatch five-present"></span><span><strong>Blue</strong> — correct letter, wrong spot</span></div>
        <div class="instructions-legend-row"><span class="instructions-swatch five-absent"></span><span><strong>Black</strong> — letter is not in the word</span></div>
      </div>
      <p>Letters can appear more than once.</p>
      <p><strong>Hard Mode:</strong> Any clues revealed by previous guesses must be used in your next guess.</p>
      <p class="instructions-goal"><strong>Goal:</strong> Find the word in as few guesses as possible.</p>`
  },
  quads:{
    name:"InCommon",
    body:`
      <p>Find four groups of four words that share something in common. There is only one complete solution to each puzzle.</p>
      <p>Select four words and submit your guess. You can make up to <strong>four mistakes</strong>. If three of your four selections belong together, we'll let you know you're close.</p>
      <p>When you solve a category, its color shows its difficulty:</p>
      <div class="instructions-legend incommon-legend">
        <div class="instructions-legend-row"><span class="instructions-swatch quads-easy"></span><span><strong>Yellow</strong> — Easy</span></div>
        <div class="instructions-legend-row"><span class="instructions-swatch quads-medium"></span><span><strong>Green</strong> — Medium</span></div>
        <div class="instructions-legend-row"><span class="instructions-swatch quads-hard"></span><span><strong>Blue</strong> — Hard</span></div>
        <div class="instructions-legend-row"><span class="instructions-swatch quads-very-hard"></span><span><strong>Purple</strong> — Very Hard</span></div>
      </div>
      <p>Categories can be straightforward—or a little sneaky. Watch for words that could appear to fit more than one group.</p>
      <p class="instructions-goal"><strong>Goal:</strong> Find all four groups before your fourth mistake.</p>`
  },
  mini:{
    name:"Daily Crossword",
    body:`
      <p>Fill the grid using the Across and Down clues.</p>
      <p>Select a square to see its clue. Tap the square again to switch between Across and Down. Type a letter to fill the active square, and use the arrow keys or <strong>Enter</strong> to move through the puzzle.</p>
      <p>The game ends when all of the squares are filled correctly. If you are having trouble, you can use a <strong>Hint</strong> to reveal a word, letter, or the entire puzzle.</p>
      <p class="instructions-goal"><strong>Goal:</strong> Complete the entire crossword.</p>`
  },
  trail:{
    name:"Unscrumble",
    body:`
      <p>Find the hidden theme words in the letter grid.</p>
      <p>Start on any letter and trace through adjacent letters to make a word. You can move horizontally, vertically, or diagonally. Each theme word follows one continuous path.</p>
      <p>Alternatively, you can tap connecting letters and then tap <strong>SUBMIT</strong> to submit a word.</p>
      <p>Non-theme words earn pieces towards a <strong>Hint</strong>. Three pieces gets you one Hint. Spend your Hints to reveal theme words.</p>
      <p class="instructions-goal"><strong>Goal:</strong> Find every hidden theme word.</p>`
  },
  ell:{
    name:"Every Last Letter",
    body:`
      <p>Make words using the 25 letters on the board.</p>
      <p>Select letters to build a word, then submit it. Each letter tile can be used only once, so every word you make changes what's available for the rest of the puzzle. Longer words are worth more points.</p>
      <p>Every puzzle has at least one solution that uses all 25 letters, and most puzzles have at least 25 different complete solutions.</p>
      <p>Longer words are worth more points. You also earn a completion bonus based on how many letters you use: <strong>23 letters = +25 points</strong>, <strong>24 letters = +50 points</strong>, and <strong>all 25 letters = +100 points</strong>.</p>
      <p class="instructions-goal"><strong>Goal:</strong> Use every last letter—and score as many points as you can.</p>`
  },
  same:{
    name:"One and the Same",
    body:`
      <p>Four clues. One answer.</p>
      <p>You'll start with a single clue. Enter the word you think it describes.</p>
      <p>Guess incorrectly and another clue is revealed. Each different clue is describing the <strong>same one answer</strong>. You have up to four guesses.</p>
      <p class="instructions-goal"><strong>Goal:</strong> Find the answer using as few clues as possible.</p>`
  }
};

function updateGameInstructionsButton(){
  const btn=document.getElementById("gameInstructionsBtn");
  if(!btn)return;
  const cfg=GAME_INSTRUCTIONS[activeGame];
  btn.hidden=!cfg;
  if(cfg){
    btn.setAttribute("aria-label",`How to play ${cfg.name}`);
    btn.title=`How to play ${cfg.name}`;
  }
}

function openGameInstructions(){
  const cfg=GAME_INSTRUCTIONS[activeGame];
  const overlay=document.getElementById("gameInstructionsOverlay");
  if(!cfg||!overlay)return;

  const kicker=document.getElementById("gameInstructionsKicker");
  const title=document.getElementById("gameInstructionsTitle");
  const body=document.getElementById("gameInstructionsBody");
  if(kicker)kicker.textContent=cfg.name.toUpperCase();
  if(title)title.textContent="How to play";
  if(body)body.innerHTML=cfg.body;

  overlay.hidden=false;
  overlay.setAttribute("aria-hidden","false");
  document.body.classList.add("instructions-open");
  requestAnimationFrame(()=>document.getElementById("gameInstructionsClose")?.focus());
}

function closeGameInstructions(){
  const overlay=document.getElementById("gameInstructionsOverlay");
  if(!overlay||overlay.hidden)return;
  overlay.hidden=true;
  overlay.setAttribute("aria-hidden","true");
  document.body.classList.remove("instructions-open");
  document.getElementById("gameInstructionsBtn")?.focus();
}

document.getElementById("gameInstructionsBtn")?.addEventListener("click",openGameInstructions);
document.getElementById("gameInstructionsClose")?.addEventListener("click",closeGameInstructions);
document.getElementById("gameInstructionsOverlay")?.addEventListener("click",event=>{
  if(event.target===event.currentTarget)closeGameInstructions();
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!document.getElementById("gameInstructionsOverlay")?.hidden){
    closeGameInstructions();
  }
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!document.getElementById("gameTitleArchiveConfirmOverlay")?.hidden){
    closeGameTitleArchiveConfirm({restoreFocus:true});
  }
});

function setActiveGame(game){
  /* V103.3: commit elapsed foreground time before leaving the current puzzle. */
  if(PUBLIC_GAME_IDS.includes(activeGame))pausePuzzleTimer(activeGame);
  if(activeGame==="five")stopFiveTimer();
  endgameNavigationEpoch++;
  closeFiveEndgame();
  closeGlobalEndgame();
  closeGameInstructions();
  activeGame=game;
  updateGameInstructionsButton();
  document.body.classList.toggle("home-view",game==="home");
  if(game==="home") updateHomeDashboard();
  renderPlayDots();updatePuzzleMetaLinks();wirePuzzleMetaLinks();wireGameTitleArchiveLinks();
  const frontPage=document.getElementById("frontPage");
  const playArea=document.getElementById("playArea");
  const isHome=game==="home";
  if(frontPage) frontPage.classList.toggle("front-page-hidden",!isHome);
  if(playArea) playArea.classList.toggle("play-area-hidden",isHome);
  const gamePanels=Object.fromEntries(
    Object.entries(GAME_PANEL_IDS).map(([key,id])=>[key,document.getElementById(id)])
  );
  Object.values(gamePanels).forEach(panel=>{
    if(panel){
      panel.classList.add("game-hidden");
      panel.classList.remove("game-visible");
    }
  });
  const active=isHome?null:gamePanels[game];
  if(active){
    active.classList.remove("game-hidden");
    active.classList.add("game-visible");
  }
  if(!isHome)activatePuzzleTimer(game);
  else syncActivePuzzleTimer();
  if(game==="five"){
    queueFiveMobileBoardSize();
  }
  if(game==="trail"){
    requestAnimationFrame(()=>requestAnimationFrame(queueWordTrailMobileBoardSize));
  }
  document.querySelectorAll(".game-tab").forEach(tab=>{
    tab.classList.toggle("active", tab.dataset.game===game);
    tab.setAttribute("aria-current", tab.dataset.game===game ? "page" : "false");
  });
}
function updateHomeDashboard(){
  const archived=!isTodaySelected();
  const front=document.getElementById("frontPage");if(front)front.classList.toggle("is-archived",archived);
  const eyebrow=document.getElementById("homeEyebrow"),title=document.getElementById("homeTitle"),dateHost=document.getElementById("homeDate");
  if(eyebrow)eyebrow.textContent=archived?"ARCHIVED PUZZLE":"DAILY PUZZLES";
  if(title)title.textContent=archived?`${selectedDate.toLocaleDateString(undefined,{weekday:window.matchMedia("(max-width: 700px)").matches?"short":"long",month:"long",day:"numeric"})}`:"Today’s Puzzles";
  if(dateHost)dateHost.textContent=archived?String(selectedDate.getFullYear()):selectedDate.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  const states={
    five:!!gameComplete,
    same:!!sameComplete,
    quads:!!quadsComplete,
    mini:!!miniComplete,
    trail:!!wordTrailComplete,
    ell:!!(ellComplete||ellEnded||ellHistoricalRecord()?.completed)
  };
  const defaults={
    five:"Find the five-letter word in six tries.",
    same:"Different clues. One answer.",
    quads:"Find four groups of four.",
    mini:"A quick daily crossword.",
    trail:"Trace themed words through the grid.",
    ell:"Make words. Use every last letter."
  };
  const fiveSolved=!!(puzzle&&guesses.includes(puzzle.answer));
  const miniHintsUsed=miniLetterHintsUsed>0||miniWordHintsUsed>0;
  const stats={
    five:fiveSolved?`${guesses.length} ${guesses.length===1?"guess":"guesses"}`:"Not solved",
    same:sameWon?`${Math.max(1,Math.min(4,sameRevealed))} ${sameRevealed===1?"clue":"clues"}`:"Not solved",
    quads:quadsWon?`${quadsMistakes} ${quadsMistakes===1?"mistake":"mistakes"}`:"Not solved",
    mini:miniRevealedPuzzle?"Reveal Used":`${puzzleTimeText("mini")}${miniHintsUsed?" *Hints used":""}`,
    trail:puzzleTimeText("trail"),
    ell:`High Score: ${ellHighestScoreForCurrentPuzzle()} points`
  };
  const count=Object.values(states).filter(Boolean).length;
  const text=document.getElementById("homeProgressText");
  const fill=document.getElementById("homeProgressFill");
  if(text)text.textContent=`${count} / 6 completed`;
  if(fill)fill.style.width=`${(count/6)*100}%`;
  renderPlayDots();updatePuzzleMetaLinks();wirePuzzleMetaLinks();updateMainPageDateNavigation();
  document.querySelectorAll("[data-front-game]").forEach(card=>{
    const key=card.dataset.frontGame;
    const complete=!!states[key];
    card.classList.toggle("is-complete",complete);
    const sub=card.querySelector(".front-card-sub");
    if(sub)sub.textContent=complete?`Completed - ${stats[key]}`:defaults[key];
  });
}
function publicViewUrl(game=activeGame,date=selectedDate){
  const url=new URL(window.location.href);
  const key=dateKey(date);
  const today=new Date();today.setHours(12,0,0,0);
  if(key===dateKey(today))url.searchParams.delete("date");
  else url.searchParams.set("date",key);
  if(game==="home")url.searchParams.delete("game");
  else url.searchParams.set("game",game);
  return `${url.pathname}${url.search}${url.hash}`;
}
function publicHistoryState(game=activeGame,date=selectedDate){
  return {puzzleNook:true,game,date:dateKey(date)};
}
function navigatePublicView(game,{replace=false}={}){
  const next=game==="home"?"home":(PUBLIC_GAME_IDS.includes(game)?game:"home");
  if(next!=="home"&&!canOpenGameUnderAllowance(next)){openPlayLimit(next);return;}
  const sameView=next===activeGame;
  setActiveGame(next);
  closeMobileSiteMenu();
  if(next==="home")window.scrollTo({top:0,behavior:"smooth"});
  const state=publicHistoryState(next);
  const url=publicViewUrl(next);
  if(replace||sameView)history.replaceState(state,"",url);
  else history.pushState(state,"",url);
}
async function restorePublicHistoryState(state){
  closeMobileSiteMenu();
  const params=new URLSearchParams(window.location.search);
  const stateGame=state?.puzzleNook?state.game:null;
  const requestedGame=stateGame==="home"||PUBLIC_GAME_IDS.includes(stateGame)
    ? stateGame
    : (PUBLIC_GAME_IDS.includes(params.get("game"))?params.get("game"):"home");
  const rawDate=(state?.puzzleNook&&/^\d{4}-\d{2}-\d{2}$/.test(state.date||""))
    ? state.date
    : params.get("date");

  if(/^\d{4}-\d{2}-\d{2}$/.test(rawDate||"") && rawDate!==currentDateKey()){
    suppressRestoredEndgames=true;
    closeFiveEndgame();
    closeGlobalEndgame();
    const [y,m,d]=rawDate.split("-").map(Number);
    selectedDate=new Date(y,m-1,d,12,0,0,0);
    updateDateLabel();
    await Promise.all([
      loadFiveForSelectedDate(),
      loadEveryLastLetterForSelectedDate(),
      loadOneAndTheSameForSelectedDate(),
      loadQuadsForSelectedDate(),
      loadWordTrailForSelectedDate(),
      loadMiniForSelectedDate()
    ]);
    updateHomeDashboard();
    suppressRestoredEndgames=false;
  }
  if(requestedGame!=="home"&&!canOpenGameUnderAllowance(requestedGame)){
    setActiveGame("home");
    history.replaceState(publicHistoryState("home"),"",publicViewUrl("home"));
    openPlayLimit(requestedGame);
    window.scrollTo({top:0,behavior:"auto"});
    return;
  }
  setActiveGame(requestedGame);
  window.scrollTo({top:0,behavior:"auto"});
}
window.addEventListener("popstate",event=>{restorePublicHistoryState(event.state).catch(err=>console.error("Could not restore PuzzleNook browser history:",err));});

function showHomePage(){ navigatePublicView("home"); }
function showFive(){ navigatePublicView("five"); }
function showEveryLastLetter(){ navigatePublicView("ell"); }
function showOneAndTheSame(){ navigatePublicView("same"); }

function scoreWord(guess,answer){
  const result=Array(5).fill("absent");
  const pool=answer.split("");

  // Correct letter, correct position first.
  for(let i=0;i<5;i++){
    if(guess[i]===answer[i]){
      result[i]="good";
      pool[i]=null;
    }
  }

  // Then allocate remaining matching letters once each.
  for(let i=0;i<5;i++){
    if(result[i]==="good") continue;
    const j=pool.indexOf(guess[i]);
    if(j>=0){
      result[i]="present";
      pool[j]=null;
    }
  }
  return result;
}

function buildHardModeConstraints(){
  const fixed={};
  const minCounts={};

  for(const previous of guesses){
    const feedback=scoreWord(previous,puzzle.answer);
    const positiveThisGuess={};

    for(let i=0;i<5;i++){
      if(feedback[i]==="good"){
        fixed[i]=previous[i];
        positiveThisGuess[previous[i]]=(positiveThisGuess[previous[i]]||0)+1;
      }else if(feedback[i]==="present"){
        positiveThisGuess[previous[i]]=(positiveThisGuess[previous[i]]||0)+1;
      }
    }

    for(const [letter,count] of Object.entries(positiveThisGuess)){
      minCounts[letter]=Math.max(minCounts[letter]||0,count);
    }
  }

  return {fixed,minCounts};
}

function hardModeViolation(guess){
  if(!fiveHardModeEnabled() || guesses.length===0){
    return null;
  }

  const {fixed,minCounts}=buildHardModeConstraints();

  for(const [pos,letter] of Object.entries(fixed)){
    if(guess[Number(pos)]!==letter){
      return `Hard Mode: position ${Number(pos)+1} must be ${letter}.`;
    }
  }

  for(const [letter,minimum] of Object.entries(minCounts)){
    const count=[...guess].filter(ch=>ch===letter).length;
    if(count<minimum){
      return minimum===1
        ? `Hard Mode: your guess must contain ${letter}.`
        : `Hard Mode: your guess must contain at least ${minimum} ${letter}'s.`;
    }
  }

  return null;
}


/* V96 — Six to Five mobile board sizing.
   Measure the actual free space above the fixed keyboard instead of
   estimating it from viewport height. This keeps a small guaranteed
   buffer above the keyboard on short screens. */
function sizeFiveMobileBoard(){
  const grid=document.getElementById("fiveGrid");
  const stage=document.querySelector("#fivePanel .five-board-stage");
  const keyboard=document.getElementById("keyboard");
  if(!grid||!stage||!keyboard)return;

  if(window.innerWidth>700){
    grid.style.removeProperty("--five-dynamic-width");
    return;
  }

  const stageRect=stage.getBoundingClientRect();
  const keyboardRect=keyboard.getBoundingClientRect();

  /* Deliberate visible breathing room between the final row and keyboard. */
  const bottomBuffer=14;
  const availableHeight=Math.max(0,keyboardRect.top-stageRect.top-bottomBuffer);

  const computed=getComputedStyle(grid);
  const gap=parseFloat(computed.rowGap)||7;

  /* Six rows x five columns, square tiles:
     H = 6t + 5g  =>  t = (H - 5g) / 6
     W = 5t + 4g
  */
  const tileFromHeight=Math.max(0,(availableHeight-(5*gap))/6);
  const widthFromHeight=(5*tileFromHeight)+(4*gap);

  /* Keep the board comfortably inside the stage so the active-row
     brackets also remain visible. */
  const widthFromStage=Math.max(0,stage.clientWidth-12);
  const target=Math.floor(Math.min(410,widthFromStage,widthFromHeight));

  /* Avoid applying an unusably tiny transient value while mobile layout
     is still settling. */
  if(target>=175){
    grid.style.setProperty("--five-dynamic-width",`${target}px`);
  }
}

/* V100.50 — Six to Five initial mobile sizing.
   The puzzle is preloaded while its panel is hidden, so its first sizing
   pass can occur before the stage/keyboard have real geometry. Re-measure
   after the panel becomes visible and again as the mobile viewport settles. */
let fiveMobileSizeTimers=[];
function queueFiveMobileBoardSize(){
  fiveMobileSizeTimers.forEach(clearTimeout);
  fiveMobileSizeTimers=[];

  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      sizeFiveMobileBoard();
      fiveMobileSizeTimers.push(setTimeout(sizeFiveMobileBoard,80));
      fiveMobileSizeTimers.push(setTimeout(sizeFiveMobileBoard,220));
      fiveMobileSizeTimers.push(setTimeout(sizeFiveMobileBoard,450));
    });
  });
}


/* =========================================================
   V100.77 — UNIVERSAL PUZZLE STATUS BADGES
   ========================================================= */
function puzzleStatusMarkup(solved){
  return solved
    ? `<strong><svg class="puzzle-status-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="20 6 9 17 4 12"></polyline></svg><span>SOLVED</span></strong>`
    : `<strong><svg class="puzzle-status-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8"></circle><path d="M6.35 17.65 17.65 6.35"></path></svg><span>NOT-SOLVED</span></strong>`;
}
function updatePuzzleEndStatus(game){
  const config={
    five:{host:"fivePuzzleStatus",panel:"fivePanel",complete:!!gameComplete,solved:!!(puzzle&&guesses.includes(puzzle.answer)),allowLoss:true},
    same:{host:"samePuzzleStatus",panel:"samePanel",complete:!!sameComplete,solved:!!sameWon,allowLoss:true},
    quads:{host:"quadsPuzzleStatus",panel:"quadsPanel",complete:!!quadsComplete,solved:!!quadsWon,allowLoss:true},
    mini:{host:"miniPuzzleStatus",panel:"miniPanel",complete:!!miniComplete,solved:true,allowLoss:false},
    trail:{host:"wordTrailPuzzleStatus",panel:"wordTrailPanel",complete:!!wordTrailComplete,solved:true,allowLoss:false},
    ell:{host:"ellPuzzleStatus",panel:"ellPanel",complete:!!ellComplete,solved:true,allowLoss:false}
  }[game];
  if(!config)return;
  const host=document.getElementById(config.host),panel=document.getElementById(config.panel);
  if(!host)return;
  const show=config.complete&&(config.solved||config.allowLoss);
  host.hidden=!show;
  host.classList.toggle("is-solved",show&&config.solved);
  host.classList.toggle("is-not-solved",show&&!config.solved);
  host.innerHTML=show?puzzleStatusMarkup(config.solved):"";
  if(panel)panel.classList.toggle("has-puzzle-end-status",show);
}

function drawFive(){
  updatePuzzleEndStatus("five");
  if(!puzzle) return;

  const grid=document.getElementById("fiveGrid");
  grid.innerHTML="";
  grid.classList.toggle("five-brackets-held",fiveBracketsHeld);

  for(let r=0;r<6;r++){
    const text=guesses[r] || (r===guesses.length ? currentGuess : "");
    const feedback=guesses[r] ? scoreWord(guesses[r],puzzle.answer) : [];

    for(let c=0;c<5;c++){
      const tile=document.createElement("div");
      tile.className=`tile ${feedback[c]||""}`;
      tile.dataset.row=String(r);
      tile.dataset.col=String(c);
      const isActiveRow=!gameComplete && r===guesses.length && guesses.length<6;
      if(isActiveRow){
        tile.classList.add("active-five-row");
        if(c===0)tile.classList.add("active-five-row-start");
        if(c===4)tile.classList.add("active-five-row-end");
      }
      tile.textContent=text[c]||"";
      grid.appendChild(tile);
    }
  }

  drawKeyboard();
  queueFiveMobileBoardSize();

  const status=document.getElementById("fiveStatus");
  if(gameComplete){
    status.innerHTML="";
    // Restoring a completed puzzle while navigating dates should update the board
    // silently. End-game modals are reserved for a completion that happens during
    // the player's current interaction, not merely for loading stored history.
    if(!fiveAnimating&&!suppressRestoredEndgames){
      requestAnimationFrame(()=>{
        if(!suppressRestoredEndgames)showFiveEndgame();
      });
    }
  }else{
    status.innerHTML="";
    closeFiveEndgame();
  }
}

function getFiveKeyboardStates(){
  const rank={absent:1,present:2,good:3};
  const states={};
  if(!puzzle) return states;

  for(const previous of guesses){
    const feedback=scoreWord(previous,puzzle.answer);
    for(let i=0;i<previous.length;i++){
      const letter=previous[i];
      const state=feedback[i];
      if(!states[letter] || rank[state]>rank[states[letter]]) states[letter]=state;
    }
  }
  return states;
}

function drawKeyboard(){
  const rows=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
  const host=document.getElementById("keyboard");
  const keyStates=getFiveKeyboardStates();
  host.innerHTML="";

  rows.forEach((row,index)=>{
    const wrap=document.createElement("div");
    wrap.className="key-row";

    if(index===2){
      const back=document.createElement("button");
      back.type="button";
      back.className="key key-action";
      back.textContent="Delete";
      back.onclick=()=>pressKey("BACK");
      wrap.appendChild(back);
    }

    [...row].forEach(ch=>{
      const button=document.createElement("button");
      button.type="button";
      button.className=`key ${keyStates[ch]||""}`.trim();
      button.textContent=ch;
      button.onclick=()=>pressKey(ch);
      wrap.appendChild(button);
    });

    if(index===2){
      const enter=document.createElement("button");
      enter.type="button";
      enter.className="key key-action submit-action";
      enter.textContent="Submit";
      enter.onclick=submitGuess;
      wrap.appendChild(enter);
    }

    host.appendChild(wrap);
  });
}

function fiveTileAt(row,col){
  return document.querySelector(`#fiveGrid .tile[data-row="${row}"][data-col="${col}"]`);
}
function fiveActiveTiles(){
  return [...document.querySelectorAll("#fiveGrid .tile.active-five-row")];
}
function fiveAnimateActiveRowNudge(){
  const tiles=fiveActiveTiles();
  tiles.forEach(tile=>{
    tile.classList.remove("five-row-nudge");
    void tile.offsetWidth;
    tile.classList.add("five-row-nudge");
  });
  setTimeout(()=>tiles.forEach(tile=>tile.classList.remove("five-row-nudge")),260);
}
function fiveAnimateTypedTile(col){
  const tile=fiveTileAt(guesses.length,col);
  if(!tile)return;
  tile.classList.remove("five-letter-pop");
  void tile.offsetWidth;
  tile.classList.add("five-letter-pop");
  setTimeout(()=>tile.classList.remove("five-letter-pop"),150);
}
function fiveApplyKeyStates(states){
  document.querySelectorAll("#keyboard .key").forEach(key=>{
    const letter=(key.textContent||"").trim().toUpperCase();
    if(!/^[A-Z]$/.test(letter))return;
    key.classList.remove("good","present","absent");
    if(states[letter])key.classList.add(states[letter]);
  });
}
function fiveAnimateBracketAdvance(){
  const grid=document.getElementById("fiveGrid");
  const tiles=fiveActiveTiles();
  if(!grid||!tiles.length){
    fiveBracketsHeld=false;
    if(grid)grid.classList.remove("five-brackets-held");
    return;
  }

  tiles.forEach(tile=>tile.classList.add("five-brackets-slide"));
  fiveBracketsHeld=false;

  requestAnimationFrame(()=>{
    grid.classList.remove("five-brackets-held");
  });
}
function fiveAnimateSolvedRow(row,done){
  const tiles=[...document.querySelectorAll(`#fiveGrid .tile[data-row="${row}"]`)];
  tiles.forEach(tile=>tile.classList.add("five-solved-lift"));
  setTimeout(()=>{
    tiles.forEach(tile=>tile.classList.remove("five-solved-lift"));
    if(done)done();
  },300);
}
function fiveFinishSubmittedGuess(row,solved){
  fiveAnimating=false;
  if(solved){
    fiveAnimateSolvedRow(row,()=>requestAnimationFrame(showFiveEndgame));
  }else if(gameComplete){
    requestAnimationFrame(showFiveEndgame);
  }else{
    fiveAnimateBracketAdvance();
  }
}
function fiveAnimateSubmittedGuess(row,guess,priorKeyStates){
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const feedback=scoreWord(guess,puzzle.answer);
  const finalKeyStates=getFiveKeyboardStates();

  if(reduced){
    fiveApplyKeyStates(finalKeyStates);
    fiveFinishSubmittedGuess(row,guess===puzzle.answer);
    return;
  }

  const tiles=[];
  for(let c=0;c<5;c++){
    const tile=fiveTileAt(row,c);
    if(tile){
      tile.classList.add("five-reveal-pending");
      tiles.push(tile);
    }
  }

  fiveApplyKeyStates(priorKeyStates);

  const step=92;
  const duration=190;
  tiles.forEach((tile,c)=>{
    setTimeout(()=>{
      tile.classList.remove("five-reveal-pending");
      tile.classList.add("five-tile-reveal");
      const letter=guess[c];
      document.querySelectorAll("#keyboard .key").forEach(key=>{
        if((key.textContent||"").trim().toUpperCase()!==letter)return;
        key.classList.remove("good","present","absent","five-key-reveal");
        if(finalKeyStates[letter])key.classList.add(finalKeyStates[letter]);
        void key.offsetWidth;
        key.classList.add("five-key-reveal");
        setTimeout(()=>key.classList.remove("five-key-reveal"),180);
      });
      setTimeout(()=>tile.classList.remove("five-tile-reveal"),duration+40);
    },c*step);
  });

  const revealDone=(4*step)+duration+55;
  setTimeout(()=>fiveFinishSubmittedGuess(row,guess===puzzle.answer),revealDone);
}

function showMessage(text,type="invalid"){
  document.getElementById("fiveStatus").innerHTML=
    `<div class="${type==="hard"?"hard-msg":"invalid-msg"}">${text}</div>`;
}

function pressKey(ch){
  if(!puzzle || gameComplete || fiveAnimating) return;

  if(ch==="BACK"){
    if(!currentGuess.length)return;
    const col=currentGuess.length-1;
    const tile=fiveTileAt(guesses.length,col);
    if(tile && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      fiveAnimating=true;
      tile.classList.add("five-letter-delete");
      setTimeout(()=>{
        currentGuess=currentGuess.slice(0,-1);
        fiveAnimating=false;
        drawFive();
      },90);
    }else{
      currentGuess=currentGuess.slice(0,-1);
      drawFive();
    }
  }else if(currentGuess.length<5){
    if(!registerFiveStarted())return;
    ensureFiveTimerRunning();
    const col=currentGuess.length;
    currentGuess+=ch;
    drawFive();
    fiveAnimateTypedTile(col);
  }
}

function submitGuess(){
  if(!puzzle || gameComplete || fiveAnimating || currentGuess.length!==5) return;

  const guess=currentGuess.toUpperCase();

  // A bad dictionary entry does not use an attempt.
  if(!validGuesses.has(guess)){
    showMessage("Not in word list");
    fiveAnimateActiveRowNudge();
    return;
  }

  const hardError=hardModeViolation(guess);
  if(hardError){
    showMessage(hardError,"hard");
    fiveAnimateActiveRowNudge();
    return;
  }

  const priorKeyStates=getFiveKeyboardStates();
  const row=guesses.length;
  fiveAnimating=true;
  fiveBracketsHeld=guess!==puzzle.answer && guesses.length<5;
  guesses.push(guess);

  if(guess===puzzle.answer || guesses.length===6){
    gameComplete=true;
    stopFiveTimer();
    registerFiveCompleted();
    registerDailyGameCompletion("five",puzzle);
  }

  currentGuess="";
  savePlayerState();
  drawFive();
  fiveAnimateSubmittedGuess(row,guess,priorKeyStates);
}

document.addEventListener("keydown",event=>{
  if(activeGame!=="five" || gameComplete) return;
  if(event.ctrlKey || event.metaKey || event.altKey) return;

  if(/^[a-zA-Z]$/.test(event.key)){
    event.preventDefault();
    pressKey(event.key.toUpperCase());
  }else if(event.key==="Backspace" || event.key==="Delete"){
    event.preventDefault();
    pressKey("BACK");
  }else if(event.key==="Enter"){
    event.preventDefault();
    submitGuess();
  }
});

const prevDayBtn=document.getElementById("prevDayBtn");
const nextDayBtn=document.getElementById("nextDayBtn");
const hardModeToggle=document.getElementById("hardModeToggle");
if(prevDayBtn) prevDayBtn.onclick=()=>changeDay(-1);
if(nextDayBtn) nextDayBtn.onclick=()=>changeDay(1);
const mainDatePrev=document.getElementById("mainDatePrev");
const mainDateNext=document.getElementById("mainDateNext");
if(mainDatePrev)mainDatePrev.onclick=()=>navigateMainPageDate(-1);
if(mainDateNext)mainDateNext.onclick=()=>navigateMainPageDate(1);
document.getElementById("playLimitClose")?.addEventListener("click",closePlayLimit);
document.getElementById("playLimitOverlay")?.addEventListener("click",e=>{if(e.target===e.currentTarget)closePlayLimit()});
if(hardModeToggle) hardModeToggle.addEventListener("click",()=>setFiveHardMode(!fiveHardModeEnabled(),{save:true}));


function resetFiveForSelectedDate(){
  const all=readJsonStorage(PLAYER_KEY,{});
  const stateKey=fiveStateKey();
  if(all[stateKey]?.five){
    delete all[stateKey].five;
    if(Object.keys(all[stateKey]).length===0) delete all[stateKey];
    writeJsonStorage(PLAYER_KEY,all);
  }
  guesses=[];
  sixToFiveResultCache=null;
  sixToFiveResultCacheKey="";
  currentGuess="";
  gameComplete=false;
  fiveAnimating=false;
  fiveBracketsHeld=false;
  fiveTimerElapsedMs=0;
  fiveTimerStartedAt=null;
  if(document.getElementById("hardModeToggle")) setFiveHardMode(false);
}

function resetQuadsForSelectedDate(){
  const all=readJsonStorage(QUADS_PLAYER_KEY,{});
  delete all[currentDateKey()];
  writeJsonStorage(QUADS_PLAYER_KEY,all);
  quadsRemaining=[];
  quadsSelected.clear();
  quadsSolved=[];
  quadsMistakes=0;
  quadsComplete=false;
  quadsWon=false;
  quadsIncorrectGuesses=[];
}

async function resetActiveGame(){
  if(activeGame==="home")return;
  if(activeGame==="ell"){
    resetEveryLastLetterForSelectedDate();
    await loadEveryLastLetterForSelectedDate();
    setActiveGame("ell");
  }else if(activeGame==="same"){
    resetOneAndTheSameForSelectedDate();
    await loadOneAndTheSameForSelectedDate();
    setActiveGame("same");
  }else if(activeGame==="quads"){
    resetQuadsForSelectedDate();
    await loadQuadsForSelectedDate();
    setActiveGame("quads");
  }else if(activeGame==="trail"){
    resetWordTrailForSelectedDate();
    await loadWordTrailForSelectedDate();
    setActiveGame("trail");
  }else if(activeGame==="mini"){
    resetMiniForSelectedDate();
    await loadMiniForSelectedDate();
    setActiveGame("mini");
  }else{
    resetFiveForSelectedDate();
    await loadFiveForSelectedDate();
    setActiveGame("five");
  }
}
const resetActiveGameBtn=document.getElementById("resetActiveGameBtn");
if(resetActiveGameBtn) resetActiveGameBtn.onclick=resetActiveGame;

function openMobileSiteMenu(){
  const menu=document.getElementById("mobileSiteMenu");
  const btn=document.getElementById("mobileMenuBtn");
  if(menu)menu.hidden=false;
  if(btn)btn.setAttribute("aria-expanded","true");
}
function closeMobileSiteMenu(){
  const menu=document.getElementById("mobileSiteMenu");
  const btn=document.getElementById("mobileMenuBtn");
  if(menu)menu.hidden=true;
  if(btn)btn.setAttribute("aria-expanded","false");
}
function toggleMobileSiteMenu(){
  const menu=document.getElementById("mobileSiteMenu");
  if(!menu||menu.hidden)openMobileSiteMenu();else closeMobileSiteMenu();
}
function navigateToGame(game){
  if(game==="home")return showHomePage();
  if(game==="five")return showFive();
  if(game==="ell")return showEveryLastLetter();
  if(game==="same")return showOneAndTheSame();
  if(game==="quads")return showQuads();
  if(game==="trail")return showWordTrail();
  if(game==="mini")return showMini();
}

document.getElementById("brandHomeBtn")?.addEventListener("click",navigateTodayHome);
document.getElementById("mobileMenuBtn")?.addEventListener("click",toggleMobileSiteMenu);
document.getElementById("mobilePrevDayBtn")?.addEventListener("click",async()=>{await changeDay(-1)});
document.getElementById("mobileNextDayBtn")?.addEventListener("click",async()=>{await changeDay(1)});
document.getElementById("mobileResetActiveGameBtn")?.addEventListener("click",async()=>{await resetActiveGame();closeMobileSiteMenu()});
document.querySelectorAll("[data-mobile-game]").forEach(btn=>btn.addEventListener("click",()=>navigateToGame(btn.dataset.mobileGame)));
document.querySelectorAll("[data-front-game]").forEach(btn=>btn.addEventListener("click",()=>navigateToGame(btn.dataset.frontGame)));
document.addEventListener("click",event=>{
  const menu=document.getElementById("mobileSiteMenu");
  const button=document.getElementById("mobileMenuBtn");
  if(!menu||menu.hidden||menu.contains(event.target)||button?.contains(event.target))return;
  closeMobileSiteMenu();
});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeMobileSiteMenu()});


/* V103.0 utility menu. Feedback storage is browser-local for testing only.
   At public launch, replace these helpers with the secure production feedback API. */
const LOCAL_FEEDBACK_KEY="puzzlenookFeedbackPrototypeV1";
const HOW_TO_ORDER=["five","quads","mini","trail","ell","same"];
function openSiteUtility(title,kicker,html){
  closeMobileSiteMenu();const o=document.getElementById("siteUtilityOverlay");if(!o)return;
  document.getElementById("siteUtilityTitle").textContent=title;document.getElementById("siteUtilityKicker").textContent=kicker||"PUZZLENOOK";
  document.getElementById("siteUtilityBody").innerHTML=html;o.hidden=false;o.setAttribute("aria-hidden","false");document.body.classList.add("site-utility-open");
}
function closeSiteUtility(){const o=document.getElementById("siteUtilityOverlay");if(!o||o.hidden)return;o.hidden=true;o.setAttribute("aria-hidden","true");document.body.classList.remove("site-utility-open")}
function openMenuHowTo(){
  openSiteUtility("How to Play","PUZZLE GUIDE",`<div class="utility-choice-list">${HOW_TO_ORDER.map(g=>`<button type="button" class="utility-choice" data-howto-game="${g}"><strong>${GAME_INSTRUCTIONS[g].name}</strong><span>View instructions</span></button>`).join("")}</div>`);
  document.querySelectorAll("[data-howto-game]").forEach(b=>b.onclick=()=>{const c=GAME_INSTRUCTIONS[b.dataset.howtoGame];openSiteUtility("How to play",c.name.toUpperCase(),c.body)});
}
function openMenuAbout(){openSiteUtility("About PuzzleNook","YOUR LITTLE ESCAPE",`<div class="utility-copy"><p>PuzzleNook is a collection of quick daily word and logic puzzles designed to give you a satisfying little break in your day.</p><p>Play today’s six puzzles, revisit previous days in the Archive, and come back whenever you feel like another challenge.</p></div>`)}
function localFeedbackRead(){try{const v=JSON.parse(localStorage.getItem(LOCAL_FEEDBACK_KEY)||"[]");return Array.isArray(v)?v:[]}catch{return[]}}
function localFeedbackWrite(v){localStorage.setItem(LOCAL_FEEDBACK_KEY,JSON.stringify(v))}
function feedbackContext(){const p=activePuzzleForGame(activeGame);return{game:GAME_INSTRUCTIONS[activeGame]?.name||null,gameKey:GAME_INSTRUCTIONS[activeGame]?activeGame:null,puzzleId:p?.id||null,puzzleDate:p?.date||null,page:activeGame==="home"?"home":"game",userAgent:navigator.userAgent}}
function feedbackForm(type){
  const c=feedbackContext(),word=type==="word",label=type==="bug"?"Report a Bug":word?"Request a Word":"Suggestion / Feedback";
  openSiteUtility(label,"FEEDBACK & REQUESTS",`<form id="feedbackForm" class="feedback-form">${word?`<label>Word<input id="feedbackWord" maxlength="40" autocomplete="off" required></label>`:""}<label>${type==="bug"?"What happened?":"Message"}<textarea id="feedbackMessage" rows="5" maxlength="1500" ${word?"":"required"}></textarea></label><div class="feedback-context">${c.game?`${c.game}${c.puzzleDate?` · ${c.puzzleDate}`:""}`:"PuzzleNook"}</div><button type="submit" class="feedback-submit">Submit</button><p class="feedback-dev-note">Testing mode: saved to this browser’s PuzzleNook dashboard. Central delivery will be connected at public launch.</p></form>`);
  document.getElementById("feedbackForm").onsubmit=e=>{e.preventDefault();const a=localFeedbackRead();a.unshift({id:`fb-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type,word:(document.getElementById("feedbackWord")?.value||"").trim().toUpperCase(),message:(document.getElementById("feedbackMessage")?.value||"").trim(),status:"new",createdAt:new Date().toISOString(),context:c});localFeedbackWrite(a);openSiteUtility("Thank you","FEEDBACK & REQUESTS",`<div class="utility-copy"><p>Your ${word?"word request":"feedback"} has been saved to the PuzzleNook testing inbox.</p></div>`)};
}
function openMenuFeedback(){
  openSiteUtility("Feedback & Requests","PUZZLENOOK",`<div class="utility-choice-list"><button type="button" class="utility-choice" data-feedback-type="bug"><strong>Report a Bug</strong><span>Something isn’t working correctly.</span></button><button type="button" class="utility-choice" data-feedback-type="word"><strong>Request a Word</strong><span>Tell us about a word PuzzleNook should accept.</span></button><button type="button" class="utility-choice" data-feedback-type="feedback"><strong>Suggestion / Feedback</strong><span>Share an idea or comment.</span></button></div>`);
  document.querySelectorAll("[data-feedback-type]").forEach(b=>b.onclick=()=>feedbackForm(b.dataset.feedbackType));
}
document.getElementById("menuTodayBtn")?.addEventListener("click",()=>{closeMobileSiteMenu();navigateTodayHome()});
document.getElementById("menuHowToBtn")?.addEventListener("click",openMenuHowTo);
document.getElementById("menuFeedbackBtn")?.addEventListener("click",openMenuFeedback);
document.getElementById("menuAboutBtn")?.addEventListener("click",openMenuAbout);
document.getElementById("siteUtilityClose")?.addEventListener("click",closeSiteUtility);
document.getElementById("siteUtilityOverlay")?.addEventListener("click",e=>{if(e.target===e.currentTarget)closeSiteUtility()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.getElementById("siteUtilityOverlay")?.hidden)closeSiteUtility()});

/* V103.3 — timers run only while the selected puzzle is actually in front of the player. */
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden"){
    if(PUBLIC_GAME_IDS.includes(activeGame))pausePuzzleTimer(activeGame);
    if(activeGame==="five")stopFiveTimer();
    updatePuzzleTimerDisplays();
  }else{
    syncActivePuzzleTimer();
    if(activeGame==="five" && currentGuess.length>0 && !gameComplete)ensureFiveTimerRunning();
  }
});
window.addEventListener("blur",()=>{
  if(PUBLIC_GAME_IDS.includes(activeGame))pausePuzzleTimer(activeGame);
  if(activeGame==="five")stopFiveTimer();
  updatePuzzleTimerDisplays();
});
window.addEventListener("focus",()=>{
  syncActivePuzzleTimer();
  if(activeGame==="five" && currentGuess.length>0 && !gameComplete)ensureFiveTimerRunning();
});
window.addEventListener("pagehide",()=>{
  if(PUBLIC_GAME_IDS.includes(activeGame))pausePuzzleTimer(activeGame);
  if(activeGame==="five")stopFiveTimer();
});

/* V100.8 startup moved to end of file.
   All game state declarations must initialize before any loader runs. */




/* -----------------------------
   One and the Same
------------------------------ */
const SAME_PLAYER_KEY="puzzlePublicOneAndTheSameV1";
let samePuzzle=null;
let sameRevealed=1;
let sameWrong=[];
let sameComplete=false;
let sameWon=false;
let sameCorrectGuess="";

function normalizeSameGuess(value){
  return String(value||"")
    .trim()
    .toUpperCase()
    .replace(/[’']/g,"'")
    .replace(/^[\s"'“”‘’.,!?;:()[\]{}-]+|[\s"'“”‘’.,!?;:()[\]{}-]+$/g,"")
    .replace(/\s+/g," ");
}
function stripSameLeadingArticle(value){
  return normalizeSameGuess(value).replace(/^(A|AN|THE)\s+/,"");
}
function sameSimpleSingular(word){
  const w=stripSameLeadingArticle(word);
  if(!w)return "";
  if(/(SS|US|IS)$/.test(w))return w;
  if(/IES$/.test(w) && w.length>4) return w.slice(0,-3)+"Y";
  if(/(CHES|SHES|XES|ZES)$/.test(w) && w.length>4) return w.slice(0,-2);
  if(/SES$/.test(w) && w.length>4 && !/SSES$/.test(w)) return w.slice(0,-2);
  if(/S$/.test(w) && !/SS$/.test(w) && w.length>3) return w.slice(0,-1);
  return w;
}
function sameGuessMatchesAnswer(guess,answer){
  const g=stripSameLeadingArticle(guess);
  const a=stripSameLeadingArticle(answer);
  if(!g||!a)return false;
  if(g===a)return true;
  const gs=sameSimpleSingular(g);
  const as=sameSimpleSingular(a);
  return gs===as && gs.length>0;
}
function saveSameState(){
  if(!samePuzzle)return;
  const all=readJsonStorage(SAME_PLAYER_KEY,{});
  all[currentDateKey()]={
    puzzleId:samePuzzle.id,
    revealed:sameRevealed,
    wrong:sameWrong,
    complete:sameComplete,
    won:sameWon,
    correctGuess:sameCorrectGuess
  };
  writeJsonStorage(SAME_PLAYER_KEY,all);
}
function restoreSameState(){
  const all=readJsonStorage(SAME_PLAYER_KEY,{});
  const s=all[currentDateKey()];
  if(!s||s.puzzleId!==samePuzzle.id)return;
  sameRevealed=Math.max(1,Math.min(4,Number(s.revealed)||1));
  sameWrong=Array.isArray(s.wrong)?s.wrong:[];
  sameComplete=!!s.complete;
  sameWon=!!s.won;
  sameCorrectGuess=String(s.correctGuess||"").toUpperCase();
}
function resetOneAndTheSameForSelectedDate(){
  const all=readJsonStorage(SAME_PLAYER_KEY,{});
  delete all[currentDateKey()];
  writeJsonStorage(SAME_PLAYER_KEY,all);
  sameRevealed=1;
  sameWrong=[];
  sameComplete=false;
  sameWon=false;
  sameCorrectGuess="";
}
async function loadOneAndTheSameForSelectedDate(){
  samePuzzle=null;
  sameRevealed=1;
  sameWrong=[];
  sameComplete=false;
  sameWon=false;
  sameCorrectGuess="";

  const meta=document.getElementById("samePuzzleMeta");
  const history=document.getElementById("sameHistory");
  const current=document.getElementById("sameCurrentClue");
  const status=document.getElementById("sameStatus");
  if(!meta)return;

  if(history)history.innerHTML="";
  if(current)current.textContent="";
  if(status)status.innerHTML="";

  const res=await fetch(`/api/puzzle/today?game=same&date=${encodeURIComponent(currentDateKey())}`);
  if(!res.ok){
    meta.textContent="No One and the Same scheduled";
    if(status)status.innerHTML='<div class="result">There is no One and the Same puzzle scheduled for this date.</div>';
    document.getElementById("sameActiveArea")?.classList.add("same-hidden");
    return;
  }

  samePuzzle=await res.json();
  meta.textContent=formatPuzzleDate(samePuzzle.date);
  document.getElementById("sameActiveArea")?.classList.remove("same-hidden");
  restoreSameState();
  drawOneAndTheSame();
}
function sameHistoryRow(item){
  const clue=samePuzzle?.clues?.[item.clueIndex]||"";
  return `<div class="same-history-row">
    <div class="same-history-clue">
      <span class="same-history-index">${item.clueIndex+1}</span>
      <span class="same-history-clue-text">${escapeSameHtml(clue)}</span>
    </div>
    <div class="same-history-guess"><span class="same-history-guess-text">${escapeSameHtml(item.guess)}</span></div>
  </div>`;
}
function sameCompletedSummaryRows(){
  if(!samePuzzle)return "";
  const wrongByClue=new Map(sameWrong.map(item=>[item.clueIndex,item.guess]));
  const solvedIndex=sameWon?Math.max(0,Math.min(3,sameRevealed-1)):-1;
  const correctGuess=sameCorrectGuess||samePuzzle.answer||"";
  return (samePuzzle.clues||[]).slice(0,4).map((clue,clueIndex)=>{
    const wrongGuess=wrongByClue.get(clueIndex);
    const isCorrect=sameWon&&clueIndex===solvedIndex;
    const guess=isCorrect?correctGuess:(wrongGuess||"");
    const rowClass=isCorrect?" same-history-row-correct":(!guess?" same-history-row-revealed":"");
    const guessClass=isCorrect?" same-history-guess-correct":(!guess?" same-history-guess-empty":"");
    return `<div class="same-history-row${rowClass}">
      <div class="same-history-clue">
        <span class="same-history-index">${clueIndex+1}</span>
        <span class="same-history-clue-text">${escapeSameHtml(clue)}</span>
      </div>
      <div class="same-history-guess${guessClass}">${guess?`<span class="same-history-guess-text">${escapeSameHtml(guess)}</span>`:""}</div>
    </div>`;
  }).join("");
}
function escapeSameHtml(value){
  return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
const SAME_SOLVE_MESSAGES={
  1:["How did you know?!","Are you psychic?!","No way!","Okay, that's suspicious…","On the first try?!"],
  2:["Brilliant!","Very impressive!","You caught on fast!","Excellent solve!","That was sharp!"],
  3:["Nice solve!","Well done!","Good thinking!","Nicely done!","You got it!"],
  4:["Just in time!","Clutch!","Got there!","That was close!","Right at the buzzer!"]
};
function sameSolveMessage(tries){
  const pool=SAME_SOLVE_MESSAGES[tries]||SAME_SOLVE_MESSAGES[4];
  return pool[Math.floor(Math.random()*pool.length)];
}

function sameIsMobileKeyboard(){
  return window.matchMedia("(max-width:700px)").matches;
}
function configureSameGuessInput(){
  const input=document.getElementById("sameGuessInput");
  if(!input)return;
  const mobile=sameIsMobileKeyboard();
  input.readOnly=mobile;
  input.inputMode=mobile?"none":"text";
  if(!input.dataset.uppercaseBound){
    input.addEventListener("input",()=>{
      const start=input.selectionStart;
      const end=input.selectionEnd;
      const upper=input.value.toUpperCase();
      if(input.value!==upper){
        input.value=upper;
        try{ input.setSelectionRange(start,end); }catch(_){}
      }
    });
    input.dataset.uppercaseBound="true";
  }
  if(mobile)input.blur();
}
function sameKeyboardLetter(letter){
  if(!samePuzzle||sameComplete)return;
  const input=document.getElementById("sameGuessInput");
  if(!input)return;
  input.value=(input.value+letter).slice(0,24).toUpperCase();
  input.classList.remove("same-input-nudge");
}
function sameKeyboardDelete(){
  if(!samePuzzle||sameComplete)return;
  const input=document.getElementById("sameGuessInput");
  if(!input)return;
  input.value=input.value.slice(0,-1);
}
function drawSameKeyboard(){
  const host=document.getElementById("sameKeyboard");
  if(!host)return;
  host.innerHTML="";
  const rows=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
  rows.forEach((letters,rowIndex)=>{
    const row=document.createElement("div");
    row.className="key-row";
    if(rowIndex===2){
      const del=document.createElement("button");
      del.type="button";
      del.className="key key-action same-key-delete";
      del.textContent="Delete";
      del.setAttribute("aria-label","Delete last letter");
      del.onclick=sameKeyboardDelete;
      row.appendChild(del);
    }
    [...letters].forEach(letter=>{
      const key=document.createElement("button");
      key.type="button";
      key.className="key";
      key.textContent=letter;
      key.setAttribute("aria-label",letter);
      key.onclick=()=>sameKeyboardLetter(letter);
      row.appendChild(key);
    });
    if(rowIndex===2){
      const guess=document.createElement("button");
      guess.type="button";
      guess.className="key key-action same-key-guess";
      guess.textContent="Guess";
      guess.setAttribute("aria-label","Submit guess");
      guess.onclick=submitSameGuess;
      row.appendChild(guess);
    }
    host.appendChild(row);
  });
}
function sameAnimateNextClue(){
  const clue=document.getElementById("sameCurrentClue");
  if(!clue)return;
  clue.classList.remove("same-clue-enter","same-clue-pop");
  void clue.offsetWidth;
  clue.classList.add("same-clue-pop");
}
function sameCommitWrongGuess(clueIndex,guess){
  sameWrong.push({clueIndex,guess});
  if(sameRevealed>=4){
    sameComplete=true;
    sameWon=false;
    registerDailyGameCompletion("same",samePuzzle);
  }else{
    sameRevealed++;
  }
  saveSameState();
}
function sameAnimateWrongToHistory(clueIndex,guess){
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const active=document.getElementById("sameActiveArea");
  const clue=document.getElementById("sameCurrentClue");
  const input=document.getElementById("sameGuessInput");
  const history=document.getElementById("sameHistory");
  if(reduced||!active||!clue||!input||!history){
    sameCommitWrongGuess(clueIndex,guess);
    drawOneAndTheSame();
    if(!sameComplete)sameAnimateNextClue();
    return;
  }

  const clueText=samePuzzle?.clues?.[clueIndex]||"";
  const tempRow=document.createElement("div");
  tempRow.className="same-history-row same-history-row-temp";
  tempRow.innerHTML=`<div class="same-history-clue">
    <span class="same-history-index">${clueIndex+1}</span>
    <span class="same-history-clue-text">${escapeSameHtml(clueText)}</span>
  </div>
  <div class="same-history-guess">
    <span class="same-history-guess-text">${escapeSameHtml(guess)}</span>
  </div>`;
  history.appendChild(tempRow);

  const targetRect=tempRow.getBoundingClientRect();
  const activeRect=active.getBoundingClientRect();

  const ghost=document.createElement("div");
  ghost.className="same-history-flight";
  ghost.innerHTML=tempRow.innerHTML;
  ghost.style.left=`${targetRect.left}px`;
  ghost.style.top=`${Math.max(8,activeRect.top)}px`;
  ghost.style.width=`${targetRect.width}px`;
  document.body.appendChild(ghost);

  tempRow.classList.add("same-history-row-pending");
  active.classList.add("same-filing-out");

  setTimeout(()=>{
    const dy=targetRect.top-Math.max(8,activeRect.top);
    const flight=ghost.animate([
      {transform:"translateY(0) scale(1.035)",opacity:.92,filter:"blur(0px)"},
      {transform:`translateY(${dy}px) scale(.985)`,opacity:1,filter:"blur(0px)"}
    ],{
      duration:238,
      easing:"cubic-bezier(.2,.78,.2,1)",
      fill:"forwards"
    });

    flight.onfinish=()=>{
      ghost.remove();
      tempRow.classList.remove("same-history-row-pending");
      tempRow.classList.add("same-history-row-settle");
      const guessEl=tempRow.querySelector(".same-history-guess");
      if(guessEl)guessEl.classList.add("same-history-strike-in");

      setTimeout(()=>{
        if(guessEl)guessEl.classList.remove("same-history-strike-in");

        // Commit the wrong guess only after the strike finishes.
        // Until this point the active clue has never advanced, so the next
        // clue cannot flash on screen before its entrance animation.
        sameCommitWrongGuess(clueIndex,guess);
        drawOneAndTheSame();
        if(!sameComplete)sameAnimateNextClue();
      },242);
    };
  },145);
}

function drawOneAndTheSame(){
  updatePuzzleEndStatus("same");
  if(!samePuzzle)return;

  const history=document.getElementById("sameHistory");
  const active=document.getElementById("sameActiveArea");
  const clue=document.getElementById("sameCurrentClue");
  const input=document.getElementById("sameGuessInput");
  const status=document.getElementById("sameStatus");

  history.innerHTML=sameComplete?sameCompletedSummaryRows():sameWrong.map(sameHistoryRow).join("");
  active.classList.remove("same-filing-out");

  if(sameComplete){
    active.classList.add("same-hidden");
    const answer=escapeSameHtml(samePuzzle.answer);
    if(sameWon){
      const tries=Math.max(1,Math.min(4,sameRevealed));
      const dynamic=escapeSameHtml(sameSolveMessage(tries));
      status.innerHTML=`<div class="same-result same-result-win">
        <div class="same-result-kicker">CORRECT</div>
        <div class="same-result-title">${answer}</div>
        <div class="same-result-copy">Solved in <strong>${tries} ${tries===1?"try":"tries"}</strong> — ${dynamic}</div>
      </div>`;
    }else{
      status.innerHTML=`<div class="same-result same-result-loss">
        <div class="same-result-kicker">SORRY, THE CORRECT ANSWER WAS</div>
        <div class="same-result-title">${answer}</div>
        <div class="same-result-copy">Try another one tomorrow</div>
      </div>`;
    }
    const cfg=sameEndgameConfig();
    if(cfg)queueGlobalEndgame(cfg,120);
    return;
  }

  active.classList.remove("same-hidden");
  const clueIndex=Math.max(0,Math.min(3,sameRevealed-1));
  clue.textContent=samePuzzle.clues?.[clueIndex]||"";
  status.innerHTML="";
  input.value="";
  configureSameGuessInput();
  drawSameKeyboard();
  if(sameIsMobileKeyboard()){
    input.blur();
  }else{
    setTimeout(()=>input.focus(),0);
  }
}
function submitSameGuess(){
  if(!samePuzzle||sameComplete)return;
  const input=document.getElementById("sameGuessInput");
  const typedGuess=String(input.value||"").trim().replace(/\s+/g," ");
  const guess=normalizeSameGuess(typedGuess);
  if(!guess){
    input.classList.remove("same-input-nudge");
    void input.offsetWidth;
    input.classList.add("same-input-nudge");
    return;
  }

  if(sameGuessMatchesAnswer(guess,samePuzzle.answer)){
    input.classList.remove("same-input-correct");
    void input.offsetWidth;
    input.classList.add("same-input-correct");
    const finish=()=>{
      sameComplete=true;
      sameWon=true;
      // Keep the exact acceptable guess the player entered for the clue-row
      // summary (for example, "A MATCH"), while the persistent answer card
      // continues to use samePuzzle.answer (for example, "MATCH").
      sameCorrectGuess=(typedGuess||guess).toUpperCase();
      registerDailyGameCompletion("same",samePuzzle);
      saveSameState();
      drawOneAndTheSame();
    };
    if(sameIsMobileKeyboard())setTimeout(finish,260);
    else finish();
    return;
  }

  const clueIndex=Math.max(0,Math.min(3,sameRevealed-1));
  input.classList.remove("same-input-nudge");
  void input.offsetWidth;
  input.classList.add("same-input-nudge");

  sameAnimateWrongToHistory(clueIndex,guess);
}

document.getElementById("sameGuessBtn").onclick=submitSameGuess;
document.getElementById("sameGuessInput").addEventListener("keydown",event=>{
  if(event.key==="Enter"){
    event.preventDefault();
    submitSameGuess();
  }
});
document.getElementById("sameGuessInput").addEventListener("pointerdown",event=>{
  if(sameIsMobileKeyboard()){
    event.preventDefault();
    document.getElementById("sameGuessInput").blur();
  }
});
window.addEventListener("resize",configureSameGuessInput);
window.addEventListener("resize",queueFiveMobileBoardSize);
if(window.visualViewport){
  window.visualViewport.addEventListener("resize",queueFiveMobileBoardSize);
}
window.addEventListener("orientationchange",queueFiveMobileBoardSize);
document.addEventListener("visibilitychange",()=>{
  if(!document.hidden && activeGame==="five")queueFiveMobileBoardSize();
});




/* -----------------------------
   Every Last Letter
------------------------------ */
const ELL_PLAYER_KEY="puzzlePublicEveryLastLetterV1";
let ellPuzzle=null,ellTiles=[],ellSelected=[],ellSubmitted=[],ellReclaimCandidate=null,ellComplete=false,ellEnded=false,ellEndReason=null;
// Ephemeral run counter: retries get a fresh end-game instance, while restored
// completed states still stay silent during date/navigation loads.
let ellEndgameAttempt=0;
let ellInteractionLocked=false;
let ellInlineNotice="";
let ellConfirmAction=null;
let ellMotion={
  pressedId:null,
  submittingIds:[],
  newWordIndex:null,
  scoreRevealIndex:null,
  reclaimingIndex:null,
  returningIds:[]
};
let ellMotionTimers=[];
function ellLater(fn,ms){
  const id=setTimeout(fn,ms);
  ellMotionTimers.push(id);
  return id;
}
function ellClearMotionTimers(){
  ellMotionTimers.forEach(clearTimeout);
  ellMotionTimers=[];
}
function ellResetTransientState(){
  ellClearMotionTimers();
  ellInteractionLocked=false;
  ellInlineNotice="";
  ellMotion.pressedId=null;
  ellMotion.submittingIds=[];
  ellMotion.newWordIndex=null;
  ellMotion.scoreRevealIndex=null;
  ellMotion.reclaimingIndex=null;
  ellMotion.returningIds=[];
}
function ellBeginInteractionLock(){
  ellInteractionLocked=true;
}
function ellEndInteractionLock(){
  ellInteractionLocked=false;
}
function ellClearInlineNoticeForNewWord(){
  if(!ellInlineNotice)return;
  ellInlineNotice="";
}
let ellDisplayedScore=null;
let ellScoreAnimFrame=null;
function ellAnimateScoreTo(target){
  const host=document.getElementById("ellScore");
  if(!host)return;
  const finalScore=Math.max(0,Number(target)||0);
  const from=ellDisplayedScore===null?finalScore:ellDisplayedScore;
  if(ellScoreAnimFrame)cancelAnimationFrame(ellScoreAnimFrame);
  if(from===finalScore){
    ellDisplayedScore=finalScore;
    host.textContent=`Score: ${finalScore}`;
    return;
  }
  const start=performance.now();
  const duration=300;
  const tick=now=>{
    const t=Math.min(1,(now-start)/duration);
    const eased=1-Math.pow(1-t,3);
    const value=Math.round(from+(finalScore-from)*eased);
    ellDisplayedScore=value;
    host.textContent=`Score: ${value}`;
    if(t<1){
      ellScoreAnimFrame=requestAnimationFrame(tick);
    }else{
      ellDisplayedScore=finalScore;
      ellScoreAnimFrame=null;
      host.classList.remove("motion-score-total");
      void host.offsetWidth;
      host.classList.add("motion-score-total");
    }
  };
  ellScoreAnimFrame=requestAnimationFrame(tick);
}


async function loadEveryLastLetterForSelectedDate(){
  ellResetTransientState();
  closeEllConfirm();
  ellPuzzle=null;ellTiles=[];ellSelected=[];ellSubmitted=[];ellReclaimCandidate=null;ellComplete=false;ellEnded=false;ellEndReason=null;
  const meta=document.getElementById("ellPuzzleMeta"),status=document.getElementById("ellStatus");
  if(!meta||!status)return;
  status.innerHTML="";
  const res=await fetch(`/api/puzzle/today?game=ell&date=${encodeURIComponent(currentDateKey())}`);
  if(!res.ok){
    meta.textContent="No Every Last Letter scheduled";
    document.getElementById("ellGrid").innerHTML="";
    document.getElementById("ellCompletedWords").innerHTML="";
    document.getElementById("ellCurrentWord").textContent="";
    status.innerHTML='<div class="result">There is no Every Last Letter puzzle scheduled for this date.</div>';
    return;
  }
  ellPuzzle=await res.json();meta.textContent=formatPuzzleDate(ellPuzzle.date);
  let id=0;
  (ellPuzzle.grid||[]).forEach((row,r)=>row.forEach((letter,c)=>ellTiles.push({id:id++,letter:String(letter).toUpperCase(),r,c,used:false})));
  restoreEllState();drawEll();
}
function restoreEllState(){
  const all=readJsonStorage(ELL_PLAYER_KEY,{}),s=all[currentDateKey()];
  if(!s||s.puzzleId!==ellPuzzle.id)return;
  ellSelected=s.selected||[];ellSubmitted=s.submitted||[];ellComplete=!!s.complete;ellEnded=!!s.ended;ellEndReason=s.endReason||null;
  const used=new Set(ellSubmitted.flatMap(x=>x.tileIds||[]));
  ellTiles.forEach(t=>t.used=used.has(t.id));
}
function saveEllState(){
  if(!ellPuzzle)return;
  const all=readJsonStorage(ELL_PLAYER_KEY,{});
  all[currentDateKey()]={puzzleId:ellPuzzle.id,selected:[...ellSelected],submitted:ellSubmitted,complete:ellComplete,ended:ellEnded,endReason:ellEndReason};
  writeJsonStorage(ELL_PLAYER_KEY,all);
}

const ELL_HISTORY_KEY="puzzleNookEllHistoryV1";
function readEllHistory(){return readJsonStorage(ELL_HISTORY_KEY,{})}
function ellHistoryKey(puz=ellPuzzle){return puz?`${puz.date||currentDateKey()}|${puz.id}`:""}
function ellHistoricalRecord(puz=ellPuzzle){return readEllHistory()[ellHistoryKey(puz)]||null}
function recordEllCompletion(){
  if(!ellPuzzle)return;const all=readEllHistory(),key=ellHistoryKey(),score=ellFinalScore(),prior=all[key]||{completed:false,highestScore:0};
  prior.completed=true;prior.highestScore=Math.max(Number(prior.highestScore)||0,score);all[key]=prior;writeJsonStorage(ELL_HISTORY_KEY,all);
  registerDailyGameCompletion("ell",ellPuzzle);
}
function ellHighestScoreForCurrentPuzzle(){const rec=ellHistoricalRecord();return Math.max(Number(rec?.highestScore)||0,(ellComplete||ellEnded)?ellFinalScore():0)}

function resetEveryLastLetterForSelectedDate(){
  ellResetTransientState();
  const all=readJsonStorage(ELL_PLAYER_KEY,{});delete all[currentDateKey()];
  writeJsonStorage(ELL_PLAYER_KEY,all);
  ellSelected=[];ellSubmitted=[];ellReclaimCandidate=null;ellComplete=false;ellEnded=false;ellEndReason=null;ellTiles.forEach(t=>t.used=false);
}
function ellWord(){return ellSelected.map(id=>ellTiles.find(t=>t.id===id)?.letter||"").join("");}
function ellUsed(){return ellTiles.filter(t=>t.used).length;}

function ellScoreForLength(length){
  const n=Number(length);
  if(n<3)return 0;
  return 10*(1+((n-3)*(n-2))/2);
}
function ellCurrentScore(){
  return ellSubmitted.reduce((sum,entry)=>sum+(Number(entry.score)||ellScoreForLength(entry.word?.length||0)),0);
}
function ellCompletionBonus(lettersUsed=ellUsed()){
  const used=Number(lettersUsed)||0;
  if(used>=25)return 100;
  if(used===24)return 50;
  if(used===23)return 25;
  return 0;
}
function ellFinalScore(){
  const base=ellCurrentScore();
  return (ellComplete||ellEnded) ? base+ellCompletionBonus(ellUsed()) : base;
}


function ellEndGameHtml(reason){
  const used=ellUsed();
  const base=ellCurrentScore();
  const bonus=ellCompletionBonus(used);
  const score=base+bonus;
  const headline=reason==="stuck" ? "No more words." : "You ended your game.";
  const bonusLine=bonus?` <span class="ell-score-bonus">(${base} + ${bonus} bonus)</span>`:"";
  return `<div class="ell-endgame">
    <div class="ell-endgame-title">${headline}</div>
    <div class="ell-endgame-summary">You used <strong>${used}/25</strong> letters.</div>
    <div class="ell-endgame-score">Your final score is <strong>${score}</strong>.${bonusLine}</div>
    <button type="button" class="ell-try-again" onclick="ellTryAgain()">Try again?</button>
  </div>`;
}
function ellTryAgain(){
  // A retry is a genuinely new run of this puzzle. Give it a new modal/sticker
  // instance so every subsequent finish can display once, without weakening the
  // restored-state/navigation suppression safeguards.
  ellEndgameAttempt++;
  resetEveryLastLetterForSelectedDate();
  closeGlobalEndgame();
  document.getElementById("ellStatus").innerHTML="";
  drawEll();
}
function ellExecuteGiveUp(){
  if(!ellPuzzle||ellComplete||ellEnded)return;
  ellResetTransientState();
  ellSelected=[];
  ellReclaimCandidate=null;
  ellEnded=true;
  ellEndReason="giveup";
  saveEllState();
  recordEllCompletion();
  drawEll();
}
function ellGiveUp(){
  if(!ellPuzzle||ellComplete||ellEnded||ellInteractionLocked)return;
  openEllConfirm("giveup");
}

function openEllConfirm(action){
  if(ellInteractionLocked)return;
  const overlay=document.getElementById("ellConfirmOverlay");
  const title=document.getElementById("ellConfirmTitle");
  const message=document.getElementById("ellConfirmMessage");
  const confirmBtn=document.getElementById("ellConfirmPrimary");
  if(!overlay||!title||!message||!confirmBtn)return;

  ellConfirmAction=action;
  if(action==="startover"){
    title.textContent="Start over?";
    message.textContent="This will restore all 25 letters and erase your progress in this puzzle.";
    confirmBtn.textContent="Start Over";
  }else{
    title.textContent="Give up?";
    message.textContent="Are you sure you want to give up and end this puzzle?";
    confirmBtn.textContent="Give Up";
  }

  overlay.hidden=false;
  overlay.setAttribute("aria-hidden","false");
  document.body.classList.add("ell-confirm-open");
  requestAnimationFrame(()=>confirmBtn.focus());
}
function closeEllConfirm(){
  const overlay=document.getElementById("ellConfirmOverlay");
  if(!overlay||overlay.hidden)return;
  overlay.hidden=true;
  overlay.setAttribute("aria-hidden","true");
  document.body.classList.remove("ell-confirm-open");
  ellConfirmAction=null;
}
function confirmEllAction(){
  const action=ellConfirmAction;
  closeEllConfirm();
  if(action==="startover"){
    if(ellComplete||ellEnded)ellEndgameAttempt++;
    resetEveryLastLetterForSelectedDate();
    closeGlobalEndgame();
    document.getElementById("ellStatus").innerHTML="";
    drawEll();
  }else if(action==="giveup"){
    ellExecuteGiveUp();
  }
}

function drawEll(){
  updatePuzzleEndStatus("ell");
  if(!ellPuzzle)return;
  const selected=new Set(ellSelected),grid=document.getElementById("ellGrid");grid.innerHTML="";
  ellTiles.forEach(tile=>{
    const b=document.createElement("button");b.type="button";b.className="ell-tile";
    if(tile.used){b.classList.add("empty");b.disabled=true;b.setAttribute("aria-label","Used tile");}
    else{
      b.textContent=tile.letter;
      if(ellEnded||ellInteractionLocked){b.disabled=true;if(ellEnded)b.classList.add("ended");}
      if(selected.has(tile.id)){b.classList.add("selected");b.dataset.order=ellSelected.indexOf(tile.id)+1;}
      const submitIndex=ellMotion.submittingIds.indexOf(tile.id);
      if(submitIndex>=0){
        b.classList.add("motion-submit");
        b.style.setProperty("--ell-submit-delay",`${submitIndex*38}ms`);
      }
      const returnIndex=ellMotion.returningIds.indexOf(tile.id);
      if(returnIndex>=0){
        b.classList.add("motion-return");
        b.style.setProperty("--ell-return-delay",`${returnIndex*42}ms`);
      }
      if(ellMotion.pressedId===tile.id)b.classList.add("motion-pressed");
      b.addEventListener("pointerdown",()=>{ellMotion.pressedId=tile.id;b.classList.add("motion-pressed");});
      const releasePress=()=>{if(ellMotion.pressedId===tile.id)ellMotion.pressedId=null;b.classList.remove("motion-pressed");};
      b.addEventListener("pointerup",releasePress);
      b.addEventListener("pointercancel",releasePress);
      b.addEventListener("pointerleave",releasePress);
      b.onclick=()=>ellToggle(tile.id);
    }
    grid.appendChild(b);
  });
  const currentWordHost=document.getElementById("ellCurrentWord");
  if(currentWordHost){
    const current=ellWord();
    const showNotice=!current&&!!ellInlineNotice;
    currentWordHost.textContent=showNotice?ellInlineNotice:(current||" ");
    currentWordHost.classList.toggle("is-invalid",showNotice);
  }
  const ellControls=["ellStartOverBtn","ellClearBtn","ellGiveUpBtn","ellSubmitBtn"];
  ellControls.forEach(id=>{
    const control=document.getElementById(id);
    if(control)control.disabled=ellInteractionLocked;
  });
  grid.classList.toggle("interaction-locked",ellInteractionLocked);
  ellAnimateScoreTo((ellComplete||ellEnded)?ellFinalScore():ellCurrentScore());
  const host=document.getElementById("ellCompletedWords");host.innerHTML="";
  if(ellSubmitted.length){
    const heading=document.createElement("div");
    heading.className="ell-words-made-heading";
    heading.innerHTML=`<span>WORDS MADE</span><small>· ${ellSubmitted.length}</small>`;
    host.appendChild(heading);
    const collection=document.createElement("div");
    collection.className="ell-word-collection";
    ellSubmitted.forEach((entry,index)=>{
      const b=document.createElement("button");b.type="button";b.className="ell-completed-word";
      if(ellReclaimCandidate===index)b.classList.add("reclaim-selected");
      if(ellMotion.newWordIndex===index)b.classList.add("motion-arrive");
      if(ellMotion.reclaimingIndex===index)b.classList.add("motion-reclaim");
      const pts=Number(entry.score)||ellScoreForLength(entry.word.length);
      const scoreClass=ellMotion.scoreRevealIndex===index?" motion-score":"";
      b.innerHTML=`<span class="ell-made-word">${entry.word}</span><small class="ell-made-score${scoreClass}">+${pts}</small>`;
      b.onclick=e=>{e.stopPropagation();ellReclaim(index);};collection.appendChild(b);
    });
    host.appendChild(collection);
  }
  if(ellComplete){
    document.getElementById("ellStatus").innerHTML=`<div class="ell-endgame ell-endgame-win">
      <div class="ell-endgame-title">Every Last Letter!</div>
      <div class="ell-endgame-summary">You used <strong>25/25</strong> letters.</div>
      <div class="ell-endgame-score">Your final score is <strong>${ellFinalScore()}</strong>. <span class="ell-score-bonus">(${ellCurrentScore()} + ${ellCompletionBonus()} bonus)</span></div>
      <button type="button" class="ell-try-again" onclick="ellTryAgain()">Try again?</button>
    </div>`;
  }else if(ellEnded){
    document.getElementById("ellStatus").innerHTML=ellEndGameHtml(ellEndReason||"giveup");
  }
  if(ellComplete||ellEnded){const cfg=ellEndgameConfig();if(cfg)queueGlobalEndgame(cfg,120);}
}
function ellToggle(id){
  if(ellComplete||ellEnded||ellInteractionLocked)return;
  ellReclaimCandidate=null;
  const t=ellTiles.find(x=>x.id===id);if(!t||t.used)return;
  const i=ellSelected.indexOf(id);
  if(i>=0){
    ellSelected.splice(i,1);
  }else{
    if(ellSelected.length===0)ellClearInlineNoticeForNewWord();
    ellSelected.push(id);
  }
  saveEllState();drawEll();
}
function ellTypeLetter(letter){
  if(ellComplete||ellEnded||ellInteractionLocked)return;
  ellReclaimCandidate=null;
  const chosen=new Set(ellSelected);
  const t=ellTiles.find(x=>!x.used&&!chosen.has(x.id)&&x.letter===letter);
  if(t){
    if(ellSelected.length===0)ellClearInlineNoticeForNewWord();
    ellSelected.push(t.id);saveEllState();drawEll();
  }
}
function ellBackspace(){if(ellInteractionLocked)return;if(ellSelected.length){ellSelected.pop();saveEllState();drawEll();}}
function ellClear(){if(ellInteractionLocked)return;ellSelected=[];ellReclaimCandidate=null;saveEllState();drawEll();}

function ellRemainingLetters(){
  return ellTiles.filter(t=>!t.used).map(t=>t.letter).join("");
}
async function ellCheckDeadBoard(){
  if(ellComplete)return;
  const remaining=ellRemainingLetters();

  // With fewer than 3 letters, no legal word can exist.
  if(remaining.length<3){
    ellEndStuck();
    return;
  }

  try{
    const res=await fetch(`/api/ell/can-form-word?letters=${encodeURIComponent(remaining)}`);
    if(!res.ok)return;
    const result=await res.json();
    if(!result.possible) ellEndStuck();
  }catch(err){
    console.error("Could not evaluate Every Last Letter remaining board:",err);
  }
}
function ellEndStuck(){
  ellSelected=[];
  ellReclaimCandidate=null;
  ellEnded=true;
  ellEndReason="stuck";
  saveEllState();
  recordEllCompletion();
  drawEll();
}

async function ellSubmit(){
  if(ellComplete||ellEnded||ellInteractionLocked)return;
  const word=ellWord();
  if(!word)return;

  const tileIds=[...ellSelected];
  ellBeginInteractionLock();
  drawEll();

  if(word.length<3){
    ellSelected=[];
    ellReclaimCandidate=null;
    ellInlineNotice=`'${word}' is not a valid word.`;
    ellEndInteractionLock();
    saveEllState();
    drawEll();
    return;
  }

  let result={valid:false};
  try{
    const res=await fetch(`/api/ell/validate?word=${encodeURIComponent(word)}`);
    result=res.ok?await res.json():{valid:false};
  }catch(err){
    console.error("Could not validate Every Last Letter word:",err);
  }

  // The captured tileIds/word are authoritative for this submission.
  if(!result.valid){
    ellSelected=[];
    ellReclaimCandidate=null;
    ellInlineNotice=`'${word}' is not a valid word.`;
    ellEndInteractionLock();
    saveEllState();
    drawEll();
    return;
  }

  ellInlineNotice="";
  ellMotion.submittingIds=[...tileIds];
  document.getElementById("ellStatus").innerHTML="";
  drawEll();

  ellLater(async()=>{
    tileIds.forEach(id=>{const t=ellTiles.find(x=>x.id===id);if(t)t.used=true;});
    ellSubmitted.push({word,tileIds,score:ellScoreForLength(word.length)});
    const newIndex=ellSubmitted.length-1;
    ellSelected=[];ellReclaimCandidate=null;
    ellComplete=ellUsed()===25;if(ellComplete)ellEnded=false;
    ellEndReason=null;
    if(ellComplete)recordEllCompletion();
    ellMotion.submittingIds=[];
    ellMotion.newWordIndex=newIndex;
    ellMotion.scoreRevealIndex=newIndex;
    saveEllState();drawEll();

    if(!ellComplete)await ellCheckDeadBoard();

    ellLater(()=>{
      ellMotion.newWordIndex=null;
      ellMotion.scoreRevealIndex=null;
      ellEndInteractionLock();
      drawEll();
    },520);
  },Math.min(420,190+tileIds.length*38));
}
function ellReturnSubmittedWord(index){
  if(ellInteractionLocked)return;
  const entry=ellSubmitted[index];if(!entry)return;
  (entry.tileIds||[]).forEach(id=>{const t=ellTiles.find(x=>x.id===id);if(t)t.used=false;});
  ellSubmitted.splice(index,1);
  ellReclaimCandidate=null;
  ellSelected=[];
  ellComplete=false;
  ellEnded=false;
  document.getElementById("ellStatus").innerHTML="";
  saveEllState();
  drawEll();
}
function ellReclaim(index){
  if(ellComplete||ellInteractionLocked)return;
  if(ellReclaimCandidate!==index){ellReclaimCandidate=index;drawEll();return;}
  const entry=ellSubmitted[index];
  if(!entry)return;

  ellBeginInteractionLock();
  ellMotion.reclaimingIndex=index;
  drawEll();

  ellLater(()=>{
    const returning=[...(entry.tileIds||[])];
    (entry.tileIds||[]).forEach(id=>{const t=ellTiles.find(x=>x.id===id);if(t)t.used=false;});
    ellSubmitted.splice(index,1);
    ellReclaimCandidate=null;
    ellSelected=[];
    ellComplete=false;
    ellEnded=false;
    ellMotion.reclaimingIndex=null;
    ellMotion.returningIds=returning;
    document.getElementById("ellStatus").innerHTML="";
    saveEllState();
    drawEll();
    ellLater(()=>{
      ellMotion.returningIds=[];
      ellEndInteractionLock();
      drawEll();
    },520);
  },220);
}
function ellStartOver(){
  if(!ellPuzzle||ellInteractionLocked)return;
  openEllConfirm("startover");
}
document.getElementById("ellStartOverBtn").onclick=ellStartOver;
document.getElementById("ellClearBtn").onclick=ellClear;
document.getElementById("ellGiveUpBtn").onclick=ellGiveUp;
document.getElementById("ellSubmitBtn").onclick=ellSubmit;
document.getElementById("ellConfirmPrimary")?.addEventListener("click",confirmEllAction);
document.getElementById("ellConfirmCancel")?.addEventListener("click",closeEllConfirm);
document.getElementById("ellConfirmOverlay")?.addEventListener("click",event=>{
  if(event.target===event.currentTarget)closeEllConfirm();
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&!document.getElementById("ellConfirmOverlay")?.hidden){
    event.preventDefault();
    closeEllConfirm();
  }
});
document.addEventListener("keydown",event=>{
  if(activeGame!=="ell"||!ellPuzzle||ellComplete||ellInteractionLocked||!document.getElementById("ellConfirmOverlay")?.hidden||event.ctrlKey||event.metaKey||event.altKey)return;
  if(ellEnded&&ellReclaimCandidate===null)return;
  if(/^[A-Za-z]$/.test(event.key)){event.preventDefault();ellTypeLetter(event.key.toUpperCase());return;}
  if(event.key==="Backspace"||event.key==="Delete"||event.code==="Delete"||event.keyCode===46){
    event.preventDefault();
    if(ellReclaimCandidate!==null){ellReturnSubmittedWord(ellReclaimCandidate);return;}
    ellBackspace();
    return;
  }
  if(event.key==="Escape"){event.preventDefault();ellClear();return;}
  if(event.key==="Enter"){event.preventDefault();ellSubmit();}
});


/* -----------------------------
   Quads
------------------------------ */
const QUADS_PLAYER_KEY="puzzlePublicQuadsV2";
let quadsPuzzle=null;
let quadsRemaining=[];
let quadsSelected=new Set();
let quadsSolved=[];
let quadsMistakes=0;
let quadsComplete=false;
let quadsWon=false;
let quadsIncorrectGuesses=[];

function showQuads(){ navigatePublicView("quads"); }
function showWordTrail(){ navigatePublicView("trail"); }
function showMini(){ navigatePublicView("mini"); }

function shuffleArray(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function normalizedQuadGroups(data){
  const groups=(data?.groups||[]).map((g,index)=>({
    label:g.label,
    difficulty:g.difficulty||["Easy","Medium","Hard","Very Hard"][index]||"Medium",
    items:(g.items||[]).map(x=>String(x).toUpperCase())
  }));
  return groups;
}

async function loadQuadsForSelectedDate(){
  quadsPuzzle=null;
  quadsRemaining=[];
  quadsSelected.clear();
  quadsSolved=[];
  quadsMistakes=0;
  quadsComplete=false;
  quadsEndgameSequenceRunning=false;

  const date=currentDateKey();
  const meta=document.getElementById("quadsPuzzleMeta");
  const status=document.getElementById("quadsStatus");
  status.classList.remove("quads-final-sequence");
  status.innerHTML="";

  const res=await fetch(`/api/puzzle/today?game=quads&date=${encodeURIComponent(date)}`);
  if(!res.ok){
    meta.textContent="No Quads scheduled";
    document.getElementById("quadsSolved").innerHTML="";
    document.getElementById("quadsGrid").innerHTML="";
    document.getElementById("quadsMistakes").innerHTML="";
    status.innerHTML='<div class="result">There is no Quads puzzle scheduled for this date.</div>';
    updateQuadsButtons();
    return;
  }

  quadsPuzzle=await res.json();
  quadsPuzzle.groups=normalizedQuadGroups(quadsPuzzle);
  meta.textContent=formatPuzzleDate(quadsPuzzle.date);

  restoreQuadsState();
  if(!quadsRemaining.length && !quadsComplete){
    quadsRemaining=shuffleArray(quadsPuzzle.groups.flatMap(g=>g.items));
  }
  drawQuads();
}

function restoreQuadsState(){
  const all=readJsonStorage(QUADS_PLAYER_KEY,{});
  const s=all[currentDateKey()];
  if(!s || s.puzzleId!==quadsPuzzle.id) return;

  quadsRemaining=s.remaining||[];
  quadsSolved=s.solved||[];
  quadsMistakes=s.mistakes||0;
  quadsComplete=!!s.complete;
  quadsWon=!!s.won;
  quadsIncorrectGuesses=s.incorrectGuesses||[];
}

function saveQuadsState(){
  if(!quadsPuzzle) return;
  const all=readJsonStorage(QUADS_PLAYER_KEY,{});
  all[currentDateKey()]={
    puzzleId:quadsPuzzle.id,
    remaining:quadsRemaining,
    solved:quadsSolved,
    mistakes:quadsMistakes,
    complete:quadsComplete,
    won:quadsWon,
    incorrectGuesses:quadsIncorrectGuesses
  };
  writeJsonStorage(QUADS_PLAYER_KEY,all);
}

function difficultyClass(difficulty){
  const d=String(difficulty||"").toLowerCase();
  if(d==="easy") return "quads-easy";
  if(d==="medium") return "quads-medium";
  if(d==="hard") return "quads-hard";
  return "quads-very-hard";
}

function preserveViewport(fn){
  const x=window.scrollX;
  const y=window.scrollY;
  fn();
  requestAnimationFrame(()=>window.scrollTo(x,y));
}

function updateQuadsInstructions(){
  const instructions=document.getElementById("quadsInstructions");
  if(!instructions)return;
  instructions.classList.remove("quads-end-result","quads-win-result","quads-loss-result");
  instructions.hidden=!!quadsComplete;
  instructions.textContent=quadsComplete?"":"Select four things that have something in common.";
}

function drawQuads(animateNewestSolved=false,animateGrid=false){
  updatePuzzleEndStatus("quads");
  updateQuadsInstructions();
  const solvedHost=document.getElementById("quadsSolved");
  solvedHost.innerHTML=quadsSolved.map((g,i)=>`
    <div class="quads-solved-row ${difficultyClass(g.difficulty)} ${animateNewestSolved&&i===quadsSolved.length-1&&quadsSolved.length>0?"enter":""}">
      <div class="label">${g.label}</div>
      <div class="words">${g.items.join(" · ")}</div>
    </div>`).join("");

  // The landing animation is a one-time event. Remove its class once it has
  // finished so switching away from InCommon and back cannot replay it.
  if(animateNewestSolved){
    const enteringRow=solvedHost.querySelector(".quads-solved-row.enter");
    if(enteringRow){
      const clearEnter=()=>enteringRow.classList.remove("enter");
      enteringRow.addEventListener("animationend",clearEnter,{once:true});
      setTimeout(clearEnter,650);
    }
  }

  const grid=document.getElementById("quadsGrid");
  grid.innerHTML="";
  grid.classList.remove("reflow");
  if(animateGrid){
    void grid.offsetWidth;
    grid.classList.add("reflow");
  }
  quadsRemaining.forEach(word=>{
    const b=document.createElement("button");
    b.type="button";
    const tileText=String(word||"").trim();
    const isPhrase=/\s/.test(tileText);
    const compactLength=tileText.replace(/\s+/g,"").length;
    const fitClass=isPhrase
      ? "quads-tile-phrase"
      : compactLength>=12
        ? "quads-tile-very-long"
        : compactLength>=9
          ? "quads-tile-long"
          : "";
    b.className=`quads-tile ${fitClass} ${quadsSelected.has(word)?"selected":""}`.trim();
    b.textContent=word;
    b.onclick=()=>toggleQuadWord(word);
    grid.appendChild(b);
  });

  const mistakesLeft=Math.max(0,4-quadsMistakes);
  document.getElementById("quadsMistakes").innerHTML=
    `Lives left: <span class="life-stars" aria-label="${mistakesLeft} lives left">${Array.from({length:4},(_,i)=>`<span class="mistake-star ${i<mistakesLeft?"active-life":"spent-life"}" aria-hidden="true">★</span>`).join("")}</span>`;

  updateQuadsButtons();

  if(quadsComplete){
    document.getElementById("quadsStatus").innerHTML="";
    if(!quadsEndgameSequenceRunning){
      const cfg=quadsEndgameConfig();if(cfg)queueGlobalEndgame(cfg,140);
    }
  }
}

function playQuadsWinFinishSequence(){
  const solvedHost=document.getElementById("quadsSolved");
  const status=document.getElementById("quadsStatus");
  if(!solvedHost || !status){
    quadsEndgameSequenceRunning=false;
    updateQuadsInstructions();
    const cfg=quadsEndgameConfig();if(cfg)queueGlobalEndgame(cfg,140);
    return;
  }

  // Stage 4: all four solved categories celebrate together in their final positions.
  const rows=[...solvedHost.querySelectorAll(".quads-solved-row")];
  rows.forEach(row=>row.classList.add("all-groups-celebrate"));

  setTimeout(()=>{
    rows.forEach(row=>row.classList.remove("all-groups-celebrate"));

    // Stage 5: replace the instruction line with the final result.
    quadsEndgameSequenceRunning=false;
    status.classList.remove("quads-final-sequence");
    updateQuadsInstructions();

    // Stage 6: open the end-game modal after the board celebration finishes.
    const cfg=quadsEndgameConfig();
    if(cfg){
      globalEndgameShown.delete(globalEndgameKey(cfg.game,cfg.date,cfg.state||"complete"));
      setTimeout(()=>showGlobalEndgame(cfg),180);
    }
  },620);
}

function updateQuadsButtons(){
  const active=!!quadsPuzzle && !quadsComplete;
  document.getElementById("quadsShuffleBtn").disabled=!active;
  document.getElementById("quadsDeselectBtn").disabled=!active || quadsSelected.size===0;
  document.getElementById("quadsSubmitBtn").disabled=!active || quadsSelected.size!==4;
}

function toggleQuadWord(word){
  if(!quadsPuzzle || quadsComplete) return;
  const tiles=[...document.querySelectorAll(".quads-tile")];
  const tile=tiles.find(el=>el.textContent===word);
  if(quadsSelected.has(word)){
    quadsSelected.delete(word);
    if(tile){
      tile.classList.remove("selected","select-pop");
      tile.classList.add("deselect-drop");
      setTimeout(()=>tile.classList.remove("deselect-drop"),180);
    }
  }else{
    if(quadsSelected.size>=4) return;
    quadsSelected.add(word);
    if(tile){
      tile.classList.add("selected","select-pop");
      setTimeout(()=>tile.classList.remove("select-pop"),240);
    }
  }
  updateQuadsButtons();
}

function showQuadsMessage(text,type="warn"){
  document.getElementById("quadsStatus").innerHTML=
    `<div class="quads-message ${type}">${text}</div>`;
}

const QUADS_WRONG_MESSAGES=[
  "Not quite.",
  "Nope — try again.",
  "Sorry, that’s wrong.",
  "Incorrect.",
  "Keep looking."
];
let quadsWrongMessageIndex=0;
let quadsEndgameSequenceRunning=false;

function nextQuadsWrongMessage(){
  const message=QUADS_WRONG_MESSAGES[quadsWrongMessageIndex%QUADS_WRONG_MESSAGES.length];
  quadsWrongMessageIndex=(quadsWrongMessageIndex+1)%QUADS_WRONG_MESSAGES.length;
  return message;
}

function shuffleQuads(){
  if(!quadsPuzzle || quadsComplete) return;
  quadsRemaining=shuffleArray(quadsRemaining);
  quadsSelected.clear();
  preserveViewport(()=>drawQuads(false,true));
}

function deselectQuads(){
  quadsSelected.clear();
  preserveViewport(()=>drawQuads());
}


function normalizeQuadGuess(words){
  return [...words].map(w=>String(w).toUpperCase()).sort().join("|");
}

function quadsAnimateLostLife(done){
  const stars=[...document.querySelectorAll("#quadsMistakes .mistake-star.active-life")];
  const lostStar=stars[stars.length-1];
  if(!lostStar){
    done();
    return;
  }
  lostStar.classList.add("life-lost");
  setTimeout(done,360);
}

function quadsAnimateMiss(oneAway,done){
  const grid=document.getElementById("quadsGrid");
  const selected=[...document.querySelectorAll(".quads-tile.selected")];
  if(oneAway) grid?.classList.add("one-away-motion");

  selected.forEach((el,i)=>{
    el.style.setProperty("--quads-i",i);
    el.classList.add(oneAway?"one-away-tile":"wrong-blink");
    if(oneAway && i===selected.length-1) el.classList.add("one-away-kick");
  });

  const duration=oneAway?640:520;
  setTimeout(()=>{
    grid?.classList.remove("one-away-motion");
    selected.forEach(el=>{
      el.classList.remove("one-away-tile","one-away-kick","wrong-blink","selected");
      el.style.removeProperty("--quads-i");
    });
    setTimeout(()=>quadsAnimateLostLife(done),100);
  },duration);
}

function submitQuads(){
  if(!quadsPuzzle || quadsComplete || quadsSelected.size!==4) return;

  const selected=[...quadsSelected];
  const selectedSet=new Set(selected);
  const normalizedGuess=normalizeQuadGuess(selected);

  if(quadsIncorrectGuesses.includes(normalizedGuess)){
    const selectedTiles=[...document.querySelectorAll(".quads-tile.selected")];
    selectedTiles.forEach(el=>el.classList.add("wrong-blink"));
    setTimeout(()=>selectedTiles.forEach(el=>el.classList.remove("wrong-blink")),520);
    showQuadsMessage("Already guessed.","warn");
    return;
  }

  const match=quadsPuzzle.groups.find(group=>
    group.items.length===4 && group.items.every(w=>selectedSet.has(w))
  );

  if(match){
    const selectedTiles=[...document.querySelectorAll(".quads-tile.selected")];

    // Stage 1: mirror the wrong-answer rhythm, but with a positive green pulse.
    selectedTiles.forEach(el=>el.classList.add("correct-blink"));

    setTimeout(()=>{
      selectedTiles.forEach(el=>{
        el.classList.remove("correct-blink");
        el.classList.add("correct-lift");
      });

      // Stage 2: tiles move upward and disappear.
      setTimeout(()=>{
        quadsSolved.push({
          label:match.label,
          difficulty:match.difficulty,
          items:[...match.items]
        });

        quadsRemaining=quadsRemaining.filter(w=>!selectedSet.has(w));
        quadsRemaining=shuffleArray(quadsRemaining);
        quadsSelected.clear();

        const finalGroupSolved=quadsSolved.length===4;
        if(finalGroupSolved){
          quadsComplete=true;
          quadsWon=true;
          registerDailyGameCompletion("quads",quadsPuzzle);
          quadsEndgameSequenceRunning=true;
        }

        saveQuadsState();
        const quadsStatus=document.getElementById("quadsStatus");
        quadsStatus.innerHTML="";
        if(finalGroupSolved) quadsStatus.classList.add("quads-final-sequence");

        // Stage 3: solved category lands immediately after the cards vanish.
        preserveViewport(()=>drawQuads(true,true));

        // Keep the normal instruction visible until the complete win animation has finished.
        if(finalGroupSolved){
          const instructions=document.getElementById("quadsInstructions");
          if(instructions){
            instructions.textContent="Select four things that have something in common.";
            instructions.classList.remove("quads-end-result","quads-win-result","quads-loss-result");
          }
          setTimeout(playQuadsWinFinishSequence,560);
        }
      },300);
    },600);
    return;
  }

  // One-away means exactly three selected words belong to the same intended unsolved group.
  const unsolvedLabels=new Set(quadsSolved.map(g=>g.label));
  const oneAway=quadsPuzzle.groups.some(group=>{
    if(unsolvedLabels.has(group.label)) return false;
    const count=group.items.filter(w=>selectedSet.has(w)).length;
    return count===3;
  });

  quadsIncorrectGuesses.push(normalizedGuess);
  quadsMistakes++;

  if(quadsMistakes>=4){
    quadsAnimateMiss(oneAway,()=>{
      quadsSelected.clear();
      quadsComplete=true;
      quadsWon=false;
      registerDailyGameCompletion("quads",quadsPuzzle);
      const solvedLabels=new Set(quadsSolved.map(g=>g.label));
      const remainingGroups=quadsPuzzle.groups.filter(g=>!solvedLabels.has(g.label));
      quadsSolved.push(...remainingGroups.map(g=>({
        label:g.label,
        difficulty:g.difficulty,
        items:[...g.items]
      })));
      quadsRemaining=[];
      saveQuadsState();
      showQuadsMessage(oneAway?"3 out of 4 — but that was your fourth mistake.":"That was your fourth mistake.","bad");
      preserveViewport(()=>drawQuads());
    });
    return;
  }

  saveQuadsState();
  showQuadsMessage(oneAway?"3 out of 4!":nextQuadsWrongMessage(),"warn");
  quadsAnimateMiss(oneAway,()=>{
    quadsSelected.clear();
    preserveViewport(()=>drawQuads());
  });
}

document.getElementById("quadsShuffleBtn").onmousedown=e=>e.preventDefault();
document.getElementById("quadsShuffleBtn").onclick=shuffleQuads;
document.getElementById("quadsDeselectBtn").onmousedown=e=>e.preventDefault();
document.getElementById("quadsDeselectBtn").onclick=deselectQuads;
document.getElementById("quadsSubmitBtn").onmousedown=e=>e.preventDefault();
document.getElementById("quadsSubmitBtn").onclick=submitQuads;


/* -----------------------------
   Word Trail
------------------------------ */
const WORDTRAIL_PLAYER_KEY="puzzlePublicWordTrailV1";
let wordTrailPuzzle=null;
let wordTrailPath=[];
let wordTrailFound=[];
let wordTrailNonThemeFound=[];
let wordTrailHintsAvailable=0;
let wordTrailHintsUsed=0;
let wordTrailHintProgressCount=0;
let wordTrailHintedWord=null;
let wordTrailComplete=false;
let wordTrailPointerId=null;
let wordTrailPointerStart=null;
let wordTrailPointerMoved=false;
let wordTrailDragMode=false;
let wordTrailMotion={
  selectedKey:null,
  correctPath:[],
  bonusPath:[],
  invalidPath:[],
  hintPieceIndex:null,
  bankEarnedIndex:null,
  bankSpentIndex:null,
  hintRevealPath:[],
  pathDrawNonce:0
};
let wordTrailMotionTimers=[];

function wtClearMotionTimers(){
  wordTrailMotionTimers.forEach(clearTimeout);
  wordTrailMotionTimers=[];
}
function wtLater(fn,ms){
  const id=setTimeout(fn,ms);
  wordTrailMotionTimers.push(id);
  return id;
}
function wtCellKey(r,c){ return `${r},${c}`; }

function wtAreAdjacent(a,b){
  const dr=Math.abs(a[0]-b[0]);
  const dc=Math.abs(a[1]-b[1]);
  return dr<=1 && dc<=1 && !(dr===0&&dc===0);
}

function wtPathWord(path){
  if(!wordTrailPuzzle) return "";
  return path.map(([r,c])=>wordTrailPuzzle.grid[r][c]).join("").toUpperCase();
}

function wtCenter([r,c]){
  return [21+c*50,21+r*50];
}

function wtPolyline(path,klass=""){
  if(!path?.length) return "";
  const points=path.map(p=>wtCenter(p).join(",")).join(" ");
  return `<polyline class="${klass}" points="${points}"></polyline>`;
}

function wtAllThemeWords(){
  return (wordTrailPuzzle?.words||[]).map(x=>String(x).toUpperCase());
}

function wtThemeWord(){
  return String(wordTrailPuzzle?.themeWord||"").toUpperCase();
}

function wtSolutionPath(word){
  const paths=wordTrailPuzzle?.paths||{};
  return paths[word]||paths[word.toUpperCase()]||null;
}


async function loadWordTrailForSelectedDate(){
  wordTrailPuzzle=null;
  wordTrailPath=[];
  wordTrailFound=[];
  wordTrailNonThemeFound=[];
  wordTrailHintsAvailable=0;
  wordTrailHintsUsed=0;
  wordTrailHintProgressCount=0;
  wordTrailHintedWord=null;
  wordTrailComplete=false;

  const meta=document.getElementById("wordTrailPuzzleMeta");
  const status=document.getElementById("wordTrailStatus");
  status.innerHTML="";

  const res=await fetch(`/api/puzzle/today?game=trail&date=${encodeURIComponent(currentDateKey())}`);
  if(!res.ok){
    meta.textContent="No On the Right Track scheduled";
    document.getElementById("wordTrailTheme").textContent="—";
    document.getElementById("wordTrailGrid").innerHTML="";
    document.getElementById("wordTrailPathSvg").innerHTML="";
    document.getElementById("wordTrailCurrentWord").textContent="";
    document.getElementById("wordTrailProgress").textContent="";
    document.getElementById("wordTrailHintProgress").textContent="";
    document.getElementById("wordTrailFound").innerHTML="";
    status.innerHTML='<div class="result">There is no On the Right Track puzzle scheduled for this date.</div>';
    updateWordTrailButtons();
    return;
  }

  wordTrailPuzzle=await res.json();
  meta.textContent=formatPuzzleDate(wordTrailPuzzle.date);
  document.getElementById("wordTrailTheme").textContent=wordTrailPuzzle.theme||"";

  restoreWordTrailState();
  drawWordTrail();
}

function restoreWordTrailState(){
  const all=readJsonStorage(WORDTRAIL_PLAYER_KEY,{});
  const s=all[currentDateKey()];
  if(!s || s.puzzleId!==wordTrailPuzzle.id) return;

  wordTrailFound=s.found||[];
  wordTrailNonThemeFound=s.nonThemeFound||[];
  wordTrailHintsAvailable=Math.min(3,Number(s.hintsAvailable)||0);
  wordTrailHintsUsed=Math.max(0,Number(s.hintsUsed)||0);
  wordTrailHintProgressCount=Number.isInteger(s.hintProgressCount)
    ? Math.max(0,Math.min(2,s.hintProgressCount))
    : ((s.nonThemeFound||[]).length%3);
  wordTrailHintedWord=s.hintedWord||null;
  wordTrailComplete=!!s.complete;
}

function saveWordTrailState(){
  if(!wordTrailPuzzle) return;
  const all=readJsonStorage(WORDTRAIL_PLAYER_KEY,{});
  all[currentDateKey()]={
    puzzleId:wordTrailPuzzle.id,
    found:wordTrailFound,
    nonThemeFound:wordTrailNonThemeFound,
    hintsAvailable:Math.min(3,wordTrailHintsAvailable),
    hintsUsed:wordTrailHintsUsed,
    hintProgressCount:wordTrailHintProgressCount,
    hintedWord:wordTrailHintedWord,
    complete:wordTrailComplete
  };
  writeJsonStorage(WORDTRAIL_PLAYER_KEY,all);
}

function resetWordTrailForSelectedDate(){
  const all=readJsonStorage(WORDTRAIL_PLAYER_KEY,{});
  delete all[currentDateKey()];
  writeJsonStorage(WORDTRAIL_PLAYER_KEY,all);
  wordTrailPath=[];
  wordTrailFound=[];
  wordTrailNonThemeFound=[];
  wordTrailHintsAvailable=0;
  wordTrailHintsUsed=0;
  wordTrailHintProgressCount=0;
  wordTrailHintedWord=null;
  wordTrailComplete=false;
}

function drawWordTrail(){
  updatePuzzleEndStatus("trail");
  const grid=document.getElementById("wordTrailGrid");
  grid.innerHTML="";

  const foundCells=new Map();
  for(const word of wordTrailFound){
    const path=wtSolutionPath(word)||[];
    for(const [r,c] of path){
      foundCells.set(wtCellKey(r,c), word===wtThemeWord() ? "theme" : "found");
    }
  }

  const hinted=new Set();
  if(wordTrailHintedWord){
    for(const [r,c] of wtSolutionPath(wordTrailHintedWord)||[]){
      hinted.add(wtCellKey(r,c));
    }
  }

  const selectedSet=new Set(wordTrailPath.map(([r,c])=>wtCellKey(r,c)));

  wordTrailPuzzle.grid.forEach((row,r)=>{
    row.forEach((letter,c)=>{
      const key=wtCellKey(r,c);
      const cell=document.createElement("button");
      cell.type="button";
      cell.className="wordtrail-player-cell";
      if(selectedSet.has(key)) cell.classList.add("active");
      if(foundCells.get(key)==="found") cell.classList.add("found");
      if(foundCells.get(key)==="theme") cell.classList.add("theme-word");
      if(hinted.has(key) && !foundCells.has(key)) cell.classList.add("hint");
      if(wordTrailMotion.selectedKey===key) cell.classList.add("motion-select");
      const correctIndex=wordTrailMotion.correctPath.findIndex(([rr,cc])=>rr===r&&cc===c);
      if(correctIndex>=0){
        cell.classList.add("motion-correct");
        cell.style.setProperty("--wt-motion-delay",`${correctIndex*42}ms`);
      }
      const hintRevealIndex=wordTrailMotion.hintRevealPath.findIndex(([rr,cc])=>rr===r&&cc===c);
      if(hintRevealIndex>=0){
        cell.classList.add("motion-hint-reveal");
        cell.style.setProperty("--wt-hint-delay",`${hintRevealIndex*58}ms`);
      }
      if(wordTrailMotion.bonusPath.some(([rr,cc])=>rr===r&&cc===c)){
        cell.classList.add("motion-bonus-valid");
      }
      if(wordTrailMotion.invalidPath.some(([rr,cc])=>rr===r&&cc===c)){
        cell.classList.add("motion-invalid");
      }
      cell.textContent=letter;
      cell.dataset.r=r;
      cell.dataset.c=c;
      // Pointer events handle both click and drag without double-firing.
      cell.onpointerdown=e=>beginWordTrailPointer(e,r,c);

      // Keep keyboard accessibility: Enter/Space on a focused letter acts like a click.
      cell.onkeydown=e=>{
        if(e.key==="Enter" || e.key===" "){
          e.preventDefault();
          wordTrailSelectCell(r,c);
        }
      };
      grid.appendChild(cell);
    });
  });

  const svg=document.getElementById("wordTrailPathSvg");
  let lines="";
  for(const word of wordTrailFound){
    lines+=wtPolyline(wtSolutionPath(word)||[], word===wtThemeWord()?"theme-line":"found-line");
  }
  lines+=wtPolyline(wordTrailPath,wordTrailPath.length?"active-line motion-path-draw":"");
  svg.innerHTML=lines;
  const activeLine=svg.querySelector("polyline.active-line");
  if(activeLine && wordTrailPath.length>1){
    const length=activeLine.getTotalLength?.()||0;
    if(length>0){
      activeLine.style.setProperty("--wt-path-length",String(length));
      // Rebuilt on each accepted drag step, so only the newly extended geometry
      // receives this very short draw-on response.
      activeLine.dataset.drawNonce=String(++wordTrailMotion.pathDrawNonce);
    }
  }

  document.getElementById("wordTrailCurrentWord").textContent=wtPathWord(wordTrailPath);

  const total=wtAllThemeWords().length;
  const foundCount=Math.min(wordTrailFound.length,total);
  const remainingCount=Math.max(0,total-foundCount);
  const progressHost=document.getElementById("wordTrailProgress");
  if(progressHost){
    progressHost.setAttribute("aria-label",`${foundCount} theme words found, ${remainingCount} remaining`);
    progressHost.innerHTML=`<span class="wordtrail-progress-track" aria-hidden="true">${
      Array.from({length:total},(_,i)=>`<span class="wordtrail-progress-segment${i<foundCount?" is-found":""}"></span>`).join("")
    }</span>`;
  }

  renderWordTrailHintSystem();

  document.getElementById("wordTrailFound").innerHTML=
    wordTrailFound.map(word=>`<div class="wordtrail-found-row ${word===wtThemeWord()?"theme":""}">
      ${word===wtThemeWord()?"Theme word: ":""}${word}
    </div>`).join("");

  if(wordTrailComplete){
    document.getElementById("wordTrailStatus").innerHTML=
      '<div class="completion-note">Solved — every letter in the grid has been used.</div>';
    const cfg=trailEndgameConfig();if(cfg)queueGlobalEndgame(cfg,160);
  }

  updateWordTrailButtons();
}


function renderWordTrailHintSystem(){
  const host=document.getElementById("wordTrailHintProgress");
  if(!host) return;

  const remainder=Math.max(0,Math.min(2,wordTrailHintProgressCount));
  const pieces=[0,1,2].map(i=>
    `<span class="ort-hint-piece ${i<remainder?"filled":""} ${wordTrailMotion.hintPieceIndex===i?"motion-earned":""}" aria-hidden="true"></span>`
  ).join("");

  const bankIcons=Array.from({length:3},(_,i)=>{
    const filled=i<Math.min(3,wordTrailHintsAvailable);
    const motionEarned=wordTrailMotion.bankEarnedIndex===i?"motion-bank-earned":"";
    const motionSpent=wordTrailMotion.bankSpentIndex===i?"motion-bank-spent":"";
    return `<span class="ort-hint-bank-slot ${filled?"filled":""} ${motionEarned} ${motionSpent}" aria-hidden="true"></span>`;
  }).join("");

  host.innerHTML=`
    <div class="ort-hint-flow">
      <div class="ort-hint-column ort-hint-builder">
        <div class="ort-hint-label">Next Hint</div>
        <div class="ort-hint-token" role="img" aria-label="${remainder} of 3 bonus words toward the next hint">${pieces}</div>
      </div>
      <div class="ort-hint-column ort-hint-bank">
        <div class="ort-hint-label">Hint Bank</div>
        <div class="ort-hint-bank-icons" role="img" aria-label="${Math.min(3,wordTrailHintsAvailable)} stored hints">${bankIcons}</div>
      </div>
    </div>`;
}

function updateWordTrailButtons(){
  const active=!!wordTrailPuzzle && !wordTrailComplete;
  document.getElementById("wordTrailClearBtn").disabled=!active || wordTrailPath.length===0;
  document.getElementById("wordTrailSubmitBtn").disabled=!active || wordTrailPath.length<2;
  document.getElementById("wordTrailHintBtn").disabled=!active || wordTrailHintsAvailable<1;
}



function wtFoundCellIsLocked(r,c){
  // Solved theme-word cells remain reusable for tracing non-theme bonus words.
  return false;
}

function wtSameCell(a,b){
  return !!a && !!b && a[0]===b[0] && a[1]===b[1];
}

function wtAppendOrBacktrack(r,c){
  if(!wordTrailPuzzle || wordTrailComplete) return false;
  if(wtFoundCellIsLocked(r,c)) return false;

  const next=[r,c];

  if(wordTrailPath.length===0){
    wordTrailPath.push(next);
    wordTrailMotion.selectedKey=wtCellKey(r,c);
    wtLater(()=>{ wordTrailMotion.selectedKey=null; },180);
    document.getElementById("wordTrailStatus").innerHTML="";
    drawWordTrail();
    return true;
  }

  const last=wordTrailPath[wordTrailPath.length-1];

  // Touch/clicking the current last cell removes it.
  if(wtSameCell(last,next)){
    wordTrailPath.pop();
    document.getElementById("wordTrailStatus").innerHTML="";
    drawWordTrail();
    return true;
  }

  // Dragging/clicking back onto the immediately previous cell removes the last cell.
  if(wordTrailPath.length>=2){
    const previous=wordTrailPath[wordTrailPath.length-2];
    if(wtSameCell(previous,next)){
      wordTrailPath.pop();
      document.getElementById("wordTrailStatus").innerHTML="";
      drawWordTrail();
      return true;
    }
  }

  // A cell already used earlier in the path cannot be jumped back to.
  if(wordTrailPath.some(([rr,cc])=>rr===r&&cc===c)) return false;

  if(!wtAreAdjacent(last,next)) return false;

  wordTrailPath.push(next);
  wordTrailMotion.selectedKey=wtCellKey(r,c);
  wtLater(()=>{ wordTrailMotion.selectedKey=null; },180);
  document.getElementById("wordTrailStatus").innerHTML="";
  drawWordTrail();
  return true;
}

function wtCellFromPoint(x,y){
  const grid=document.getElementById("wordTrailGrid");
  const rect=grid.getBoundingClientRect();
  const localX=x-rect.left;
  const localY=y-rect.top;
  if(localX<0 || localY<0 || localX>=rect.width || localY>=rect.height) return null;

  const cols=6, rows=8;
  const styles=getComputedStyle(grid);
  const gapX=parseFloat(styles.columnGap)||0;
  const gapY=parseFloat(styles.rowGap)||0;
  const cellW=(rect.width-gapX*(cols-1))/cols;
  const cellH=(rect.height-gapY*(rows-1))/rows;
  const pitchX=cellW+gapX;
  const pitchY=cellH+gapY;

  const c=Math.floor(localX/pitchX);
  const r=Math.floor(localY/pitchY);
  if(r<0 || r>=rows || c<0 || c>=cols) return null;

  const cx=localX-c*pitchX;
  const cy=localY-r*pitchY;
  if(cx<0 || cy<0 || cx>cellW || cy>cellH) return null;

  const cut=Math.min(cellW,cellH)*0.285;
  const inTopLeft=(cx+cy)>=cut;
  const inTopRight=((cellW-cx)+cy)>=cut;
  const inBottomLeft=(cx+(cellH-cy))>=cut;
  const inBottomRight=((cellW-cx)+(cellH-cy))>=cut;
  if(!(inTopLeft&&inTopRight&&inBottomLeft&&inBottomRight)) return null;

  return [r,c];
}

function beginWordTrailPointer(e,r,c){
  if(!wordTrailPuzzle || wordTrailComplete) return;

  // Do not let native button activation/dragging move focus or scroll.
  e.preventDefault();

  wordTrailPointerId=e.pointerId;
  wordTrailPointerStart=[r,c];
  wordTrailPointerMoved=false;
  wordTrailDragMode=false;

  const grid=document.getElementById("wordTrailGrid");
  try{ grid?.setPointerCapture(e.pointerId); }catch(_){}
}

function moveWordTrailPointer(e){
  if(e.pointerId!==wordTrailPointerId || !wordTrailPointerStart) return;
  e.preventDefault();

  const cell=wtCellFromPoint(e.clientX,e.clientY);
  if(!cell) return;

  if(!wordTrailPointerMoved && !wtSameCell(cell,wordTrailPointerStart)){
    wordTrailPointerMoved=true;
    wordTrailDragMode=true;

    // Start a drag path from the pressed cell.
    // If the existing path already ends on that cell, continue from it.
    const last=wordTrailPath[wordTrailPath.length-1];
    if(!last){
      wtAppendOrBacktrack(wordTrailPointerStart[0],wordTrailPointerStart[1]);
    }else if(!wtSameCell(last,wordTrailPointerStart)){
      // If pressed cell is adjacent to current click-built path, extend to it.
      // Otherwise start a fresh drag path from the pressed cell.
      if(wtAreAdjacent(last,wordTrailPointerStart) &&
         !wordTrailPath.some(p=>wtSameCell(p,wordTrailPointerStart))){
        wtAppendOrBacktrack(wordTrailPointerStart[0],wordTrailPointerStart[1]);
      }else{
        wordTrailPath=[];
        wtAppendOrBacktrack(wordTrailPointerStart[0],wordTrailPointerStart[1]);
      }
    }
  }

  if(wordTrailDragMode){
    const last=wordTrailPath[wordTrailPath.length-1];
    if(!wtSameCell(last,cell)){
      wtAppendOrBacktrack(cell[0],cell[1]);
    }
  }
}

function endWordTrailPointer(e){
  if(e.pointerId!==wordTrailPointerId || !wordTrailPointerStart) return;
  e.preventDefault();

  const startCell=wordTrailPointerStart;
  const wasDrag=wordTrailDragMode;

  const grid=document.getElementById("wordTrailGrid");
  try{
    if(grid?.hasPointerCapture?.(e.pointerId))grid.releasePointerCapture(e.pointerId);
  }catch(_){}

  wordTrailPointerId=null;
  wordTrailPointerStart=null;
  wordTrailPointerMoved=false;
  wordTrailDragMode=false;

  if(wasDrag){
    // Dragging submits on release when at least two letters are selected.
    if(wordTrailPath.length>=2) submitWordTrail();
    return;
  }

  // No movement = ordinary click selection.
  const ok=wtAppendOrBacktrack(startCell[0],startCell[1]);
  if(!ok && wordTrailPath.length){
    const last=wordTrailPath[wordTrailPath.length-1];
    if(!wtAreAdjacent(last,startCell)){
      showWordTrailMessage("Letters must be directly adjacent.","warn");
    }
  }
}

function wordTrailSelectCell(r,c){
  if(!wordTrailPuzzle || wordTrailComplete) return;
  const ok=wtAppendOrBacktrack(r,c);
  if(!ok && wordTrailPath.length){
    const last=wordTrailPath[wordTrailPath.length-1];
    if(!wtAreAdjacent(last,[r,c])){
      showWordTrailMessage("Letters must be directly adjacent.","warn");
    }
  }
}

function clearWordTrailPath(){
  wordTrailPath=[];
  document.getElementById("wordTrailStatus").innerHTML="";
  drawWordTrail();
}

function showWordTrailMessage(text,type="warn"){
  document.getElementById("wordTrailStatus").innerHTML=
    `<div class="wordtrail-message ${type}">${text}</div>`;
}


async function validateWordTrailBonusWord(word){
  try{
    const res=await fetch(`/api/wordtrail/validate?word=${encodeURIComponent(word)}`);
    if(!res.ok) return false;
    const result=await res.json();
    return !!result.valid;
  }catch(err){
    console.error("On the Right Track dictionary validation failed:",err);
    return false;
  }
}

async function submitWordTrail(){
  if(!wordTrailPuzzle || wordTrailComplete || wordTrailPath.length<2) return;

  const word=wtPathWord(wordTrailPath);
  const themeWords=wtAllThemeWords();
  const submittedPath=wordTrailPath.map(p=>[...p]);
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rejectPath=(message,type="bad")=>{
    showWordTrailMessage(message,type);
    if(reduced){
      wordTrailPath=[];
      drawWordTrail();
      return;
    }
    wordTrailMotion.invalidPath=submittedPath;
    drawWordTrail();
    wtLater(()=>{
      wordTrailMotion.invalidPath=[];
      wordTrailPath=[];
      drawWordTrail();
    },210);
  };

  if(wordTrailFound.includes(word)){
    rejectPath("Already found.","warn");
    return;
  }

  if(themeWords.includes(word)){
    // Theme words get the premium sequential confirmation sweep. The selected
    // path remains visible until the sweep finishes, then settles permanently.
    wordTrailMotion.correctPath=reduced?[]:submittedPath;
    drawWordTrail();

    const commitTheme=()=>{
      wordTrailFound.push(word);
      wordTrailPath=[];
      wordTrailMotion.correctPath=[];
      if(wordTrailHintedWord===word) wordTrailHintedWord=null;

      if(wordTrailFound.length===themeWords.length){
        wordTrailComplete=true;
        registerDailyGameCompletion("trail",wordTrailPuzzle);
      }

      saveWordTrailState();
      showWordTrailMessage(word===wtThemeWord()?"Theme word found!":"Theme word found.","good");
      drawWordTrail();
    };

    if(reduced) commitTheme();
    else wtLater(commitTheme,Math.min(620,260+submittedPath.length*48));
    return;
  }

  // Non-theme words must be real dictionary words of at least 4 letters.
  if(word.length<4){
    rejectPath("Non-theme words must be at least 4 letters.");
    return;
  }

  showWordTrailMessage("Checking word…","warn");
  const validBonusWord=await validateWordTrailBonusWord(word);

  if(validBonusWord){
    if(wordTrailNonThemeFound.includes(word)){
      rejectPath("Already found that non-theme word.","warn");
      return;
    }

    // Keep the path in place for one quick whole-path success pulse before
    // dissolving it and delivering the hint-piece reward.
    if(!reduced){
      wordTrailMotion.bonusPath=submittedPath;
      drawWordTrail();
      await new Promise(resolve=>wtLater(resolve,320));
    }

    wordTrailMotion.bonusPath=[];
    wordTrailNonThemeFound.push(word);
    wordTrailPath=[];

    if(wordTrailHintsAvailable<3){
      const earnedPiece=wordTrailHintProgressCount;
      wordTrailHintProgressCount++;
      wordTrailMotion.hintPieceIndex=earnedPiece;

      if(wordTrailHintProgressCount>=3){
        showWordTrailMessage("Hint earned!","good");
        saveWordTrailState();
        drawWordTrail();

        wtLater(()=>{
          const newBankIndex=Math.min(2,wordTrailHintsAvailable);
          wordTrailHintsAvailable=Math.min(3,wordTrailHintsAvailable+1);
          wordTrailHintProgressCount=0;
          wordTrailMotion.hintPieceIndex=null;
          wordTrailMotion.bankEarnedIndex=newBankIndex;
          saveWordTrailState();
          drawWordTrail();
          wtLater(()=>{
            wordTrailMotion.bankEarnedIndex=null;
            drawWordTrail();
          },520);
        },reduced?0:520);
      }else{
        showWordTrailMessage("You earned a Hint piece.","good");
        saveWordTrailState();
        drawWordTrail();
        wtLater(()=>{
          wordTrailMotion.hintPieceIndex=null;
          drawWordTrail();
        },reduced?0:520);
      }
    }else{
      wordTrailHintProgressCount=0;
      showWordTrailMessage("Valid non-theme word. Hint bank is full.","good");
      saveWordTrailState();
      drawWordTrail();
    }
    return;
  }

  rejectPath("Not a valid word.");
}

function useWordTrailHint(){
  if(!wordTrailPuzzle || wordTrailComplete || wordTrailHintsAvailable<1) return;

  const remaining=wtAllThemeWords().filter(w=>!wordTrailFound.includes(w));
  if(!remaining.length) return;

  const spentIndex=Math.max(0,wordTrailHintsAvailable-1);
  const chosen=remaining[Math.floor(Math.random()*remaining.length)];
  wordTrailMotion.bankSpentIndex=spentIndex;
  wordTrailPath=[];
  drawWordTrail();

  wtLater(()=>{
    wordTrailHintsAvailable--;
    wordTrailHintsUsed++;
    wordTrailMotion.bankSpentIndex=null;
    wordTrailHintedWord=chosen;
    wordTrailMotion.hintRevealPath=(wtSolutionPath(chosen)||[]).map(p=>[...p]);
    saveWordTrailState();
    showWordTrailMessage("Hint revealed — trace the highlighted letters.","warn");
    drawWordTrail();

    wtLater(()=>{
      wordTrailMotion.hintRevealPath=[];
      drawWordTrail();
    },Math.min(900,280+wordTrailMotion.hintRevealPath.length*58));
  },240);
}

document.getElementById("wordTrailClearBtn").onclick=clearWordTrailPath;
document.getElementById("wordTrailSubmitBtn").onclick=submitWordTrail;
document.getElementById("wordTrailHintBtn").onclick=useWordTrailHint;

function sizeWordTrailMobileBoard(){
  const panel=document.getElementById("wordTrailPanel");
  const stage=document.getElementById("wordTrailBoardStage");
  const board=panel?.querySelector(".wordtrail-board-wrap");
  const dock=document.getElementById("wordTrailDock");
  const current=document.getElementById("wordTrailCurrentWord");
  if(!panel || !stage || !board || !dock || !current) return;

  const gameplay=document.getElementById("wordTrailGameplay");

  if(window.innerWidth>700){
    board.style.removeProperty("width");
    board.style.removeProperty("height");
    if(gameplay){
      gameplay.style.removeProperty("height");
      gameplay.style.removeProperty("min-height");
    }
    return;
  }

  // Hidden panels report unusable geometry. Re-run after Unscrumble is shown.
  if(panel.classList.contains("game-hidden") || stage.offsetParent===null) return;

  // Pin the gameplay region to the remaining visible viewport. This is based
  // on its actual top edge, so header/theme height changes cannot push the
  // controls or hint tokens below the fold.
  if(gameplay){
    const gameplayTop=gameplay.getBoundingClientRect().top;
    const availableGameplayHeight=Math.max(0,window.innerHeight-gameplayTop);
    gameplay.style.setProperty("height",`${availableGameplayHeight}px`,"important");
    gameplay.style.setProperty("min-height","0","important");
  }

  const stageRect=stage.getBoundingClientRect();
  const dockRect=dock.getBoundingClientRect();
  if(stageRect.width<=0 || stageRect.top>=window.innerHeight) return;

  const ratio=292/392;
  const widthLimit=Math.max(0,Math.min(stageRect.width,window.innerWidth-40));

  /*
    Full-grid visibility has priority over width.
    V103.19: the current-word pill now sits ABOVE the board stage, so its
    height is already included in stageRect.top and must not be reserved
    a second time. Only the bottom dock and a small safety gap constrain
    the available board height.
  */
  const settledDockRect=dock.getBoundingClientRect();
  const dockHeight=Math.max(settledDockRect.height,dock.scrollHeight||0);
  const gridControlsGap=10;
  const viewportSafety=4;
  const heightLimit=Math.max(
    0,
    window.innerHeight-stageRect.top-dockHeight-gridControlsGap-viewportSafety
  );

  const widthFromHeight=heightLimit*ratio;
  const width=Math.min(widthLimit,widthFromHeight);

  if(width<=0) return;

  board.style.setProperty("width",`${width}px`,"important");
  board.style.setProperty("height",`${width/ratio}px`,"important");
}

let wordTrailResizeFrame=0;
function queueWordTrailMobileBoardSize(){
  cancelAnimationFrame(wordTrailResizeFrame);
  wordTrailResizeFrame=requestAnimationFrame(()=>{
    sizeWordTrailMobileBoard();
    requestAnimationFrame(sizeWordTrailMobileBoard);
  });
}

window.addEventListener("resize",queueWordTrailMobileBoardSize);
window.addEventListener("orientationchange",queueWordTrailMobileBoardSize);

const wordTrailBoardStageEl=document.getElementById("wordTrailBoardStage");
let wordTrailObservedStageWidth=0;
if(wordTrailBoardStageEl && "ResizeObserver" in window){
  const wordTrailBoardResizeObserver=new ResizeObserver(entries=>{
    const width=entries?.[0]?.contentRect?.width||0;
    if(activeGame!=="trail" || width<=0)return;
    if(Math.abs(width-wordTrailObservedStageWidth)<1)return;
    wordTrailObservedStageWidth=width;
    queueWordTrailMobileBoardSize();
  });
  wordTrailBoardResizeObserver.observe(wordTrailBoardStageEl);
}

const wtGridEl=document.getElementById("wordTrailGrid");
wtGridEl.addEventListener("pointermove",moveWordTrailPointer);
wtGridEl.addEventListener("pointerup",endWordTrailPointer);
wtGridEl.addEventListener("pointercancel",endWordTrailPointer);



/* -----------------------------
   Mini
------------------------------ */
const MINI_PLAYER_KEY="puzzlePublicMiniV2";
let miniPuzzle=null;
let miniValues={};
let miniActiveCell=null;
let miniDirection="across";
let miniComplete=false;
let miniRevealedPuzzle=false;
let miniLetterHintsUsed=0;
let miniWordHintsUsed=0;

function miniKey(r,c){return `${r},${c}`;}
function miniRows(){return miniPuzzle?.grid?.length||0;}
function miniCols(){return miniPuzzle?.grid?.[0]?.length||0;}
function miniEntryList(direction){return direction==="down"?(miniPuzzle?.down||[]):(miniPuzzle?.across||[]);}
function miniEntryAt(r,c,direction){
  return miniEntryList(direction).find(entry=>(entry.cells||[]).some(([rr,cc])=>rr===r&&cc===c))||null;
}
function miniAnyEntryAt(r,c){return miniEntryAt(r,c,"across")||miniEntryAt(r,c,"down");}


function normalizeMiniPuzzleData(raw){
  if(!raw?.grid?.length) return raw;

  const rows=raw.grid.length;
  const cols=raw.grid[0].length;
  const grid=raw.grid.map(row=>row.map(x=>String(x).toUpperCase()));

  // If the dashboard already supplied full cell metadata, keep it.
  const hasCells=(raw.across||[]).every(e=>Array.isArray(e.cells)) &&
                 (raw.down||[]).every(e=>Array.isArray(e.cells));
  if(hasCells && raw.numbers) return {...raw,grid};

  const numberMap={};
  const derivedAcross=[];
  const derivedDown=[];
  let nextNumber=1;

  // Standard crossword numbering: a cell gets a number if it begins an
  // Across or Down entry of at least two cells.
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      if(grid[r][c]==="#") continue;
      const beginsAcross=(c===0||grid[r][c-1]==="#") && c+1<cols && grid[r][c+1]!=="#";
      const beginsDown=(r===0||grid[r-1][c]==="#") && r+1<rows && grid[r+1][c]!=="#";
      if(beginsAcross||beginsDown){
        numberMap[`${r},${c}`]=nextNumber++;
      }
    }
  }

  const acrossByNum=new Map((raw.across||[]).map(e=>[Number(String(e.n).replace(/\D/g,"")),e]));
  const downByNum=new Map((raw.down||[]).map(e=>[Number(String(e.n).replace(/\D/g,"")),e]));

  for(const [key,n] of Object.entries(numberMap)){
    const [r,c]=key.split(",").map(Number);

    if((c===0||grid[r][c-1]==="#") && c+1<cols && grid[r][c+1]!=="#"){
      const cells=[];
      for(let cc=c;cc<cols&&grid[r][cc]!=="#";cc++) cells.push([r,cc]);
      const existing=acrossByNum.get(n);
      const answer=cells.map(([rr,cc])=>grid[rr][cc]).join("");
      derivedAcross.push({
        n,
        answer:existing?.answer||answer,
        clue:existing?.clue||`Across entry (${cells.length} letters)`,
        cells
      });
    }

    if((r===0||grid[r-1][c]==="#") && r+1<rows && grid[r+1][c]!=="#"){
      const cells=[];
      for(let rr=r;rr<rows&&grid[rr][c]!=="#";rr++) cells.push([rr,c]);
      const existing=downByNum.get(n);
      const answer=cells.map(([rr,cc])=>grid[rr][cc]).join("");
      derivedDown.push({
        n,
        answer:existing?.answer||answer,
        clue:existing?.clue||`Down entry (${cells.length} letters)`,
        cells
      });
    }
  }

  return {
    ...raw,
    grid,
    numbers:numberMap,
    across:derivedAcross,
    down:derivedDown
  };
}

async function loadMiniForSelectedDate(){
  miniPuzzle=null;
  miniValues={};
  miniActiveCell=null;
  miniDirection="across";
  miniComplete=false;
  miniRevealedPuzzle=false;
  miniLetterHintsUsed=0;
  miniWordHintsUsed=0;

  const res=await fetch(`/api/puzzle/today?game=mini&date=${encodeURIComponent(currentDateKey())}`);
  const meta=document.getElementById("miniPuzzleMeta");
  const status=document.getElementById("miniStatus");
  status.innerHTML="";

  if(!res.ok){
    meta.textContent="No Mini scheduled";
    document.getElementById("miniGrid").innerHTML="";
    document.getElementById("miniAcrossClues").innerHTML="";
    document.getElementById("miniDownClues").innerHTML="";
    document.getElementById("miniActiveClue").textContent="";
    status.innerHTML='<div class="result">There is no Mini puzzle scheduled for this date.</div>';
    return;
  }

  miniPuzzle=normalizeMiniPuzzleData(await res.json());
  meta.textContent=formatPuzzleDate(miniPuzzle.date);
  restoreMiniState();

  if(!miniActiveCell){
    miniActiveCell=(miniPuzzle.across||[])[0]?.cells?.[0] ||
      (miniPuzzle.down||[])[0]?.cells?.[0] || null;
  }

  // If restored direction doesn't exist at active cell, switch.
  if(miniActiveCell){
    const [r,c]=miniActiveCell;
    if(!miniEntryAt(r,c,miniDirection)){
      miniDirection=miniEntryAt(r,c,"across")?"across":"down";
    }
  }

  drawMini();
}

function restoreMiniState(){
  const all=readJsonStorage(MINI_PLAYER_KEY,{});
  const s=all[currentDateKey()];
  if(!s||s.puzzleId!==miniPuzzle.id)return;
  miniValues=s.values||{};
  miniActiveCell=s.activeCell||null;
  miniDirection=s.direction||"across";
  miniComplete=!!s.complete;
  miniRevealedPuzzle=!!s.revealedPuzzle;
  miniLetterHintsUsed=Math.max(0,Number(s.letterHintsUsed)||0);
  miniWordHintsUsed=Math.max(0,Number(s.wordHintsUsed)||0);
}
function saveMiniState(){
  if(!miniPuzzle)return;
  const all=readJsonStorage(MINI_PLAYER_KEY,{});
  all[currentDateKey()]={
    puzzleId:miniPuzzle.id,
    values:miniValues,
    activeCell:miniActiveCell,
    direction:miniDirection,
    complete:miniComplete,
    revealedPuzzle:miniRevealedPuzzle,
    letterHintsUsed:miniLetterHintsUsed,
    wordHintsUsed:miniWordHintsUsed
  };
  writeJsonStorage(MINI_PLAYER_KEY,all);
}
function resetMiniForSelectedDate(){
  const all=readJsonStorage(MINI_PLAYER_KEY,{});
  delete all[currentDateKey()];
  writeJsonStorage(MINI_PLAYER_KEY,all);
  miniValues={};
  miniActiveCell=null;
  miniDirection="across";
  miniComplete=false;
  miniRevealedPuzzle=false;
  miniLetterHintsUsed=0;
  miniWordHintsUsed=0;
}
function miniSolutionAt(r,c){return String(miniPuzzle.grid[r][c]||"").toUpperCase();}
function miniCurrentEntry(){
  if(!miniActiveCell)return null;
  const [r,c]=miniActiveCell;
  return miniEntryAt(r,c,miniDirection)||miniAnyEntryAt(r,c);
}

function drawMiniKeyboard(){
  const host=document.getElementById("miniKeyboard");
  if(!host)return;
  const rows=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
  host.innerHTML="";
  rows.forEach((row,index)=>{
    const wrap=document.createElement("div");
    wrap.className="key-row";
    if(index===2){
      const back=document.createElement("button");
      back.type="button";
      back.className="key key-action";
      back.textContent="Delete";
      back.onclick=miniBackspace;
      wrap.appendChild(back);
    }
    [...row].forEach(ch=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="key";
      button.textContent=ch;
      button.onclick=()=>miniTypeLetter(ch);
      wrap.appendChild(button);
    });
    if(index===2){
      const enter=document.createElement("button");
      enter.type="button";
      enter.className="key key-action submit-action";
      enter.textContent="Submit";
      enter.onclick=miniMoveToNextIncompleteEntry;
      wrap.appendChild(enter);
    }
    host.appendChild(wrap);
  });
}

function drawMini(){
  updatePuzzleEndStatus("mini");
  if(!miniPuzzle)return;

  const grid=document.getElementById("miniGrid");
  const rows=miniRows(), cols=miniCols();

  const miniPanel=document.getElementById("miniPanel");
  if(miniPanel){
    miniPanel.classList.toggle("mini-size-5",cols===5);
    miniPanel.classList.toggle("mini-size-6",cols===6);
  }

  grid.style.setProperty("--mini-cols",cols);
  grid.style.setProperty("--mini-rows",rows);
  grid.innerHTML="";

  const activeEntry=miniCurrentEntry();
  const activeKeys=new Set((activeEntry?.cells||[]).map(([r,c])=>miniKey(r,c)));

  miniPuzzle.grid.forEach((row,r)=>{
    row.forEach((solution,c)=>{
      const key=miniKey(r,c);
      const cell=document.createElement("button");
      cell.type="button";
      cell.className="mini-cell";
      cell.dataset.r=r;
      cell.dataset.c=c;

      if(solution==="#"){
        cell.classList.add("black");
        cell.disabled=true;
        grid.appendChild(cell);
        return;
      }

      if(activeKeys.has(key))cell.classList.add("word-highlight");
      if(miniActiveCell&&miniActiveCell[0]===r&&miniActiveCell[1]===c){
        cell.classList.add("active");
      }

      const number=miniPuzzle.numbers?.[key];
      if(number){
        const num=document.createElement("span");
        num.className="mini-number";
        num.textContent=number;
        cell.appendChild(num);
      }

      const letter=document.createElement("span");
      letter.className="mini-letter";
      letter.textContent=miniValues[key]||"";
      cell.appendChild(letter);

      cell.onclick=()=>miniSelectCell(r,c,true);
      grid.appendChild(cell);
    });
  });

  drawMiniClues();
  drawMiniActiveClue();
  drawMiniKeyboard();
  updateMiniCompletionMessage();
  if(miniComplete){const cfg=miniEndgameConfig();if(cfg)queueGlobalEndgame(cfg,140);}
}

function drawMiniClues(){
  const current=miniCurrentEntry();

  function render(list,hostId,direction){
    const host=document.getElementById(hostId);
    host.innerHTML=list.map(entry=>{
      const active=current && Number(current.n)===Number(entry.n) && miniDirection===direction;
      return `<button type="button" class="mini-clue ${active?"active":""}" data-dir="${direction}" data-num="${entry.n}">
        <strong>${entry.n}.</strong> ${entry.clue}
      </button>`;
    }).join("");

    host.querySelectorAll(".mini-clue").forEach(btn=>{
      btn.onclick=()=>{
        const dir=btn.dataset.dir;
        const num=Number(btn.dataset.num);
        const entry=miniEntryList(dir).find(x=>Number(x.n)===num);
        if(!entry)return;
        miniDirection=dir;
        miniActiveCell=miniFirstEmptyCell(entry)||entry.cells[0];
        saveMiniState();
        drawMini();
      };
    });
  }

  render(miniPuzzle.across||[],"miniAcrossClues","across");
  render(miniPuzzle.down||[],"miniDownClues","down");
}

function drawMiniActiveClue(){
  const entry=miniCurrentEntry();
  const host=document.getElementById("miniActiveClue");
  if(!entry){host.textContent="";return;}
  const clueId=`${String(entry.n).replace(/[^0-9]/g,"")}${miniDirection==="down"?"D":"A"}`;
  host.innerHTML=`<span class="mini-active-clue-line"><strong>${clueId} -&nbsp;</strong><span>${entry.clue}</span></span>`;
}

function miniSelectCell(r,c,toggleIfSame=true){
  if(!miniPuzzle || (miniComplete&&miniRevealedPuzzle))return;

  const same=miniActiveCell&&miniActiveCell[0]===r&&miniActiveCell[1]===c;

  if(same&&toggleIfSame){
    // Clicking the already-yellow cell toggles direction if both entries exist.
    const other=miniDirection==="across"?"down":"across";
    if(miniEntryAt(r,c,other)){
      miniDirection=other;
      const entry=miniEntryAt(r,c,other);
      if(miniValues[miniKey(r,c)] && entry){
        const idx=entry.cells.findIndex(([rr,cc])=>rr===r&&cc===c);
        const nextEmpty=entry.cells.slice(idx+1).find(([rr,cc])=>!miniValues[miniKey(rr,cc)]) || miniFirstEmptyCell(entry);
        if(nextEmpty)miniActiveCell=nextEmpty;
      }
    }
  }else{
    // New cell: retain current direction where possible.
    if(!miniEntryAt(r,c,miniDirection)){
      miniDirection=miniEntryAt(r,c,"across")?"across":"down";
    }
    miniActiveCell=[r,c];
  }

  if(!same)miniActiveCell=[r,c];
  saveMiniState();
  drawMini();
}

function miniTypeLetter(letter){
  if(!miniPuzzle||!miniActiveCell||(miniComplete&&miniRevealedPuzzle))return;
  const [r,c]=miniActiveCell;
  miniValues[miniKey(r,c)]=letter.toUpperCase();
  miniAdvanceWithinEntry(1);
  saveMiniState();
  miniEvaluateIfFilled();
}

function miniBackspace(){
  if(!miniPuzzle||!miniActiveCell||(miniComplete&&miniRevealedPuzzle))return;
  const [r,c]=miniActiveCell;
  const key=miniKey(r,c);

  if(miniValues[key]){
    delete miniValues[key];
    saveMiniState();
    drawMini();
    return;
  }

  miniAdvanceWithinEntry(-1,{skipFilled:false});
  if(miniActiveCell){
    const [rr,cc]=miniActiveCell;
    delete miniValues[miniKey(rr,cc)];
  }
  saveMiniState();
  drawMini();
}

function miniMoveCell(dr,dc){
  if(!miniActiveCell)return;
  let [r,c]=miniActiveCell;
  while(true){
    r+=dr;c+=dc;
    if(r<0||r>=miniRows()||c<0||c>=miniCols())return;
    if(miniPuzzle.grid[r][c]!=="#"){
      miniActiveCell=[r,c];
      if(dr!==0)miniDirection="down";
      if(dc!==0)miniDirection="across";
      saveMiniState();
      drawMini();
      return;
    }
  }
}

function miniAdvanceWithinEntry(delta,{skipFilled=delta>0}={}){
  const entry=miniCurrentEntry();
  if(!entry||!miniActiveCell){drawMini();return;}
  const idx=entry.cells.findIndex(([r,c])=>r===miniActiveCell[0]&&c===miniActiveCell[1]);
  let next=null;
  for(let i=idx+delta;i>=0&&i<entry.cells.length;i+=delta){
    const candidate=entry.cells[i];
    if(!skipFilled || !miniValues[miniKey(candidate[0],candidate[1])]){
      next=candidate;
      break;
    }
  }
  if(next)miniActiveCell=next;
  drawMini();
}

function miniAllFilled(){
  for(let r=0;r<miniRows();r++){
    for(let c=0;c<miniCols();c++){
      if(miniPuzzle.grid[r][c]==="#")continue;
      if(!miniValues[miniKey(r,c)])return false;
    }
  }
  return true;
}
function miniAllCorrect(){
  for(let r=0;r<miniRows();r++){
    for(let c=0;c<miniCols();c++){
      if(miniPuzzle.grid[r][c]==="#")continue;
      if((miniValues[miniKey(r,c)]||"").toUpperCase()!==miniSolutionAt(r,c))return false;
    }
  }
  return true;
}
function miniEvaluateIfFilled(){
  if(!miniAllFilled()){drawMini();return;}
  miniComplete=miniAllCorrect();
  saveMiniState();
  drawMini();
}
function updateMiniCompletionMessage(){
  const host=document.getElementById("miniStatus");
  if(miniAllFilled()){
    if(miniAllCorrect()){
      miniComplete=true;
      registerDailyGameCompletion("mini",miniPuzzle);
      host.innerHTML="";
    }else{
      miniComplete=false;
      host.innerHTML='<div class="mini-message warn">The puzzle is filled, but the solution is not correct. Keep trying!</div>';
    }
  }else if(!miniRevealedPuzzle){
    host.innerHTML="";
  }
}

function miniRevealLetter(){
  if(!miniActiveCell)return;
  const [r,c]=miniActiveCell;
  miniLetterHintsUsed++;
  miniValues[miniKey(r,c)]=miniSolutionAt(r,c);
  saveMiniState();
  closeMiniRevealMenu();
  miniEvaluateIfFilled();
}
function miniRevealWord(){
  const entry=miniCurrentEntry();
  if(!entry)return;
  miniWordHintsUsed++;
  entry.cells.forEach(([r,c])=>miniValues[miniKey(r,c)]=miniSolutionAt(r,c));
  saveMiniState();
  closeMiniRevealMenu();
  miniEvaluateIfFilled();
}
function miniRevealPuzzle(){
  for(let r=0;r<miniRows();r++){
    for(let c=0;c<miniCols();c++){
      if(miniPuzzle.grid[r][c]!=="#"){
        miniValues[miniKey(r,c)]=miniSolutionAt(r,c);
      }
    }
  }
  miniRevealedPuzzle=true;
  miniComplete=true;
  registerDailyGameCompletion("mini",miniPuzzle);
  saveMiniState();
  closeMiniRevealMenu();
  drawMini();
  document.getElementById("miniStatus").innerHTML='<div class="mini-message warn">Puzzle revealed.</div>';
}
function toggleMiniRevealMenu(){
  const menu=document.getElementById("miniRevealMenu");
  menu.hidden=!menu.hidden;
}
function closeMiniRevealMenu(){
  document.getElementById("miniRevealMenu").hidden=true;
}

document.getElementById("miniRevealBtn").onclick=toggleMiniRevealMenu;
document.getElementById("miniRevealLetterBtn").onclick=miniRevealLetter;
document.getElementById("miniRevealWordBtn").onclick=miniRevealWord;
document.getElementById("miniRevealPuzzleBtn").onclick=miniRevealPuzzle;


function miniOrderedEntries(){
  // Traverse Across entries first, then Down entries, matching clue-list order.
  return [
    ...(miniPuzzle?.across||[]).map(entry=>({...entry,direction:"across"})),
    ...(miniPuzzle?.down||[]).map(entry=>({...entry,direction:"down"}))
  ];
}

function miniFirstEmptyCell(entry){
  for(const [r,c] of entry.cells||[]){
    if(!miniValues[miniKey(r,c)]) return [r,c];
  }
  return null;
}

function miniMoveToNextIncompleteEntry(){
  if(!miniPuzzle || !miniActiveCell) return;

  const entries=miniOrderedEntries();
  if(!entries.length) return;

  const current=miniCurrentEntry();

  // Find the exact current entry in the ordered list using both direction and clue number.
  let currentIndex=entries.findIndex(entry=>
    current &&
    entry.direction===miniDirection &&
    Number(entry.n)===Number(current.n)
  );

  if(currentIndex<0) currentIndex=0;

  // Look ahead, wrapping once, for the next entry with at least one empty square.
  for(let step=1; step<=entries.length; step++){
    const idx=(currentIndex+step)%entries.length;
    const entry=entries[idx];
    const empty=miniFirstEmptyCell(entry);
    if(empty){
      miniDirection=entry.direction;
      miniActiveCell=empty;
      saveMiniState();
      drawMini();
      return;
    }
  }

  // No empty cell exists anywhere; the normal full-grid evaluation handles completion.
  miniEvaluateIfFilled();
}

// Keyboard input for Mini is global while Mini is the active game.
// This avoids focus/redraw bugs from using one <input> per crossword cell.
document.addEventListener("keydown",event=>{
  if(activeGame!=="mini"||!miniPuzzle)return;

  if(/^[a-zA-Z]$/.test(event.key)){
    event.preventDefault();
    miniTypeLetter(event.key.toUpperCase());
    return;
  }

  if(
    event.key==="Backspace" ||
    event.key==="Delete" ||
    event.code==="Delete" ||
    event.keyCode===8 ||
    event.keyCode===46
  ){
    event.preventDefault();
    miniBackspace();
    return;
  }

  if(event.key==="Enter"){
    event.preventDefault();
    miniMoveToNextIncompleteEntry();
    return;
  }

  const arrows={
    ArrowLeft:[0,-1],
    ArrowRight:[0,1],
    ArrowUp:[-1,0],
    ArrowDown:[1,0]
  };
  if(arrows[event.key]){
    event.preventDefault();
    miniMoveCell(...arrows[event.key]);
  }
});

document.getElementById("fiveEndgameClose")?.addEventListener("click",closeFiveEndgame);document.getElementById("fiveTryAnother")?.addEventListener("click",()=>openEndgameTryAnother("five"));document.getElementById("fiveEndgameHome")?.addEventListener("click",endgameBackToHome);document.querySelectorAll("#fiveEndgameOverlay [data-share]").forEach(b=>b.addEventListener("click",()=>shareFiveResult(b.dataset.share)));document.getElementById("fiveEndgameOverlay")?.addEventListener("click",e=>{if(e.target===e.currentTarget)closeFiveEndgame()});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.getElementById("fiveEndgameOverlay")?.hidden)closeFiveEndgame()});
/* V103.31 shared end-game Next Options controls */
{const close=document.getElementById("globalEndgameClose"),overlay=document.getElementById("globalEndgameOverlay"),share=document.getElementById("globalEndgameShare"),copy=document.getElementById("globalEndgameCopy"),tryAnother=document.getElementById("globalEndgameTryAnother"),home=document.getElementById("globalEndgameHome");if(close)close.onclick=closeGlobalEndgame;if(overlay)overlay.addEventListener("click",e=>{if(e.target===overlay)closeGlobalEndgame()});if(share)share.onclick=()=>shareGlobalEndgame("native");if(copy)copy.onclick=()=>shareGlobalEndgame("copy");if(tryAnother)tryAnother.onclick=()=>{const game=globalEndgameCurrent?.game;if(game)openEndgameTryAnother(game)};if(home)home.onclick=endgameBackToHome}
document.addEventListener("keydown",event=>{if(event.key==="Escape"){const o=document.getElementById("globalEndgameOverlay");if(o&&!o.hidden)closeGlobalEndgame()}});




/* =========================================================
   V100.8 — SAFE PUBLIC-SITE STARTUP
   Run only after every game's let/const state has initialized.
   One game's load failure must not block or masquerade as another.
   ========================================================= */
async function initPublicSite(){
  document.body.classList.add("home-view");
  updateDateLabel();

  const loaders=[
    {name:"Six to Five",load:loadFiveForSelectedDate,meta:"fivePuzzleMeta",status:"fiveStatus"},
    {name:"Every Last Letter",load:loadEveryLastLetterForSelectedDate,meta:"ellPuzzleMeta",status:"ellStatus"},
    {name:"One and the Same",load:loadOneAndTheSameForSelectedDate,meta:"samePuzzleMeta",status:"sameStatus"},
    {name:"InCommon",load:loadQuadsForSelectedDate,meta:"quadsPuzzleMeta",status:"quadsStatus"},
    {name:"Unscrumble",load:loadWordTrailForSelectedDate,meta:"wordTrailPuzzleMeta",status:"wordTrailStatus"},
    {name:"Daily Crossword",load:loadMiniForSelectedDate,meta:"miniPuzzleMeta",status:"miniStatus"}
  ];

  const puzzlePromise=Promise.all(loaders.map(async game=>{
    try{
      await game.load();
      return true;
    }catch(err){
      console.error(`${game.name} startup load failed`,err);
      const meta=document.getElementById(game.meta);
      const status=document.getElementById(game.status);
      if(meta)meta.textContent="Load error";
      if(status)status.innerHTML=
        `<div class="result">Could not load the scheduled ${game.name} puzzle: ${err.message}</div>`;
      return false;
    }
  }));

  try{
    await loadDictionary();
  }catch(err){
    console.error("Six to Five dictionary initialization failed",err);
    const status=document.getElementById("fiveStatus");
    if(status && !status.textContent.trim()){
      status.innerHTML=
        `<div class="result">Six to Five loaded, but guess validation could not initialize: ${err.message}</div>`;
    }
  }

  await puzzlePromise;
  addUniversalTimerHosts();
  updateHomeDashboard();
  const requestedLaunchGame=activeGame;
  if(requestedLaunchGame!=="home"&&!canOpenGameUnderAllowance(requestedLaunchGame)){
    setActiveGame("home");
    history.replaceState(publicHistoryState("home"),"",publicViewUrl("home"));
    suppressRestoredEndgames=false;
    openPlayLimit(requestedLaunchGame);
  }else{
    setActiveGame(requestedLaunchGame);
    history.replaceState(publicHistoryState(requestedLaunchGame),"",publicViewUrl(requestedLaunchGame));
    suppressRestoredEndgames=false;
  }
  wireCompletedPuzzleSwipe();
  if(puzzleNookTimerTick)clearInterval(puzzleNookTimerTick);
  puzzleNookTimerTick=setInterval(updatePuzzleTimerDisplays,250);
}

initPublicSite();
