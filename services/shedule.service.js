const schedule = require('node-schedule')
const CurrencyService = require('./currency.service')
const { GHOST_ID } = require('./../config')
const SubscriptionService = require('./subscription.service')
const { sendMessages } = require('./bot.service')
const debug = require('debug')('service:schedule')

module.exports = function scheduleWork() {
  schedule.scheduleJob('0 12 * * *', async () => {
    try {
      debug('Schedule job starts!')
      // Update currency
      await CurrencyService.updateCurrency()
      // Handle subscriptions
      await SubscriptionService.handleSubscriptions()
      await sendMessages({
        type: 'message',
        chatId: GHOST_ID,
        text: 'Ежедневные работы выполнены успешно',
      })
    } catch (e) {
      let text = 'Ошибка при выполнении ежедневных работ'
      if (e.message) {
        text += `: ${e}`
      }
      await sendMessages({ type: 'message', chatId: GHOST_ID, text })
      throw new Error(e)
    }
  })
}
