const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { giveCoins, getAllPlayerIds, getPlayer } = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveberry')
        .setDescription('🎁 Выдать монеты игроку (Админ)')
        .addStringOption(option =>
            option
                .setName('target')
                .setDescription('Упоминание пользователя или "all" для всех')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Количество монет')
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ У вас нет прав.',
                ephemeral: true,
            });
        }

        const target = interaction.options.getString('target').trim();
        const amount = interaction.options.getInteger('amount');

        if (target.toLowerCase() === 'all') {
            const playerIds = getAllPlayerIds();

            for (const id of playerIds) {
                giveCoins(id, amount);
            }

            const embed = new EmbedBuilder()
                .setTitle('🎁 Монеты выданы')
                .setDescription(
                    `Выдано **${amount.toLocaleString()}** монет всем игрокам (**${playerIds.length}** чел.)`
                )
                .setColor(0x2ECC71)
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
            .setTitle('🎁 Монеты выданы')
            .setDescription(`Выдано **${amount.toLocaleString()}** монет игроку <@${userId}>.`)
            .setColor(0x2ECC71)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
