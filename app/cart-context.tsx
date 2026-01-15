'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CartItem {
  product: any
  quantity: number
}

interface CartContextType {
  cartCount: number
  cart: CartItem[]
  refreshCart: () => void
}

const CartContext = createContext<CartContextType>({
  cartCount: 0,
  cart: [],
  refreshCart: () => {},
})

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartCount, setCartCount] = useState(0)

  async function loadCart() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Load from database for authenticated users
        const { data } = await supabase
          .from('cart_items')
          .select(`
            *,
            products (*)
          `)
          .eq('user_id', user.id)

        if (data) {
          const items = data.map((item: any) => ({
            product: item.products,
            quantity: item.quantity,
          }))
          setCart(items)
          setCartCount(items.reduce((sum: number, item) => sum + item.quantity, 0))
        } else {
          setCart([])
          setCartCount(0)
        }
      } else {
        // Load from localStorage for guest users
        const savedCart = localStorage.getItem('guest_cart')
        if (savedCart) {
          try {
            const cartData = JSON.parse(savedCart)
            const items = cartData.map((item: any) => ({
              product: item.product,
              quantity: item.quantity,
            }))
            setCart(items)
            setCartCount(items.reduce((sum: number, item) => sum + item.quantity, 0))
          } catch (e) {
            setCart([])
            setCartCount(0)
          }
        } else {
          setCart([])
          setCartCount(0)
        }
      }
    } catch (error) {
      // If Supabase is not configured, use localStorage
      const savedCart = localStorage.getItem('guest_cart')
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart)
          const items = cartData.map((item: any) => ({
            product: item.product,
            quantity: item.quantity,
          }))
          setCart(items)
          setCartCount(items.reduce((sum: number, item) => sum + item.quantity, 0))
        } catch (e) {
          setCart([])
          setCartCount(0)
        }
      } else {
        setCart([])
        setCartCount(0)
      }
    }
  }

  useEffect(() => {
    loadCart()
    
    // Listen for storage changes (for guest cart)
    const handleStorageChange = () => {
      loadCart()
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Custom event for cart updates
    window.addEventListener('cartUpdated', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('cartUpdated', handleStorageChange)
    }
  }, [])

  // Poll localStorage for changes (for same-tab updates)
  useEffect(() => {
    const interval = setInterval(() => {
      const savedCart = localStorage.getItem('guest_cart')
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart)
          const items = cartData.map((item: any) => ({
            product: item.product,
            quantity: item.quantity,
          }))
          const newCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0)
          if (newCount !== cartCount) {
            loadCart()
          }
        } catch (e) {
          // Ignore
        }
      }
    }, 500)

    return () => clearInterval(interval)
  }, [cartCount])

  return (
    <CartContext.Provider value={{ cartCount, cart, refreshCart: loadCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}

