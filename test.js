import test from 'ava'
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { MongoClient, ServerApiVersion } from 'mongodb'
import Database from './app/database.js'

import _ from 'lodash'

const CHAT1 = 100
const CHAT2 = 200
const NO_CHAT = 999
const USER1_1 = "user 1"
const USER1_2 = "user 2"
const USER1_3 = "user 3"
const USER2_1 = "user 1"
const NEW_USER = "user 10"
const NO_USER = "user 99"

test.before('start mongodb server', async t => {
	t.context.mongoDB = await MongoMemoryReplSet.create({ replSet: { count: 3 } })
	t.context.client = new MongoClient(t.context.mongoDB.getUri(), {
		serverApi: ServerApiVersion.v1,
	})
	t.context.dbName = 'widschi-bot'
	t.context.db = new Database(t.context.client, t.context.dbName)
	await t.context.db.init(t.context.client, t.context.dbName)
})

test.beforeEach('populate with users', async t => {
	const db = t.context.db

	await db.addUser(CHAT1, USER1_1)
	await db.addUser(CHAT1, USER1_2)
	await db.addUser(CHAT1, USER1_3)
	await db.addUser(CHAT2, USER2_1)
})

test.afterEach.always('drop collection', async t => {
	const db = t.context.db
	await db.clear()
})

test.after.always('cleanup', async t => {
	await t.context.client.close()
	await t.context.mongoDB.stop()
})

test.serial('assign average score on user creation', async t => {
	const db = t.context.db

	const result = await db.updateScore(CHAT1, USER1_1, 5)
	await db.addUser(CHAT1, NEW_USER)
	const users = await db.getUsers(CHAT1)
	const user1_1 = _.find(users, user => user.userID === USER1_1)
	const user1_2 = _.find(users, user => user.userID === USER1_2)
	const new_user = _.find(users, user => user.userID === NEW_USER)

	t.like(user1_1, {
		chatID: CHAT1,
		userID: USER1_1,
		vacation: false,
		score: 5,
	})
	t.like(user1_2, {
		chatID: CHAT1,
		userID: USER1_2,
		vacation: false,
		score: 0,
	})
	t.like(new_user, {
		chatID: CHAT1,
		userID: NEW_USER,
		vacation: false,
		score: (5 + 0 + 0) / 3,
	})
})

test.serial('do nothing when adding already existing user', async t => {
	const db = t.context.db

	const usersBefore = await db.getUsers(CHAT1)
	const result = await db.addUser(CHAT1, USER1_1)
	const users = await db.getUsers(CHAT1)

	t.is(result, null)
	t.is(users.length, usersBefore.length)
})

test.serial('no users for nonexistent chatID', async t => {
	const db = t.context.db

	const users = await db.getUsers(NO_CHAT)

	t.deepEqual(users, [])
})

test.serial('remove existing user', async t => {
	const db = t.context.db

	const usersBefore = await db.getUsers(CHAT1)
	const result = await db.removeUser(CHAT1, USER1_1)
	const users = await db.getUsers(CHAT1)

	t.like(result, {
		chatID: CHAT1,
		userID: USER1_1,
		vacation: false,
		score: 0,
	})
	t.is(users.length + 1, usersBefore.length)
})

test.serial('remove nonexistent user', async t => {
	const db = t.context.db

	const usersBefore = await db.getUsers(CHAT1)
	const result = await db.removeUser(CHAT1, NO_USER)
	const users = await db.getUsers(CHAT1)

	t.is(result, null)
	t.is(users.length, usersBefore.length)
})

test.serial('update score of vacationing user', async t => {
	const db = t.context.db

	await db.toggleVacation(CHAT1, USER1_1)
	await db.toggleVacation(CHAT1, USER1_2)
	await db.updateScore(CHAT1, USER1_1, 5)

	const users = await db.getUsers(CHAT1)
	const user1_1 = _.find(users, user => user.userID === USER1_1)
	const user1_2 = _.find(users, user => user.userID === USER1_2)
	t.like(user1_1, {
		vacation: true,
		score: 5,
	})
	t.like(user1_2, {
		vacation: true,
		score: 5 / 2,
	})
})

test.serial('correct score compensation for vacationing users', async t => {
	const db = t.context.db

	const user1 = await db.toggleVacation(CHAT1, USER1_1)
	await db.updateScore(CHAT1, USER1_2, 5)
	await db.updateScore(CHAT1, USER1_3, 10)

	const users = await db.getUsers(CHAT1)
	const user1_1 = _.find(users, user => user.userID === USER1_1)
	t.like(user1_1, {
		vacation: true,
		score: (10 + 5) / 2,
	})
})

test.serial('call next with some users on vacation', async t => {
	const db = t.context.db

	await db.updateScore(CHAT1, USER1_1, 3)
	await db.updateScore(CHAT1, USER1_2, 2)
	await db.toggleVacation(CHAT1, USER1_1) // USER1_1 will get half of the points awarded in the following two commands
	await db.updateScore(CHAT1, null, 4) // USER1_3 gets 4 points
	await db.updateScore(CHAT1, null, 2) // USER1_2 gets +2 points, so 4
	await db.toggleVacation(CHAT1, USER1_2) // now USER1_1 and USER1_2 will get the same points as USER1_3 in the next command
	await db.updateScore(CHAT1, null, 3) // USER1_3 gets +3

	const users = await db.getUsers(CHAT1)
	const user1_1 = _.find(users, user => user.userID === USER1_1)
	const user1_2 = _.find(users, user => user.userID === USER1_2)
	const user1_3 = _.find(users, user => user.userID === USER1_3)
	t.like(user1_1, {
		vacation: true,
		score: 3 + (4 + 2) / 2 + 3 / 1,
	})
	t.like(user1_2, {
		vacation: true,
		score: 2 + 2 + 3 / 1,
	})
	t.like(user1_3, {
		vacation: false,
		score: 0 + 4 + 3,
	})
})

test.serial('call next with all users on vacation', async t => {
	const db = t.context.db

	await db.toggleVacation(CHAT1, USER1_1)
	await db.toggleVacation(CHAT1, USER1_2)
	await db.toggleVacation(CHAT1, USER1_3)

	const result = await db.updateScore(CHAT1, null, 5)
	t.like(result, {
		err: 'zero users not on vacation',
	})
})

test.serial('update score of nonexistent user', async t => {
	const db = t.context.db

	const result = await db.updateScore(CHAT1, NO_USER, 1)
	t.like(result, {
		err: 'user unknown'
	})
})

test.serial('call next with zero users', async t => {
	const db = t.context.db

	const result = await db.updateScore(NO_CHAT, null, 1)
	t.like(result, {
		err: 'zero users'
	})
})