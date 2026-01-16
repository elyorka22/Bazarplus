'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
import { Plus, Minus, Search } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { BannerCarousel } from '@/components/BannerCarousel'
import { ProductCategories } from '@/components/ProductCategories'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  store_name: string
  store_id: string
  stock: number
  category_id: string | null
}

interface CartItem {
  product: Product
  quantity: number
}

export default function ClientPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
    loadCart()
  }, [])

  async function loadProducts() {
    try {
      const supabase = createClient()
      // Ограничиваем количество загружаемых товаров и выбираем только нужные поля
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          store_id,
          stock,
          category_id,
          stores:store_id (
            name
          )
        `)
        .eq('is_active', true)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(50) // Ограничиваем начальную загрузку

      if (error) {
        console.error('Error loading products:', error)
        setProducts([])
        return
      }

      if (data && data.length > 0) {
        const formatted = data.map((p: any) => ({
          ...p,
          store_name: p.stores?.name || 'Noma\'lum do\'kon',
        }))
        setProducts(formatted)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

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
        }
      } else {
        // Load from localStorage for guest users
        const savedCart = localStorage.getItem('guest_cart')
        if (savedCart) {
          try {
            const cartData = JSON.parse(savedCart)
            // Fetch product details for items in cart
            const productIds = cartData.map((item: any) => item.product_id)
            if (productIds.length > 0) {
              const { data: productsData } = await supabase
                .from('products')
                .select(`
                  *,
                  stores:store_id (
                    name
                  )
                `)
                .in('id', productIds)

              if (productsData) {
                const items = cartData.map((item: any) => {
                  const product = productsData.find((p: any) => p.id === item.product_id)
                  if (product) {
                    return {
                      product: {
                        ...product,
                        store_name: product.stores?.name || 'Noma\'lum do\'kon',
                      },
                      quantity: item.quantity,
                    }
                  }
                  return null
                }).filter(Boolean) as CartItem[]
                setCart(items)
              }
            }
          } catch (e) {
            console.error('Error loading cart from localStorage', e)
          }
        }
      }
    } catch (error) {
      // If Supabase is not configured, use localStorage
      const savedCart = localStorage.getItem('guest_cart')
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart)
          setCart(cartData.map((item: any) => ({
            product: item.product,
            quantity: item.quantity,
          })))
        } catch (e) {
          console.error('Error loading cart', e)
        }
      }
    }
  }

  async function addToCart(product: Product) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Save to database for authenticated users
        const existingItem = cart.find(item => item.product.id === product.id)
        if (existingItem) {
          await supabase
            .from('cart_items')
            .update({ quantity: existingItem.quantity + 1 })
            .eq('user_id', user.id)
            .eq('product_id', product.id)
        } else {
          await supabase
            .from('cart_items')
            .insert({
              user_id: user.id,
              product_id: product.id,
              quantity: 1,
            })
        }
        loadCart()
        // Dispatch event to update cart in Navbar
        window.dispatchEvent(new Event('cartUpdated'))
      } else {
        // Save to localStorage for guest users
        const existingItem = cart.find(item => item.product.id === product.id)
        let newCart: CartItem[]
        
        if (existingItem) {
          newCart = cart.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        } else {
          newCart = [...cart, { product, quantity: 1 }]
        }
        
        setCart(newCart)
        localStorage.setItem('guest_cart', JSON.stringify(
          newCart.map(item => ({
            product_id: item.product.id,
            product: item.product,
            quantity: item.quantity,
          }))
        ))
      }
    } catch (error) {
      // If Supabase is not configured, use localStorage
      const existingItem = cart.find(item => item.product.id === product.id)
      let newCart: CartItem[]
      
      if (existingItem) {
        newCart = cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        newCart = [...cart, { product, quantity: 1 }]
      }
      
      setCart(newCart)
      localStorage.setItem('guest_cart', JSON.stringify(
        newCart.map(item => ({
          product_id: item.product.id,
          product: item.product,
          quantity: item.quantity,
        }))
      ))
      // Dispatch event to update cart in Navbar
      window.dispatchEvent(new Event('cartUpdated'))
      // Dispatch event to update cart in Navbar
      window.dispatchEvent(new Event('cartUpdated'))
    }
  }

  async function updateQuantity(productId: string, delta: number) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const item = cart.find(item => item.product.id === productId)
      if (!item) {
        // If item not in cart, find product and add it
        const product = products.find(p => p.id === productId)
        if (product && delta > 0) {
          await addToCart(product)
          return
        }
        return
      }

      const newQuantity = item.quantity + delta
      
      if (newQuantity <= 0) {
        // Remove from cart
        if (user) {
          await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId)
        }
        const newCart = cart.filter(item => item.product.id !== productId)
        setCart(newCart)
        localStorage.setItem('guest_cart', JSON.stringify(
          newCart.map(item => ({
            product_id: item.product.id,
            product: item.product,
            quantity: item.quantity,
          }))
        ))
        // Close counter when quantity reaches 0
        if (expandedProduct === productId) {
          setExpandedProduct(null)
        }
        return
      }
      
      if (user) {
        // Update in database for authenticated users
        await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('user_id', user.id)
          .eq('product_id', productId)
        loadCart()
        // Dispatch event to update cart in Navbar
        window.dispatchEvent(new Event('cartUpdated'))
      } else {
        // Update in localStorage for guest users
        const newCart = cart.map(item =>
          item.product.id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
        setCart(newCart)
        localStorage.setItem('guest_cart', JSON.stringify(
          newCart.map(item => ({
            product_id: item.product.id,
            product: item.product,
            quantity: item.quantity,
          }))
        ))
      }
    } catch (error) {
      // If Supabase is not configured, use localStorage
      const item = cart.find(item => item.product.id === productId)
      if (!item) return

      const newQuantity = item.quantity + delta
      let newCart: CartItem[]
      
      if (newQuantity <= 0) {
        newCart = cart.filter(item => item.product.id !== productId)
        setExpandedProduct(null)
      } else {
        newCart = cart.map(item =>
          item.product.id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      }
      
      setCart(newCart)
      localStorage.setItem('guest_cart', JSON.stringify(
        newCart.map(item => ({
          product_id: item.product.id,
          product: item.product,
          quantity: item.quantity,
        }))
      ))
      // Dispatch event to update cart in Navbar
      window.dispatchEvent(new Event('cartUpdated'))
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === null || p.category_id === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Mahsulotlarni qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Banner Carousel */}
            <BannerCarousel />

            {/* Product Categories */}
            <ProductCategories onCategorySelect={setSelectedCategory} />

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 md:gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <div className="relative h-32 sm:h-48 bg-gradient-to-br from-primary-200 to-secondary-200 flex items-center justify-center overflow-hidden">
                      {product.image_url && product.image_url.trim() !== '' ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                          className="object-cover"
                          loading="lazy"
                          onError={(e) => {
                            console.error('Error loading image for product:', product.id, 'URL:', product.image_url)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="text-4xl">🛒</div>
                      )}
                      {expandedProduct === product.id ? (
                        <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 flex items-center gap-1 sm:gap-2 bg-white rounded-full shadow-lg p-0.5 sm:p-1">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
                            aria-label="Kamaytirish"
                          >
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                          </button>
                          <span className="w-6 sm:w-8 md:w-10 text-center font-bold text-gray-800 text-xs sm:text-sm md:text-base">
                            {cart.find(item => item.product.id === product.id)?.quantity || 0}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:opacity-90 flex items-center justify-center transition"
                            aria-label="Ko'paytirish"
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            const cartItem = cart.find(item => item.product.id === product.id)
                            if (cartItem && cartItem.quantity > 0) {
                              setExpandedProduct(product.id)
                            } else {
                              addToCart(product)
                              setExpandedProduct(product.id)
                            }
                          }}
                          className="absolute bottom-2 right-2 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full hover:opacity-90 transition flex items-center justify-center shadow-lg hover:scale-110"
                          aria-label="Savatga qo'shish"
                        >
                          {cart.find(item => item.product.id === product.id)?.quantity ? (
                            <span className="text-xs sm:text-sm md:text-base font-bold">
                              {cart.find(item => item.product.id === product.id)?.quantity}
                            </span>
                          ) : (
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="p-3 sm:p-4">
                      <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2 line-clamp-1">{product.name}</h3>
                      <p className="text-gray-600 text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2 hidden sm:block">
                        {product.description}
                      </p>
                      <p className="text-xs text-gray-500 mb-2 hidden sm:block">Do'kon: {product.store_name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-base sm:text-2xl font-bold text-primary-600">
                          {product.price.toLocaleString()} so'm
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Mahsulotlar topilmadi</p>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

