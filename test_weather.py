#!/usr/bin/env python3
"""Tests for weather.py — unit tests for parseable logic, no network needed."""

import unittest
from unittest.mock import patch
import json

import weather

class TestDescribe(unittest.TestCase):
    def test_known_codes(self):
        self.assertEqual(weather.describe(0), "Clear sky")
        self.assertEqual(weather.describe(65), "Heavy rain")
        self.assertEqual(weather.describe(95), "Thunderstorm")

    def test_unknown_code(self):
        self.assertEqual(weather.describe(999), "Unknown (999)")

class TestGeocode(unittest.TestCase):
    def test_city_not_found(self):
        """When API returns no results, should exit with code 1."""
        mock_response = json.dumps({}).encode()
        with patch("urllib.request.urlopen") as mock_url:
            mock_url.return_value.__enter__ = lambda s: s
            mock_url.return_value.__exit__ = lambda s, *a: None
            mock_url.return_value.read.return_value = mock_response
            with self.assertRaises(SystemExit) as cm:
                weather.geocode("xyznonexistent")
            self.assertEqual(cm.exception.code, 1)

    def test_valid_city(self):
        """When API returns results, should extract lat/lon/name."""
        mock_response = json.dumps({
            "results": [{
                "latitude": 51.5,
                "longitude": -0.1,
                "name": "London",
                "admin1": "England"
            }]
        }).encode()
        with patch("urllib.request.urlopen") as mock_url:
            mock_url.return_value.__enter__ = lambda s: s
            mock_url.return_value.__exit__ = lambda s, *a: None
            mock_url.return_value.read.return_value = mock_response
            lat, lon, name, region = weather.geocode("London")
        self.assertEqual(lat, 51.5)
        self.assertEqual(lon, -0.1)
        self.assertEqual(name, "London")
        self.assertEqual(region, "England")

class TestArgParsing(unittest.TestCase):
    """Test that main() parses flags correctly by checking get_weather call."""

    @patch("weather.get_weather")
    @patch("weather.geocode")
    def test_default_celsius(self, mock_geo, mock_weather):
        mock_geo.return_value = (51.5, -0.1, "London", "England")
        mock_weather.return_value = {
            "current": {"weather_code": 0, "temperature_2m": 15, "relative_humidity_2m": 60, "wind_speed_10m": 10},
            "daily": {"weather_code": [0, 1], "temperature_2m_max": [18, 20], "temperature_2m_min": [10, 12], "precipitation_probability_max": [5, 10]}
        }
        with patch("sys.argv", ["weather.py", "London"]):
            weather.main()
        mock_weather.assert_called_once_with(51.5, -0.1, "C")

    @patch("weather.get_weather")
    @patch("weather.geocode")
    def test_fahrenheit_flag(self, mock_geo, mock_weather):
        mock_geo.return_value = (40.7, -74.0, "New York", "New York")
        mock_weather.return_value = {
            "current": {"weather_code": 2, "temperature_2m": 60, "relative_humidity_2m": 50, "wind_speed_10m": 15},
            "daily": {"weather_code": [2, 3], "temperature_2m_max": [65, 68], "temperature_2m_min": [50, 52], "precipitation_probability_max": [20, 30]}
        }
        with patch("sys.argv", ["weather.py", "--fahrenheit", "New York"]):
            weather.main()
        mock_weather.assert_called_once_with(40.7, -74.0, "F")

if __name__ == "__main__":
    unittest.main()
