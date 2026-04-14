import base64
import json
import os
import urllib.request

booking_data = os.environ.get('BOOKING_DATA', '{}')
gh_token = os.environ.get('GH_TOKEN')
repo = os.environ.get('REPO')

try:
    new_booking = json.loads(booking_data)
except:
    print("Invalid booking data")
    exit(1)

if not new_booking:
    print("No booking data provided")
    exit(0)

req = urllib.request.Request(
    f'https://api.github.com/repos/{repo}/contents/data/bookings.json',
    headers={'Authorization': f'Bearer {gh_token}', 'Accept': 'application/vnd.github.v3+json'}
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.load(resp)
        sha = data['sha']
        current = json.loads(base64.b64decode(data['content']).decode('utf-8'))
except:
    current = []
    sha = None

if not isinstance(current, list):
    current = []

current.append(new_booking)

content = base64.b64encode(json.dumps(current, indent=2, ensure_ascii=False).encode('utf-8')).decode()

body = {'message': f"Booking: {new_booking.get('name', 'Unknown')}", 'content': content, 'branch': 'main'}
if sha:
    body['sha'] = sha

req = urllib.request.Request(
    f'https://api.github.com/repos/{repo}/contents/data/bookings.json',
    data=json.dumps(body).encode(),
    headers={'Authorization': f'Bearer {gh_token}', 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json'},
    method='PUT'
)

with urllib.request.urlopen(req) as resp:
    result = json.load(resp)
    print(f"Booking saved! Commit: {result['commit']['sha'][:8]}")
