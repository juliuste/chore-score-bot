import { Telegraf } from 'telegraf'
import _ from 'lodash'
import updateScore from './update-score.js'

const getChatId = ctx => _.get(ctx, 'message.chat.id')

const toIntStrict = (string) => /^[-+]?\d+$/.test(string) ? Number(string) : undefined

const defaultNameFn = name => amount => `${amount > 0 ? `+${amount}` : String(amount)} für ${name}.`
const defaultNextFn = name => amount => `${name} ist dran.`

const giveCommand = async ctx => {
	const currentChatId = getChatId(ctx)
	const text = ctx.message.text
	const args = text.trim().split(/\s+/)

	console.error('/give called with arguments ' + args)

	const name = args[1]
	if (name === undefined) {
		ctx.reply('🤯 Du musst einen Namen schreiben, damit ich weiß, wem ich Punkte geben soll.', {
			disable_notification: true,
		})
		return
	}

	const amount = args[2] ? toIntStrict(args[2]) : 1
	if (amount === undefined) {
		ctx.replyWithMarkdownV2('🤯 Entschuldige, ich kenne die Zahl _' + args[2] + '_ nicht\\.', {
			disable_notification: true,
		})
		return
	}

	const { err, difference } = await updateScore(ctx.chat.id, name, amount)

	if (err) {
		ctx.replyWithMarkdownV2('🤯 Entschuldige, ich kenne die Person _' + name + '_ nicht\\.', {
			disable_notification: true,
		})
		return
	}

	const msg = defaultNameFn(name)(amount)
	const differenceWarning = (difference > 5) ? ` Vorsicht, vermehrt "next" verwenden. (Differenz: ${difference}).` : ''

	ctx.reply('🤖 ' + msg + differenceWarning, {
		disable_notification: true,
	})
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

bot.command('give', giveCommand)

bot.command('chatId', async ctx => {
	console.error('chatId called')
	ctx.reply(`This chat's id is ${getChatId(ctx)}`)
})

bot.launch()
