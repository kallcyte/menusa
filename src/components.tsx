import { Button } from './components/ui/button'

export { Button }

export function Logo({ dark = false }: { dark?: boolean }) {
  return <span className={`logo ${dark ? 'logo-dark' : ''}`}><span className="logo-mark">M</span><span>menusa</span></span>
}
