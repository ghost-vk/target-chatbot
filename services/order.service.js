const OrderModel = require('./../models/order.model')
const config = require('./../config')
const db = require('./../db')

const checkOrderStatus = (status) => {
  const availableStatus = Object.values(config.orderStatus)
  if (typeof status === 'string') {
    if (status !== 'all' && !availableStatus.includes(status)) {
      return false
    }
    return true
  } else if (Array.isArray(status)) {
    status.forEach((s) => {
      if (!availableStatus.includes(s)) {
        return false
      }
    })
    return true
  } else {
    return false
  }
}

class OrderService {
  static async getUserOrders(userId, status = 'all') {
    try {
      const isAvailableStatus = checkOrderStatus(status)
      if (!isAvailableStatus) {
        throw new Error('Error when get user orders: status is not available')
      }
      let query = 'SELECT * FROM orders WHERE user_id = $1'
      let args = [userId]
      if (typeof status === 'string' && status !== 'all') {
        query += ' AND status = $2'
        args.push(status)
      } else if (Array.isArray(status)) {
        query += ' AND status = ANY ($2)'
        args.push(status)
      }
      const result = await db.query(query, args)
      if (result.rows.length === 0) {
        return []
      }
      let orders = []
      result.rows.forEach((r) => {
        orders.push(
          new OrderModel(
            r.user_id,
            r.product_id,
            r.payment_method_id,
            r.open_datetime,
            r.close_datetime,
            r.last_updated,
            r.status,
            r.id
          )
        )
      })
      return orders
    } catch (e) {
      throw new Error(e)
    }
  }

  static async getOrders(status = 'all') {
    try {
      const isAvailableStatus = checkOrderStatus(status)
      if (!isAvailableStatus) {
        throw new Error('Error when get user orders: status is not available')
      }
      let query = 'SELECT * FROM orders'
      let args = []
      if (typeof status === 'string' && status !== 'all') {
        query += ' WHERE status = $1'
        args.push(status)
      } else if (Array.isArray(status)) {
        query += ' WHERE status = ANY ($1)'
        args.push(status)
      }
      const result = await db.query(query, args)
      if (result.rows.length === 0) {
        return []
      }
      let orders = []
      result.rows.forEach((r) => {
        orders.push(
          new OrderModel(
            r.user_id,
            r.product_id,
            r.payment_method_id,
            r.open_datetime,
            r.close_datetime,
            r.last_updated,
            r.status,
            r.id
          )
        )
      })
      return orders
    } catch (e) {
      throw new Error(e)
    }
  }

  static async closeAllOpenedOrders(userId) {
    try {
      const userOrders = await this.getUserOrders(userId, config.orderStatus.opened)
      if (userOrders.length > 0) {
        for (const order of userOrders) {
          await order.updateStatus(config.orderStatus.closed)
        }
      }
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = OrderService
