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

function loadSelectedCharacter(){
  const characterId =
    localStorage.getItem("ct_dungeon_character");

  const character =
    DUNGEON_CHARACTERS[characterId];

  if(!character){
    location.href = "characters.html";
    return;
  }

  dungeonState.player.id = characterId;
  dungeonState.player.name = character.name;

  // キャラクターごとのHP
  const characterHp = {
    slime: 100,
    golem: 180,
    fire_lizard: 150,
    forest_spirit: 150,
    mimic: 100
  };

  if(characterHp[characterId] !== undefined){
    dungeonState.player.maxHp = characterHp[characterId];
    dungeonState.player.hp = characterHp[characterId];
  }

  const playerBox =
    document.querySelector(".player-placeholder");

  if(playerBox){
    playerBox.innerHTML =
      `<img src="${character.image}" alt="${character.name}" class="dungeon-character-image">`;
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
  battleStarted: false,
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

    const enemyX = marchState.enemyX;

    const isBossEnemy =
      dungeonState.enemy &&
      (
        dungeonState.enemy.id === "dungeon_golem" ||
        dungeonState.enemy.id === "dungeon_dragon"
      );

    // プレイヤーの表示幅＋余白を考慮して接敵位置を決定
    // 敵の表示ボックス180px + 余白20px
    const battleDistance =
      isBossEnemy ? 200 : 150;

    if(marchState.playerX < enemyX - battleDistance){
      marchState.playerX += marchState.speed;
    }else{
      marchState.playerX = enemyX - battleDistance;
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

        addBattleLog("⚔️ 敵と遭遇！ 自動戦闘開始！");
        startAutoBattle();
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
    const desiredEnemyScreenX =
      viewportWidth * 0.72;

    const enemyCameraTarget =
      marchState.enemyX - desiredEnemyScreenX;

    cameraTarget =
      Math.max(cameraTarget, enemyCameraTarget);
  }

  const maxCamera =
    Math.max(0, 5300 - viewportWidth);

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

let autoBattleTimer = null;
let autoSkillCounter = 0;

function startAutoBattle(){
  if(autoBattleTimer) return;

  autoBattleTimer = setInterval(() => {
    const enemy = dungeonState.enemy;
    const player = dungeonState.player;

    if(!enemy || enemy.hp <= 0 || player.hp <= 0){
      clearInterval(autoBattleTimer);
      autoBattleTimer = null;
      return;
    }

    const characterStats =
      CHARACTER_STATS[dungeonState.player.id];

    const playerDamage =
      characterStats
        ? characterStats.attack
        : 20;

    // ===== Auto Skill =====
    autoSkillCounter += 1;

    const characterId = dungeonState.player.id;
    const skill = CHARACTER_SKILLS[characterId];

    if(
      skill &&
      autoSkillCounter >= skill.cooldown
    ){
      autoSkillCounter = 0;

      // ==========================================
      // 単体ダメージ
      // ==========================================

      if(skill.type === "damage"){

        enemy.hp = Math.max(
          0,
          enemy.hp - skill.value
        );

        addBattleLog(
          `✨ ${dungeonState.player.name}がスキル「${skill.name}」を発動！ ${skill.value}ダメージ！`
        );

        renderEnemy();
      }


      // ==========================================
      // ゴーレム：次の敵攻撃を50%軽減
      // ==========================================

      if(skill.type === "guard"){

        dungeonState.player.guardReduction =
          skill.value;

        addBattleLog(
          `🪨 ${dungeonState.player.name}がスキル「${skill.name}」を発動！ 次のダメージを${skill.value}%軽減！`
        );
      }


      // ==========================================
      // ファイアリザード：敵全体50ダメージ
      // ==========================================

      if(skill.type === "damage_all"){

        enemy.hp = Math.max(
          0,
          enemy.hp - skill.value
        );

        addBattleLog(
          `🔥 ${dungeonState.player.name}がスキル「${skill.name}」を発動！ 敵全体に${skill.value}ダメージ！`
        );

        renderEnemy();
      }


      // ==========================================
      // 森の精霊：味方全体50回復
      // ==========================================

      if(skill.type === "heal_all"){

        const oldHp = player.hp;

        player.hp = Math.min(
          player.maxHp,
          player.hp + skill.value
        );

        const healed =
          player.hp - oldHp;

        addBattleLog(
          `🌿 ${dungeonState.player.name}がスキル「${skill.name}」を発動！ 味方全体を${skill.value}回復！`
        );

        renderDungeon();
      }
    }

    // 通常攻撃音
    playDungeonAttackSound();

    enemy.hp = Math.max(
      0,
      enemy.hp - playerDamage
    );

    renderEnemy();

    if(enemy.hp <= 0){
      addBattleLog(
        `⚔️ ${enemy.name}を撃破！進軍再開！`
      );

      clearInterval(autoBattleTimer);
      autoBattleTimer = null;

      // 撃破数を加算
      marchState.kills += 1;

      // 次の敵を100m先へ
      marchState.enemyX += 500;

      // 次の敵の距離
      const nextDistance =
        Math.floor((marchState.enemyX - 250) / 5);

      // 距離によって敵を決定
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

      const enemyEl =
        document.getElementById("dungeonEnemy");

      if(enemyEl){

        // 通常の敵は通常位置
        let enemyDisplayX =
          marchState.enemyX;

        // ドラゴンだけ画面上では少し手前に配置
        if(nextEnemyId === "dungeon_dragon"){
          enemyDisplayX -= 300;
        }

        enemyEl.style.left =
          `${enemyDisplayX}px`;
      }

      // 次の接敵を許可
      marchState.battleStarted = false;
      marchState.running = true;

      // ボス撃破後は通常BGMへ戻す
      playDungeonBgm(false);

      renderEnemy();
      return;
    }

    let enemyDamage = enemy.attack;

    // ゴーレムのストーンガード
    if(player.guardReduction > 0){
      enemyDamage = Math.floor(
        enemyDamage * (1 - player.guardReduction / 100)
      );

      addBattleLog(
        `🪨 ストーンガード！ ダメージを${player.guardReduction}%軽減！`
      );

      player.guardReduction = 0;
    }

    // 敵攻撃音
    playDungeonEnemyAttackSound();

    player.hp = Math.max(
      0,
      player.hp - enemyDamage
    );

    renderDungeon();

    if(player.hp <= 0){
      addBattleLog("💀 全滅…");

      showDungeonResult();

      clearInterval(autoBattleTimer);
      autoBattleTimer = null;

      marchState.running = false;
      return;
    }

    addBattleLog(
      `⚔️ ${playerDamage}ダメージ！ 敵の反撃 ${enemyDamage}ダメージ！`
    );

  }, 1000);
}
// ===== Dungeon Result =====

function showDungeonResult(){
  const result = document.getElementById("dungeonResult");
  const distanceEl = document.getElementById("resultDistance");
  const killsEl = document.getElementById("resultKills");

  const distance =
    Math.max(0, Math.floor((marchState.playerX - 100) / 5));

  if(distanceEl){
    distanceEl.textContent = `${distance}m`;
  }

  if(killsEl){
    killsEl.textContent = `${marchState.kills}体`;
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