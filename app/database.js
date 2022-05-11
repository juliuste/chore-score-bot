import { MongoClient, ServerApiVersion } from 'mongodb'
import { fileURLToPath } from 'url'
import _ from 'lodash'

// Dumb helper to access the result of the transaction because of https://jira.mongodb.org/browse/NODE-2014
const withTransaction = async (session, closure) => {
	let result
	await session.withTransaction(async (session) => {
		result = await closure(session)
		return result
	})
	return result
}

class Database {
	static normalizeName (name) {
		return name.toLowerCase()
	}

	constructor (client, dbName = 'widschi-bot') {
		this.dbName = dbName
		this.collectionName = 'users'

		if (client) {
			this.client = client
		} else {
			const credentials = fileURLToPath(new URL('X509-cert-5689221583293842508.pem', import.meta.url))
			this.client = new MongoClient('mongodb+srv://widschi-bot.tafbz.mongodb.net/myFirstDatabase?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority', {
				sslKey: credentials,
				sslCert: credentials,
				serverApi: ServerApiVersion.v1,
			})
		}
	}

	async init () {
		await this.client.connect()
		this.db = this.client.db(this.dbName)
		this.collection = this.db.collection(this.collectionName)
	}

	async addUser (chatID, userID) {
		const session = this.client.startSession()
		try {
			return await withTransaction(session, async (session) => {
				const cursor = await this.collection.aggregate([
					{
						$match: { chatID: chatID },
					}, {
						$group: {
							_id: null,
							average: { $avg: '$score' },
						},
					},
				], {
					session: session,
				})
				let average = 0
				// eslint-disable-next-line no-unreachable-loop
				for await (const first of cursor) {
					average = first.average || 0
					break
				}
				userID = Database.normalizeName(userID)
				const newUser = {
					chatID: chatID,
					userID: userID,
					vacation: false,
					score: average,
				}

				const result = await this.collection.findOneAndUpdate({
					chatID: chatID,
					userID: userID,
				}, {
					$setOnInsert: newUser,
				}, {
					upsert: true,
					session: session,
				})
				if (result.value === null) {
					return newUser
				} else {
					return null
				}
			})
		} finally {
			await session.endSession()
		}
	}

	async removeUser (chatID, userID) {
		userID = Database.normalizeName(userID)
		const result = await this.collection.findOneAndDelete({
			chatID: chatID,
			userID: userID,
		})
		return result.value
	}

	async toggleVacation (chatID, userID) {
		const result = await this.collection.findOneAndUpdate({
			chatID: chatID,
			userID: userID,
		}, [
			{
				$set: {
					vacation: { $not: '$vacation' },
				},
			},
		], {
			returnDocument: 'after',
		})
		return result.value
	}

	async getUsers (chatID) {
		const cursor = await this.collection.find({
			chatID: chatID,
		})
		const users = []
		for await (const user of cursor) {
			users.push(user)
		}
		return users
	}

	// Add amount to the score of a certain user. If userID === null, add amount to the score of the user with the least score.
	async updateScore (chatID, userID, amount) {
		const session = this.client.startSession()
		try {
			return await withTransaction(session, async (session) => {
				const cursor = await this.collection.find({
					chatID: chatID,
				}, {
					session: session,
				})
				const users = []
				for await (const user of cursor) {
					users.push(user)
				}
				const notOnVacation = _.filter(users, user => !user.vacation)

				let candidate
				if (userID === null) {
					if (users.length === 0) {
						return {
							err: 'zero users',
						}
					}
					if (notOnVacation.length === 0) {
						return {
							err: 'zero users not on vacation',
						}
					}
					const minScore = (_.minBy(notOnVacation, user => user.score)).score
					const candidates = _.filter(notOnVacation, user => user.score === minScore)
					candidate = candidates[_.random(candidates.length - 1)]
				} else {
					userID = Database.normalizeName(userID)
					candidate = _.find(users, user => user.userID === userID)
					if (candidate === undefined) {
						return {
							err: 'user unknown',
						}
					}
				}

				// If the candidate is on vacation (and therefore not part of notOnVacation), they were probably not on vacation when they earned their points, and it is therefore fairer to include them in the number of people "who this work was for" to calculate the vacation setoff. (It seems impossible to be completely fair in every situation without making users specify when exactly the points were earned, which is too complex, and this is an okay approximation.) This also prevents the dividend from being zero when everyone is on vacation, and therefore prevents division by zero.
				const spreadAmong = notOnVacation.length + (candidate.vacation ? 1 : 0)
				const vacationSetoff = amount / spreadAmong

				await this.collection.updateMany({
					chatID: chatID,
					$or: [
						{ vacation: true },
						{ userID: candidate.userID },
					],
				}, [{
					$set: {
						score: {
							$add: [
								'$score',
								{
									$cond: {
										if: { $eq: ['$userID', candidate.userID] },
										then: amount,
										else: vacationSetoff,
									},
								},
							],
						},
					},
				}], {
					session: session,
				})

				// mirror the changes for the correct return value
				for (const user of users) {
					if (user === candidate) {
						user.score += amount
					} else if (user.vacation) {
						user.score += vacationSetoff
					}
				}
				return {
					user: candidate,
					users: users,
				}
			})
		} finally {
			await session.endSession()
		}
	}
}

export default Database
