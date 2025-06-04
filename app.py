from flask import Flask, render_template, request, jsonify

import requests
import os

app = Flask(__name__)


OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
DEBUG = os.getenv("DEBUG")



@app.route('/')
def index():
    return render_template('index.html')


@app.route('/weather')
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    city = request.args.get('city')

    params = {
        'appid': OPENWEATHER_API_KEY,
        'units': 'metric'
    }

    if lat and lon:
        params['lat'] = lat
        params['lon'] = lon
    elif city:
        params['q'] = city
    else:
        return jsonify({"error": "Missing latitude/longitude or city"}), 400

    try:
        response = requests.get(OPENWEATHER_BASE_URL, params=params)
        response.raise_for_status()
        weather_data = response.json()
        return jsonify(weather_data)
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error fetching weather data: {e}")
        return jsonify({"error": "Could not retrieve weather data."}), 500
    except ValueError:
        app.logger.error(
            "Failed to decode JSON from OpenWeatherMap API response.")
        return jsonify({"error": "Invalid weather data received."}), 500


if __name__ == '__main__':
    if DEBUG == "T":
        app.run(debug=True, host='0.0.0.0',port=5000)
    else:
        app.run(debug=False, host='0.0.0.0',port=5000)
