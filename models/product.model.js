const db = require('./../db')

class ProductModel {
  id
  title
  subtitle
  duration
  priceUsd
  priceRub
  messageCode
  channelId
  secretLink

  constructor(id, title, subtitle, duration, priceUsd, priceRub, messageCode, channelId, secretLink, type) {
    this.id = id
    this.title = title
    this.subtitle = subtitle
    this.duration = duration
    this.priceUsd = priceUsd
    this.priceRub = priceRub
    this.messageCode = messageCode
    this.channelId = channelId
    this.secretLink = secretLink
    this.type = type
  }

  static async getProductFromDatabase(key, field = 'id') {
    try {
      if (!['id', 'message_code'].includes(field)) {
        return { error: 'Not available field' }
      }
      const result = await db.query(`SELECT * FROM products WHERE ${field} = $1`, [key])
      if (result.rows.length === 0) {
        return {}
      }
      const row = result.rows[0]
      return new ProductModel(
        row.id,
        row.title,
        row.subtitle,
        row.duration,
        row.price_usd,
        row.price_rub,
        row.message_code,
        row.channel_id,
        row.secret_link,
        row.type
      )
    } catch (e) {
      console.error(e)
    }
  }
}

module.exports = ProductModel
