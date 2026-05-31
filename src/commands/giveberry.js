const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { giveCoins, getAllPlayerIds, getPlayer } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveberry')
        .setDescription('🎁 Выдать/забрать монеты игроку (Владелец)')
        .addStringOption(option =>
            option
                .setName('target')
                .setDescription('Упоминание пользователя или "all" для всех')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Количество монет (отрицательное = забрать)')
                .setRequired(true)
        ),

    async execute(interaction) {
        // OWNER_ID check
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({
                content: '❌ Только владелец бота может использовать эту команду.',
                ephemeral: true,
            });
        }

        const target = interaction.options.getString('target').trim();
        const amount = interaction.options.getInteger('amount');

        if (amount === 0) {
            return interaction.reply({
                content: '❌ Нельзя выдать 0 монет.',
                ephemeral: true,
            });
        }

        const isNegative = amount < 0;
        const actionWord = isNegative ? 'Забрано' : 'Выдано';
        const displayAmount = Math.abs(amount);

        if (target.toLowerCase() === 'all') {
            const playerIds = getAllPlayerIds();

            for (const id of playerIds) {
                giveCoins(id, amount);
            }

            const embed = new EmbedBuilder()
                .setTitle(isNegative ? '💸 Монеты забраны' : '🎁 Монеты выданы')
                .setDescription(
                    `${actionWord} **${displayAmount.toLocaleString()}** монет у всех игроков (**${playerIds.length}** чел.)`
                )
                .setColor(isNegative ? 0xE74C3C : 0x2ECC71)
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // Parse user ID from mention or raw ID
        const idMatch = target.match(/^<@!?(\d+)>$/) || target.match(/^(\d+)$/);
        if (!idMatch) {
            return interaction.reply({
                content: '❌ Неверный формат. Укажите упоминание пользователя или его ID.',
                ephemeral: true,
            });
        }

        const userId = idMatch[1];
        const player = getPlayer(userId);
        if (!player) {
            return interaction.reply({
                content: `❌ Игрок <@${userId}> ещё не начал играть.`,
                ephemeral: true,
            });
        }

        giveCoins(userId, amount);

        const embed = new EmbedBuilder()
            .setTitle(isNegative ? '💸 Монеты забраны' : '🎁 Монеты выданы')
            .setDescription(`${actionWord} **${displayAmount.toLocaleString()}** монет у игрока <@${userId}>.`)
            .setColor(isNegative ? 0xE74C3C : 0x2ECC71)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
