import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Lightweight GIS view: base maps, scene footprint, SR footprint and the
// visualization overlays warped to EPSG:4326 by the backend.
export default function MapView({ geo, urls }) {
  const el = useRef(null)
  useEffect(() => {
    if (!geo?.georeferenced || !el.current) return
    const map = L.map(el.current, { zoomControl: true, attributionControl: true })
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap contributors',
    })
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Imagery © Esri',
    })
    osm.addTo(map)
    const toLatLng = (coords) => coords[0].map(([x, y]) => [y, x])
    const inFp = L.polygon(toLatLng(geo.input_footprint.coordinates), { color: '#f5b642', weight: 2, fill: false })
      .bindTooltip('Input footprint — Sentinel-2 10 m')
    const srFp = L.polygon(toLatLng(geo.sr_footprint.coordinates), { color: '#29a8e0', weight: 2, dashArray: '6 6', fill: false })
      .bindTooltip('SR product footprint — ~4 m')
    const overlay = (tag) => urls[`map_${tag}`] && L.imageOverlay(urls[`map_${tag}`], geo[`map_${tag}_bounds`], { opacity: 1 })
    const layers = [
      ['Original 10 m', overlay('original'), true],
      ['Bicubic ~4 m', overlay('bicubic'), true],
      ['EDSR ~4 m (Phase 1)', overlay('edsr'), true],
      ['ResoZera MVP ~4 m (Phase 2)', overlay('mvp'), true],
      ['Uncertainty (MC Dropout)', overlay('uncertainty'), false],
    ].filter(([, l]) => l)
    for (const [, l, on] of layers) if (on) l.addTo(map)  // added bottom-up: MVP ends on top
    inFp.addTo(map)
    srFp.addTo(map)
    L.control.layers(
      { 'Base map — OpenStreetMap': osm, 'Base map — Esri World Imagery': sat },
      {
        ...Object.fromEntries(layers.map(([name, l]) => [name, l])),
        'Input footprint': inFp,
        'SR footprint': srFp,
      },
      { collapsed: false },
    ).addTo(map)
    L.control.scale({ metric: true, imperial: false }).addTo(map)
    map.fitBounds(inFp.getBounds().pad(0.4))
    return () => map.remove()
  }, [geo, urls])

  if (!geo?.georeferenced) {
    return (
      <section className="card">
        <div className="card-head"><h2>GIS view</h2></div>
        <div className="notice">Input has no coordinate reference system, so it cannot be placed on the map.</div>
      </section>
    )
  }
  const px = (a) => `${a[0].toFixed(2)} × ${a[1].toFixed(2)} m`
  return (
    <section className="card">
      <div className="card-head"><h2>GIS view</h2><span className="muted small">Base map · footprints · Original / Bicubic / EDSR / MVP / uncertainty layers (visualizations)</span></div>
      <div ref={el} className="map" />
      <dl className="kv">
        <div><dt>CRS</dt><dd className="mono">{geo.crs}</dd></div>
        <div><dt>Input pixel size</dt><dd className="mono">{px(geo.input_pixel_size_m)}</dd></div>
        <div><dt>SR pixel size</dt><dd className="mono">{px(geo.sr_pixel_size_m)}</dd></div>
        <div><dt>Footprints</dt><dd>Input (amber) and SR (blue, dashed) cover the same ground extent: only the pixel size changes.</dd></div>
      </dl>
    </section>
  )
}
