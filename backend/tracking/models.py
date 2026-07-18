from django.contrib.gis.db import models

MAX_POSITION_LOG_ENTRIES = 50


class Aircraft(models.Model):
    class AircraftType(models.TextChoices):
        MILITARY = "MILITARY", "Military"
        COMMERCIAL = "COMMERCIAL", "Commercial"
        DRONE = "DRONE", "Drone"
        UNKNOWN = "UNKNOWN", "Unknown"

    class Classification(models.TextChoices):
        FRIENDLY = "FRIENDLY", "Friendly"
        HOSTILE = "HOSTILE", "Hostile"
        NEUTRAL = "NEUTRAL", "Neutral"
        UNKNOWN = "UNKNOWN", "Unknown"

    class Source(models.TextChoices):
        SIMULATOR = "SIMULATOR", "Simulator"
        OPENSKY = "OPENSKY", "OpenSky"

    callsign = models.CharField(max_length=16, unique=True)
    aircraft_type = models.CharField(
        max_length=16, choices=AircraftType.choices, default=AircraftType.UNKNOWN
    )
    classification = models.CharField(
        max_length=16, choices=Classification.choices, default=Classification.UNKNOWN
    )
    position = models.PointField(srid=4326)
    altitude = models.FloatField(help_text="meters")
    heading = models.FloatField(help_text="degrees")
    speed = models.FloatField(help_text="m/s")
    source = models.CharField(
        max_length=16, choices=Source.choices, default=Source.SIMULATOR
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.callsign


class PositionLog(models.Model):
    aircraft = models.ForeignKey(
        Aircraft, related_name="track", on_delete=models.CASCADE
    )
    position = models.PointField(srid=4326)
    altitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.aircraft.callsign} @ {self.timestamp}"
