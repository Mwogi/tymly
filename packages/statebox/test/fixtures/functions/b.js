'use strict'

module.exports = function b (event, context) {
  const list = event.results
  console.log('B')
  list.push('B')
  context.sendTaskSuccess({results: list})
}
