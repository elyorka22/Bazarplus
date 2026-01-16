import { Telegraf, Markup } from 'telegraf'
import { createClient } from '@supabase/supabase-js'

// Get environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!TELEGRAM_BOT_TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN is not set!')
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Supabase credentials are not set!')
  process.exit(1)
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Main menu keyboard with reply buttons (can be hidden by user)
const mainKeyboard = Markup.keyboard([
  ['🌐 Sayt haqida', '🏪 Sotuvchi bo\'lish'],
  ['❌ Yopish'] // Кнопка для скрытия клавиатуры
]).resize().oneTime() // oneTime - клавиатура исчезнет после одного нажатия

// Inline keyboard buttons (disappear after clicking)
const inlineKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback('🌐 Sayt haqida', 'site_about'),
    Markup.button.callback('🏪 Sotuvchi bo\'lish', 'become_seller')
  ]
])

// Start command
bot.start(async (ctx) => {
  try {
    console.log('Start command received from user:', ctx.from?.id, ctx.from?.username)
    
    const chatId = ctx.chat.id.toString()
    
    // Get welcome message from database
    const { data: welcomeData, error: welcomeError } = await supabase
      .from('bot_settings')
      .select('value')
      .eq('key', 'welcome_message')
      .single()

    console.log('Welcome data from DB:', welcomeData)
    console.log('Welcome error:', welcomeError)

    const welcomeMessage = welcomeData?.value || 
      'Assalomu alaykum! BazarPlus do\'koniga xush kelibsiz! 🛒\n\n' +
      'Quyidagi tugmalardan birini tanlang:'

    console.log('Sending welcome message:', welcomeMessage)
    await ctx.reply(welcomeMessage, inlineKeyboard)
    
    // Показать reply keyboard
    await ctx.reply(
      'Quyidagi tugmalardan birini tanlang:',
      mainKeyboard
    )
    
    console.log('Welcome message sent successfully')
  } catch (error) {
    console.error('Error in start command:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    await ctx.reply(
      'Assalomu alaykum! BazarPlus do\'koniga xush kelibsiz! 🛒\n\n' +
      'Quyidagi tugmalardan birini tanlang:',
      inlineKeyboard
    )
    await ctx.reply('Quyidagi tugmalardan birini tanlang:', mainKeyboard)
  }
})

// Menu command - показать reply keyboard
bot.command('menu', async (ctx) => {
  await ctx.reply(
    'Quyidagi tugmalardan birini tanlang:',
    mainKeyboard
  )
})

// Handle "Sayt haqida" button (inline callback)
bot.action('site_about', async (ctx) => {
  try {
    await ctx.answerCbQuery() // Acknowledge the button click
    
    // Get site info from database
    const { data: siteInfo } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'site_about')
      .single()

    const aboutText = siteInfo?.value || 
      'BazarPlus - bu onlayn do\'kon platformasi bo\'lib, mijozlar va sotuvchilar uchun qulay xizmat ko\'rsatadi.\n\n' +
      'Bizning saytimiz orqali:\n' +
      '✅ Turli mahsulotlarni topish va sotib olish\n' +
      '✅ Tez va qulay yetkazib berish\n' +
      '✅ Xavfsiz to\'lov tizimi\n' +
      '✅ 24/7 mijozlar xizmati\n\n' +
      'Sayt: ' + (process.env.NEXT_PUBLIC_SITE_URL || 'https://bazarplus.uz')

    await ctx.reply(aboutText, inlineKeyboard)
  } catch (error) {
    console.error('Error getting site info:', error)
    await ctx.reply(
      'BazarPlus - bu onlayn do\'kon platformasi. Batafsil ma\'lumot uchun saytimizga tashrif buyuring.',
      inlineKeyboard
    )
  }
})

// Handle "Sayt haqida" button (text message fallback)
bot.hears('🌐 Sayt haqida', async (ctx) => {
  try {
    // Get site info from database
    const { data: siteInfo } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'site_about')
      .single()

    const aboutText = siteInfo?.value || 
      'BazarPlus - bu onlayn do\'kon platformasi bo\'lib, mijozlar va sotuvchilar uchun qulay xizmat ko\'rsatadi.\n\n' +
      'Bizning saytimiz orqali:\n' +
      '✅ Turli mahsulotlarni topish va sotib olish\n' +
      '✅ Tez va qulay yetkazib berish\n' +
      '✅ Xavfsiz to\'lov tizimi\n' +
      '✅ 24/7 mijozlar xizmati\n\n' +
      'Sayt: ' + (process.env.NEXT_PUBLIC_SITE_URL || 'https://bazarplus.uz')

    await ctx.reply(aboutText, inlineKeyboard)
    // Показать клавиатуру снова после ответа
    await ctx.reply('Yana biror narsa kerakmi?', mainKeyboard)
  } catch (error) {
    console.error('Error getting site info:', error)
    await ctx.reply(
      'BazarPlus - bu onlayn do\'kon platformasi. Batafsil ma\'lumot uchun saytimizga tashrif buyuring.',
      inlineKeyboard
    )
    await ctx.reply('Yana biror narsa kerakmi?', mainKeyboard)
  }
})

// Handle "Chat ID" button - отправить Chat ID пользователю
bot.hears('📱 Chat ID', async (ctx) => {
  const chatId = ctx.chat.id.toString()
  await ctx.reply(
    `📱 Sizning Chat ID: \`${chatId}\`\n\n` +
    `Agar siz do'kon egasiz bo'lsangiz, bu Chat ID ni do'kon sozlamalariga kiriting. ` +
    `Keyin siz yangi buyurtmalar haqida xabarnoma olasiz.`,
    { 
      parse_mode: 'Markdown',
      reply_markup: mainKeyboard.reply_markup
    }
  )
})

// Handle "Sotuvchi bo'lish" button (inline callback)
bot.action('become_seller', async (ctx) => {
  try {
    await ctx.answerCbQuery() // Acknowledge the button click
    
    // Get "become seller" page content from database
    const { data: sellerPage } = await supabase
      .from('become_seller_page')
      .select('title, content, image_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (sellerPage) {
      let message = `*${sellerPage.title}*\n\n${sellerPage.content}`
      
      if (sellerPage.image_url) {
        await ctx.replyWithPhoto(sellerPage.image_url, {
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard.reply_markup
        })
      } else {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard.reply_markup
        })
      }
    } else {
      const defaultMessage = 
        '🏪 *Sotuvchi bo\'lish*\n\n' +
        'Bizning platformamizda o\'z mahsulotlaringizni sotishni boshlang!\n\n' +
        'Afzalliklari:\n' +
        '✅ Bepul ro\'yxatdan o\'tish\n' +
        '✅ Oson mahsulot qo\'shish\n' +
        '✅ Keng auditoriyaga yetish\n' +
        '✅ Xavfsiz to\'lov tizimi\n\n' +
        'Ro\'yxatdan o\'tish uchun saytimizga tashrif buyuring:\n' +
        (process.env.NEXT_PUBLIC_SITE_URL || 'https://bazarplus.uz') + '/auth/register'

      await ctx.reply(defaultMessage, {
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard.reply_markup
      })
    }
  } catch (error) {
    console.error('Error getting seller page:', error)
    await ctx.reply(
      'Sotuvchi bo\'lish uchun saytimizga tashrif buyuring va ro\'yxatdan o\'ting.',
      inlineKeyboard
    )
  }
})

// Handle "Sotuvchi bo'lish" button (text message fallback)
bot.hears('🏪 Sotuvchi bo\'lish', async (ctx) => {
  try {
    // Get "become seller" page content from database
    const { data: sellerPage } = await supabase
      .from('become_seller_page')
      .select('title, content, image_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (sellerPage) {
      let message = `*${sellerPage.title}*\n\n${sellerPage.content}`
      
      if (sellerPage.image_url) {
        await ctx.replyWithPhoto(sellerPage.image_url, {
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard.reply_markup
        })
      } else {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: inlineKeyboard.reply_markup
        })
      }
    } else {
      const defaultMessage = 
        '🏪 *Sotuvchi bo\'lish*\n\n' +
        'Bizning platformamizda o\'z mahsulotlaringizni sotishni boshlang!\n\n' +
        'Afzalliklari:\n' +
        '✅ Bepul ro\'yxatdan o\'tish\n' +
        '✅ Oson mahsulot qo\'shish\n' +
        '✅ Keng auditoriyaga yetish\n' +
        '✅ Xavfsiz to\'lov tizimi\n\n' +
        'Ro\'yxatdan o\'tish uchun saytimizga tashrif buyuring:\n' +
        (process.env.NEXT_PUBLIC_SITE_URL || 'https://bazarplus.uz') + '/auth/register'

      await ctx.reply(defaultMessage, {
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard.reply_markup
      })
    }
    // Показать клавиатуру снова после ответа
    await ctx.reply('Yana biror narsa kerakmi?', mainKeyboard)
  } catch (error) {
    console.error('Error getting seller page:', error)
    await ctx.reply(
      'Sotuvchi bo\'lish uchun saytimizga tashrif buyuring va ro\'yxatdan o\'ting.',
      inlineKeyboard
    )
    await ctx.reply('Yana biror narsa kerakmi?', mainKeyboard)
  }
})

// Handle any other text messages
bot.on('text', async (ctx) => {
  // Игнорируем команды
  if (ctx.message.text?.startsWith('/')) {
    return
  }
  
  await ctx.reply(
    'Iltimos, quyidagi tugmalardan birini tanlang yoki /menu buyrug\'ini yuboring:',
    inlineKeyboard
  )
  await ctx.reply('Tugmalarni ko\'rish uchun:', mainKeyboard)
})

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err)
  ctx.reply('Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.', inlineKeyboard)
})

// Set bot commands (will appear in menu button)
bot.telegram.setMyCommands([
  { command: 'start', description: 'Botni boshlash' },
  { command: 'menu', description: 'Tugmalarni ko\'rsatish' }
])

// Start bot
if (process.env.TELEGRAM_BOT_TOKEN) {
  bot.launch()
    .then(() => {
      console.log('✅ Telegram bot started successfully!')
      console.log('Bot token:', process.env.TELEGRAM_BOT_TOKEN?.substring(0, 10) + '...')
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('Service role key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set')
    })
    .catch((error) => {
      console.error('❌ Error starting bot:', error)
      process.exit(1)
    })
} else {
  console.error('❌ TELEGRAM_BOT_TOKEN is not set!')
  process.exit(1)
}

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

