const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer, createPlayer, getInventory, sellBerries } = require('../database');
const berries = require('../berries');
const { RARITIES, UPGRADES } = require('../config');

function formatNumber(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('💰 Продать ягоды')
    .addStringOption(option =>
      option
        .setName('berry')
        .setDescription('Название ягоды')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Количество')
        .setRequired(true)
        .setMinValue(1)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const userId = interaction.user.id;

    const inventory = getInventory(userId);
    const inventoryMap = new Map();
    for (const item of inventory) {
      if (item.quantity > 0) {
        inventoryMap.set(item.berry_id, item.quantity);
      }
    }

    const choices = berries
      .filter(b => {
        const hasInInventory = inventoryMap.has(b.id);
        const matchesSearch = b.name.toLowerCase().includes(focused) || b.id.toLowerCase().includes(focused);
        return hasInInventory && matchesSearch;
      })
      .slice(0, 25)
      .map(b => {
        const rarity = RARITIES[b.rarity];
        return {
          name: `${rarity?.emoji || ''} ${b.name} (x${inventoryMap.get(b.id)})`,
          value: b.id,
        };
      });

    await interaction.respond(choices);
  },

  async execute(interaction) {
    const berryId = interaction.options.getString('berry'); // string ID, not int!
    const amount = interaction.options.getInteger('amount');
    const userId = interaction.user.id;

    let player = getPlayer(userId);
    if (!player) {
      createPlayer(userId, interaction.user.username, interaction.user.displayAvatarURL());
      player = getPlayer(userId);
    }

    const berry = berries.find(b => b.id === berryId);
    if (!berry) {
      return interaction.reply({ content: '❌ Ягода не найдена.', ephemeral: true });
    }

    const inventory = getInventory(userId);
    const invItem = inventory.find(i => i.berry_id === berryId);

    if (!invItem || invItem.quantity < amount) {
      const have = invItem ? invItem.quantity : 0;
      return interaction.reply({
        content: `❌ Недостаточно ягод **${berry.name}**. У вас: ${have}.`,
        ephemeral: true,
      });
    }

    const sellLevel = player.sell_bonus_level || 1;
    const sellMult = UPGRADES.sell_bonus.multipliers[sellLevel - 1];
    const earned = Math.floor(berry.price * amount * sellMult);

    const success = sellBerries(userId, berryId, amount, earned);
    if (!success) {
      return interaction.reply({ content: '❌ Ошибка продажи.', ephemeral: true });
    }

    const rarity = RARITIES[berry.rarity];

    const embed = new EmbedBuilder()
      .setTitle('💰 Продажа')
      .setDescription(
        `Вы продали **${amount}x** ${rarity?.emoji || ''} **${berry.name}**\n\n` +
        `💵 Заработано: **${formatNumber(earned)}** 🪙\n` +
        `📈 Бонус продажи: **x${sellMult}**`
      )
      .setColor(0xF1C40F)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
