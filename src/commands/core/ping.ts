import Command from '../../structures/Command';
import { TypicalMessage } from '../../types/typicalbot';
import Constants from '../../utility/Constants';

export default class extends Command {
    dm = true;
    mode = Constants.Modes.STRICT;

    async execute(message: TypicalMessage) {
        const ping = await message.send(message.translate('core/ping:CALCULATING'));

        return ping.edit(message.translate('core/ping:RESPONSE', {
            command: ping.createdTimestamp - message.createdTimestamp,
            api: Math.floor(this.client.ws.ping)
        }));
    }
}
