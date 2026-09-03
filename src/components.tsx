import { Button } from './components/ui/button'
import horizontalLogo from './assets/menusa-logo-horizontal.svg'
import horizontalLogoReversed from './assets/menusa-logo-horizontal-reversed.svg'
import iconLogo from './assets/menusa-icon.svg'

export { Button }

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`logo ${dark ? 'logo-dark' : ''}`}>
      <img className="logo-horizontal" src={dark ? horizontalLogo : horizontalLogoReversed} alt="Menusa" />
      <img className="logo-icon" src={iconLogo} alt="" aria-hidden="true" />
    </span>
  )
}
