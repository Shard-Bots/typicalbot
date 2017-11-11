const Command = require("../../structures/Command");

module.exports = class extends Command {
    constructor(...args) {
        super(...args, {
            description: "Makes the bot ignore commands or invites in a channel.",
            usage: "ignore ['commands'|'invites']",
            mode: "strict",
            permission: 3
        });
    }

    execute(message, response, permissionLevel) {
        const args = /ignore\s+(commands|invites)/i.exec(message.content);
        if (!args) return response.usage(this);

        const commands = args[1] === "commands", invites = args[1] === "invites";

        if (commands && message.guild.settings.ignored.commands.includes(message.channel.id)) return response.error("This channel is already ignoring commands.");
        if (invites && message.guild.settings.ignored.invites.includes(message.channel.id)) return response.error("This channel is already ignoring invites.");

        const newArray = message.guild.settings.ignored[commands ? "commands" : "invites"];
        newArray.push(message.channel.id);

        this.client.settings.update(message.guild.id, { ignored: { [commands ? "commands" : "invites"]: newArray }}).then(() => response.success(`Now ignoring ${commands ? "commands" : "invites"}.`));
    }
};