const { rollBerry } = require('../src/utils/rng');
const berries = require('../src/berries');

function formatNumber(n) {
  return n.toLocaleString();
}

function runSimulation(rollsCount, luckLevel, superLuckLevel) {
  console.log(`\n========================================`);
  console.log(`🚀 СИМУЛЯЦИЯ: ${formatNumber(rollsCount)} роллов`);
  console.log(`🍀 Уровень Удачи: ${luckLevel} (Множитель: x${require('../src/config').UPGRADES.luck.multipliers[luckLevel - 1]})`);
  console.log(`⭐ Уровень Супер-удачи: ${superLuckLevel} (Множитель: x${require('../src/config').UPGRADES.super_luck.multipliers[superLuckLevel - 1]})`);
  console.log(`========================================`);

  const mockPlayer = {
    luck_level: luckLevel,
    super_luck_level: superLuckLevel,
    total_rolls: 0
  };

  const results = {};
  for (const b of berries) {
    results[b.id] = 0;
  }

  const startTime = Date.now();

  for (let i = 0; i < rollsCount; i++) {
    mockPlayer.total_rolls = i;
    const { berry } = rollBerry(mockPlayer);
    results[berry.id]++;
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`⏱️ Время выполнения: ${duration.toFixed(2)} секунд`);
  console.log(`📈 Скорость: ${Math.round(rollsCount / duration).toLocaleString()} роллов/сек\n`);

  console.log(`| Ягода (Редкость) | Шанс 1 in X | Выпало раз | Доля (%) | Эффективный Шанс |`);
  console.log(`|------------------|-------------|------------|----------|------------------|`);

  // Sort berries by chance ascending (most common first) to match visual structure
  const sortedBerries = [...berries].sort((a, b) => a.chance - b.chance);

  for (const b of sortedBerries) {
    const count = results[b.id];
    const pct = ((count / rollsCount) * 100).toFixed(6);
    const effChance = count > 0 ? Math.round(rollsCount / count) : Infinity;
    
    if (count > 0 || b.chance < 100000) {
      console.log(`| ${b.name} (${b.rarity}) | ${formatNumber(b.chance)} | ${formatNumber(count)} | ${pct}% | 1 in ${formatNumber(effChance)} |`);
    }
  }
}

// Run simulations
runSimulation(1000000, 1, 1);
runSimulation(1000000, 5, 5);
