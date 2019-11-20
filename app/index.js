'use strict'

const getNextName = require('./next-name')
const Telegraf = require('telegraf')

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
bot.command('next', async ctx => {
	const nextName = await getNextName()
	ctx.reply(`🤖 Computer teilt mit: ${nextName} ist dran.`)
})
bot.launch()
