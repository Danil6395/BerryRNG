const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { getPlayer, createPlayer, incrementRolls, addBerry, updatePlayer } = require('../database');
const { rollBerry } = require('../utils/rng');
const { RARITIES, UPGRADES, SUPER_LUCK_INTERVAL } = require('../config');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const events = require('../events');

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

  // Check for active pollen and consume it
  let pollenMultiplier = 1;
  let pollenUsed = null;
  if (player.active_pollen === 'golden') {
    pollenMultiplier = 2500;
    pollenUsed = '🟡 Обычная пыльца (x2500)';
    updatePlayer(userId, { active_pollen: null });
  } else if (player.active_pollen === 'ultra') {
    pollenMultiplier = 30000;
    pollenUsed = '🔵 Ультра пыльца (x30000)';
    updatePlayer(userId, { active_pollen: null });
  }

  // Increment rolls
  const newTotal = incrementRolls(userId);
  player.total_rolls = newTotal;

  // Roll berry with pollen multiplier
  const { berry, isSuperLuck } = rollBerry(player, pollenMultiplier);

  // Add to inventory
  const { isNew, quantity, timesRolled } = addBerry(userId, berry.id);

  // Re-fetch player for latest pollen counts
  player = getPlayer(userId);

  // Get rarity info from config
  const rarity = RARITIES[berry.rarity];
  const rarityEmoji = rarity ? rarity.emoji : '⚪';
  const rarityColor = rarity ? rarity.color : 0x95A5A6;
  const rarityName = rarity ? rarity.name : berry.rarity;

  // Build description
  let description = '';
  if (pollenUsed) {
    description += `✨ **${pollenUsed}** ✨\n\n`;
  }
  if (isSuperLuck) {
    description += '⭐ **СУПЕР-УДАЧА!** ⭐\n\n';
  }

  // Show active events
  const activeEvents = events.getActiveEvents();
  if (activeEvents.length > 0) {
    for (const ev of activeEvents) {
      if (ev.type === 'lucky') description += `🍀 Ивент удачи: **x${ev.multiplier}**\n`;
      if (ev.type === 'secrets') description += `💀 Ивент ABUSE активен!\n`;
    }
    description += '\n';
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

  // Pollen state for buttons
  const hasPollen = player.active_pollen !== null;
  const hasGolden = (player.golden_pollen || 0) > 0;
  const hasUltra = (player.ultra_pollen || 0) > 0;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spin:${ownerId}`)
      .setLabel('🎰 Крутить')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`activate_golden:${ownerId}`)
      .setEmoji('🟡')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(hasPollen || !hasGolden),
    new ButtonBuilder()
      .setCustomId(`activate_ultra:${ownerId}`)
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(hasPollen || !hasUltra),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
    .setCustomId(`back_menu:${ownerId}`)
    .setLabel('🔙 Меню')
    .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row1,row2], files: [attachment] });
}

async function handleActivatePollen(interaction, type) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) return;

  // Check pollen not already active
  if (player.active_pollen) {
    return interaction.reply({
      content: '❌ У вас уже активирована пыльца! Используйте её прокрутив рулетку.',
      ephemeral: true,
    });
  }

  if (type === 'golden') {
    if ((player.golden_pollen || 0) <= 0) {
      return interaction.reply({ content: '❌ У вас нет обычной пыльцы.', ephemeral: true });
    }
    updatePlayer(userId, {
      golden_pollen: player.golden_pollen - 1,
      active_pollen: 'golden'
    });
  } else {
    if ((player.ultra_pollen || 0) <= 0) {
      return interaction.reply({ content: '❌ У вас нет ультра пыльцы.', ephemeral: true });
    }
    updatePlayer(userId, {
      ultra_pollen: player.ultra_pollen - 1,
      active_pollen: 'ultra'
    });
  }

  // Re-fetch
  player = getPlayer(userId);

  const pollenName = type === 'golden' ? '🟡 Обычная пыльца (x2500)' : '🔵 Ультра пыльца (x30000)';

  const embed = new EmbedBuilder()
    .setTitle(`✨ ${pollenName} активирована!`)
    .setDescription(`Следующий ролл получит бонус удачи.\nНажмите **«Крутить»** чтобы использовать!`)
    .setColor(type === 'golden' ? 0xFFD700 : 0x3498DB)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spin:${ownerId}`)
      .setLabel('🎰 Крутить')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [] });
}

module.exports = { handleSpin, handleActivatePollen };
