import django.contrib.gis.db.models.fields
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Aircraft",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("callsign", models.CharField(max_length=16, unique=True)),
                (
                    "aircraft_type",
                    models.CharField(
                        choices=[
                            ("MILITARY", "Military"),
                            ("COMMERCIAL", "Commercial"),
                            ("DRONE", "Drone"),
                            ("UNKNOWN", "Unknown"),
                        ],
                        default="UNKNOWN",
                        max_length=16,
                    ),
                ),
                (
                    "classification",
                    models.CharField(
                        choices=[
                            ("FRIENDLY", "Friendly"),
                            ("HOSTILE", "Hostile"),
                            ("NEUTRAL", "Neutral"),
                            ("UNKNOWN", "Unknown"),
                        ],
                        default="UNKNOWN",
                        max_length=16,
                    ),
                ),
                (
                    "position",
                    django.contrib.gis.db.models.fields.PointField(srid=4326),
                ),
                (
                    "altitude",
                    models.FloatField(help_text="meters"),
                ),
                (
                    "heading",
                    models.FloatField(help_text="degrees"),
                ),
                (
                    "speed",
                    models.FloatField(help_text="m/s"),
                ),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("SIMULATOR", "Simulator"),
                            ("OPENSKY", "OpenSky"),
                        ],
                        default="SIMULATOR",
                        max_length=16,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="PositionLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "position",
                    django.contrib.gis.db.models.fields.PointField(srid=4326),
                ),
                ("altitude", models.FloatField()),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                (
                    "aircraft",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="track",
                        to="tracking.aircraft",
                    ),
                ),
            ],
            options={
                "ordering": ["-timestamp"],
            },
        ),
    ]
