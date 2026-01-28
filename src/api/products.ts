// src/api/products.ts
import { Hono } from 'hono'

const productsRouter = new Hono()

// GET all products
productsRouter.get('/', (c) => {
  const products = [
    { id: 101, name: 'Laptop', price: 999.99, category: 'electronics' },
    { id: 102, name: 'Mouse', price: 29.99, category: 'electronics' },
    { id: 103, name: 'Notebook', price: 9.99, category: 'stationery' }
  ]
  
  return c.json({
    message: 'Products catalog',
    data: products
  })
})

export default productsRouter