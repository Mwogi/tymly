/* eslint-env mocha */

'use strict'

const chai = require('./../node_modules/chai')
const expect = chai.expect
const path = require('path')
const tymly = require('tymly')

describe('Teams tests', function () {
  this.timeout(5000)
  let models

  it('should startup tymly', function (done) {
    tymly.boot(
      {
        pluginPaths: [
          require.resolve('tymly-users-plugin')
        ],
        blueprintPaths: [
          path.resolve(__dirname, './../')
        ],
        config: {}
      },
      function (err, tymlyServices) {
        expect(err).to.eql(null)
        models = tymlyServices.storage.models
        done()
      }
    )
  })

  it('should get teams', function (done) {
    models.tymly_teams.find({
      where: {
        title: 'Systems Development'
      }
    })
      .then(result => {
        console.log('result: ' + JSON.stringify(result))
        expect(result[0].title).to.eql('Systems Development')
        expect(result[0].description).to.eql('The ICT Systems Development Team at West Midlands Fire Service')
        expect(result[0].style).to.eql({'icon': 'computer', 'backgroundColor': '#000000'})
        done()
      }).catch(error => {
        done(error)
      })
  })
})
