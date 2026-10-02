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

  document.getElementById("roomNumber").textContent =
    dungeonState.room;

  document.getElementById("playerName").textContent =
    dungeonState.player.name;

  document.getElementById("playerHpText").textContent =
    `HP ${dungeonState.player.hp} / ${dungeonState.player.maxHp}`;

  const hpPercent =
    (dungeonState.player.hp / dungeonState.player.maxHp) * 100;

  document.getElementById("playerHpBar").style.width =
    `${hpPercent}%`;
}

document.getElementById("attackButton").addEventListener("click", () => {
  const enemy = dungeonState.enemy;
  const player = dungeonState.player;
  const message = document.getElementById("battleMessage");

  if(!enemy || enemy.hp <= 0 || player.hp <= 0){
    return;
  }

  const playerDamage = 20;
  enemy.hp = Math.max(0, enemy.hp - playerDamage);

  renderEnemy();

  if(enemy.hp <= 0){
    message.textContent =
      `⚔️ ${enemy.name}に${playerDamage}ダメージ！ 撃破した！`;
    showNextRoomButton();
    return;
  }

  const enemyDamage = enemy.attack;
  player.hp = Math.max(0, player.hp - enemyDamage);

  renderDungeon();

  if(player.hp <= 0){
    message.textContent =
      `⚔️ ${enemy.name}に${playerDamage}ダメージ！ 反撃で${enemyDamage}ダメージ。倒れてしまった…`;
    return;
  }

  message.textContent =
    `⚔️ ${enemy.name}に${playerDamage}ダメージ！ 反撃で${enemyDamage}ダメージ！`;
});

document.getElementById("skillButton").addEventListener("click", () => {
  document.getElementById("battleMessage").textContent =
    "✨ スキル！ ※戦闘システムは次に実装";
});

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
    attack: 10
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

    <div class="enemy-icon">👾</div>

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