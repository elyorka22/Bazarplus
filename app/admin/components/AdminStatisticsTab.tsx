'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, DollarSign, Package, ShoppingCart, Users, Store, BarChart3 } from 'lucide-react'

interface Statistics {
  totalRevenue: number
  totalOrders: number
  totalUsers: number
  totalStores: number
  totalProducts: number
  activeProducts: number
  pendingOrders: number
  processingOrders: number
  deliveringOrders: number
  completedOrders: number
  cancelledOrders: number
  todayRevenue: number
  todayOrders: number
  weekRevenue: number
  weekOrders: number
  monthRevenue: number
  monthOrders: number
}

interface TopStore {
  store_id: string
  store_name: string
  revenue: number
  orders: number
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
}

export function AdminStatisticsTab() {
  const [stats, setStats] = useState<Statistics>({
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalStores: 0,
    totalProducts: 0,
    activeProducts: 0,
    pendingOrders: 0,
    processingOrders: 0,
    deliveringOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    todayRevenue: 0,
    todayOrders: 0,
    weekRevenue: 0,
    weekOrders: 0,
    monthRevenue: 0,
    monthOrders: 0,
  })
  const [topStores, setTopStores] = useState<TopStore[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatistics()
  }, [])

  async function loadStatistics() {
    try {
      const supabase = createClient()

      // Get total users count
      const { data: users, count: usersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      // Get total stores count
      const { data: stores, count: storesCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true })

      // Get products count
      const { data: products } = await supabase
        .from('products')
        .select('id, is_active')

      const totalProducts = products?.length || 0
      const activeProducts = products?.filter((p: { is_active: boolean }) => p.is_active).length || 0

      // Get all orders with order items and products (ограничиваем для производительности)
      const { data: allOrders } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          order_items (
            quantity,
            price,
            products (
              id,
              name,
              store_id,
              stores (
                id,
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000) // Ограничиваем количество заказов для статистики

      if (allOrders) {
        // Calculate statistics
        let totalRevenue = 0
        let todayRevenue = 0
        let weekRevenue = 0
        let monthRevenue = 0
        let pendingOrders = 0
        let processingOrders = 0
        let deliveringOrders = 0
        let completedOrders = 0
        let cancelledOrders = 0

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        weekAgo.setHours(0, 0, 0, 0)

        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        monthAgo.setHours(0, 0, 0, 0)

        const storeStats: Record<string, { store_id: string; store_name: string; revenue: number; orders: number }> = {}
        const productStats: Record<string, { name: string; quantity: number; revenue: number }> = {}

        allOrders.forEach((order: any) => {
          const orderTotal = order.total_amount || 0
          totalRevenue += orderTotal

          const orderDate = new Date(order.created_at)

          if (orderDate >= today) {
            todayRevenue += orderTotal
          }
          if (orderDate >= weekAgo) {
            weekRevenue += orderTotal
          }
          if (orderDate >= monthAgo) {
            monthRevenue += orderTotal
          }

          // Count orders by status
          switch (order.status) {
            case 'pending':
              pendingOrders++
              break
            case 'processing':
              processingOrders++
              break
            case 'delivering':
              deliveringOrders++
              break
            case 'completed':
              completedOrders++
              break
            case 'cancelled':
              cancelledOrders++
              break
          }

          // Track store statistics
          if (order.order_items && Array.isArray(order.order_items)) {
            order.order_items.forEach((item: any) => {
              const storeId = item.products?.store_id
              const storeName = item.products?.stores?.name || 'Noma\'lum do\'kon'
              
              if (storeId) {
                if (!storeStats[storeId]) {
                  storeStats[storeId] = {
                    store_id: storeId,
                    store_name: storeName,
                    revenue: 0,
                    orders: 0,
                  }
                }
                const itemTotal = parseFloat(item.price) * parseInt(item.quantity)
                storeStats[storeId].revenue += itemTotal
              }

              // Track product statistics
              const productId = item.products?.id
              if (productId) {
                if (!productStats[productId]) {
                  productStats[productId] = {
                    name: item.products?.name || 'Noma\'lum mahsulot',
                    quantity: 0,
                    revenue: 0,
                  }
                }
                productStats[productId].quantity += parseInt(item.quantity)
                productStats[productId].revenue += parseFloat(item.price) * parseInt(item.quantity)
              }
            })

            // Count orders per store
            const uniqueStoresInOrder = new Set<string>()
            order.order_items.forEach((item: any) => {
              if (item.products?.store_id) {
                uniqueStoresInOrder.add(item.products.store_id)
              }
            })
            uniqueStoresInOrder.forEach((storeId) => {
              if (storeStats[storeId]) {
                storeStats[storeId].orders++
              }
            })
          }
        })

        const topStoresList = Object.values(storeStats)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)

        const topProductsList = Object.values(productStats)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)

        const todayOrdersCount = allOrders.filter((order: any) => {
          const orderDate = new Date(order.created_at)
          return orderDate >= today
        }).length

        const weekOrdersCount = allOrders.filter((order: any) => {
          const orderDate = new Date(order.created_at)
          return orderDate >= weekAgo
        }).length

        const monthOrdersCount = allOrders.filter((order: any) => {
          const orderDate = new Date(order.created_at)
          return orderDate >= monthAgo
        }).length

        setStats({
          totalRevenue,
          totalOrders: allOrders.length,
          totalUsers: usersCount || 0,
          totalStores: storesCount || 0,
          totalProducts,
          activeProducts,
          pendingOrders,
          processingOrders,
          deliveringOrders,
          completedOrders,
          cancelledOrders,
          todayRevenue,
          todayOrders: todayOrdersCount,
          weekRevenue,
          weekOrders: weekOrdersCount,
          monthRevenue,
          monthOrders: monthOrdersCount,
        })

        setTopStores(topStoresList)
        setTopProducts(topProductsList)
      }
    } catch (error) {
      console.error('Error loading statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('uz-UZ').format(Math.round(amount)) + ' so\'m'
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Statistika yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8" />
            <TrendingUp className="w-6 h-6 opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Umumiy daromad</h3>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
        </div>

        <div className="bg-gradient-to-br from-secondary-500 to-secondary-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <ShoppingCart className="w-8 h-8" />
            <BarChart3 className="w-6 h-6 opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Jami buyurtmalar</h3>
          <p className="text-2xl font-bold">{stats.totalOrders}</p>
        </div>

        <div className="bg-gradient-to-br from-accent-500 to-accent-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8" />
            <TrendingUp className="w-6 h-6 opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Jami foydalanuvchilar</h3>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
        </div>

        <div className="bg-gradient-to-br from-success-500 to-success-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Store className="w-8 h-8" />
            <TrendingUp className="w-6 h-6 opacity-80" />
          </div>
          <h3 className="text-sm font-medium opacity-90 mb-1">Jami do'konlar</h3>
          <p className="text-2xl font-bold">{stats.totalStores}</p>
        </div>
      </div>

      {/* Revenue by Period */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border-2 border-primary-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            Bugungi daromad
          </h3>
          <p className="text-3xl font-bold text-primary-600 mb-2">{formatCurrency(stats.todayRevenue)}</p>
          <p className="text-sm text-gray-600">{stats.todayOrders} ta buyurtma</p>
        </div>

        <div className="bg-white border-2 border-secondary-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-secondary-500" />
            Haftalik daromad
          </h3>
          <p className="text-3xl font-bold text-secondary-600 mb-2">{formatCurrency(stats.weekRevenue)}</p>
          <p className="text-sm text-gray-600">{stats.weekOrders} ta buyurtma</p>
        </div>

        <div className="bg-white border-2 border-accent-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent-500" />
            Oylik daromad
          </h3>
          <p className="text-3xl font-bold text-accent-600 mb-2">{formatCurrency(stats.monthRevenue)}</p>
          <p className="text-sm text-gray-600">{stats.monthOrders} ta buyurtma</p>
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-500" />
            Mahsulotlar statistikasi
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Jami mahsulotlar:</span>
              <span className="font-semibold text-lg">{stats.totalProducts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Faol mahsulotlar:</span>
              <span className="font-semibold text-lg text-success-600">{stats.activeProducts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Nofaol mahsulotlar:</span>
              <span className="font-semibold text-lg text-gray-400">{stats.totalProducts - stats.activeProducts}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-secondary-500" />
            Buyurtmalar statistikasi
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Kutilmoqda:</span>
              <span className="font-semibold text-lg text-accent-600">{stats.pendingOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Jarayonda:</span>
              <span className="font-semibold text-lg text-blue-600">{stats.processingOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Yetkazilmoqda:</span>
              <span className="font-semibold text-lg text-yellow-600">{stats.deliveringOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Yakunlangan:</span>
              <span className="font-semibold text-lg text-success-600">{stats.completedOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Bekor qilingan:</span>
              <span className="font-semibold text-lg text-red-600">{stats.cancelledOrders}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Stores */}
      {topStores.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Store className="w-6 h-6 text-primary-500" />
            Eng yaxshi do'konlar (daromad bo'yicha)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">#</th>
                  <th className="text-left py-3 px-4 font-semibold">Do'kon nomi</th>
                  <th className="text-right py-3 px-4 font-semibold">Buyurtmalar</th>
                  <th className="text-right py-3 px-4 font-semibold">Daromad</th>
                </tr>
              </thead>
              <tbody>
                {topStores.map((store, index) => (
                  <tr key={store.store_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-primary-600">{index + 1}</td>
                    <td className="py-3 px-4">{store.store_name}</td>
                    <td className="py-3 px-4 text-right">{store.orders}</td>
                    <td className="py-3 px-4 text-right font-semibold text-success-600">
                      {formatCurrency(store.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Package className="w-6 h-6 text-secondary-500" />
            Eng ko'p sotilgan mahsulotlar
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">#</th>
                  <th className="text-left py-3 px-4 font-semibold">Mahsulot nomi</th>
                  <th className="text-right py-3 px-4 font-semibold">Sotilgan</th>
                  <th className="text-right py-3 px-4 font-semibold">Daromad</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-primary-600">{index + 1}</td>
                    <td className="py-3 px-4">{product.name}</td>
                    <td className="py-3 px-4 text-right">{product.quantity} ta</td>
                    <td className="py-3 px-4 text-right font-semibold text-success-600">
                      {formatCurrency(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

