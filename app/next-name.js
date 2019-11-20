'use strict'

const loadJson = require('load-json-file')
const writeJson = require('write-json-file')
const shuffle = require('lodash/shuffle')
const names = require('./names.json')

const statePath = './state.json'
const initialState = () => ({
	order: shuffle(names),
	nextPosition: 0
})

const stateIsValid = state => state.nextPosition < state.order.length

const writeNextState = async ({ order, nextPosition }) => {
	await writeJson(statePath, {
		order,
		nextPosition: nextPosition + 1
	})
}

const next = async () => {
	const currentState = await (loadJson(statePath).catch(error => {
		if (error.code !== 'ENOENT') throw error
		return initialState()
	}))
	const state = stateIsValid(currentState) ? currentState : initialState()
	const name = state.order[state.nextPosition]
	await writeNextState(state)
	return name
}

module.exports = next
