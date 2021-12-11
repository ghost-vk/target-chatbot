const { bot, sendMessages } = require('./bot.service')
const UserModel = require('./../models/user.model')
const ReceiveService = require('./receive.service')
const debug = require('debug')('telegramRequest')
const UserDto = require('./../dtos/user.dto')

const listenTg = async () => {
  try {
    bot.on('message', async (msg) => {
      debug('Got message: %O', msg)
      try {
        let user = await UserModel.getUser(msg.chat.id)
        if (!user.id) {
          const userDto = new UserDto({
            id: msg.chat.id,
            username: msg.chat.username || null,
            firstName: msg.chat.first_name || null,
            lastName: msg.chat.last_name || null
          })
          user = new UserModel({ ...userDto })
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
          const userDto = new UserDto({
            id: msg.from.id,
            username: msg.from.username || null,
            firstName: msg.from.first_name || null,
            lastName: msg.from.last_name || null
          })
          user = new UserModel({ ...userDto })
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
