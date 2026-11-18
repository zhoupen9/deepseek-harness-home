/** Palette-row dictionaries for the General settings section. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.palette'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '调色板',
  'description': '自定义浅色与深色模式的表面颜色。可直接输入颜色代码；留空或清除则沿用默认配色。',
  'mode.light': '浅色模式',
  'mode.dark': '深色模式',
  'reset': '重置',
  'code': '颜色代码',
  'invalid': '请输入 #rgb、#rrggbb、rgb() 或 hsl()',
  'color.background': '页面背景',
  'color.surface': '浮起表面',
  'color.menu': '菜单表面',
  'color.sidebar': '侧边栏',
  'color.input': '聊天输入框',
  'color.card': '卡片表面',
  'color.dialog': '对话框',
  'color.nav': '导航选中项',
  'color.module': '控件表面',
  'color.bubble': '用户消息',
  'color.accent': '强调色',
  'color.border': '边框',
} as const

/** The palette-row dictionary key union. */
export type PaletteKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete palette-row copy. */
    'settings.palette': PaletteKey
  }
}

/** English dictionary, checked complete against the Chinese source of truth. */
export const en: Record<PaletteKey, string> = {
  'title': 'Palette',
  'description': 'Custom surface colors for light and dark mode. Type a code or pick a color; an empty code follows the shipped palette.',
  'mode.light': 'Light mode',
  'mode.dark': 'Dark mode',
  'reset': 'Reset',
  'code': 'Color code',
  'invalid': 'Enter #rgb, #rrggbb, rgb() or hsl()',
  'color.background': 'Page background',
  'color.surface': 'Raised surface',
  'color.menu': 'Menu surface',
  'color.sidebar': 'Sidebar',
  'color.input': 'Chat input',
  'color.card': 'Card surface',
  'color.dialog': 'Dialog surface',
  'color.nav': 'Nav selection',
  'color.module': 'Control surface',
  'color.bubble': 'User message',
  'color.accent': 'Accent',
  'color.border': 'Border',
}
