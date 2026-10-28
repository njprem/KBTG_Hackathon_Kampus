import { lazy, Suspense, useEffect, useState } from 'react'
import type { ZoneMapPickerProps } from './ZoneMapPicker'

const LoadedMapPicker = lazy(() => import('./ZoneMapPicker').then((module) => ({ default: module.ZoneMapPicker })))

/** Leaflet is downloaded only when a user first opens the map. */
export function ZoneMapPickerLazy(props: ZoneMapPickerProps) {
  const [visited, setVisited] = useState(props.open)
  useEffect(() => { if (props.open) setVisited(true) }, [props.open])
  if (!visited) return null
  return <Suspense fallback={null}><LoadedMapPicker {...props} /></Suspense>
}
