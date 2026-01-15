'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/app/providers'
import { Plus, Save, User, Mail } from 'lucide-react'

interface User {
  id: string
  email: string
  name: string
  role: string
}

export function CreateStoreTab() {
  const { user: adminUser } = useUser() // Получить текущего админа
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    store_name: '',
    owner_email: '',
    owner_name: '',
    owner_password: '',
    create_new_user: true,
    existing_user_id: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'client')
        .order('created_at', { ascending: false })

      if (data) {
        setUsers(data)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      const supabase = createClient()

      let ownerId: string

      if (formData.create_new_user) {
        // Создать нового пользователя
        if (!formData.owner_email || !formData.owner_name || !formData.owner_password) {
          alert('Заполните все поля для создания пользователя')
          setSubmitting(false)
          return
        }

        // Создать пользователя в auth с метаданными для роли store
        // Используем emailRedirectTo чтобы предотвратить автоматический вход
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.owner_email,
          password: formData.owner_password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/login`,
            data: {
              name: formData.owner_name,
              role: 'store',  // Передать роль в метаданных
            }
          }
        })

        if (authError || !authData.user) {
          alert('Ошибка создания пользователя: ' + (authError?.message || 'Неизвестная ошибка'))
          setSubmitting(false)
          return
        }

        ownerId = authData.user.id

        // ВАЖНО: signUp автоматически логинит пользователя, нужно выйти
        // Сохранить ID админа перед выходом
        const adminId = adminUser?.id
        
        // Выйти из сессии созданного пользователя
        await supabase.auth.signOut()
        
        // Подождать немного
        await new Promise(resolve => setTimeout(resolve, 500))

        // Подождать немного, чтобы триггер создал профиль
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Использовать функцию create_user_profile для гарантированного создания профиля с ролью store
        const { error: functionError } = await supabase.rpc('create_user_profile', {
          p_user_id: ownerId,
          p_email: formData.owner_email,
          p_name: formData.owner_name,
          p_role: 'store',
        })

        if (functionError) {
          // Fallback: попробовать обновить профиль напрямую
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              name: formData.owner_name,
              role: 'store',
              email: formData.owner_email,
            })
            .eq('id', ownerId)

          if (updateError) {
            // Если обновление не сработало, попробовать создать профиль
            const { error: insertError } = await supabase
              .from('user_profiles')
              .insert({
                id: ownerId,
                email: formData.owner_email,
                name: formData.owner_name,
                role: 'store',
              })

            if (insertError) {
              alert('Ошибка создания профиля: ' + insertError.message)
              setSubmitting(false)
              return
            }
          }
        }
      } else {
        // Использовать существующего пользователя
        if (!formData.existing_user_id) {
          alert('Выберите пользователя')
          setSubmitting(false)
          return
        }

        ownerId = formData.existing_user_id

        // Обновить роль пользователя на store
        const { error: roleError } = await supabase
          .from('user_profiles')
          .update({ role: 'store' })
          .eq('id', ownerId)

        if (roleError) {
          alert('Ошибка обновления роли: ' + roleError.message)
          setSubmitting(false)
          return
        }
      }

      // Создать магазин
      if (!formData.store_name) {
        alert('Введите название магазина')
        setSubmitting(false)
        return
      }

      const { error: storeError } = await supabase
        .from('stores')
        .insert({
          name: formData.store_name,
          owner_id: ownerId,
        })

      if (storeError) {
        alert('Ошибка создания магазина: ' + storeError.message)
        setSubmitting(false)
        return
      }

      // Проверить, что админ все еще залогинен
      // Если нет (из-за signUp), перенаправить на логин
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser || (adminUser && currentUser.id !== adminUser.id)) {
        // Админ был разлогинен из-за signUp, перенаправить на логин
        alert('Магазин создан! Пожалуйста, войдите в систему заново как админ.')
        window.location.href = '/auth/login'
        return
      }

      alert('Магазин успешно создан!')
      
      // Сбросить форму
      setFormData({
        store_name: '',
        owner_email: '',
        owner_name: '',
        owner_password: '',
        create_new_user: true,
        existing_user_id: '',
      })
      
      loadUsers()
    } catch (error) {
      alert('Ошибка создания магазина')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Plus className="w-6 h-6" />
        Создать магазин
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl shadow-lg p-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Название магазина <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.store_name}
            onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Введите название магазина"
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Владелец магазина</h3>
          
          <div className="space-y-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={formData.create_new_user}
                onChange={() => setFormData({ ...formData, create_new_user: true, existing_user_id: '' })}
                className="w-4 h-4"
              />
              <span>Создать нового пользователя</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!formData.create_new_user}
                onChange={() => setFormData({ ...formData, create_new_user: false, owner_email: '', owner_name: '', owner_password: '' })}
                className="w-4 h-4"
              />
              <span>Использовать существующего пользователя</span>
            </label>
          </div>

          {formData.create_new_user ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Имя владельца <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  required={formData.create_new_user}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Введите имя владельца"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                  required={formData.create_new_user}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Пароль <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.owner_password}
                  onChange={(e) => setFormData({ ...formData, owner_password: e.target.value })}
                  required={formData.create_new_user}
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Минимум 6 символов"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">
                Выберите пользователя <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.existing_user_id}
                onChange={(e) => setFormData({ ...formData, existing_user_id: e.target.value })}
                required={!formData.create_new_user}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- Выберите пользователя --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              {users.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">Нет доступных пользователей с ролью "Клиент"</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Примечание:</strong> При создании магазина пользователь автоматически получит роль "Магазин" и сможет управлять своим магазином.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Создание...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Создать магазин</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}

