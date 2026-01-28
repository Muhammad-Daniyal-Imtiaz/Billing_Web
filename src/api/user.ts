// src/api/users.ts
import { Hono } from 'hono'

const usersRouter = new Hono()

// GET all users
usersRouter.get('/', (c) => {
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
    { id: 2, name: 'Bob', email: 'bob@example.com', active: true },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', active: false }
  ]
  
  return c.json({
    message: 'Users list',
    count: users.length,
    data: users
  })
})

// GET user by ID
usersRouter.get('/:id', (c) => {
  const id = c.req.param('id')
  
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
    { id: 2, name: 'Bob', email: 'bob@example.com', active: true },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', active: false }
  ]
  
  const user = users.find(u => u.id === parseInt(id))
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }
  
  return c.json({
    message: 'User details',
    data: user
  })
})

// POST create new user
usersRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    
    if (!body.name || !body.email) {
      return c.json({ error: 'Name and email are required' }, 400)
    }
    
    const newUser = {
      id: Math.floor(Math.random() * 1000) + 100,
      name: body.name,
      email: body.email,
      active: body.active || true,
      createdAt: new Date().toISOString()
    }
    
    return c.json({
      message: 'User created successfully',
      data: newUser
    }, 201)
  } catch (error) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
})

export default usersRouter