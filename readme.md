# widschi-bot

Telegram bot for assigning chores with my flatmates. Lets people count if they did a chore and assigns random people who did the least chores yet for new tasks.

[![License](https://img.shields.io/github/license/juliuste/widschi-bot.svg?style=flat)](license)

## Usage

Obtain a telegram token for your bot by contacting the `@BotFather` telegram account, and expose it as an environment variable named `TELEGRAM_TOKEN`.

Add your bot to any group and call the `/chatId` command. Create a file `app/settings.json`, and fill it as follows:

```json5
{
	"people": [
		// `nominativ` and `akkusativ` are required, but will only be different in languages that have different noun forms depending on the context, e.g.
		// latin or german
		{"name": "Rüdiger", "nickNames": [
			{ "nominativ": "der RüRü", "akkusativ": "den RüRü", "isPlural": false }
			{ "nominativ": "R", "akkusativ": "R", "isPlural": false }
		]},
		{"name": "Kunigunde", "nickNames": [
			{ "nominativ": "Kuni", "akkusativ": "Kuni", "isPlural": false }
			{ "nominativ": "Gundel", "akkusativ": "Gundel", "isPlural": false }
		]},
		{"name": "Karsten", "nickNames": [
			{ "nominativ": "Karrrrrsten", "akkusativ": "Karrrrrsten", "isPlural": false }
		]},
		{"name": "Hanni und Nanni", "nickNames": [
			{ "nominativ": "Hanni und Nanni", "akkusativ": "Hanni und Nanni", "isPlural": true }
		]},
	]
	"chatId": -1234567, // output of the `chatId` command
}
```

You can now call `/next` in your chat. Will pick a random person with the lowest current score. You can also increase your own score ("chore count") by running `/<name>`, e.g. `/karsten`:

Command | Effect
--------|-------
`/next` / `/<name>` | +1 for a random person
`/next2` / `/<name>2` | +2 for a random person / _name_
`/next3` / `/<name>3` | +3 for a random person / _name_
`/next4` / `/<name>4` | +4 for a random person / _name_
`/next5` / `/<name>5` | +5 for a random person / _name_
`/antinext` / `/anti<name>` | -1 for a random person / _name_
`/antinext2` / `/anti<name>2` | -2 for a random person / _name_
`/antinext3` / `/anti<name>3` | -3 for a random person / _name_
`/antinext4` / `/anti<name>4` | -4 for a random person / _name_
`/antinext5` / `/anti<name>5` | -5 for a random person / _name_
*`/chatId`* | *Get the current chat's telegram id.*


![Demo of the bot in a telegram group](demo.gif)

## Contributing

If you found a bug or want to propose a feature, feel free to visit [the issues page](https://github.com/juliuste/widschi-bot/issues).
