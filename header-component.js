import React from 'react';
import './Header.css';

const Header = ({ onRegionChange, activeRegion }) => {
  const regions = [
    { id: 'all', name: 'All Tennessee' },
    { id: 'nashville', name: 'Nashville' },
    { id: 'memphis', name: 'Memphis' },
    { id: 'knoxville', name: 'Knoxville' },
    { id: 'chattanooga', name: 'Chattanooga' },
    { id: 'tricities', name: 'Tri-Cities' },
    { id: 'jackson', name: 'Jackson' }
  ];

  return (
    <header>
      <div className="container">
        <h1>TennesseeFeeds.com</h1>
        <p>Your one-stop source for everything Tennessee</p>
      </div>
      
      <nav className="container">
        {regions.map(region => (
          <a 
            key={region.id}
            href="#" 
            className={activeRegion === region.id ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault();
              onRegionChange(region.id);
            }}
          >
            {region.name}
          </a>
        ))}
      </nav>
    </header>
  );
};

export default Header;
