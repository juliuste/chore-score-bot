import test from 'ava'

import { parseNumber } from './util.js'

test('parseNumber', async t => {
	t.is(parseNumber('1'), 1)
	t.is(parseNumber('2'), 2)
	t.is(parseNumber('+2'), 2)
	t.is(parseNumber('-2'), -2)
	t.is(parseNumber('2', 1), 2)
	t.is(parseNumber('1.256'), 1.256)
	t.is(parseNumber('+1.256'), 1.256)
	t.is(parseNumber('-1.256'), -1.256)
	t.is(parseNumber('1.256', 1), 1.256)
	t.is(parseNumber('word', 1), 1)
	t.is(parseNumber('wo-rd', 1), 1)
	t.is(parseNumber('1.', 1), undefined)
	t.is(parseNumber('', 1), undefined)
	t.is(parseNumber('.1', 1), undefined)
})
