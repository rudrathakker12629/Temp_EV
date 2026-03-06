import React from 'react';
import './About.css';

function About() {
  // Define the missing data arrays
  const features = [
    { icon: '🗺️', title: 'Interactive Map', desc: 'View all EV charging stations on a live OpenStreetMap with real-time availability markers' },
    { icon: '🔍', title: 'Smart Search', desc: 'Find stations by name, address, provider, or filter by connector type, power, and availability' },
    { icon: '❤️', title: 'Favorites', desc: 'Save your preferred charging spots for quick access anytime, stored locally on your device' },
    { icon: '📊', title: 'Report Availability', desc: 'Help the EV community by reporting real-time charger availability at stations you visit' },
    { icon: '🧭', title: 'Route Guidance', desc: 'Get basic routing information and one-click directions to any charging station' },
    { icon: '⚡', title: 'Detailed Info', desc: 'See connector types, power output, pricing, amenities, operating hours, and ratings' },
  ];

  const techStack = [
    { name: 'React 18', desc: 'Frontend framework', icon: '⚛️' },
    { name: 'Leaflet.js', desc: 'Interactive maps', icon: '🗺️' },
    { name: 'OpenStreetMap', desc: 'Free map tiles', icon: '🌍' },
    { name: 'OpenChargeMap', desc: 'Station data API', icon: '🔌' },
    { name: 'ASP.NET Core', desc: 'Backend API', icon: '⚙️' },
    { name: 'MS SQL Server', desc: 'Database', icon: '🗄️' },
  ];

  return (
    <div className="about-page">
      <div className="about-scroll-container">
        <div className="about-inner">

          {/* Hero */}
          <section className="about-hero">
            <div className="hero-icon">⚡</div>
            <h1 className="hero-title">ChargeSaathi</h1>
            <p className="hero-subtitle">Apka EV Charging Companion</p>
            <p className="hero-desc">
              A full-stack EV Charging Station Locator built with React and ASP.NET Core.
              Helping EV drivers in India find, navigate to, and report the status of
              nearby charging stations.
            </p>
          </section>

          {/* Features */}
          <section className="about-section">
            <h2 className="section-heading">✨ Features</h2>
            <div className="features-grid">
              {features.map((f, i) => (
                <div key={i} className="feature-card">
                  <span className="feature-icon">{f.icon}</span>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Tech Stack */}
          <section className="about-section">
            <h2 className="section-heading">🛠️ Tech Stack</h2>
            <div className="tech-grid">
              {techStack.map((t, i) => (
                <div key={i} className="tech-card">
                  <span className="tech-icon">{t.icon}</span>
                  <div className="tech-info">
                    <span className="tech-name">{t.name}</span>
                    <span className="tech-desc">{t.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Team */}
          <section className="about-section">
            <h2 className="section-heading">👥 Team</h2>
            <div className="team-grid">
              <div className="team-card">
                <div className="team-avatar">🎨</div>
                <h3 className="team-name">Frontend Developer</h3>
                <p className="team-role">React • Leaflet.js • UI/UX</p>
              </div>
              <div className="team-card">
                <div className="team-avatar">⚙️</div>
                <h3 className="team-name">Backend Developer</h3>
                <p className="team-role">ASP.NET Core • SQL Server • Azure</p>
              </div>
            </div>
          </section>

          {/* Status Banner */}
          <section className="dev-status">
            <div className="status-indicator">
              <span className="status-dot-anim"></span>
              <span>Currently using mock data — Backend integration in progress</span>
            </div>
            <p>
              This frontend is built with realistic sample data from Rajkot, Gujarat.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}

export default About;