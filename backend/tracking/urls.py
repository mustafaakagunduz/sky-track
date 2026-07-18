from django.urls import path

from . import views

urlpatterns = [
    path("aircraft/", views.AircraftListView.as_view(), name="aircraft-list"),
    path("aircraft/nearby/", views.AircraftNearbyView.as_view(), name="aircraft-nearby"),
    path(
        "aircraft/<str:callsign>/",
        views.AircraftDetailView.as_view(),
        name="aircraft-detail",
    ),
    path(
        "aircraft/<str:callsign>/track/",
        views.AircraftTrackView.as_view(),
        name="aircraft-track",
    ),
]
