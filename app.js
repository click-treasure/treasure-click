

// V44: dedicated 500-yen sound files.
function v44Play500Sound(name,volume=1){
  try{
    const a=new Audio(`sounds/${name}?v=45soundfix`);
    a.volume=volume;
    const q=a.play(); if(q&&q.catch)q.catch(()=>{});
  }catch(_){}
}

// V41: 500-yen special "puchun -> blackout -> jackpot" sequence.
function v41Jackpot500(){
 const root=document.getElementById("v41Jackpot"),coins=document.getElementById("v41Coins");
 if(!root)return;
 root.hidden=false;
 root.classList.remove("v42-cut","v42-dot","reveal","finish");
 void root.offsetWidth;

 // Short bright pre-flash. Then an abrupt "puchun" and a one-frame cut to black.
 setTimeout(()=>{
   v44Play500Sound("win_500_puchun.wav",.95);
   try{
     const c=v36ctx();
     if(c){
       const t=c.currentTime,o=c.createOscillator(),g=c.createGain();
       o.type="square";
       o.frequency.setValueAtTime(1050,t);
       o.frequency.exponentialRampToValueAtTime(72,t+.075);
       g.gain.setValueAtTime(.16,t);
       g.gain.exponentialRampToValueAtTime(.001,t+.085);
       o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.09);
     }
   }catch(_){}
   root.classList.add("v42-cut");
 },120);

 // Stay completely black and visually silent, then reveal a tiny gold point.
 setTimeout(()=>root.classList.add("v42-dot"),1820);

 // Jackpot explosion.
 setTimeout(()=>{
   v44Play500Sound("win_500_jackpot.wav",1);
   root.classList.add("reveal");
   if(coins){
     coins.innerHTML="";
     for(let i=0;i<42;i++){
       const s=document.createElement("i");
       s.textContent=i%6===0?"◆":"●";
       s.style.setProperty("--x",(Math.random()*190-95)+"vw");
       s.style.setProperty("--d",(Math.random()*.65)+"s");
       s.style.setProperty("--r",(Math.random()*900-450)+"deg");
       coins.appendChild(s);
     }
   }
 },2420);

 setTimeout(()=>root.classList.add("finish"),5200);
 setTimeout(()=>{
   root.hidden=true;
   root.classList.remove("v42-cut","v42-dot","reveal","finish");
 },5750);
}

const URL="https://osawhwcddovhddrxgfju.supabase.co", KEY="sb_publishable_AMGEh3TguYyEpd7piWIjTQ_oHlYdG8f";
const $=id=>document.getElementById(id);
const META={
 easy:{name:"EASY",emoji:"🟢",desc:"宝30個・当たりやすい"},
 normal:{name:"NORMAL",emoji:"🟡",desc:"宝26個・バランス型"},
 hard:{name:"HARD",emoji:"🔴",desc:"宝7個・最大500円"}
};
let accessToken=localStorage.getItem("v261_access_token")||"";
let refreshToken=localStorage.getItem("v261_refresh_token")||"";
let user=JSON.parse(localStorage.getItem("v261_user")||"null");
let latest={},cells=[],serverEnergy=0,nextSeconds=0,currentIsland=null,currentMeta=null,mapTimer=null,countTimer=null;
let debugNumbers=false,lastOpened=new Set(),syncBusy=false;
let myOwnOpenedCells=new Set();
let suppressLiveNoticeUntil=0;

function fail(e){$("error").hidden=false;$("error").textContent="エラー: "+(e?.message||e);}
async function req(path,options={},auth=true){
 const headers=Object.assign({"apikey":KEY,"Content-Type":"application/json"},options.headers||{});
 if(auth&&accessToken)headers.Authorization="Bearer "+accessToken;
 const r=await fetch(URL+path,Object.assign({},options,{headers}));
 const txt=await r.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}
 if(!r.ok)throw new Error((data&&data.message)||(data&&data.msg)||(data&&data.error_description)||txt||("HTTP "+r.status));
 return data;
}
async function auth(){
 try{
  if(accessToken){try{user=await req("/auth/v1/user");}catch{accessToken="";user=null}}
  if(!accessToken){
   $("session").textContent="匿名ログイン中…";
   const d=await req("/auth/v1/signup",{method:"POST",body:JSON.stringify({data:{source:"treasure-v30"}})},false);
   accessToken=d.access_token;refreshToken=d.refresh_token;user=d.user;
   localStorage.setItem("v261_access_token",accessToken);localStorage.setItem("v261_refresh_token",refreshToken);localStorage.setItem("v261_user",JSON.stringify(user));
  }
  $("player").textContent="ゲスト "+user.id.slice(0,8);$("session").textContent="認証済み";
  await Promise.all([status(),loadWinHistory(),loadLatest()]);
 }catch(e){fail(e);$("session").textContent="認証エラー";}
}
async function status(){
 const d=await req("/rest/v1/rpc/get_player_status",{method:"POST",body:"{}"});
 const x=Array.isArray(d)?d[0]:d;if(!x)return;
 $("wallet").textContent=x.balance+"円";serverEnergy=x.energy;nextSeconds=x.next_energy_seconds||0;paintEnergy();
}
function paintEnergy(){
 $("energy").textContent=serverEnergy+" / 20";
 $("energyTimer").textContent=serverEnergy>=20?"FULL":`次の回復 ${String(Math.floor(nextSeconds/60)).padStart(2,"0")}:${String(Math.max(0,nextSeconds%60)).padStart(2,"0")}`;
 if(cells.length)render();
}
function startCountdown(){
 if(countTimer)clearInterval(countTimer);
 countTimer=setInterval(async()=>{
  if(serverEnergy<20&&nextSeconds>0){nextSeconds--;paintEnergy();}
  if(serverEnergy<20&&nextSeconds<=0){try{await status()}catch(e){fail(e)}}
 },1000);
}
async function loadLatest(){
 const d=await req("/rest/v1/rpc/get_latest_islands",{method:"POST",body:"{}"});
 latest={};(d||[]).forEach(x=>latest[x.difficulty]=x);renderCards();
}
function renderCards(){
 const box=$("islandCards");box.innerHTML="";
 ["easy","normal","hard"].forEach(diff=>{
  const x=latest[diff],m=META[diff];if(!x)return;
  const b=document.createElement("button");b.className="island-card "+diff;
  if(x.island_status==="finished"){b.disabled=true;b.classList.add("finished")}
  b.innerHTML=`<span>${m.emoji} ${m.name} #${x.generation}</span><b>${x.total_cells}マス</b><small>${m.desc}</small><em class="status-badge">${x.island_status==="finished"?"🏁 探索終了":"残り "+x.remaining_cells+"マス"}</em>`;
  b.onclick=()=>openIsland(x);box.appendChild(b);
 });
}
async function loadWinHistory(){
 const d=await req("/rest/v1/treasure_wins?user_id=eq."+encodeURIComponent(user.id)+"&select=prize,cell_index,island_id,won_at&order=won_at.desc&limit=10");
 $("wins").textContent=(d?.length||0)+"回";
 $("history").innerHTML=d?.length?d.map(x=>`<div class="row"><span>${x.island_id}・マス ${x.cell_index}</span><strong>+${x.prize}円</strong></div>`).join(""):"まだ獲得履歴はありません";
}
async function openIsland(x){
 if(x.island_status!=="active")return;
 currentIsland=x.island_id;currentMeta=x;cells=[];lastOpened=new Set();
 $("islandSelect").hidden=true;$("game").hidden=false;
 $("islandName").textContent=`${META[x.difficulty].emoji} ${META[x.difficulty].name} #${x.generation}`;
 $("islandState").textContent="🟢 探索中";$("islandState").classList.remove("finished");
 $("message").textContent="宝箱を準備中…";
 await Promise.all([load(),status()]);
 if(mapTimer)clearInterval(mapTimer);mapTimer=setInterval(()=>load(true),1000);
}
async function load(silent=false){
 if(!currentIsland||syncBusy)return;
 syncBusy=true;
 try{
  const d=await req("/rest/v1/treasure_cells?island_id=eq."+encodeURIComponent(currentIsland)+"&select=id,cell_index,opened,opened_at&order=cell_index.asc");
  const next=d||[];
  const allNewlyOpened=next.filter(c=>c.opened&&!lastOpened.has(c.cell_index)).map(c=>c.cell_index);
   const newlyOpened=(Date.now()<suppressLiveNoticeUntil)?[]:allNewlyOpened.filter(idx=>!myOwnOpenedCells.has(idx));
   for(const idx of allNewlyOpened)myOwnOpenedCells.delete(idx);
  cells=next;
  lastOpened=new Set(cells.filter(c=>c.opened).map(c=>c.cell_index));
  render();
  if(!silent)$("message").textContent="🟢 LIVE：ほかのプレイヤーの開封も自動反映";
  else if(newlyOpened.length&&currentIsland){
    $("message").textContent=`👥 ほかのプレイヤーが ${newlyOpened.length} 箱開けた！`;
  }
 }catch(e){fail(e)}
 finally{syncBusy=false}
}
function render(){
 if(!currentMeta)return;$("map").innerHTML="";
 for(const c of cells){
  const b=document.createElement("button");b.className="cell chest"+(c.opened?" opened":"");b.disabled=c.opened||serverEnergy<=0;b.title="宝箱 "+c.cell_index;
   b.innerHTML=`<img src="assets/${c.opened?"chest_empty.png":"chest_closed.png"}" alt="${c.opened?"開封済み":"未開封"}">${debugNumbers?`<small class="chest-no">${c.cell_index}</small>`:""}`;
   b.onclick=()=>dig(c.cell_index,b);$("map").appendChild(b);
 }
 const total=currentMeta.total_cells,o=cells.filter(c=>c.opened).length;
 $("remaining").textContent=`残り ${Math.max(0,total-o)}箱`;$("progress").textContent=Math.round((o/total)*100)+"%";
}


// V36.1 sound effects (Web Audio API; no external audio files)
let v36AudioCtx=null;
function v36ctx(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return null;
  if(!v36AudioCtx)v36AudioCtx=new AC();
  return v36AudioCtx;
}
function unlockGameAudio(){
  const c=v36ctx(); if(!c)return;
  if(c.state==="suspended")c.resume().catch(()=>{});
}
function v36tone(freq,duration,type="sine",gain=.09,delay=0){
  const c=v36ctx(); if(!c)return;
  if(c.state==="suspended")c.resume().catch(()=>{});
  const o=c.createOscillator(), g=c.createGain();
  o.type=type;o.frequency.value=freq;
  const t=c.currentTime+delay;
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(gain,t+.012);
  g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.03);
}
function soundDig(){
  const c=v36ctx(); if(!c)return;
  if(c.state==="suspended")c.resume().catch(()=>{});
  // short earthy "zaku" noise
  const n=Math.floor(c.sampleRate*.11),buf=c.createBuffer(1,n,c.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
  f.type="lowpass";f.frequency.value=900;g.gain.value=.16;
  s.buffer=buf;s.connect(f);f.connect(g);g.connect(c.destination);s.start();
  v36tone(135,.10,"triangle",.08,.01);
}
function soundMiss(){
  v36tone(170,.12,"triangle",.07,0);
  v36tone(120,.16,"triangle",.05,.08);
}
function soundHit(){
  v36tone(660,.13,"sine",.09,0);
  v36tone(880,.16,"sine",.10,.10);
  v36tone(1320,.22,"sine",.08,.20);
}


function burstConfetti(count=30){
 const layer=document.createElement("div");layer.className="win-confetti-layer";
 for(let n=0;n<count;n++){const s=document.createElement("i");s.style.left=(Math.random()*100)+"vw";s.style.setProperty("--dx",((Math.random()-.5)*320)+"px");layer.appendChild(s)}
 document.body.appendChild(layer);setTimeout(()=>layer.remove(),1700);
}
function prizeOverlay(prize){
 const d=document.createElement("div");
 d.className="prize-overlay "+(prize>=100?"prize-tier-mega":prize>=10?"prize-tier-big":"prize-tier-small");
 d.innerHTML=prize>=100?`<div class="prize-kicker">JACKPOT!</div><div class="prize-main">${prize}円！！！</div>`:
             prize>=10?`<div class="prize-kicker">当たり！</div><div class="prize-main">${prize}円！！！</div>`:
             `<div class="prize-main">${prize}円 GET!</div>`;
 document.body.appendChild(d);setTimeout(()=>d.remove(),prize>=10?1450:800);
}
function soundBigHit(){v36tone(392,.11,"triangle",.12,0);v36tone(659,.15,"sine",.13,.07);v36tone(988,.22,"sine",.12,.16);v36tone(1319,.30,"sine",.09,.25)}
function soundMegaHit(){v36tone(330,.14,"square",.09,0);v36tone(523,.18,"triangle",.12,.06);v36tone(784,.24,"sine",.14,.14);v36tone(1047,.32,"sine",.13,.23);v36tone(1568,.42,"sine",.10,.34)}

function playOriginal10Sound(){
 const a=document.getElementById("audio10old");
 if(!a)return;
 try{a.pause();a.currentTime=0;a.volume=1;const q=a.play();if(q&&q.catch)q.catch(()=>soundBigHit())}catch(e){soundBigHit()}
}
function playOriginal100Sound(){
 const a=document.getElementById("audio100old");
 if(!a)return;
 try{a.pause();a.currentTime=0;a.volume=1;const q=a.play();if(q&&q.catch)q.catch(()=>soundMegaHit())}catch(e){soundMegaHit()}
}
function originalCelebrate10(){
 const fx=document.getElementById("fx");if(!fx)return;
 for(let i=0;i<35;i++){
  const s=document.createElement("span");s.className="old-confetti";s.textContent=["✨","🎉","⭐"][i%3];
  s.style.left=Math.random()*100+"vw";s.style.animationDelay=Math.random()*.5+"s";s.style.fontSize=(16+Math.random()*25)+"px";
  fx.appendChild(s);setTimeout(()=>s.remove(),2500);
 }
 document.body.classList.add("win10");setTimeout(()=>document.body.classList.remove("win10"),1900);
}
function originalJackpot10(prize){
 const o=document.getElementById("jackpotOverlay");if(!o)return;
 document.getElementById("jackpotAmount").textContent=prize;
 document.getElementById("jackpotLabel").textContent=prize>=100?"💎 超大当たり！！ 💎":"🔥 大当たり！！ 🔥";
 document.getElementById("jackpotBang").textContent=prize>=100?"！！！ JACKPOT ！！！":"！！！";
 o.classList.remove("show");void o.offsetWidth;o.classList.add("show");o.setAttribute("aria-hidden","false");
 if(prize>=100)playOriginal100Sound();else playOriginal10Sound();
 originalCelebrate10();
 setTimeout(()=>{o.classList.remove("show");o.setAttribute("aria-hidden","true")},2150);
}

// V43: 500-yen gemstone omen before the puchun blackout.
function v43GemOmen(button,after){
  const r=button?.getBoundingClientRect();
  const gem=document.createElement("div");
  gem.className="v43-gem-omen";
  gem.innerHTML='<span class="v43-gem">◆</span><i></i><b>！？</b>';
  if(r){gem.style.left=(r.left+r.width/2)+"px";gem.style.top=(r.top+r.height*.42)+"px";}
  else{gem.style.left="50vw";gem.style.top="50vh";}
  document.body.appendChild(gem);
  v44Play500Sound("win_500_gem.wav",.9);
  setTimeout(()=>gem.classList.add("charge"),180);
  setTimeout(()=>{gem.remove();if(after)after();},850);
}


// V56.2 — unmistakable wallet gain feedback. Visual only; no server writes.
function animateWalletGain(prize){
  const w=$("wallet");
  const card=w?.closest(".balance-card");
  if(!w||!card)return;

  w.classList.remove("wallet-pop","wallet-pop-big");
  card.classList.remove("wallet-gain-card","wallet-gain-card-big");
  void w.offsetWidth;
  w.classList.add(prize>=100?"wallet-pop-big":"wallet-pop");
  card.classList.add(prize>=100?"wallet-gain-card-big":"wallet-gain-card");

  card.querySelectorAll(".wallet-gain-float").forEach(el=>el.remove());
  const gain=document.createElement("span");
  gain.className="wallet-gain-float"+(prize>=100?" big":"");
  gain.textContent=`+${prize}円`;
  card.appendChild(gain);

  setTimeout(()=>{
    w.classList.remove("wallet-pop","wallet-pop-big");
    card.classList.remove("wallet-gain-card","wallet-gain-card-big");
  },1250);
  setTimeout(()=>gain.remove(),1450);
}

function playDigEffect(button,prize){
 if(!button)return;
 button.classList.remove("digging","dig-hit","dig-miss");void button.offsetWidth;button.classList.add("digging");
 setTimeout(()=>{
  button.classList.remove("digging");
  if(prize>0){
   button.classList.add("dig-hit");
   const chestImg=button.querySelector("img");
   if(chestImg){
     chestImg.classList.add("opening");
     const rewardSrc=prize>=500?"chest_500.png":prize>=100?"chest_100.png":prize>=10?"chest_10.png":prize>=1?"chest_1.png":"chest_empty.png";
     setTimeout(()=>{chestImg.src="assets/"+rewardSrc;chestImg.classList.remove("opening");chestImg.classList.add("revealed");},220);
   }
   if(prize>=500){v43GemOmen(button,()=>v41Jackpot500());}
   else if(prize<10)prizeOverlay(prize);
   if(prize>=10&&prize<500){
     const currentOverlay=document.querySelector(".prize-overlay");if(currentOverlay)currentOverlay.remove();
     originalJackpot10(prize);
   } else if(prize<500) soundHit();
  }else{
   button.classList.add("dig-miss");soundMiss();
   const f=document.createElement("span");f.className="dig-float miss";f.textContent="💨 ハズレ";button.appendChild(f);setTimeout(()=>f.remove(),900);
  }
 },260);
}

async function dig(i,b){
 suppressLiveNoticeUntil=Date.now()+4000;
 soundDig();
 if(serverEnergy<=0){$("message").textContent="⚡ エネルギー切れ。回復を待とう";return}
 b.disabled=true;$("message").textContent="⛏️ サーバーで判定中…";
 try{
  const d=await req("/rest/v1/rpc/dig_treasure",{method:"POST",body:JSON.stringify({p_island_id:currentIsland,p_cell_index:i})});
  const x=Array.isArray(d)?d[0]:d;if(!x)return;
  serverEnergy=x.new_energy;paintEnergy();
  if(x.result==="no_energy"){$("message").textContent="⚡ エネルギー切れ";await status();return}
  if(x.result==="already_opened"){$("message").textContent="誰かに先を越された！エネルギー消費なし";await load(true);return}
  if(x.result==="island_finished"&&!x.success){$("message").textContent="🏁 この島は探索終了！";$("islandState").textContent="🏁 探索終了";$("islandState").classList.add("finished");await loadLatest();return}
  myOwnOpenedCells.add(i);
  $("wallet").textContent=x.new_balance+"円";
  if(Number(x.prize||0)>0) animateWalletGain(Number(x.prize||0));
  b.classList.add("mine");playDigEffect(b,Number(x.prize||0));
  if(x.prize>0){$("message").textContent=`🎉 ${x.prize}円GET！`;$("amount").textContent=x.prize+"円";setTimeout(()=>{$("overlay").hidden=false},520)}else $("message").textContent="💨 ハズレ！次のマスへ";
  if(x.result==="island_finished"){$("islandState").textContent="🏁 探索終了";$("islandState").classList.add("finished");$("message").textContent="🏁 最後の宝発見！この島の探索は終了！"}
  await Promise.all([load(true),loadWinHistory(),status(),loadLatest()]);
 }catch(e){fail(e);b.disabled=false}
}
$("debugNumbers").onclick=()=>{debugNumbers=!debugNumbers;$("debugNumbers").textContent=debugNumbers?"🔢 番号表示 ON":"🔢 番号表示 OFF";$("map").classList.toggle("show-numbers",debugNumbers);render();};
$("back").onclick=async()=>{currentIsland=null;currentMeta=null;cells=[];lastOpened=new Set();myOwnOpenedCells=new Set();if(mapTimer){clearInterval(mapTimer);mapTimer=null};$("game").hidden=true;$("islandSelect").hidden=false;$("message").textContent="宝箱を選んでスタート！";await loadLatest()};
$("refresh").onclick=async()=>{try{await Promise.all([status(),loadWinHistory(),loadLatest(),currentIsland?load(true):Promise.resolve()])}catch(e){fail(e)}};
$("close").onclick=()=>{$("overlay").hidden=true;$("message").textContent="サーバー残高に保存済み！次の宝箱を選ぼう"};


// ===== V34 Safe guest -> existing/new Google migration =====
const MIGRATION_TOKEN_KEY = "treasure_migration_token_v34";
const OAUTH_REDIRECT = "https://ishikawahiroto0206-debug.github.io/treasure-click/";

function parseOAuthSession(){
  const raw = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  if(!raw) return false;

  const p = new URLSearchParams(raw);
  const at = p.get("access_token");
  const rt = p.get("refresh_token");
  const err = p.get("error_description") || p.get("error");

  window.history.replaceState(null, "", location.pathname + location.search);

  if(err){
    setTimeout(()=>fail(new Error(decodeURIComponent(err))), 0);
    return false;
  }
  if(!at) return false;

  localStorage.setItem("v261_access_token", at);
  if(rt) localStorage.setItem("v261_refresh_token", rt);
  return true;
}

function hasGoogleIdentity(u){
  if(!u) return false;
  if(Array.isArray(u.identities) && u.identities.some(x => x.provider === "google")) return true;
  const providers = u.app_metadata && u.app_metadata.providers;
  return Array.isArray(providers) && providers.includes("google");
}

function updateAccountUI(){
  const state = document.getElementById("accountState");
  const btn = document.getElementById("googleLoginBtn");
  if(!state || !btn) return;

  if(hasGoogleIdentity(user)){
    state.textContent = user.email ? `Googleログイン中：${user.email}` : "Googleログイン中";
    btn.textContent = "ログアウト";
    btn.disabled = false;
  }else{
    state.textContent = user ? `ゲストでプレイ中：${user.id.slice(0,8)}` : "ゲストでプレイ中";
    btn.textContent = "G Googleで引き継ぐ";
    btn.disabled = false;
  }
}

async function rpc(name, body={}){
  return await req(`/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
}

async function logoutToNewGuest(){
  const btn = document.getElementById("googleLoginBtn");
  try{
    if(btn){
      btn.disabled = true;
      btn.textContent = "ログアウト中…";
    }

    // Revoke the current Supabase session on the server when possible.
    if(accessToken){
      try{
        await fetch(`${URL}/auth/v1/logout`, {
          method: "POST",
          headers: {
            "apikey": KEY,
            "Authorization": `Bearer ${accessToken}`
          }
        });
      }catch(_){}
    }

    // Clear only this app's auth/migration state.
    localStorage.removeItem("v261_access_token");
    localStorage.removeItem("v261_refresh_token");
    localStorage.removeItem("v261_user");
    localStorage.removeItem(MIGRATION_TOKEN_KEY);

    accessToken = "";
    user = null;

    // Reload: the existing auth() flow will create a fresh anonymous account.
    location.replace(location.pathname + "?guest=" + Date.now());
  }catch(e){
    if(btn){
      btn.disabled = false;
      btn.textContent = "ログアウト";
    }
    fail(e);
  }
}

async function beginGoogleMigration(){
  const btn = document.getElementById("googleLoginBtn");
  try{
    if(!accessToken || !user) throw new Error("認証準備中です。ページを再読み込みしてください。");
    if(hasGoogleIdentity(user)) return;

    if(btn){
      btn.disabled = true;
      btn.textContent = "引き継ぎ準備中…";
    }

    // Server proves this ticket belongs to the currently authenticated anonymous user.
    const token = await rpc("create_account_migration_ticket");
    if(!token || typeof token !== "string"){
      throw new Error("引き継ぎチケットを作成できませんでした。");
    }
    localStorage.setItem(MIGRATION_TOKEN_KEY, token);

    // Existing Google accounts must be allowed to sign in, so use normal OAuth sign-in here.
    const q = new URLSearchParams({
      provider: "google",
      redirect_to: OAUTH_REDIRECT,
      skip_http_redirect: "true"
    });

    // OAuth is a browser navigation, not a CORS fetch.
    // Navigating to Supabase lets Supabase redirect the browser to Google normally.
    location.href = `${URL}/auth/v1/authorize?${q.toString()}`;
    return;
  }catch(e){
    if(btn){
      btn.disabled = false;
      btn.textContent = "G Googleで引き継ぐ";
    }
    fail(e);
  }
}

async function finishPendingMigration(){
  const token = localStorage.getItem(MIGRATION_TOKEN_KEY);
  if(!token || !hasGoogleIdentity(user)) return false;

  try{
    const result = await rpc("migrate_guest_account", {p_token: token});
    localStorage.removeItem(MIGRATION_TOKEN_KEY);

    const row = Array.isArray(result) ? result[0] : result;
    const amount = row?.migrated_balance ?? 0;
    alert(`Googleアカウントへの引き継ぎ完了！\n移行残高：${amount}円`);

    // Refresh wallet/status using the new Google identity.
    await status();
    await loadWinHistory();
    return true;
  }catch(e){
    // Keep the token so a temporary failure can be retried within its 10-minute lifetime.
    fail(e);
    return false;
  }
}

document.addEventListener("pointerdown", unlockGameAudio, {once:true});
document.addEventListener("keydown", unlockGameAudio, {once:true});
document.addEventListener("DOMContentLoaded", ()=>{
  parseOAuthSession();
  const b = document.getElementById("googleLoginBtn");
  if(b) b.addEventListener("click", async ()=>{
    if(hasGoogleIdentity(user)){
      await logoutToNewGuest();
    }else{
      await beginGoogleMigration();
    }
  });
});

const originalAuth = auth;
auth = async function(){
  await originalAuth();
  updateAccountUI();
  await finishPendingMigration();
  updateAccountUI();
};

// V34 start
auth().then(startCountdown);

// V37 home-only presentation helpers. Existing server/game logic remains unchanged.
(function(){
  function refreshRewardHome(){
    const wallet=document.getElementById('wallet'), fill=document.getElementById('redeemFill'), text=document.getElementById('redeemText');
    if(!wallet||!fill||!text)return;
    const n=Math.max(0,parseInt((wallet.textContent||'0').replace(/[^0-9-]/g,''),10)||0);
    const pct=Math.min(100,n);
    fill.style.width=pct+'%';
    text.textContent=n>=100?'100円達成！交換できます':`あと${100-n}円で交換できます`;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const wallet=document.getElementById('wallet');
    if(wallet)new MutationObserver(refreshRewardHome).observe(wallet,{childList:true,subtree:true,characterData:true});
    refreshRewardHome();
  });
})();

// Developer-only visual prize tester. No Supabase writes.
(function(){
  const toggle=document.getElementById("devToggle");
  const box=document.getElementById("devButtons");
  if(!toggle||!box)return;
  toggle.addEventListener("click",()=>{box.hidden=!box.hidden;});
  box.querySelectorAll("[data-test-prize]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const prize=Number(btn.dataset.testPrize);
      try{
        if(prize===500){
          v43GemOmen(null,()=>v41Jackpot500());
        }else if(prize>=10){
          const currentOverlay=document.querySelector(".prize-overlay");
          if(currentOverlay)currentOverlay.remove();
          originalJackpot10(prize);
        }else{
          prizeOverlay(prize);
          soundHit();
        }
      }catch(e){
        console.error("Prize test failed:",e);
        alert("演出テストでエラーが出ました。Consoleを確認してください。");
      }
    });
  });
})();

// V46 — server-backed 100 yen redemption requests.
(function(){
  const btn=document.getElementById('redeemBtn');
  const modal=document.getElementById('redeemModal');
  const close=document.getElementById('redeemModalClose');
  const submit=document.getElementById('redeemSubmit');
  const destination=document.getElementById('redeemDestination');
  if(!btn||!modal||!close||!submit||!destination)return;

  function walletAmount(){
    const w=document.getElementById('wallet');
    return Math.max(0,parseInt((w?.textContent||'0').replace(/[^0-9-]/g,''),10)||0);
  }
  function syncRedeemButton(){
    const ok=walletAmount()>=100;
    btn.disabled=!ok;
    const menu=document.getElementById('redeemMenuState');
    if(menu)menu.textContent=ok?'交換できます':'100円〜';
  }
  const wallet=document.getElementById('wallet');
  if(wallet)new MutationObserver(syncRedeemButton).observe(wallet,{childList:true,subtree:true,characterData:true});
  syncRedeemButton();

  btn.addEventListener('click',()=>{
    if(walletAmount()<100)return;
    modal.hidden=false;
    setTimeout(()=>destination.focus(),50);
  });
  close.addEventListener('click',()=>modal.hidden=true);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});

  submit.addEventListener('click',async()=>{
    const dest=destination.value.trim();
    if(!dest){destination.focus();return}
    if(dest.length>120)return;
    submit.disabled=true;submit.textContent='申請中…';
    try{
      // V47: match the RPC installed from the SQL shown in chat.
      // That function accepts p_payout_destination and returns the created request row.
      const d=await req('/rest/v1/rpc/request_redemption',{method:'POST',body:JSON.stringify({p_payout_destination:dest})});
      const row=Array.isArray(d)?d[0]:d;
      if(!row || !row.id)throw new Error('交換申請の保存を確認できませんでした');
      modal.hidden=true;destination.value='';
      await Promise.all([status(),loadWinHistory()]);
      if(window.loadRedemptionHistory)await window.loadRedemptionHistory();
      alert('100円の交換申請を受け付けました！\n申請ID：'+row.id+'\n現在：処理待ち');
    }catch(e){fail(e)}
    finally{submit.disabled=false;submit.textContent='100円を交換申請する'}
  });
})();


// V54 — robust permanent redemption history card.
(function(){
  const box=document.getElementById('redeemHistory');
  const refresh=document.getElementById('redeemHistoryRefresh');
  if(!box)return;
  let loading=false;

  function maskDestination(value){
    const v=String(value||'');
    if(!v)return '—';
    if(v.length<=3)return v[0]+'**';
    return v.slice(0,4)+'****';
  }
  function fmtDate(value){
    if(!value)return '—';
    try{return new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch(_){return String(value)}
  }
  function renderRows(rows){
    if(!rows||!rows.length){box.innerHTML='<div class="redeem-history-empty">まだ交換履歴はありません</div>';return}
    box.innerHTML=rows.map(r=>{
      const paid=r.status==='completed'||r.status==='paid';
      return `<div class="redeem-history-row ${paid?'is-paid':'is-pending'}">
        <div><b>${Number(r.amount||0)}円</b><span>${paid?'✓ 支払済み':'● 処理待ち'}</span></div>
        <small>申請 #${r.id} ・ ${fmtDate(r.created_at)}</small>
        <small>受取先：${maskDestination(r.payout_destination)}</small>
        ${paid?`<small class="paid-at">支払完了：${fmtDate(r.completed_at)}</small>`:''}
      </div>`;
    }).join('');
  }
  async function loadRedemptionHistory(){
    if(loading)return;
    if(!user?.id||!accessToken){box.innerHTML='<div class="redeem-history-empty">ログイン情報を確認中…</div>';return}
    loading=true;
    if(refresh)refresh.disabled=true;
    box.innerHTML='<small>履歴を読み込み中…</small>';
    try{
      const path='/rest/v1/redemption_requests?select=id,amount,payout_method,payout_destination,status,created_at,completed_at&order=created_at.desc&limit=20';
      const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('交換履歴の取得がタイムアウトしました')),8000));
      const rows=await Promise.race([req(path),timeout]);
      renderRows(rows);
    }catch(e){
      console.error('redemption history:',e);
      box.innerHTML=`<div class="redeem-history-error">交換履歴を取得できませんでした<br><small>${String(e?.message||e)}</small><br><button type="button" id="redeemHistoryRetry">もう一度読み込む</button></div>`;
      document.getElementById('redeemHistoryRetry')?.addEventListener('click',loadRedemptionHistory,{once:true});
    }finally{
      loading=false;
      if(refresh)refresh.disabled=false;
    }
  }
  window.loadRedemptionHistory=loadRedemptionHistory;
  if(refresh)refresh.addEventListener('click',loadRedemptionHistory);

  // Wait for auth to finish instead of firing against a half-restored session.
  let tries=0;
  const waitForAuth=setInterval(()=>{
    tries++;
    if(user?.id&&accessToken){clearInterval(waitForAuth);setTimeout(loadRedemptionHistory,250)}
    else if(tries>=100){clearInterval(waitForAuth);box.innerHTML='<div class="redeem-history-error">ログイン情報を取得できませんでした</div>'}
  },100);
})();

// V55 — reliable admin shortcut. Hidden unless is_app_admin() explicitly confirms this account.
(function(){
  function adminResultIsTrue(result){
    if(result===true || result==='true') return true;
    if(Array.isArray(result)){
      if(result.length===0) return false;
      const v=result[0];
      if(v===true || v==='true') return true;
      if(v && typeof v==='object') return Object.values(v).some(x=>x===true || x==='true');
    }
    if(result && typeof result==='object') return Object.values(result).some(x=>x===true || x==='true');
    return false;
  }
  async function refreshAdminShortcut(){
    const a=document.getElementById('adminShortcut');
    if(!a || !user?.id || !accessToken) return;
    a.hidden=true;
    try{
      const result=await req('/rest/v1/rpc/is_app_admin',{method:'POST',body:'{}'});
      if(adminResultIsTrue(result)) a.hidden=false;
    }catch(e){
      console.error('admin shortcut check:',e);
      a.hidden=true;
    }
  }
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(user?.id && accessToken){clearInterval(timer);setTimeout(refreshAdminShortcut,300)}
    else if(tries>=100) clearInterval(timer);
  },100);
  window.refreshAdminShortcut=refreshAdminShortcut;
})();
// V55 — compact home history / redemption panels. Presentation only.
(function(){
  const winMenu=document.getElementById('winHistoryMenu');
  const redeemMenu=document.getElementById('redeemMenu');
  const winPanel=document.getElementById('winHistoryPanel');
  const redeemPanel=document.getElementById('redeemPanel');
  const compactRedeem=document.getElementById('compactRedeemBtn');
  const mainRedeem=document.getElementById('redeemBtn');
  if(!winMenu||!redeemMenu||!winPanel||!redeemPanel)return;

  function setOpen(which){
    const openWin=which==='win' ? winPanel.hidden : false;
    const openRedeem=which==='redeem' ? redeemPanel.hidden : false;
    winPanel.hidden=!openWin;
    redeemPanel.hidden=!openRedeem;
    winMenu.classList.toggle('is-open',openWin);
    redeemMenu.classList.toggle('is-open',openRedeem);
    if(openRedeem&&window.loadRedemptionHistory)window.loadRedemptionHistory();
  }
  winMenu.addEventListener('click',()=>setOpen('win'));
  redeemMenu.addEventListener('click',()=>setOpen('redeem'));
  if(compactRedeem&&mainRedeem){
    const sync=()=>{compactRedeem.disabled=mainRedeem.disabled;compactRedeem.textContent=mainRedeem.disabled?'100円から交換できます':'100円を交換申請する';};
    new MutationObserver(sync).observe(mainRedeem,{attributes:true,attributeFilter:['disabled']});
    sync();
    compactRedeem.addEventListener('click',()=>{if(!mainRedeem.disabled)mainRedeem.click();});
  }
})();
