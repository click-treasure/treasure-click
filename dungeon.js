"use strict";

// =========================================================
// CLICK TREASURE - Dungeon Prototype
// =========================================================

const dungeonState = {
  floor: 1,
  room: 1,
  player: {
    name: "冒険者",
    hp: 100,
    maxHp: 100
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
    const battleDistance = 150;

    if(marchState.playerX < enemyX - battleDistance){
      marchState.playerX += marchState.speed;
    }else{
      marchState.playerX = enemyX - battleDistance;
      marchState.running = false;

      if(!marchState.battleStarted){
        marchState.battleStarted = true;
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
  const cameraTarget =
    marchState.playerX - viewportWidth * 0.4;

  const maxCamera =
    Math.max(0, 5300 - viewportWidth);

  marchState.cameraX = Math.max(
    0,
    Math.min(cameraTarget, maxCamera)
  );

  worldEl.style.transform =
    `translateX(${-marchState.cameraX}px)`;

  requestAnimationFrame(updateMarch);
}

requestAnimationFrame(updateMarch);
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

    const playerDamage = 20;

    // ===== Auto Skill =====
    autoSkillCounter += 1;

    const characterId = dungeonState.player.id;
    const skill = CHARACTER_SKILLS[characterId];

    if(
      skill &&
      autoSkillCounter >= skill.cooldown
    ){
      autoSkillCounter = 0;

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

      if(skill.type === "guard"){
        dungeonState.player.guardReduction = skill.value;

        addBattleLog(
          `🪨 ${dungeonState.player.name}がスキル「${skill.name}」を発動！ 次のダメージを${skill.value}%軽減！`
        );
      }

      if(skill.type === "heal"){
        const oldHp = player.hp;

        player.hp = Math.min(
          player.maxHp,
          player.hp + skill.value
        );

        const healed = player.hp - oldHp;

        addBattleLog(
          `🌿 ${dungeonState.player.name}がスキル「${skill.name}」を発動！ HPが${healed}回復！`
        );

        renderDungeon();
      }
    }

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
        enemyEl.style.left =
          `${marchState.enemyX}px`;
      }

      // 次の接敵を許可
      marchState.battleStarted = false;
      marchState.running = true;

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
    type: "damage",
    value: 50
  },

  forest_spirit: {
    name: "いやしのかぜ",
    cooldown: 5,
    type: "heal",
    value: 20
  },

  mimic: {
    name: "デッドリーバイト",
    cooldown: 5,
    type: "damage",
    value: 70
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