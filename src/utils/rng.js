const berries = require('../berries');
const config = require('../config');

/**
 * Roll a berry based on player's luck and super luck.
 * Algorithm: iterate from rarest to most common, check probability.
 * Luck multiplier slightly increases chance of rare berries.
 * Super luck applies every SUPER_LUCK_INTERVAL rolls.
 * 
 * IMPORTANT: Even at max upgrades (luck x2.2, super luck x5.0),
 * rare berries remain extremely hard to get.
 * Example: Teaberry 1/100M → ~1/45M with max luck, ~1/9M with super luck on top.
 */

// Sort berries from rarest to most common (highest chance first)
const sortedBerries = [...berries].sort((a, b) => b.chance - a.chance);

/**
 * @param {Object} player - Player data from DB
 * @param {number} player.luck_level - 1-5
 * @param {number} player.super_luck_level - 1-5
 * @param {number} player.total_rolls - Current roll count (BEFORE increment)
 * @returns {Object} - Berry object from berries array
 */
function rollBerry(player) {
  const luckLevel = player.luck_level || 1;
  const superLuckLevel = player.super_luck_level || 1;
  const totalRolls = player.total_rolls || 0;

  // Get multipliers from config
  const luckMultiplier = config.UPGRADES.luck.multipliers[luckLevel - 1];
  
  // Check if this is a super luck roll (every 10th roll)
  const isSuperLuck = (totalRolls + 1) % config.SUPER_LUCK_INTERVAL === 0;
  const superLuckMultiplier = isSuperLuck 
    ? config.UPGRADES.super_luck.multipliers[superLuckLevel - 1] 
    : 1.0;

  // Combined multiplier (applied to reduce the chance denominator)
  const combinedMultiplier = luckMultiplier * superLuckMultiplier;

  // Roll for each berry from rarest to most common
  for (const berry of sortedBerries) {
    // Effective chance: 1 in (chance / combinedMultiplier)
    // So probability = combinedMultiplier / chance
    const probability = combinedMultiplier / berry.chance;
    
    if (Math.random() < probability) {
      return { berry, isSuperLuck };
    }
  }

  // Fallback: return the most common berry (Strawberry, 1 in 3)
  // This should almost always hit naturally, but just in case
  const fallback = sortedBerries[sortedBerries.length - 1];
  return { berry: fallback, isSuperLuck };
}

module.exports = { rollBerry };
