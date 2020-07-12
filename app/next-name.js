'use strict'

const loadJson = require('load-json-file')
const writeJson = require('write-json-file')
const shuffle = require('lodash/shuffle')
const minBy = require('lodash/minBy')
const fromPairs = require('lodash/fromPairs')
const toPairs = require('lodash/toPairs')
const max = require('lodash/max')
const min = require('lodash/min')
const { people } = require('./settings.json')

const statePath = './state.json'
const initialState = () => fromPairs(people.map(p => [p.name, 0]))

const writeNextState = async state => writeJson(statePath, state)

const next = async ({ preSelected: name }) => {
	const state = await (loadJson(statePath).catch(error => {
		if (error.code !== 'ENOENT') throw error
		return initialState()
	}))

	let selectedPerson
	if (name && Object.keys(state).map(k => k.toLowerCase()).includes(name.toLowerCase())) {
		const person = people.find(p => p.name.toLowerCase() === name.toLowerCase())
		state[person.name] += 1
		selectedPerson = person.name
	} else {
		const [randomPersonWithLowestScore] = minBy(shuffle(toPairs(state)), x => x[1])
		state[randomPersonWithLowestScore] += 1
		selectedPerson = randomPersonWithLowestScore
	}

	await writeNextState(state)
	const difference = max(Object.values(state)) - min(Object.values(state))
	return { person: people.find(p => p.name === selectedPerson), difference }
}

module.exports = next
