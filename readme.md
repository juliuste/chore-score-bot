# widschi-bot

Has the dishwasher in your apartment been in dire need of unloading for days and none of your roommates (including you) feel like doing it? Does the garbage can attract more flies than the bowl of vinegar your parents advised you to put next to it? Do you feel like some people are doing more than others? There's a bot for that! Simply add the [widschi-bot](https://t.me/WidschiBot) to your apartment's telegram group, track when people do chores and use the `/next` command to let the bot randomly assign a chore to someone who has done the least chores! widschi-bot also sports a vacation mode so that people enjoying their well-earned holidays aren't randomly yelled at to empty the trash can.

This is the backend for the <https://t.me/WidschiBot>.

[![License](https://img.shields.io/github/license/juliuste/widschi-bot.svg?style=flat)](license)

## Usage of the Bot

After adding the bot to your group, use `/add <user>` a couple of times to make the bot track scores for them. (The `<user>` in no way has to correspond to any actual people in the group—Telegram bots aren't even allowed to see a list of group members.) When you've made a mistake, or someone moves out, use `/remove <user>` to stop tracking them.

Whenever someone does a chore, they or someone else should write `/give <user>` to record a point for that user. If they do something worth more than one point, you can do `/give <user> <amount>`; the amount might be negative to subtract points.

If a chore needs doing, call `/next <description of the chore>` and the bot will pick a person with the lowest score randomly and also already give them a point—the bot assumes that people do the chore at some point. If the chore is worth more than one point, you can do `/next <amount> <description of the chore>` (If the first part after `/next` looks like a number, the bot will interpret it as an amount.) If everyone is on vacation (see below), the bot tells you.

The `<amount>`s might be any sequence of digits, possibly preceded by a sign.

The arguments to all commands must be separated by whitespace.

To see a table of everybody's scores and who is on vacation right now, use the `/scores` command. (Being on vacation is indicated in the table by a fun little emoji at the end of the line.)

When someone is on vacation or can otherwise not fairly be expected to do chores right now, type `/vacation <user>`. They will not be assigned chores for the time being and receive a fair share of all points other people receive, so that they will stay at the same amount of points relative to the group's average. When they return from vacation, simply type `/vacation <user>` again.

| Command                        | Effect                                |
| ------------------------------ | ------------------------------------- |
| `/add <user>`                  | Start tracking score for _user_.      |
| `/remove <user>`               | Stop tracking score for _user_.       |
| `/next <amount> <description>` | Assign the described chore to a random person with the lowest score, giving them _amount_ points for it. _amount_ might be left out, it defaults to 1. |
| `/give <user> <amount>`        | Modifies _user_'s score by _amount_. _amount_ defaults to 1 if left out. |
| `/vacation <user>`             | Toggle _user_'s vacation status.      |
| `/scores`                      | Show a list of scores.                |

## Usage of the Backend

(If you want to set up your own copy of this bot for some reason.)

1. Clone and install the repo:
```
git clone https://github.com/juliuste/widschi-bot.git
cd widschi-bot
npm install --production
```
2. Obtain a telegram token for your bot by contacting the `@BotFather` telegram account, and expose it as an environment variable named `TELEGRAM_TOKEN`.
3. Set up a MongoDB instance, expose an appropriate [MongoDB connection URI](https://www.mongodb.com/docs/manual/reference/connection-string/) as an environment variable named `WIDSCHIBOT_DB_URI`.
4. Store the name of the database the bot should use as the environment variable `WIDSCHIBOT_DB_NAME`. (Within that database, the bot will create a collection named `users` where it stores all its information.)
5. Run `npm start`.

## Contributing

For development and testing, you should of course drop the `--production` flag during installation. See the `package.json` for relevant npm scripts.

If you found a bug or want to propose a feature, feel free to visit [the issues page](https://github.com/juliuste/widschi-bot/issues).
