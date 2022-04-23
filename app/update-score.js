import { MongoClient, ServerApiVersion } from 'mongodb';
import fs from 'fs';
import { fileURLToPath } from 'url'

const credentials = fileURLToPath(new URL('X509-cert-5689221583293842508.pem', import.meta.url))
const client = new MongoClient('mongodb+srv://widschi-bot.tafbz.mongodb.net/myFirstDatabase?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority', {
	sslKey: credentials,
	sslCert: credentials,
	serverApi: ServerApiVersion.v1
});

import _ from 'lodash'

// Add amount to the score of a certain user. If no user is provided, add amount to the score of the user with the least score.
const updateScore = async (chatID, userID, amount) => {
	try {
		await client.connect();
		const database = client.db("widschi-bot");
		const collection = database.collection("chats");

		if (userID === null) {
			const chat = await collection.findOne({
				id: chatID
			});

			if (chat === null) {
				// In this case, we actually know that it is the chat that is unknown. However, further down we cannot differentiate, so we aggregate the error.
				return { err: "chat or user unknown" }
			}

			if (chat.users.length === 0) {
				return { err: "zero users" }
			}

			const minScore = (_.minBy(chat.users, user => user.score)).score
			const candidates = _.filter(chat.users, user => user.score === minScore)
			const candidate = candidates[_.random(candidates.length - 1)]
			userID = candidate.id
		}

		const result = await collection.findOneAndUpdate({
			id: chatID,
			"users.id": userID,
		}, {
			$inc: { "users.$.score": amount }
		}, {
			returnDocument: 'after'
		})
		const chat = result.value

		if (chat === null) {
			if (userID === null) {
				// We should have been able to update the user's score, since we just found the user above.
				return { err: "unknown error" }
			} else {
				// The reason is probably that the user has not been added.
				return { err: "chat or user unknown" }
			}
		}

		console.log(chat)

		const scores = _.map(chat.users, user => user.score)
		const difference = _.max(scores) - _.min(scores)
		
		return { userID: userID, difference: difference }
	} finally {
		await client.close();
	}
}

export default updateScore