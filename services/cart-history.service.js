const CartHistoryModel = require('./../models/cart-history.model')
const db = require('./../db')

class CartHistoryService {
  /**
   * @returns [CartHistoryModel]
   */
  static async getUserHistory(userId) {
    try {
      let cartHistory = []
      const result = await db.query('SELECT * FROM cart_history WHERE user_id = $1', [userId])
      if (result.rows.length === 0) {
        return cartHistory
      }
      result.rows.forEach(r => {
        cartHistory.push(new CartHistoryModel(Number(r.user_id), Number(r.product_id)))
      })
      return cartHistory
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = CartHistoryService
