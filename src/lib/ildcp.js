'use strict'

const IlpPacket = require('ilp-packet')
const compat = require('ilp-compat-plugin')
const { Reader } = require('oer-utils')
const debug = require('debug')('ilp:ildcp')

const PEER_PROTOCOL_CONDITION = Buffer.from('Zmh6rfhivXdsj8GLjp+OIAiXFIVu4jOzkCpZHQ1fKSU=', 'base64')
const PEER_PROTOCOL_EXPIRY_DURATION = 60000

const getAccount = async (plugin) => {
  plugin = compat(plugin)

  const data = await plugin.sendData(IlpPacket.serializeIlpPrepare({
    // TODO: Should be zero, but our plugins suck
    amount: '1',
    executionCondition: PEER_PROTOCOL_CONDITION,
    expiresAt: new Date(Date.now() + PEER_PROTOCOL_EXPIRY_DURATION),
    destination: 'peer.config',
    data: Buffer.alloc(0)
  }))

  console.log('data', data)

  if (data[0] === IlpPacket.Type.TYPE_ILP_REJECT) {
    const { triggeredBy, message } = IlpPacket.deserializeIlpReject(data)
    debug('ILDCP request rejected. triggeredBy=%s errorMessage=%s', triggeredBy, message)
    throw new Error('ILDCP failed: ' + message)
  } else if (data[0] !== IlpPacket.Type.TYPE_ILP_FULFILL) {
    debug('invalid response type. type=%s', data[0])
    throw new Error('ILDCP error, unable to retrieve client configuration.')
  }

  const reader = Reader.from(IlpPacket.deserializeIlpFulfill(data).data)

  const clientName = reader.readVarOctetString().toString('ascii')

  debug('received client name ' + clientName)

  return clientName
}

module.exports = {
  getAccount
}
