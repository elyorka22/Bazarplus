'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, ShoppingBag, Utensils, Coffee, Apple, Carrot, Fish, Beef, Milk } from 'lucide-react'

interface Category {
  id: string
  name: string
  name_uz: string | null
  description: string | null
  description_uz: string | null
  image_url: string | null
  icon: string | null
  is_active: boolean
  order_index: number
}

// Icon mapping
const iconMap: Record<string, any> = {
  package: Package,
  shopping: ShoppingBag,
  utensils: Utensils,
  coffee: Coffee,
  apple: Apple,
  carrot: Carrot,
  fish: Fish,
  beef: Beef,
  milk: Milk,
  bread: ShoppingBag, // Using ShoppingBag as fallback for bread
}

export function ProductCategories({ onCategorySelect }: { onCategorySelect?: (categoryId: string | null) => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .limit(12)

      if (data) {
        setCategories(data as Category[])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleCategoryClick(categoryId: string | null) {
    setSelectedCategory(categoryId)
    if (onCategorySelect) {
      onCategorySelect(categoryId)
    }
  }

  function getIcon(iconName: string | null) {
    if (!iconName) return Package
    const IconComponent = iconMap[iconName.toLowerCase()]
    return IconComponent || Package
  }

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {/* All categories button */}
        <button
          onClick={() => handleCategoryClick(null)}
          className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-xl transition-all ${
            selectedCategory === null
              ? 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
          }`}
        >
          <Package className="w-6 h-6 sm:w-8 sm:h-8 mb-1" />
          <span className="text-xs sm:text-sm font-semibold text-center px-1">Barchasi</span>
        </button>

        {/* Category buttons */}
        {categories.map((category) => {
          const IconComponent = getIcon(category.icon)
          const displayName = category.name_uz || category.name

          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-xl transition-all ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg'
              }`}
            >
              {category.image_url ? (
                <img
                  src={category.image_url}
                  alt={displayName}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover mb-1"
                />
              ) : (
                <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 mb-1" />
              )}
              <span className="text-xs sm:text-sm font-semibold text-center px-1 line-clamp-2">
                {displayName}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

