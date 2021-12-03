const { bot, sendMessages } = require('./bot.service')
const UserModel = require('./../models/user.model')
const ReceiveService = require('./receive.service')
const debug = require('debug')('telegramRequest')

const listenTg = async () => {
  try {
    bot.on('message', async (msg) => {
      debug('Got message: %O', msg)
      try {
        let user = await UserModel.getUser(msg.chat.id)
        if (!user.id) {
          const username = msg.chat.username || null
          const firstName = msg.chat.first_name || null
          const lastName = msg.chat.last_name || null
          user = new UserModel(msg.chat.id, username, firstName, lastName)
          await user.add()
        }
        const receive = new ReceiveService(msg, user)
        const responses = await receive.handleMessage()
        const sentMessages = await sendMessages(responses)
        debug('Sent messages: %O', sentMessages)
      } catch (e) {
        throw new Error(e)
      }
    })

    bot.on('callback_query', async (msg) => {
      try {
        let user = await UserModel.getUser(msg.from.id)
        if (!user.id) {
          const username = msg.from.username || null
          const firstName = msg.from.first_name || null
          const lastName = msg.from.last_name || null
          user = new UserModel(msg.from.id, username, firstName, lastName)
          await user.add()
        }

        debug('Got callback_query message: %O', msg)
        const receive = new ReceiveService(msg, user)
        const responses = await receive.handleCallbackQuery()
        const sentMessages = await sendMessages(responses)
        debug('Sent messages: %O', sentMessages)
      } catch (e) {
        throw new Error(e)
      }
    })
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = { listenTg }
