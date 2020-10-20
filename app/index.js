'use strict'

const Telegraf = require('telegraf')
const get = require('lodash/get')
const getNextPerson = require('./next-name')
const { chatId: allowedChatId, people } = require('./settings')

const getChatId = ctx => get(ctx, 'message.chat.id')

const defaultNameFn = name => amount => `${amount > 0 ? `+${amount}` : String(amount)} für ${name}.`
const defaultNextFn = name => amount => `${name} ist dran.`

const command = ({ preSelected }, amount) => async ctx => {
	console.error('next or /person called')
	const currentChatId = getChatId(ctx)
	if (allowedChatId !== currentChatId) return ctx.reply(`Chat with id ${currentChatId} is not authorized.`)
	const { person, difference } = await getNextPerson({ preSelected: preSelected }, amount)

	const nameFn = person.nameFn || defaultNameFn(person.name)
	const nextFn = person.nextFn || defaultNextFn(person.name)

	const msg = preSelected
		? nameFn(amount)
		: nextFn(amount)

	const differenceWarning = (preSelected && (difference > 5)) ? ` Vorsicht, vermehrt "next" verwenden. (Differenz: ${difference}).` : ''

	ctx.reply('🤖 ' + msg + differenceWarning, {
		disable_notification: true,
	})
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

bot.command('chatId', async ctx => {
	console.error('chatId called')
	ctx.reply(`This chat's id is ${getChatId(ctx)}`)
})
bot.launch()
