const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { startEvent, getActiveEvents } = require('../events');

function formatTime(seconds) {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}ч ${m}м`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}м ${s}с`;
  }
  return `${seconds}с`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin-abuse')
    .setDescription('⚡ Запустить глобальный ивент (только владелец)')
    .addStringOption(option =>
      option
        .setName('event')
        .setDescription('Тип ивента')
        .setRequired(true)
        .addChoices(
          { name: '🍀 Удача (lucky)', value: 'lucky' },
          { name: '🪙 Монеты (coins)', value: 'coins' },
          { name: '💀 ABUSE Секретки (secrets)', value: 'secrets' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('time')
        .setDescription('Длительность в минутах')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1440)
    )
    .addNumberOption(option =>
      option
        .setName('multiplier')
        .setDescription('Множитель (для lucky/coins)')
        .setRequired(false)
        .setMinValue(1.1)
    ),

  async execute(interaction) {
    // OWNER_ID check
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({
        content: '❌ Только владелец бота может использовать эту команду.',
        ephemeral: true,
      });
    }

    const eventType = interaction.options.getString('event');
    const multiplier = interaction.options.getNumber('multiplier');
    const timeMinutes = interaction.options.getInteger('time');
    const durationMs = timeMinutes * 60 * 1000;

    if ((eventType === 'lucky' || eventType === 'coins') && !multiplier) {
      return interaction.reply({
        content: '❌ Для ивентов lucky/coins укажите множитель.',
        ephemeral: true,
      });
    }

    const success = startEvent(eventType, {
      multiplier: multiplier || 1,
      durationMs
    });

    if (!success) {
      return interaction.reply({
        content: `❌ Ивент **${eventType}** уже активен! Дождитесь его завершения.`,
        ephemeral: true,
      });
    }

    let description = '';
    if (eventType === 'lucky') {
      description = `🍀 **ИВЕНТ УДАЧИ ЗАПУЩЕН!**\n\n` +
        `Множитель удачи: **x${multiplier}**\n` +
        `Длительность: **${formatTime(timeMinutes * 60)}**\n\n` +
        `Все игроки получают увеличенный шанс на редкие ягоды!`;
    } else if (eventType === 'coins') {
      description = `🪙 **ИВЕНТ МОНЕТ ЗАПУЩЕН!**\n\n` +
        `Множитель продажи: **x${multiplier}**\n` +
        `Длительность: **${formatTime(timeMinutes * 60)}**\n\n` +
        `Все игроки получают увеличенный доход с продажи!`;
    } else {
      description = `💀 **ИВЕНТ ABUSE СЕКРЕТОК ЗАПУЩЕН!**\n\n` +
        `Длительность: **${formatTime(timeMinutes * 60)}**\n\n` +
        `ABUSE-секретки теперь могут выпадать при прокрутке!`;
    }

    const embed = new EmbedBuilder()
      .setTitle('⚡ Глобальный ивент')
      .setDescription(description)
      .setColor(0xFF4500)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
