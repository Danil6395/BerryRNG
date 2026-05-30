const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { getPlayer, createPlayer, incrementRolls, addBerry } = require('../database');
const { rollBerry } = require('../utils/rng');
const { RARITIES, UPGRADES, SUPER_LUCK_INTERVAL } = require('../config');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function handleSpin(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;
  const username = interaction.user.username;
  const avatarURL = interaction.user.displayAvatarURL({ dynamic: true, size: 256 });

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, username, avatarURL);
    player = getPlayer(userId);
  }

  // Increment rolls
  const newTotal = incrementRolls(userId);
  player.total_rolls = newTotal;

  // Roll berry
  const { berry, isSuperLuck } = rollBerry(player);

  // Add to inventory
  const { isNew, quantity, timesRolled } = addBerry(userId, berry.id);

  // Get rarity info from config
  const rarity = RARITIES[berry.rarity];
  const rarityEmoji = rarity ? rarity.emoji : '⚪';
  const rarityColor = rarity ? rarity.color : 0x95A5A6;
  const rarityName = rarity ? rarity.name : berry.rarity;

  // Build description
  let description = '';
  if (isSuperLuck) {
    description += '⭐ **СУПЕР-УДАЧА!** ⭐\n\n';
  }
  description += `${rarityEmoji} **${rarityName}**\n`;
  description += `🎲 Шанс: **1 in ${formatNumber(berry.chance)}**\n`;
  description += `🔄 Ролл #**${formatNumber(player.total_rolls)}**\n`;
  description += `📦 У вас: **${formatNumber(quantity)}** шт.\n`;
  description += `📊 Выбито всего: **${formatNumber(timesRolled)}** раз`;

  const embed = new EmbedBuilder()
    .setTitle(`${rarityEmoji} ${berry.name}`)
    .setDescription(description)
    .setColor(rarityColor)
    .setThumbnail(`attachment://${berry.file}`)
    .setTimestamp();

  if (isNew) {
    embed.addFields(
      { name: '🆕 НОВИНКА!', value: '━━━━━━━━━━━━━━━━━━━━', inline: false },
      { name: '📝 Описание', value: berry.description, inline: false },
      { name: '🌍 Место зарождения', value: berry.origin, inline: true },
      { name: '📅 Сезон', value: berry.season, inline: true },
      { name: '🍽️ Съедобность', value: berry.edible ? '✅ Съедобная' : '❌ Несъедобная', inline: true },
    );
  }

  const assetsPath = path.join(__dirname, '..', '..', 'assets');
  const attachment = new AttachmentBuilder(path.join(assetsPath, berry.file), { name: berry.file });

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

  await interaction.update({ embeds: [embed], components: [row], files: [attachment] });
}

module.exports = { handleSpin };
