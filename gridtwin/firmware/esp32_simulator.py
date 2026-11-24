"""
GRIDTWIN — ESP32 Virtual Hardware Simulator & Cloud Bridge
Simulates the physical ESP32 board over HiveMQ MQTT broker (broker.hivemq.com:1883).
Connects to GridTwin 3D Lab and Toll-Free Helpline in real time.
"""
import time
import json
import random
import sys

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("[ERROR] 'paho-mqtt' is not installed.")
    print("Please run: pip install paho-mqtt")
    input("Press Enter to exit...")
    sys.exit(1)

MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT   = 1883
DEVICE_ID   = "esp32-gridtwin-001"

TOPIC_COMMANDS   = f"gridtwin/devices/{DEVICE_ID}/commands"
TOPIC_ACK        = f"gridtwin/devices/{DEVICE_ID}/ack"
TOPIC_TELEMETRY  = f"gridtwin/devices/{DEVICE_ID}/telemetry"
TOPIC_STATUS     = f"gridtwin/devices/{DEVICE_ID}/status"
TOPIC_LWT        = f"gridtwin/devices/{DEVICE_ID}/availability"

output_states = {
    "T1": "ON",
    "T2": "ON",
    "T3": "ON",
    "T4": "ON",
    "T5": "ON",
}

relay_pins = {
    "T1": 13,
    "T2": 14,
    "T3": 25,
    "T4": 26,
    "T5": 27,
}

start_time = time.time()

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("\n" + "=" * 60)
        print("  ✓ CONNECTED TO HIVEMQ MQTT BROKER (broker.hivemq.com)")
        print(f"  ✓ Device ID: {DEVICE_ID}")
        print("  ✓ ESP32 is now ONLINE on GridTwin 3D Twin & Toll-Free Hotline!")
        print("=" * 60)
        client.subscribe(TOPIC_COMMANDS, qos=1)
        print(f"[MQTT] Subscribed to commands: {TOPIC_COMMANDS}")
        
        # Publish online availability
        client.publish(TOPIC_LWT, json.dumps({"status": "online"}), qos=1, retain=True)
        publish_status(client)
        publish_telemetry(client)
    else:
        print(f"[MQTT] Connection failed with code {rc}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode('utf-8'))
        cmd_id = payload.get("command_id", f"cmd-{int(time.time())}")
        target = payload.get("output_id") or payload.get("target") or ""
        action = payload.get("action", "").upper()
        req_state = payload.get("requested_state", "").upper()

        print(f"\n[COMMAND RECEIVED] cmd={cmd_id} | target={target} | action={action} | state={req_state}")

        is_off = (action in ["ISOLATE", "ALL_OFF", "OFF", "OPEN"] or req_state in ["OFF", "ISOLATED", "OPEN"])
        new_state = "OFF" if is_off else "ON"

        if target.upper() == "ALL" or action in ["ALL_ON", "ALL_OFF"]:
            for t in output_states:
                output_states[t] = new_state
            print(f"[RELAY] ALL 5 Towers switched to {new_state}")
            ack_target = "ALL"
        else:
            norm_target = target.upper()
            if norm_target in output_states:
                output_states[norm_target] = new_state
                pin = relay_pins.get(norm_target, 0)
                print(f"[RELAY] Tower {norm_target} (GPIO {pin}) switched -> {new_state} (Relay {'OPEN / LED OFF' if is_off else 'CLOSED / LED ON'})")
                ack_target = norm_target
            else:
                ack_target = target

        ack_doc = {
            "command_id": cmd_id,
            "device_id": DEVICE_ID,
            "target": ack_target,
            "output_id": ack_target,
            "action": action,
            "status": "SUCCESS",
            "reported_state": new_state,
            "relay_active_low": True,
            "logic_mode": "ACTIVE_LOW",
            "timestamp": int(time.time() * 1000),
            "output_states": output_states,
            "latency_ms": 18
        }
        client.publish(TOPIC_ACK, json.dumps(ack_doc), qos=1)
        print(f"[MQTT OUT] ACK published for {ack_target} -> {new_state}")
        publish_status(client)
    except Exception as e:
        print(f"[ERROR] Failed to process incoming command: {e}")

def publish_status(client):
    uptime_ms = int((time.time() - start_time) * 1000)
    status_doc = {
        "device_id": DEVICE_ID,
        "status": "ONLINE",
        "firmware_version": "2.4.0-5tower-sync",
        "ip_address": "192.168.1.105",
        "uptime_ms": uptime_ms,
        "wifi_rssi": -48,
        "sensor_connected": True,
        "relay_pins": relay_pins,
        "output_states": output_states
    }
    client.publish(TOPIC_STATUS, json.dumps(status_doc), qos=0)

def publish_telemetry(client):
    # Simulated active current load depending on energized towers
    active_count = sum(1 for v in output_states.values() if v == "ON")
    current_ma = round(active_count * 15.6 + random.uniform(0.1, 0.4), 1)
    bus_v = round(11.95 - (active_count * 0.02), 2)
    power_mw = round(bus_v * current_ma, 1)

    telem_doc = {
        "device_id": DEVICE_ID,
        "bus_voltage_v": bus_v,
        "shunt_voltage_mv": round(current_ma * 0.1, 2),
        "current_ma": current_ma,
        "power_mw": power_mw,
        "sensor_status": "OK",
        "timestamp": int(time.time() * 1000)
    }
    client.publish(TOPIC_TELEMETRY, json.dumps(telem_doc), qos=0)

def main():
    print("=" * 60)
    print("      GRIDTWIN — ESP32 HARDWARE CONTROLLER SIMULATOR")
    print("=" * 60)
    print(f"Connecting to {MQTT_BROKER}:{MQTT_PORT} as {DEVICE_ID}...")

    client = mqtt.Client(client_id=f"{DEVICE_ID}-sim-{random.randint(1000, 9999)}")
    client.will_set(TOPIC_LWT, json.dumps({"status": "offline"}), qos=1, retain=True)
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    except Exception as e:
        print(f"[ERROR] Could not connect to MQTT broker: {e}")
        return

    client.loop_start()

    try:
        while True:
            time.sleep(3)
            publish_status(client)
            publish_telemetry(client)
    except KeyboardInterrupt:
        print("\nShutting down simulator...")
        client.publish(TOPIC_LWT, json.dumps({"status": "offline"}), qos=1, retain=True)
        client.loop_stop()
        client.disconnect()
        print("Simulator disconnected.")

if __name__ == "__main__":
    main()

