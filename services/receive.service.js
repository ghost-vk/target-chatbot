const ResponseProductsService = require('./response-products.service')
const PaymentMethodService = require('./payment-method.service')
const ResponseService = require('./response.service')
const ResponsePhotoService = require('./response-photo.service')
const ResponseAdminService = require('./response-admin.service')
const config = require('./../config')
const OrderService = require('./order.service')
const ResponseUserService = require('./response-user.service')
const ResponseInviteLinkService = require('./response-invite-link.service')
const SubscriptionService = require('./subscription.service')
const ResponseCategoryService = require('./response-category.service')
const debug = require('debug')('receive-service')

class ReceiveService {
  message
  user

  constructor(message, user) {
    this.message = message
    this.user = user
  }

  async handleMessage() {
    try {
      if (this.user.ban) {
        return ResponseService.genYouBanned(this.user.id)
      }
      if (Object.values(config.adminCommands).includes(config.adminAction) && config.isAdmin(this.user.id)) {
        return await ResponseAdminService.handleAction(this.user, this.message)
      }
      const userOrders = await OrderService.getUserOrders(this.user.id, [
        config.orderStatus.opened,
        config.orderStatus.waitingReceipt,
        config.orderStatus.waitingConfirm,
      ])

      if (userOrders.length > 1) {
        debug('User have >1 active orders')
      }

      let activeOrder = userOrders.length > 0 ? userOrders[0] : ''

      switch (activeOrder.status) {
        case config.orderStatus.waitingReceipt: {
          if (config.isAdmin(this.user.id) && Object.values(config.adminCommands).includes(this.message.text)) {
            break
          }
          if (this.message.photo) {
            return await ResponsePhotoService.handlePhoto(this.message, this.user, activeOrder)
          }
          return ResponseService.genWaitingForReceipt(this.user, this.message)
        }
        case config.orderStatus.waitingConfirm: {
          if (config.isAdmin(this.user.id) && Object.values(config.adminCommands).includes(this.message.text)) {
            break
          }
          return ResponseService.genWaitingForConfirm(this.user, this.message)
        }
      }

      await this.user.setLastIncomeMessageId(this.message.message_id)

      if (this.message?.entities?.find((e) => e.type === 'bot_command')) {
        return await this.handleBotCommand()
      } else if (Object.values(config.adminCommands).includes(this.message.text)) {
        return await ResponseAdminService.handleCommand(this.user, this.message)
      } else if (Object.values(config.userCommands).includes(this.message.text)) {
        return await ResponseUserService.handleCommand(this.user, this.message)
      } else if (('' + this.user.id).startsWith('-')) { // channel or supergroup
        return []
      } else {
        return ResponseService.genUnpredictableBehaviour(this.user, this.message)
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  async handleCallbackQuery() {
    try {
      if (this.user.ban) {
        return ResponseService.genYouBanned(this.user.id)
      }

      if (('' + this.user.id).startsWith('-')) {
        return []
      }

      await this.user.setLastIncomeMessageId(this.message.message.message_id)
      if (this.message.from.is_bot) {
        await this.user.handleBanUser(true) // ban user
        return {
          type: 'message',
          chatId: this.user.id,
          text: 'Общение ведется только с людьми. Вы забанены.',
        }
      }
      const data = this.message.data

      if (data.includes('PRODUCTS_')) {
        return await ResponseProductsService.handleCallbackQuery(this.user, data)
      } else if (data.includes('CATEGORY_')) {
        return await ResponseCategoryService.handleCallbackQuery(this.user, data)
      } else if (data.includes('PAYMENT_METHOD_')) {
        return await PaymentMethodService.handleCallbackQuery(this.user, data)
      } else if (data.includes('CHANNEL_INVITE')) {
        return await ResponseInviteLinkService.handleCallbackQuery(this.user, data)
      } else if (data.includes('RENEW_SUBSCRIPTION')) {
        return await SubscriptionService.handleCallbackQuery(this.user, data)
      }
      return []
    } catch (e) {
      throw new Error(e)
    }
  }

  async handleBotCommand() {
    let responses = []
    try {
      switch (this.message.text) {
        case '/start': {
          const userOrders = await OrderService.getUserOrders(this.user.id, config.orderStatus.opened)
          if (userOrders.length > 0) {
            for (const order of userOrders) {
              await order.updateStatus(config.orderStatus.closed)
            }
          }
          const catList = ResponseProductsService.genProductCategoryList(
            this.user,
            Number(this.user.field('lastIncome')) + 1
          )
          responses.push(catList)
          if (this.user.isNew) {
            const helloMessage = ResponseService.genHelloMessage(this.user)
            responses.unshift(helloMessage)
          }
          return responses
        }
        case config.adminCommands.admin: {
          return await this.handleAdminCommand()
        }
        case config.adminCommands.mailingAll: {
          return await this.handleAdminCommand()
        }
        case config.adminCommands.mailingSubscribers: {
          return await this.handleAdminCommand()
        }
        case config.adminCommands.mailingAllWithoutSubscribers: {
          return await this.handleAdminCommand()
        }
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  async handleAdminCommand() {
    try {
      if (!config.isAdmin(this.user.id)) {
        return ResponseService.genNoAccess(this.user, this.message)
      }
      return await ResponseAdminService.handleCommand(this.user, this.message)
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = ReceiveService
