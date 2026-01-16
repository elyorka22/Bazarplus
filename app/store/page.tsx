'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
import { Plus, Edit, Trash2, Package, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { ImageUpload } from '@/components/ImageUpload'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  stock: number
  is_active: boolean
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [store, setStore] = useState<{ id: string; name: string } | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    image_url: '',
    category_id: '',
  })

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  async function loadCategories() {
    const supabase = createClient()
    const { data } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (data) {
      setCategories(data)
    }
  }

  async function loadProducts() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let { data: store } = await supabase
      .from('stores')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (!store) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      const storeName = profile?.name || 'Mening do\'konim'
      const { data: newStore } = await supabase
        .from('stores')
        .insert({
          name: storeName,
          owner_id: user.id,
        })
        .select()
        .single()

      store = newStore
    }

    if (!store) {
      setLoading(false)
      return
    }

    setStore(store)

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })

    if (data) {
      setProducts(data)
    }
    setLoading(false)
  }

  function openForm(product?: Product) {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        stock: product.stock.toString(),
        image_url: product.image_url || '',
        category_id: product.category_id || '',
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        image_url: '',
        category_id: '',
      })
    }
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!store) return

    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      image_url: formData.image_url || null,
      category_id: formData.category_id || null,
      store_id: store.id,
      is_active: true,
    }

    if (editingProduct) {
      await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id)
    } else {
      await supabase.from('products').insert(productData)
    }

    setShowForm(false)
    loadProducts()
  }

  async function handleDelete(id: string) {
    if (!confirm('Mahsulotni o\'chirishni xohlaysizmi?')) return

    const supabase = createClient()
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  async function toggleActive(id: string, currentStatus: boolean) {
    const supabase = createClient()
    await supabase
      .from('products')
      .update({ is_active: !currentStatus })
      .eq('id', id)
    loadProducts()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            Mahsulotlarni boshqarish
          </h1>
          <div className="flex gap-3">
            <Link
              href="/store/orders"
              className="bg-secondary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Buyurtmalar
            </Link>
            <button
              onClick={() => openForm()}
              className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Mahsulot qo'shish
            </button>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editingProduct ? 'Tahrirlash' : 'Qo\'shish'} mahsulot
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Narx (so'm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategoriya
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Kategoriya tanlanmagan</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <ImageUpload
                  currentImage={formData.image_url}
                  onImageUploaded={(url) => setFormData({ ...formData, image_url: url || '' })}
                  folder="products"
                  userId={store?.id}
                  label="Mahsulot rasmi"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-2 rounded-lg font-semibold hover:opacity-90"
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden"
              >
                <div className="h-48 bg-gradient-to-br from-primary-200 to-secondary-200 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        product.is_active
                          ? 'bg-success-100 text-success-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {product.is_active ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-primary-600">
                      {product.price} so'm
                    </span>
                    <span className="text-sm text-gray-500">Остаток: {product.stock}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openForm(product)}
                      className="flex-1 bg-secondary-500 text-white px-3 py-2 rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm">Изменить</span>
                    </button>
                    <button
                      onClick={() => toggleActive(product.id, product.is_active)}
                      className={`flex-1 px-3 py-2 rounded-lg transition text-sm font-medium ${
                        product.is_active
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-success-500 text-white hover:opacity-90'
                      }`}
                    >
                      {product.is_active ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="bg-red-500 text-white px-3 py-2 rounded-lg hover:opacity-90 transition flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">У вас пока нет продуктов</p>
          </div>
        )}
      </div>
    </div>
  )
}

