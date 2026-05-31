const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { getPlayer, createPlayer, updatePlayer, getInventory, findLegendaryInInventory, removeBerry } = require('../database');
const berries = require('../berries');
const { RARITIES } = require('../config');

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

async function handleSeller(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  // Check if player has legendary berries for golden pollen
  const legendaryBerry = findLegendaryInInventory(userId, berries);
  const hasLegendary = legendaryBerry !== null;
  const hasEnoughGolden = (player.golden_pollen || 0) >= 3;

  const embed = new EmbedBuilder()
    .setTitle('🐻 Медведь Григорий')
    .setDescription(
      `*«Приветствую, путник! У меня есть особый товар...»*\n\n` +
      `Григорий торгует волшебной пыльцой, усиливающей вашу удачу.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🟡 **Обычная пыльца** — x2500|1\n` +
      `Цена: **1 Легендарная ягода** 🟡\n` +
      `У вас: **${player.golden_pollen || 0}** шт.\n\n` +
      `🔵 **Ультра пыльца** — x30000|1\n` +
      `Цена: **3 обычных пыльцы** 🟡→🔵\n` +
      `У вас: **${player.ultra_pollen || 0}** шт.\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      (player.active_pollen ? `⚡ Активна: **${player.active_pollen === 'golden' ? '🟡 Обычная' : '🔵 Ультра'}** (следующий ролл)` : `⚡ Нет активной пыльцы`)
    )
    .setThumbnail('attachment://bear.png')
    .setColor(0x8B4513)
    .setTimestamp();

  const assetsPath = path.join(__dirname, '..', '..', 'assets');
  const attachment = new AttachmentBuilder(path.join(assetsPath, 'bear.png'), { name: 'bear.png' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`buy_golden_pollen:${ownerId}`)
      .setLabel(`🟡 Купить`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(!hasLegendary),
    new ButtonBuilder()
      .setCustomId(`buy_ultra_pollen:${ownerId}`)
      .setLabel(`🔵 Купить`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(!hasEnoughGolden),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🔙 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [attachment] });
}

async function handleBuyGoldenPollen(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  const legendaryBerry = findLegendaryInInventory(userId, berries);
  if (!legendaryBerry) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Нет легендарных ягод')
      .setDescription('У вас нет ни одной легендарной ягоды для обмена.')
      .setColor(0xE74C3C)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`seller:${ownerId}`)
        .setLabel('🔙 К Григорию')
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.update({ embeds: [embed], components: [row], files: [] });
  }

  // Remove 1 legendary berry, add 1 golden pollen
  removeBerry(userId, legendaryBerry.berryId);
  updatePlayer(userId, { golden_pollen: (player.golden_pollen || 0) + 1 });

  const rarity = RARITIES['L'];

  const embed = new EmbedBuilder()
    .setTitle('🟡 Обычная пыльца получена!')
    .setDescription(
      `Обменяно: ${rarity.emoji} **${legendaryBerry.berryName}** → 🟡 **Обычная пыльца**\n\n` +
      `Теперь у вас: **${(player.golden_pollen || 0) + 1}** 🟡 пыльцы`
    )
    .setColor(0xFFD700)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`seller:${ownerId}`)
      .setLabel('🔙 К Григорию')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🏠 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [] });
}

async function handleBuyUltraPollen(interaction) {
  const userId = interaction.user.id;
  const parts = interaction.customId.split(':');
  const ownerId = parts[1] || userId;

  let player = getPlayer(userId);
  if (!player) {
    createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
    player = getPlayer(userId);
  }

  const goldenCount = player.golden_pollen || 0;
  if (goldenCount < 3) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Недостаточно обычной пыльцы')
      .setDescription(`Нужно **3** 🟡 обычных пыльцы. У вас: **${goldenCount}**.`)
      .setColor(0xE74C3C)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`seller:${ownerId}`)
        .setLabel('🔙 К Григорию')
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.update({ embeds: [embed], components: [row], files: [] });
  }

  // Remove 3 golden, add 1 ultra
  updatePlayer(userId, {
    golden_pollen: goldenCount - 3,
    ultra_pollen: (player.ultra_pollen || 0) + 1
  });

  const embed = new EmbedBuilder()
    .setTitle('🔵 Ультра пыльца получена!')
    .setDescription(
      `Обменяно: **3** 🟡 → 🔵 **Ультра пыльца**\n\n` +
      `Теперь у вас: **${(player.ultra_pollen || 0) + 1}** 🔵 ультра пыльцы`
    )
    .setColor(0x3498DB)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`seller:${ownerId}`)
      .setLabel('🔙 К Григорию')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`back_menu:${ownerId}`)
      .setLabel('🏠 Меню')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({ embeds: [embed], components: [row], files: [] });
}

module.exports = { handleSeller, handleBuyGoldenPollen, handleBuyUltraPollen };
