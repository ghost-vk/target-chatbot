const i18n = require('./../i18n.config')
const config = require('./../config')
const {
  Row,
  ReplyKeyboard,
  KeyboardButton,
  InlineKeyboard,
  InlineKeyboardButton,
} = require('node-telegram-keyboard-wrapper')
const { GHOST_ID } = require('../config')

const userKb = new ReplyKeyboard(
  // new Row(new KeyboardButton(config.userCommands.subscriptions), new KeyboardButton(config.userCommands.products)),
  // new Row(new KeyboardButton(config.userCommands.history))
  new Row(new KeyboardButton(config.userCommands.products), new KeyboardButton(config.userCommands.history)),
)

const userKbSupport = userKb.clone()
userKbSupport.push(new Row(new KeyboardButton(config.userCommands.support)))

const adminKb = new ReplyKeyboard(
  new Row(new KeyboardButton(config.adminCommands.confirm), new KeyboardButton(config.adminCommands.reject)),
  new Row(new KeyboardButton(config.adminCommands.orders), new KeyboardButton(config.adminCommands.ban)),
  // new Row(new KeyboardButton(config.userCommands.subscriptions), new KeyboardButton(config.userCommands.products)),
  new Row(new KeyboardButton(config.userCommands.history)),
  new Row(new KeyboardButton(config.adminCommands.sendTestMessageToChannel))
)

const supportInlineButton = new InlineKeyboard(
  new Row(new InlineKeyboardButton('🟢 Поддержка', 'url', config.SUPPORT_CHAT_LINK))
)

const schoolLoginButton = new InlineKeyboard(
  new Row(new InlineKeyboardButton('Начать обучение', 'url', config.SCHOOL_URL))
)

class ResponseService {
  static genStartMessage(user) {
    return {
      type: 'message',
      chatId: user.id,
      text: i18n.__('start'),
      form: { reply_markup: userKb.getMarkup() },
    }
  }

  static genHelloMessage(user) {
    return {
      type: 'message',
      chatId: user.id,
      text: i18n.__('hello'),
    }
  }

  static genUnpredictableBehaviour(user, message) {
    return [
      {
        type: 'message',
        chatId: config.GHOST_ID,
        text:
          'Возможно возник вопрос у пользователя `@' +
          user.username +
          '` (ID=`' +
          user.id +
          '`)\n' +
          'Сейчас перешлю сообщение ...',
        form: { parse_mode: 'markdown' },
      },
      {
        type: 'forward',
        chatId: config.GHOST_ID,
        fromChatId: user.id,
        messageId: message.message_id,
      },
      {
        type: 'message',
        chatId: user.id,
        text: i18n.__('unpredictable'),
        form: {
          reply_markup: userKbSupport.getMarkup(),
        },
      },
    ]
  }

  static genNoAccess(user, message) {
    return [
      {
        type: 'message',
        chatId: config.GHOST_ID,
        text:
          'Пользователь ID=`' +
          user.id +
          '` хочет воспользоваться функцией без доступа, может забаним его? 😈' +
          'Сейчас перешлю сообщение ...',
        form: { parse_mode: 'markdown' },
      },
      {
        type: 'forward',
        chatId: config.GHOST_ID,
        fromChatId: user.id,
        messageId: message.message_id,
      },
      {
        type: 'message',
        chatId: user.id,
        text: '⛔ У вас нет прав доступа',
      },
    ]
  }

  static genWelcomeAdmin(user) {
    return {
      type: 'message',
      chatId: user.id,
      text: '✅',
      form: {
        reply_markup: adminKb.getMarkup(),
      },
    }
  }

  static genWaitingForReceipt(user, message) {
    return [
      {
        type: 'message',
        chatId: user.id,
        text: i18n.__('wrong_receipt_type'),
        form: { reply_markup: userKbSupport.getMarkup() },
      },
      {
        type: 'message',
        chatId: GHOST_ID,
        text:
          'Сложности в отправке чека у пользователя:\n' +
          'Username: `@' +
          user.username +
          '`\nUserID: `' +
          user.id +
          '`\nСейчас перешлю сообщение',
        form: {
          parse_mode: 'markdown',
        },
      },
      {
        type: 'forward',
        chatId: GHOST_ID,
        fromChatId: user.id,
        messageId: message.message_id,
      },
    ]
  }

  static genWaitingForConfirm(user, message) {
    return [
      {
        type: 'message',
        chatId: user.id,
        text: i18n.__('waiting_for_confirm'),
        form: { reply_markup: userKbSupport.getMarkup() },
      },
      {
        type: 'message',
        chatId: GHOST_ID,
        text:
          'Пользователь (ожидает подтверждения оплаты), отправил сообщение:\n' +
          'Username: `@' +
          user.username +
          '`\nUserID: `' +
          user.id +
          '`\nСейчас перешлю сообщение',
        form: { parse_mode: 'markdown' },
      },
      {
        type: 'forward',
        chatId: GHOST_ID,
        fromChatId: user.id,
        messageId: message.message_id,
      },
    ]
  }

  static supportInlineButton() {
    return supportInlineButton
  }

  static supportReplyKeyboard() {
    return userKbSupport
  }

  static genYouBanned(chatId) {
    return {
      type: 'message',
      text: 'Вы забанены',
      chatId,
    }
  }

  static genInviteChannelKeyboard(url) {
    return new InlineKeyboard(new Row(new InlineKeyboardButton('Перейти в закрытый канал', 'url', url)))
  }

  static genRequestInviteKeyboard(subscriptionId) {
    return new InlineKeyboard(
      new Row(new InlineKeyboardButton('Получить приглашение', 'callback_data', `CHANNEL_INVITE#${subscriptionId}`))
    )
  }

  static genRenewSubscriptionButton(subscriptionId) {
    return new InlineKeyboard(
      new Row(new InlineKeyboardButton('Продлить', 'callback_data', `RENEW_SUBSCRIPTION#${subscriptionId}`))
    )
  }

  static payConfirmKeyboard(anchor) {
    return new InlineKeyboard(
      new Row(new InlineKeyboardButton('Оплатить', 'callback_data', `PAYMENT_METHOD_START#${anchor}`)),
      new Row(new InlineKeyboardButton('Назад', 'callback_data', `CATEGORY_LIST#${anchor}`))
    )
  }

  static genSecretLink(link) {
    return new InlineKeyboard(new Row(new InlineKeyboardButton('Получить материал', 'url', link)))
  }

  static freeProductDownload(product, userId, anchor) {
    const kb = new InlineKeyboard(
      new Row(new InlineKeyboardButton('Перейти', 'url', product.secretLink)),
      new Row(new InlineKeyboardButton('Назад', 'callback_data', `CATEGORY_FREE#${anchor}`))
    )

    return {
      type: 'edit',
      text: i18n.__('products.free_product_info', { title: product.title, subtitle: product.subtitle }),
      options: {
        chat_id: userId,
        message_id: anchor,
        reply_markup: kb.getMarkup(),
        parse_mode: 'markdown',
      },
    }
  }

  /**
   * @param {string|number} chatId
   * @param {string} login
   * @param {string} password
   */
  static genWelcomeToSchool(chatId, login, password) {
    return {
      type: 'message',
      chatId,
      text: i18n.__('school_login', { login, password }),
      form: {
        reply_markup: schoolLoginButton.getMarkup(),
        parse_mode: 'markdown'
      }
    }
  }
}

module.exports = ResponseService
