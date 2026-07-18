from rest_framework import serializers

from .models import Aircraft


class AircraftSerializer(serializers.ModelSerializer):
    lat = serializers.SerializerMethodField()
    lon = serializers.SerializerMethodField()

    class Meta:
        model = Aircraft
        fields = [
            "callsign",
            "aircraft_type",
            "classification",
            "lat",
            "lon",
            "altitude",
            "heading",
            "speed",
            "source",
            "updated_at",
        ]

    def get_lat(self, obj):
        return obj.position.y

    def get_lon(self, obj):
        return obj.position.x
