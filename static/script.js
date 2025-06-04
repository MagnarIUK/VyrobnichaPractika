let lastKnownLat = null;
let lastKnownLon = null;
let currentLanguage = 'en';

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
            alert('Could not get your location. Please allow location access or try again.');
            getWeatherByCity('London');
        });
    } else {
        alert('Geolocation is not supported by your browser.');
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
        alert('Failed to fetch weather data. Please try again later.');
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
        alert('Failed to fetch weather data for the default city. Please try again later.');
    } finally {
        hideSpinner();
    }
}


function updateWeatherUI(data) {
    if (data.error) {
        alert(data.error);
        return;
    }

    document.getElementById('location-name').textContent = data.name || 'N/A';
    document.getElementById('temperature').textContent = `${data.main.temp}°C`;
    document.getElementById('description').textContent = data.weather[0].description || 'N/A';
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind-speed').textContent = `${data.wind.speed} m/s`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`; // Convert meters to km

    const weatherIcon = document.getElementById('weather-icon');
    if (data.weather[0].icon) {
        weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        weatherIcon.alt = data.weather[0].description;
    } else {
        weatherIcon.src = '';
        weatherIcon.alt = 'No icon available';
    }
}
