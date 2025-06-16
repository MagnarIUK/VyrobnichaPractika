let lastKnownLat = null;
let lastKnownLon = null;
let currentLanguage = 'en';
let translatedWindDirections = [];
const translations = {};
let loadingSpinner;
let weatherCard;
let selectedCity = null;
let cityInput;
let saveCityButton;
let citySuggestionsDatalist;
let useGeolocationButton;

const weatherBackgrounds = {
    'Clear': {
        day: 'linear-gradient(to right top, #87CEEB, #6495ED)',
        night: 'linear-gradient(to right top, #191970, #4169E1)'
    },
    'Clouds': 'linear-gradient(to right top, #B0C4DE, #778899)',
    'Rain': 'linear-gradient(to right top, #4682B4, #2F4F4F)',
    'Drizzle': 'linear-gradient(to right top, #757F9A, #A9B2C3)',
    'Thunderstorm': 'linear-gradient(to right top, #1A1A2E, #2F1E40)',
    'Snow': 'linear-gradient(to right top, #E0EAFC, #CFDEF3)',
    'Mist': 'linear-gradient(to right top, #CFCFCF, #AFAFAF)',
    'Smoke': 'linear-gradient(to right top, #5D6D7E, #34495E)',
    'Haze': 'linear-gradient(to right top, #D4D8DD, #B0B7C0)',
    'Dust': 'linear-gradient(to right top, #C2B280, #A09068)',
    'Fog': 'linear-gradient(to right top, #A9B2C3, #8A98A9)',
    'Sand': 'linear-gradient(to right top, #E5BB4B, #D4AF37)',
    'Ash': 'linear-gradient(to right top, #606060, #404040)',
    'Squall': 'linear-gradient(to right top, #4682B4, #36454F)',
    'Tornado': 'linear-gradient(to right top, #3A1C71, #D76D77, #FFAF7B)',


    'clear sky': {
        day: 'linear-gradient(to right top, #87CEEB, #6495ED)',
        night: 'linear-gradient(to right top, #191970, #4169E1)'
    },
    'few clouds': 'linear-gradient(to right top, #A7D9FF, #7EC0EE)',
    'scattered clouds': 'linear-gradient(to right top, #BFCEDD, #8FA4B8)',
    'broken clouds': 'linear-gradient(to right top, #8FA4B8, #6B7D90)',
    'overcast clouds': 'linear-gradient(to right top, #6B7D90, #5B6B7A)',
    'light rain': 'linear-gradient(to right top, #92B4D1, #6A8CA9)',
    'moderate rain': 'linear-gradient(to right top, #6A8CA9, #4B627A)',
    'heavy intensity rain': 'linear-gradient(to right top, #4B627A, #3A4A5C)',
    'light snow': 'linear-gradient(to right top, #D1EAF7, #C3DFEE)',
    'snow': 'linear-gradient(to right top, #B0E0EE, #9BBAD0)',
    'sleet': 'linear-gradient(to right top, #A2B9C8, #7B8D9C)',
    'freezing rain': 'linear-gradient(to right top, #8A9AA6, #6D7E8B)',

    'default': 'linear-gradient(to right top, #6a11cb, #2575fc)'
};



document.addEventListener('DOMContentLoaded', async () => {
    loadingSpinner = document.getElementById('loading-spinner');
    weatherCard = document.getElementById('weather-card');

    cityInput = document.getElementById('cityInput');
    saveCityButton = document.getElementById('saveCityButton');
    citySuggestionsDatalist = document.getElementById('citySuggestions')
    useGeolocationButton = document.getElementById('useGeolocation')

    await loadAndApplyLanguage();

    selectedCity = localStorage.getItem('weatherAppCity')
    if(cityInput && selectedCity){
        cityInput.value = selectedCity;
    }

    initializeWeather();

    const refreshButton = document.getElementById('refresh-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', handleRefresh);
    }

    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.addEventListener('change', (event) => {
            const newLang = event.target.value;
            setLanguage(newLang);
        });
    }

    const temperatureElement = document.getElementById('temperature');
    if (temperatureElement) {
        temperatureElement.addEventListener('click', () => {
            document.getElementById('additional-temp-info').classList.toggle('hidden');
        });
    }

    const windSpeedElement = document.getElementById('wind-speed');
    if (windSpeedElement) {
        windSpeedElement.addEventListener('click', () => {
            document.getElementById('additional-wind-info').classList.toggle('hidden');
        });
    }

    if(saveCityButton){
        saveCityButton.addEventListener('click', handleCitySave);
    }

    if(cityInput){
        cityInput.addEventListener('input', debounce(fetchCitySuggestions, 300))
    }
    if(useGeolocationButton){
        useGeolocationButton.addEventListener('click', handleUseGeolocation);
    }

});

function showSpinner() {
    if (loadingSpinner && weatherCard) {
        loadingSpinner.classList.remove('hidden');
        weatherCard.style.opacity = '0';
        weatherCard.style.pointerEvents = 'none';
    }
}

function hideSpinner() {
    if (loadingSpinner && weatherCard) {
        loadingSpinner.classList.add('hidden');
        weatherCard.style.opacity = '1';
        weatherCard.style.pointerEvents = 'auto';
    }
}

async function loadTranslations(lang) {
    if (translations[lang]) {
        return translations[lang];
    }
    try {
        const response = await fetch(`/static/lang/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load translation for ${lang}: ${response.statusText}`);
        }
        const data = await response.json();
        translations[lang] = data;
        return data;
    } catch (error) {
        console.error('Error loading translations:', error);
        return {};
    }
}

function applyTranslations(lang) {
    const texts = translations[lang];
    if (!texts) return;

    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (texts[key]) {
            element.textContent = texts[key];
        }
    });

    const appTitleElement = document.querySelector('title[data-i18n="app_title"]');
    if (appTitleElement && texts['app_title']) {
        appTitleElement.textContent = texts['app_title'];
    }

    cityInput.placeholder = translations[currentLanguage]['cityInput.placeholder']

    translatedWindDirections = texts['wind_directions'] || ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
}

async function loadAndApplyLanguage() {
    const savedLang = localStorage.getItem('weatherAppLang');
    if (savedLang && ['en', 'uk'].includes(savedLang)) {
        currentLanguage = savedLang;
    } else {
        const browserLang = navigator.language.split('-')[0];
        if (['en', 'uk'].includes(browserLang)) {
            currentLanguage = browserLang;
        } else {
            currentLanguage = 'en';
        }
    }

    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
        languageSelect.value = currentLanguage;
    }

    await loadTranslations(currentLanguage);
    applyTranslations(currentLanguage);
}

async function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('weatherAppLang', lang);
    await loadTranslations(lang);
    applyTranslations(lang);
}


function initializeWeather() {
    showSpinner();

    if(selectedCity){
        getWeatherByCity(selectedCity);
    }else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            lastKnownLat = position.coords.latitude;
            lastKnownLon = position.coords.longitude;
            getWeatherByCoords(lastKnownLat, lastKnownLon);
        }, error => {
            console.error('Geolocation error:', error);
            displayMessage(`${translations[currentLanguage]["alerts"]["could_not_get_geo"]}`, 'error');
            getWeatherByCity('London');
        });
    } else {
        displayMessage(`${translations[currentLanguage]["alerts"]["geo_not_supported"]}`, 'warning');
        getWeatherByCity('New York');
    }
}

async function handleUseGeolocation(){
    showSpinner()
    selectedCity = null;
    localStorage.removeItem('weatherAppCity');
    initializeWeather();
}

async function handleRefresh() {
    showSpinner();
    if(selectedCity){
        getWeatherByCity(selectedCity);
    } else if (lastKnownLat !=null && lastKnownLon != null){
        getWeatherByCoords(lastKnownLat, lastKnownLon);
    } else{
        initializeWeather()
    }
}

async function handleCitySave(){
   const city = cityInput.value.trim();
   if(city){
       selectedCity = city;
       localStorage.setItem('weatherAppCity', selectedCity);
       getWeatherByCity(selectedCity);
   } else{
       displayMessage(translations[currentLanguage]["alerts"]["enter_city_name"], 'warning')
   }
}

async function getWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(`/weather?lat=${lat}&lon=${lon}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateWeatherUI(data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        displayMessage(`${translations[currentLanguage]["alerts"]["api_error"]}`, 'error');
    } finally {
        hideSpinner();
    }
}

async function getWeatherByCityId(cityId) {
    try {
        const response = await fetch(`/weather?id=${cityId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        updateWeatherUI(data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        displayMessage(`${translations[currentLanguage]["alerts"]["api_error"]}`, 'error');
    } finally {
        hideSpinner();
    }
}

async function getWeatherByCity(city) {
    try {
        const response = await fetch(`/weather?city=${city}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        globalData = data;
        updateWeatherUI(data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        displayMessage(`${translations[currentLanguage]["alerts"]["api_error"]}`, 'error');
    } finally {
        hideSpinner();
    }
}

let debounceTimer;
function debounce(func, delay){
    return function (...args) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout( () => func.apply(this, args), delay );
    }
}

async function fetchCitySuggestions() {
    const query = cityInput.value.trim();
    if (query.length < 2) {
        citySuggestionsDatalist.innerHTML = '';
        return;
    }
    try {
        const response = await fetch(`/cities?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const cities = await response.json();
        citySuggestionsDatalist.innerHTML = '';
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city['name'];
            citySuggestionsDatalist.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching city suggestions:', error);
    }
}

function convertWindDegreesToDirection(deg) {
    const directions = translatedWindDirections.length > 0 ? translatedWindDirections : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    const index = Math.round((deg % 360) / 45);
    return directions[index % 8];
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function displayMessage(message, type) {
    let messageDiv = document.getElementById('app-message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'app-message';
        document.body.appendChild(messageDiv);
        Object.assign(messageDiv.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            borderRadius: '8px',
            zIndex: '1000',
            color: '#fff',
            textAlign: 'center',
            opacity: '0',
            transition: 'opacity 0.5s ease-in-out',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        });
    }

    messageDiv.textContent = message;
    if (type === 'error') {
        messageDiv.style.backgroundColor = '#dc3545';
    } else if (type === 'warning') {
        messageDiv.style.backgroundColor = '#ffc107';
        messageDiv.style.color = '#343a40';
    } else {
        messageDiv.style.backgroundColor = '#28a745';
    }

    messageDiv.style.opacity = '1';

    setTimeout(() => {
        messageDiv.style.opacity = '0';
    }, 3000);
}


function updateWeatherUI(data) {
    if (data.error) {
        alert(data.error);
        return;
    }
    const units = translations[currentLanguage]['units'];
    const feelsLikeText = translations[currentLanguage]['feels_like_label'] || 'Feels Like';

    document.getElementById('location-name').textContent = data.name || 'N/A';
    document.getElementById('temperature').querySelector('.weather-value-text').textContent = `${Math.round(data.main.temp)}°C`;
    /*const tempElement = document.getElementById('temperature');
    const tempText = `${Math.round(data.main.temp)}°C`
    tempElement.innerHTML = `${tempText} <i class="fas fa-info-circle info-icon"></i>`;*/

    document.getElementById('description').textContent = data.weather[0].description || 'N/A';
    document.getElementById('feels-like').textContent = `${feelsLikeText} ${Math.round(data.main.feels_like)}°C`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind-speed').querySelector('.weather-value-text').textContent = `${data.wind.speed} ${units['speed']}`;
    /*const windSpeedElement = document.getElementById('wind-speed');
    const windSpeedText = `${data.wind.speed} ${units['speed']}`;
    windSpeedElement.innerHTML = `${windSpeedText} <i class="fas fa-info-circle info-icon"></i>`;*/

    document.getElementById('pressure').textContent = `${data.main.pressure} ${units['speed']}`;

    document.getElementById('sunrise').textContent = data.sys.sunrise ? formatTime(data.sys.sunrise) : 'N/A';
    document.getElementById('sunset').textContent = data.sys.sunset ? formatTime(data.sys.sunset) : 'N/A';
    document.getElementById('visibility').textContent = data.visibility ? `${(data.visibility / 1000).toFixed(1)} ${units['distance']}` : 'N/A';

    document.getElementById('wind-direction').textContent = data.wind.deg ? convertWindDegreesToDirection(data.wind.deg) : 'N/A';
    document.getElementById('wind-gust').textContent = data.wind.gust ? `${data.wind.gust.toFixed(1)} ${units['speed']}` : 'N/A';


    const weatherIcon = document.getElementById('weather-icon');
    if (data.weather[0].icon) {
        weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        weatherIcon.alt = data.weather[0].description;
    } else {
        weatherIcon.src = '';
        weatherIcon.alt = 'No icon available';
    }

    const body = document.body;
    const weatherMain = data.weather[0].main;
    const weatherDescription = data.weather[0].description;
    const currentTime = new Date().getTime() / 1000;
    const sunriseTime = data.sys.sunrise;
    const sunsetTime = data.sys.sunset;
    let backgroundGradient = weatherBackgrounds['default'];
    if (weatherBackgrounds[weatherDescription]) {
        if (typeof weatherBackgrounds[weatherDescription] === 'object' && (weatherDescription === 'clear sky' || weatherMain === 'Clear')) {
            if (currentTime > sunriseTime && currentTime < sunsetTime) {
                backgroundGradient = weatherBackgrounds[weatherDescription].day;
            } else {
                backgroundGradient = weatherBackgrounds[weatherDescription].night;
            }
        } else {
            backgroundGradient = weatherBackgrounds[weatherDescription];
        }
    }
    else if (weatherMain === 'Clear') {
        if (currentTime > sunriseTime && currentTime < sunsetTime) {
            backgroundGradient = weatherBackgrounds['Clear'] && weatherBackgrounds['Clear'].day ? weatherBackgrounds['Clear'].day : weatherBackgrounds['default'];
        } else {
            backgroundGradient = weatherBackgrounds['Clear'] && weatherBackgrounds['Clear'].night ? weatherBackgrounds['Clear'].night : weatherBackgrounds['default'];
        }
    }
    else if (weatherBackgrounds[weatherMain]) {
        backgroundGradient = weatherBackgrounds[weatherMain];
    }
    body.style.backgroundImage = backgroundGradient

}