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
    AS: { name: 'Abuse Secret', emoji: '💀', color: 0x8B0000, order: 8 }
  },

  // Upgrade definitions
  UPGRADES: {
    luck: {
      name: '🍀 Удача',
      description: 'Повышает шанс выпадения редких ягод',
      multipliers: [1.0, 1.15, 1.4, 1.75, 2.2],
      costs: [0, 2000, 25000, 300000, 3500000]
    },
    super_luck: {
      name: '⭐ Супер-удача',
      description: 'Усиливает бонус каждого 10-го ролла',
      multipliers: [1.0, 1.5, 2.0, 3.0, 5.0],
      costs: [0, 5000, 60000, 750000, 8000000]
    },
    sell_bonus: {
      name: '💰 Бонус продажи',
      description: 'Увеличивает доход с продажи ягод',
      multipliers: [1.0, 1.25, 1.5, 1.75, 2.0],
      costs: [0, 1500, 18000, 200000, 2500000]
    }
  },

  SUPER_LUCK_INTERVAL: 10, // Every 10th roll triggers super luck
  MAX_UPGRADE_LEVEL: 5
};
