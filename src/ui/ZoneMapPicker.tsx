import { useEffect, useRef, useState, type RefObject } from 'react'
import L, { type Circle, type Map as LeafletMap, type Marker } from 'leaflet'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MapPin } from 'lucide-react'
import type { TrustZonePlace, ZoneSuggestion } from '../domain/trustguard'
import { BottomSheet } from './BottomSheet'
import { Button, cx } from './primitives'
import 'leaflet/dist/leaflet.css'

type Point = { lat: number; lng: number }
const DEMO_CENTRES: Record<string, Point> = {
  home: { lat: 13.7812, lng: 100.6091 },
  office: { lat: 13.7372, lng: 100.5602 },
  seven: { lat: 13.7795, lng: 100.5454 },
}
const BANGKOK: Point = { lat: 13.7563, lng: 100.5018 }
const RADII = [300, 500, 1000, 2000] as const

export interface ZoneMapPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  container: RefObject<HTMLElement | null>
  suggestion: ZoneSuggestion | null
  onSave: (place: TrustZonePlace) => void
}

export function ZoneMapPicker({ open, onOpenChange, container, suggestion, onSave }: ZoneMapPickerProps) {
  const seed = suggestion ? DEMO_CENTRES[suggestion.id] ?? BANGKOK : BANGKOK
  const initialRadius = suggestion?.id === 'seven' ? 500 : 1000
  const mapNode = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const circle = useRef<Circle | null>(null)
  const [point, setPoint] = useState<Point>(seed)
  const [radius, setRadius] = useState(initialRadius)
  const [label, setLabel] = useState(suggestion?.label ?? '')

  useEffect(() => {
    if (!open) return
    setPoint(seed)
    setRadius(initialRadius)
    setLabel(suggestion?.label ?? '')
    // The Drawer portal is mounted in the same commit; wait one frame for map dimensions.
    const frame = window.requestAnimationFrame(() => {
      if (!mapNode.current) return
      const next = L.map(mapNode.current, { center: [seed.lat, seed.lng], zoom: 15, zoomControl: false, scrollWheelZoom: false })
      map.current = next
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(next)
      L.control.zoom({ position: 'topright' }).addTo(next)
      circle.current = L.circle([seed.lat, seed.lng], {
        radius: initialRadius,
        color: '#087f72',
        fillColor: '#087f72',
        fillOpacity: 0.12,
        weight: 2,
        interactive: false,
      }).addTo(next)
      const icon = L.divIcon({
        className: 'tg-map-pin-icon',
        html: '<span class="tg-map-pin"><span class="tg-map-pin-dot"></span></span>',
        iconSize: [42, 50],
        iconAnchor: [21, 48],
      })
      marker.current = L.marker([seed.lat, seed.lng], { draggable: true, icon, keyboard: true, title: 'ลากหมุด Trust Zone' }).addTo(next)
      marker.current.on('dragend', () => {
        const selected = marker.current?.getLatLng()
        if (selected) setPoint({ lat: selected.lat, lng: selected.lng })
      })
      next.on('click', (event: L.LeafletMouseEvent) => setPoint({ lat: event.latlng.lat, lng: event.latlng.lng }))
      next.invalidateSize()
    })
    return () => {
      window.cancelAnimationFrame(frame)
      map.current?.remove()
      map.current = null
      marker.current = null
      circle.current = null
    }
  }, [open, seed.lat, seed.lng, initialRadius, suggestion?.label])

  useEffect(() => {
    marker.current?.setLatLng([point.lat, point.lng])
    circle.current?.setLatLng([point.lat, point.lng])
  }, [point])

  useEffect(() => { circle.current?.setRadius(radius) }, [radius])

  function nudge(north: number, east: number) {
    const next = { lat: point.lat + north * 0.00035, lng: point.lng + east * 0.00035 }
    setPoint(next)
    map.current?.panTo([next.lat, next.lng])
  }

  function save() {
    const clean = label.trim().slice(0, 40)
    if (!clean) return
    onSave({
      id: suggestion?.id ?? `custom-${crypto.randomUUID()}`,
      label: clean,
      area: `พื้นที่ที่เลือกบนแผนที่ · รัศมี ${radius >= 1000 ? `${radius / 1000} กม.` : `${radius} ม.`}`,
      source: suggestion?.source ?? 'manual',
      latitude: Number(point.lat.toFixed(6)),
      longitude: Number(point.lng.toFixed(6)),
      radiusMeters: radius,
    })
    onOpenChange(false)
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      container={container}
      title="ปักหมุด Trust Zone"
      description="ลากหมุดหรือแตะแผนที่เพื่อเลือกพื้นที่ที่คุณไว้ใจ"
      closeLabel="ปิดแผนที่โดยไม่บันทึก"
    >
      <div className="grid gap-3 pb-1">
        <div className="overflow-hidden rounded-[22px] border border-line bg-brand-tint">
          <div ref={mapNode} role="application" aria-label="แผนที่สำหรับเลือก Trust Zone" className="tg-zone-map h-[min(39vh,310px)] min-h-[230px] w-full" />
          <div className="flex items-center justify-between gap-2 bg-surface px-3 py-2 text-[12px] text-ink-muted">
            <span className="flex items-center gap-1.5"><MapPin size={15} aria-hidden="true" /> หมุดคือจุดกึ่งกลางของพื้นที่</span>
            <span aria-live="polite" className="tabular">{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] leading-snug text-ink-muted">เลื่อนแผนที่ · ลากหมุด · หรือใช้ปุ่มขยับ</p>
          <div className="flex gap-1" aria-label="ขยับหมุด">
            {([
              ['ซ้าย', ArrowLeft, 0, -1],
              ['ขึ้น', ArrowUp, 1, 0],
              ['ลง', ArrowDown, -1, 0],
              ['ขวา', ArrowRight, 0, 1],
            ] as const).map(([name, Icon, north, east]) => (
              <button key={name} type="button" aria-label={`ขยับหมุดไปทาง${name}`} onClick={() => nudge(north, east)} className="grid size-9 place-items-center rounded-full border border-line-strong bg-surface text-brand hover:bg-brand-tint"><Icon size={16} aria-hidden="true" /></button>
            ))}
          </div>
        </div>
        <label className="grid gap-1.5 text-[13px] font-semibold text-ink">
          ชื่อพื้นที่
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={40}
            placeholder="เช่น บ้าน หรือ ที่ทำงาน"
            className="min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-[14px] font-normal outline-none focus:border-brand-accent"
          />
        </label>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">รัศมีพื้นที่</p>
          <div role="group" aria-label="เลือกรัศมี Trust Zone" className="grid grid-cols-4 gap-1.5">
            {RADII.map((meters) => (
              <button key={meters} type="button" aria-pressed={radius === meters} onClick={() => setRadius(meters)} className={cx('min-h-10 rounded-xl border px-1 text-[12.5px] font-semibold', radius === meters ? 'border-brand-accent bg-brand-tint text-brand' : 'border-line-strong bg-surface text-ink-muted')}>
                {meters >= 1000 ? `${meters / 1000} กม.` : `${meters} ม.`}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11.5px] leading-snug text-ink-faint">ต้นแบบไม่ขอตำแหน่งเครื่องหรือบันทึกพิกัดลงเซิร์ฟเวอร์ การเช็กตำแหน่งในรายการโอนยังเป็นการจำลอง ผู้ให้บริการแผนที่จะเห็นพื้นที่ที่เปิดดู</p>
        <Button disabled={!label.trim()} onClick={save}>บันทึกพื้นที่นี้</Button>
      </div>
    </BottomSheet>
  )
}
