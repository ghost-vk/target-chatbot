const { InlineKeyboardButton, InlineKeyboard, Row } = require('node-telegram-keyboard-wrapper')
const ProductService = require('./product.service')
const ProductModel = require('./../models/product.model')
const i18n = require('./../i18n.config')
const CartHistoryModel = require('./../models/cart-history.model')
const CartHistoryService = require('./../services/cart-history.service')
const OrderModel = require('./../models/order.model')
const OrderService = require('./order.service')
const ResponseService = require('./response.service')
const currencyFilter = require('./../filters/currency.filter')
const { productCategory } = require('./../config')

class ResponseProductsService {
  static async handleCallbackQuery(user, data) {
    try {
      let product
      let payload
      let anchor
      const split = data.split('#')
      payload = split.length > 1 ? split[0] : data
      anchor = split.length > 1 ? split[1] : null

      if (payload === 'PRODUCTS_START' && anchor) {
        await OrderService.closeAllOpenedOrders(user.id)

        const products = await ProductService.getAllProducts()
        const productsKb = new InlineKeyboard()
        for (const p of products) {
          productsKb.push(new Row(new InlineKeyboardButton(p.title, 'callback_data', `${p.messageCode}#${anchor}`)))
        }

        return {
          type: 'edit',
          text: i18n.__('products.pick_product'),
          options: {
            chat_id: user.id,
            message_id: anchor,
            reply_markup: productsKb.getMarkup(),
          },
        }
      } else if (payload && anchor) {
        product = await ProductModel.getProductFromDatabase(payload, 'message_code')
        if (product.type === productCategory.free.code) {
          return ResponseService.freeProductDownload(product, user.id, anchor)
        } else {
          await OrderService.closeAllOpenedOrders(user.id)
          const order = new OrderModel(user.id, product.id)
          await order.addOrder()

          // Save history for analytics
          const cartHistory = new CartHistoryModel(user.id, Number(product.id))
          const existHistoryArray = await CartHistoryService.getUserHistory(user.id)
          if (!existHistoryArray.find((h) => h.productId === cartHistory.productId)) {
            await cartHistory.addProductToCartHistory()
          }

          return {
            type: 'edit',
            text: i18n.__('products.product_info', {
              priceUsd: currencyFilter(product.priceUsd),
              priceRub: currencyFilter(product.priceUsd, 'RUB'),
              duration: product.duration,
              title: product.title,
              subtitle: product.subtitle,
            }),
            options: {
              chat_id: user.id,
              message_id: anchor,
              reply_markup: ResponseService.payConfirmKeyboard(anchor).getMarkup(),
              parse_mode: 'markdown',
            },
          }
        }
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  static async genProductsList(user, anchor) {
    try {
      const products = await ProductService.getAllProducts()
      const productsKb = new InlineKeyboard()
      for (const p of products) {
        productsKb.push(new Row(new InlineKeyboardButton(p.title, 'callback_data', `${p.messageCode}#${anchor}`)))
      }

      return {
        type: 'message',
        chatId: user.id,
        text: i18n.__('products.pick_product'),
        form: { reply_markup: productsKb.getMarkup() },
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  static genProductCategoryList(user, anchor) {
    const catKb = new InlineKeyboard()
    Object.values(productCategory).forEach((c) => {
      catKb.push(
        new Row(new InlineKeyboardButton(c.name, 'callback_data', `CATEGORY_${c.code.toUpperCase()}#${anchor}`))
      )
    })

    return {
      type: 'message',
      chatId: user.id,
      text: i18n.__('products.pick_category'),
      form: { reply_markup: catKb.getMarkup() },
    }
  }

  static genProductCategoryListEdit(user, anchor) {
    const catKb = new InlineKeyboard()
    Object.values(productCategory).forEach((c) => {
      catKb.push(
        new Row(new InlineKeyboardButton(c.name, 'callback_data', `CATEGORY_${c.code.toUpperCase()}#${anchor}`))
      )
    })

    return {
      type: 'edit',
      text: i18n.__('products.pick_category'),
      options: {
        reply_markup: catKb.getMarkup(),
        chat_id: user.id,
        message_id: anchor
      }
    }
  }
}

module.exports = ResponseProductsService
