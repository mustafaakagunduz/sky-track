import json

from channels.generic.websocket import AsyncWebsocketConsumer

AIRCRAFT_GROUP = "aircraft_updates"


class AircraftConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(AIRCRAFT_GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(AIRCRAFT_GROUP, self.channel_name)

    async def aircraft_positions(self, event):
        await self.send(text_data=json.dumps(event["payload"]))
