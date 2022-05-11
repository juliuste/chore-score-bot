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
const USER2_1 = "user 1"
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
	await db.addUser(CHAT2, USER2_1)
})

test.afterEach('drop collection', async t => {
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
	await db.addUser(CHAT1, "user 3")
	const users = await db.getUsers(CHAT1)
	const user1_1 = _.find(users, user => user.userID === USER1_1)
	const user3 = _.find(users, user => user.userID === "user 3")

	t.like(user1_1, {
		chatID: CHAT1,
		userID: USER1_1,
		vacation: false,
		score: 5,
	})
	t.like(user3, {
		chatID: CHAT1,
		userID: "user 3",
		vacation: false,
		score: (5 + 0) / 2,
	})
})

test.serial('do nothing when adding already existing user', async t => {
	const db = t.context.db

	const result = await db.addUser(CHAT1, USER1_1)
	const users = await db.getUsers(CHAT1)

	t.is(result, null)
	t.is(users.length, 2)
})

test.serial('no users for nonexistent chatID', async t => {
	const db = t.context.db

	const users = await db.getUsers(NO_CHAT)

	t.deepEqual(users, [])
})

test.serial('remove existing user', async t => {
	const db = t.context.db

	const result = await db.removeUser(CHAT1, USER1_1)
	const users = await db.getUsers(CHAT1)

	t.like(result, {
		chatID: CHAT1,
		userID: USER1_1,
		vacation: false,
		score: 0,
	})
	t.is(users.length, 1)
})

test.serial('remove nonexistent user', async t => {
	const db = t.context.db

	const result = await db.removeUser(CHAT1, NO_USER)
	const users = await db.getUsers(CHAT1)

	t.is(result, null)
	t.is(users.length, 2)
})
