export const formatBaht = (baht: number) =>
  `฿${baht.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatBahtShort = (baht: number) => `฿${baht.toLocaleString('en-US')}`

export const formatCountdown = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
