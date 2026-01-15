'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'client' | 'store'>('client')
  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (role === 'store' && !storeName.trim()) {
      setError('Введите название магазина')
      setLoading(false)
      return
    }

    const supabase = createClient()
    
    // Sign up with metadata so the trigger can create the profile
    // Note: email confirmation is handled by database trigger
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login`,
        data: {
          name: name,
          role: role,
        }
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Wait a bit for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Use the helper function to create/update profile (bypasses RLS)
      const { error: functionError } = await supabase.rpc('create_user_profile', {
        p_user_id: data.user.id,
        p_email: email,
        p_name: name,
        p_role: role,
      })

      if (functionError) {
        // Fallback: try direct update if function doesn't exist or fails
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            name: name,
            role: role,
            email: email,
          })
          .eq('id', data.user.id)

        if (updateError) {
          // If update also fails, the trigger should have created it
          // Just log the error but don't block registration
          console.warn('Profile update failed, but trigger should have created it:', updateError)
        }
      }

      if (role === 'store') {
        const { error: storeError } = await supabase
          .from('stores')
          .insert({
            name: storeName,
            owner_id: data.user.id,
          })

        if (storeError) {
          setError('Do\'kon yaratishda xatolik')
          setLoading(false)
          return
        }
      }

      router.push('/auth/login')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              Ro'yxatdan o'tish
            </h1>
            
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ism
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  placeholder="Ismingiz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parol
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'client' | 'store')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                >
                  <option value="client">Mijoz</option>
                  <option value="store">Do'kon</option>
                </select>
              </div>

              {role === 'store' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Do'kon nomi
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required={role === 'store'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    placeholder="Do'koningiz nomi"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Ro\'yxatdan o\'tilmoqda...' : 'Ro\'yxatdan o\'tish'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Allaqachon akkauntingiz bormi?{' '}
                <a href="/auth/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  Kirish
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

