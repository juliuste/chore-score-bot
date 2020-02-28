'use strict'

const Telegraf = require('telegraf')
const get = require('lodash/get')
const sample = require('lodash/sample')
const getNextPerson = require('./next-name')
const { chatId: allowedChatId, people } = require('./settings.json')

const getChatId = ctx => get(ctx, 'message.chat.id')

const command = ({ preSelected }) => async ctx => {
	console.error('next or /person called')
	const currentChatId = getChatId(ctx)
	if (allowedChatId !== currentChatId) return ctx.reply(`Chat with id ${currentChatId} is not authorized.`)
	const person = await getNextPerson({ preSelected: preSelected })
	const randomNickName = sample(person.nickNames)
	if (preSelected) ctx.reply(`🤖 Computer teilt mit: +1 für ${randomNickName || person.name}.`)
	else ctx.reply(`🤖 Computer teilt mit: ${randomNickName || person.name} ist dran.`)
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
bot.command('next', command({ preSelected: null }))
people.forEach(p => {
	bot.command(p.name.toLowerCase(), command({ preSelected: p.name }))
})

bot.command('chatId', async ctx => {
	console.error('chatId called')
	ctx.reply(`This chat's id is ${getChatId(ctx)}`)
})
bot.launch()
