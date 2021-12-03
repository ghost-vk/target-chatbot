const db = require('./../db')
const { orderStatus } = require('./../config')

class OrderModel {
  userId
  productId
  paymentMethodId
  openDatetime
  closeDatetime
  lastUpdated
  status
  id

  constructor(
    userId,
    productId,
    paymentMethodId = null,
    openDatetime = null,
    closeDatetime = null,
    lastUpdated = null,
    status = 'opened',
    id = null
  ) {
    this.userId = userId
    this.productId = productId
    this.paymentMethodId = paymentMethodId
    this.openDatetime = openDatetime
    this.closeDatetime = closeDatetime
    this.lastUpdated = lastUpdated
    this.status = status
    this.id = id
  }

  static async getOrderFromDatabase(orderId) {
    try {
      if (!Number(orderId)) {
        throw new Error('Try to get order from database, but have not pass OrderID')
      }
      const result = await db.query('SELECT * FROM orders WHERE id = $1', [orderId])
      const r = result.rows[0]
      return new OrderModel(
        r.user_id,
        r.product_id,
        r.payment_method_id,
        r.open_datetime,
        r.close_datetime,
        r.last_updated,
        r.status,
        r.id
      )
    } catch (e) {
      throw new Error(e)
    }
  }

  async addOrder() {
    try {
      const result = await db.query(
        `INSERT INTO orders (id, user_id, product_id, payment_method_id,
        open_datetime, close_datetime, last_updated, status)
        VALUES (DEFAULT, $1, $2, $3, now(), DEFAULT, DEFAULT, DEFAULT)
        RETURNING *`,
        [this.userId, this.productId, this.paymentMethodId]
      )
      const row = result.rows[0]

      this.id = row.id
      this.userId = row.user_id
      this.productId = row.product_id
      this.paymentMethodId = row.payment_method_id
      this.openDatetime = row.open_datetime
      this.closeDatetime = row.close_datetime
      this.lastUpdated = row.last_updated
      this.status = row.status

      return true
    } catch (e) {
      throw new Error(e)
    }
  }

  async updatePaymentMethod(paymentMethodId) {
    try {
      if (!this.id) {
        throw new Error('Try to update order but order ID not set')
      }
      if (!Number(paymentMethodId)) {
        throw new Error('Try to update order but paymentMethodId not number')
      }
      const result = await db.query(
        `UPDATE orders SET payment_method_id = $1 WHERE id = $2
        RETURNING payment_method_id`,
        [paymentMethodId, this.id]
      )
      this.paymentMethodId = result.rows[0].payment_method_id
      return true
    } catch (e) {
      throw new Error(e)
    }
  }

  async updateStatus(status) {
    try {
      if (!Object.values(orderStatus).includes(status)) {
        throw new Error('Not available status to update order')
      }
      const result = await db.query(
        `UPDATE orders SET status = $1, last_updated = now()
        WHERE id = $2 RETURNING status, last_updated`,
        [status, this.id]
      )
      this.status = result.rows[0].status
      this.lastUpdated = result.rows[0].last_updated
      if (status === orderStatus.completed || status === orderStatus.closed) {
        const result = await db.query(`UPDATE orders SET close_datetime = now() RETURNING close_datetime`)
        this.closeDatetime = result.rows[0].close_datetime
      }
      return true
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = OrderModel
