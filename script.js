// Global variables
let currentCity = null;
let map = null;
let trafficMap = null;
let pollutionChart = null;
let aqiGauge = null;
let aqiHistoryChart = null;
let cityMarkers = {}; // Store city markers for each city
let dynamicCityMarker = null; // For searched cities not in cityCoordinates

// City coordinates for popular cities
const cityCoordinates = {
    'New York': { lat: 40.7128, lng: -74.0060 },
    'London': { lat: 51.5074, lng: -0.1278 },
    'Tokyo': { lat: 35.6762, lng: 139.6503 },
    'Paris': { lat: 48.8566, lng: 2.3522 },
    'Mumbai': { lat: 19.0760, lng: 72.8777 },
    'Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'Berlin': { lat: 52.5200, lng: 13.4050 },
    'Sydney': { lat: -33.8688, lng: 151.2093 },
    'Toronto': { lat: 43.6532, lng: -79.3832 },
    'Singapore': { lat: 1.3521, lng: 103.8198 }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

function getCachedCityData(cityName) {
    const cache = localStorage.getItem('cityDataCache');
    if (!cache) return null;
    const parsed = JSON.parse(cache);
    if (!parsed[cityName]) return null;
    const { timestamp, data } = parsed[cityName];
    if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
    }
    return null;
}

function setCachedCityData(cityName, data) {
    let cache = localStorage.getItem('cityDataCache');
    cache = cache ? JSON.parse(cache) : {};
    cache[cityName] = {
        timestamp: Date.now(),
        data
    };
    localStorage.setItem('cityDataCache', JSON.stringify(cache));
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeMap();
    initializeEventListeners();
    loadMockData(); // For demonstration purposes
});

// Navigation functionality
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = link.getAttribute('data-page');
            showPage(targetPage);
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Close mobile menu
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Show specific page
function showPage(pageName) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    const targetPage = document.getElementById(pageName);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Update city display if city is selected
        if (currentCity) {
            updateCityDisplay(pageName);
        }
        // Fix: Invalidate map size when showing traffic page
        if (pageName === 'traffic' && trafficMap) {
            setTimeout(() => {
                trafficMap.invalidateSize();
            }, 200);
        }
    }
}

// Initialize map
function initializeMap() {
    // Initialize main map
    map = L.map('map').setView([40.7128, -74.0060], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add markers for popular cities and store them
    Object.entries(cityCoordinates).forEach(([city, coords]) => {
        const marker = L.marker([coords.lat, coords.lng])
            .addTo(map)
            .bindPopup(`<b>${city}</b><br>Click to select this city`)
            .on('click', () => selectCity(city));
        cityMarkers[city] = marker;
    });

    // Initialize traffic map
    trafficMap = L.map('trafficMap').setView([40.7128, -74.0060], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(trafficMap);
}

// Initialize event listeners
function initializeEventListeners() {
    // City search
    const searchBtn = document.getElementById('searchBtn');
    const cityInput = document.getElementById('citySearch');
    
    searchBtn.addEventListener('click', () => {
        const cityName = cityInput.value.trim();
        if (cityName) {
            selectCity(cityName);
        }
    });

    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const cityName = cityInput.value.trim();
            if (cityName) {
                selectCity(cityName);
            }
        }
    });

    // Popular city buttons
    const cityBtns = document.querySelectorAll('.city-btn');
    cityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const cityName = btn.getAttribute('data-city');
            selectCity(cityName);
        });
    });
}

const WEATHER_API_KEY = '05f56aee89a94b9cb7fc14c893397bf2';

async function fetchRealWeatherData(cityName) {
    try {
        // Current weather
        const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${WEATHER_API_KEY}&units=metric`);
        const current = await currentRes.json();
        if (!current || !current.weather || !current.main) throw new Error('No weather data');

        // 5-day forecast
        const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&appid=${WEATHER_API_KEY}&units=metric`);
        const forecastData = await forecastRes.json();
        let forecast = [];
        if (forecastData && forecastData.list) {
            // Get one forecast per day (prefer 12:00, else first available)
            const days = {};
            forecastData.list.forEach(item => {
                const dateObj = new Date(item.dt * 1000);
                const day = dateObj.toLocaleDateString('en-US', {weekday: 'short'});
                if (!days[day]) {
                    days[day] = {
                        date: day,
                        temp: Math.round(item.main.temp),
                        condition: mapWeatherToCondition(item.weather[0].main),
                        hour: dateObj.getHours()
                    };
                }
                // Prefer 12:00 if available
                if (dateObj.getHours() === 12) {
                    days[day] = {
                        date: day,
                        temp: Math.round(item.main.temp),
                        condition: mapWeatherToCondition(item.weather[0].main),
                        hour: 12
                    };
                }
            });
            // Sort by day order in forecast
            forecast = Object.values(days).slice(0, 5).map(f => ({date: f.date, temp: f.temp, condition: f.condition}));
        }
        // Fallback: If forecast is empty, use mock forecast
        if (!forecast || forecast.length === 0) {
            forecast = generateWeatherData().forecast;
        }
        return {
            temperature: Math.round(current.main.temp),
            description: current.weather[0].description,
            condition: mapWeatherToCondition(current.weather[0].main),
            humidity: current.main.humidity,
            windSpeed: Math.round(current.wind.speed * 3.6), // m/s to km/h
            visibility: (current.visibility / 1000).toFixed(1),
            pressure: current.main.pressure,
            forecast: forecast
        };
    } catch (e) {
        return null;
    }
}

async function fetchRealPollutionData(cityName) {
    // Get lat/lon for city
    let lat, lon;
    if (cityCoordinates[cityName]) {
        lat = cityCoordinates[cityName].lat;
        lon = cityCoordinates[cityName].lng;
    } else {
        // Geocode using Nominatim
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                lat = parseFloat(data[0].lat);
                lon = parseFloat(data[0].lon);
            } else {
                return null;
            }
        } catch (e) {
            return null;
        }
    }
    try {
        // Current pollution
        const res = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`);
        const pollution = await res.json();
        if (!pollution || !pollution.list || !pollution.list[0]) throw new Error('No pollution data');
        const d = pollution.list[0];
        // For graph, get last 24h hourly data (if available)
        let history = { labels: [], pm25: [], pm10: [], no2: [] };
        try {
            const histRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution/history?lat=${lat}&lon=${lon}&start=${Math.floor(Date.now()/1000)-86400}&end=${Math.floor(Date.now()/1000)}&appid=${WEATHER_API_KEY}`);
            const hist = await histRes.json();
            if (hist && hist.list && hist.list.length > 0) {
                hist.list.forEach(item => {
                    const date = new Date(item.dt * 1000);
                    const hour = date.getHours();
                    history.labels.push(`${hour}:00`);
                    history.pm25.push(item.components.pm2_5);
                    history.pm10.push(item.components.pm10);
                    history.no2.push(item.components.no2);
                });
            }
        } catch (e) {}
        // Fallback: If no history, use mock
        if (!history.labels.length) {
            history = generatePollutionData().history;
        }
        return {
            pm25: Math.round(d.components.pm2_5),
            pm10: Math.round(d.components.pm10),
            no2: Math.round(d.components.no2),
            o3: Math.round(d.components.o3),
            history: history
        };
    } catch (e) {
        return null;
    }
}

async function fetchRealAQIData(cityName) {
    // Get lat/lon for city
    let lat, lon;
    if (cityCoordinates[cityName]) {
        lat = cityCoordinates[cityName].lat;
        lon = cityCoordinates[cityName].lng;
    } else {
        // Geocode using Nominatim
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                lat = parseFloat(data[0].lat);
                lon = parseFloat(data[0].lon);
            } else {
                return null;
            }
        } catch (e) {
            return null;
        }
    }
    try {
        // Current AQI
        const res = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`);
        const pollution = await res.json();
        if (!pollution || !pollution.list || !pollution.list[0]) throw new Error('No AQI data');
        const d = pollution.list[0];
        // AQI value (scale 1-5, convert to US AQI scale for better UX)
        let aqi = d.main.aqi;
        // OpenWeatherMap AQI: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
        // We'll map to US AQI scale for display (approximate)
        const aqiMap = [0, 50, 100, 150, 200, 300];
        let aqiValue = aqiMap[aqi] || 50;
        let status = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqi-1] || 'Good';
        // AQI history (use hourly data if available)
        let history = { labels: [], aqi: [] };
        try {
            const histRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution/history?lat=${lat}&lon=${lon}&start=${Math.floor(Date.now()/1000)-604800}&end=${Math.floor(Date.now()/1000)}&appid=${WEATHER_API_KEY}`);
            const hist = await histRes.json();
            if (hist && hist.list && hist.list.length > 0) {
                // Use one value per day (first value of each day)
                const days = {};
                hist.list.forEach(item => {
                    const date = new Date(item.dt * 1000);
                    const label = date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
                    if (!days[label]) {
                        days[label] = aqiMap[item.main.aqi] || 50;
                    }
                });
                history.labels = Object.keys(days);
                history.aqi = Object.values(days);
            }
        } catch (e) {}
        // Fallback: If no history, use mock
        if (!history.labels.length) {
            history = generateAQIData().history;
        }
        return {
            aqi: aqiValue,
            status: status,
            pm25: Math.round(d.components.pm2_5),
            pm10: Math.round(d.components.pm10),
            no2: Math.round(d.components.no2),
            o3: Math.round(d.components.o3),
            history: history
        };
    } catch (e) {
        return null;
    }
}

function mapWeatherToCondition(main) {
    main = main.toLowerCase();
    if (main.includes('cloud')) return 'cloudy';
    if (main.includes('rain')) return 'rainy';
    if (main.includes('storm') || main.includes('thunder')) return 'stormy';
    if (main.includes('snow')) return 'snowy';
    if (main.includes('clear')) return 'clear';
    return 'clear';
}

// Select city function
async function selectCity(cityName) {
    currentCity = cityName;
    // If city is in cityCoordinates, use existing logic
    if (cityCoordinates[cityName]) {
        const coords = cityCoordinates[cityName];
        map.setView([coords.lat, coords.lng], 12);
        trafficMap.setView([coords.lat, coords.lng], 12);
        if (cityMarkers[cityName]) {
            cityMarkers[cityName].openPopup();
        }
        // Remove dynamic marker if exists
        if (dynamicCityMarker) {
            map.removeLayer(dynamicCityMarker);
            dynamicCityMarker = null;
        }
    } else {
        // Geocode city using Nominatim
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                map.setView([lat, lon], 12);
                trafficMap.setView([lat, lon], 12);
                // Remove previous dynamic marker
                if (dynamicCityMarker) {
                    map.removeLayer(dynamicCityMarker);
                }
                dynamicCityMarker = L.marker([lat, lon], {title: cityName})
                    .addTo(map)
                    .bindPopup(`<b>${cityName}</b>`)
                    .openPopup();
            } else {
                alert('City not found!');
            }
        } catch (e) {
            alert('Error finding city location.');
        }
    }
    // Update all city displays
    updateCityDisplay('traffic');
    updateCityDisplay('weather');
    updateCityDisplay('pollution');
    updateCityDisplay('air-quality');
    updateCityDisplay('home');
    loadCityData(cityName);
    showLoading();
    setTimeout(async () => {
        hideLoading();
        let cached = getCachedCityData(cityName);
        let weatherData = null;
        let pollutionData = null;
        let aqiData = null;
        if (!cached) {
            // Fetch real weather data
            weatherData = await fetchRealWeatherData(cityName);
            if (!weatherData) weatherData = generateWeatherData();
            // Fetch real pollution data
            pollutionData = await fetchRealPollutionData(cityName);
            if (!pollutionData) pollutionData = generatePollutionData();
            // Fetch real AQI data
            aqiData = await fetchRealAQIData(cityName);
            if (!aqiData) aqiData = generateAQIData();
            cached = {
                traffic: generateTrafficData(),
                weather: weatherData,
                pollution: pollutionData,
                aqi: aqiData
            };
            setCachedCityData(cityName, cached);
        } else {
            // If cache is present but weather/pollution/aqi is missing, fetch it
            if (!cached.weather) {
                weatherData = await fetchRealWeatherData(cityName);
                if (!weatherData) weatherData = generateWeatherData();
                cached.weather = weatherData;
                setCachedCityData(cityName, cached);
            }
            if (!cached.pollution) {
                pollutionData = await fetchRealPollutionData(cityName);
                if (!pollutionData) pollutionData = generatePollutionData();
                cached.pollution = pollutionData;
                setCachedCityData(cityName, cached);
            }
            if (!cached.aqi) {
                aqiData = await fetchRealAQIData(cityName);
                if (!aqiData) aqiData = generateAQIData();
                cached.aqi = aqiData;
                setCachedCityData(cityName, cached);
            }
        }
        updateAllDataWithCache(cityName, cached);
    }, 1500);
}

// Update city display
function updateCityDisplay(pageName) {
    const cityDisplay = document.querySelector(`#${pageName}City`);
    if (cityDisplay) {
        if (currentCity) {
            cityDisplay.textContent = currentCity;
        } else {
            // Default message for air quality page
            if (pageName === 'air-quality') {
                cityDisplay.textContent = 'Select a city from the map';
            }
        }
    }
    // Home page selected city display
    if (pageName === 'home') {
        const selectedCityHome = document.getElementById('selectedCityHome');
        const selectedCityNameHome = document.getElementById('selectedCityNameHome');
        if (currentCity) {
            selectedCityNameHome.textContent = currentCity;
            selectedCityHome.style.display = 'flex';
        } else {
            selectedCityHome.style.display = 'none';
        }
    }
}

// Load city data
function loadCityData(cityName) {
    // In a real application, this would make API calls to various services
    console.log(`Loading data for ${cityName}`);
}

// Show loading overlay
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
}

// Update all data for a city
function updateAllData(cityName) {
    updateTrafficData(cityName);
    updateWeatherData(cityName);
    updatePollutionData(cityName);
    updateAirQualityData(cityName);
}

function updateAllDataWithCache(cityName, cached) {
    updateTrafficDataWithCache(cityName, cached.traffic);
    updateWeatherDataWithCache(cityName, cached.weather);
    updatePollutionDataWithCache(cityName, cached.pollution);
    updateAirQualityDataWithCache(cityName, cached.aqi);
}

// Update traffic data
function updateTrafficData(cityName) {
    // Simulate traffic data
    const trafficData = generateTrafficData();
    
    // Update traffic map with simulated traffic layers
    updateTrafficMap(trafficData);
    
    // Update statistics
    document.getElementById('avgSpeed').textContent = `${trafficData.avgSpeed} km/h`;
    document.getElementById('congestionLevel').textContent = trafficData.congestionLevel;
    document.getElementById('travelTime').textContent = `${trafficData.travelTime} min`;
}

function updateTrafficDataWithCache(cityName, trafficData) {
    updateTrafficMap(trafficData);
    document.getElementById('avgSpeed').textContent = `${trafficData.avgSpeed} km/h`;
    document.getElementById('congestionLevel').textContent = trafficData.congestionLevel;
    document.getElementById('travelTime').textContent = `${trafficData.travelTime} min`;
}

// Update traffic map
function updateTrafficMap(trafficData) {
    // Clear existing traffic layers
    trafficMap.eachLayer((layer) => {
        if (layer.trafficLayer) {
            trafficMap.removeLayer(layer);
        }
    });

    // Add simulated traffic data
    trafficData.routes.forEach(route => {
        const color = getTrafficColor(route.congestion);
        const polyline = L.polyline(route.coordinates, {
            color: color,
            weight: 6,
            opacity: 0.8
        }).addTo(trafficMap);
        polyline.trafficLayer = true;
    });
}

// Get traffic color based on congestion level
function getTrafficColor(congestion) {
    if (congestion < 0.3) return '#28a745'; // Green
    if (congestion < 0.6) return '#ffc107'; // Yellow
    if (congestion < 0.8) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
}

// Update weather data
function updateWeatherData(cityName) {
    // Simulate weather data
    const weatherData = generateWeatherData();
    
    // Update current weather
    document.getElementById('weatherTemp').textContent = `${weatherData.temperature}°C`;
    document.getElementById('weatherDesc').textContent = weatherData.description;
    document.getElementById('weatherLocation').textContent = cityName;
    document.getElementById('weatherIcon').className = `fas ${getWeatherIcon(weatherData.condition)}`;
    
    // Update weather details
    document.getElementById('humidity').textContent = `${weatherData.humidity}%`;
    document.getElementById('windSpeed').textContent = `${weatherData.windSpeed} km/h`;
    document.getElementById('visibility').textContent = `${weatherData.visibility} km`;
    document.getElementById('pressure').textContent = `${weatherData.pressure} hPa`;
    
    // Update forecast
    updateForecast(weatherData.forecast);
}

function updateWeatherDataWithCache(cityName, weatherData) {
    document.getElementById('weatherTemp').textContent = `${weatherData.temperature}°C`;
    document.getElementById('weatherDesc').textContent = weatherData.description;
    document.getElementById('weatherLocation').textContent = cityName;
    document.getElementById('weatherIcon').className = `fas ${getWeatherIcon(weatherData.condition)}`;
    document.getElementById('humidity').textContent = `${weatherData.humidity}%`;
    document.getElementById('windSpeed').textContent = `${weatherData.windSpeed} km/h`;
    document.getElementById('visibility').textContent = `${weatherData.visibility} km`;
    document.getElementById('pressure').textContent = `${weatherData.pressure} hPa`;
    updateForecast(weatherData.forecast);
}

// Update forecast
function updateForecast(forecast) {
    const forecastGrid = document.getElementById('forecastGrid');
    forecastGrid.innerHTML = '';
    console.log('Forecast data:', forecast);
    if (!forecast || forecast.length === 0) {
        forecastGrid.innerHTML = '<div style="color:#888;padding:20px;">No forecast data available.</div>';
        return;
    }
    forecast.forEach(day => {
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="forecast-date">${day.date}</div>
            <div class="forecast-icon">
                <i class="fas ${getWeatherIcon(day.condition)}"></i>
            </div>
            <div class="forecast-temp">${day.temp}°C</div>
        `;
        forecastGrid.appendChild(forecastItem);
    });
}

// Get weather icon
function getWeatherIcon(condition) {
    const icons = {
        'clear': 'fa-sun',
        'cloudy': 'fa-cloud',
        'rainy': 'fa-cloud-rain',
        'snowy': 'fa-snowflake',
        'stormy': 'fa-bolt'
    };
    return icons[condition] || 'fa-sun';
}

// Update pollution data
function updatePollutionData(cityName) {
    // Simulate pollution data
    const pollutionData = generatePollutionData();
    
    // Update pollution values
    document.getElementById('pm25').textContent = pollutionData.pm25;
    document.getElementById('pm10').textContent = pollutionData.pm10;
    document.getElementById('no2').textContent = pollutionData.no2;
    document.getElementById('o3').textContent = pollutionData.o3;
    
    // Update pollution status
    document.getElementById('pm25Status').textContent = getPollutionStatus(pollutionData.pm25, 'pm25');
    document.getElementById('pm10Status').textContent = getPollutionStatus(pollutionData.pm10, 'pm10');
    document.getElementById('no2Status').textContent = getPollutionStatus(pollutionData.no2, 'no2');
    document.getElementById('o3Status').textContent = getPollutionStatus(pollutionData.o3, 'o3');
    
    // Update pollution chart
    updatePollutionChart(pollutionData.history);
}

function updatePollutionDataWithCache(cityName, pollutionData) {
    document.getElementById('pm25').textContent = pollutionData.pm25;
    document.getElementById('pm10').textContent = pollutionData.pm10;
    document.getElementById('no2').textContent = pollutionData.no2;
    document.getElementById('o3').textContent = pollutionData.o3;
    document.getElementById('pm25Status').textContent = getPollutionStatus(pollutionData.pm25, 'pm25');
    document.getElementById('pm10Status').textContent = getPollutionStatus(pollutionData.pm10, 'pm10');
    document.getElementById('no2Status').textContent = getPollutionStatus(pollutionData.no2, 'no2');
    document.getElementById('o3Status').textContent = getPollutionStatus(pollutionData.o3, 'o3');
    updatePollutionChart(pollutionData.history);
}

// Get pollution status
function getPollutionStatus(value, type) {
    const thresholds = {
        pm25: { good: 12, moderate: 35, unhealthy: 55 },
        pm10: { good: 54, moderate: 154, unhealthy: 254 },
        no2: { good: 53, moderate: 100, unhealthy: 360 },
        o3: { good: 54, moderate: 70, unhealthy: 125 }
    };
    
    const threshold = thresholds[type];
    if (value <= threshold.good) return 'Good';
    if (value <= threshold.moderate) return 'Moderate';
    if (value <= threshold.unhealthy) return 'Unhealthy';
    return 'Very Unhealthy';
}

// Update pollution chart
function updatePollutionChart(history) {
    const ctx = document.getElementById('pollutionChart');
    
    if (pollutionChart) {
        pollutionChart.destroy();
    }
    
    pollutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.labels,
            datasets: [
                {
                    label: 'PM2.5',
                    data: history.pm25,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'PM10',
                    data: history.pm10,
                    borderColor: '#fd7e14',
                    backgroundColor: 'rgba(253, 126, 20, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'NO2',
                    data: history.no2,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Pollution Levels (24h)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Update air quality data
function updateAirQualityData(cityName) {
    // Simulate air quality data
    const aqiData = generateAQIData();
    
    // Update AQI value
    document.getElementById('aqiValue').textContent = aqiData.aqi;
    
    // Update AQI status
    const aqiStatus = document.getElementById('aqiStatus');
    aqiStatus.textContent = aqiData.status;
    aqiStatus.className = `aqi-status ${getAQIStatusClass(aqiData.aqi)}`;
    
    // Update breakdown
    document.getElementById('aqiPm25').textContent = aqiData.pm25;
    document.getElementById('aqiPm10').textContent = aqiData.pm10;
    document.getElementById('aqiNo2').textContent = aqiData.no2;
    document.getElementById('aqiO3').textContent = aqiData.o3;
    
    // Update AQI gauge
    updateAQIGauge(aqiData.aqi);
    
    // Update AQI history chart
    updateAQIHistoryChart(aqiData.history);
}

function updateAirQualityDataWithCache(cityName, aqiData) {
    document.getElementById('aqiValue').textContent = aqiData.aqi;
    const aqiStatus = document.getElementById('aqiStatus');
    aqiStatus.textContent = aqiData.status;
    aqiStatus.className = `aqi-status ${getAQIStatusClass(aqiData.aqi)}`;
    document.getElementById('aqiPm25').textContent = aqiData.pm25;
    document.getElementById('aqiPm10').textContent = aqiData.pm10;
    document.getElementById('aqiNo2').textContent = aqiData.no2;
    document.getElementById('aqiO3').textContent = aqiData.o3;
    updateAQIGauge(aqiData.aqi);
    updateAQIHistoryChart(aqiData.history);
}

// Get AQI status class
function getAQIStatusClass(aqi) {
    if (aqi <= 50) return 'good';
    if (aqi <= 100) return 'moderate';
    if (aqi <= 150) return 'unhealthy';
    return 'very-unhealthy';
}

// Update AQI gauge
function updateAQIGauge(aqi) {
    const ctx = document.getElementById('aqiGauge');
    
    if (aqiGauge) {
        aqiGauge.destroy();
    }
    
    const maxAQI = 500;
    const percentage = Math.min((aqi / maxAQI) * 100, 100);
    
    aqiGauge = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [percentage, 100 - percentage],
                backgroundColor: [
                    getAQIColor(aqi),
                    '#f8f9fa'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Get AQI color
function getAQIColor(aqi) {
    if (aqi <= 50) return '#28a745';
    if (aqi <= 100) return '#ffc107';
    if (aqi <= 150) return '#fd7e14';
    return '#dc3545';
}

// Update AQI history chart
function updateAQIHistoryChart(history) {
    const ctx = document.getElementById('aqiHistoryChart');
    
    if (aqiHistoryChart) {
        aqiHistoryChart.destroy();
    }
    
    aqiHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.labels,
            datasets: [{
                label: 'AQI',
                data: history.aqi,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Air Quality Index History'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 500
                }
            }
        }
    });
}

// Generate mock data functions
function generateTrafficData() {
    return {
        avgSpeed: Math.floor(Math.random() * 40) + 20,
        congestionLevel: ['Low', 'Moderate', 'High', 'Severe'][Math.floor(Math.random() * 4)],
        travelTime: Math.floor(Math.random() * 30) + 10,
        routes: [
            {
                coordinates: [[40.7128, -74.0060], [40.7589, -73.9851]],
                congestion: Math.random()
            },
            {
                coordinates: [[40.7128, -74.0060], [40.7505, -73.9934]],
                congestion: Math.random()
            }
        ]
    };
}

function generateWeatherData() {
    const conditions = ['clear', 'cloudy', 'rainy', 'snowy', 'stormy'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
        temperature: Math.floor(Math.random() * 30) + 5,
        description: condition.charAt(0).toUpperCase() + condition.slice(1),
        condition: condition,
        humidity: Math.floor(Math.random() * 40) + 40,
        windSpeed: Math.floor(Math.random() * 30) + 5,
        visibility: (Math.random() * 10 + 5).toFixed(1),
        pressure: Math.floor(Math.random() * 50) + 1000,
        forecast: Array.from({length: 5}, (_, i) => ({
            date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {weekday: 'short'}),
            temp: Math.floor(Math.random() * 30) + 5,
            condition: conditions[Math.floor(Math.random() * conditions.length)]
        }))
    };
}

function generatePollutionData() {
    return {
        pm25: Math.floor(Math.random() * 50) + 10,
        pm10: Math.floor(Math.random() * 100) + 20,
        no2: Math.floor(Math.random() * 80) + 10,
        o3: Math.floor(Math.random() * 60) + 20,
        history: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            pm25: Array.from({length: 24}, () => Math.floor(Math.random() * 50) + 10),
            pm10: Array.from({length: 24}, () => Math.floor(Math.random() * 100) + 20),
            no2: Array.from({length: 24}, () => Math.floor(Math.random() * 80) + 10)
        }
    };
}

function generateAQIData() {
    const aqi = Math.floor(Math.random() * 200) + 20;
    const status = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy' : 'Very Unhealthy';
    
    return {
        aqi: aqi,
        status: status,
        pm25: Math.floor(Math.random() * 50) + 10,
        pm10: Math.floor(Math.random() * 100) + 20,
        no2: Math.floor(Math.random() * 80) + 10,
        o3: Math.floor(Math.random() * 60) + 20,
        history: {
            labels: Array.from({length: 7}, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
            }),
            aqi: Array.from({length: 7}, () => Math.floor(Math.random() * 200) + 20)
        }
    };
}

// Load mock data for demonstration
function loadMockData() {
    // Initialize with New York data
    setTimeout(() => {
        selectCity('New York');
    }, 1000);
} 