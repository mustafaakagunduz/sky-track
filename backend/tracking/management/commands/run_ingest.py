import logging
import math
import random
import time

import requests
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.contrib.gis.geos import Point
from django.core.management.base import BaseCommand
from django.db import transaction

from tracking.consumers import AIRCRAFT_GROUP
from tracking.models import MAX_POSITION_LOG_ENTRIES, Aircraft, PositionLog

logger = logging.getLogger(__name__)

# Marmara region bounding box (simulator)
LAT_MIN, LAT_MAX = 40.0, 41.8
LON_MIN, LON_MAX = 27.5, 30.0

# Turkey bounding box (OpenSky)
OPENSKY_URL = "https://opensky-network.org/api/states/all"
OPENSKY_BBOX = {"lamin": 35.8, "lomin": 25.5, "lamax": 42.5, "lomax": 44.9}
OPENSKY_TIMEOUT_S = 10

NUM_AIRCRAFT = 80
TICK_SECONDS = 1.0
EARTH_RADIUS_M = 6_371_000

AIRCRAFT_TYPES = list(Aircraft.AircraftType)
CLASSIFICATIONS = list(Aircraft.Classification)

CALLSIGN_PREFIXES = ["FJ", "TK", "AH", "BX", "SG", "NR", "QW", "VD"]


def fetch_opensky_states():
    response = requests.get(OPENSKY_URL, params=OPENSKY_BBOX, timeout=OPENSKY_TIMEOUT_S)
    response.raise_for_status()
    return response.json().get("states") or []


def random_callsign(existing):
    while True:
        callsign = f"{random.choice(CALLSIGN_PREFIXES)}{random.randint(1000, 9999)}"
        if callsign not in existing:
            return callsign


def spawn_aircraft(n):
    aircraft = []
    existing = set()
    for _ in range(n):
        callsign = random_callsign(existing)
        existing.add(callsign)
        lat = random.uniform(LAT_MIN, LAT_MAX)
        lon = random.uniform(LON_MIN, LON_MAX)
        aircraft.append(
            Aircraft(
                callsign=callsign,
                aircraft_type=random.choice(AIRCRAFT_TYPES),
                classification=random.choice(CLASSIFICATIONS),
                position=Point(lon, lat, srid=4326),
                altitude=random.uniform(1000, 11000),
                heading=random.uniform(0, 360),
                speed=random.uniform(120, 260),
                source=Aircraft.Source.SIMULATOR,
            )
        )
    Aircraft.objects.bulk_create(aircraft)


def advance_position(lat, lon, heading_deg, speed_ms, dt_s):
    distance_m = speed_ms * dt_s
    heading_rad = math.radians(heading_deg)
    lat_rad = math.radians(lat)

    delta_lat = (distance_m * math.cos(heading_rad)) / EARTH_RADIUS_M
    delta_lon = (distance_m * math.sin(heading_rad)) / (
        EARTH_RADIUS_M * math.cos(lat_rad)
    )

    new_lat = lat + math.degrees(delta_lat)
    new_lon = lon + math.degrees(delta_lon)
    return new_lat, new_lon


def bounce_within_bounds(lat, lon, heading):
    if lat < LAT_MIN or lat > LAT_MAX:
        heading = (-heading) % 360
        lat = max(LAT_MIN, min(LAT_MAX, lat))
    if lon < LON_MIN or lon > LON_MAX:
        heading = (180 - heading) % 360
        lon = max(LON_MIN, min(LON_MAX, lon))
    return lat, lon, heading


class Command(BaseCommand):
    help = "Runs the aircraft ingest loop (simulator or OpenSky), broadcasting updates over the channel layer."

    def handle(self, *args, **options):
        channel_layer = get_channel_layer()
        mode = "opensky" if settings.DATA_SOURCE == "opensky" else "simulator"

        if mode == "opensky":
            self.stdout.write(
                "Starting ingest in OpenSky mode (falls back to simulator on failure)."
            )
        else:
            self.stdout.write("Starting ingest in simulator mode.")
            if not Aircraft.objects.filter(source=Aircraft.Source.SIMULATOR).exists():
                self.stdout.write(f"Spawning {NUM_AIRCRAFT} simulated aircraft...")
                spawn_aircraft(NUM_AIRCRAFT)

        while True:
            start = time.monotonic()

            if mode == "opensky":
                payload = self._tick_opensky()
                if payload is None:
                    logger.warning("OpenSky fetch failed; falling back to simulator mode.")
                    self.stderr.write(
                        self.style.WARNING(
                            "OpenSky fetch failed; falling back to simulator mode."
                        )
                    )
                    mode = "simulator"
                    Aircraft.objects.filter(source=Aircraft.Source.OPENSKY).delete()
                    if not Aircraft.objects.filter(source=Aircraft.Source.SIMULATOR).exists():
                        spawn_aircraft(NUM_AIRCRAFT)
                    continue
            else:
                payload = self._tick_simulator()

            async_to_sync(channel_layer.group_send)(
                AIRCRAFT_GROUP,
                {"type": "aircraft.positions", "payload": payload},
            )
            elapsed = time.monotonic() - start
            time.sleep(max(0.0, TICK_SECONDS - elapsed))

    def _tick_opensky(self):
        try:
            states = fetch_opensky_states()
        except (requests.RequestException, ValueError) as exc:
            logger.warning("OpenSky fetch failed: %s", exc)
            return None

        updated = []
        logs = []

        for state in states:
            icao24, callsign_raw = state[0], state[1]
            lon, lat = state[5], state[6]
            on_ground = state[8]
            baro_altitude = state[7]
            velocity = state[9]
            true_track = state[10]

            if lat is None or lon is None or on_ground:
                continue

            callsign = (callsign_raw or icao24 or "").strip().upper()
            if not callsign:
                continue

            aircraft, _ = Aircraft.objects.update_or_create(
                callsign=callsign,
                defaults={
                    "aircraft_type": Aircraft.AircraftType.COMMERCIAL,
                    "classification": Aircraft.Classification.NEUTRAL,
                    "position": Point(lon, lat, srid=4326),
                    "altitude": baro_altitude or 0.0,
                    "heading": true_track or 0.0,
                    "speed": velocity or 0.0,
                    "source": Aircraft.Source.OPENSKY,
                },
            )
            updated.append(aircraft)
            logs.append(
                PositionLog(
                    aircraft=aircraft, position=aircraft.position, altitude=aircraft.altitude
                )
            )

        with transaction.atomic():
            PositionLog.objects.bulk_create(logs)
            self._prune_position_logs(updated)

        return {
            "type": "positions",
            "aircraft": [
                {
                    "callsign": a.callsign,
                    "lat": a.position.y,
                    "lon": a.position.x,
                    "altitude": a.altitude,
                    "heading": a.heading,
                    "speed": a.speed,
                    "aircraft_type": a.aircraft_type,
                    "classification": a.classification,
                }
                for a in updated
            ],
        }

    def _tick_simulator(self):
        aircraft_list = list(Aircraft.objects.all())
        updated = []
        logs = []

        for aircraft in aircraft_list:
            heading = (
                aircraft.heading + random.uniform(-5, 5)
            ) % 360
            lat, lon = advance_position(
                aircraft.position.y, aircraft.position.x, heading, aircraft.speed, TICK_SECONDS
            )
            lat, lon, heading = bounce_within_bounds(lat, lon, heading)

            aircraft.position = Point(lon, lat, srid=4326)
            aircraft.heading = heading
            updated.append(aircraft)
            logs.append(
                PositionLog(
                    aircraft=aircraft, position=aircraft.position, altitude=aircraft.altitude
                )
            )

        with transaction.atomic():
            Aircraft.objects.bulk_update(updated, ["position", "heading", "updated_at"])
            PositionLog.objects.bulk_create(logs)
            self._prune_position_logs(aircraft_list)

        return {
            "type": "positions",
            "aircraft": [
                {
                    "callsign": a.callsign,
                    "lat": a.position.y,
                    "lon": a.position.x,
                    "altitude": a.altitude,
                    "heading": a.heading,
                    "speed": a.speed,
                    "aircraft_type": a.aircraft_type,
                    "classification": a.classification,
                }
                for a in updated
            ],
        }

    def _prune_position_logs(self, aircraft_list):
        for aircraft in aircraft_list:
            ids_to_keep = list(
                PositionLog.objects.filter(aircraft=aircraft)
                .order_by("-timestamp")
                .values_list("id", flat=True)[:MAX_POSITION_LOG_ENTRIES]
            )
            if ids_to_keep:
                PositionLog.objects.filter(aircraft=aircraft).exclude(
                    id__in=ids_to_keep
                ).delete()
