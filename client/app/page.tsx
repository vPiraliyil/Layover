import type { Metadata } from 'next'
import HeroSection from './HeroSection'

export const metadata: Metadata = { title: 'Layover' }

export default function Home() {
  return <HeroSection />
}
