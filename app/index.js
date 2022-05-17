import { Telegraf } from 'telegraf'
import { markdownv2 as format } from 'telegram-format'
import _ from 'lodash'
import { table, getBorderCharacters } from 'table'

import Database from './database.js'

const db = new Database()

const toIntStrict = string => /^[-+]?\d+$/.test(string) ? Number(string) : undefined

const getArguments = message => message.text.trim().split(/\s+/)

const validName = name => true // dummy implementation

const defaultNameFn = name => amount => `${amount > 0 ? `+${amount}` : String(amount)} für ${name}.`

const scoreToString = score => Math.floor(score).toString()

const computeDifference = users => {
	const notOnVacation = _.filter(users, user => !user.vacation)
	return _.maxBy(notOnVacation, user => user.score).score - _.minBy(notOnVacation, user => user.score).score
}

const differenceWarning = difference => (difference > 5) ? ` Vorsicht, vermehrt /next verwenden. (Differenz: ${scoreToString(difference)}).` : ''

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

	const result = await db.updateScore(ctx.chat.id, name, amount)
	if (!result.user) {
		switch (result.err) {
		case 'user unknown':
			ctx.reply(`🤯 Entschuldige, ich kenne die Person ${name} nicht.`, noNotification)
			break
		default:
			throw new Error(result.err)
		}
	} else {
		const msg = defaultNameFn(result.user.userID)(amount)
		const vacationWarning = result.user.vacation ? ' (Ist aber noch im Urlaub.)' : ''
		const difference = computeDifference(result.users)
		const warning = differenceWarning(difference)
		ctx.reply('🤖 ' + msg + vacationWarning + warning, noNotification)
	}
}

const nextCommand = async ctx => {
	const args = getArguments(ctx.message)
	console.info('/next called with arguments ' + args)

	const amount = args[1] ? toIntStrict(args[1]) : 1
	if (amount === undefined) {
		ctx.reply(`🤯 Entschuldige, ich verstehe die Zahl ${args[1]} nicht.`, noNotification)
		return
	}

	const result = await db.updateScore(ctx.chat.id, null, amount)
	if (!result.user) {
		switch (result.err) {
		case 'zero users':
			ctx.reply('🤖 Es sind keine User angemeldet! Füge welche mit /add Name hinzu.')
			break
		case 'zero users not on vacation':
			ctx.reply('🤯 Es sind alle im Urlaub (yay!).')
			break
		default:
			throw new Error(result.err)
		}
	} else {
		const msg = defaultNameFn(result.user.userID)(amount)
		const difference = computeDifference(result.users)
		const warning = differenceWarning(difference)
		ctx.reply('🤖 ' + msg + warning, noNotification)
	}
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
		ctx.reply('🤯 Den gibt es schon, soweit ich weiß.', noNotification)
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
		ctx.reply('🤯 Du musst noch sagen, wen ich in den Urlaub schicken soll.', noNotification)
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

(async () => {
	await db.connect()

	const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

	bot.command('give', giveCommand)
	bot.command('next', nextCommand)
	bot.command('add', addCommand)
	bot.command('remove', removeCommand)
	bot.command('vacation', vacationCommand)
	bot.command('scores', scoresUsersCommand)

	bot.launch()
})()
