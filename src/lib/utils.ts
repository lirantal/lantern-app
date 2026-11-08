import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const fmtDate = (d: Date | number | string) =>
  new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
