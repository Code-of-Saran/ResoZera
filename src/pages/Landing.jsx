import { Link } from 'react-router-dom'
import earth from '../assets/landing/earth-bg.png'
import headerBar from '../assets/landing/header-bar.png'
import logo from '../assets/landing/logo.png'
import buttonGlass from '../assets/landing/button-glass.png'
import '../styles/landing.css'

// Recreation of the ResoZera landing page (Land Page.pdf). Images and fonts are the
// ones embedded in the PDF; geometry follows the PDF's 1366x768 canvas.
export default function Landing() {
  return (
    <main className="landing" style={{ backgroundImage: `url(${earth})` }}>
      <header className="landing-header">
        <img className="landing-header-bar" src={headerBar} alt="" aria-hidden="true" />
        <img className="landing-logo" src={logo} alt="ResoZera" />
      </header>

      <h1 className="landing-title">See More. From Orbit.</h1>
      <p className="landing-sub landing-sub-1">
        Transform low-resolution satellite imagery into sharp, high-resolution Earth observations using advanced AI.
      </p>
      <p className="landing-sub landing-sub-2">
        Reveal hidden details, enhance visual clarity, and unlock deeper insights from every pixel.
      </p>

      <Link to="/demo" className="landing-cta" aria-label="Run the ResoZera demo">
        <img className="landing-cta-glass" src={buttonGlass} alt="" aria-hidden="true" />
        <span className="landing-cta-text">RUN DEMO</span>
      </Link>
    </main>
  )
}
