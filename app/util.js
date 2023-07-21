import _ from 'lodash'

export const toIntStrict = string => /^[-+]?\d+$/.test(string) ? Number(string) : undefined

export const getArguments = message => message.text.trim().split(/\s+/)

export const validName = name => true // dummy implementation

export const scoreToString = score => Math.floor(score).toString()

export const computeDifference = users => {
	const notOnVacation = _.filter(users, user => !user.vacation)
	return _.maxBy(notOnVacation, user => user.score).score - _.minBy(notOnVacation, user => user.score).score
}

export const differenceWarning = difference => (difference > 5) ? ` Vorsicht, vermehrt /next verwenden. (Differenz: ${scoreToString(difference)}).` : ''
