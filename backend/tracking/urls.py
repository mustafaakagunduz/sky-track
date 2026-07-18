from django.urls import path

from . import views

urlpatterns = [
    path("aircraft/", views.AircraftListView.as_view(), name="aircraft-list"),
    path(
        "aircraft/<str:callsign>/",
        views.AircraftDetailView.as_view(),
        name="aircraft-detail",
    ),
]
