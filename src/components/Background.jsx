function GradientMesh() { return <div className="gradient-mesh" /> }
function NoiseOverlay() { return <div className="noise-overlay" /> }

const AURORA_WAVES = [
  { w: 500, h: 300, left: '-5%', top: '10%', bg: 'linear-gradient(135deg, rgba(139,92,246,0.35), rgba(217,70,239,0.2))', dur: '18s', delay: '0s' },
  { w: 400, h: 400, left: '60%', top: '5%', bg: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(45,212,191,0.15))', dur: '22s', delay: '-6s' },
  { w: 450, h: 350, left: '30%', top: '55%', bg: 'linear-gradient(135deg, rgba(217,70,239,0.25), rgba(236,72,153,0.15))', dur: '20s', delay: '-12s' },
]
function AuroraWaves() {
  return AURORA_WAVES.map((w, i) => (
    <div key={i} className="aurora-wave" style={{ width: w.w, height: w.h, left: w.left, top: w.top, background: w.bg, animationDuration: w.dur, animationDelay: w.delay }} />
  ))
}

const ORBS = [
  { w: 180, h: 180, left: '8%',  top: '15%', bg: 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(217,70,239,0.25))', dur: '14s', delay: '0s' },
  { w: 120, h: 120, left: '70%', top: '10%', bg: 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(45,212,191,0.2))', dur: '18s', delay: '-4s' },
  { w: 220, h: 220, left: '55%', top: '60%', bg: 'linear-gradient(135deg, rgba(217,70,239,0.3), rgba(139,92,246,0.2))', dur: '22s', delay: '-8s' },
  { w: 90,  h: 90,  left: '85%', top: '40%', bg: 'linear-gradient(135deg, rgba(45,212,191,0.3), rgba(59,130,246,0.2))', dur: '16s', delay: '-2s' },
  { w: 70,  h: 70,  left: '20%', top: '70%', bg: 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(217,70,239,0.2))', dur: '19s', delay: '-10s' },
]
function Orbs() {
  return ORBS.map((o, i) => (
    <div key={i} className="orb" style={{ width: o.w, height: o.h, left: o.left, top: o.top, background: o.bg, animationDuration: o.dur, animationDelay: o.delay }} />
  ))
}

function Cube3D({ size, style }) {
  return (
    <div className="geo-cube" style={{ '--gs': `${size}px`, width: size, height: size, ...style }}>
      <div className="face face-front" /><div className="face face-back" /><div className="face face-left" />
      <div className="face face-right" /><div className="face face-top" /><div className="face face-bottom" />
    </div>
  )
}
const CUBES = [
  { size: 45, left: '10%', top: '20%', dur: '25s', rx0: 0, ry0: 0, rz0: 0, rx1: 360, ry1: 180, rz1: 90, y0: 0, y1: -60, delay: '0s' },
  { size: 30, left: '75%', top: '35%', dur: '20s', rx0: 45, ry0: 30, rz0: 15, rx1: 405, ry1: 210, rz1: 105, y0: 0, y1: -80, delay: '-5s' },
]
function Cubes3D() {
  return CUBES.map((c, i) => (
    <Cube3D key={i} size={c.size} style={{
      left: c.left, top: c.top, animationName: 'geoSpin', animationDuration: c.dur, animationTimingFunction: 'linear',
      animationIterationCount: 'infinite', animationDelay: c.delay,
      '--grx0': `${c.rx0}deg`, '--gry0': `${c.ry0}deg`, '--grz0': `${c.rz0}deg`,
      '--grx1': `${c.rx1}deg`, '--gry1': `${c.ry1}deg`, '--grz1': `${c.rz1}deg`,
      '--gy0': `${c.y0}px`, '--gy1': `${c.y1}px`,
    }} />
  ))
}

const SPHERES = [
  { size: 80, left: '15%', top: '40%', dur: '16s', delay: '0s' },
  { size: 50, left: '80%', top: '25%', dur: '20s', delay: '-6s' },
]
function Spheres() {
  return SPHERES.map((s, i) => (
    <div key={i} className="geo-sphere" style={{ width: s.size, height: s.size, left: s.left, top: s.top, animationDuration: s.dur, animationDelay: s.delay }} />
  ))
}

const PARTICLE_COUNT = typeof window !== 'undefined' && window.innerWidth < 768 ? 3 : 8
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, () => ({
  size: 2 + Math.random() * 4, left: `${Math.random() * 100}%`, top: `${60 + Math.random() * 50}%`,
  dur: `${8 + Math.random() * 12}s`, delay: `${-Math.random() * 15}s`,
}))
function Particles() {
  return PARTICLES.map((p, i) => (
    <div key={i} className="particle" style={{ width: p.size, height: p.size, left: p.left, top: p.top, animationDuration: p.dur, animationDelay: p.delay }} />
  ))
}

export default function BackgroundScene() {
  return (
    <div className="bg-scene">
      <GradientMesh /><NoiseOverlay />
      <AuroraWaves />
      <div className="scene-3d"><Cubes3D /><Spheres /></div>
      <Orbs /><Particles />
    </div>
  )
}
