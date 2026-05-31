module.exports = {
  // Rarity definitions with display info
  RARITIES: {
    C: { name: 'Common', emoji: '⚪️', color: 0xBDBDBD, order: 0 },
    U: { name: 'Uncommon', emoji: '🟢', color: 0x6FC785, order: 1 },
    R: { name: 'Rare', emoji: '🔵', color: 0x3D74FF, order: 2 },
    E: { name: 'Epic', emoji: '🟣', color: 0xB43DFF, order: 3 },
    L: { name: 'Legendary', emoji: '🟡', color: 0xFFCA00, order: 4 },
    M: { name: 'Mythic', emoji: '🔴', color: 0x800000, order: 5 },
    CS: { name: 'Cosmic', emoji: '🌌', color: 0x2E0057, order: 6 },
    S: { name: 'Secret', emoji: '⚫️', color: 0x000000, order: 7 },
    AS: { name: 'Abuse Secret', emoji: '💀', color: 0x8B0000, order: 8 },
    G: { name: 'Godly', emoji: '✨', color: 0xFFDD8F, order: 9 },
  },

  // Upgrade definitions
  UPGRADES: {
    luck: {
      name: '🍀 Удача',
      description: 'Повышает шанс выпадения редких ягод',
      multipliers: [1.0, 1.15, 1.4, 1.75, 2.2, 2.5, 3.0, 3.6, 4.4, 5.0, 5.8, 6.8, 7.7, 9.5],
      costs: [
        0,           // 1 lvl (Базовый)
        1000,        // 2 lvl
        15000,       // 3 lvl
        200000,      // 4 lvl
        2500000,     // 5 lvl
        25000000,    // 6 lvl  (x10)
        200000000,   // 7 lvl  (x8)
        1500000000,  // 8 lvl  (x7.5)
        11000000000, // 9 lvl  (x7.3)
        80000000000, // 10 lvl (x7.2)
        570000000000,// 11 lvl (x7.1)
        4000000000000,// 12 lvl (x7)
        28000000000000,// 13 lvl (x7)
        195000000000000 // 14 lvl (Финальный хардкорный уровень)
      ]
    },
    super_luck: {
      name: '⭐ Супер-удача',
      description: 'Усиливает бонус каждого 10-го ролла',
      multipliers: [1.0, 1.5, 2.0, 3.0, 5.0, 7.5, 10.0, 12.5, 15.0],
      costs: [
        0,           // 1 lvl
        3000,        // 2 lvl
        40000,       // 3 lvl
        500000,      // 4 lvl
        6000000,     // 5 lvl
        60000000,    // 6 lvl (x10)
        540000000,   // 7 lvl (x9)
        4800000000,  // 8 lvl (x8.8)
        42000000000  // 9 lvl (Финальный)
      ]
    },
    sell_bonus: {
      name: '💰 Бонус продажи',
      description: 'Увеличивает доход с продажи ягод',
      multipliers: [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 3.0],
      costs: [
        0,           // 1 lvl
        750,         // 2 lvl
        14000,       // 3 lvl
        100000,      // 4 lvl
        1500000,     // 5 lvl
        15000000,    // 6 lvl (x10)
        135000000,   // 7 lvl (x9)
        1100000000   // 8 lvl (Финальный)
      ]
    }
  },

  SUPER_LUCK_INTERVAL: 10, // Every 10th roll triggers super luck
  MAX_UPGRADE_LEVEL: 5
};
