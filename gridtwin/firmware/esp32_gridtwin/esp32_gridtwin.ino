/**
 * ═══════════════════════════════════════════════════════════════════════
 * GRIDTWIN - ESP32 SMART GRID PHYSICAL DIGITAL TWIN FIRMWARE
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Hardware Architecture:
 * - ESP32 DevKit V1 (30-pin or 38-pin)
 * - 8-Channel 5V Optoisolated Relay Board (Active-LOW, JD-VCC jumper)
 * - INA219 I2C High-Side DC Voltage & Current Sensor (Address 0x40)
 * - 5x Transmission Tower Physical LEDs (T1, T2, T3, T4, T5)
 * 
 * Pinout Assignment:
 * - Tower 1 (T1) -> GPIO 13 -> Relay IN1
 * - Tower 2 (T2) -> GPIO 14 -> Relay IN2
 * - Tower 3 (T3) -> GPIO 25 -> Relay IN3 (Fault & Isolation target)
 * - Tower 4 (T4) -> GPIO 26 -> Relay IN4
 * - Tower 5 (T5) -> GPIO 27 -> Relay IN5
 * - Channel 6    -> GPIO 32 -> Relay IN6 (Reserved Front Bypass)
 * - INA219 SDA   -> GPIO 21
 * - INA219 SCL   -> GPIO 22
 * 
 * Required Libraries (Install via Arduino Library Manager):
 * 1. "PubSubClient" by Nick O'Leary
 * 2. "ArduinoJson" by Benoit Blanchon (Version 6.x recommended)
 * 3. "Adafruit INA219" by Adafruit
 * ═══════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// ─────────────────────────────────────────────────────────────────────
// 1. NETWORK & MQTT CONFIGURATION (UPDATE THESE FOR YOUR NETWORK)
// ─────────────────────────────────────────────────────────────────────
const char* WIFI_SSID         = "YOUR_WIFI_SSID";         // Replace with your WiFi SSID
const char* WIFI_PASSWORD     = "YOUR_WIFI_PASSWORD";     // Replace with your WiFi password

// MQTT Broker (IP address of computer running backend or public broker)
const char* MQTT_BROKER       = "192.168.1.100";          // IP of laptop / server running Mosquitto
const int   MQTT_PORT         = 1883;
const char* MQTT_USERNAME     = "gridtwin";
const char* MQTT_PASSWORD_STR = "gridtwin_mqtt_secret";

// Device Identification
const char* DEVICE_ID         = "esp32-gridtwin-001";
const char* FIRMWARE_VERSION  = "2.0.0-hackathon";
const char* SCHEMA_VERSION    = "1.0";

// ─────────────────────────────────────────────────────────────────────
// 2. GPIO PIN ASSIGNMENTS & RELAY LOGIC
// ─────────────────────────────────────────────────────────────────────
#define OUTPUT_T1_PIN  13 // Relay IN1 -> Tower 1 LED
#define OUTPUT_T2_PIN  14 // Relay IN2 -> Tower 2 LED
#define OUTPUT_T3_PIN  25 // Relay IN3 -> Tower 3 LED (Isolation target)
#define OUTPUT_T4_PIN  26 // Relay IN4 -> Tower 4 LED
#define OUTPUT_T5_PIN  27 // Relay IN5 -> Tower 5 LED
#define RELAY_6_PIN    32 // Relay IN6 -> Reserved Front Bypass Path

#define INA219_SDA_PIN 21
#define INA219_SCL_PIN 22

#define NUM_OUTPUTS 5

// Relay Logic: Most 8-channel optoisolated modules are Active-LOW
const bool RELAY_ACTIVE_LOW = true;
#define RELAY_STATE_ON  (RELAY_ACTIVE_LOW ? LOW : HIGH)
#define RELAY_STATE_OFF (RELAY_ACTIVE_LOW ? HIGH : LOW)

// Timing Constants (milliseconds)
const unsigned long HEARTBEAT_INTERVAL_MS      = 10000; // 10s
const unsigned long SENSOR_READ_INTERVAL_MS     = 1000;  // 1s
const unsigned long MQTT_RECONNECT_INTERVAL_MS  = 5000;  // 5s
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 10000;  // 10s
const unsigned long COMMAND_TIMEOUT_MS         = 15000;  // 15s

// ─────────────────────────────────────────────────────────────────────
// 3. GLOBAL OBJECTS & STATE TRACKING
// ─────────────────────────────────────────────────────────────────────
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
Adafruit_INA219 ina219;
bool ina219Connected = false;

struct OutputChannel {
  const char* output_id;
  int gpio_pin;
  bool current_state; // true = ON (energized), false = OFF (isolated/de-energized)
  String last_command_id;
  unsigned long last_command_time;
};

OutputChannel outputs[NUM_OUTPUTS] = {
  {"T1", OUTPUT_T1_PIN, false, "", 0},
  {"T2", OUTPUT_T2_PIN, false, "", 0},
  {"T3", OUTPUT_T3_PIN, false, "", 0},
  {"T4", OUTPUT_T4_PIN, false, "", 0},
  {"T5", OUTPUT_T5_PIN, false, "", 0},
};

unsigned long lastHeartbeat      = 0;
unsigned long lastSensorRead     = 0;
unsigned long lastWifiReconnect  = 0;
unsigned long lastMqttReconnect  = 0;

// MQTT Topic Strings
char topicStatus[96];
char topicTelemetry[96];
char topicCommands[96];
char topicAck[96];
char topicAvailability[96];

// ─────────────────────────────────────────────────────────────────────
// 4. FUNCTION DECLARATIONS
// ─────────────────────────────────────────────────────────────────────
void setupOutputs();
void setupIna219();
void setupWifi();
void setupMqtt();
void buildTopics();
void reconnectMqtt();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void handleCommand(JsonDocument& doc);
void setRelayHardware(int idx, bool targetState);
int findOutputIndex(const char* output_id);
void publishHeartbeat();
void publishTelemetry();
void publishAvailability(const char* status);
void publishAck(const char* command_id, const char* output_id, 
                bool success, const char* reported_state, const char* error_reason);

// ─────────────────────────────────────────────────────────────────────
// 5. SETUP
// ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n╔══════════════════════════════════════════════════════╗");
  Serial.println("║         GRIDTWIN ESP32 HARDWARE INTEGRATION          ║");
  Serial.println("║          Firmware v2.0.0 (Arduino IDE / PIO)         ║");
  Serial.println("║       Low-Voltage Educational Laboratory Model       ║");
  Serial.println("╚══════════════════════════════════════════════════════╝");
  Serial.printf("[INIT] Device ID: %s\n", DEVICE_ID);
  Serial.printf("[INIT] Relay Logic: %s\n", RELAY_ACTIVE_LOW ? "Active-LOW (JD-VCC Standard)" : "Active-HIGH");

  buildTopics();
  setupOutputs();
  setupIna219();
  setupWifi();
  setupMqtt();
}

// ─────────────────────────────────────────────────────────────────────
// 6. MAIN LOOP
// ─────────────────────────────────────────────────────────────────────
void loop() {
  // 1. Check WiFi Connection
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWifiReconnect > WIFI_RECONNECT_INTERVAL_MS) {
      lastWifiReconnect = millis();
      Serial.println("[WiFi] Reconnecting...");
      WiFi.reconnect();
    }
    return;
  }

  // 2. Check MQTT Connection
  if (!mqttClient.connected()) {
    if (millis() - lastMqttReconnect > MQTT_RECONNECT_INTERVAL_MS) {
      lastMqttReconnect = millis();
      reconnectMqtt();
    }
  } else {
    mqttClient.loop();
  }

  // 3. Periodic Current & Voltage Sensing (INA219 every 1s)
  if (millis() - lastSensorRead > SENSOR_READ_INTERVAL_MS) {
    lastSensorRead = millis();
    publishTelemetry();
  }

  // 4. Periodic Heartbeat / State Snapshot (Every 10s)
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = millis();
    publishHeartbeat();
  }

  // 5. Clean up old command timeouts
  unsigned long now = millis();
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    if (outputs[i].last_command_time > 0 && (now - outputs[i].last_command_time) > COMMAND_TIMEOUT_MS) {
      outputs[i].last_command_time = 0;
      outputs[i].last_command_id = "";
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// 7. GPIO OUTPUT SETUP
// ─────────────────────────────────────────────────────────────────────
void setupOutputs() {
  Serial.println("[GPIO] Initializing Relay Control Pins to SAFE OFF state...");
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    pinMode(outputs[i].gpio_pin, OUTPUT);
    digitalWrite(outputs[i].gpio_pin, RELAY_STATE_OFF); // Safe boot state (Relay OFF)
    outputs[i].current_state = false;
    Serial.printf("[GPIO] Tower %s -> GPIO %d [OFF / DE-ENERGIZED]\n", 
                  outputs[i].output_id, outputs[i].gpio_pin);
  }

  pinMode(RELAY_6_PIN, OUTPUT);
  digitalWrite(RELAY_6_PIN, RELAY_STATE_OFF);
  Serial.printf("[GPIO] Relay Ch 6 (Reserved) -> GPIO %d [OFF / DE-ENERGIZED]\n", RELAY_6_PIN);
}

// ─────────────────────────────────────────────────────────────────────
// 8. INA219 CURRENT SENSOR SETUP
// ─────────────────────────────────────────────────────────────────────
void setupIna219() {
  Serial.printf("[INA219] Initializing I2C bus on SDA=%d, SCL=%d...\n", INA219_SDA_PIN, INA219_SCL_PIN);
  Wire.begin(INA219_SDA_PIN, INA219_SCL_PIN);

  if (ina219.begin(&Wire)) {
    ina219Connected = true;
    Serial.println("[INA219] Sensor detected and calibrated successfully (32V, 2A max range)!");
  } else {
    ina219Connected = false;
    Serial.println("[INA219] WARNING: INA219 sensor not found on I2C address 0x40.");
    Serial.println("[INA219] Firmware will continue; telemetry will report DISCONNECTED.");
  }
}

// ─────────────────────────────────────────────────────────────────────
// 9. TOPIC BUILDER
// ─────────────────────────────────────────────────────────────────────
void buildTopics() {
  snprintf(topicStatus, sizeof(topicStatus), "gridtwin/devices/%s/status", DEVICE_ID);
  snprintf(topicTelemetry, sizeof(topicTelemetry), "gridtwin/devices/%s/telemetry", DEVICE_ID);
  snprintf(topicCommands, sizeof(topicCommands), "gridtwin/devices/%s/commands", DEVICE_ID);
  snprintf(topicAck, sizeof(topicAck), "gridtwin/devices/%s/ack", DEVICE_ID);
  snprintf(topicAvailability, sizeof(topicAvailability), "gridtwin/devices/%s/availability", DEVICE_ID);
}

// ─────────────────────────────────────────────────────────────────────
// 10. WIFI & MQTT CONNECTION
// ─────────────────────────────────────────────────────────────────────
void setupWifi() {
  Serial.printf("[WiFi] Connecting to SSID: '%s'...", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s, RSSI: %d dBm\n", 
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n[WiFi] Initial connection failed. Will retry periodically.");
  }
}

void setupMqtt() {
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(1536);
  mqttClient.setKeepAlive(30);
}

void reconnectMqtt() {
  Serial.printf("[MQTT] Connecting to broker %s:%d as '%s'...\n", MQTT_BROKER, MQTT_PORT, DEVICE_ID);

  char lwtPayload[160];
  snprintf(lwtPayload, sizeof(lwtPayload),
           "{\"status\":\"offline\",\"device_id\":\"%s\",\"reason\":\"connection_lost\"}", DEVICE_ID);

  bool connected = mqttClient.connect(
    DEVICE_ID,
    MQTT_USERNAME,
    MQTT_PASSWORD_STR,
    topicAvailability,
    1,    // QoS
    true, // Retain
    lwtPayload
  );

  if (connected) {
    Serial.println("[MQTT] Connected to broker successfully!");
    mqttClient.subscribe(topicCommands, 1);
    Serial.printf("[MQTT] Subscribed to commands: %s\n", topicCommands);

    publishAvailability("online");
    publishHeartbeat();
    publishTelemetry();
  } else {
    Serial.printf("[MQTT] Connection failed, rc=%d. Will retry.\n", mqttClient.state());
  }
}

// ─────────────────────────────────────────────────────────────────────
// 11. MQTT MESSAGE CALLBACK & COMMAND EXECUTION
// ─────────────────────────────────────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.printf("[MQTT] JSON parse error: %s\n", error.c_str());
    return;
  }

  if (String(topic) == String(topicCommands)) {
    handleCommand(doc);
  }
}

void setRelayHardware(int idx, bool targetState) {
  if (idx < 0 || idx >= NUM_OUTPUTS) return;

  int pin = outputs[idx].gpio_pin;
  int pinValue = targetState ? RELAY_STATE_ON : RELAY_STATE_OFF;
  digitalWrite(pin, pinValue);
  outputs[idx].current_state = targetState;

  Serial.printf("[HARDWARE] %s (GPIO %d) -> %s [Pin Level: %s]\n",
                outputs[idx].output_id,
                pin,
                targetState ? "ON (Energized)" : "OFF (De-energized)",
                pinValue == LOW ? "LOW" : "HIGH");
}

void handleCommand(JsonDocument& doc) {
  const char* command_id     = doc["command_id"];
  const char* device_id      = doc["device_id"];
  const char* output_id      = doc["output_id"];
  const char* requested_state = doc["requested_state"];
  const char* action         = doc["action"]; // "ISOLATE", "RESTORE", "ALL_ON", "ALL_OFF"

  if (!command_id) {
    Serial.println("[CMD] Rejected: missing command_id");
    return;
  }

  if (device_id && strlen(device_id) > 0 && String(device_id) != String(DEVICE_ID)) {
    Serial.printf("[CMD] Ignored: addressed to '%s', this is '%s'\n", device_id, DEVICE_ID);
    return;
  }

  Serial.printf("[CMD] Executing ID: %s, Action: %s, Target: %s, State: %s\n",
                command_id, action ? action : "SET_STATE",
                output_id ? output_id : "ALL",
                requested_state ? requested_state : "N/A");

  // Case 1: ALL Towers (ALL_ON / ALL_OFF)
  if ((output_id && String(output_id) == "ALL") || (action && (String(action) == "ALL_ON" || String(action) == "ALL_OFF"))) {
    bool allTarget = true;
    if (requested_state && String(requested_state) == "OFF") allTarget = false;
    if (action && String(action) == "ALL_OFF") allTarget = false;

    for (int i = 0; i < NUM_OUTPUTS; i++) {
      setRelayHardware(i, allTarget);
      outputs[i].last_command_id = String(command_id);
      outputs[i].last_command_time = millis();
    }

    publishAck(command_id, "ALL", true, allTarget ? "ON" : "OFF", NULL);
    publishHeartbeat();
    return;
  }

  // Case 2: Tower Isolation (e.g. Isolate Tower 3 during fault)
  if (action && String(action) == "ISOLATE") {
    if (!output_id) {
      publishAck(command_id, "UNKNOWN", false, "UNKNOWN", "Missing output_id for ISOLATE");
      return;
    }
    int idx = findOutputIndex(output_id);
    if (idx < 0) {
      publishAck(command_id, output_id, false, "UNKNOWN", "Invalid tower output_id");
      return;
    }

    setRelayHardware(idx, false); // De-energize isolated tower relay
    outputs[idx].last_command_id = String(command_id);
    outputs[idx].last_command_time = millis();

    publishAck(command_id, output_id, true, "ISOLATED", NULL);
    publishHeartbeat();
    return;
  }

  // Case 3: Tower Restoration
  if (action && String(action) == "RESTORE") {
    if (!output_id) {
      publishAck(command_id, "UNKNOWN", false, "UNKNOWN", "Missing output_id for RESTORE");
      return;
    }
    int idx = findOutputIndex(output_id);
    if (idx < 0) {
      publishAck(command_id, output_id, false, "UNKNOWN", "Invalid tower output_id");
      return;
    }

    setRelayHardware(idx, true); // Re-energize tower relay
    outputs[idx].last_command_id = String(command_id);
    outputs[idx].last_command_time = millis();

    publishAck(command_id, output_id, true, "ON", NULL);
    publishHeartbeat();
    return;
  }

  // Case 4: Individual Tower ON / OFF
  if (!output_id || !requested_state) {
    publishAck(command_id, output_id ? output_id : "UNKNOWN", false, "UNKNOWN", "Missing output_id or requested_state");
    return;
  }

  int idx = findOutputIndex(output_id);
  if (idx < 0) {
    publishAck(command_id, output_id, false, "UNKNOWN", "Output not recognized");
    return;
  }

  bool target_state = (String(requested_state) == "ON");
  setRelayHardware(idx, target_state);
  outputs[idx].last_command_id = String(command_id);
  outputs[idx].last_command_time = millis();

  publishAck(command_id, output_id, true, target_state ? "ON" : "OFF", NULL);
  publishHeartbeat();
}

int findOutputIndex(const char* output_id) {
  if (!output_id) return -1;
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    if (String(outputs[i].output_id) == String(output_id)) return i;
  }
  return -1;
}

// ─────────────────────────────────────────────────────────────────────
// 12. TELEMETRY & ACKNOWLEDGEMENT PUBLISHERS
// ─────────────────────────────────────────────────────────────────────
void publishAck(const char* command_id, const char* output_id, 
                bool success, const char* reported_state, const char* error_reason) {
  StaticJsonDocument<512> doc;
  doc["schema_version"] = SCHEMA_VERSION;
  doc["command_id"]     = command_id;
  doc["device_id"]      = DEVICE_ID;
  doc["output_id"]      = output_id;
  doc["success"]        = success;
  doc["reported_state"] = reported_state;
  doc["timestamp"]      = millis();

  if (error_reason) doc["error_reason"] = error_reason;

  JsonObject states = doc.createNestedObject("output_states");
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    states[outputs[i].output_id] = outputs[i].current_state ? "ON" : "OFF";
  }

  char buffer[512];
  serializeJson(doc, buffer, sizeof(buffer));
  mqttClient.publish(topicAck, buffer, false);
}

void publishAvailability(const char* status) {
  StaticJsonDocument<256> doc;
  doc["status"]           = status;
  doc["device_id"]        = DEVICE_ID;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["ip_address"]       = WiFi.localIP().toString();
  doc["uptime_ms"]        = millis();
  doc["wifi_rssi"]        = WiFi.RSSI();

  char buffer[256];
  serializeJson(doc, buffer, sizeof(buffer));
  mqttClient.publish(topicAvailability, buffer, true); // Retained
}

void publishHeartbeat() {
  StaticJsonDocument<512> doc;
  doc["device_id"]        = DEVICE_ID;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["status"]           = "online";
  doc["uptime_ms"]        = millis();
  doc["wifi_rssi"]        = WiFi.RSSI();
  doc["free_heap"]        = ESP.getFreeHeap();
  doc["sensor_connected"] = ina219Connected;

  JsonObject states = doc.createNestedObject("output_states");
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    states[outputs[i].output_id] = outputs[i].current_state ? "ON" : "OFF";
  }

  char buffer[512];
  serializeJson(doc, buffer, sizeof(buffer));
  mqttClient.publish(topicStatus, buffer, false);
}

void publishTelemetry() {
  StaticJsonDocument<512> doc;
  doc["schema_version"] = SCHEMA_VERSION;
  doc["device_id"]      = DEVICE_ID;
  doc["timestamp"]      = millis();

  if (ina219Connected) {
    float busVoltage_V   = ina219.getBusVoltage_V();
    float shuntVoltage_mV = ina219.getShuntVoltage_mV();
    float current_mA     = ina219.getCurrent_mA();
    float power_mW       = ina219.getPower_mW();

    if (current_mA < 0) current_mA = 0.0;
    if (power_mW < 0) power_mW = 0.0;

    doc["sensor_status"]   = "OK";
    doc["bus_voltage_v"]   = round(busVoltage_V * 100) / 100.0;
    doc["shunt_voltage_mv"] = round(shuntVoltage_mV * 10) / 10.0;
    doc["current_ma"]      = round(current_mA * 10) / 10.0;
    doc["power_mw"]        = round(power_mW * 10) / 10.0;
  } else {
    doc["sensor_status"]   = "DISCONNECTED";
    doc["bus_voltage_v"]   = 0.0;
    doc["shunt_voltage_mv"] = 0.0;
    doc["current_ma"]      = 0.0;
    doc["power_mw"]        = 0.0;
  }

  char buffer[512];
  serializeJson(doc, buffer, sizeof(buffer));
  mqttClient.publish(topicTelemetry, buffer, false);
}
