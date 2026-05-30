const { 
  deleteAllData, 
  createPlayer, 
  getPlayer, 
  updatePlayer, 
  addBerry, 
  getGlobalStats,
  getLeaderboardByRolls,
  getLeaderboardByCoins,
  getPlayersInventoryForLeaderboard 
} = require('../src/database');
const berries = require('../src/berries');
const { RARITIES } = require('../src/config');

console.log("🛠️ ЗАПУСК ТЕСТА НОВЫХ МЕТОДОВ БД...");

// 1. Clear database
deleteAllData();
console.log("🧹 База данных очищена.");

// 2. Create test players
createPlayer("1", "UserOne", "https://url1");
createPlayer("2", "UserTwo", "https://url2");
createPlayer("3", "UserThree", "https://url3");

updatePlayer("1", { coins: 1500, total_rolls: 120 });
updatePlayer("2", { coins: 8500, total_rolls: 45 });
updatePlayer("3", { coins: 300, total_rolls: 900 });

// 3. Roll some berries for players
// UserOne rolls: Common, Uncommon, Rare
addBerry("1", "strawberry");
addBerry("1", "foxberry");
addBerry("1", "boysenberry");

// UserTwo rolls: Common, Epic
addBerry("2", "blueberry");
addBerry("2", "bayberry");

// UserThree rolls: Common, Legendary
addBerry("3", "blackberry");
addBerry("3", "hollyberry");

console.log("📝 Тестовые данные заполнены.");

// 4. Test getGlobalStats
const stats = getGlobalStats();
console.log("\n📊 ГЛОБАЛЬНАЯ СТАТИСТИКА:");
console.log(`- Всего игроков: ${stats.players}`);
console.log(`- Всего роллов: ${stats.rolls}`);
console.log(`- Всего монет: ${stats.coins}`);

let legendaryCount = 0;
let mythicCount = 0;
let secretCount = 0;

for (const stat of stats.berryStats) {
  const berry = berries.find(b => b.id === stat.berry_id);
  if (berry) {
    if (berry.rarity === 'L') legendaryCount += stat.rolled;
    if (berry.rarity === 'M') mythicCount += stat.rolled;
    if (berry.rarity === 'S') secretCount += stat.rolled;
  }
}
console.log(`- Легендарок (L) выбито: ${legendaryCount}`);
console.log(`- Мификов (M) выбито: ${mythicCount}`);
console.log(`- Секреток (S) выбито: ${secretCount}`);

// 5. Test rolls leaderboard
const rollsLeaderboard = getLeaderboardByRolls();
console.log("\n🎰 ТОП ПО РОЛЛАМ:");
rollsLeaderboard.forEach((p, i) => {
  console.log(`${i+1}. ${p.username} — ${p.total_rolls} роллов`);
});

// 6. Test coins leaderboard
const coinsLeaderboard = getLeaderboardByCoins();
console.log("\n🪙 ТОП ПО МОНЕТАМ:");
coinsLeaderboard.forEach((p, i) => {
  console.log(`${i+1}. ${p.username} — ${p.coins} монет`);
});

// 7. Test rarity leaderboard (JS calculation)
console.log("\n💎 ТОП ПО РЕДКОСТИ:");
const players = getLeaderboardByRolls();
const inventory = getPlayersInventoryForLeaderboard();

const userBestBerry = new Map();
for (const inv of inventory) {
  const berry = berries.find(b => b.id === inv.berry_id);
  if (berry) {
    const existing = userBestBerry.get(inv.user_id);
    if (!existing || berry.chance > existing.chance) {
      userBestBerry.set(inv.user_id, berry);
    }
  }
}

const rarityList = players.map(p => {
  const best = userBestBerry.get(p.user_id);
  return {
    username: p.username,
    value: best ? best.chance : -1,
    formatted: best 
      ? `${RARITIES[best.rarity]?.emoji || ''} ${best.name} (1 in ${best.chance})`
      : '—'
  };
});

rarityList.sort((a, b) => b.value - a.value);
rarityList.forEach((p, i) => {
  console.log(`${i+1}. ${p.username} — Лучшая ягода: ${p.formatted}`);
});

console.log("\n✅ ВСЕ ТЕСТЫ БД ПРОЙДЕНЫ УСПЕШНО!");
