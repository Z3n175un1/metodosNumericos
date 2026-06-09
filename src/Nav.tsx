export type NavView = 'inicio' | 'seleccion' | 'metodos' | 'info'

interface NavProps {
  current: NavView
  onNavigate: (view: NavView) => void
}

const links: { label: string; view: NavView }[] = [
  { label: 'Inicio', view: 'inicio' },
  { label: 'Selección', view: 'seleccion' },
  { label: 'Métodos', view: 'metodos' },
  { label: 'Info', view: 'info' },
]

export default function Nav({ current, onNavigate }: NavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-8 px-6 py-3 bg-black/50 backdrop-blur-md border-b border-white/5">
      {links.map(l => (
        <button
          key={l.label}
          onClick={() => onNavigate(l.view)}
          className={`text-sm font-medium tracking-wide uppercase cursor-pointer transition-colors duration-200 ${
            current === l.view
              ? 'text-white/90'
              : 'text-white/50 hover:text-white/90'
          }`}
        >
          {l.label}
        </button>
      ))}
    </nav>
  )
}
