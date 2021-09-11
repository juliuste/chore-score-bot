# widschi-bot

Telegram bot for assigning chores with my flatmates. Lets people count if they did a chore and assigns random people who did the least chores yet for new tasks.

[![License](https://img.shields.io/github/license/juliuste/widschi-bot.svg?style=flat)](license)

## Usage

Obtain a telegram token for your bot by contacting the `@BotFather` telegram account, and expose it as an environment variable named `TELEGRAM_TOKEN`.

Add your bot to any group and call the `/chatId` command. Create a file `app/settings.js`, and fill it as follows:

```js
export const chatId = -1234567 // output of the `chatId` command
export const people = [
	{ name: 'Rüdiger' },
	{ name: 'Kunigunde' },
	{ name: 'Karsten' },

	// if you know how to program, you can also configure the texts that are sent out as follows
	// (if you don't know how to program, just ignore the following example and list the names
	// as shown above)
	{
		name: 'Hanni und Nanni',

		// function that is called when the person gets points via the /<name> command
		nameFn: amount => `${amount} Punkte für Hanni und Nanni.`,
		nextFn: amount => `Hanni und Nanni sind dran.`,
	},
]
```

You can now call `/next` in your chat. Will pick a random person with the lowest current score. You can also increase your own score ("chore count") by running `/<name>`, e.g. `/karsten`:

| Command               | Effect                                |
| --------------------- | ------------------------------------- |
| `/next` / `/<name>`   | +1 for a random person / _name_       |
| `/next2` / `/<name>2` | +2 for a random person / _name_       |
| `/next3` / `/<name>3` | +3 for a random person / _name_       |
| `/next4` / `/<name>4` | +4 for a random person / _name_       |
| `/next5` / `/<name>5` | +5 for a random person / _name_       |
| `/anti<name>`         | -1 for _name_                         |
| `/anti<name>2`        | -2 for _name_                         |
| `/anti<name>3`        | -3 for _name_                         |
| `/anti<name>4`        | -4 for _name_                         |
| `/anti<name>5`        | -5 for _name_                         |
| *`/chatId`*           | *Get the current chat's telegram id.* |

![Demo of the bot in a telegram group](demo.gif)

## Contributing

If you found a bug or want to propose a feature, feel free to visit [the issues page](https://github.com/juliuste/widschi-bot/issues).
