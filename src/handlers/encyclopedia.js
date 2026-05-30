const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { getPlayer, createPlayer, getInventory } = require('../database');
const berries = require('../berries');
const { RARITIES } = require('../config');

// Rarity order by code
const RARITY_ORDER = ['C', 'U', 'R', 'E', 'L', 'M', 'CS', 'S'];

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function handleEncyclopedia(interaction, page = 0) {
  const userId = interaction.user.id;
  const parts = interaction.customId ? interaction.customId.split(':') : [];
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  const inventory = getInventory(userId);

  // Get discovered berries (times_rolled > 0)
  const discoveredMap = new Map();
  for (const item of inventory) {
    if (item.times_rolled > 0) {
      discoveredMap.set(item.berry_id, item);
    }
  }

  // Get berry objects, sorted by rarity order then chance
  const discoveredBerries = berries
    .filter(b => discoveredMap.has(b.id))
    .sort((a, b) => {
      const rarityDiff = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      if (rarityDiff !== 0) return rarityDiff;
      return a.chance - b.chance;
    });

  if (discoveredBerries.length === 0) {
    const embed = new EmbedBuilder()
      .setTitle('📖 Энциклопедия')
      .setDescription('Энциклопедия пуста!\nКрутите рулетку чтобы открыть ягоды!')
      .setColor(0x95A5A6)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`back_menu:${ownerId}`)
        .setLabel('🔙 Меню')
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.update({ embeds: [embed], components: [row], files: [] });
  }

  const totalPages = discoveredBerries.length;
  if (page < 0) page = 0;
  if (page >= totalPages) page = totalPages - 1;

  const berry = discoveredBerries[page];
  const invItem = discoveredMap.get(berry.id);
  const timesRolled = invItem ? invItem.times_rolled : 0;
  const quantity = invItem ? invItem.quantity : 0;

  const rarity = RARITIES[berry.rarity];
  const rarityEmoji = rarity ? rarity.emoji : '⚪';
  const rarityColor = rarity ? rarity.color : 0x95A5A6;
  const rarityName = rarity ? rarity.name : berry.rarity;

  const embed = new EmbedBuilder()
    .setTitle(`📖 ${berry.name}`)
    .setThumbnail(`attachment://${berry.file}`)
    .addFields(
      { name: '🏷️ Редкость', value: `${rarityEmoji} ${rarityName}`, inline: true },
      { name: '🎲 Шанс', value: `1 in ${formatNumber(berry.chance)}`, inline: true },
      { name: '🪙 Цена', value: `${formatNumber(berry.price)}`, inline: true },
      { name: '📝 Описание', value: berry.description, inline: false },
      { name: '🌍 Место зарождения', value: berry.origin, inline: true },
      { name: '📅 Сезон', value: berry.season, inline: true },
      { name: '🍽️ Съедобность', value: berry.edible ? '✅ Съедобная' : '❌ Несъедобная', inline: true },
      { name: '📊 Выбито вами', value: `${formatNumber(timesRolled)} раз`, inline: true },
      { name: '📦 В инвентаре', value: `${formatNumber(quantity)} шт.`, inline: true },
    )
    .setColor(rarityColor)
    .setFooter({ text: `📖 Энциклопедия • Страница ${page + 1} из ${totalPages}` })
    .setTimestamp();

  const assetsPath = path.join(__dirname, '..', '..', 'assets');
  const attachment = new AttachmentBuilder(path.join(assetsPath, berry.file), { name: berry.file });

  const isFirst = page === 0;
  const isLast = page >= totalPages - 1;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`enc_first:${ownerId}:${page}`)
      .setLabel('⏪')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFirst),
    new ButtonBuilder()
      .setCustomId(`enc_prev:${ownerId}:${page}`)
      .setLabel('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isFirst),
    new ButtonBuilder()
      .setCustomId(`enc_next:${ownerId}:${page}`)
      .setLabel('▶️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isLast),
    new ButtonBuilder()
      .setCustomId(`enc_last:${ownerId}:${page}`)
      .setLabel('⏩')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isLast),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙')
      .setStyle(ButtonStyle.Danger),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [attachment] });
}

async function handleEncyclopediaNav(interaction, direction, currentPage) {
  let newPage = currentPage;
  switch (direction) {
    case 'first': newPage = 0; break;
    case 'prev': newPage = currentPage - 1; break;
    case 'next': newPage = currentPage + 1; break;
    case 'last': newPage = Infinity; break;
  }
  await handleEncyclopedia(interaction, newPage);
}

module.exports = { handleEncyclopedia, handleEncyclopediaNav };
