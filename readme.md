# widschi-bot

Telegram bot for assigning chores with my flatmates. Lets people count if they did a chore and assigns random people who did the least chores yet for new tasks.

[![License](https://img.shields.io/github/license/juliuste/widschi-bot.svg?style=flat)](license)

## Usage

Obtain a telegram token for your bot by contacting the `@BotFather` telegram account, and expose it as an environment variable named `TELEGRAM_TOKEN`.

Add your bot to any group and call the `/chatId` command. Create a file `app/settings.json`, and fill it as follows:

```json5
{
	"people": [
		{"name": "Rüdiger", "nickNames": ["RüRü", "R"]},
		{"name": "Kunigunde", "nickNames": ["Kuni", "Gundel"]},
		{"name": "Karsten", "nickNames": ["Karrrrrsten"]},
	]
	"chatId": -1234567, // output of the `chatId` command
}
```

You can now call `/next` in your chat. Will pick a random person with the lowest current score. You can also increase your own score ("chore count") by running `/<name>`, e.g. `/karsten`.

![Demo of the bot in a telegram group](demo.gif)

## Contributing

If you found a bug or want to propose a feature, feel free to visit [the issues page](https://github.com/juliuste/widschi-bot/issues).
