const ResponseService = require('./response.service')
const axios = require('axios')
const config = require('./../config')
const SubscriptionModel = require('./../models/subscriptions.model')
const OrderModel = require('./../models/order.model')
const ProductModel = require('./../models/product.model')
const i18n = require('./../i18n.config')

class ResponseInviteLinkService {
  static async handleCallbackQuery(user, data) {
    try {
      const split = data.split('#')
      const payload = split[0]

      if (payload !== 'CHANNEL_INVITE') {
        throw new Error('Try to generate invite link but message payload is wrong')
      }

      const subscriptionId = split[1]

      const subscription = await SubscriptionModel.getSubscriptionFromDatabaseById(subscriptionId)

      if (subscription.isExpired) {
        return {
          type: 'message',
          text: '🚫 Доступ к ресурсам был закрыт. Продлите подписку, чтобы снова получить доступ.',
          chatId: user.id
        }
      }

      if (subscription.isActivated) {
        return {
          type: 'message',
          text: '🚫 Ваше приглашение уже было активировано',
          chatId: user.id
        }
      }

      const order = await OrderModel.getOrderFromDatabase(subscription.orderId)
      const product = await ProductModel.getProductFromDatabase(order.productId)

      const expireDate = Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 1d

      const res = await axios.post(`${config.TELEGRAM_API}/createChatInviteLink`, {
        chat_id: product.channelId,
        member_limit: 1,
        expire_date: expireDate,
      })
      const inviteLink = res.data.result.invite_link

      await subscription.activateLink()

      if (!inviteLink) {
        throw new Error('Error occurs when did request to generate invite link')
      }

      return {
        type: 'message',
        text: i18n.__('invite_link_created'),
        chatId: user.id,
        form: { reply_markup: ResponseService.genInviteChannelKeyboard(inviteLink).getMarkup() },
      }
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = ResponseInviteLinkService
