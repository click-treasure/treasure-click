// V88-32 HARD island complete
const SUPABASE_URL="https://osawhwcddovhddrxgfju.supabase.co";
const SUPABASE_KEY="sb_publishable_AMGEh3TguYyEpd7piWIjTQ_oHlYdG8f";
const POINTS_PER_YEN=10;
const $=id=>document.getElementById(id);

let accessToken=localStorage.getItem("v261_access_token")||"";
let refreshToken=localStorage.getItem("v261_refresh_token")||"";
let user=JSON.parse(localStorage.getItem("v261_user")||"null");
let island=null,cells=[],serverEnergy=0,bonusTaps=0,nextSeconds=0;
let loading=false,digBusy=false,pollTimer=null,countTimer=null;
let knownOpened=new Set(),ownDigCell=null;

const params=new URLSearchParams(location.search);
const wantedGeneration=Number(params.get("generation")||0);
const difficulty=(params.get("difficulty")||"easy").toLowerCase();
const THEMES={
  easy:{label:"EASY島",subtitle:"南の楽園の小さな島",hit:"🎯 当たりやすさ ★★★",reward:"💎 当たり報酬 ★☆☆",chest:"./assets/easy-chest-closed-v88.webp",open:"./assets/easy-chest-open-v88.webp",rewards:"🪙 10P　🪙 100P　🌟 1,000P"},
  normal:{label:"NORMAL島",subtitle:"海に浮かぶ古代遺跡の島",hit:"🎯 当たりやすさ ★★☆",reward:"💎 当たり報酬 ★★☆",chest:"./assets/normal-chest-closed-v88.webp",open:"./assets/normal-chest-open-v88.webp",rewards:"🪙 10P　🪙 100P　🌟 1,000P"},
  hard:{label:"HARD島",subtitle:"灼熱の溶岩に囲まれた魔城",hit:"🎯 当たりやすさ ★☆☆",reward:"💎 当たり報酬 ★★★",chest:"./assets/hard-chest-closed-v88.webp",open:"./assets/hard-chest-open-v88.webp",rewards:"🪙 10P　🪙 100P　🌟 1,000P　🔥 5,000P"}
};
const theme=THEMES[difficulty]||THEMES.easy;

function points(n){return Number(n||0)*POINTS_PER_YEN}
function pointText(n){return points(n).toLocaleString("ja-JP")+"P"}

async function req(path,options={},auth=true){
  const headers=Object.assign({"apikey":SUPABASE_KEY,"Content-Type":"application/json"},options.headers||{});
  if(auth&&accessToken)headers.Authorization="Bearer "+accessToken;
  const r=await fetch(SUPABASE_URL+path,Object.assign({},options,{headers}));
  const txt=await r.text();let data=null;
  try{data=txt?JSON.parse(txt):null}catch{data=txt}
  if(!r.ok)throw new Error((data&&data.message)||(data&&data.msg)||(data&&data.error_description)||txt||("HTTP "+r.status));
  return data;
}

function showError(e){
  console.error(e);
  const t=$("errorToast");t.textContent="エラー: "+(e?.message||e);t.hidden=false;
  setTimeout(()=>t.hidden=true,4000);
}
function setMessage(s){$("message").textContent=s}

async function ensureAuth(){
  if(accessToken){
    try{user=await req("/auth/v1/user");return}
    catch(_){accessToken="";user=null}
  }
  const d=await req("/auth/v1/signup",{method:"POST",body:JSON.stringify({data:{source:"treasure-island-v88"}})},false);
  accessToken=d.access_token;refreshToken=d.refresh_token;user=d.user;
  localStorage.setItem("v261_access_token",accessToken);
  localStorage.setItem("v261_refresh_token",refreshToken||"");
  localStorage.setItem("v261_user",JSON.stringify(user));
}

async function loadStatus(){
  const [sd,ld]=await Promise.all([
    req("/rest/v1/rpc/get_player_status",{method:"POST",body:"{}"}),
    req("/rest/v1/rpc/get_login_bonus_status",{method:"POST",body:"{}"}).catch(()=>null)
  ]);
  const s=Array.isArray(sd)?sd[0]:sd;
  const l=Array.isArray(ld)?ld[0]:ld;
  if(s){
    serverEnergy=Number(s.energy||0);
    nextSeconds=Number(s.next_energy_seconds||0);
    $("wallet").textContent=pointText(s.balance);
  }
  bonusTaps=Number(l?.bonus_taps||0);
  paintEnergy();
}
function paintEnergy(){
  const txt=serverEnergy+" / 20";
  $("energy").textContent=txt;$("energyBottom").textContent=txt;
  if(serverEnergy>=20)$("energyTimer").textContent=bonusTaps>0?`FULL ・ ボーナス +${bonusTaps}`:"FULL";
  else{
    const mm=String(Math.floor(Math.max(0,nextSeconds)/60)).padStart(2,"0");
    const ss=String(Math.max(0,nextSeconds%60)).padStart(2,"0");
    $("energyTimer").textContent=`次の回復 ${mm}:${ss}${bonusTaps>0?` ・ +${bonusTaps}`:""}`;
  }
}
function startCountdown(){
  clearInterval(countTimer);
  countTimer=setInterval(async()=>{
    if(serverEnergy<20&&nextSeconds>0){nextSeconds--;paintEnergy();paintEnergyEmptyModal()}
    if(serverEnergy<20&&nextSeconds<=0){try{await loadStatus()}catch(e){console.error(e)}}
  },1000);
}

async function resolveIsland(){
  const d=await req("/rest/v1/rpc/get_latest_islands",{method:"POST",body:"{}"});
  const found=(d||[]).find(x=>x.difficulty===difficulty);
  if(!found)throw new Error(theme.label+"が見つかりません");
  island=found;
  $("generation").textContent="#"+found.generation;
  document.body.dataset.difficulty=difficulty;
  $("difficultyTitle").textContent=theme.label;
  $("islandSubtitle").textContent=theme.subtitle;
  $("hitRateChip").textContent=theme.hit;
  $("rewardChip").textContent=theme.reward;
  $("rewardList").textContent=theme.rewards;
  document.title=theme.label+"｜CLICK TREASURE";
  if(wantedGeneration&&wantedGeneration!==Number(found.generation)){
    history.replaceState(null,"",`island.html?difficulty=${difficulty}&generation=${found.generation}`);
  }
}

async function loadCells(silent=false){
  if(!island||loading)return;
  loading=true;
  try{
    const d=await req("/rest/v1/treasure_cells?island_id=eq."+encodeURIComponent(island.island_id)+"&select=id,cell_index,opened,opened_at&order=cell_index.asc");
    const next=d||[];
    const openedNow=new Set(next.filter(c=>c.opened).map(c=>Number(c.cell_index)));
    if(silent){
      const other=[...openedNow].filter(i=>!knownOpened.has(i)&&i!==ownDigCell);
      if(other.length)setMessage(`👥 ほかのプレイヤーが ${other.length}箱開けた！`);
    }
    cells=next;knownOpened=openedNow;ownDigCell=null;
    renderBoard();
    if(!silent)setMessage("宝箱をタップして発掘！");
  }finally{loading=false}
}

function renderBoard(){
  const board=$("chestBoard");board.classList.remove("loading");board.innerHTML="";
  const byIndex=new Map(cells.map(c=>[Number(c.cell_index),c]));
  let opened=0;
  for(let pos=1;pos<=100;pos++){
    const c=byIndex.get(pos);
    const dug=!!c?.opened;
    if(dug)opened++;
    const b=document.createElement("button");
    b.type="button";
    b.className="demo-chest"+(dug?" demo-dug":"");
    b.dataset.cell=String(pos);
    b.setAttribute("aria-label",dug?`発掘済み ${pos}`:`宝箱 ${pos}`);
    if(!dug){
      b.innerHTML=`<img src="${theme.chest}" alt="未開封の宝箱" draggable="false">`;
      b.disabled=digBusy||(serverEnergy<=0&&bonusTaps<=0);
      b.onclick=()=>dig(pos,b);
    }else{
      b.disabled=true;
    }
    board.appendChild(b);
  }
  $("remaining").textContent=String(Math.max(0,100-opened));
}

function playOpenTransition(button){
  const img=button.querySelector("img");if(!img)return;
  button.classList.add("opening-now");
  img.src=theme.open;
}
function removeOpenedChest(button){
  button.classList.add("vanish");
  setTimeout(()=>{button.innerHTML="";button.className="demo-chest demo-dug";button.disabled=true},430);
}
function showReward(prize){
  const t=$("rewardToast");$("rewardAmount").textContent=pointText(prize);
  t.hidden=false;t.classList.remove("show");void t.offsetWidth;t.classList.add("show");
  setTimeout(()=>{t.classList.remove("show");t.hidden=true},1500);
}
function showTicket(){
  const t=$("ticketToast");t.hidden=false;t.classList.remove("show");void t.offsetWidth;t.classList.add("show");
  setTimeout(()=>{t.classList.remove("show");t.hidden=true},1900);
}


// V88-26 — restored legacy prize sounds/effects
let legacyAudioCtx=null;
function legacyCtx(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!legacyAudioCtx)legacyAudioCtx=new AC();return legacyAudioCtx}
function unlockGameAudio(){const c=legacyCtx();if(c&&c.state==="suspended")c.resume().catch(()=>{})}
function legacyTone(freq,duration,type="sine",gain=.09,delay=0){const c=legacyCtx();if(!c)return;if(c.state==="suspended")c.resume().catch(()=>{});const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.03)}
function soundDig(){const c=legacyCtx();if(!c)return;const n=Math.floor(c.sampleRate*.11),buf=c.createBuffer(1,n,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();f.type="lowpass";f.frequency.value=900;g.gain.value=.16;s.buffer=buf;s.connect(f);f.connect(g);g.connect(c.destination);s.start();legacyTone(135,.10,"triangle",.08,.01)}
function soundMiss(){legacyTone(170,.12,"triangle",.07);legacyTone(120,.16,"triangle",.05,.08)}
function playAudio(id,fallback){const a=$(id);if(!a)return fallback?.();try{a.pause();a.currentTime=0;a.volume=1;const q=a.play();if(q&&q.catch)q.catch(()=>fallback?.())}catch(_){fallback?.()}}
function v44Play500Sound(name,volume=1){try{const a=new Audio(`sounds/${name}?v=88-26`);a.volume=volume;const q=a.play();if(q&&q.catch)q.catch(()=>{})}catch(_){}}
function originalCelebrate10(){const fx=$("fx");if(!fx)return;for(let i=0;i<35;i++){const s=document.createElement("span");s.className="old-confetti";s.textContent=["✨","🎉","⭐"][i%3];s.style.left=Math.random()*100+"vw";s.style.animationDelay=Math.random()*.5+"s";s.style.fontSize=(16+Math.random()*25)+"px";fx.appendChild(s);setTimeout(()=>s.remove(),2500)}}
function originalJackpot10(prize){const o=$("jackpotOverlay");if(!o)return;$("jackpotAmount").textContent=points(prize).toLocaleString("ja-JP");$("jackpotLabel").textContent=prize>=100?"💎 超大当たり！！ 💎":"🔥 大当たり！！ 🔥";$("jackpotBang").textContent=prize>=100?"！！！ JACKPOT ！！！":"！！！";o.classList.remove("show");void o.offsetWidth;o.classList.add("show");o.setAttribute("aria-hidden","false");if(prize>=100)playAudio("audio100old");else playAudio("audio10old");originalCelebrate10();setTimeout(()=>{o.classList.remove("show");o.setAttribute("aria-hidden","true")},2150)}
function v41Jackpot500(){const root=$("v41Jackpot"),coins=$("v41Coins");if(!root)return;root.hidden=false;root.classList.remove("v42-cut","v42-dot","reveal","finish");void root.offsetWidth;setTimeout(()=>{v44Play500Sound("win_500_puchun.wav",.95);root.classList.add("v42-cut")},120);setTimeout(()=>root.classList.add("v42-dot"),1820);setTimeout(()=>{v44Play500Sound("win_500_jackpot.wav",1);root.classList.add("reveal");if(coins){coins.innerHTML="";for(let i=0;i<42;i++){const s=document.createElement("i");s.textContent=i%6===0?"◆":"●";s.style.setProperty("--x",(Math.random()*190-95)+"vw");s.style.setProperty("--d",(Math.random()*.65)+"s");s.style.setProperty("--r",(Math.random()*900-450)+"deg");coins.appendChild(s)}}},2420);setTimeout(()=>root.classList.add("finish"),5200);setTimeout(()=>{root.hidden=true;root.classList.remove("v42-cut","v42-dot","reveal","finish")},5750)}
function v43GemOmen(button,after){const r=button?.getBoundingClientRect(),gem=document.createElement("div");gem.className="v43-gem-omen";gem.innerHTML='<span class="v43-gem">◆</span><i></i><b>！？</b>';if(r){gem.style.left=(r.left+r.width/2)+"px";gem.style.top=(r.top+r.height*.42)+"px"}else{gem.style.left="50vw";gem.style.top="50vh"}document.body.appendChild(gem);v44Play500Sound("win_500_gem.wav",.9);setTimeout(()=>gem.classList.add("charge"),180);setTimeout(()=>{gem.remove();after?.()},850)}
function legacyPrizeEffect(button,prize){
  soundDig();
  if(prize<=0){setTimeout(soundMiss,260);return}
  if(prize>=500){v43GemOmen(button,()=>v41Jackpot500());return}
  if(prize>=10){setTimeout(()=>originalJackpot10(prize),260);return}
  setTimeout(()=>{playAudio("audio1old");showReward(prize)},260);
}
document.addEventListener("pointerdown",unlockGameAudio,{once:true});
document.addEventListener("keydown",unlockGameAudio,{once:true});


// V88-45 — energy empty recovery popup. Ad hook is reserved for the next step.
let energyEmptyShownForThisZero=false;
function energyRecoveryInfo(){
  const e=Math.max(0,Math.min(20,Number(serverEnergy||0)));
  const first=Math.max(0,Number(nextSeconds||0));
  const missing=Math.max(0,20-e);
  const fullSeconds=missing<=0?0:first+Math.max(0,missing-1)*15*60;
  const fullAt=new Date(Date.now()+fullSeconds*1000);
  const hh=String(fullAt.getHours()).padStart(2,"0"), mm=String(fullAt.getMinutes()).padStart(2,"0");
  return {first,fullAtText:`${hh}:${mm}ごろ`};
}
function paintEnergyEmptyModal(){
  const modal=$("energyEmptyModal");if(!modal||modal.hidden)return;
  const info=energyRecoveryInfo(),m=Math.floor(info.first/60),s=info.first%60;
  $("energyEmptyNext").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  $("energyEmptyFull").textContent=info.fullAtText;
}
function showEnergyEmptyModal(){
  const modal=$("energyEmptyModal");if(!modal||energyEmptyShownForThisZero)return;
  energyEmptyShownForThisZero=true;modal.hidden=false;modal.setAttribute("aria-hidden","false");paintEnergyEmptyModal();
}
function closeEnergyEmptyModal(){const modal=$("energyEmptyModal");if(!modal)return;modal.hidden=true;modal.setAttribute("aria-hidden","true")}
document.addEventListener("click",e=>{if(e.target?.id==="energyEmptyClose"||e.target?.classList?.contains("energy-empty-backdrop"))closeEnergyEmptyModal()});

async function dig(cellIndex,button){
  if(digBusy||!island)return;
  if(serverEnergy<=0&&bonusTaps<=0){setMessage("⚡ タップ回数切れ。回復を待とう");return}
  digBusy=true;ownDigCell=cellIndex;
  unlockGameAudio();
  document.querySelectorAll(".demo-chest:not(.demo-dug)").forEach(b=>b.disabled=true);
  setMessage("⛏️ サーバーで判定中…");
  try{
    const d=await req("/rest/v1/rpc/dig_treasure",{method:"POST",body:JSON.stringify({p_island_id:island.island_id,p_cell_index:cellIndex})});
    const x=Array.isArray(d)?d[0]:d;if(!x)return;
    const energyBeforeDig=serverEnergy;
    serverEnergy=Number(x.new_energy??serverEnergy);
    const energyJustEmptied=energyBeforeDig>0&&serverEnergy<=0;
    paintEnergy();
    if(serverEnergy>0)energyEmptyShownForThisZero=false;

    if(x.result==="no_energy"){
      setMessage("⚡ エネルギー切れ");await loadStatus();return;
    }
    if(x.result==="already_opened"){
      setMessage("誰かに先を越された！エネルギー消費なし");
      await loadCells(true);return;
    }
    if(x.result==="island_finished"&&!x.success){
      setMessage("🏁 この島は探索終了！");
      await Promise.all([resolveIsland(),loadStatus()]);await loadCells();return;
    }

    playOpenTransition(button);
    const prize=Number(x.prize||0);
    legacyPrizeEffect(button,prize);
    const gotTicket=x.result==="golden_ticket"||x.result==="island_finished_ticket";

    if(x.new_balance!=null)$("wallet").textContent=pointText(x.new_balance);
    if(gotTicket){setMessage("🎫 黄金島の採掘権を発見！");showTicket()}
    else if(prize>0){setMessage(`🎉 ${pointText(prize)} GET！`)}
    else setMessage("💨 ハズレ！次の宝箱へ");

    setTimeout(()=>removeOpenedChest(button),520);
    await new Promise(r=>setTimeout(r,700));
    await Promise.all([loadStatus(),loadCells(true)]);
    if(energyJustEmptied)showEnergyEmptyModal();

    if(x.result==="island_finished"||x.result==="island_finished_ticket"){
      setMessage(gotTicket?"🏁 黄金チケット発見！この島の探索は終了！":"🏁 最後の宝発見！この島の探索は終了！");
      setTimeout(()=>location.href="index.html#islandSelect",1800);
    }
  }catch(e){showError(e);setMessage("通信エラー。もう一度試してね")}
  finally{
    digBusy=false;
    renderBoard();
  }
}

async function boot(){
  try{
    await ensureAuth();
    await Promise.all([resolveIsland(),loadStatus()]);
    await loadCells();
    startCountdown();
    clearInterval(pollTimer);
    pollTimer=setInterval(()=>loadCells(true).catch(console.error),1000);
  }catch(e){showError(e);setMessage("島を読み込めませんでした")}
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)Promise.all([loadStatus(),loadCells(true)]).catch(console.error)});
boot();
