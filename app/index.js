'use strict'

const Telegraf = require('telegraf')
const get = require('lodash/get')
const getNextName = require('./next-name')
const { chatId: allowedChatId } = require('./settings.json')

const getChatId = ctx => get(ctx, 'message.chat.id')

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
bot.command('next', async ctx => {
	const currentChatId = getChatId(ctx)
	if (allowedChatId !== currentChatId) return ctx.reply(`Chat with id ${currentChatId} is not authorized.`)
	const nextName = await getNextName()
	ctx.reply(`🤖 Computer teilt mit: ${nextName} ist dran.`)
})
bot.command('chatId', async ctx => {
	ctx.reply(`This chat's id is ${getChatId(ctx)}`)
})
bot.launch()
