import test from 'ava'
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import Database from './database.js'

import _ from 'lodash'

const CHAT_A = 100
const CHAT_B = 200
const NO_CHAT = 999
const USER_A1 = "user 1"
const USER_A2 = "user 2"
const USER_A3 = "user 3"
const USER_B1 = "user 1"
const NEW_USER = "user 10"
const NO_USER = "user 99"

// use t.like once it supports arrays, see https://github.com/avajs/ava/pull/3023
const arraysLike = (t, actual, selector) => {
	t.is(actual.length, selector.length)
	for (let i = 0; i < selector.length; i++) {
		t.like(actual[i], selector[i])
	}
}

test.before('start mongodb server', async t => {
	t.context.mongoDB = await MongoMemoryReplSet.create()
	t.context.dbName = 'widschi-bot'
	t.context.dbUri = t.context.mongoDB.getUri()
	t.context.db = new Database({
		connectionURI: t.context.dbUri,
		dbName: t.context.dbName,
	})
	await t.context.db.connect()
})

test.beforeEach('populate with users', async t => {
	const db = t.context.db
	await db.addUser(CHAT_A, USER_A1)
	await db.addUser(CHAT_A, USER_A2)
	await db.addUser(CHAT_A, USER_A3)
	await db.addUser(CHAT_B, USER_B1)
})

test.afterEach.always('drop collection', async t => {
	const db = t.context.db
	await db.clear()
})

test.after.always('cleanup', async t => {
	await t.context.db.disconnect()
	await t.context.mongoDB.stop()
})

test.serial('assign average score on user creation', async t => {
	const db = t.context.db
	await db.updateScore(CHAT_A, USER_A1, 5)
	await db.addUser(CHAT_A, NEW_USER)
	const users = await db.getUsers(CHAT_A)

	const correctUsers = _.sortBy([{
		chatID: CHAT_A,
		userID: USER_A1,
		vacation: false,
		score: 5,
	}, {
		chatID: CHAT_A,
		userID: USER_A2,
		vacation: false,
		score: 0,
	}, {
		chatID: CHAT_A,
		userID: NEW_USER,
		vacation: false,
		score: (5 + 0 + 0) / 3,
	}, {
		chatID: CHAT_A,
		userID: USER_A3,
		vacation: false,
		score: 0,
	}], user => user.userID)

	console.log(users)

	arraysLike(t, users, correctUsers)
})

test.serial('do nothing when adding already existing user', async t => {
	const db = t.context.db

	const usersBefore = await db.getUsers(CHAT_A)
	const result = await db.addUser(CHAT_A, USER_A1)
	const users = await db.getUsers(CHAT_A)

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

	const usersBefore = await db.getUsers(CHAT_A)
	const result = await db.removeUser(CHAT_A, USER_A1)
	const users = await db.getUsers(CHAT_A)

	t.like(result, {
		chatID: CHAT_A,
		userID: USER_A1,
		vacation: false,
		score: 0,
	})
	t.is(users.length + 1, usersBefore.length)
})

test.serial('remove nonexistent user', async t => {
	const db = t.context.db

	const usersBefore = await db.getUsers(CHAT_A)
	const result = await db.removeUser(CHAT_A, NO_USER)
	const users = await db.getUsers(CHAT_A)

	t.is(result, null)
	t.is(users.length, usersBefore.length)
})

test.serial('update score of vacationing user', async t => {
	const db = t.context.db

	await db.toggleVacation(CHAT_A, USER_A1)
	await db.toggleVacation(CHAT_A, USER_A2)
	await db.updateScore(CHAT_A, USER_A1, 5)

	const users = await db.getUsers(CHAT_A)
	arraysLike(t, users, [{
		vacation: true,
		score: 5,
	}, {
		vacation: true,
		score: 5 / 2,
	}, {
		vacation: false,
		score: 0,
	}])
})

test.serial('correct score compensation for vacationing users', async t => {
	const db = t.context.db

	await db.toggleVacation(CHAT_A, USER_A1)
	await db.updateScore(CHAT_A, USER_A2, 5)
	await db.updateScore(CHAT_A, USER_A3, 10)

	const users = await db.getUsers(CHAT_A)
	const user1 = _.find(users, user => user.userID === USER_A1)
	t.like(user1, {
		vacation: true,
		score: (10 + 5) / 2,
	})
})

test.serial('call next with some users on vacation', async t => {
	const db = t.context.db

	await db.updateScore(CHAT_A, USER_A1, 3)
	await db.updateScore(CHAT_A, USER_A2, 2)
	await db.toggleVacation(CHAT_A, USER_A1) // USER_A1 will get half of the points awarded by the following two commands
	await db.updateScore(CHAT_A, null, 4) // USER_A3 gets 4 points
	await db.updateScore(CHAT_A, null, 2) // USER_A2 gets +2 points, so 4
	await db.toggleVacation(CHAT_A, USER_A2) // now USER_A1 and USER_A2 will get the same points as USER_A3 by the next command
	await db.updateScore(CHAT_A, null, 3) // USER_A3 gets +3

	const users = await db.getUsers(CHAT_A)

	arraysLike(t, users, [{
		vacation: true,
		score: 3 + (4 + 2) / 2 + 3 / 1,
	}, {
		vacation: true,
		score: 2 + 2 + 3 / 1,
	}, {
		vacation: false,
		score: 0 + 4 + 3,
	}])
})

test.serial('call next with all users on vacation', async t => {
	const db = t.context.db

	await db.toggleVacation(CHAT_A, USER_A1)
	await db.toggleVacation(CHAT_A, USER_A2)
	await db.toggleVacation(CHAT_A, USER_A3)

	const result = await db.updateScore(CHAT_A, null, 5)
	t.like(result, {
		err: 'zero users not on vacation',
	})
})

test.serial('update score of nonexistent user', async t => {
	const db = t.context.db

	const result = await db.updateScore(CHAT_A, NO_USER, 1)
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
