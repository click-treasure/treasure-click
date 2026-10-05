const DUNGEON_URL="https://xjnaombhyeyeibuarmcf.supabase.co", DUNGEON_KEY="sb_publishable_QrdmDnaf8T4iIgHujdnTdw_hkeHDv6s";
const dungeonAccessToken = localStorage.getItem("v261_access_token") || "";

"use strict";

// =========================================================
// CLICK TREASURE - Dungeon Prototype
// =========================================================

const dungeonState = {
  floor: 1,
  room: 1,
  player: {
    id: "slime",
    name: "スライム",
    hp: 100,
    maxHp: 100,
    guardReduction: 0
  }
};

function renderDungeon() {
  document.getElementById("floorNumber").textContent =
    dungeonState.floor;

  document.getElementById("playerName").textContent =
    dungeonState.player.name;

  document.getElementById("playerHpText").textContent =
    `HP ${dungeonState.player.hp} / ${dungeonState.player.maxHp}`;

  const hpPercent =
    (dungeonState.player.hp / dungeonState.player.maxHp) * 100;

  document.getElementById("playerHpBar").style.width =
    `${hpPercent}%`;
}



renderDungeon();


// ===== Character Stats Apply =====

function applySelectedCharacterStats(){

  const player = dungeonState.player;

  if(!player){
    return;
  }

  const stats =
    CHARACTER_STATS[player.id];

  if(!stats){
    return;
  }

  player.maxHp = stats.hp;
  player.hp = stats.hp;
  player.guardReduction = 0;
}

// ===== Selected Character =====

const DUNGEON_CHARACTERS = {
  slime: {
    name: "スライム",
    image: "assets/characters/slime.png"
  },
  golem: {
    name: "ゴーレム",
    image: "assets/characters/golem.png"
  },
  fire_lizard: {
    name: "ファイアリザード",
    image: "assets/characters/fire-lizard.png"
  },
  forest_spirit: {
    name: "森の精霊",
    image: "assets/characters/forest-spirit.png"
  },
  mimic: {
    name: "ミミック",
    image: "assets/characters/mimic.png"
  }
};

async function loadSelectedCharacter(){

  // ===== 最大5体パーティ読み込み =====
  let partyIds = [];

  try{
    const savedParty =
      JSON.parse(localStorage.getItem("ct_dungeon_party") || "[]");

    if(Array.isArray(savedParty)){
      partyIds = savedParty.slice(0, 5);
    }
  }catch(error){
    console.error("Party load error:", error);
  }

  // 旧1体データとの互換
  if(partyIds.length === 0){
    const oldCharacter =
      localStorage.getItem("ct_dungeon_character");

    if(oldCharacter){
      partyIds = [oldCharacter];
    }
  }

  if(partyIds.length === 0){
    location.href = "dungeon-menu.html";
    return;
  }

  const baseHp = {
    slime:100,
    golem:180,
    fire_lizard:150,
    forest_spirit:150,
    mimic:100
  };

  const baseAttack = {
    slime:20,
    golem:20,
    fire_lizard:30,
    forest_spirit:30,
    mimic:40
  };

  const party = [];

  for(const partyEntry of partyIds){

    const parts = String(partyEntry).split("@");
    const characterId = parts[0];
    const devEvolutionStage =
      parts.length > 1 ? Number(parts[1]) : null;

    const character =
      DUNGEON_CHARACTERS[characterId];

    if(!character){
      continue;
    }

    const response = await fetch(
      `${DUNGEON_URL}/rest/v1/user_characters?select=level,evolution_stage&character_id=eq.${characterId.replaceAll("-","_")}`,
      {
        headers:{
          "apikey":DUNGEON_KEY,
          "Authorization":"Bearer " + dungeonAccessToken
        }
      }
    );

    if(!response.ok){
      throw new Error(await response.text());
    }

    const rows = await response.json();
    const ownedCharacter = rows[0];

    const level =
      ownedCharacter?.level ?? 1;

    let evolutionStage =
      ownedCharacter?.evolution_stage ?? 0;
    if(devEvolutionStage !== null && Number.isFinite(devEvolutionStage)){
      evolutionStage = Math.max(0, Math.min(3, devEvolutionStage));
    }

    const levelMultiplier =
      1 + ((level - 1) * 9 / 99);

    const evolutionMultiplier =
      Math.pow(1.5, evolutionStage);

    const multiplier =
      levelMultiplier * evolutionMultiplier;

    const maxHp =
      Math.round((baseHp[characterId] ?? 100) * multiplier);

    const attack =
      Math.round((baseAttack[characterId] ?? 20) * multiplier);

    party.push({
      id: characterId,
      name: character.name,
      image: ({
        slime: [
          "assets/characters/slime.png",
          "assets/characters/slime-evo1.png",
          "assets/characters/slime-evo2.png",
          "assets/characters/slime-evo3.png"
        ],
        golem: [
          "assets/characters/golem.png",
          "assets/characters/golem-evo1.png",
          "assets/characters/golem-evo2.png",
          "assets/characters/golem-evo3.png"
        ],
        fire_lizard: [
          "assets/characters/fire-lizard.png",
          "assets/characters/fire-lizard-evo1.png",
          "assets/characters/fire-lizard-evo2.png",
          "assets/characters/fire-lizard-evo3.png"
        ],
        forest_spirit: [
          "assets/characters/forest-spirit.png",
          "assets/characters/forest-spirit-evo1.png",
          "assets/characters/forest-spirit-evo2.png",
          "assets/characters/forest-spirit-evo3.png"
        ]
      })[characterId]?.[evolutionStage] || character.image,
      level,
      evolutionStage,
      dbEvolutionStage: Number(ownedCharacter?.evolution_stage ?? 0),
      maxHp,
      hp: maxHp,
      attack,
      guardReduction: 0
    });
  }

  if(party.length === 0){
    location.href = "dungeon-menu.html";
    return;
  }

  // 新しい5体パーティ
  dungeonState.party = party;

  // 既存1体戦闘との互換性を維持
  dungeonState.player = party[0];

  console.log(
    "[DUNGEON PARTY LOADED]",
    dungeonState.party
  );

  // ===== パーティ最大5体を表示 =====
  const playerBox =
    document.querySelector(".player-placeholder");

  if(playerBox){

    playerBox.innerHTML = "";
    playerBox.classList.add("dungeon-party-container", "normal-battle");

    party.forEach((member, index) => {

      const memberEl =
        document.createElement("div");

      memberEl.className =
        "dungeon-party-member";

      memberEl.dataset.partyIndex = index;

      memberEl.innerHTML = `
        <img
          src="${member.image}"
          alt="${member.name}"
          class="dungeon-character-image"
        >
        <div class="party-member-hp">
          <i style="width:100%"></i>
        </div>
      `;

      playerBox.appendChild(memberEl);
    });
  }

  renderDungeon();
}

loadSelectedCharacter();

// ===== Dungeon Floor Config =====
const DUNGEON_FLOORS = {
  1: {
    id: 1,
    name: "始まりの森",
    normalEnemy: "dungeon_slime",
    midboss: "dungeon_golem",
    boss: "dungeon_dragon",
    midbossDistance: 500,
    bossDistance: 1000
  },
  2: {
    id: 2,
    name: "灼熱の洞窟",
    normalEnemy: "fire_slime",
    midboss: "magma_golem",
    boss: "inferno_golem",
    midbossDistance: 500,
    bossDistance: 1000
  },
  3: {
    id: 3,
    name: "氷結の遺跡",
    normalEnemy: "frost_wolf",
    midboss: "ice_golem",
    boss: "frost_wyvern",
    midbossDistance: 500,
    bossDistance: 1000
  },
  4: {
    id: 4,
    name: "深淵の城",
    normalEnemy: "shadow_knight",
    midboss: "abyss_guardian",
    boss: "abyss_lord",
    midbossDistance: 500,
    bossDistance: 1000
  },
  5: {
    id: 5,
    name: "天空神殿",
    normalEnemy: "sky_harpy",
    midboss: "celestial_golem",
    boss: "sky_titan",
    midbossDistance: 500,
    bossDistance: 1000
  }
};

const selectedDungeonFloor =
  Number(localStorage.getItem("ct_dungeon_floor") || 1);

const currentFloor =
  DUNGEON_FLOORS[selectedDungeonFloor] || DUNGEON_FLOORS[1];

dungeonState.floor = currentFloor.id;

// ===== Enemy System =====

const DUNGEON_ENEMIES = {
  dungeon_slime: { name: "ダンジョンスライム", maxHp: 50, attack: 10, type: "normal", image: "assets/enemies/dungeon-slime.png" },
  dungeon_golem: { name: "ダンジョンゴーレム", maxHp: 250, attack: 25, type: "midboss", image: "assets/enemies/dungeon-golem.png" },
  dungeon_dragon: { name: "ダンジョンドラゴン", maxHp: 600, attack: 40, type: "boss", image: "assets/enemies/dungeon-dragon.png" },

  fire_slime: { name: "ファイアスライム", maxHp: 100, attack: 15, type: "normal", image: "assets/enemies/dungeon-slime.png" },
  magma_golem: { name: "マグマゴーレム", maxHp: 450, attack: 35, type: "midboss", image: "assets/enemies/dungeon-golem.png" },
  inferno_golem: { name: "インフェルノゴーレム", maxHp: 1000, attack: 55, type: "boss", image: "assets/enemies/dungeon-dragon.png" },

  frost_wolf: { name: "フロストウルフ", maxHp: 180, attack: 20, type: "normal", image: "assets/enemies/dungeon-slime.png" },
  ice_golem: { name: "アイスゴーレム", maxHp: 700, attack: 45, type: "midboss", image: "assets/enemies/dungeon-golem.png" },
  frost_wyvern: { name: "フロストワイバーン", maxHp: 1500, attack: 70, type: "boss", image: "assets/enemies/dungeon-dragon.png" },

  shadow_knight: { name: "シャドウナイト", maxHp: 280, attack: 25, type: "normal", image: "assets/enemies/dungeon-slime.png" },
  abyss_guardian: { name: "アビスガーディアン", maxHp: 1050, attack: 60, type: "midboss", image: "assets/enemies/dungeon-golem.png" },
  abyss_lord: { name: "アビスロード", maxHp: 2200, attack: 90, type: "boss", image: "assets/enemies/dungeon-dragon.png" },

  sky_harpy: { name: "スカイハーピー", maxHp: 400, attack: 35, type: "normal", image: "assets/enemies/dungeon-slime.png" },
  celestial_golem: { name: "セレスティアルゴーレム", maxHp: 1500, attack: 80, type: "midboss", image: "assets/enemies/dungeon-golem.png" },
  sky_titan: { name: "スカイタイタン", maxHp: 3000, attack: 120, type: "boss", image: "assets/enemies/dungeon-dragon.png" }
};

// ===== Dungeon Enemy EXP =====
const DUNGEON_ENEMY_EXP = {
  dungeon_slime: 10, dungeon_golem: 50, dungeon_dragon: 100,
  fire_slime: 18, magma_golem: 80, inferno_golem: 160,
  frost_wolf: 28, ice_golem: 120, frost_wyvern: 240,
  shadow_knight: 40, abyss_guardian: 170, abyss_lord: 340,
  sky_harpy: 55, celestial_golem: 230, sky_titan: 500
};

// ===== Dungeon Enemy Coin =====
const HERO_ENEMY_COIN = {
  dungeon_slime: 10, dungeon_golem: 30, dungeon_dragon: 100,
  fire_slime: 15, magma_golem: 45, inferno_golem: 130,
  frost_wolf: 20, ice_golem: 60, frost_wyvern: 160,
  shadow_knight: 25, abyss_guardian: 80, abyss_lord: 200,
  sky_harpy: 30, celestial_golem: 100, sky_titan: 250
};
const initialEnemyId = currentFloor.normalEnemy;
const initialEnemy = DUNGEON_ENEMIES[initialEnemyId];

dungeonState.enemy = {
  id: initialEnemyId,
  name: initialEnemy.name,
  hp: initialEnemy.maxHp,
  maxHp: initialEnemy.maxHp,
  attack: initialEnemy.attack
};

function renderEnemy(){
  const enemyBox = document.querySelector(".enemy-placeholder");

  if(!enemyBox) return;

  const enemy = dungeonState.enemy;
  // ドラゴンはWARNINGまで完全に描画しない
  if(
    enemy.id === currentFloor.boss &&
    !marchState.bossAppeared
  ){
    enemyBox.innerHTML = "";
    return;
  }
  const hpPercent = Math.max(
    0,
    (enemy.hp / enemy.maxHp) * 100
  );

  enemyBox.innerHTML = `
    <div class="enemy-name">${enemy.name}</div>

    <div class="enemy-icon">
      <img
        src="${DUNGEON_ENEMIES[enemy.id]?.image || ""}"
        alt="${enemy.name}"
        class="dungeon-enemy-image enemy-${enemy.type}"
      >
    </div>

    <div class="enemy-hp-bar">
      <div
        class="enemy-hp-fill"
        style="width:${hpPercent}%"
      ></div>
    </div>

    <div class="enemy-hp-text">
      HP ${enemy.hp} / ${enemy.maxHp}
    </div>
  `;
}

renderEnemy();
// ===== Room Progress =====

function showNextRoomButton(){
  const button = document.getElementById("nextRoomButton");
  if(button){
    button.hidden = false;
  }
}

function startNextRoom(){
  dungeonState.room += 1;

  const enemyData = DUNGEON_ENEMIES[currentFloor.normalEnemy];

  

dungeonState.enemy = {
    id: "dungeon_slime",
    name: enemyData.name,
    hp: enemyData.maxHp,
    maxHp: enemyData.maxHp,
    attack: enemyData.attack
  };

  const button = document.getElementById("nextRoomButton");
  if(button){
    button.hidden = true;
  }

  document.getElementById("battleMessage").textContent =
    `ROOM ${dungeonState.room}：敵が現れた！`;

  renderDungeon();
  renderEnemy();
}

document.getElementById("nextRoomButton")
  ?.addEventListener("click", startNextRoom);
// ===== Auto March Prototype =====

const marchState = {
  playerX: 100,
  speed: 1.5,
  cameraX: 0,
  enemyX: 750,
  kills: 0,
  earnedExp: 0,
  expSaved: false,
  battleStarted: false,
  bossWarningActive: false,
  bossAppeared: false,
  running: true
};

function updateMarch(){
  const playerEl = document.getElementById("dungeonPlayer");
  const worldEl = document.getElementById("dungeonWorld");
  const viewportEl = document.getElementById("dungeonViewport");

  if(!playerEl || !worldEl || !viewportEl){
    requestAnimationFrame(updateMarch);
    return;
  }

  if(marchState.running){

    // ===== Dragon Boss Entrance =====
    if(
      dungeonState.enemy?.id === currentFloor.boss &&
      !marchState.bossAppeared
    ){

      // ドラゴンを見せないまま、さらに奥へ進軍
      const bossTriggerX = marchState.enemyX + 300;

      if(marchState.playerX < bossTriggerX){

        marchState.playerX +=
          marchState.speed * dungeonGameSpeed;

      }else{

        // 画面外まで進軍完了
        marchState.running = false;
        marchState.bossWarningActive = true;

        if(playerEl){
          playerEl.style.display = "none";
        }

        addBattleLog("⚠️ WARNING");
        addBattleLog("⚠️ 強大な気配を感じる……");

        // 少し溜めてからドラゴン出現
        setTimeout(() => {

          const enemyEl =
            document.getElementById("dungeonEnemy");          // ===== ボス登場：カメラ切り替えと同時に2体表示 =====

          // スライムは現在位置から動かさない
          // ドラゴンをスライムの少し前に配置
          marchState.enemyX =
            marchState.playerX + 400;

          const bossEnemyEl =
            document.getElementById("dungeonEnemy");

          if(bossEnemyEl){
            bossEnemyEl.style.left =
              `${marchState.enemyX - 70}px`;
          }

          // ボス出現フラグを先にON
          const bossPartyBox = document.querySelector(".dungeon-party-container");
          if(bossPartyBox){
            bossPartyBox.classList.remove("normal-battle");
          }

          marchState.bossAppeared = true;
          marchState.bossWarningActive = false;

          // ドラゴンを描画
          renderEnemy();

          // スライムとドラゴンを同時表示
          if(playerEl){
            playerEl.style.display = "";
          }

          if(bossEnemyEl){
            bossEnemyEl.style.display = "";
          }

          // ボス戦カメラへ切り替え
          marchState.cameraX =
            Math.max(
              0,
              marchState.playerX -
              (viewportEl.clientWidth * 0.25)
            );

          addBattleLog("🐉 ドラゴン出現！");
          addBattleLog("🔥 ボス戦開始！");

          playDungeonBgm(true);

          marchState.battleStarted = true;
          const partyBox = document.querySelector(".dungeon-party-container");

          if(partyBox){
            partyBox.classList.toggle('normal-battle',
              dungeonState.enemy?.id === currentFloor.normalEnemy ||
              dungeonState.enemy?.id === currentFloor.midboss
            );
          }

          startAutoBattle();

        }, 100);
      }

    }else{

      // ===== 通常進軍 =====

      const enemyX = marchState.enemyX;

      const isBossEnemy =
        dungeonState.enemy &&
        (
          dungeonState.enemy.id === currentFloor.midboss ||
          dungeonState.enemy.id === currentFloor.boss
        );

      const partyCount = Math.max(
        1,
        dungeonState.party?.filter(member => member.hp > 0).length ?? 1
      );

      const partySpacing = (partyCount - 1) * 20;

      let battleDistance =
        (isBossEnemy ? 200 : 150) + partySpacing;

      if(dungeonState.enemy?.id === currentFloor.boss){
        battleDistance = 400;
      }

      if(marchState.playerX < enemyX - battleDistance){

        marchState.playerX +=
          marchState.speed * dungeonGameSpeed;

      }else{

        marchState.playerX =
          enemyX - battleDistance;

        marchState.running = false;

        if(!marchState.battleStarted){

          marchState.battleStarted = true;

          const isBoss =
            dungeonState.enemy &&
            (
              dungeonState.enemy.id === currentFloor.midboss ||
              dungeonState.enemy.id === currentFloor.boss
            );

          playDungeonBgm(isBoss);

          if(isBoss){
            addBattleLog("🔥 ボス戦BGM開始！");
          }

          addBattleLog(
            "⚔️ 敵と遭遇！ 自動戦闘開始！"
          );

          const normalPartyBox = document.querySelector(".dungeon-party-container");

          if(normalPartyBox){
            normalPartyBox.classList.toggle("normal-battle",
              dungeonState.enemy?.id === currentFloor.normalEnemy ||
              dungeonState.enemy?.id === currentFloor.midboss
            );
          }

          startAutoBattle();
        }
      }
    }
  }

  playerEl.style.left = `${marchState.playerX}px`;

  // 進行距離表示
  const distance =
    Math.max(0, Math.floor((marchState.playerX - 100) / 5));

  const distanceEl =
    document.getElementById("distanceNumber");

  if(distanceEl){
    distanceEl.textContent = `${distance}m`;
  }

  const viewportWidth = viewportEl.clientWidth;

  // キャラが画面の約40%地点まで来たらカメラ追従
  // ===== Camera Target =====
  // 通常はプレイヤーを基準にカメラを追従
  let cameraTarget =
    marchState.playerX - viewportWidth * 0.4;

  // ボス戦では敵も画面内に収める
  if(
    dungeonState.enemy &&
    (
      dungeonState.enemy.id === currentFloor.midboss ||
      dungeonState.enemy.id === currentFloor.boss
    ) &&
    !marchState.running
  ){

    const enemyScreenX =
      marchState.enemyX - marchState.cameraX;

    // 敵が画面右端に近すぎる場合、
    // 敵が画面内に入るようカメラを右へ寄せる
    const bossPartyCount = Math.max(
      1,
      dungeonState.party?.filter(member => member.hp > 0).length ?? 1
    );

    const desiredEnemyRatio =
      0.72 + ((bossPartyCount - 1) * 0.015);

    const desiredEnemyScreenX =
      viewportWidth * desiredEnemyRatio;

    const enemyCameraTarget =
      marchState.enemyX - desiredEnemyScreenX;

    cameraTarget =
      Math.max(cameraTarget, enemyCameraTarget);
  }

  const maxCamera = Math.max(0, 6500 - viewportWidth);

  marchState.cameraX = Math.max(
    0,
    Math.min(cameraTarget, maxCamera)
  );

  worldEl.style.transform =
    `translateX(${-marchState.cameraX}px)`;

  // ===== Dungeon Background Scroll =====
  const dungeonBg =
    document.querySelector(".dungeon-bg-far");

  if(dungeonBg){
    dungeonBg.style.transform =
      `translateX(${-marchState.cameraX * 0.35}px)`;
  }

  requestAnimationFrame(updateMarch);
}

requestAnimationFrame(updateMarch);


// ===== Shared Sound Settings =====

const CT_BGM_VOLUME_KEY = "ct_bgm_volume";

function ctGetBgmVolume(){

  const r = localStorage.getItem(CT_BGM_VOLUME_KEY);

  if(r === null){
    return 0.15;
  }

  const v = Number(r);

  return Number.isFinite(v)
    ? Math.max(0, Math.min(100, v)) / 100
    : 0.15;
}

// ===== Dungeon Attack Sound =====

// ===== Dungeon Enemy Attack Sound =====

const dungeonEnemyAttackSound =
  new Audio("assets/audio/enemy-attack.mp3");

dungeonEnemyAttackSound.preload = "auto";

function playDungeonEnemyAttackSound(){

  dungeonEnemyAttackSound.currentTime = 0;

  if(typeof ctGetSeVolume === "function"){

    dungeonEnemyAttackSound.volume =
      ctGetSeVolume();

  }else{

    dungeonEnemyAttackSound.volume = 0.5;

  }

  const p =
    dungeonEnemyAttackSound.play();

  if(p && p.catch){

    p.catch(() => {});

  }
}


const dungeonAttackSound =
  new Audio("assets/audio/attack-swing.mp3");

dungeonAttackSound.preload = "auto";

function playDungeonAttackSound(){

  dungeonAttackSound.currentTime = 0;

  if(typeof ctGetSeVolume === "function"){
    dungeonAttackSound.volume = ctGetSeVolume();
  }else{
    dungeonAttackSound.volume = 0.5;
  }

  const p = dungeonAttackSound.play();

  if(p && p.catch){
    p.catch(() => {});
  }
}

// ===== Dungeon BGM =====

const dungeonBgm =
  new Audio("assets/audio/dungeon-bgm.mp3");

const bossBgm =
  new Audio("assets/audio/boss-bgm.mp3");

// BGMを先読みして切り替え時の遅延を減らす
dungeonBgm.preload = "auto";
bossBgm.preload = "auto";

dungeonBgm.load();
bossBgm.load();

dungeonBgm.loop = true;
bossBgm.loop = true;

dungeonBgm.volume = ctGetBgmVolume();
bossBgm.volume = ctGetBgmVolume();

// ホームのBGM音量設定と連動
window.addEventListener("ct:bgm-volume", (e) => {
  const v = Math.max(0, Math.min(1, Number(e.detail)));

  dungeonBgm.volume = v;
  bossBgm.volume = v;

  if(v <= 0){
    if(currentDungeonBgm){
      currentDungeonBgm.pause();
    }
  }
});

let currentDungeonBgm = null;

function playDungeonBgm(isBoss = false){

  const nextBgm =
    isBoss ? bossBgm : dungeonBgm;

  if(currentDungeonBgm === nextBgm){

    if(currentDungeonBgm.paused){

      currentDungeonBgm
        .play()
        .catch(() => {});

    }

    return;
  }

  if(currentDungeonBgm){

    currentDungeonBgm.pause();
    currentDungeonBgm.currentTime = 0;

  }

  currentDungeonBgm = nextBgm;

  currentDungeonBgm.currentTime = 0;

  currentDungeonBgm
    .play()
    .catch(() => {});
}


function stopDungeonBgm(){

  if(currentDungeonBgm){

    currentDungeonBgm.pause();

    currentDungeonBgm.currentTime = 0;

    currentDungeonBgm = null;

  }

}


// ブラウザの自動再生制限対策
document.addEventListener(
  "click",
  () => {

    if(!currentDungeonBgm){

      playDungeonBgm(false);

    }

  },
  { once: true }
);

// ===== Auto Battle =====

let dungeonGameSpeed = 1;

let autoBattleTimer = null;
let autoSkillCounter = 0;

function getLivingParty(){
  return (dungeonState.party || []).filter(member => member.hp > 0);
}

function renderPartyHp(){
  const party = dungeonState.party || [];

  party.forEach((member, index) => {
    const memberEl = document.querySelector(
      `.dungeon-party-member[data-party-index="${index}"]`
    );

    if(!memberEl) return;

    const hpBar = memberEl.querySelector(".party-member-hp i");
    const hpPercent = member.maxHp > 0
      ? Math.max(0, Math.min(100, (member.hp / member.maxHp) * 100))
      : 0;

    if(hpBar){
      hpBar.style.width = `${hpPercent}%`;
    }

    if(member.hp <= 0){
      memberEl.style.opacity = "0.3";
      memberEl.style.filter = "grayscale(1)";
    }else{
      memberEl.style.opacity = "1";
      memberEl.style.filter = "";
    }
  });
}

function startAutoBattle(){
  if(autoBattleTimer) return;

  autoBattleTimer = setInterval(() => {
    const enemy = dungeonState.enemy;
    const livingParty = getLivingParty();

    if(!enemy){
      clearInterval(autoBattleTimer);
      autoBattleTimer = null;
      return;
    }

    // 勇者が敵を倒していた場合は味方ターンを飛ばし、
    // このtick内で既存の敵撃破処理へ進む
    const enemyAlreadyDefeated = enemy.hp <= 0;

    if(livingParty.length === 0){
      addBattleLog("💀 全滅…");

      showDungeonResult(false);

      clearInterval(autoBattleTimer);
      autoBattleTimer = null;
      marchState.running = false;
      return;
    }

    autoSkillCounter += 1;

    // ==========================================
    // 味方全員のターン
    // ==========================================

    if(!enemyAlreadyDefeated) for(const member of livingParty){

      if(enemy.hp <= 0) break;

      let skill = CHARACTER_SKILLS[member.id];

// ゴーレム：進化段階でシールド性能を変更
if(member.id === "golem"){
  const stage = Number(member.evolutionStage ?? 0);

  const golemSkills = [
    {
      name: "ストーンシールド",
      cooldown: 5,
      type: "guard",
      value: 40
    },
    {
      name: "クリスタルシールド",
      cooldown: 5,
      type: "guard",
      value: 55
    },
    {
      name: "クリスタルバリア",
      cooldown: 5,
      type: "guard_all",
      value: 50
    },
    {
      name: "ダイヤモンドバリア",
      cooldown: 5,
      type: "guard_all",
      value: 70
    }
  ];

  skill = golemSkills[stage] || golemSkills[0];
}

      // スライム：進化段階で単体攻撃を強化
      if(member.id === "slime"){
        const stage = Number(member.evolutionStage ?? 0);
        const skills = [
          { name:"たいあたり", cooldown:5, type:"damage", value:30 },
          { name:"アクアショット", cooldown:5, type:"damage", value:40 },
          { name:"アクアバースト", cooldown:5, type:"damage", value:55 },
          { name:"リヴァイアウェーブ", cooldown:5, type:"damage", value:75 }
        ];
        skill = skills[stage] || skills[0];
      }

      // ファイアリザード：進化段階で全体攻撃を強化
      if(member.id === "fire_lizard"){
        const stage = Number(member.evolutionStage ?? 0);
        const skills = [
          { name:"ファイアブレス", cooldown:5, type:"damage_all", value:50 },
          { name:"フレイムブレス", cooldown:5, type:"damage_all", value:65 },
          { name:"インフェルノブレス", cooldown:5, type:"damage_all", value:85 },
          { name:"ヴォルカニックノヴァ", cooldown:5, type:"damage_all", value:110 }
        ];
        skill = skills[stage] || skills[0];
      }

      // 森の精霊：進化段階で全体回復を強化
      if(member.id === "forest_spirit"){
        const stage = Number(member.evolutionStage ?? 0);
        const skills = [
          { name:"ヒールリーフ", cooldown:5, type:"heal_all", value:35 },
          { name:"フォレストヒール", cooldown:5, type:"heal_all", value:50 },
          { name:"シルフィードブレス", cooldown:5, type:"heal_all", value:70 },
          { name:"世界樹の祝福", cooldown:5, type:"heal_all", value:95 }
        ];
        skill = skills[stage] || skills[0];
      }
      const skillMultiplier =
        (1 + ((member.level - 1) * 9 / 99)) *
        Math.pow(1.5, member.evolutionStage ?? 0);

      const scaledSkillValue =
        Math.round((skill?.value ?? 0) * skillMultiplier);

      // ==========================================
      // スキル
      // ==========================================

      if(
        skill &&
        autoSkillCounter % skill.cooldown === 0
      ){

        // スライム専用スキルSE
        if(member.id === "slime"){
          const slimeSkillSound = new Audio("./slime-skill.mp3");
          slimeSkillSound.volume = 0.8;
          slimeSkillSound.play().catch(() => {});
        }

        // ゴーレム専用ガードSE
        if(member.id === "golem"){
          const golemSkillSound = new Audio("./golem-skill.mp3");
          golemSkillSound.volume = 0.8;
          golemSkillSound.play().catch(() => {});
        }


        // 単体ダメージ
        if(skill.type === "damage"){

          enemy.hp = Math.max(
            0,
            enemy.hp - scaledSkillValue
          );

          addBattleLog(
            `✨ ${member.name}がスキル「${skill.name}」を発動！ ${scaledSkillValue}ダメージ！`
          );
        }

        // ガード
        if(skill.type === "guard"){

          member.guardReduction = skill.value;

          addBattleLog(
            `🪨 ${member.name}がスキル「${skill.name}」を発動！ 次の被ダメージを${skill.value}%軽減！`
          );
        }

        // 味方全体バリア
        if(skill.type === "guard_all"){
          for(const ally of getLivingParty()){
            ally.guardReduction = skill.value;
          }
          addBattleLog(`🛡️ ${member.name}がスキル「${skill.name}」を発動！ 味方全体の次の被ダメージを${skill.value}%軽減！`);
        }

        // 全体攻撃
        if(skill.type === "damage_all"){

          enemy.hp = Math.max(
            0,
            enemy.hp - scaledSkillValue
          );

          addBattleLog(
            `🔥 ${member.name}がスキル「${skill.name}」を発動！ 敵全体に${scaledSkillValue}ダメージ！`
          );
        }

        // 味方全体回復
        if(skill.type === "heal_all"){

          let totalHeal = 0;

          for(const ally of getLivingParty()){

            const oldHp = ally.hp;

            ally.hp = Math.min(
              ally.maxHp,
              ally.hp + scaledSkillValue
            );

            totalHeal += ally.hp - oldHp;
          }

          addBattleLog(
            `🌿 ${member.name}がスキル「${skill.name}」を発動！ 味方全体を${scaledSkillValue}回復！`
          );
        }

        renderEnemy();
        renderPartyHp();
      }

      if(enemy.hp <= 0) break;

      // ==========================================
      // 通常攻撃
      // ==========================================

      const memberDamage = member.attack ?? 20;

      playDungeonAttackSound();

      enemy.hp = Math.max(
        0,
        enemy.hp - memberDamage
      );

      renderEnemy();

      addBattleLog(
        `⚔️ ${member.name}の攻撃！ ${memberDamage}ダメージ！`
      );
    }

    // ==========================================
    // 敵撃破
    // ==========================================

    if(enemy.hp <= 0){

      addBattleLog(
        `⚔️ ${enemy.name}を撃破！進軍再開！`
      );

      clearInterval(autoBattleTimer);
      autoBattleTimer = null;

      marchState.kills += 1;
      // ==========================================
      // HERO - Dungeon Coin
      // ==========================================

      const gainedCoin = HERO_ENEMY_COIN[enemy.id] ?? 0;

      heroState.coin += gainedCoin;
      renderHeroHud();

      addBattleLog(
        `COIN +${gainedCoin}！ 所持 ${heroState.coin} COIN`
      );

      const gainedExp =
        DUNGEON_ENEMY_EXP[enemy.id] ?? 0;

      marchState.earnedExp += gainedExp;

      addBattleLog(
        `✨ ${gainedExp} EXP獲得！ 累計 ${marchState.earnedExp} EXP`
      );

      // ドラゴン撃破
      if(enemy.id === currentFloor.boss){

        // HERO - Boss Equipment Drop
        const weaponRoll = Math.random();

        let weaponData;

        if(weaponRoll < 0.50){
          weaponData = {
            id: "wooden_sword",
            name: "木の剣",
            rarity: 1,
            baseAttack: Math.floor(Math.random() * 5) + 1,
            skill: {
              id: "iai_slash",
              name: "居合斬り",
              power: 2.0,
              cooldown: 8
            }
          };
        }else if(weaponRoll < 0.90){
          weaponData = {
            id: "iron_sword",
            name: "鉄の剣",
            rarity: 2,
            baseAttack: Math.floor(Math.random() * 5) + 6,
            skill: {
              id: "steel_slash",
              name: "鋼鉄斬",
              power: 2.2,
              cooldown: 8
            }
          };
        }else{
          weaponData = {
            id: "dragon_fang_sword",
            name: "竜牙の剣",
            rarity: 3,
            baseAttack: Math.floor(Math.random() * 5) + 11,
            skill: {
              id: "dragon_slash",
              name: "ドラゴンスラッシュ",
              power: 2.5,
              cooldown: 8
            }
          };
        }

        const hasWeaponSkill = Math.random() < 0.20;

        const droppedEquipment = {
          id: weaponData.id,
          name: weaponData.name,
          type: "weapon",
          rarity: weaponData.rarity,
          level: 1,
          baseAttack: weaponData.baseAttack,
          attack: weaponData.baseAttack,
          skill: hasWeaponSkill ? weaponData.skill : null
        };

        heroState.pendingEquipment = droppedEquipment;

        console.log(
          "[EQUIPMENT DROP PENDING]",
          heroState.pendingEquipment
        );

        addBattleLog(
          `装備ドロップ！ ★★★ ${droppedEquipment.name} / ATK +${droppedEquipment.attack}`
        );

        addBattleLog(`🎉 ${currentFloor.id}階層クリア！`);
        addBattleLog("🏆 ボスを撃破しました！");

        marchState.running = false;

        stopDungeonBgm();

        setTimeout(() => {
          showDungeonResult(true);
        }, 500);

        return;
      }

      // 次の敵
      marchState.enemyX += 500;

      const nextDistance =
        Math.floor((marchState.enemyX - 250) / 5);

      let nextEnemyId = currentFloor.normalEnemy;

      if(nextDistance === currentFloor.midbossDistance){
        nextEnemyId = currentFloor.midboss;
      }

      if(nextDistance === currentFloor.bossDistance){
        nextEnemyId = currentFloor.boss;
      }

      const nextEnemy =
        DUNGEON_ENEMIES[nextEnemyId];

      dungeonState.enemy = {
        id: nextEnemyId,
        name: nextEnemy.name,
        hp: nextEnemy.maxHp,
        maxHp: nextEnemy.maxHp,
        attack: nextEnemy.attack,
        type: nextEnemy.type
      };

      const partyBox = document.querySelector(".dungeon-party-container");

      if(partyBox && nextEnemyId !== currentFloor.boss){
        partyBox.classList.add("normal-battle");
      }

      const enemyEl =
        document.getElementById("dungeonEnemy");

      if(enemyEl){

        let enemyDisplayX =
          marchState.enemyX;

        if(nextEnemyId === currentFloor.midboss){
          enemyDisplayX = marchState.enemyX - 70;
        }

        if(nextEnemyId === currentFloor.boss){
          marchState.enemyX -= 200;
          enemyDisplayX = marchState.enemyX;
        }

        enemyEl.style.left =
          `${enemyDisplayX}px`;
      }

      marchState.battleStarted = false;
      marchState.running = true;

      playDungeonBgm(false);

      renderEnemy();
      return;
    }

    // ==========================================
    // 敵の反撃：生存キャラからランダム1体
    // ==========================================

    const targets = getLivingParty();

    if(targets.length === 0){
      return;
    }

    const target =
      targets[Math.floor(Math.random() * targets.length)];

    let enemyDamage = enemy.attack;

    // ガード
    if(target.guardReduction > 0){

      enemyDamage = Math.floor(
        enemyDamage *
        (1 - target.guardReduction / 100)
      );

      addBattleLog(
        `🪨 ${target.name}のストーンガード！ ダメージを${target.guardReduction}%軽減！`
      );

      target.guardReduction = 0;
    }

    playDungeonEnemyAttackSound();

    target.hp = Math.max(
      0,
      target.hp - enemyDamage
    );

    renderPartyHp();

    // 既存HUDは先頭キャラ表示を維持
    renderDungeon();

    addBattleLog(
      `👹 ${enemy.name}の反撃！ ${target.name}に${enemyDamage}ダメージ！`
    );

    // ==========================================
    // キャラ戦闘不能
    // ==========================================

    if(target.hp <= 0){

      addBattleLog(
        `💀 ${target.name}が倒れた！`
      );

      renderPartyHp();

      if(getLivingParty().length === 0){

        addBattleLog("💀 全滅…");

        showDungeonResult(false);

        clearInterval(autoBattleTimer);
        autoBattleTimer = null;

        marchState.running = false;
        return;
      }
    }

  }, 1000 / dungeonGameSpeed);
}
// ===== Dungeon Result =====

function isDevSyntheticParty(){
  const party = dungeonState.party || [];

  return party.some(member =>
    Number(member.evolutionStage ?? 0) !==
    Number(member.dbEvolutionStage ?? 0)
  );
}

async function saveDungeonExp(){
  if(isDevSyntheticParty()){
    console.log("[DEV] Synthetic party detected. EXP save skipped.");
    return [];
  }
  if(!dungeonAccessToken || marchState.earnedExp <= 0) return null;

  const party = dungeonState.party || [];

  if(party.length === 0) return null;

  const baseExp = Math.floor(marchState.earnedExp / party.length);
  const remainderExp = marchState.earnedExp % party.length;

  const results = await Promise.all(
    party.map(async (member, index) => {

      const memberExp =
        baseExp + (index < remainderExp ? 1 : 0);

      const characterId =
        member.id.replaceAll("-", "_");

      const response = await fetch(
        `${DUNGEON_URL}/rest/v1/rpc/apply_character_exp`,
        {
          method: "POST",
          headers: {
            "apikey": DUNGEON_KEY,
            "Authorization": "Bearer " + dungeonAccessToken,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            p_character_id: characterId,
            p_exp: memberExp
          })
        }
      );

      if(!response.ok){
        throw new Error(
          `${member.name}: ${await response.text()}`
        );
      }

      const result = await response.json();

      return {
        characterId: member.id,
        characterName: member.name,
        gainedExp: memberExp,
        result: Array.isArray(result) ? result[0] : result
      };
    })
  );

  console.log("Party EXP saved:", results);
console.log("=== EXP DEBUG ===");
console.log(JSON.stringify(results, null, 2));

  return results;
}
function renderPartyDungeonExp(results){
  const container = document.getElementById("resultPartyExp");

  if(!container) return;

  container.innerHTML = "";

  if(!Array.isArray(results) || results.length === 0){
    return;
  }

  results.forEach((entry) => {
    const r = entry?.result;
    if(!r) return;

    const oldLevel = Number(r.old_level ?? 1);
    const newLevel = Number(r.new_level ?? oldLevel);
    const oldExp = Number(r.old_exp ?? 0);
    const newExp = Number(r.new_exp ?? 0);
    const nextExp = Number(r.next_level_exp ?? 0);
    const gainedExp = Number(entry.gainedExp ?? 0);

    const characterName =
      entry.characterName ?? "キャラクター";

    const didLevelUp = newLevel > oldLevel;

    // レベルアップした場合、
    // oldExp + 獲得EXP - newExp から旧Lvの必要EXPを逆算
    const oldRequiredExp = didLevelUp
      ? Math.max(1, oldExp + gainedExp - newExp)
      : nextExp;

    const oldPercent =
      oldRequiredExp > 0
        ? Math.max(0, Math.min(100, (oldExp / oldRequiredExp) * 100))
        : 100;

    const newPercent =
      nextExp > 0
        ? Math.max(0, Math.min(100, (newExp / nextExp) * 100))
        : 100;

    const box = document.createElement("div");
    box.className = "result-party-exp-box";

    box.innerHTML = `
      <div class="result-party-exp-header">
        <strong>${characterName}</strong>
        <span class="result-party-level">Lv.${oldLevel}</span>
      </div>

      <div class="result-party-exp-detail">
        <span class="result-party-exp-text">
          ${oldExp} / ${oldRequiredExp || "MAX"} EXP
        </span>
        <strong>+${gainedExp} EXP</strong>
      </div>

      <div class="result-exp-bar">
        <i style="width:${oldPercent}%"></i>
      </div>

      ${
        didLevelUp
          ? `<div class="result-party-level-up" hidden>
               LEVEL UP! Lv.${oldLevel} → Lv.${newLevel}
             </div>`
          : ""
      }
    `;

    container.appendChild(box);

    const bar = box.querySelector(".result-exp-bar i");
    const levelEl = box.querySelector(".result-party-level");
    const expTextEl = box.querySelector(".result-party-exp-text");
    const levelUpEl = box.querySelector(".result-party-level-up");

    if(!bar) return;

    bar.style.transition = "none";
    bar.style.width = `${oldPercent}%`;

    if(!didLevelUp){
      // 通常：現在位置から獲得後まで伸ばす
      setTimeout(() => {
        bar.style.transition = "width 1.2s ease";
        bar.style.width = `${newPercent}%`;

        if(expTextEl){
          expTextEl.textContent =
            `${newExp} / ${nextExp || "MAX"} EXP`;
        }
      }, 400);

      return;
    }

    // LEVEL UP：
    // 旧Lvの現在位置 → 100%
    setTimeout(() => {
      bar.style.transition = "width 1s ease";
      bar.style.width = "100%";
    }, 400);

    // Lv切り替え
    setTimeout(() => {
      if(levelEl){
        levelEl.textContent = `Lv.${newLevel}`;
      }

      if(expTextEl){
        expTextEl.textContent =
          `0 / ${nextExp || "MAX"} EXP`;
      }

      if(levelUpEl){
        levelUpEl.hidden = false;
      }

      const levelUpSound = new Audio("./level-up.mp3");
      levelUpSound.volume = 0.7;
      levelUpSound.play().catch(() => {});

      // 新Lvのゲージを0%へ戻す
      bar.style.transition = "none";
      bar.style.width = "0%";

      // 0%の状態を一度描画させる
      void bar.offsetWidth;

      // 残ったEXPまで伸ばす
      setTimeout(() => {
        bar.style.transition = "width 1s ease";
        bar.style.width = `${newPercent}%`;

        if(expTextEl){
          expTextEl.textContent =
            `${newExp} / ${nextExp || "MAX"} EXP`;
        }
      }, 250);

    }, 1550);
  });
}
async function showDungeonResult(isClear = false){
  // EXPアニメーションより先にリザルト画面を表示
  const result = document.getElementById("dungeonResult");
  if(result){
    result.hidden = false;
  }

  // hidden解除を実際に描画してからEXP処理へ
  await new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  );
  if(!marchState.expSaved){
    marchState.expSaved = true;
    try {
      const expResult = await saveDungeonExp();
      console.log("Dungeon EXP saved:", expResult);
      marchState.partyExpResults = Array.isArray(expResult) ? expResult : [];
      renderPartyDungeonExp(marchState.partyExpResults);

    } catch(error) {
      marchState.expSaved = false;
      console.error("Dungeon EXP save failed:", error);
    }
  }
  const titleEl = document.getElementById("resultTitle");

  if(titleEl){
    titleEl.textContent = isClear ? `🏆 ${currentFloor.id}階層クリア！` : "💀 冒険終了…";
  }
  const distanceEl = document.getElementById("resultDistance");
  const killsEl = document.getElementById("resultKills");
  const expEl = document.getElementById("resultExp");

  const distance =
    Math.max(0, Math.floor((marchState.playerX - 100) / 5));

  if(distanceEl){
    distanceEl.textContent = `${distance}m`;
  }

  if(killsEl){
    killsEl.textContent = `${marchState.kills}体`;
  }

  if(expEl){
    expEl.textContent = `${marchState.earnedExp} EXP`;
  }

  // ===== Result Equipment Drop =====
  const equipmentDropEl = document.getElementById("resultEquipmentDrop");
  const dropped = heroState.pendingEquipment;

  console.log("[RESULT EQUIPMENT]", {
    isClear,
    dropped
  });

  if(equipmentDropEl){
    if(isClear && dropped){
      const current =
        heroState.equipment.find(item => item.type === "weapon") || null;

      const currentNameEl =
        document.getElementById("resultCurrentWeapon");
      const currentStatEl =
        document.getElementById("resultCurrentWeaponStat");
      const droppedNameEl =
        document.getElementById("resultDroppedWeapon");
      const droppedStatEl =
        document.getElementById("resultDroppedWeaponStat");

      if(currentNameEl){
        currentNameEl.textContent =
          current ? current.name : "なし";
      }

      if(currentStatEl){
        const currentBaseAttack = current
          ? (current.baseAttack ?? ((current.attack || 0) - (((current.level || 1) - 1) * 2)))
          : 0;

        currentStatEl.textContent =
          `初期ATK +${currentBaseAttack} / スキル：${current?.skill?.name || "なし"}`;
      }

      if(droppedNameEl){
        droppedNameEl.textContent =
          `${"★".repeat(dropped.rarity || 1)} ${dropped.name}`;
      }

      if(droppedStatEl){
        droppedStatEl.textContent =
          `初期ATK +${dropped.baseAttack ?? dropped.attack ?? 0} / スキル：${dropped.skill?.name || "なし"}`;
      }

      equipmentDropEl.hidden = false;

      const returnButton = document.getElementById("returnButton");
      if(returnButton){
        returnButton.disabled = true;
      }
    }else{
      equipmentDropEl.hidden = true;
    }
  }

}


// ===== Result Equipment Choice =====
const equipDroppedWeaponButton =
  document.getElementById("equipDroppedWeaponButton");

const keepCurrentWeaponButton =
  document.getElementById("keepCurrentWeaponButton");

function finishEquipmentChoice(message){
  const dropBox = document.getElementById("resultEquipmentDrop");
  const returnButton = document.getElementById("returnButton");

  if(dropBox){
    dropBox.innerHTML = `
      <span class="result-equipment-label">EQUIPMENT</span>
      <strong>${message}</strong>
    `;
  }

  if(returnButton){
    returnButton.disabled = false;
  }
}

equipDroppedWeaponButton?.addEventListener("click", () => {
  const dropped = heroState.pendingEquipment;
  if(!dropped) return;

  const current =
    heroState.equipment.find(item => item.type === "weapon") || null;

  const currentAttack = current?.attack || 0;
  const droppedAttack = dropped.attack || 0;

  heroState.equipment = [
    ...heroState.equipment.filter(item => item.type !== "weapon"),
    dropped
  ];
  localStorage.setItem("ct_hero_weapon", JSON.stringify(dropped));

  heroState.attack += droppedAttack - currentAttack;
  heroState.pendingEquipment = null;

  renderHeroHud();
  renderHeroEquipment();

  console.log("[EQUIPMENT EQUIPPED]", dropped);

  finishEquipmentChoice(
    `${dropped.name} を装備しました / ATK +${droppedAttack}`
  );
});

keepCurrentWeaponButton?.addEventListener("click", () => {
  const dropped = heroState.pendingEquipment;
  if(!dropped) return;

  console.log("[EQUIPMENT DISCARDED]", dropped);

  heroState.pendingEquipment = null;

  finishEquipmentChoice(
    "現在の装備を維持しました"
  );
});

document.getElementById("returnButton")
  ?.addEventListener("click", () => {
    location.href = "dungeon-menu.html";
  });
// Result return button - delegated click
document.addEventListener("click", (event) => {
  if(event.target?.id === "returnButton"){
    location.href = "dungeon-menu.html";
  }
});
// ===== Skill Effect =====

function showSkillEffect(text){
  let effect = document.getElementById("skillEffect");

  if(!effect){
    effect = document.createElement("div");
    effect.id = "skillEffect";
    effect.className = "skill-effect";
    document.body.appendChild(effect);
  }

  effect.textContent = text;

  effect.classList.remove("show");

  void effect.offsetWidth;

  effect.classList.add("show");
}
// ===== Battle Log =====

const battleLogs = [];

function addBattleLog(text){
  battleLogs.push(text);

  while(battleLogs.length > 8){
    battleLogs.shift();
  }

  const log = document.getElementById("battleLog");

  if(!log){
    return;
  }

  log.innerHTML = battleLogs
    .map(line => `<div class="battle-log-line">${line}</div>`)
    .join("");
}
// ===== Character Skills =====

const CHARACTER_STATS = {
  slime: {
    hp: 100,
    attack: 20
  },

  golem: {
    hp: 180,
    attack: 20
  },

  fire_lizard: {
    hp: 150,
    attack: 30
  },

  forest_spirit: {
    hp: 150,
    attack: 30
  },

  mimic: {
    hp: 100,
    attack: 40
  }
};

const CHARACTER_SKILLS = {
  slime: {
    name: "みずのちから",
    cooldown: 5,
    type: "damage",
    value: 30
  },

  golem: {
    name: "ストーンガード",
    cooldown: 5,
    type: "guard",
    value: 50
  },

  fire_lizard: {
    name: "フレイムブレス",
    cooldown: 5,
    type: "damage_all",
    value: 50
  },

  forest_spirit: {
    name: "いやしのかぜ",
    cooldown: 5,
    type: "heal_all",
    value: 50
  },

  mimic: {
    name: "デッドリーバイト",
    cooldown: 5,
    type: "damage",
    value: 100
  }
};
// ===== DEV Skill Tester =====

document.querySelectorAll("[data-dev-skill]").forEach(button => {
  button.addEventListener("click", () => {
    const characterId = button.dataset.devSkill;
    const character = DUNGEON_CHARACTERS[characterId];

    if(!character){
      return;
    }

    dungeonState.player.id = characterId;
    dungeonState.player.name = character.name;

    addBattleLog(
      `🧪 DEV TEST：${character.name}のスキルをテストします`
    );

    renderDungeon();
  });
});














document.addEventListener("click", (e) => {
  const btn = e.target.closest(".speed-btn");
  if(!btn) return;
  dungeonGameSpeed = Number(btn.dataset.speed) || 1;
  document.querySelectorAll(".speed-btn").forEach(b => b.classList.toggle("active", b === btn));
  if(autoBattleTimer){
    clearInterval(autoBattleTimer);
    autoBattleTimer = null;
    startAutoBattle();
  }
});



















































// =========================================================
// HERO - Manual Battle Prototype
// =========================================================

let savedHeroWeapon = null;

try {
  savedHeroWeapon =
    JSON.parse(localStorage.getItem("ct_hero_weapon") || "null");
} catch(error) {
  console.error("[HERO WEAPON LOAD ERROR]", error);
}

const heroState = {
  level: 1,
  hp: 100,
  maxHp: 100,
  attack: 15 + (savedHeroWeapon?.attack || 0),
  coin: 0,
  equipment: savedHeroWeapon ? [savedHeroWeapon] : [],
  pendingEquipment: null
};

function getHeroLevelUpCost(){
  return 20 + ((heroState.level - 1) * 15);
}
function renderHeroHud(){
  const levelEl = document.getElementById("heroLevel");
  const hpEl = document.getElementById("heroHp");
  const maxHpEl = document.getElementById("heroMaxHp");
  const coinEl = document.getElementById("heroCoin");
  const hpFill = document.getElementById("heroHpFill");
  const attackEl = document.getElementById("heroAttack");
  const levelUpCostEl = document.getElementById("heroLevelUpCost");
  const levelUpButton = document.getElementById("heroLevelUpButton");
  const levelUpCost = getHeroLevelUpCost();

  if(levelEl) levelEl.textContent = heroState.level;
  if(hpEl) hpEl.textContent = heroState.hp;
  if(maxHpEl) maxHpEl.textContent = heroState.maxHp;
  if(coinEl) coinEl.textContent = heroState.coin;
  if(attackEl) attackEl.textContent = heroState.attack;
  if(levelUpCostEl) levelUpCostEl.textContent = `${levelUpCost} COIN`;

  if(levelUpButton){
    levelUpButton.disabled = heroState.coin < levelUpCost;
  }

  if(hpFill){
    const percent =
      Math.max(0, Math.min(100, (heroState.hp / heroState.maxHp) * 100));

    hpFill.style.width = `${percent}%`;
  }

  // HERO Weapon Skill
  const heroSkillButton =
    document.getElementById("heroSkillButton");

  const equippedWeapon =
    heroState.equipment.find(item => item.type === "weapon") || null;

  const weaponSkill =
    equippedWeapon?.skill || null;

  if(heroSkillButton){
    if(weaponSkill){
      heroSkillButton.textContent = weaponSkill.name;
      heroSkillButton.disabled = false;
    }else{
      heroSkillButton.textContent = "スキルなし";
      heroSkillButton.disabled = true;
    }
  }
}

const heroLevelUpButton =
  document.getElementById("heroLevelUpButton");

heroLevelUpButton?.addEventListener("click", () => {
  const cost = getHeroLevelUpCost();

  if(heroState.coin < cost){
    addBattleLog(`勇者：あと${cost - heroState.coin} COIN必要！`);
    return;
  }

  heroState.coin -= cost;
  heroState.level += 1;

  heroState.maxHp += 20;
  heroState.hp = Math.min(
    heroState.maxHp,
    heroState.hp + 20
  );

  heroState.attack += 5;

  renderHeroHud();

  addBattleLog(
    `勇者 LEVEL UP！ Lv.${heroState.level} / HP ${heroState.maxHp} / ATK ${heroState.attack}`
  );
});
const heroAttackButton =
  document.getElementById("heroAttackButton");

heroAttackButton?.addEventListener("click", () => {

  const enemy = dungeonState.enemy;

  // 敵と戦っている時だけ攻撃可能
  if(
    !marchState.battleStarted ||
    !enemy ||
    enemy.hp <= 0
  ){
    addBattleLog("勇者：攻撃できる敵がいない！");
    return;
  }

  const damage = heroState.attack;

  enemy.hp = Math.max(
    0,
    enemy.hp - damage
  );

  playDungeonAttackSound();
  renderEnemy();

  addBattleLog(
    `勇者の攻撃！ ${damage}ダメージ！`
  );

  // 撃破後の処理は既存の自動戦闘処理へ任せる
});

// ===== HERO Weapon Skill Attack =====
let heroSkillCooldownTimer = null;
let heroSkillCooldownRemaining = 0;

const heroSkillButton =
  document.getElementById("heroSkillButton");

function startHeroSkillCooldown(skill){
  if(heroSkillCooldownTimer){
    clearInterval(heroSkillCooldownTimer);
  }

  heroSkillCooldownRemaining = skill.cooldown || 8;

  heroSkillButton.disabled = true;
  heroSkillButton.textContent =
    `${skill.name} (${heroSkillCooldownRemaining}s)`;

  heroSkillCooldownTimer = setInterval(() => {
    heroSkillCooldownRemaining -= 1;

    if(heroSkillCooldownRemaining <= 0){
      clearInterval(heroSkillCooldownTimer);
      heroSkillCooldownTimer = null;
      heroSkillCooldownRemaining = 0;

      renderHeroHud();
      return;
    }

    heroSkillButton.textContent =
      `${skill.name} (${heroSkillCooldownRemaining}s)`;
  }, 1000);
}

heroSkillButton?.addEventListener("click", () => {
  const enemy = dungeonState.enemy;

  const weapon =
    heroState.equipment.find(item => item.type === "weapon") || null;

  const skill = weapon?.skill || null;

  if(!skill){
    return;
  }

  if(heroSkillCooldownRemaining > 0){
    return;
  }

  if(
    !marchState.battleStarted ||
    !enemy ||
    enemy.hp <= 0
  ){
    addBattleLog("勇者：スキルを使える敵がいない！");
    return;
  }

  const damage =
    Math.max(1, Math.floor(heroState.attack * (skill.power || 1)));

  enemy.hp = Math.max(
    0,
    enemy.hp - damage
  );

  playDungeonAttackSound();
  renderEnemy();

  addBattleLog(
    `勇者「${skill.name}」！ ${damage}ダメージ！`
  );

  startHeroSkillCooldown(skill);
});


renderHeroHud();













// =========================================================
// HERO - Equipment Panel
// =========================================================

function getWeaponLevelUpCost(weapon){
  return 10 + (((weapon?.level || 1) - 1) * 5);
}

function renderHeroEquipment(){
  const list =
    document.getElementById("heroEquipmentList");

  if(!list) return;

  const equipment =
    heroState.equipment || [];

  if(equipment.length === 0){
    list.innerHTML =
      '<p class="hero-equipment-empty">装備を所持していません</p>';
    return;
  }

  list.innerHTML = equipment.map(item => {
    const stars = "★".repeat(item.rarity || 1);
    const level = item.level || 1;
    const cost = getWeaponLevelUpCost(item);
    const canUpgrade = heroState.coin >= cost;

    return `
      <div class="hero-equipment-item">
        <div class="hero-equipment-rarity">${stars}</div>

        <div class="hero-equipment-name">
          ${item.name}
        </div>

        <div class="hero-equipment-stats">
          <span>武器 Lv.${level}</span>
          <strong>ATK +${item.attack}</strong>
        </div>

        <button
          class="hero-equipment-upgrade"
          data-weapon-id="${item.id}"
          ${canUpgrade ? "" : "disabled"}
        >
          強化 ${cost} COIN
        </button>
      </div>
    `;
  }).join("");
}

// ===== HERO Weapon Upgrade =====
document.getElementById("heroEquipmentList")
  ?.addEventListener("click", (event) => {

    const button =
      event.target.closest(".hero-equipment-upgrade");

    if(!button) return;

    const weaponId = button.dataset.weaponId;

    const weapon =
      heroState.equipment.find(
        item => item.id === weaponId
      );

    if(!weapon) return;

    const cost = getWeaponLevelUpCost(weapon);

    if(heroState.coin < cost) return;

    heroState.coin -= cost;

    weapon.level = (weapon.level || 1) + 1;
    weapon.attack = (weapon.attack || 0) + 2;

    heroState.attack += 2;

    console.log("[WEAPON LEVEL UP]", {
      name: weapon.name,
      level: weapon.level,
      attack: weapon.attack,
      cost
    });

    renderHeroHud();
    renderHeroEquipment();
  });


const heroEquipmentButton =
  document.getElementById("heroEquipmentButton");

const heroEquipmentPanel =
  document.getElementById("heroEquipmentPanel");

const heroEquipmentCloseButton =
  document.getElementById("heroEquipmentCloseButton");

heroEquipmentButton?.addEventListener("click", () => {
  console.log("[EQUIPMENT BUTTON]", heroState.equipment);
  renderHeroEquipment();

  if(heroEquipmentPanel){
    heroEquipmentPanel.hidden = false;
  }
});

heroEquipmentCloseButton?.addEventListener("click", () => {
  if(heroEquipmentPanel){
    heroEquipmentPanel.hidden = true;
  }
});




















