const config = require('./../config')
const ResponseService = require('./response.service')
const ProductModel = require('./../models/product.model')
const PaymentMethodModel = require('./../models/payment-method.model')
const i18n = require('./../i18n.config')
const currencyFilter = require('./../filters/currency.filter')

class ResponsePhotoService {
  static async handlePhoto(msg, user, order) {
    try {
      if (order.status !== config.orderStatus.waitingReceipt) {
        return ResponseService.genUnpredictableBehaviour(user, msg)
      }
      let responses = []
      const product = await ProductModel.getProductFromDatabase(order.productId)
      const paymentMethod = await PaymentMethodModel.getPaymentMethodFromDatabase(order.paymentMethodId)
      await order.updateStatus(config.orderStatus.waitingConfirm)
      const detailsToOperator = {
        type: 'message',
        chatId: config.GHOST_ID,
        text: i18n.__('receipt_to_operator', {
          userId: user.id,
          username: user.username,
          productTitle: product.title,
          price: `${currencyFilter(product.priceUsd)} ~ ${currencyFilter(product.priceUsd, 'RUB')}`,
          paymentMethod: paymentMethod.title,
          orderId: order.id
        }),
        form: {
          parse_mode: 'markdown',
        },
      }
      const receiptToOperator = {
        type: 'forward',
        chatId: config.GHOST_ID,
        fromChatId: user.id,
        messageId: msg.message_id,
      }
      const preConfirmToClient = {
        type: 'message',
        chatId: user.id,
        text: i18n.__('success_receipt_sending'),
      }
      responses.push(detailsToOperator, receiptToOperator, preConfirmToClient)
      return responses
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = ResponsePhotoService
