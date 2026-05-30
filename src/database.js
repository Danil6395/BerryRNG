const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Ensure data directory exists
const dataDir = path.join('c:', 'berryrng', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'berryrng.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT,
    coins INTEGER DEFAULT 0,
    total_rolls INTEGER DEFAULT 0,
    luck_level INTEGER DEFAULT 1,
    super_luck_level INTEGER DEFAULT 1,
    sell_bonus_level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    user_id TEXT NOT NULL,
    berry_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    times_rolled INTEGER DEFAULT 0,
    first_rolled_at DATETIME,
    PRIMARY KEY (user_id, berry_id)
  );
`);

// ============================================================
// Prepared statements
// ============================================================

const stmtGetPlayer = db.prepare(
  'SELECT * FROM players WHERE user_id = ?'
);

const stmtCreatePlayer = db.prepare(
  'INSERT INTO players (user_id, username, avatar_url) VALUES (?, ?, ?)'
);

const stmtIncrementRolls = db.prepare(
  'UPDATE players SET total_rolls = total_rolls + 1 WHERE user_id = ?'
);

const stmtGetTotalRolls = db.prepare(
  'SELECT total_rolls FROM players WHERE user_id = ?'
);

const stmtAddBerryUpdate = db.prepare(`
  UPDATE inventory
  SET quantity = quantity + 1, times_rolled = times_rolled + 1
  WHERE user_id = ? AND berry_id = ?
`);

const stmtAddBerryInsert = db.prepare(`
  INSERT INTO inventory (user_id, berry_id, quantity, times_rolled, first_rolled_at)
  VALUES (?, ?, 1, 1, CURRENT_TIMESTAMP)
`);

const stmtGetInventoryEntry = db.prepare(
  'SELECT * FROM inventory WHERE user_id = ? AND berry_id = ?'
);

const stmtGetInventory = db.prepare(
  'SELECT * FROM inventory WHERE user_id = ?'
);

const stmtGetBerryCount = db.prepare(
  'SELECT quantity FROM inventory WHERE user_id = ? AND berry_id = ?'
);

const stmtSellDecrease = db.prepare(
  'UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND berry_id = ? AND quantity >= ?'
);

const stmtAddCoins = db.prepare(
  'UPDATE players SET coins = coins + ? WHERE user_id = ?'
);

const stmtResetQuantityForUser = db.prepare(
  'UPDATE inventory SET quantity = 0 WHERE user_id = ?'
);

const stmtGetPlayerBerryIds = db.prepare(
  'SELECT berry_id FROM inventory WHERE user_id = ? AND (quantity > 0 OR times_rolled > 0)'
);

const stmtDeleteInventory = db.prepare(
  'DELETE FROM inventory WHERE user_id = ?'
);

const stmtDeletePlayer = db.prepare(
  'DELETE FROM players WHERE user_id = ?'
);

const stmtDeleteAllPlayers = db.prepare('DELETE FROM players');
const stmtDeleteAllInventory = db.prepare('DELETE FROM inventory');

const stmtGetAllPlayerIds = db.prepare(
  'SELECT user_id FROM players'
);

const stmtGetUniqueBerriesCount = db.prepare(
  'SELECT COUNT(*) AS count FROM inventory WHERE user_id = ? AND times_rolled > 0'
);

const stmtGetMostRolledBerry = db.prepare(
  'SELECT berry_id FROM inventory WHERE user_id = ? AND times_rolled > 0 ORDER BY times_rolled DESC LIMIT 1'
);

// ============================================================
// Exported functions
// ============================================================

/**
 * Get a player by user ID.
 * @param {string} userId
 * @returns {object|null}
 */
function getPlayer(userId) {
  return stmtGetPlayer.get(userId) || null;
}

/**
 * Create a new player record.
 * @param {string} userId
 * @param {string} username
 * @param {string|null} avatarUrl
 */
function createPlayer(userId, username, avatarUrl) {
  stmtCreatePlayer.run(userId, username, avatarUrl || null);
}

/**
 * Update specific columns on a player record.
 * @param {string} userId
 * @param {object} data - key/value pairs to update, e.g. { coins: 100 }
 */
function updatePlayer(userId, data) {
  const keys = Object.keys(data);
  if (keys.length === 0) return;

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => data[k]);
  values.push(userId);

  db.prepare(`UPDATE players SET ${setClause} WHERE user_id = ?`).run(...values);
}

/**
 * Increment total_rolls by 1 and return the new total.
 * @param {string} userId
 * @returns {number}
 */
function incrementRolls(userId) {
  stmtIncrementRolls.run(userId);
  const row = stmtGetTotalRolls.get(userId);
  return row ? row.total_rolls : 0;
}

/**
 * Add a berry to a player's inventory.
 * Increments quantity and times_rolled. Sets first_rolled_at if new.
 * @param {string} userId
 * @param {string} berryId
 * @returns {{ isNew: boolean, quantity: number, timesRolled: number }}
 */
function addBerry(userId, berryId) {
  const existing = stmtGetInventoryEntry.get(userId, berryId);

  if (existing) {
    stmtAddBerryUpdate.run(userId, berryId);
    return {
      isNew: false,
      quantity: existing.quantity + 1,
      timesRolled: existing.times_rolled + 1
    };
  } else {
    stmtAddBerryInsert.run(userId, berryId);
    return {
      isNew: true,
      quantity: 1,
      timesRolled: 1
    };
  }
}

/**
 * Get all inventory rows for a user.
 * @param {string} userId
 * @returns {object[]}
 */
function getInventory(userId) {
  return stmtGetInventory.all(userId);
}

/**
 * Get the quantity of a specific berry for a user.
 * @param {string} userId
 * @param {string} berryId
 * @returns {number}
 */
function getBerryCount(userId, berryId) {
  const row = stmtGetBerryCount.get(userId, berryId);
  return row ? row.quantity : 0;
}

/**
 * Sell a specific quantity of a berry. Decreases quantity and increases coins.
 * @param {string} userId
 * @param {string} berryId
 * @param {number} quantity
 * @param {number} totalPrice
 * @returns {boolean} success
 */
function sellBerries(userId, berryId, quantity, totalPrice) {
  const txn = db.transaction(() => {
    const result = stmtSellDecrease.run(quantity, userId, berryId, quantity);
    if (result.changes === 0) return false;
    stmtAddCoins.run(totalPrice, userId);
    return true;
  });
  return txn();
}

/**
 * Sell all berries in inventory. Sets all quantities to 0, adds totalPrice to coins.
 * @param {string} userId
 * @param {object[]} berries - full berries array (unused here, price calculated by caller)
 * @param {number} totalPrice
 */
function sellAllBerries(userId, berries, totalPrice) {
  const txn = db.transaction(() => {
    stmtResetQuantityForUser.run(userId);
    stmtAddCoins.run(totalPrice, userId);
  });
  txn();
}

/**
 * Get an array of berry_id strings that the user has (quantity > 0 OR times_rolled > 0).
 * @param {string} userId
 * @returns {string[]}
 */
function getPlayerBerryIds(userId) {
  const rows = stmtGetPlayerBerryIds.all(userId);
  return rows.map(r => r.berry_id);
}

/**
 * Delete a player and all their inventory data.
 * @param {string} userId
 */
function deletePlayerData(userId) {
  const txn = db.transaction(() => {
    stmtDeleteInventory.run(userId);
    stmtDeletePlayer.run(userId);
  });
  txn();
}

/**
 * Delete all players and all inventory data.
 */
function deleteAllData() {
  const txn = db.transaction(() => {
    stmtDeleteAllInventory.run();
    stmtDeleteAllPlayers.run();
  });
  txn();
}

/**
 * Get an array of all player user IDs.
 * @returns {string[]}
 */
function getAllPlayerIds() {
  const rows = stmtGetAllPlayerIds.all();
  return rows.map(r => r.user_id);
}

/**
 * Add coins to a player.
 * @param {string} userId
 * @param {number} amount
 */
function giveCoins(userId, amount) {
  stmtAddCoins.run(amount, userId);
}

/**
 * Get the count of unique berries ever rolled (times_rolled > 0).
 * @param {string} userId
 * @returns {number}
 */
function getUniqueBerriesCount(userId) {
  const row = stmtGetUniqueBerriesCount.get(userId);
  return row ? row.count : 0;
}

/**
 * Get the berry_id with the highest times_rolled for a user.
 * @param {string} userId
 * @returns {string|null}
 */
function getMostRolledBerry(userId) {
  const row = stmtGetMostRolledBerry.get(userId);
  return row ? row.berry_id : null;
}

/**
 * Get all players sorted by rolls descending for leaderboard.
 * @returns {object[]}
 */
function getLeaderboardByRolls() {
  return db.prepare('SELECT user_id, username, total_rolls FROM players ORDER BY total_rolls DESC').all();
}

/**
 * Get all players sorted by coins descending for leaderboard.
 * @returns {object[]}
 */
function getLeaderboardByCoins() {
  return db.prepare('SELECT user_id, username, coins FROM players ORDER BY coins DESC').all();
}

/**
 * Get inventory entries for leaderboard.
 * @returns {object[]}
 */
function getPlayersInventoryForLeaderboard() {
  return db.prepare('SELECT user_id, berry_id, times_rolled FROM inventory WHERE times_rolled > 0').all();
}

/**
 * Get global game stats.
 * @returns {object}
 */
function getGlobalStats() {
  const rolls = db.prepare('SELECT SUM(total_rolls) AS total FROM players').get().total || 0;
  const coins = db.prepare('SELECT SUM(coins) AS total FROM players').get().total || 0;
  const players = db.prepare('SELECT COUNT(*) AS count FROM players').get().count || 0;
  const berryStats = db.prepare('SELECT berry_id, SUM(times_rolled) AS rolled FROM inventory GROUP BY berry_id').all();
  return { rolls, coins, players, berryStats };
}

module.exports = {
  db,
  getPlayer,
  createPlayer,
  updatePlayer,
  incrementRolls,
  addBerry,
  getInventory,
  getBerryCount,
  sellBerries,
  sellAllBerries,
  getPlayerBerryIds,
  deletePlayerData,
  deleteAllData,
  getAllPlayerIds,
  giveCoins,
  getUniqueBerriesCount,
  getMostRolledBerry,
  getLeaderboardByRolls,
  getLeaderboardByCoins,
  getPlayersInventoryForLeaderboard,
  getGlobalStats
};
