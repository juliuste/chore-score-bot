import { MongoClient, ServerApiVersion } from 'mongodb'
import { fileURLToPath } from 'url'

import _ from 'lodash'

const credentials = fileURLToPath(new URL('X509-cert-5689221583293842508.pem', import.meta.url))
const client = new MongoClient('mongodb+srv://widschi-bot.tafbz.mongodb.net/myFirstDatabase?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority', {
	sslKey: credentials,
	sslCert: credentials,
	serverApi: ServerApiVersion.v1,
})

const normalizeName = name => name.toLowerCase()

const addUser = async (chatID, userID, scoreMode = 'average') => {
	try {
		await client.connect()
		const database = client.db('widschi-bot')
		const collection = database.collection('chats')

		userID = normalizeName(userID)

		const chat = await collection.findOne({
			id: chatID,
		})

		let score

		if (!chat) {
			score = 0
		} else {
			if (_.find(chat.users, user => user.id === userID)) {
				throw new Error('user already exists')
			}

			switch (scoreMode) {
			case 'average':
				score = _.meanBy(chat.users, user => user.score) || 0
				break
			default:
				throw new Error('unknown scoreMode')
			}
		}

		const result2 = await collection.findOneAndUpdate({
			id: chatID,
		}, {
			$addToSet: {
				users: {
					id: userID,
					score: score,
					vacation: false,
				},
			},
		}, {
			upsert: true,
		})

		if (result2.value === null) {
			throw new Error('database error')
		} else {
			return {
				userID: userID,
				score: score,
			}
		}
	} finally {
		await client.close()
	}
}

const removeUser = async (chatID, userID) => {
	try {
		await client.connect()
		const database = client.db('widschi-bot')
		const collection = database.collection('chats')

		const result = await collection.findOneAndUpdate({
			id: chatID,
		}, {
			$pull: {
				users: { id: userID },
			},
		})
		const oldChat = result.value

		userID = normalizeName(userID)
		if (oldChat) {
			if (_.find(oldChat.users, user => user.id === userID)) {
				return
			} else {
				throw new Error('unknown user')
			}
		} else {
			throw new Error('database error')
		}
	} finally {
		await client.close()
	}
}

const toggleVacation = async (chatID, userID) => {
	try {
		await client.connect()
		const database = client.db('widschi-bot')
		const collection = database.collection('chats')

		const chat = await collection.findOne({
			id: chatID,
		})

		if (chat === null) {
			throw new Error('unknown chat')
		}

		userID = normalizeName(userID)
		const user = _.find(chat.users, user => user.id === userID)
		if (!user) {
			throw new Error('unknown user')
		}
		user.vacation = !user.vacation

		const result = await collection.updateOne({
			id: chatID,
			'users.id': userID,
		}, {
			$set: {
				'users.$.vacation': user.vacation,
			},
		})
		if (!result.acknowledged) {
			throw new Error('database error')
		}

		return user
	} finally {
		await client.close()
	}
}

const getUsers = async chatID => {
	try {
		await client.connect()
		const database = client.db('widschi-bot')
		const collection = database.collection('chats')

		const chat = await collection.findOne({
			id: chatID,
		})

		if (chat === null) {
			throw new Error('unknown chat')
		}

		return chat.users
	} finally {
		await client.close()
	}
}

// Add amount to the score of a certain user. If no user is provided, add amount to the score of the user with the least score.
const updateScore = async (chatID, userID, amount) => {
	try {
		await client.connect()
		const database = client.db('widschi-bot')
		const collection = database.collection('chats')

		if (userID === null) {
			const chat = await collection.findOne({
				id: chatID,
			})

			if (chat === null) {
				throw new Error('chat unknown')
			}

			if (chat.users.length === 0) {
				throw new Error('zero users')
			}

			const notOnVacation = _.filter(chat.users, user => !user.vacation)
			if (notOnVacation.length === 0) {
				throw new Error('zero users not on vacation')
			}

			const minScore = (_.minBy(notOnVacation, user => user.score)).score
			const candidates = _.filter(notOnVacation, user => user.score === minScore)
			const candidate = candidates[_.random(candidates.length - 1)]
			userID = candidate.id
		}

		userID = normalizeName(userID)

		const result = await collection.findOneAndUpdate({
			id: chatID,
			'users.id': userID,
		}, {
			$inc: { 'users.$.score': amount },
		}, {
			returnDocument: 'after',
		})
		const chat = result.value

		if (chat === null) {
			if (userID === null) {
				// We should have been able to update the user's score, since we just found the user above.
				throw new Error('database error')
			} else {
				// The reason is probably that the user has not been added.
				throw new Error('chat or user unknown')
			}
		}

		const user = _.find(chat.users, user => user.id === userID)
		const scores = _.map(chat.users, user => user.score)
		const difference = _.max(scores) - _.min(scores)

		return { user: user, difference: difference }
	} finally {
		await client.close()
	}
}

export {
	updateScore,
	addUser,
	getUsers,
	removeUser,
	toggleVacation,
}
