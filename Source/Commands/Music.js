const apikey = require("../Config.js").youtubekey;
const YouTubeAPI = require("simple-youtube-api");
const YouTube = new YouTubeAPI(apikey);

module.exports = {
    "youtube": {
        aliases: ["yts"],
        usage: {"command": "youtube <query>", "description": "Searches for a video on YouTube."},
        execute: (message, client) => {
            let match = /(?:youtube|yts)\s+(.+)/i.exec(message.content);
            if (!match) return message.channel.sendMessage(`${message.author} | \`❌\` | Invalid command usage.`);
            VideoSearch(client, message.guild.settings, match[1]).then(results => {
                if (!results.length) return message.channel.sendMessage(`${message.author} | \`❌\` | No results were found for the query **${match[1]}**.`);
                let video = results[0];
                message.channel.sendMessage(`${message.author} | **${video.title}** by **${video.channel.title}**:\n<${video.url}>`);
            }).catch(error => message.channel.sendMessage(`${message.author} | \`❌\` | ${errorMessage(error)}`));
        }
    },
    "play": {
        permission: 0,
        usage: {"command": "play <video_name/video_url>", "description": "Plays a video from YouTube."},
        execute: (message, client, level) => {
            if (!checkOverride(client, message.guild, message.author, "play", level)) return message.channel.sendMessage(`${message.author} | \`❌\` | Your permission level is too low to execute that command.`);
            let url = /(?:https?\:\/\/)?(?:(?:www|m)\.)?(?:youtube\.com|youtu\.be)\/.+/i.exec(message.content);
            let searchParam = /play\s+(.+)/i.exec(message.content);
            if (url) {
                return client.MusicUtil.ProcessVideo(message, url[0]);
            } else if (searchParam) {
                VideoSearch(client, message.guild.settings, searchParam[1]).then(results => {
                    if (!results.length) return message.channel.sendMessage(`${message.author} | \`❌\` | No results were found for the query **${searchParam[1]}**.`);
                    let video = results[0];
                    return client.MusicUtil.ProcessVideo(message, video.url);
                }).catch(error => message.channel.sendMessage(`${message.author} | \`❌\` | ${errorMessage(error)}`));
            } else {
                message.channel.sendMessage(`${message.author} | \`❌\` | Invalid command usage.`);
            }
        }
    },
    "queue": {
        permission: 0,
        usage: {"command": "queue", "description": "Displays the queue of songs to play."},
        execute: (message, client, level) => {
            let connection = message.guild.voiceConnection;
            if (!connection) return message.channel.sendMessage(`${message.author} | Nothing is playing.`);

            let stream = client.streams.get(message.guild.id);
            let queue = stream.queue;
            if (!queue.length) return message.channel.sendMessage(`${message.author} | The queue is empty.`);
            let short = text => client.functions.shorten(text), time = len => client.functions.length(len);

            let songs = queue.length > 10 ? queue.slice(0, 10) : queue;
            let content = songs.map(s => `● **${short(s.info.title)}** (${time(s.info.length_seconds)}) | Requested by **${s.message.author.username}**`).join("\n");
            let length = 0; songs.map(s => length += Number(s.length_seconds));

            message.channel.sendMessage(`**__Queue:__** There are ${queue.length} songs in the queue. The queue will last for **${time(length)}.**\n\n${content}${queue.length > 10 ? `\n*...and ${queue.length - 10} more.*` : ""}\n\n**Currently Playing:** ${short(stream.current.info.title)} (${time(stream.current.info.length_seconds)})`);
        }
    },
    "current": {
        permission: 0,
        usage: {"command": "current", "description": "Displays the currently playing song."},
        execute: (message, client, level) => {
            let connection = message.guild.voiceConnection;
            if (!connection) return message.channel.sendMessage(`${message.author} | Nothing is playing.`);

            let stream = client.streams.get(message.guild.id);
            let short = text => client.functions.shorten(text), time = len => client.functions.length(len);
            let remaining = stream.current.info.length_seconds - Math.floor(connection.player.dispatcher.time / 1000);
            message.channel.sendMessage(`**__Currently Playing:__** ${short(stream.current.info.title)} | ${time(remaining)} left`);
        }
    },
    "unqueue": {
        permission: 0,
        usage: {"command": "unqueue <queue_id>", "description": "Remove a song from the queue."},
        execute: (message, client, level) => {
            if (!checkOverride(client, message.guild, message.author, "unqueue", level)) return message.channel.sendMessage(`${message.author} | \`❌\` | Your permission level is too low to execute that command.`);
            let match = /unqueue\s+(\d+)/i.exec(message.content);
            if (!match) return message.channel.sendMessage(`${message.author} | \`❌\` | Invalid command usage.`);
            let queueid = match[1];

            let connection = message.guild.voiceConnection;
            if (!connection) return message.channel.sendMessage(`${message.author} | Nothing is playing.`);

            if (!same(connection, message.member)) return message.channel.sendMessage(`${message.author} | \`❌\` | You're not in the same voice channel as I am.`);

            let stream = client.streams.get(message.guild.id);
            let queue = stream.queue;
            let short = text => client.functions.shorten(text);
            let item = queue[queueid - 1];

            if (!item) return message.channel.sendMessage(`${message.author} | There is no video under that queue id.`);

            queue.splice(queue.indexOf(item));
            message.channel.sendMessage(`${message.author} | Removed **${short(item.info.title)}** from the queue.`);
        }
    },
    "skip": {
        permission: 0,
        usage: {"command": "skip", "description": "Skips the currently playing song."},
        execute: (message, client, level) => {
            if (!checkOverride(client, message.guild, message.author, "skip", level)) return message.channel.sendMessage(`${message.author} | \`❌\` | Your permission level is too low to execute that command.`);
            let connection = message.guild.voiceConnection;
            if (!connection) return message.channel.sendMessage(`${message.author} | Nothing is playing.`);

            if (!same(connection, message.member)) return message.channel.sendMessage(`${message.author} | \`❌\` | You're not in the same voice channel as I am.`);

            let stream = client.streams.get(message.guild.id);
            let short = text => client.functions.shorten(text);

            message.channel.sendMessage(`${message.author} | Skipped **${short(stream.current.info.title)}**.`).then(msg => {
                connection.player.dispatcher.end();
            });
        }
    },
    "pause": {
        permission: 0,
        usage: {"command": "pause", "description": "Pauses the song currently playing."},
        execute: (message, client, level) => {
            if (!checkOverride(client, message.guild, message.author, "pause_resume", level)) return message.channel.sendMessage(`${message.author} | \`❌\` | Your permission level is too low to execute that command.`);
            let connection = message.guild.voiceConnection;
            if (!connection) return message.channel.sendMessage(`${message.author} | Nothing is playing.`);

            if (!same(connection, message.member)) return message.channel.sendMessage(`${message.author} | \`❌\` | You're not in the same voice channel as I am.`);

            connection.player.dispatcher.pause();
            message.channel.sendMessage(`${message.author} | Paused.`);
        }
    },
    "resume": {
        permission: 0,
        usage: {"command": "resume", "description": "Resumes the song currently playing."},
        execute: (message, client, level) => {
            if (!checkOverride(client, message.guild, message.author, "pause_resume", level)) return message.channel.sendMessage(`${message.author} | \`❌\` | Your permission level is too low to execute that command.`);
            let connection = message.guild.voiceConnection;
            if (!connection) return message.channel.sendMessage(`${message.author} | Nothing is playing.`);

            if (!same(connection, message.member)) return message.channel.sendMessage(`${message.author} | \`❌\` | You're not in the same voice channel as I am.`);

            connection.player.dispatcher.resume();
            message.channel.sendMessage(`${message.author} | Resumed.`);
        }
    },
    "stop": {
        permission: 0,
        usage: {"command": "stop", "description": "Stops the currently playing song and clears the queue."},
        execute: (message, client, level) => {
            if (!checkOverride(client, message.guild, message.author, "stop", level)) return message.channel.sendMessage(`${message.author} | \`❌\` | Your permission level is too low to execute that command.`);
            let connection = message.guild.voiceConnection;
            if (!connection) return message.channel.sendMessage(`${message.author} | Nothing is playing.`);

            if (!same(connection, message.member)) return message.channel.sendMessage(`${message.author} | \`❌\` | You're not in the same voice channel as I am.`);

            let stream = client.streams.get(message.guild.id);

            stream.queue = [];
            connection.disconnect();
        }
    },
    "volume": {
        permission: 0,
        usage: {"command": "volume <number>", "description": "Stops the currently playing song and clears the queue."},
        execute: (message, client, level) => {
            if (!checkOverride(client, message.guild, message.author, "stop", level)) return message.channel.sendMessage(`${message.author} | \`❌\` | Your permission level is too low to execute that command.`);
            let match = /volume\s+(\d+)/i.exec(message.content);
            if (!match) return message.channel.sendMessage(`${message.author} | \`❌\` | Invalid command usage. Volume must be a percent from 0% to 200%.`);

            let volume = match[1];
            if (volume < 0 || volume > 200) return message.channel.sendMessage(`${message.author} | \`❌\` | Invalid command usage. Volume must be a percent from 0% to 200%.`);

            let connection = message.guild.voiceConnection;
            if (!connection) return message.channel.sendMessage(`${message.author} | Nothing is playing.`);

            if (!same(connection, message.member)) return message.channel.sendMessage(`${message.author} | \`❌\` | You're not in the same voice channel as I am.`);

            if (!connection.player || !connection.player.dispatcher) return message.channel.sendMessage(`${message.author} | Nothing is playing.`);

            connection.player.dispatcher.setVolume(volume * 0.01);
            message.channel.sendMessage(`${message.author} | Changed the volume to **${volume}%**.`);
        }
    }
};

function same(connection, member) {
    if (!member.voiceChannel) return false;
    if (connection.channel.id !== member.voiceChannel.id) return false;
    return true;
}

function checkOverride(client, guild, user, command, level) {
    let musicperms = guild.settings.musicperms;
    let override = guild.settings[`or-${command}`];
    if (override === "off") if (musicperms === "all" || musicperms === "dj" && level >= 1 || musicperms === "admin" && level >= 2) return true;
    if (override === "all" || override === "dj" && level >= 1 || override === "admin" && level >= 2) return true;
    return false;
}

function errorMessage(error) {
    if (!error.errors) return `An unknown error occured while requesting that video:\n${error.stack}`;
    const err = error.errors[0].reason;
    if (!err) return `An unknown error occured while requesting that video:\n${error}`;
    if (err === "keyInvalid") return "**__An unknown error occured while requesting that video:__**\n\nThis server entered an invalid YouTube API Key.";
    else if (err === "quotaExceeded") return "**__An error occured while requesting that video:__**\n\nOur Global YouTube API Quota limit exceeded, meaning no more searches can be made until it is reset at 3 AM EST.\n\n**__How to Resolve the Issue:__**\n```md\n# You can resolve the issue by creating your own YouTube Data API v3 Key.\n\n< Join TypicalBot\'s server and use the command '/tag apikeyhowto' for more information on how to do so.```\n**Link:** <https://typicalbot.com/join-our-server/>";
    else return `An unknown error occured while requesting that video:\n${err}`;
}

function VideoSearch(client, settings, query) {
    return new Promise((resolve, reject) => {
        let YT = settings.apikey ? new YouTubeAPI(settings.apikey) : YouTube;
        YT.search(query, 10).then(results => {
            let filtered = results.filter(a => a.type === "video");
            return resolve(filtered);
        }).catch(error => {
            return reject(error);
        });
    });
}
