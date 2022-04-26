import { Telegraf } from 'telegraf'
import { markdownv2 as format } from 'telegram-format'
import _ from 'lodash'
import { table, getBorderCharacters } from 'table'

import * as db from './database.js'

const toIntStrict = string => /^[-+]?\d+$/.test(string) ? Number(string) : undefined

const getArguments = message => message.text.trim().split(/\s+/)

const validName = name => true // dummy implementation

const defaultNameFn = name => amount => `${amount > 0 ? `+${amount}` : String(amount)} für ${name}.`
// const defaultNextFn = name => amount => `${name} ist dran.`

const scoreToString = score => Math.floor(score).toString()

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
		ctx.reply(`🤯 Entschuldige, ich kenne die Zahl ${args[2]} nicht.`, noNotification)
		return
	}

	let user
	try {
		user = await db.updateScore(ctx.chat.id, name, amount)
	} catch (error) {
		switch (error.message) {
		case 'zero users':
			ctx.reply('🤖 Es sind keine User angemeldet! Füge welche mit /add Name hinzu.')
			break
		case 'zero users not on vacation':
			ctx.reply('🤯 Es sind alle im Urlaub (yay!).')
			break
		default:
			throw error
		}
	}

	if (user === null) {
		ctx.reply(`🤯 Entschuldige, ich kenne die Person ${name} nicht.`, noNotification)
	} else {
		const msg = defaultNameFn(name)(amount)
		const vacationWarning = user.vacation ? ' (Ist aber noch im Urlaub.)' : ''
		// const differenceWarning = (result.difference > 5) ? ` (Differenz: ${result.difference}).` : ''

		ctx.reply('🤖 ' + msg + vacationWarning, noNotification)
	}
}

const nextCommand = async ctx => {
	const args = getArguments(ctx.message)
	console.info('/next called with arguments ' + args)

	const amount = args[1] ? toIntStrict(args[1]) : 1
	if (amount === undefined) {
		ctx.reply(`🤯 Entschuldige, ich kenne die Zahl ${args[2]} nicht.`, noNotification)
		return
	}

	let user
	try {
		user = await db.updateScore(ctx.chat.id, null, amount)
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

	const msg = defaultNameFn(user.userID)(amount)
	// const differenceWarning = (user.difference > 5) ? ` Vorsicht, vermehrt "next" verwenden. (Differenz: ${user.difference}).` : ''

	ctx.reply('🤖 ' + msg, noNotification)
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

	const user = await db.addUser(ctx.chat.id, name, 'average')

	if (user === null) {
		ctx.reply('Den gibt es schon, soweit ich weiß.', noNotification)
	} else {
		ctx.reply(`🤖 Habe ${user.userID} hinzugefügt mit einem Score von ${scoreToString(user.score)}.`, noNotification)
	}
}

const removeCommand = async ctx => {
	const args = getArguments(ctx.message)
	console.info('/remove called')

	const name = args[1]
	if (!name || name === '') {
		ctx.reply('🤯 Du musst einen Namen angeben, den ich entfernen soll.', noNotification)
		return
	}

	const user = await db.removeUser(ctx.chat.id, name)

	if (user === null) {
		ctx.reply('🤯 Den kannte ich gar nicht.')
	} else {
		ctx.reply(`🤖 Ich tracke keinen Score mehr für ${user.userID}. ${user.userID} hatte ${scoreToString(user.score)} Punkte `)
	}
}

const vacationCommand = async ctx => {
	const args = getArguments(ctx.message)
	console.info('/vacation called')

	const name = args[1]
	if (!name || name === '') {
		ctx.reply('🤯 Du musst einen Namen angeben, den ich entfernen soll.', noNotification)
		return
	}

	const user = await db.toggleVacation(ctx.chat.id, name)

	if (user === null) {
		ctx.reply('🤯 Den kenne ich gar nicht.')
	} else if (user.vacation) {
		ctx.reply(`🤖 Ab in den Urlaub, ${user.userID}!`, noNotification)
	} else {
		ctx.reply(`🤖 Willkommen zurück, ${user.userID}!`, noNotification)
	}
}

const scoresUsersCommand = async ctx => {
	console.info('/scores called')
	const users = await db.getUsers(ctx.chat.id)

	if (users.length === 0) {
		ctx.reply('🤖 Es sind keine User angemeldet! Füge welche mit /add Name hinzu.')
		return
	}

	_.sortBy(users, user => user.score)
	const message = format.escape('🤖 Scores:\n\n')
	const pairs = _.map(users, user => [user.userID, scoreToString(user.score), user.vacation ? '🏖️' : ''])
	const tableString = format.monospaceBlock(table(pairs, tableConfig))
	ctx.replyWithMarkdownV2(message + tableString, noNotification)
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

bot.command('give', giveCommand)
bot.command('next', nextCommand)
bot.command('add', addCommand)
bot.command('remove', removeCommand)
bot.command('vacation', vacationCommand)
bot.command('scores', scoresUsersCommand)

bot.launch()
