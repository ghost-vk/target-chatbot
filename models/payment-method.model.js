const db = require('./../db')

class PaymentMethodModel {
  id
  title
  description
  messageCode
  links

  constructor(id, title, description, messageCode, links = null) {
    this.id = id
    this.title = title
    this.description = description
    this.messageCode = messageCode
    this.links = links
  }

  static async getPaymentMethodFromDatabase(key, field = 'id') {
    try {
      if (!['id', 'message_code'].includes(field)) {
        throw new Error('Not available field to get payment method')
      }
      const result = await db.query(
        `SELECT *
        FROM payment_methods
        WHERE ${field} = $1`,
        [key]
      )
      if (result.rows.length === 0) {
        return {}
      }
      const row = result.rows[0]
      const method = new PaymentMethodModel(
        row.id,
        row.title,
        row.description,
        row.message_code,
        row.links
      )
      return method
    } catch (e) {
      console.error('🔴 Error when get payment method from database', e)
      throw new Error(e)
    }
  }
}

module.exports = PaymentMethodModel
