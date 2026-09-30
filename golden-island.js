// V88-40 Golden Island standalone runtime
const URL='https://osawhwcddovhddrxgfju.supabase.co', KEY='sb_publishable_AMGEh3TguYyEpd7piWIjTQ_oHlYdG8f';
let accessToken="", currentUser=null, goldenTickets=0, opening=false;
const $=id=>document.getElementById(id);

async function req(path,options={}){
  const headers=Object.assign({"apikey":KEY,"Content-Type":"application/json"},options.headers||{});
  if(accessToken) headers.Authorization="Bearer "+accessToken;
  const r=await fetch(URL+path,{...options,headers});
  const t=await r.text();
  if(!r.ok) throw new Error(t||("HTTP "+r.status));
  return t?JSON.parse(t):null;
}

function savedSession(){
  for(const k of Object.keys(localStorage)){
    if(!k.startsWith("sb-")||!k.endsWith("-auth-token")) continue;
    try{
      const x=JSON.parse(localStorage.getItem(k)||"null");
      const s=x?.currentSession||x?.session||x;
      if(s?.access_token&&s?.user?.id) return s;
    }catch(_e){}
  }
  return null;
}

async function restoreAuth(){
  const s=savedSession();
  if(!s) throw new Error("no saved session");
  accessToken=s.access_token;
  currentUser=s.user;
  const r=await fetch(URL+"/auth/v1/user",{headers:{apikey:KEY,Authorization:"Bearer "+accessToken}});
  if(!r.ok) throw new Error("session verify failed");
  currentUser=await r.json();
}

async function loadTickets(){
  const d=await req("/rest/v1/golden_ticket_wallets?user_id=eq."+encodeURIComponent(currentUser.id)+"&select=tickets,total_found,total_used");
  goldenTickets=Number(d?.[0]?.tickets||0);
  $("goldenTicketsInGame").textContent=goldenTickets;
}

function renderMap(){
  const map=$("goldenMap"); map.innerHTML="";
  for(let i=0;i<50;i++){
    const b=document.createElement("button");
    b.type="button"; b.className="golden-chest"+(goldenTickets<=0?" ticket-locked":"");
    b.disabled=goldenTickets<=0||opening;
    b.innerHTML='<img src="./assets/golden-chest-closed-v88.webp" alt="">';
    b.onclick=()=>dig(b);
    map.appendChild(b);
  }
}

function message(){
  $("goldenMessage").textContent=goldenTickets>0
    ?"✨ 50個から黄金の宝箱を1つ選ぼう"
    :"🎫 黄金島チケットがありません";
}

async function dig(button){
  if(opening||goldenTickets<=0)return;
  opening=true;
  document.querySelectorAll(".golden-chest").forEach(b=>b.disabled=true);
  $("goldenMessage").textContent="✨ 黄金の宝箱を開封中…";
  try{
    const d=await req("/rest/v1/rpc/dig_golden_island",{method:"POST",body:"{}"}); 
    const x=Array.isArray(d)?d[0]:d;
    if(!x) throw new Error("empty result");
    const pp=Number(x.prize_points||0);
    button.classList.add("opened-gold");
    button.innerHTML=`<img src="./assets/golden-chest-open-v88.webp" alt=""><strong>${pp.toLocaleString("ja-JP")}P</strong>`;
    $("goldenMessage").textContent=`🎉 ${pp.toLocaleString("ja-JP")}P GET！`;
    await loadTickets();
    await new Promise(r=>setTimeout(r,1400));
  }catch(e){
    console.error(e);
    $("goldenMessage").textContent="⚠ 開封できませんでした";
  }finally{
    opening=false; renderMap(); message();
  }
}

async function boot(){
  try{
    $("goldenMessage").textContent="ログイン情報を確認中…";
    await restoreAuth();
    await loadTickets();
    renderMap(); message();
  }catch(e){
    console.error("golden boot",e);
    $("goldenTicketsInGame").textContent="—";
    goldenTickets=0; renderMap();
    document.querySelectorAll(".golden-chest").forEach(b=>b.disabled=true);
    $("goldenMessage").textContent="⚠ ログイン情報を取得できません。島一覧へ戻って再ログインしてください";
  }
}
document.addEventListener("DOMContentLoaded",boot);
