import pytest
from django.contrib.gis.geos import Point
from django.urls import reverse
from rest_framework.test import APIClient

from tracking.models import Aircraft


def make_aircraft(callsign, lat, lon, **kwargs):
    defaults = {
        "aircraft_type": Aircraft.AircraftType.UNKNOWN,
        "classification": Aircraft.Classification.UNKNOWN,
        "altitude": 5000.0,
        "heading": 90.0,
        "speed": 200.0,
    }
    defaults.update(kwargs)
    return Aircraft.objects.create(
        callsign=callsign, position=Point(lon, lat, srid=4326), **defaults
    )


@pytest.mark.django_db
def test_list_filters_by_aircraft_type():
    make_aircraft("MIL01", 40.5, 28.5, aircraft_type=Aircraft.AircraftType.MILITARY)
    make_aircraft("COM01", 40.6, 28.6, aircraft_type=Aircraft.AircraftType.COMMERCIAL)

    client = APIClient()
    response = client.get(reverse("aircraft-list"), {"aircraft_type": "military"})

    assert response.status_code == 200
    callsigns = [a["callsign"] for a in response.json()]
    assert callsigns == ["MIL01"]


@pytest.mark.django_db
def test_list_filters_by_classification():
    make_aircraft("F01", 40.5, 28.5, classification=Aircraft.Classification.FRIENDLY)
    make_aircraft("H01", 40.6, 28.6, classification=Aircraft.Classification.HOSTILE)

    client = APIClient()
    response = client.get(reverse("aircraft-list"), {"classification": "hostile"})

    assert response.status_code == 200
    callsigns = [a["callsign"] for a in response.json()]
    assert callsigns == ["H01"]


@pytest.mark.django_db
def test_nearby_returns_only_aircraft_within_radius():
    center_lat, center_lon = 40.9, 28.9
    # ~5km north of the center point.
    make_aircraft("NEAR01", 40.945, 28.9)
    # ~100km north of the center point — well outside a 20km search.
    make_aircraft("FAR01", 41.8, 28.9)

    client = APIClient()
    response = client.get(
        reverse("aircraft-nearby"),
        {"lat": center_lat, "lon": center_lon, "radius_km": 20},
    )

    assert response.status_code == 200
    results = response.json()
    callsigns = [a["callsign"] for a in results]
    assert callsigns == ["NEAR01"]
    assert results[0]["distance_km"] < 20


@pytest.mark.django_db
def test_nearby_requires_query_params():
    client = APIClient()
    response = client.get(reverse("aircraft-nearby"))
    assert response.status_code == 400
