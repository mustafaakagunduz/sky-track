from django.contrib import admin

from .models import Aircraft, PositionLog


@admin.register(Aircraft)
class AircraftAdmin(admin.ModelAdmin):
    list_display = (
        "callsign",
        "aircraft_type",
        "classification",
        "altitude",
        "heading",
        "speed",
        "source",
        "updated_at",
    )
    list_filter = ("aircraft_type", "classification", "source")
    search_fields = ("callsign",)


@admin.register(PositionLog)
class PositionLogAdmin(admin.ModelAdmin):
    list_display = ("aircraft", "altitude", "timestamp")
    list_filter = ("aircraft",)
