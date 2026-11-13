/** Background-row dictionaries for the General settings section. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.background'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '背景图片',
  'description': '在界面背后显示一张图片。填写 https 链接、data 图片 URI 或本地绝对路径。',
  'enabled': '启用背景图片',
  'image': '图片',
  'imagePlaceholder': 'https://… 或 /图片/路径.jpg',
  'opacity': '不透明度',
  'invalid': '请填写 https 链接、data 图片 URI 或本地绝对路径。',
} as const

/** The background-row dictionary key union. */
export type BackgroundKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The complete background-row copy. */
    'settings.background': BackgroundKey
  }
}

/** English dictionary, checked complete against the Chinese source of truth. */
export const en: Record<BackgroundKey, string> = {
  'title': 'Background image',
  'description': 'Show a picture behind the interface. Enter an https URL, a data image URI, or an absolute file path.',
  'enabled': 'Enable background image',
  'image': 'Image',
  'imagePlaceholder': 'https://… or /path/to/image.jpg',
  'opacity': 'Opacity',
  'invalid': 'Enter an https URL, a data image URI, or an absolute file path.',
}
