const ProductModel = require('./../models/product.model')
const db = require('./../db')
const { productCategory } = require('./../config')

class ProductService {
  static async getAllProducts(categoryCode = null) {
    try {
      if (categoryCode && !Object.keys(productCategory).includes(categoryCode)) {
        throw new Error('Not available category to select products')
      }
      let args = []
      args[0] = 'SELECT * FROM products'
      if (categoryCode) {
        args[0] += ' WHERE type = $1'
        args.push([categoryCode])
      }
      const result = await db.query(...args)
      if (result.rows.length === 0) {
        return []
      }
      let products = []

      result.rows.forEach((row) => products.push(new ProductModel(row)))

      return products
    } catch (e) {
      throw new Error(e)
    }
  }
}

module.exports = ProductService
