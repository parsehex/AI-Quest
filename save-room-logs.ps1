# This script reads the list of rooms from list.json and saves room-level info and logs for each room in its directory.
# reads: data/rooms/list.json, data/logs/logs.json
# writes:
# - data/rooms/{roomId}/room.json
# - data/rooms/{roomId}/logs.json
# - data/rooms/{roomId}/llm-logs.json

# Read room IDs from list.json
$rooms = Get-Content -Raw .\data\rooms\list.json | ConvertFrom-Json
$roomIds = $rooms | ForEach-Object { $_.id }

foreach ($roomId in $roomIds) {
    # Create directory if it doesn't exist
    New-Item -ItemType Directory -Force -Path ".\data\rooms\$roomId"

    # Save room data from list.json
    $roomData = $rooms | Where-Object { $_.id -eq $roomId } | ConvertTo-Json
    $roomData | Out-File ".\data\rooms\$roomId\room.json"

    # Save full room logs
    $fullQuery = "[.[] | select(.context.roomId == " + '\"' + $roomId + '\"' + ")]"
    jq $fullQuery .\data\logs\logs.json > ".\data\rooms\$roomId\logs.json"

    # Save LLM logs
    $llmQuery = "[.[] | select(.context.roomId == " + '\"' + $roomId + '\"' + " and .prefix == " + '\"' + "lib/llm" + '\"' + ")]"
    jq $llmQuery .\data\logs\logs.json > ".\data\rooms\$roomId\llm-logs.json"
}
