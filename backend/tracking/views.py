from rest_framework.generics import ListAPIView, RetrieveAPIView

from .models import Aircraft
from .serializers import AircraftSerializer


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
