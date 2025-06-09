let lastKnownLat = null;
let lastKnownLon = null;
let currentLanguage = 'en';
let translatedWindDirections = [];
const translations = {};
let loadingSpinner;
let weatherCard;

document.addEventListener('DOMContentLoaded', async () => {
    loadingSpinner = document.getElementById('loading-spinner');
    weatherCard = document.getElementById('weather-card');

    await loadAndApplyLanguage();

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
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            lastKnownLat = position.coords.latitude;
            lastKnownLon = position.coords.longitude;
            getWeatherByCoords(lastKnownLat, lastKnownLon);
        }, error => {
            console.error('Geolocation error:', error);
            alert(`${translations[currentLanguage]["alerts"]["could_not_get_geo"]}`);
            getWeatherByCity('London');
        });
    } else {
        alert(`${translations[currentLanguage]["alerts"]["geo_not_supported"]}`);
        getWeatherByCity('New York');
    }
}

async function handleRefresh() {
    showSpinner();
    if (lastKnownLat !== null && lastKnownLon !== null) {
        getWeatherByCoords(lastKnownLat, lastKnownLon);
    } else {
        initializeWeather();
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
        alert(`${translations[currentLanguage]["alerts"]["api_error"]}`);
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
        updateWeatherUI(data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert(`${translations[currentLanguage]["alerts"]["api_error"]}`);
    } finally {
        hideSpinner();
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
    document.getElementById('wind-speed').querySelector('.weather-value-text').textContent = `${data.wind.speed} m/s`;
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
}