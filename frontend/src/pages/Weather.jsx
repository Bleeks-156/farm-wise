import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudRain, 
  Sun, 
  Wind, 
  Droplets, 
  Eye, 
  Gauge,
  Thermometer,
  Calendar,
  MapPin,
  AlertTriangle,
  TrendingUp,
  CloudSnow,
  CloudDrizzle,
  Loader,
  Search
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/weather.css';

const DEFAULT_CITY = 'Coimbatore';
const DEFAULT_LAT = 11.0168;
const DEFAULT_LON = 76.9558;

export default function Weather() {
  const { theme } = useTheme();
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [farmingAdvice, setFarmingAdvice] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState({ city: DEFAULT_CITY, lat: DEFAULT_LAT, lon: DEFAULT_LON });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchWeatherData();
  }, [location]);

  const searchLocation = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      );
      
      if (!response.ok) throw new Error('Failed to search location');
      const data = await response.json();
      
      setSearchResults(data.results || []);
      setIsSearching(false);
    } catch (err) {
      console.error('Location search error:', err);
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchLocation(query);
  };

  const handleLocationSelect = (result) => {
    setLocation({
      city: result.name,
      lat: result.latitude,
      lon: result.longitude,
      country: result.country
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Kolkata`
      );
      
      if (!response.ok) throw new Error('Failed to fetch weather data');
      const data = await response.json();

      const weatherCode = data.current.weather_code;
      const weatherInfo = getWeatherInfo(weatherCode);

      setCurrentWeather({
        temperature: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        condition: weatherInfo.condition,
        description: weatherInfo.description,
        humidity: Math.round(data.current.relative_humidity_2m),
        windSpeed: Math.round(data.current.wind_speed_10m),
        pressure: Math.round(data.current.surface_pressure),
        visibility: 10,
        location: `${location.city}${location.country ? ', ' + location.country : ', India'}`,
        icon: weatherInfo.icon,
      });

      const dailyForecasts = processForecastData(data.daily);
      setForecast(dailyForecasts);

      generateFarmingAdvice(data.current, dailyForecasts);
      setLoading(false);
    } catch (err) {
      console.error('Weather API Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const getWeatherInfo = (code) => {
    if (code === 0) return { condition: 'Clear', description: 'clear sky', icon: 'sun' };
    if (code <= 3) return { condition: 'Partly Cloudy', description: 'partly cloudy', icon: 'cloud' };
    if (code <= 48) return { condition: 'Foggy', description: 'fog', icon: 'cloud' };
    if (code <= 57) return { condition: 'Drizzle', description: 'light drizzle', icon: 'drizzle' };
    if (code <= 67) return { condition: 'Rain', description: 'rain', icon: 'rain' };
    if (code <= 77) return { condition: 'Snow', description: 'snow', icon: 'snow' };
    if (code <= 82) return { condition: 'Rain Showers', description: 'rain showers', icon: 'rain' };
    if (code <= 86) return { condition: 'Snow Showers', description: 'snow showers', icon: 'snow' };
    if (code <= 99) return { condition: 'Thunderstorm', description: 'thunderstorm', icon: 'rain' };
    return { condition: 'Unknown', description: 'unknown', icon: 'cloud' };
  };

  const processForecastData = (dailyData) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return dailyData.time.slice(0, 5).map((dateStr, index) => {
      const date = new Date(dateStr);
      const weatherCode = dailyData.weather_code[index];
      const weatherInfo = getWeatherInfo(weatherCode);
      
      return {
        day: index === 0 ? 'Today' : days[date.getDay()],
        date: `${months[date.getMonth()]} ${date.getDate()}`,
        high: Math.round(dailyData.temperature_2m_max[index]),
        low: Math.round(dailyData.temperature_2m_min[index]),
        condition: weatherInfo.condition,
        icon: weatherInfo.icon,
        rainChance: Math.round(dailyData.precipitation_probability_max[index] || 0),
        humidity: 0,
      };
    });
  };

  const mapWeatherIcon = (condition) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) return 'rain';
    if (conditionLower.includes('cloud')) return 'cloud';
    if (conditionLower.includes('clear') || conditionLower.includes('sun')) return 'sun';
    if (conditionLower.includes('snow')) return 'snow';
    return 'cloud';
  };

  const generateFarmingAdvice = (current, forecast) => {
    const advice = [];

    if (current.relative_humidity_2m < 70 && current.temperature_2m < 35) {
      advice.push({
        title: 'Good Day for Irrigation',
        description: 'Low humidity and moderate temperature make it ideal for watering crops.',
        type: 'success',
      });
    }

    if (current.temperature_2m > 35) {
      advice.push({
        title: 'High Temperature Alert',
        description: 'Protect sensitive crops from heat stress. Ensure adequate irrigation.',
        type: 'warning',
      });
    }

    const rainDays = forecast.filter(day => day.rainChance > 60);
    if (rainDays.length > 0) {
      advice.push({
        title: `Rain Expected on ${rainDays[0].day}`,
        description: 'Plan harvesting activities accordingly. Delay fertilizer application.',
        type: 'info',
      });
    }

    if (current.wind_speed_10m > 20) {
      advice.push({
        title: 'High Wind Warning',
        description: 'Avoid spraying pesticides or herbicides. Secure greenhouse structures.',
        type: 'warning',
      });
    }

    if (current.relative_humidity_2m > 80) {
      advice.push({
        title: 'High Humidity Alert',
        description: 'Monitor crops for fungal diseases. Ensure proper ventilation.',
        type: 'warning',
      });
    }

    if (advice.length === 0) {
      advice.push({
        title: 'Normal Conditions',
        description: 'Weather conditions are favorable for regular farming activities.',
        type: 'success',
      });
    }

    setFarmingAdvice(advice);
  };

  const getWeatherIcon = (iconType) => {
    switch (iconType) {
      case 'sun':
        return <Sun size={32} />;
      case 'cloud':
        return <Cloud size={32} />;
      case 'rain':
        return <CloudRain size={32} />;
      case 'snow':
        return <CloudSnow size={32} />;
      case 'drizzle':
        return <CloudDrizzle size={32} />;
      default:
        return <Cloud size={32} />;
    }
  };

  const getAdviceIcon = (type) => {
    switch (type) {
      case 'success':
        return <TrendingUp size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Calendar size={20} />;
      default:
        return <AlertTriangle size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="page-fade weather-page">
        <section className="weather-hero">
          <div className="container">
            <h1 className="weather-hero-title">Weather Forecast</h1>
            <p className="weather-hero-subtitle">
              Real-time weather data to help you make informed farming decisions
            </p>
          </div>
        </section>
        <div className="container weather-container">
          <div className="weather-loading">
            <Loader size={48} className="weather-loading-icon" />
            <p>Loading weather data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-fade weather-page">
        <section className="weather-hero">
          <div className="container">
            <h1 className="weather-hero-title">Weather Forecast</h1>
            <p className="weather-hero-subtitle">
              Real-time weather data to help you make informed farming decisions
            </p>
          </div>
        </section>
        <div className="container weather-container">
          <div className="weather-error">
            <AlertTriangle size={48} />
            <p>Failed to load weather data: {error}</p>
            <button onClick={fetchWeatherData} className="weather-retry-btn">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWeather) return null;

  return (
    <div className="page-fade weather-page">
      {/* Video Background */}
      <div className="weather-video-background">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="weather-video"
          key={theme}
        >
          <source src={theme === 'light' ? '/weather-D.mp4' : '/weather-N.mp4'} type="video/mp4" />
        </video>
        <div className="weather-video-overlay"></div>
      </div>

      {/* Hero Section */}
      <section className="weather-hero">
        <div className="container">
          <h1 className="weather-hero-title">Weather Forecast</h1>
          <p className="weather-hero-subtitle">
            Real-time weather data to help you make informed farming decisions
          </p>
          
          {/* Location Search */}
          <div className="weather-search-container">
            <div className="weather-search-wrapper">
              <Search size={20} className="weather-search-icon" />
              <input
                type="text"
                placeholder="Search for a city or location..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="weather-search-input"
              />
            </div>
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="weather-search-results">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    className="weather-search-result-item"
                    onClick={() => handleLocationSelect(result)}
                  >
                    <MapPin size={16} />
                    <div className="weather-search-result-info">
                      <span className="weather-search-result-name">{result.name}</span>
                      <span className="weather-search-result-details">
                        {result.admin1 && `${result.admin1}, `}{result.country}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {isSearching && (
              <div className="weather-search-loading">
                <Loader size={16} className="weather-search-loading-icon" />
                <span>Searching...</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container weather-container">
        {/* Current Weather Card */}
        <div className="weather-current-card">
          <div className="weather-current-header">
            <div>
              <div className="weather-location">
                <MapPin size={20} />
                <span>{currentWeather.location}</span>
              </div>
              <div className="weather-condition">{currentWeather.condition}</div>
            </div>
            <div className="weather-temp-main">
              <span className="weather-temp-value">{currentWeather.temperature}</span>
              <span className="weather-temp-unit">°C</span>
            </div>
          </div>

          <div className="weather-current-details">
            <div className="weather-detail-item">
              <Thermometer size={20} className="weather-detail-icon" />
              <div className="weather-detail-info">
                <span className="weather-detail-label">Feels Like</span>
                <span className="weather-detail-value">{currentWeather.feelsLike}°C</span>
              </div>
            </div>

            <div className="weather-detail-item">
              <Droplets size={20} className="weather-detail-icon" />
              <div className="weather-detail-info">
                <span className="weather-detail-label">Humidity</span>
                <span className="weather-detail-value">{currentWeather.humidity}%</span>
              </div>
            </div>

            <div className="weather-detail-item">
              <Wind size={20} className="weather-detail-icon" />
              <div className="weather-detail-info">
                <span className="weather-detail-label">Wind Speed</span>
                <span className="weather-detail-value">{currentWeather.windSpeed} km/h</span>
              </div>
            </div>

            <div className="weather-detail-item">
              <Gauge size={20} className="weather-detail-icon" />
              <div className="weather-detail-info">
                <span className="weather-detail-label">Pressure</span>
                <span className="weather-detail-value">{currentWeather.pressure} hPa</span>
              </div>
            </div>

            <div className="weather-detail-item">
              <Eye size={20} className="weather-detail-icon" />
              <div className="weather-detail-info">
                <span className="weather-detail-label">Visibility</span>
                <span className="weather-detail-value">{currentWeather.visibility} km</span>
              </div>
            </div>

            <div className="weather-detail-item">
              <Cloud size={20} className="weather-detail-icon" />
              <div className="weather-detail-info">
                <span className="weather-detail-label">Description</span>
                <span className="weather-detail-value" style={{textTransform: 'capitalize'}}>{currentWeather.description}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Day Forecast */}
        <div className="weather-forecast-section">
          <h2 className="weather-section-title">5-Day Forecast</h2>
          <div className="weather-forecast-grid">
            {forecast.map((day, index) => (
              <div key={index} className="weather-forecast-card">
                <div className="weather-forecast-day">{day.day}</div>
                <div className="weather-forecast-date">{day.date}</div>
                <div className="weather-forecast-icon">
                  {getWeatherIcon(day.icon)}
                </div>
                <div className="weather-forecast-condition">{day.condition}</div>
                <div className="weather-forecast-temp">
                  <span className="weather-temp-high">{day.high}°</span>
                  <span className="weather-temp-divider">/</span>
                  <span className="weather-temp-low">{day.low}°</span>
                </div>
                <div className="weather-forecast-rain">
                  <Droplets size={16} />
                  <span>{day.rainChance}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Farming Advice */}
        <div className="weather-advice-section">
          <h2 className="weather-section-title">Farming Recommendations</h2>
          <div className="weather-advice-grid">
            {farmingAdvice.map((advice, index) => (
              <div key={index} className={`weather-advice-card weather-advice-${advice.type}`}>
                <div className="weather-advice-icon">
                  {getAdviceIcon(advice.type)}
                </div>
                <div className="weather-advice-content">
                  <h3 className="weather-advice-title">{advice.title}</h3>
                  <p className="weather-advice-description">{advice.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
