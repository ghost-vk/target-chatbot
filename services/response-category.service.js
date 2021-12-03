const ProductService = require('./product.service')
const OrderService = require('./order.service')
const { InlineKeyboardButton, InlineKeyboard, Row } = require('node-telegram-keyboard-wrapper')
const i18n = require('./../i18n.config')
const ResponseProductsService = require('./response-products.service')

class ResponseCategoryService {
  static async handleCallbackQuery(user, data) {
    try {
      const split = data.split('#')

      if (data.includes('CATEGORY_START#')) {
        return ResponseProductsService.genProductCategoryList(user, Number(user.field('lastEcho')) + 1)
      } else if (data.includes('CATEGORY_LIST#')) {
        return ResponseProductsService.genProductCategoryListEdit(user, split[1])
      } else {
        const cat = split[0].replace('CATEGORY_', '').toLowerCase()
        const products = await ProductService.getAllProducts(cat)
        await OrderService.closeAllOpenedOrders(user.id)
        const productsKb = new InlineKeyboard()
        for (const p of products) {
          productsKb.push(new Row(new InlineKeyboardButton(p.title, 'callback_data', `${p.messageCode}#${split[1]}`)))
        }
        productsKb.push(new Row(new InlineKeyboardButton('Назад', 'callback_data', `CATEGORY_LIST#${split[1]}`)))
        return {
          type: 'edit',
          text: i18n.__('products.pick_product'),
          options: {
            chat_id: user.id,
            message_id: split[1],
            reply_markup: productsKb.getMarkup(),
          },
        }
      }
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = ResponseCategoryService