const TelegramBot = require('node-telegram-bot-api')
const { BOT_TOKEN } = require('./../config')
const UserModel = require('./../models/user.model')
const debug = require('debug')('service:bot')
const sleep = require('./../utils/sleep.util')
const cloneDeep = require('lodash.clonedeep')
const { GHOST_ID } = require('../config')

const bot = new TelegramBot(BOT_TOKEN)

const handleResponse = async (response) => {
  let args = []
  try {
    debug('Handle response: %O', response)
    if (response.delay) {
      await sleep(response.delay)
    }
    switch (response.type) {
      case 'message': {
        args.push(response.chatId, response.text)
        if (response.form) {
          args.push(response.form)
        }
        return await bot.sendMessage(...args)
      }
      case 'photo': {
        args.push(response.chatId, response.photo)
        if (response.args && Array.isArray(response.args)) {
          response.args.forEach((photoMessageArg) => {
            args.push(photoMessageArg)
          })
        }
        return await bot.sendPhoto(...args)
      }
      case 'edit': {
        if (response.text) {
          args.push(response.text)
        }
        if (response.options) {
          response.options.message_id = Number(response.options.message_id)
          args.push(response.options)
        }
        return await bot.editMessageText(...args)
      }
      case 'forward': {
        args.push(response.chatId, response.fromChatId, response.messageId)
        if (response.options) {
          args.push(response.options)
        }
        return await bot.forwardMessage(...args)
      }
      default: {
        throw new Error('Response type is not passed or not available')
      }
    }
  } catch (e) {
    throw new Error(e)
  }
}

let batch
let sentMessageAmount = 0
const sendMessages = async (responses) => {
  try {
    let sentMessages = []
    if (Array.isArray(responses)) {
      batch = cloneDeep(responses)
      for (const response of responses) {
        batch = batch.filter((r) => Number(r.chatId) !== Number(response.chatId))
        const sentMessage = await handleResponse(response)
        sentMessageAmount += 1
        const user = await UserModel.getUser(sentMessage.chat.id)
        await user.setLastEchoMessageId(sentMessage.message_id)
        sentMessages.push(sentMessage)
      }
    } else if (typeof responses === 'object') {
      const sentMessage = await handleResponse(responses)
      const user = await UserModel.getUser(sentMessage.chat.id)
      await user.setLastEchoMessageId(sentMessage.message_id)
      sentMessages.push(sentMessage)
    } else {
      throw new Error('Responses is not array/object.')
    }
    return sentMessages
  } catch (e) {
    if (batch?.length === 0) {
      throw new Error(e)
    }
    batch.push({
      type: 'message',
      chatId: GHOST_ID,
      delay: 500,
      text: `Рассылка завершена с ошибками, некоторые сообщения не были доставлены. Доставлено ${sentMessageAmount}.`,
    })
    await sendMessages(batch)
  }
}

module.exports = {
  bot,
  sendMessages,
}
