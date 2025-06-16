from flask import Flask, render_template, request, jsonify
import json
from flask_cors import CORS, cross_origin

import requests
import os
app = Flask(__name__)
CORS(app,
     origins=["http://localhost:5000", "https://pwuvlkh.nem.ink/"],
     methods=["GET"],
     max_age=3600)

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
DEBUG = os.getenv("DEBUG")

with open('test/static/city.list.json' ,encoding='utf-8') as f:
    RAW_CITIES = json.load(f)

CITIES = [
    {
        "id": city["id"],
        "name": city["name"],
        "country": city["country"],
        "state": city.get("state", ""),
        "lat": city["coord"]["lat"],
        "lon": city["coord"]["lon"]
    }
    for city in RAW_CITIES
]



@app.route('/')
def index():
    return render_template('index.html')


@app.route('/weather', methods=['GET'])
@cross_origin(methods=['GET'])
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


@app.route('/cities')
@cross_origin(methods=['GET'])
def get_cities():
    query = request.args.get('q', '').lower()
    if not query:
        return jsonify([])

    seen_names = set()
    unique_matches = []

    for city in CITIES:
        name_lower = city["name"].lower()
        if query in name_lower and name_lower not in seen_names:
            seen_names.add(name_lower)
            unique_matches.append(city)

    sorted_matches = sorted(unique_matches, key=lambda city: city["id"])[:10]
    return jsonify(sorted_matches)



if __name__ == '__main__':
    if DEBUG == "T":
        app.run(debug=True, host='0.0.0.0',port=5000)
    else:
        app.run(debug=False, host='0.0.0.0',port=5000)
