'use client'

import dynamic from 'next/dynamic'

const CityScene = dynamic(() => import('./city-scene').then((m) => m.CityScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#f0ede4]">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        Loading map…
      </div>
    </div>
  ),
})

export function SceneLoader() {
  return <CityScene />
}
