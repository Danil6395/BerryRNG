const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPlayer, createPlayer, getInventory, sellAllBerries } = require('../database');
const berries = require('../berries');
const { RARITIES, UPGRADES } = require('../config');

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Rarity display order
const RARITY_ORDER = ['C', 'U', 'R', 'E', 'L', 'M', 'CS', 'S'];

async function handleInventory(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  const inventory = getInventory(userId);
  const sellLevel = player.sell_bonus_level || 1;
  const sellMult = UPGRADES.sell_bonus.multipliers[sellLevel - 1];

  // Group by rarity
  const grouped = {};
  let totalValue = 0;
  let hasItems = false;

  for (const item of inventory) {
    if (item.quantity <= 0) continue;
    hasItems = true;

    const berry = berries.find(b => b.id === item.berry_id);
    if (!berry) continue;

    if (!grouped[berry.rarity]) grouped[berry.rarity] = [];

    const itemValue = Math.floor(berry.price * item.quantity * sellMult);
    totalValue += itemValue;

    grouped[berry.rarity].push({
      name: berry.name,
      quantity: item.quantity,
      value: itemValue,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('📦 Инвентарь')
    .setColor(0xF39C12)
    .setTimestamp();

  if (!hasItems) {
    embed.setDescription('📦 Инвентарь пуст!\nКрутите рулетку чтобы собрать ягоды.');
  } else {
    let desc = `💰 Бонус продажи: **x${sellMult}**\n🪙 Монет: **${formatNumber(player.coins)}**\n`;

    for (const rarityKey of RARITY_ORDER) {
      if (!grouped[rarityKey] || grouped[rarityKey].length === 0) continue;
      const rarity = RARITIES[rarityKey];

      desc += `\n**${rarity.emoji} ${rarity.name}**\n`;
      for (const item of grouped[rarityKey]) {
        desc += `${rarity.emoji} ${item.name} — **${formatNumber(item.quantity)}** шт. (${formatNumber(item.value)} 🪙)\n`;
      }
    }

    desc += `\n━━━━━━━━━━━━━━━━━━━━\n💎 **Итого за всё: ${formatNumber(totalValue)} 🪙**`;
    embed.setDescription(desc);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sell_all:${ownerId}`)
      .setLabel(`💰 Продать ВСЁ (${formatNumber(totalValue)} 🪙)`)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hasItems),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [] });
}

async function handleSellAll(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  const inventory = getInventory(userId);
  const sellLevel = player.sell_bonus_level || 1;
  const sellMult = UPGRADES.sell_bonus.multipliers[sellLevel - 1];

  let totalEarned = 0;
  let totalItems = 0;

  for (const item of inventory) {
    if (item.quantity <= 0) continue;
    const berry = berries.find(b => b.id === item.berry_id);
    if (!berry) continue;
    totalEarned += Math.floor(berry.price * item.quantity * sellMult);
    totalItems += item.quantity;
  }

  if (totalItems === 0) {
    const embed = new EmbedBuilder()
      .setTitle('💰 Продажа')
      .setDescription('Нечего продавать — инвентарь пуст.')
      .setColor(0xE74C3C)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`back_menu:${ownerId}`)
        .setLabel('🔙 Меню')
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.update({ embeds: [embed], components: [row], files: [] });
  }

  // Sell all (pass berries array as 2nd arg per DB signature)
  sellAllBerries(userId, berries, totalEarned);

  // Re-fetch player to update coins balance
  player = getPlayer(userId);

  const embed = new EmbedBuilder()
    .setTitle('💰 Всё продано!')
    .setDescription(
      `Продано **${formatNumber(totalItems)}** ягод.\n\n` +
      `💵 Заработано: **${formatNumber(totalEarned)}** 🪙\n` +
      `📈 Бонус продажи: **x${sellMult}**`
    )
    .setColor(0x2ECC71)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spin:${ownerId}`)
      .setLabel('🎰 Крутить')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [] });
}

module.exports = { handleInventory, handleSellAll };
