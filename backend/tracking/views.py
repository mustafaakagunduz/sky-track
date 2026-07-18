from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from rest_framework.exceptions import ParseError
from rest_framework.generics import ListAPIView, RetrieveAPIView

from .models import Aircraft, PositionLog
from .serializers import AircraftSerializer, NearbyAircraftSerializer, PositionLogSerializer


class AircraftListView(ListAPIView):
    serializer_class = AircraftSerializer

    def get_queryset(self):
        queryset = Aircraft.objects.all()
        aircraft_type = self.request.query_params.get("aircraft_type")
        classification = self.request.query_params.get("classification")
        if aircraft_type:
            queryset = queryset.filter(aircraft_type=aircraft_type.upper())
        if classification:
            queryset = queryset.filter(classification=classification.upper())
        return queryset


class AircraftDetailView(RetrieveAPIView):
    queryset = Aircraft.objects.all()
    serializer_class = AircraftSerializer
    lookup_field = "callsign"


class AircraftTrackView(ListAPIView):
    serializer_class = PositionLogSerializer

    def get_queryset(self):
        return PositionLog.objects.filter(
            aircraft__callsign=self.kwargs["callsign"]
        ).order_by("-timestamp")


class AircraftNearbyView(ListAPIView):
    serializer_class = NearbyAircraftSerializer

    def get_queryset(self):
        try:
            lat = float(self.request.query_params["lat"])
            lon = float(self.request.query_params["lon"])
            radius_km = float(self.request.query_params["radius_km"])
        except (KeyError, ValueError):
            raise ParseError(
                "lat, lon, and radius_km query params are required and must be numeric."
            )

        point = Point(lon, lat, srid=4326)
        return (
            Aircraft.objects.filter(position__distance_lte=(point, D(km=radius_km)))
            .annotate(distance=Distance("position", point))
            .order_by("distance")
        )
