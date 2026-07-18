import pytest
from django.contrib.gis.geos import Point

from tracking.management.commands.run_ingest import Command
from tracking.models import Aircraft, PositionLog


@pytest.mark.django_db
def test_simulator_tick_moves_aircraft_and_logs_position():
    aircraft = Aircraft.objects.create(
        callsign="TICK01",
        aircraft_type=Aircraft.AircraftType.COMMERCIAL,
        classification=Aircraft.Classification.NEUTRAL,
        position=Point(28.9, 40.9, srid=4326),
        altitude=5000.0,
        heading=90.0,
        speed=200.0,
    )
    original_position = (aircraft.position.x, aircraft.position.y)

    payload = Command()._tick_simulator()

    aircraft.refresh_from_db()
    moved_position = (aircraft.position.x, aircraft.position.y)

    assert moved_position != original_position
    assert PositionLog.objects.filter(aircraft=aircraft).count() == 1
    assert payload["type"] == "positions"
    assert payload["aircraft"][0]["callsign"] == "TICK01"


@pytest.mark.django_db
def test_simulator_tick_prunes_old_position_logs():
    from tracking.models import MAX_POSITION_LOG_ENTRIES

    aircraft = Aircraft.objects.create(
        callsign="PRUNE01",
        position=Point(28.9, 40.9, srid=4326),
        altitude=5000.0,
        heading=90.0,
        speed=200.0,
    )
    for _ in range(MAX_POSITION_LOG_ENTRIES):
        Command()._tick_simulator()

    assert PositionLog.objects.filter(aircraft=aircraft).count() == MAX_POSITION_LOG_ENTRIES

    Command()._tick_simulator()

    assert PositionLog.objects.filter(aircraft=aircraft).count() == MAX_POSITION_LOG_ENTRIES
