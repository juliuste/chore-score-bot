import { MongoClient, ServerApiVersion } from 'mongodb'
import _ from 'lodash'

class Database {
	static normalizeName (name) {
		return name.toLowerCase()
	}

	constructor ({
		connectionURI = process.env.WIDSCHIBOT_DB_URI,
		dbName = process.env.WIDSCHIBOT_DB_NAME,
		dbOptions,
	} = {}) {
		if (!connectionURI) {
			throw new Error('Connecting to MongoDB: No connection URI specified as argument or WIDSCHIBOT_DB_URI environment variable.')
		}
		if (!dbName) {
			throw new Error('Connecting to MongoDB: No connection URI specified as argument or WIDSCHIBOT_DB_NAME environment variable.')
		}
		dbOptions = {
			serverApi: ServerApiVersion.v1,
			...dbOptions,
		}

		this.dbName = dbName
		this.connectionURI = connectionURI
		this.collectionName = 'users'
		this.client = new MongoClient(connectionURI, dbOptions)
	}

	async connect () {
		await this.client.connect()
		this.db = this.client.db(this.dbName)
		this.collection = this.db.collection(this.collectionName)
	}

	async disconnect () {
		await this.client.close()
	}

	async clear () {
		await this.collection.deleteMany({})
	}

	async addUser (chatID, userID) {
		const cursor = await this.collection.aggregate([
			{
				$match: { chatID: chatID },
			}, {
				$group: {
					_id: null,
					average: { $avg: '$score' },
				},
			},
		])
		let { done, value } = await cursor[Symbol.asyncIterator]().next()
		await cursor.close() // Let's close the cursor manually even though we should have exhausted it.
		const average = value?.average || 0

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
		})
		if (result.value === null) {
			return newUser
		} else {
			return null
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
		const cursor = await this.collection.find({
			chatID: chatID,
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

		// If the candidate is on vacation (and therefore not part of
		// notOnVacation), they were probably not on vacation when they earned
		// their points, and it is therefore fairer to include them in the
		// number of people "who this work was for" to calculate the vacation
		// setoff. (It seems impossible to be completely fair in every situation
		// without making users specify when exactly the points were earned,
		// which is too complex, and this is an okay approximation.) This also
		// prevents the dividend from being zero when everyone is on vacation,
		// and therefore prevents division by zero.
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
		}])

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
	}
}

export default Database
