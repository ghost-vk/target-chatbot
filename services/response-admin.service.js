const config = require('./../config')
const ResponseService = require('./response.service')
const OrderModel = require('./../models/order.model')
const ProductModel = require('./../models/product.model')
const SubscriptionService = require('./subscription.service')
const PaymentMethodModel = require('./../models/payment-method.model')
const OrderService = require('./order.service')
const i18n = require('./../i18n.config')
const axios = require('axios')
const { dateToYmd } = require('./../filters/date-to-ymd.filter')
const currencyFilter = require('./../filters/currency.filter')

class ResponseAdminService {
  static async handleCommand(user, message) {
    try {
      if (!config.isAdmin(user.id)) {
        return ResponseService.genNoAccess(user, message)
      }
      switch (message.text) {
        case config.adminCommands.confirm: {
          config.setAdminAction(config.adminCommands.confirm)
          return {
            type: 'message',
            text: '🟢 Для подтверждения платежа отправьте OrderID',
            chatId: user.id,
          }
        }
        case config.adminCommands.reject: {
          config.setAdminAction(config.adminCommands.reject)
          return {
            type: 'message',
            text: '🔴 Для отклонения платежа отправьте OrderID',
            chatId: user.id,
          }
        }
        case config.adminCommands.orders: {
          return await this.getWaitingConfirmOrders(user.id)
        }
        case config.adminCommands.ban: {
          config.setAdminAction(config.adminCommands.ban)
          return {
            type: 'message',
            text: '😈 Чтобы забанить пользователя отправьте UserID',
            chatId: user.id,
          }
        }
        case config.adminCommands.admin: {
          return ResponseService.genWelcomeAdmin(user)
        }
        case config.adminCommands.sendTestMessageToChannel: {
          config.setAdminAction(config.adminCommands.sendTestMessageToChannel)
          return {
            type: 'message',
            chatId: user.id,
            text: 'Отправьте название канала, пример @channelname',
          }
        }
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  static async handleAction(user, message) {
    try {
      switch (config.adminAction) {
        case config.adminCommands.confirm: {
          return await this.confirmOrder(user, message)
        }
        case config.adminCommands.reject: {
          return await this.rejectOrder(user, message)
        }
        case config.adminCommands.ban: {
          return await this.banUser(user, message)
        }
        case config.adminCommands.sendTestMessageToChannel: {
          return await this.sendTestMessageToChannel(user, message.text.trim())
        }
        default: {
          throw new Error('Try to handle admin action but not available action to handle')
        }
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  static async confirmOrder(user, message) {
    try {
      const orderId = Number(message.text.trim())
      if (!orderId) {
        config.resetAdminAction()
        return {
          type: 'message',
          chatId: user.id,
          text: 'Не удалось выполнить операцию, ID не был распознан. Наберите команду снова чтобы выполнить действие.',
        }
      }

      const order = await OrderModel.getOrderFromDatabase(orderId)
      const product = await ProductModel.getProductFromDatabase(order.productId)

      let firstMessage

      if (product.type === config.productCategory.subscription.code) {
        let subscription = null
        let renew = false
        const existUserSubscriptions = await SubscriptionService.getUserSubscriptionHistory(order.userId)

        await axios.post(config.TELEGRAM_API + '/unbanChatMember', {
          chat_id: product.channelId,
          user_id: order.userId,
          only_if_banned: true
        })

        if (existUserSubscriptions.length !== 0) {
          for (const s of existUserSubscriptions) {
            const oldOrder = await OrderModel.getOrderFromDatabase(s.orderId)
            if (oldOrder.productId === order.productId) {
              const end = new Date(s.endDate)
              end.setMonth(end.getMonth() + 1)
              subscription = await s.renewSubscription(end)
              subscription = await s.updateOrderId(orderId)
              renew = true
            }
          }
        }

        if (!subscription) {
          subscription = await SubscriptionService.addNewSubscriptionForMonth(order.userId, order.id)
        }

        if (renew) {
          firstMessage = {
            type: 'message',
            chatId: order.userId,
            text: i18n.__('notifications.renew', {
              title: product.title,
              date: dateToYmd(subscription.endDate),
            }),
            form: { parse_mode: 'markdown' },
          }
        } else {
          firstMessage = {
            type: 'message',
            chatId: order.userId,
            text: i18n.__('order.confirmed_subscription'),
            form: { reply_markup: ResponseService.genRequestInviteKeyboard(subscription.id).getMarkup() },
          }
        }
      } else if (product.type === config.productCategory.material.code) {
        firstMessage = {
          type: 'message',
          chatId: order.userId,
          text: i18n.__('order.confirmed_material'),
          form: { reply_markup: ResponseService.genSecretLink(product.secretLink).getMarkup() } // todo test
        }
      } else {
        firstMessage = {
          type: 'message',
          chatId: order.userId,
          text: i18n.__('order.confirmed_service'),
          form: { reply_markup: ResponseService.supportReplyKeyboard().getMarkup() }
        }
      }

      await order.updateStatus(config.orderStatus.completed)

      config.resetAdminAction()

      return [
        firstMessage,
        {
          type: 'message',
          chatId: config.GHOST_ID,
          text: `✅ Заказ [ID=${order.id}] был успешно подтвержден`,
        },
      ]
    } catch (e) {
      console.error(e)
      throw new Error(e)
    }
  }

  static async rejectOrder(user, message) {
    try {
      const orderId = Number(message.text.trim())
      if (!orderId) {
        config.resetAdminAction()
        return {
          type: 'message',
          chatId: user.id,
          text: 'Не удалось выполнить операцию, ID не был распознан. Наберите команду снова чтобы выполнить действие.',
        }
      }
      const order = await OrderModel.getOrderFromDatabase(orderId)
      await order.updateStatus(config.orderStatus.closed)
      config.resetAdminAction()
      return [
        {
          type: 'message',
          chatId: user.id,
          text: i18n.__('order.rejected'),
          form: { reply_markup: ResponseService.supportReplyKeyboard().getMarkup() },
        },
        {
          type: 'message',
          chatId: config.GHOST_ID,
          text: `✅ Заказ [ID=${order.id}] был успешно отклонен`,
        },
      ]
    } catch (e) {
      throw new Error(e)
    }
  }

  static async banUser(user, message) {
    try {
      const userToBan = Number(message.text.trim())
      if (!userToBan) {
        config.resetAdminAction()
        return {
          type: 'message',
          chatId: user.id,
          text: 'Не удалось выполнить операцию, ID не был распознан. Наберите команду снова чтобы выполнить действие.',
        }
      }
      await user.handleBanUser(true) // ban user
      return {
        type: 'message',
        chatId: user.id,
        text: `✅ Пользователь (ID="${userToBan}") был забанен`,
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  static async getWaitingConfirmOrders(chatId) {
    try {
      const orders = await OrderService.getOrders(config.orderStatus.waitingConfirm)

      if (orders.length === 0) {
        return {
          type: 'message',
          chatId,
          text: 'Все заказы обработаны',
        }
      }

      let orderNum = 1
      let text = 'Необработанные заказы\n\n'
      for (const order of orders) {
        const product = await ProductModel.getProductFromDatabase(order.productId)
        const paymentMethod = await PaymentMethodModel.getPaymentMethodFromDatabase(order.paymentMethodId)
        text +=
          '=== ' +
          orderNum +
          ' ===\nOrderID: `' +
          order.id +
          '`\n' +
          'UserID: `' +
          order.userId +
          '`\n' +
          `Сумма: ${currencyFilter(product.priceUsd)} ~ ${currencyFilter(product.priceUsd, 'RUB')}\n` +
          `Наименование: ${product.title}\nСпособ оплаты: ${paymentMethod.title}\n=== + ===\n\n`
        orderNum += 1
      }
      return {
        type: 'message',
        chatId,
        text,
        form: { parse_mode: 'markdown' },
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  static async sendTestMessageToChannel(user, channel) {
    try {
      const response = await axios.post(config.TELEGRAM_API + '/sendMessage', {
        chat_id: channel,
        text: 'Silence is golden.',
      })
      config.resetAdminAction()
      return {
        type: 'message',
        chatId: user.id,
        text: '✅ ChatID: `' + response.data.result.chat.id + '`',
        form: { parse_mode: 'markdown' },
      }
    } catch (e) {
      config.resetAdminAction()
      console.error(e)
      return {
        type: 'message',
        text: `Не удалось отправить сообщение в канал ${channel}`,
        chatId: user.id,
      }
    }
  }
}

module.exports = ResponseAdminService
