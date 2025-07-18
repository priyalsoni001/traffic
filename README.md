# Real-Time Traffic & Pollution Dashboard

A professional, responsive web application for monitoring real-time traffic conditions, weather patterns, and environmental data for smart cities worldwide.

## 🌟 Features

### 🏠 Home Page
- **Interactive Map**: Select cities by clicking on the map or using the search function
- **City Search**: Enter any city name to view its data
- **Popular Cities**: Quick access buttons for major cities (New York, London, Tokyo, Paris, Mumbai)
- **Dashboard Overview**: Information about the platform's capabilities

### 🚗 Traffic Page
- **Live Traffic Map**: Color-coded traffic flow visualization
- **Traffic Statistics**: 
  - Average Speed
  - Congestion Level
  - Travel Time
- **Traffic Legend**: Green (Free Flow), Yellow (Moderate), Orange (Heavy), Red (Severe)

### 🌤️ Weather Page
- **Current Weather**: Real-time temperature, conditions, and location
- **Weather Details**: Humidity, Wind Speed, Visibility, Pressure
- **5-Day Forecast**: Extended weather predictions with icons
- **Responsive Design**: Optimized for all device sizes

### 🌫️ Pollution Page
- **Pollution Metrics**: PM2.5, PM10, NO2, O3 levels
- **Status Indicators**: Good, Moderate, Unhealthy, Very Unhealthy
- **Trend Charts**: 24-hour pollution level graphs
- **Real-time Updates**: Live data visualization

### 💨 Air Quality Page
- **AQI Gauge**: Visual air quality index display
- **Air Quality Breakdown**: Detailed metrics for each pollutant
- **Historical Data**: 7-day air quality trends
- **Health Recommendations**: Based on current AQI levels

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for map tiles and external resources

### Installation
1. Download or clone the project files
2. Open `index.html` in your web browser
3. The dashboard will load automatically

### Usage
1. **Select a City**: 
   - Click on the map to select a city
   - Use the search bar to enter a city name
   - Click on popular city buttons

2. **Navigate Pages**: 
   - Use the navigation menu to switch between pages
   - Each page shows data for the currently selected city

3. **View Data**: 
   - Traffic page shows live traffic conditions
   - Weather page displays current and forecasted weather
   - Pollution page shows environmental data
   - Air Quality page provides comprehensive air quality information

## 🛠️ Technical Details

### Technologies Used
- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with Flexbox and Grid
- **JavaScript (ES6+)**: Interactive functionality
- **Leaflet.js**: Interactive maps
- **Chart.js**: Data visualization
- **Font Awesome**: Icons
- **Google Fonts**: Typography

### Key Features
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Data**: Simulated real-time data updates
- **Interactive Maps**: Click to select cities and view traffic
- **Data Visualization**: Charts and graphs for better understanding
- **Modern UI/UX**: Clean, professional interface

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 📊 Data Sources

This dashboard currently uses simulated data for demonstration purposes. In a production environment, you would integrate with:

- **Traffic APIs**: Google Maps API, TomTom API
- **Weather APIs**: OpenWeatherMap, WeatherAPI
- **Air Quality APIs**: OpenAQ, AirVisual API
- **Pollution APIs**: EPA API, World Air Quality Index

## 🎨 Customization

### Styling
- Modify `styles.css` to change colors, fonts, and layout
- Update CSS variables for consistent theming
- Adjust responsive breakpoints as needed

### Functionality
- Edit `script.js` to add new features
- Integrate real APIs by replacing mock data functions
- Add new city coordinates to the `cityCoordinates` object

### Adding New Cities
```javascript
const cityCoordinates = {
    'Your City': { lat: 40.7128, lng: -74.0060 }
};
```

## 🔧 API Integration

To integrate real APIs, replace the mock data functions in `script.js`:

```javascript
// Example: Replace generateWeatherData() with real API call
async function getRealWeatherData(cityName) {
    const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=YOUR_API_KEY&q=${cityName}`);
    const data = await response.json();
    return processWeatherData(data);
}
```

## 📱 Mobile Optimization

The dashboard is fully responsive and optimized for mobile devices:
- Touch-friendly navigation
- Responsive grid layouts
- Optimized map interactions
- Mobile-first design approach

## 🚀 Performance

- Lazy loading of map tiles
- Optimized chart rendering
- Efficient data updates
- Minimal external dependencies

## 🤝 Contributing

1. Fork the project
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 📞 Support

For questions or support, please open an issue in the project repository.

---

**Note**: This is a demonstration dashboard with simulated data. For production use, integrate with real APIs and data sources. 