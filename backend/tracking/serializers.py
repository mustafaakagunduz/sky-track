from rest_framework import serializers

from .models import Aircraft, PositionLog


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


class NearbyAircraftSerializer(AircraftSerializer):
    distance_km = serializers.SerializerMethodField()

    class Meta(AircraftSerializer.Meta):
        fields = AircraftSerializer.Meta.fields + ["distance_km"]

    def get_distance_km(self, obj):
        return round(obj.distance.km, 2)


class PositionLogSerializer(serializers.ModelSerializer):
    lat = serializers.SerializerMethodField()
    lon = serializers.SerializerMethodField()

    class Meta:
        model = PositionLog
        fields = ["lat", "lon", "altitude", "timestamp"]

    def get_lat(self, obj):
        return obj.position.y

    def get_lon(self, obj):
        return obj.position.x
