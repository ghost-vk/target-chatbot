const db = require('./../db')

class CartHistoryModel {
  constructor(userId, productId) {
    this.userId = userId
    this.productId = productId
  }

  async addProductToCartHistory() {
    try {
      await db.query(
        `INSERT INTO cart_history (id, user_id, product_id)
        VALUES (DEFAULT, $1, $2) RETURNING *`,
        [this.userId, this.productId]
      )
      return true
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = CartHistoryModel
