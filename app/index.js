import { Telegraf } from 'telegraf'
import { markdownv2 as format } from 'telegram-format'
import _ from 'lodash'
import { table, getBorderCharacters } from 'table'
import numberFormatter from 'number-formatter'

import * as db from './database.js'

const toIntStrict = string => /^[-+]?\d+$/.test(string) ? Number(string) : undefined

const getArguments = message => message.text.trim().split(/\s+/)

const validName = name => true // dummy implementation

const defaultNameFn = name => amount => `${amount > 0 ? `+${amount}` : String(amount)} für ${name}.`
// const defaultNextFn = name => amount => `${name} ist dran.`

const tableConfig = {
	border: getBorderCharacters('void'),
	drawHorizontalLine: () => false,
	columnDefault: {
		paddingLeft: 0,
		paddingRight: 1,
	},
	columns: [
		{ alignment: 'left' },
		{ alignment: 'right' },
	],
}

const noNotification = {
	disable_notification: true,
}

const giveCommand = async ctx => {
	const args = getArguments(ctx.message)
	console.info('/give called with arguments ' + args)

	const name = args[1]
	if (name === undefined) {
		ctx.reply('🤯 Du musst einen Namen schreiben, damit ich weiß, wem ich Punkte geben soll.', noNotification)
		return
	}

	const amount = args[2] ? toIntStrict(args[2]) : 1
	if (amount === undefined) {
		ctx.replyWithMarkdownV2(`🤯 Entschuldige, ich kenne die Zahl ${format.escape(args[2])} nicht\\.`, noNotification)
		return
	}

	let result
	try {
		result = await db.updateScore(ctx.chat.id, name, amount)
	} catch (error) {
		switch (error.message) {
		case 'chat unknown':
		case 'chat or user unknown':
			ctx.reply(`🤯 Entschuldige, ich kenne die Person ${name} nicht.`, noNotification)
			break
		case 'zero users':
			ctx.reply('🤖 Es sind keine User angemeldet! Füge welche mit /add Name hinzu.')
			break
		case 'zero users not on vacation':
			ctx.reply('🤯 Es sind alle im Urlaub (yay!).')
			break
		case 'database error':
		default:
			throw error
		}
	}

	const msg = defaultNameFn(name)(amount)
	const vacationWarning = result.user.vacation ? ' (Aber der ist offiziell noch im Urlaub.)' : ''
	const differenceWarning = (result.difference > 5) ? ` (Differenz: ${result.difference}).` : ''

	ctx.reply('🤖 ' + msg + vacationWarning + differenceWarning, noNotification)
}

const nextCommand = async ctx => {
	const args = getArguments(ctx.message)
	console.info('/next called with arguments ' + args)

	const amount = args[1] ? toIntStrict(args[1]) : 1
	if (amount === undefined) {
		ctx.replyWithMarkdownV2(`🤯 Entschuldige, ich kenne die Zahl ${format.escape(args[2])} nicht\\.`, noNotification)
		return
	}

	let result
	try {
		result = await db.updateScore(ctx.chat.id, null, amount)
	} catch (error) {
		switch (error.message) {
		case 'zero users':
			ctx.reply('🤖 Es sind keine User angemeldet! Füge welche mit /add Name hinzu.')
			return
		case 'zero users not on vacation':
			ctx.reply('🤯 Es sind alle im Urlaub (yay!).')
			return
		default:
			throw error
		}
	}

	const msg = defaultNameFn(result.userID)(amount)
	const differenceWarning = (result.difference > 5) ? ` Vorsicht, vermehrt "next" verwenden. (Differenz: ${result.difference}).` : ''

	ctx.reply('🤖 ' + msg + differenceWarning, noNotification)
}

const addCommand = async ctx => {
	const args = getArguments(ctx.message)
	console.info('/add called with arguments ' + args)

	const name = args[1]
	if (!name || name === '') {
		ctx.reply('🤯 Du musst einen Namen angeben, den ich hinzufügen soll.', noNotification)
		return
	}
	if (!validName(name)) {
		ctx.reply('🤯 Der Name sollte bestimmte Regeln erfüllen: ...', noNotification)
		return
	}

	let result
	try {
		result = await db.addUser(ctx.chat.id, name, 'average')
	} catch (error) {
		switch (error.message) {
		case 'user already exists':
			ctx.reply('🤯 Den gibt es schon, soweit ich weiß.', noNotification)
			return
		default:
			throw error
		}
	}

	ctx.replyWithMarkdownV2(`🤖 Habe ${format.escape(result.userID)} hinzugefügt mit einem Score von ${format.escape(result.score.toString())}\\.`, noNotification)
}

const removeCommand = async ctx => {
	const args = getArguments(ctx.message)
	console.info('/remove called')

	const name = args[1]
	if (!name || name === '') {
		ctx.reply('🤯 Du musst einen Namen angeben, den ich entfernen soll.', noNotification)
		return
	}

	try {
		await db.removeUser(ctx.chat.id, name)
	} catch (error) {
		switch (error.message) {
		case 'unknown user':
			ctx.reply('🤯 Den kannte ich gar nicht.')
			return
		default:
			throw error
		}
	}

	ctx.replyWithMarkdownV2(`🤖 Ich tracke keinen Score mehr für ${format.escape(name)}\\.`)
}

const vacationCommand = async ctx => {
	const args = getArguments(ctx.message)
	console.info('/vacation called')

	const name = args[1]
	if (!name || name === '') {
		ctx.reply('🤯 Du musst einen Namen angeben, den ich entfernen soll.', noNotification)
		return
	}

	let user
	try {
		user = await db.toggleVacation(ctx.chat.id, name)
	} catch (error) {
		switch (error.message) {
		case 'unknown user':
			ctx.reply('🤯 Den Benutzer kenne ich gar nicht.')
			return
		default:
			throw error
		}
	}

	if (user.vacation) {
		ctx.replyWithMarkdownV2(`🤖 Ab in den Urlaub, ${format.escape(user.id)}\\!`, noNotification)
	} else {
		ctx.replyWithMarkdownV2(`🤖 Willkommen zurück, ${format.escape(user.id)}\\!`, noNotification)
	}
}

const showUsersCommand = async ctx => {
	const users = await db.getUsers(ctx.chat.id)
	console.info(users)

	if (users.length === 0) {
		ctx.reply('🤖 Es sind keine User angemeldet! Füge welche mit /add Name hinzu.')
		return
	}

	_.sortBy(users, user => user.score)
	const message = format.escape('🤖 Scores:\n\n')
	const pairs = _.map(users, user => [user.id, numberFormatter('0', user.score), user.vacation ? '🏖️' : ''])
	const tableString = format.monospaceBlock(table(pairs, tableConfig))
	ctx.replyWithMarkdownV2(message + tableString, noNotification)
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

bot.command('give', giveCommand)
bot.command('next', nextCommand)
bot.command('add', addCommand)
bot.command('remove', removeCommand)
bot.command('vacation', vacationCommand)
bot.command('show', showUsersCommand)

bot.launch()
