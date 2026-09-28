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
let myRecentDigs=new Map();

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
 $("message").textContent="島に接続中…";
 await Promise.all([load(),status()]);
 if(mapTimer)clearInterval(mapTimer);mapTimer=setInterval(()=>load(true),1000);
}
async function load(silent=false){
 if(!currentIsland||syncBusy)return;
 syncBusy=true;
 try{
  const d=await req("/rest/v1/treasure_cells?island_id=eq."+encodeURIComponent(currentIsland)+"&select=id,cell_index,opened,opened_at&order=cell_index.asc");
  const next=d||[];
  const now=Date.now();
   for(const [idx,ts] of myRecentDigs){if(now-ts>5000)myRecentDigs.delete(idx)}
   const newlyOpened=next.filter(c=>c.opened&&!lastOpened.has(c.cell_index)&&!myRecentDigs.has(c.cell_index)).map(c=>c.cell_index);
  cells=next;
  lastOpened=new Set(cells.filter(c=>c.opened).map(c=>c.cell_index));
  render();
  if(!silent)$("message").textContent="🟢 LIVE同期中：他のプレイヤーの掘削も自動反映";
  else if(newlyOpened.length&&currentIsland){
    $("message").textContent=`👥 他のプレイヤーが ${newlyOpened.length} マス掘った！`;
  }
 }catch(e){fail(e)}
 finally{syncBusy=false}
}
function render(){
 if(!currentMeta)return;$("map").innerHTML="";
 for(const c of cells){
  const b=document.createElement("button");b.className="cell"+(c.opened?" opened":"");b.disabled=c.opened||serverEnergy<=0;b.title="マス "+c.cell_index;if(debugNumbers)b.textContent=c.cell_index;b.onclick=()=>dig(c.cell_index,b);$("map").appendChild(b);
 }
 const total=currentMeta.total_cells,o=cells.filter(c=>c.opened).length;
 $("remaining").textContent=`未探索 ${Math.max(0,total-o)} / ${total}`;$("progress").textContent=Math.round((o/total)*100)+"%";
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

function playDigEffect(button, prize){
 if(!button)return;
 button.classList.remove("digging","dig-hit","dig-miss");
 void button.offsetWidth;
 button.classList.add("digging");
 setTimeout(()=>{
  button.classList.remove("digging");
  button.classList.add(prize>0?"dig-hit":"dig-miss");
  if(prize>0)soundHit();else soundMiss();
  const fx=document.createElement("span");
  fx.className="dig-fx "+(prize>0?"hit":"miss");
  fx.textContent=prize>0?`✨ ${prize}円GET!`:"💨 ハズレ";
  const r=button.getBoundingClientRect();
  fx.style.left=(r.left+r.width/2)+"px";
  fx.style.top=(r.top+r.height/2)+"px";
  document.body.appendChild(fx);
  setTimeout(()=>fx.remove(),1100);
 },180);
}

async function dig(i,b){
 myRecentDigs.set(i,Date.now());
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
  $("wallet").textContent=x.new_balance+"円";b.classList.add("mine");playDigEffect(b,Number(x.prize||0));
  if(x.prize>0){$("message").textContent=`🎉 ${x.prize}円GET！`;$("amount").textContent=x.prize+"円";setTimeout(()=>{$("overlay").hidden=false},520)}else $("message").textContent="💨 ハズレ！次のマスへ";
  if(x.result==="island_finished"){$("islandState").textContent="🏁 探索終了";$("islandState").classList.add("finished");$("message").textContent="🏁 最後の宝発見！この島の探索は終了！"}
  await Promise.all([load(true),loadWinHistory(),status(),loadLatest()]);
 }catch(e){fail(e);b.disabled=false}
}
$("debugNumbers").onclick=()=>{debugNumbers=!debugNumbers;$("debugNumbers").textContent=debugNumbers?"🔢 番号表示 ON":"🔢 番号表示 OFF";$("map").classList.toggle("show-numbers",debugNumbers);render();};
$("back").onclick=async()=>{currentIsland=null;currentMeta=null;cells=[];lastOpened=new Set();if(mapTimer){clearInterval(mapTimer);mapTimer=null};$("game").hidden=true;$("islandSelect").hidden=false;$("message").textContent="島を選んで探索開始！";await loadLatest()};
$("refresh").onclick=async()=>{try{await Promise.all([status(),loadWinHistory(),loadLatest(),currentIsland?load(true):Promise.resolve()])}catch(e){fail(e)}};
$("close").onclick=()=>{$("overlay").hidden=true;$("message").textContent="サーバー残高に保存済み！次を探そう"};


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
