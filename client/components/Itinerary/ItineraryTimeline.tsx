'use client'

import { motion } from 'framer-motion'
import type { ItineraryStop } from '@/lib/types'

interface Props {
  stops: ItineraryStop[]
  tsaBufferMinutes?: number
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  food:     { bg: '#B45309', color: '#FDE68A' },
  drinks:   { bg: '#6D28D9', color: '#DDD6FE' },
  quiet:    { bg: '#374151', color: '#D1D5DB' },
  shopping: { bg: '#065F46', color: '#6EE7B7' },
  walking:  { bg: '#1E3A5F', color: '#93C5FD' },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.08, ease: 'easeOut' as const },
  }),
}

export default function ItineraryTimeline({ stops, tsaBufferMinutes = 30 }: Props) {
  const startMs = Date.now()

  const arrivalTimes: Date[] = []
  let cursor = startMs
  for (let i = 0; i < stops.length; i++) {
    arrivalTimes.push(new Date(cursor))
    cursor += stops[i].duration_minutes * 60_000
    if (i < stops.length - 1) {
      cursor += stops[i].walking_minutes_to_next * 60_000
    }
  }
  const tsaTime = new Date(cursor)

  return (
    <div className="p-6 w-full">
      <h2 className="text-base font-semibold text-white mb-5">Your itinerary</h2>

      {stops.map((stop, i) => {
        const cat = CATEGORY_STYLES[stop.category]
        return (
          <div key={stop.stop_number}>
            {/* Stop card */}
            <motion.div
              className="flex gap-3 items-start"
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              {/* Time label */}
              <div className="w-14 flex-none text-right pt-3.5">
                <span className="text-xs text-[#888888] tabular-nums leading-none">
                  {formatTime(arrivalTimes[i])}
                </span>
              </div>

              {/* Card */}
              <div className="flex-1 bg-[#141414] rounded-[10px] border border-[#2A2A2A] p-4 hover:border-[#3A3A3A] hover:bg-[#181818] transition-all duration-150">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex-none w-7 h-7 rounded-full bg-[#0066FF] text-white text-xs font-bold flex items-center justify-center">
                      {stop.stop_number}
                    </span>
                    <span className="text-sm font-medium text-white truncate">{stop.name}</span>
                  </div>
                  <span className="flex-none text-xs bg-[#1C1C1C] text-[#888888] px-2 py-0.5 rounded tabular-nums whitespace-nowrap">
                    {stop.duration_minutes} min
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2 ml-[38px]">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={cat ? { background: cat.bg, color: cat.color } : { background: '#1C1C1C', color: '#888888' }}
                  >
                    {stop.category}
                  </span>
                </div>

                {stop.description && (
                  <p className="text-xs text-[#888888] mt-1.5 ml-[38px] leading-relaxed">
                    {stop.description}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Walking connector */}
            {i < stops.length - 1 && (
              <motion.div
                className="flex gap-3 py-1"
                custom={i + 0.5}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <div className="w-14 flex-none" />
                <div className="flex-1 pl-4 flex items-center gap-3">
                  <div
                    aria-hidden
                    style={{ width: 1, height: 24, borderLeft: '1px dashed #2A2A2A', marginLeft: 13 }}
                  />
                  <span className="text-xs text-[#555555]">
                    🚶 {stop.walking_minutes_to_next} min walk
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        )
      })}

      {/* TSA buffer sentinel */}
      {stops.length > 0 && (
        <motion.div
          className="flex gap-3 items-start mt-1"
          custom={stops.length}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="w-14 flex-none text-right pt-3.5">
            <span className="text-xs text-[#888888] tabular-nums leading-none">
              {formatTime(tsaTime)}
            </span>
          </div>
          <div
            className="flex-1 rounded-[10px] p-4"
            style={{
              background: 'rgba(255, 68, 68, 0.08)',
              border: '1px solid rgba(255, 68, 68, 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#FF4444]">🛡 Return to Gate</span>
              <span className="text-xs text-[#FF4444] tabular-nums">{tsaBufferMinutes} min</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'rgba(255, 68, 68, 0.6)' }}>
              Allow extra time to locate your gate.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
