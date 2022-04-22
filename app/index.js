import { Telegraf } from 'telegraf'
import lodash from 'lodash'
import getNextPerson from './next-name.js'
import { chatId as allowedChatId, people } from './settings.js'

const { get } = lodash

const getChatId = ctx => get(ctx, 'message.chat.id')

const personExists = (name) => people.find(p => p.name.toLowerCase() === name.toLowerCase())

const toIntStrict = (string) => /^[-+]?\d+$/.test(string) ? Number(string) : undefined

const defaultNameFn = name => amount => `${amount > 0 ? `+${amount}` : String(amount)} für ${name}.`
const defaultNextFn = name => amount => `${name} ist dran.`

const updateScoreOrChooseNextAndReply = async (ctx, name, amount) => {
	const { person, difference } = await getNextPerson({ preSelected: name }, amount)

	const nameFn = person.nameFn || defaultNameFn(person.name)
	const nextFn = person.nextFn || defaultNextFn(person.name)

	const msg = name
		? nameFn(amount)
		: nextFn(amount)

	const differenceWarning = (name && (difference > 5)) ? ` Vorsicht, vermehrt "next" verwenden. (Differenz: ${difference}).` : ''

	ctx.reply('🤖 ' + msg + differenceWarning, {
		disable_notification: true,
	})
}

const command = ({ preSelected }, amount) => async ctx => {
	console.error('next or /person called')
	const currentChatId = getChatId(ctx)
	if (allowedChatId !== currentChatId) return ctx.reply(`Chat with id ${currentChatId} is not authorized.`)

	updateScoreOrChooseNextAndReply(ctx, preSelected, amount)
}

const giveCommand = async ctx => {
	const currentChatId = getChatId(ctx)
	const text = ctx.message.text
	const args = text.trim().split(/\s+/)

	console.error('/give called with arguments ' + args)

	if (allowedChatId !== currentChatId) {
		return ctx.reply(`Chat with id ${currentChatId} is not authorized.`)
	}

	const name = args[1]
	if (!personExists(name)) {
		return ctx.replyWithMarkdownV2('🤯 Entschuldige, ich kenne die Person _' + name + '_ nicht\\.', {
			disable_notification: true,
		})
	}

	const amount = args[2] ? toIntStrict(args[2]) : 1
	if (amount === undefined) {
		return ctx.replyWithMarkdownV2('🤯 Entschuldige, ich kenne die Zahl _' + args[2] + '_ nicht\\.', {
			disable_notification: true,
		})
	}

	updateScoreOrChooseNextAndReply(ctx, name, amount)
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

const values = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]
values.forEach(amount => {
	const suffix = (Math.abs(amount) === 1) ? '' : String(Math.abs(amount))
	const prefix = (amount < 0) ? 'anti' : ''
	if (amount > 0) bot.command(prefix + 'next' + suffix, command({ preSelected: null }, amount))
	people.forEach(p => {
		bot.command(prefix + p.name.toLowerCase() + suffix, command({ preSelected: p.name }, amount))
	})
})

bot.command('give', giveCommand)

bot.command('chatId', async ctx => {
	console.error('chatId called')
	ctx.reply(`This chat's id is ${getChatId(ctx)}`)
})
bot.launch()
