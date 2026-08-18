'use client'
import { useState, useRef, useCallback } from 'react'
import { Nav } from '@/components/shared/nav'
import { Upload, CheckCircle, AlertTriangle, FileJson, Trash2, Download, Info } from 'lucide-react'

const REQUIRED_FIELDS = ['current_speed', 'free_flow_speed', 'congestion_index', 'timestamp', 'confidence']
const OPTIONAL_FIELDS = ['location']

type RecordStatus = 'valid' | 'skipped' | 'error'

interface ParsedRecord {
  row: number
  status: RecordStatus
  data?: any
  reason?: string
}

function validateRecord(val: any): { ok: boolean; reason?: string; cleaned?: any } {
  if (typeof val !== 'object' || val === null) return { ok: false, reason: 'Not an object' }
  for (const f of ['current_speed', 'free_flow_speed', 'congestion_index', 'timestamp']) {
    if (val[f] === undefined || val[f] === null) return { ok: false, reason: `Missing field: ${f}` }
  }
  if (typeof val.current_speed !== 'number') return { ok: false, reason: 'current_speed must be a number' }
  if (val.confidence === 0) return { ok: false, reason: 'Skipped — confidence = 0 (sensor error)' }
  try {
    new Date(val.timestamp)
  } catch {
    return { ok: false, reason: 'Invalid timestamp format' }
  }
  return {
    ok: true,
    cleaned: {
      timestamp:       val.timestamp,
      current_speed:   val.current_speed,
      free_flow_speed: val.free_flow_speed,
      congestion_index: val.congestion_index,
      confidence:      val.confidence ?? 1,
    }
  }
}

export default function DataUploadPage() {
  const [files, setFiles] = useState<{ name: string; records: ParsedRecord[]; raw: any[] }[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)

        // Support both formats:
        // 1. { traffic_data: { id: { ...record } } }  ← Firebase format
        // 2. [ { ...record }, ... ]                    ← Array format
        let entries: any[] = []

        if (Array.isArray(json)) {
          entries = json
        } else if (json.traffic_data && typeof json.traffic_data === 'object') {
          entries = Object.values(json.traffic_data)
        } else if (typeof json === 'object') {
          entries = Object.values(json)
        }

        const records: ParsedRecord[] = entries.map((val, i) => {
          const result = validateRecord(val)
          if (result.ok) {
            return { row: i + 1, status: 'valid' as RecordStatus, data: result.cleaned }
          } else if (result.reason?.includes('confidence = 0')) {
            return { row: i + 1, status: 'skipped' as RecordStatus, reason: result.reason }
          } else {
            return { row: i + 1, status: 'error' as RecordStatus, reason: result.reason }
          }
        })

        setFiles(prev => {
          if (prev.find(f => f.name === file.name)) return prev
          return [...prev, { name: file.name, records, raw: entries }]
        })
      } catch {
        alert(`Could not parse ${file.name} — make sure it is valid JSON.`)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.json')).forEach(processFile)
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(processFile)
  }, [processFile])

  const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name))

  const totalValid   = files.reduce((s, f) => s + f.records.filter(r => r.status === 'valid').length, 0)
  const totalSkipped = files.reduce((s, f) => s + f.records.filter(r => r.status === 'skipped').length, 0)
  const totalError   = files.reduce((s, f) => s + f.records.filter(r => r.status === 'error').length, 0)

  const handleExport = () => {
    const allValid = files.flatMap(f => f.records.filter(r => r.status === 'valid').map(r => r.data))
    const blob = new Blob([JSON.stringify({ merged_traffic_data: allValid }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'merged_traffic_data.json'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#faf8f5' }}>
      <Nav />
      <main style={{ maxWidth:960, margin:'0 auto', padding:'48px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom:40 }}>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#2c2825', letterSpacing:'-0.5px', marginBottom:8 }}>
            Data Upload
          </h1>
          <p style={{ color:'#9e9189', fontSize:14 }}>
            Upload your Firebase traffic JSON exports here. Records are validated, cleaned, and merged for GAN augmentation and model retraining.
          </p>
        </div>

        {/* Schema Reference */}
        <div style={{ background:'white', border:'1px solid #e8e0d5', borderRadius:16,
          padding:24, marginBottom:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <Info size={15} color="#a67c52" />
            <span style={{ fontWeight:700, fontSize:14, color:'#2c2825' }}>Expected JSON Schema</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <div style={{ fontSize:11, color:'#9e9189', fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:8 }}>Required Fields</div>
              {REQUIRED_FIELDS.map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <CheckCircle size={12} color="#16a34a" />
                  <code style={{ fontSize:12, color:'#2c2825', background:'#f5f2ee',
                    padding:'2px 6px', borderRadius:4 }}>{f}</code>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:11, color:'#9e9189', fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:8 }}>Optional (Dropped at Training)</div>
              {OPTIONAL_FIELDS.map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <Info size={12} color="#a67c52" />
                  <code style={{ fontSize:12, color:'#9e9189', background:'#f5f2ee',
                    padding:'2px 6px', borderRadius:4 }}>{f}</code>
                  <span style={{ fontSize:11, color:'#9e9189' }}>ignored</span>
                </div>
              ))}
              <div style={{ marginTop:16, padding:12, borderRadius:10, background:'#f5f2ee',
                fontSize:12, color:'#9e9189', lineHeight:1.6 }}>
                <strong style={{ color:'#2c2825' }}>Supported formats:</strong><br/>
                • Firebase export: <code>{'{ traffic_data: { id: {...} } }'}</code><br/>
                • Array: <code>{'[{ ...record }, ...]'}</code>
              </div>
            </div>
          </div>

          {/* Sample record */}
          <div style={{ marginTop:16, padding:16, background:'#1e1b18', borderRadius:12, overflowX:'auto' }}>
            <pre style={{ margin:0, fontSize:12, color:'#c8a97e', lineHeight:1.7 }}>{JSON.stringify({
  "current_speed": 42,
  "free_flow_speed": 48,
  "congestion_index": 0.125,
  "confidence": 0.957,
  "timestamp": "2026-03-03T10:38:11+00:00"
}, null, 2)}</pre>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#a67c52' : '#e8e0d5'}`,
            borderRadius:16, padding:'48px 24px',
            background: dragging ? '#fdf8f3' : 'white',
            display:'flex', flexDirection:'column', alignItems:'center', gap:12,
            cursor:'pointer', transition:'all 0.2s', marginBottom:24,
          }}
        >
          <div style={{ width:56, height:56, borderRadius:16,
            background: dragging ? '#a67c52' : '#f5f2ee',
            display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all 0.2s' }}>
            <Upload size={24} color={dragging ? 'white' : '#a67c52'} />
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:700, color:'#2c2825', fontSize:15, marginBottom:4 }}>
              {dragging ? 'Drop your JSON files here' : 'Drag & drop JSON files here'}
            </div>
            <div style={{ fontSize:13, color:'#9e9189' }}>or click to browse · Multiple files supported</div>
          </div>
          <input ref={inputRef} type="file" accept=".json" multiple
            onChange={handleFileInput} style={{ display:'none' }} />
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <>
            {/* Summary Bar */}
            <div style={{ display:'flex', gap:12, marginBottom:20 }}>
              {[
                { label:'Valid Records', value:totalValid, color:'#16a34a', bg:'#dcfce7' },
                { label:'Skipped (0-confidence)', value:totalSkipped, color:'#854d0e', bg:'#fef9c3' },
                { label:'Errors', value:totalError, color:'#991b1b', bg:'#fee2e2' },
                { label:'Files Loaded', value:files.length, color:'#2c2825', bg:'#f5f2ee' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ flex:1, background:bg, borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:22, fontWeight:900, color }}>{value}</div>
                  <div style={{ fontSize:11, color, opacity:0.8, fontWeight:600, marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* File Cards */}
            {files.map(file => {
              const valid   = file.records.filter(r => r.status === 'valid').length
              const skipped = file.records.filter(r => r.status === 'skipped').length
              const errors  = file.records.filter(r => r.status === 'error')
              const total   = file.records.length

              return (
                <div key={file.name} style={{ background:'white', border:'1px solid #e8e0d5',
                  borderRadius:16, padding:20, marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:'#f5f2ee',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <FileJson size={18} color="#a67c52" />
                      </div>
                      <div>
                        <div style={{ fontWeight:700, color:'#2c2825', fontSize:14 }}>{file.name}</div>
                        <div style={{ fontSize:12, color:'#9e9189' }}>{total} records parsed</div>
                      </div>
                    </div>
                    <button onClick={() => removeFile(file.name)} style={{
                      background:'none', border:'1px solid #e8e0d5', borderRadius:8, padding:'6px 10px',
                      cursor:'pointer', display:'flex', alignItems:'center', gap:6,
                      color:'#9e9189', fontSize:12 }}>
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height:6, background:'#f5f2ee', borderRadius:3, marginBottom:10, display:'flex', overflow:'hidden' }}>
                    <div style={{ width:`${(valid/total)*100}%`, background:'#16a34a' }} />
                    <div style={{ width:`${(skipped/total)*100}%`, background:'#eab308' }} />
                    <div style={{ width:`${(errors.length/total)*100}%`, background:'#ef4444' }} />
                  </div>

                  <div style={{ display:'flex', gap:16, fontSize:12, color:'#9e9189', marginBottom: errors.length > 0 ? 12 : 0 }}>
                    <span style={{ color:'#16a34a', fontWeight:600 }}>{valid} valid</span>
                    <span>{skipped} skipped</span>
                    {errors.length > 0 && <span style={{ color:'#ef4444' }}>{errors.length} errors</span>}
                  </div>

                  {/* Show first 3 errors */}
                  {errors.slice(0, 3).map(e => (
                    <div key={e.row} style={{ display:'flex', gap:8, marginTop:6, fontSize:12,
                      color:'#991b1b', background:'#fee2e2', padding:'6px 10px', borderRadius:8 }}>
                      <AlertTriangle size={12} style={{ flexShrink:0, marginTop:1 }} />
                      Row {e.row}: {e.reason}
                    </div>
                  ))}
                </div>
              )
            })}

            {/* Export Button */}
            {totalValid > 0 && (
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                <button onClick={handleExport} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'14px 24px',
                  background:'#2c2825', color:'#c8a97e', border:'none', borderRadius:12,
                  fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  <Download size={15} />
                  Export {totalValid} Valid Records → merged_traffic_data.json
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
