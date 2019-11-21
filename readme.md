# widschi-bot

Telegram bot for assigning chores with my flatmates. Loops through all names randomly and spits out a name on command.

[![License](https://img.shields.io/github/license/juliuste/widschi-bot.svg?style=flat)](license)

## Usage

Obtain a telegram token for your bot by contacting the `@BotFather` telegram account, and expose it as an environment variable named `TELEGRAM_TOKEN`.

Add your bot to any group and call the `/chatId` command. Create a file `app/settings.json`, and fill it as follows:

```json5
{
    "names": ["Rüdiger","Kunigunde","Karsten"], // people's names
    "chatId": -1234567 // output of the `chatId` command
}
```

You can now call `/next` in your chat.

![Demo of the bot in a telegram group](demo.gif)

## Contributing

If you found a bug or want to propose a feature, feel free to visit [the issues page](https://github.com/juliuste/widschi-bot/issues).
