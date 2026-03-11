#!/usr/bin/env python3
"""Check the weather for a city using the Open-Meteo API (no API key needed)."""

import sys
import json
import urllib.request
import urllib.parse

def geocode(city):
    """Get latitude/longitude for a city name."""
    params = urllib.parse.urlencode({"name": city, "count": 1, "language": "en"})
    url = f"https://geocoding-api.open-meteo.com/v1/search?{params}"
    with urllib.request.urlopen(url) as resp:
        data = json.loads(resp.read())
    if "results" not in data:
        print(f"City not found: {city}")
        sys.exit(1)
    r = data["results"][0]
    return r["latitude"], r["longitude"], r["name"], r.get("admin1", "")

def get_weather(lat, lon, unit):
    """Fetch current weather and tomorrow's forecast."""
    temp_unit = "celsius" if unit == "C" else "fahrenheit"
    speed_unit = "kmh" if unit == "C" else "mph"
    params = urllib.parse.urlencode({
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
        "temperature_unit": temp_unit,
        "wind_speed_unit": speed_unit,
        "forecast_days": 2,
        "timezone": "auto",
    })
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read())

WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ heavy hail",
}

def describe(code):
    return WMO_CODES.get(code, f"Unknown ({code})")

def main():
    args = sys.argv[1:]

    if "--help" in args or "-h" in args:
        print("Usage: weather.py [CITY] [-c|--celsius] [-f|--fahrenheit]")
        print("  Default: San Francisco, Celsius")
        return

    unit = "C"
    if "--fahrenheit" in args or "-f" in args:
        unit = "F"
        args = [a for a in args if a not in ("--fahrenheit", "-f")]
    elif "--celsius" in args or "-c" in args:
        args = [a for a in args if a not in ("--celsius", "-c")]

    city = " ".join(args) if args else "San Francisco"
    deg = "°C" if unit == "C" else "°F"
    speed = "km/h" if unit == "C" else "mph"

    try:
        lat, lon, name, region = geocode(city)
        data = get_weather(lat, lon, unit)
    except urllib.error.URLError as e:
        print(f"Network error: {e.reason}")
        sys.exit(1)

    cur = data["current"]
    daily = data["daily"]

    print(f"\n  Weather for {name}, {region}\n")
    print(f"  Now:      {describe(cur['weather_code'])}, {cur['temperature_2m']}{deg}")
    print(f"            Humidity {cur['relative_humidity_2m']}%, Wind {cur['wind_speed_10m']} {speed}\n")

    for i, label in enumerate(["Today", "Tomorrow"]):
        print(f"  {label:9s} {describe(daily['weather_code'][i])}")
        print(f"            High {daily['temperature_2m_max'][i]}{deg} / Low {daily['temperature_2m_min'][i]}{deg}")
        print(f"            Precip chance {daily['precipitation_probability_max'][i]}%\n")

if __name__ == "__main__":
    main()
