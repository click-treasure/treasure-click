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
    location.href = "characters.html";
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

  for(const characterId of partyIds){

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

    const evolutionStage =
      ownedCharacter?.evolution_stage ?? 0;

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
      image: characterId === "slime"
  ? [
      "assets/characters/slime.png",
      "assets/characters/slime-evo1.png",
      "assets/characters/slime-evo2.png",
      "assets/characters/slime-evo3.png"
    ][evolutionStage] || character.image
  : character.image,
      level,
      evolutionStage,
      maxHp,
      hp: maxHp,
      attack,
      guardReduction: 0
    });
  }

  if(party.length === 0){
    location.href = "characters.html";
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
// ===== Enemy System =====

const DUNGEON_ENEMIES = {
  dungeon_slime: {
    name: "ダンジョンスライム",
    maxHp: 50,
    attack: 10,
    type: "normal",
    image: "assets/enemies/dungeon-slime.png"
  },

  dungeon_golem: {
    name: "ダンジョンゴーレム",
    maxHp: 250,
    attack: 25,
    type: "midboss",
    image: "assets/enemies/dungeon-golem.png"
  },

  dungeon_dragon: {
    name: "ダンジョンドラゴン",
    maxHp: 600,
    attack: 40,
    type: "boss",
    image: "assets/enemies/dungeon-dragon.png"
  }
};


// ===== Dungeon Enemy EXP =====
const DUNGEON_ENEMY_EXP = {
  dungeon_slime: 10,
  dungeon_golem: 50,
  dungeon_dragon: 100
};
dungeonState.enemy = {
  id: "dungeon_slime",
  name: DUNGEON_ENEMIES.dungeon_slime.name,
  hp: DUNGEON_ENEMIES.dungeon_slime.maxHp,
  maxHp: DUNGEON_ENEMIES.dungeon_slime.maxHp,
  attack: DUNGEON_ENEMIES.dungeon_slime.attack
};

function renderEnemy(){
  const enemyBox = document.querySelector(".enemy-placeholder");

  if(!enemyBox) return;

  const enemy = dungeonState.enemy;
  // ドラゴンはWARNINGまで完全に描画しない
  if(
    enemy.id === "dungeon_dragon" &&
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

  const enemyData = DUNGEON_ENEMIES.dungeon_slime;

  

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
      dungeonState.enemy?.id === "dungeon_dragon" &&
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
              dungeonState.enemy?.id === "dungeon_slime" ||
              dungeonState.enemy?.id === "dungeon_golem"
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
          dungeonState.enemy.id === "dungeon_golem" ||
          dungeonState.enemy.id === "dungeon_dragon"
        );

      const partyCount = Math.max(
        1,
        dungeonState.party?.filter(member => member.hp > 0).length ?? 1
      );

      const partySpacing = (partyCount - 1) * 20;

      let battleDistance =
        (isBossEnemy ? 200 : 150) + partySpacing;

      if(dungeonState.enemy?.id === "dungeon_dragon"){
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
              dungeonState.enemy.id === "dungeon_golem" ||
              dungeonState.enemy.id === "dungeon_dragon"
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
              dungeonState.enemy?.id === "dungeon_slime" ||
              dungeonState.enemy?.id === "dungeon_golem"
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
      dungeonState.enemy.id === "dungeon_golem" ||
      dungeonState.enemy.id === "dungeon_dragon"
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

    if(!enemy || enemy.hp <= 0){
      clearInterval(autoBattleTimer);
      autoBattleTimer = null;
      return;
    }

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

    for(const member of livingParty){

      if(enemy.hp <= 0) break;

      const skill = CHARACTER_SKILLS[member.id];

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

      const gainedExp =
        DUNGEON_ENEMY_EXP[enemy.id] ?? 0;

      marchState.earnedExp += gainedExp;

      addBattleLog(
        `✨ ${gainedExp} EXP獲得！ 累計 ${marchState.earnedExp} EXP`
      );

      // ドラゴン撃破
      if(enemy.id === "dungeon_dragon"){

        addBattleLog("🎉 1階層クリア！");
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

      let nextEnemyId = "dungeon_slime";

      if(nextDistance === 500){
        nextEnemyId = "dungeon_golem";
      }

      if(nextDistance === 1000){
        nextEnemyId = "dungeon_dragon";
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

      if(partyBox && nextEnemyId !== "dungeon_dragon"){
        partyBox.classList.add("normal-battle");
      }

      const enemyEl =
        document.getElementById("dungeonEnemy");

      if(enemyEl){

        let enemyDisplayX =
          marchState.enemyX;

        if(nextEnemyId === "dungeon_golem"){
          enemyDisplayX = marchState.enemyX - 70;
        }

        if(nextEnemyId === "dungeon_dragon"){
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

async function saveDungeonExp(){
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

    const characterName =
      entry.characterName ?? "キャラクター";

    const box = document.createElement("div");
    box.className = "result-party-exp-box";

    const levelUp =
      newLevel > oldLevel
        ? `<div class="result-party-level-up">✨ LEVEL UP! Lv.${oldLevel} → Lv.${newLevel}</div>`
        : "";

    const percent =
      nextExp > 0
        ? Math.max(0, Math.min(100, (newExp / nextExp) * 100))
        : 100;

    box.innerHTML = `
      <div class="result-party-exp-header">
        <strong>${characterName}</strong>
        <span>Lv.${newLevel}</span>
      </div>

      <div class="result-party-exp-detail">
        <span>${newExp} / ${nextExp || "MAX"} EXP</span>
        <strong>+${entry.gainedExp ?? 0} EXP</strong>
      </div>

      <div class="result-exp-bar">
        <i style="width:0%"></i>
      </div>

      ${levelUp}
    `;

    container.appendChild(box);

    const bar = box.querySelector(".result-exp-bar i");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if(bar){
          bar.style.width = `${percent}%`;

          if(newLevel > oldLevel){
            setTimeout(() => {
              const levelUpSound = new Audio("./level-up.mp3");
              levelUpSound.volume = 0.7;
              levelUpSound.play().catch(() => {});
            }, 1000);
          }
        }
      });
    });
  });
}

async function showDungeonResult(isClear = false){
  if(!marchState.expSaved){
    marchState.expSaved = true;
    try {
      const expResult = await saveDungeonExp();
      console.log("Dungeon EXP saved:", expResult);
      marchState.partyExpResults = Array.isArray(expResult) ? expResult : [];
      renderPartyDungeonExp(marchState.partyExpResults);
      animateDungeonExp(marchState.expResult);
    } catch(error) {
      marchState.expSaved = false;
      console.error("Dungeon EXP save failed:", error);
    }
  }
  const result = document.getElementById("dungeonResult");
  const titleEl = document.getElementById("resultTitle");

  if(titleEl){
    titleEl.textContent = isClear ? "🏆 1階層クリア！" : "💀 冒険終了…";
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

  if(result){
    result.hidden = false;
  }
}

document.getElementById("returnButton")
  ?.addEventListener("click", () => {
    location.href = "characters.html";
  });
// Result return button - delegated click
document.addEventListener("click", (event) => {
  if(event.target?.id === "returnButton"){
    location.href = "characters.html";
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












































