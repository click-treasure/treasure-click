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
    if(serverEnergy<20&&nextSeconds>0){nextSeconds--;paintEnergy()}
    if(serverEnergy<20&&nextSeconds<=0){try{await loadStatus()}catch(e){console.error(e)}}
  },1000);
}

async function resolveIsland(){
  const d=await req("/rest/v1/rpc/get_latest_islands",{method:"POST",body:"{}"});
  const easy=(d||[]).find(x=>x.difficulty==="easy");
  if(!easy)throw new Error("EASY島が見つかりません");
  island=easy;
  $("generation").textContent="#"+easy.generation;
  if(wantedGeneration&&wantedGeneration!==Number(easy.generation)){
    history.replaceState(null,"",`island.html?difficulty=easy&generation=${easy.generation}`);
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
      b.innerHTML='<img src="./assets/easy-chest-closed-v88.webp" alt="未開封の宝箱" draggable="false">';
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
  img.src="./assets/easy-chest-open-v88.webp";
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

async function dig(cellIndex,button){
  if(digBusy||!island)return;
  if(serverEnergy<=0&&bonusTaps<=0){setMessage("⚡ タップ回数切れ。回復を待とう");return}
  digBusy=true;ownDigCell=cellIndex;
  document.querySelectorAll(".demo-chest:not(.demo-dug)").forEach(b=>b.disabled=true);
  setMessage("⛏️ サーバーで判定中…");
  try{
    const d=await req("/rest/v1/rpc/dig_treasure",{method:"POST",body:JSON.stringify({p_island_id:island.island_id,p_cell_index:cellIndex})});
    const x=Array.isArray(d)?d[0]:d;if(!x)return;
    serverEnergy=Number(x.new_energy??serverEnergy);paintEnergy();

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
    const gotTicket=x.result==="golden_ticket"||x.result==="island_finished_ticket";

    if(x.new_balance!=null)$("wallet").textContent=pointText(x.new_balance);
    if(gotTicket){setMessage("🎫 黄金島の採掘権を発見！");showTicket()}
    else if(prize>0){setMessage(`🎉 ${pointText(prize)} GET！`);showReward(prize)}
    else setMessage("💨 ハズレ！次の宝箱へ");

    setTimeout(()=>removeOpenedChest(button),520);
    await new Promise(r=>setTimeout(r,700));
    await Promise.all([loadStatus(),loadCells(true)]);

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
