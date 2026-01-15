'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Save, MessageSquare } from 'lucide-react'

interface BotSetting {
  id: string
  key: string
  value: string
  description: string | null
}

interface BotButton {
  id: string
  text: string
  action: string | null
  order_index: number
  is_active: boolean
}

export function BotManagementTab() {
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [botButtons, setBotButtons] = useState<BotButton[]>([])
  const [loading, setLoading] = useState(true)
  const [showButtonForm, setShowButtonForm] = useState(false)
  const [editingButton, setEditingButton] = useState<BotButton | null>(null)
  const [buttonForm, setButtonForm] = useState({
    text: '',
    action: '',
    order_index: 0,
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = createClient()
      
      // Load welcome message
      const { data: welcomeData } = await supabase
        .from('bot_settings')
        .select('*')
        .eq('key', 'welcome_message')
        .single()

      if (welcomeData) {
        setWelcomeMessage(welcomeData.value)
      }

      // Load bot buttons
      const { data: buttonsData } = await supabase
        .from('bot_buttons')
        .select('*')
        .order('order_index', { ascending: true })

      if (buttonsData) {
        setBotButtons(buttonsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveWelcomeMessage() {
    try {
      const supabase = createClient()
      
      const { data: existing, error: checkError } = await supabase
        .from('bot_settings')
        .select('id')
        .eq('key', 'welcome_message')
        .single()

      console.log('Existing welcome message:', existing)
      console.log('Check error:', checkError)

      if (existing) {
        const { data, error } = await supabase
          .from('bot_settings')
          .update({ value: welcomeMessage })
          .eq('key', 'welcome_message')
          .select()

        console.log('Update result:', data)
        console.log('Update error:', error)

        if (error) {
          alert('Ошибка обновления сообщения: ' + error.message)
          return
        }
      } else {
        const { data, error } = await supabase
          .from('bot_settings')
          .insert({
            key: 'welcome_message',
            value: welcomeMessage,
            description: 'Приветственное сообщение бота',
          })
          .select()

        console.log('Insert result:', data)
        console.log('Insert error:', error)

        if (error) {
          alert('Ошибка создания сообщения: ' + error.message)
          return
        }
      }
      
      alert('Сообщение успешно сохранено!')
      loadData() // Перезагрузить данные для отображения
    } catch (error) {
      console.error('Error saving welcome message:', error)
      alert('Ошибка сохранения сообщения: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    }
  }

  function openButtonForm(button?: BotButton) {
    if (button) {
      setEditingButton(button)
      setButtonForm({
        text: button.text,
        action: button.action || '',
        order_index: button.order_index,
        is_active: button.is_active,
      })
    } else {
      setEditingButton(null)
      setButtonForm({
        text: '',
        action: '',
        order_index: botButtons.length,
        is_active: true,
      })
    }
    setShowButtonForm(true)
  }

  async function saveButton(e: React.FormEvent) {
    e.preventDefault()
    try {
      const supabase = createClient()
      
      if (editingButton) {
        await supabase
          .from('bot_buttons')
          .update(buttonForm)
          .eq('id', editingButton.id)
      } else {
        await supabase.from('bot_buttons').insert(buttonForm)
      }
      
      setShowButtonForm(false)
      loadData()
    } catch (error) {
      alert('Ошибка сохранения кнопки')
    }
  }

  async function deleteButton(id: string) {
    if (!confirm('Удалить кнопку?')) return
    try {
      const supabase = createClient()
      await supabase.from('bot_buttons').delete().eq('id', id)
      loadData()
    } catch (error) {
      alert('Ошибка удаления кнопки')
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
    <div className="space-y-8">
      {/* Welcome Message */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Приветственное сообщение
        </h2>
        <div className="space-y-4">
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 border rounded-lg"
            placeholder="Введите приветственное сообщение для бота..."
          />
          <button
            onClick={saveWelcomeMessage}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-2 rounded-lg hover:opacity-90 transition flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Сохранить сообщение
          </button>
        </div>
      </div>

      {/* Bot Buttons */}
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Кнопки бота</h2>
          <button
            onClick={() => openButtonForm()}
            className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Добавить кнопку
          </button>
        </div>

        <div className="space-y-3">
          {botButtons.map((button) => (
            <div key={button.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold">{button.text}</span>
                  <span className={`px-2 py-1 rounded text-xs ${button.is_active ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-700'}`}>
                    {button.is_active ? 'Активна' : 'Неактивна'}
                  </span>
                  <span className="text-xs text-gray-500">Порядок: {button.order_index}</span>
                </div>
                {button.action && (
                  <p className="text-sm text-gray-600">Действие: {button.action}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openButtonForm(button)}
                  className="bg-secondary-500 text-white px-3 py-1 rounded text-sm hover:opacity-90"
                >
                  <Edit className="w-4 h-4 inline mr-1" />
                  Изменить
                </button>
                <button
                  onClick={() => deleteButton(button.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:opacity-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {botButtons.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Нет кнопок. Добавьте первую кнопку.
          </div>
        )}
      </div>

      {/* Форма кнопки */}
      {showButtonForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">{editingButton ? 'Изменить' : 'Добавить'} кнопку</h3>
            <form onSubmit={saveButton} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Текст кнопки *</label>
                <input
                  type="text"
                  value={buttonForm.text}
                  onChange={(e) => setButtonForm({ ...buttonForm, text: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Например: Каталог товаров"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Действие</label>
                <input
                  type="text"
                  value={buttonForm.action}
                  onChange={(e) => setButtonForm({ ...buttonForm, action: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Например: /catalog"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Порядок</label>
                <input
                  type="number"
                  value={buttonForm.order_index}
                  onChange={(e) => setButtonForm({ ...buttonForm, order_index: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={buttonForm.is_active}
                    onChange={(e) => setButtonForm({ ...buttonForm, is_active: e.target.checked })}
                  />
                  Активна
                </label>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-2 rounded-lg font-semibold hover:opacity-90">
                  <Save className="w-4 h-4 inline mr-2" />
                  Сохранить
                </button>
                <button type="button" onClick={() => setShowButtonForm(false)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300">
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

