import { loadJsonFile as loadJson } from 'load-json-file'
import { writeJsonFile as writeJson } from 'write-json-file'
import lodash from 'lodash'
import { people } from './settings.js'

const { shuffle, minBy, fromPairs, toPairs, max, min } = lodash

const statePath = './state.json'
const initialState = () => fromPairs(people.map(p => [p.name, 0]))

const writeNextState = async state => writeJson(statePath, state)

const next = async ({ preSelected: name }, amount) => {
	const state = await (loadJson(statePath).catch(error => {
		if (error.code !== 'ENOENT') throw error
		return initialState()
	}))

	let selectedPerson
	if (name && Object.keys(state).map(k => k.toLowerCase()).includes(name.toLowerCase())) {
		const person = people.find(p => p.name.toLowerCase() === name.toLowerCase())
		state[person.name] += (amount || 1)
		selectedPerson = person.name
	} else {
		const [randomPersonWithLowestScore] = minBy(shuffle(toPairs(state)), x => x[1])
		state[randomPersonWithLowestScore] += (amount || 1)
		selectedPerson = randomPersonWithLowestScore
	}

	await writeNextState(state)
	const difference = max(Object.values(state)) - min(Object.values(state))
	return { person: people.find(p => p.name === selectedPerson), difference }
}

export default next
