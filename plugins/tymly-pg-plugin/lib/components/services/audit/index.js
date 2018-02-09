'use strict'

const _ = require('lodash')
const path = require('path')
const schema = require('./schema.json')
const generateTriggerStatement = require('./generate-trigger-statement')
const debug = require('debug')('tymly-pg-plugin')
const pgInfo = require('pg-info')

class AuditService {
  boot (options, callback) {
    this.pgScripts = options.blueprintComponents.pgScripts || {}
    this.models = options.blueprintComponents.models || {}
    this.client = options.bootedServices.storage.client
    this.schemaNames = options.bootedServices.storage.schemaNames

    this.auditFunctions = []

    const functionInstallers = Object.keys(this.pgScripts).map(script => {
      debug(`Found script: ${script}`)
      const filename = path.parse(this.pgScripts[script].filename).name
      if (filename.split('-')[0] === 'audit') {
        debug(`Found audit function: ${filename.substring(filename.indexOf('-') + 1)}`)
        this.auditFunctions.push(filename.substring(filename.indexOf('-') + 1))
        return this.client.runFile(this.pgScripts[script].filePath)
      }
    })

    Promise.all(functionInstallers)
      .then(() => this.updateTriggers())
      .then(() => callback(null))
      .catch(err => callback(err))
  } // boot

  updateTriggers () {
    const allInstallers = this.auditFunctions.map(func => {
      const installers = Object.keys(this.models).map(model => this.installTrigger(func, model))
      return Promise.all(installers)
    })
    return Promise.all(allInstallers)
  } // updateTriggers

  async installTrigger (func, model) {
    const audit = this.models[model].audit !== false

    const namespace = _.snakeCase(this.models[model].namespace)
    const name = _.snakeCase(this.models[model].name)
    const triggerName = `${namespace}_${name}_auditor`

    const currentDbStructure = await pgInfo({
      client: this.client,
      schemas: this.schemaNames
    })

    const triggers = currentDbStructure.schemas[namespace].tables[name].triggers
    const trigger = Object.keys(triggers).includes(triggerName)
    const action = (!trigger && audit) ? 'ADD' : ((trigger && !audit) ? 'REMOVE' : '')
    debug(`Model: ${model}, Wants to audit: ${audit}, Already has trigger: ${trigger}, Action: ${action}`)

    const triggerSQL = generateTriggerStatement({
      model: this.models[model],
      function: func,
      action: action
    })

    debug(`Installing trigger for ${model}`)
    return this.client.query(triggerSQL)
  } // installTrigger
}

module.exports = {
  schema: schema,
  serviceClass: AuditService,
  bootAfter: ['storage', 'statebox']
}
