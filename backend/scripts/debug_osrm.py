
import requests
import json

def debug_osrm():
    # Minneapolis coordinates
    coords = "-93.2650,44.9778;-93.2560,44.9700"
    timestamps = "1676990000;1676990100" # Dummy timestamps
    
    url = f"http://osrm.mark-potter.com/match/v1/driving/{coords}"
    params = {
        "timestamps": timestamps,
        "geometries": "geojson",
        "overview": "full",
        "steps": "true",
        "annotations": "true"
    }
    
    try:
        resp = requests.get(url, params=params)
        data = resp.json()
        
        print("Response Code:", data.get('code'))
        if 'matchings' in data and len(data['matchings']) > 0:
            matching = data['matchings'][0]
            print("Top level geometry keys:", matching.get('geometry').keys() if isinstance(matching.get('geometry'), dict) else "Not dict")
            
            if 'legs' in matching and len(matching['legs']) > 0:
                leg = matching['legs'][0]
                print(f"Leg has {len(leg.get('steps', []))} steps.")
                if leg.get('steps'):
                    first_step = leg['steps'][0]
                    print("First Step keys:", first_step.keys())
                    print("First Step geometry:", first_step.get('geometry'))
        else:
            print("No matchings found.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_osrm()
