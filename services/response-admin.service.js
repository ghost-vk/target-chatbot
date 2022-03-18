const to = require('await-to-js').default
const axios = require('axios')
const api = require('./../boot/axios')
const config = require('./../config')
const ResponseService = require('./response.service')
const OrderModel = require('./../models/order.model')
const ProductModel = require('./../models/product.model')
const PaymentMethodModel = require('./../models/payment-method.model')
const OrderService = require('./order.service')
const i18n = require('./../i18n.config')
const currencyFilter = require('./../filters/currency.filter')
const UserService = require('./user.service')
const UserFactoryService = require('./user-factory.service')

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
        case config.adminCommands.mailingAll: {
          config.setAdminAction(config.adminCommands.mailingAll)
          return {
            type: 'message',
            chatId: user.id,
            text: 'Отправьте сообщение для рассылки (всем)',
          }
        }
        case config.adminCommands.mailingAllWithoutSubscribers: {
          config.setAdminAction(config.adminCommands.mailingAllWithoutSubscribers)
          return {
            type: 'message',
            chatId: user.id,
            text: 'Отправьте сообщение для рассылки (всем без подписчиков)',
          }
        }
        case config.adminCommands.mailingSubscribers: {
          config.setAdminAction(config.adminCommands.mailingSubscribers)
          return {
            type: 'message',
            chatId: user.id,
            text: 'Отправьте сообщение для рассылки (подписчикам)',
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
        case config.adminCommands.mailingAll: {
          return await this.mailAll(message.text.trim())
        }
        case config.adminCommands.mailingAllWithoutSubscribers: {
          return await this.mailAllWithoutSubscribers(message.text.trim())
        }
        case config.adminCommands.mailingSubscribers: {
          return await this.mailSubscribers(message.text.trim())
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

      let responses = []
      let firstMessage = {}

      if (product.type === config.productCategory.material.code) {
        firstMessage = {
          type: 'message',
          chatId: order.userId,
          text: i18n.__('order.confirmed_material'),
          form: { reply_markup: ResponseService.genSecretLink(product.secretLink).getMarkup() },
        }
      } else if (product.type === config.productCategory.courses.code) {
        let err
        let registrationData
        ;[err, registrationData] = await to(UserFactoryService.createLoginAndPassword(order.userId))

        if (err) {
          responses.push({
            type: 'message',
            chatId: user.id,
            text: `Ошибка при создании пользователя.\nOrder: ${order.id}\nUserID: ${order.userId}\nError: ${err.message}`,
          })
        }

        let createdUserResponse
        if (registrationData) {
          const requestData = {
            data: {
              ...registrationData,
              attachedCourses: UserFactoryService.getCoursesRequestMarkup(product)
            },
          }

          ;[err, createdUserResponse] = await to(api.post('/users/createWithLogin', requestData))

          if (err || !createdUserResponse || createdUserResponse.status !== 'ok') {
            responses.push({
              type: 'message',
              chatId: user.id,
              text: `Ошибка при создании пользователя.\nOrder: ${order.id}\nUserID: ${order.userId}\nError: ${err.message}`,
            })
          } else {
            const { login, password } = createdUserResponse.data.user

            if (!createdUserResponse.data.availableCourses) {
              responses.push({
                type: 'message',
                chatId: user.id,
                text: `Не удалось добавить курс пользователю.\nOrder: ${order.id}\nUserID: ${order.userId}`,
              })
            }

            responses.push(ResponseService.genWelcomeToSchool(order.userId, login, password))
          }
        }
      } else {
        firstMessage = {
          type: 'message',
          chatId: order.userId,
          text: i18n.__('order.confirmed_service'),
          form: { reply_markup: ResponseService.supportReplyKeyboard().getMarkup() },
        }
      }

      await order.updateStatus(config.orderStatus.completed)

      config.resetAdminAction()

      const confirmResponses = [
        {
          type: 'message',
          chatId: config.GHOST_ID,
          text: `✅ Заказ [ID=${order.id}] был успешно подтвержден`,
        },
      ]

      if (firstMessage.type) confirmResponses.prepend(firstMessage)

      if (responses.length > 0) responses.forEach((r) => confirmResponses.push(r))

      return confirmResponses
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

  static async mailAll(message) {
    try {
      const users = await UserService.getUsers()
      return await this.mail(users, message)
    } catch (e) {
      throw new Error(e)
    }
  }

  static async mailAllWithoutSubscribers(message) {
    try {
      const users = await UserService.getAllWithoutSubscribersId()
      return await this.mail(users, message)
    } catch (e) {
      throw new Error(e)
    }
  }

  static async mailSubscribers(message) {
    try {
      const users = await UserService.getSubscribers()
      return await this.mail(users, message)
    } catch (e) {
      throw new Error(e)
    }
  }

  static async mail(users, message) {
    try {
      config.resetAdminAction()
      if (!Array.isArray(users)) {
        throw new Error('Try to mail, but users is not array')
      }
      let i = 0
      let messages = []
      for (const u of users) {
        if (('' + u.id).startsWith('-')) {
          // channels
          continue
        }
        i += 1
        messages.push({
          type: 'mail',
          chatId: u.id,
          delay: 500,
          text: message,
        })
      }
      messages.unshift({
        type: 'message',
        chatId: config.GHOST_ID,
        text: `Начинаю рассылку ${i} адресатам ...`,
      })
      return messages
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = ResponseAdminService
