const SubscriptionModel = require('./../models/subscriptions.model')
const db = require('./../db')
const { bot } = require('./bot.service')
const i18n = require('./../i18n.config')
const ResponseService = require('./response.service')
const OrderService = require('./order.service')
const ProductModel = require('./../models/product.model')
const UserModel = require('./../models/user.model')
const OrderModel = require('./../models/order.model')
const { GHOST_ID } = require('./../config')
const currencyFilter = require('./../filters/currency.filter')
const sleep = require('./../utils/sleep.util')

let subscriptionsBatch = []
let errorTimes = 0
let currentIndex = null
let errorSubscriptionId = null

class SubscriptionService {
  subscription

  constructor(subscription) {
    if (!subscription instanceof SubscriptionModel) {
      throw new Error('Subscription is not instance of SubscriptionModel')
    }
    this.subscription = subscription
  }

  static async handleCallbackQuery(user, data) {
    try {
      const split = data.split('#')
      const payload = split[0]
      const subscriptionId = split[1]

      if (!subscriptionId) {
        throw new Error('Try to handle callback query for renew subscription but subscription ID not set')
      }
      if (payload !== 'RENEW_SUBSCRIPTION') {
        throw new Error(`Try to handle callback query for renew subscription but payload is wrong: ${payload}`)
      }

      const subscription = await SubscriptionModel.getSubscriptionFromDatabaseById(subscriptionId)
      const order = await OrderModel.getOrderFromDatabase(subscription.orderId)
      const product = await ProductModel.getProductFromDatabase(order.productId)
      const user = await UserModel.getUser(subscription.userId)

      await OrderService.closeAllOpenedOrders(subscription.userId)

      const newOrder = new OrderModel(subscription.userId, order.productId)
      await newOrder.addOrder()

      return {
        type: 'message',
        chatId: user.id,
        text: i18n.__('products.product_info', {
          priceUsd: currencyFilter(product.priceUsd),
          priceRub: currencyFilter(product.priceUsd, 'RUB'),
          duration: product.duration,
          title: product.title,
          subtitle: product.subtitle,
        }),
        form: {
          reply_markup: ResponseService.payConfirmKeyboard(Number(user.field('lastEcho')) + 1).getMarkup(),
          parse_mode: 'markdown',
        },
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  static async addNewSubscriptionForMonth(userId, orderId) {
    try {
      if (!userId || !orderId) {
        throw new Error('UserID or OrderID not passed when add new subscription for one month')
      }
      const start = new Date()
      const copiedStart = new Date(start.getTime())
      const end = new Date(copiedStart.setMonth(copiedStart.getMonth() + 1))
      const subscription = new SubscriptionModel(userId, orderId, start, end)
      await subscription.addSubscription()
      return subscription
    } catch (e) {
      throw new Error(e)
    }
  }

  static async getUserSubscriptionHistory(userId) {
    try {
      if (!Number(userId)) {
        throw new Error('UserID not passed when get user subscription history')
      }
      const result = await db.query('SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY id DESC', [userId])
      let subscriptions = []
      if (result.rows.length === 0) {
        return subscriptions
      }
      result.rows.forEach((r) => {
        subscriptions.push(new SubscriptionModel(r.user_id, r.order_id, r.start_date, r.end_date, r.is_expired, r.id))
      })
      return subscriptions
    } catch (e) {
      throw new Error(e)
    }
  }

  static async getAllActiveSubscriptions() {
    try {
      const result = await db.query('SELECT * FROM subscriptions WHERE is_expired = false')
      const subscriptions = []
      if (result.rows.length === 0) {
        return subscriptions
      }
      result.rows.forEach((r) => {
        subscriptions.push(
          new SubscriptionModel(r.user_id, r.order_id, r.start_date, r.end_date, r.is_expired, r.id, r.is_activated)
        )
      })
      return subscriptions
    } catch (e) {
      throw new Error(e)
    }
  }

  static async handleSubscriptions() {
    try {
      // fill empty batch
      if (subscriptionsBatch.length === 0) {
        const subscriptions = await this.getAllActiveSubscriptions()
        if (subscriptions.length === 0) {
          return true
        }
        subscriptions.forEach((s) => {
          subscriptionsBatch.push(s)
        })
      }

      const now = new Date()
      const dayInterval = 1000 * 60 * 60 * 24

      // go through batch
      for (const [i, s] of subscriptionsBatch.entries()) {
        currentIndex = i
        errorSubscriptionId = s.id

        await sleep(100)

        const endDate = new Date(s.endDate)
        const dif = endDate - now

        const order = await OrderModel.getOrderFromDatabase(s.orderId)
        const product = await ProductModel.getProductFromDatabase(order.productId)
        const user = await UserModel.getUser(s.userId)

        if (now > endDate) {
          await bot.banChatMember(product.channelId, s.userId)
          await s.editExpiration(true)
          const message = await bot.sendMessage(s.userId, i18n.__('notifications.the_end', { title: product.title }))
          await user.setLastEchoMessageId(message.message_id)
          await bot.sendMessage(
            GHOST_ID,
            i18n.__('notifications.the_end_to_admin', {
              userId: s.userId,
              username: user.username,
              subscriptionId: s.id,
            }),
            { parse_mode: 'markdown' }
          )
        } else if (dif / dayInterval < 1) {
          const message = await bot.sendMessage(s.userId, i18n.__('notifications.one_day', { title: product.title }), {
            reply_markup: ResponseService.genRenewSubscriptionButton(s.id).getMarkup(),
          })
          await user.setLastEchoMessageId(message.message_id)
        } else if (dif / dayInterval < 7) {
          const message = await bot.sendMessage(s.userId, i18n.__('notifications.one_week', { title: product.title }), {
            reply_markup: ResponseService.genRenewSubscriptionButton(s.id).getMarkup(),
          })
          await user.setLastEchoMessageId(message.message_id)
        }
      }

      subscriptionsBatch = []
      return true
    } catch (e) {
      if (errorTimes > 3) {
        throw new Error(e)
      }
      errorTimes += 1

      if (currentIndex) {
        subscriptionsBatch.splice(0, currentIndex + 1)
      }

      await bot.sendMessage(
        GHOST_ID,
        `🔴 Ошибка при обработке подписки [ID=${errorSubscriptionId}]\nПробую продолжить идти по списку...`
      )
      await this.handleSubscriptions()
      errorTimes = 0
    }
  }
}

module.exports = SubscriptionService
