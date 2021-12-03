const { userCommands, orderStatus, productCategory } = require('../config')
const OrderService = require('./order.service')
const ProductModel = require('./../models/product.model')
const OrderModel = require('./../models/order.model')
const SubscriptionService = require('./subscription.service')
const SubscriptionModel = require('./../models/subscriptions.model')
const ResponseProductsService = require('./response-products.service')
const i18n = require('./../i18n.config')
const ResponseService = require('./response.service')
const { dateToYmd } = require('./../filters/date-to-ymd.filter')

class ResponseUserService {
  static async handleCommand(user, message) {
    try {
      switch (message.text.trim()) {
        case userCommands.products: {
          return await this.handleProducts(user)
        }
        case userCommands.subscriptions: {
          return await this.handleSubscriptions(user.id)
        }
        case userCommands.history: {
          return await this.handleHistory(user.id)
        }
        case userCommands.support: {
          return await this.handleSupport(user)
        }
        default: {
          throw new Error('Try to handle user command but available command to handle not found')
        }
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  static async handleProducts(user) {
    try {
      const userOrders = await OrderService.getUserOrders(user.id, orderStatus.opened)
      if (userOrders.length > 0) {
        for (const order of userOrders) {
          await order.updateStatus(orderStatus.closed)
        }
      }
      return ResponseProductsService.genProductCategoryList(user, Number(user.field('lastIncome')) + 1)
    } catch (e) {
      throw new Error(e)
    }
  }

  static async handleSupport(user) {
    try {
      const orders = await OrderService.getUserOrders(user.id, [
        orderStatus.opened,
        orderStatus.waitingReceipt,
        orderStatus.waitingConfirm,
      ])
      const orderId = orders.length > 0 ? orders[0].id : '---'
      const userName = user.username ? user.username : '---'
      return [
        {
          type: 'message',
          chatId: user.id,
          text: i18n.__('support.will_help_you'),
        },
        {
          type: 'message',
          chatId: user.id,
          text: i18n.__('support.user_info', {
            userId: user.id,
            username: userName,
            orderId,
          }),
          form: {
            parse_mode: 'markdown',
            reply_markup: ResponseService.supportInlineButton().getMarkup(),
          },
        },
      ]
    } catch (e) {
      throw new Error(e)
    }
  }

  static async handleHistory(userId) {
    try {
      const completedOrders = await OrderService.getUserOrders(userId, orderStatus.completed)
      if (completedOrders.length === 0) {
        return {
          type: 'message',
          chatId: userId,
          text: 'У вас еще нет завершенных заказов 😕',
        }
      }
      let text = '📖 *История заказов*\n\n'
      let i = 1
      for (const o of completedOrders) {
        const product = await ProductModel.getProductFromDatabase(o.productId)

        text += `=== ${i} ===\n\n`

        switch (product.type) {
          case productCategory.subscription.code: {
            text += 'Подписка\n'
            break
          }
          case productCategory.service.code: {
            text += 'Услуга\n'
            break
          }
          case productCategory.material.code: {
            text += 'Обучающий материал\n'
            break
          }
        }

        text += `*${product.title}*\n`

        if (product.type === productCategory.subscription.code) {
          const s = await SubscriptionModel.getSubscriptionFromDatabaseByOrderId(o.id)
          text += `${dateToYmd(s.startDate)} - ${dateToYmd(s.endDate)}\n`
          text += s.isExpired ? '🔘 Срок действия истек\n\n' : '✅ Подписка активна\n\n'
        }

        i += 1
      }
      return {
        type: 'message',
        chatId: userId,
        text,
        form: { parse_mode: 'markdown' },
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  static async handleSubscriptions(userId) {
    try {
      const userSubscriptions = await SubscriptionService.getUserSubscriptionHistory(userId)
      const activeUserSubscriptions = userSubscriptions.filter(s => s.isExpired === false)
      if (userSubscriptions.length === 0) {
        return {
          type: 'message',
          chatId: userId,
          text: 'У вас нет активных подписок 😕',
        }
      }
      let text = '⏳ *Активные подписки*\n\n'
      let i = 1
      for (const s of activeUserSubscriptions) {
        const order = await OrderModel.getOrderFromDatabase(s.orderId)
        const product = await ProductModel.getProductFromDatabase(order.productId)
        text += `=== ${i} ===\n\n*${product.title}*\n` +
          `${dateToYmd(s.startDate)} - ${dateToYmd(s.endDate)}\n` + `✅ Подписка активна\n\n`
        i += 1
      }
      return {
        type: 'message',
        chatId: userId,
        text,
        form: { parse_mode: 'markdown' },
      }
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = ResponseUserService
