const db = require('./../db')

class SubscriptionModel {
  userId
  orderId
  startDate
  endDate
  isExpired
  id
  isActivated

  constructor(userId, orderId, startDate, endDate, isExpired = false, id = null, isActivated = false) {
    this.userId = userId
    this.orderId = orderId
    this.startDate = startDate
    this.endDate = endDate
    this.isExpired = isExpired
    this.id = id
    this.isActivated = isActivated
  }

  static async getSubscriptionFromDatabaseById(id) {
    try {
      const result = await db.query(`SELECT * FROM subscriptions WHERE id = $1`, [id])
      if (result.rows.length === 0) {
        throw new Error(`Try to get subscription by ID but find nothing with ID=${id}`)
      }
      const r = result.rows[0]
      return new SubscriptionModel(r.user_id, r.order_id, r.start_date, r.end_date, r.is_expired, r.id, r.is_activated)
    } catch (e) {
      throw new Error(e)
    }
  }

  static async getSubscriptionFromDatabaseByOrderId(id) {
    try {
      const result = await db.query(`SELECT * FROM subscriptions WHERE order_id = $1`, [id])
      if (result.rows.length === 0) {
        throw new Error(`Try to get subscription by OrderID but find nothing with OrderID=${id}`)
      }
      const r = result.rows[0]
      return new SubscriptionModel(r.user_id, r.order_id, r.start_date, r.end_date, r.is_expired, r.id, r.is_activated)
    } catch (e) {
      throw new Error(e)
    }
  }

  async addSubscription() {
    try {
      const result = await db.query(
        `INSERT INTO subscriptions (id, user_id, order_id, start_date, end_date, is_expired, is_activated)
        VALUES (DEFAULT, $1, $2, $3, $4, $5, DEFAULT) RETURNING *`,
        [this.userId, this.orderId, this.startDate, this.endDate, this.isExpired]
      )
      const r = result.rows[0]
      this.id = r.id
      this.startDate = r.startDate
      this.endDate = r.endDate
      this.isExpired = r.isExpired
      return true
    } catch (e) {
      throw new Error(e)
    }
  }

  async editExpiration(isExpired = true) {
    try {
      const result = await db.query(
        `UPDATE subscriptions SET is_expired = $1 WHERE id = $2 RETURNING is_expired`,
        [isExpired, this.id]
      )
      this.isExpired = result.rows[0].isExpired
      return true
    } catch (e) {
      throw new Error(e)
    }
  }

  async renewSubscription(date) {
    try {
      if (typeof date.getMonth !== 'function') {
        throw new Error('Try to renew subscription but date not passed')
      }
      const result = await db.query(
        `UPDATE subscriptions SET end_date = $1 WHERE id = $2 RETURNING end_date`,
        [date, this.id]
      )
      this.endDate = result.rows[0].end_date
      return this
    } catch (e) {
      throw new Error(e)
    }
  }

  async updateOrderId(orderId) {
    try {
      if (!Number(orderId)) {
        throw new Error('Try to change OrderID for subscription but OrderID is wrong type')
      }
      const result = await db.query(
        `UPDATE subscriptions SET order_id = $1 WHERE id = $2 RETURNING order_id`,
        [orderId, this.id]
      )
      this.orderId = result.rows[0].order_id
      return this
    } catch (e) {
      throw new Error(e)
    }
  }

  async activateLink() {
    try {
      const result = await db.query('UPDATE subscriptions SET is_activated = true WHERE id = $1 RETURNING is_activated', [this.id])
      this.isActivated = result.rows[0].is_activated
      return true
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = SubscriptionModel
