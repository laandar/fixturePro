type CurrencyType = '₹' | '$' | '€'

export const currency: CurrencyType = '$'

export const currentYear = new Date().getFullYear()

export const appName = 'FixturePro'
export const appTitle = 'FixturePro - Sistema de Gestión de Torneos de Fútbol'
export const appDescription: string =
  'FixturePro is the #1 best-selling admin dashboard template on WrapBootstrap. Perfect for building CRM, CMS, project management tools, and custom web apps with clean UI, responsive design, and powerful features.'

export const author: string = 'Darwin Sinche'
export const authorWebsite: string = 'https://webapplayers.com/'
export const authorContact: string = ''

export const basePath: string = ''

export { formatDateFromString, formatDateFromStringWithOptions } from './date'