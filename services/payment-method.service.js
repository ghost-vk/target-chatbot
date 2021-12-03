const db = require('./../db')
const PaymentMethodModel = require('./../models/payment-method.model')
const { InlineKeyboardButton, InlineKeyboard, Row } = require('node-telegram-keyboard-wrapper')
const i18n = require('./../i18n.config')
const ProductModel = require('./../models/product.model')
const { orderStatus } = require('./../config')
const OrderService = require('./order.service')
const currencyFilter = require('./../filters/currency.filter')
const debug = require('debug')('service:payment-method')

class PaymentMethodService {
  static async getAllPaymentMethods() {
    try {
      const result = await db.query(`SELECT * FROM payment_methods`)
      let methods = []
      if (result.rows.length === 0) {
        return []
      }
      result.rows.forEach((row) => {
        const method = new PaymentMethodModel(row.id, row.title, row.description, row.message_code, row.links)
        methods.push(method)
      })
      return methods
    } catch (e) {
      debug('Error when get all payment methods: %O', e)
      throw new Error(e)
    }
  }

  static async handleCallbackQuery(user, data) {
    try {
      const split = data.split('#')
      const payload = split[0]
      const anchor = split[1]

      if (!payload || !anchor) {
        throw new Error('No payload or anchor in payment service (handleCallbackQuery)')
      }

      debug('Got payload: %O', payload)

      // show payment methods list
      if (payload === 'PAYMENT_METHOD_START') {
        const paymentMethods = await this.getAllPaymentMethods()
        const methodsKb = new InlineKeyboard()
        paymentMethods.forEach((m) => {
          methodsKb.push(new Row(new InlineKeyboardButton(m.title, 'callback_data', `${m.messageCode}#${anchor}`)))
        })
        methodsKb.push(new Row(new InlineKeyboardButton('Назад', 'callback_data', `CATEGORY_LIST#${anchor}`)))

        return {
          type: 'edit',
          text: i18n.__('payment_method.pick_method'),
          options: {
            chat_id: user.id,
            message_id: anchor,
            reply_markup: methodsKb.getMarkup(),
          },
        }
      } else if (payload === 'PAYMENT_METHOD_READY_TO_PAY') {
        const orders = await OrderService.getUserOrders(user.id, orderStatus.opened)
        await orders[0].updateStatus(orderStatus.waitingReceipt)
        const text = i18n.__('ready_to_pay')
        return {
          type: 'edit',
          text,
          options: { chat_id: user.id, message_id: anchor },
        }
      }

      // if already pick payment
      const paymentMethod = await PaymentMethodModel.getPaymentMethodFromDatabase(payload, 'message_code')

      const orders = await OrderService.getUserOrders(user.id, orderStatus.opened)
      await orders[0].updatePaymentMethod(paymentMethod.id)

      const product = await ProductModel.getProductFromDatabase(orders[0].productId)

      let text = `Способ оплаты: ${paymentMethod.title}\n`
      text += `К оплате: ${currencyFilter(product.priceUsd)} ~ ${currencyFilter(product.priceUsd, 'RUB')}\n\n`
      text += paymentMethod.description.replace(/\\n/g, '\n')
      text += `\n\nПосле оплаты сделайте скриншот чека, он понадобится далее. Нажмите кнопку "✅ Готово" 👇`

      const kb = new InlineKeyboard(
        new Row(new InlineKeyboardButton('✅ Готово', 'callback_data', `PAYMENT_METHOD_READY_TO_PAY#${anchor}`)),
        new Row(new InlineKeyboardButton('⬅️ Назад', 'callback_data', `PAYMENT_METHOD_START#${anchor}`))
      )

      if (paymentMethod.links) {
        const links = JSON.parse(paymentMethod.links)
        if (Array.isArray(links)) {
          links.forEach((l) => {
            kb.push(new Row(new InlineKeyboardButton(l.title, 'url', l.url)))
          })
        }
      }

      return {
        type: 'edit',
        text,
        options: {
          chat_id: user.id,
          message_id: anchor,
          parse_mode: 'markdown',
          reply_markup: kb.getMarkup(),
        },
      }
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = PaymentMethodService
