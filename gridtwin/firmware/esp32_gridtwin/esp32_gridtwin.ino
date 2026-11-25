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
 * Connection Modes:
 * 1. USB DIRECT (Web Serial API): Plug USB cable into computer, click "Connect USB" in Chrome.
 * 2. CLOUD WI-FI (MQTT): Connects to broker.hivemq.com or your local MQTT broker.
 * ═══════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// ─────────────────────────────────────────────────────────────────────
// 1. NETWORK & MQTT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────
// Enter your 2.4 GHz Wi-Fi SSID and Password here if using Wi-Fi mode.
// (If using direct USB Serial connection to Chrome, Wi-Fi is optional!)
const char* WIFI_SSID         = "YOUR_WIFI_SSID";         
const char* WIFI_PASSWORD     = "YOUR_WIFI_PASSWORD";     

// Public HiveMQ Cloud Broker (Accessible worldwide without port-forwarding)
const char* MQTT_BROKER       = "broker.hivemq.com";      
const int   MQTT_PORT         = 1883;
const char* MQTT_USERNAME     = "";
const char* MQTT_PASSWORD_STR = "";

// Device Identification
const char* DEVICE_ID         = "esp32-gridtwin-001";
const char* FIRMWARE_VERSION  = "2.5.0-usb-wifi-sync";
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

// Relay Logic: Most 8-channel optoisolated modules are Active-LOW (JD-VCC jumper)
bool RELAY_ACTIVE_LOW = true;
#define RELAY_STATE_ON  (RELAY_ACTIVE_LOW ? LOW : HIGH)
#define RELAY_STATE_OFF (RELAY_ACTIVE_LOW ? HIGH : LOW)

// Timing Constants (milliseconds)
const unsigned long HEARTBEAT_INTERVAL_MS      = 10000; // 10s
const unsigned long SENSOR_READ_INTERVAL_MS     = 1000;  // 1s
const unsigned long SERIAL_REPORT_INTERVAL_MS   = 1000;  // 1s USB Serial Telemetry
const unsigned long MQTT_RECONNECT_INTERVAL_MS  = 6000;  // 6s
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 15000;  // 15s

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
};

OutputChannel outputs[NUM_OUTPUTS] = {
  {"T1", OUTPUT_T1_PIN, true},
  {"T2", OUTPUT_T2_PIN, true},
  {"T3", OUTPUT_T3_PIN, true},
  {"T4", OUTPUT_T4_PIN, true},
  {"T5", OUTPUT_T5_PIN, true},
};

unsigned long lastHeartbeat      = 0;
unsigned long lastSensorRead     = 0;
unsigned long lastSerialReport   = 0;
unsigned long lastWifiReconnect  = 0;
unsigned long lastMqttReconnect  = 0;

char topicStatus[96];
char topicTelemetry[96];
char topicCommands[96];
char topicAck[96];
char topicAvailability[96];

// Serial input buffer
String serialBuffer = "";

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
void handleSerialChar(char ch);
void handleSerialLine(String line);
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
  delay(300);

  Serial.println("\n╔══════════════════════════════════════════════════════╗");
  Serial.println("║         GRIDTWIN ESP32 HARDWARE INTEGRATION          ║");
  Serial.println("║      Dual USB Web Serial + Cloud MQTT Controller     ║");
  Serial.println("╚══════════════════════════════════════════════════════╝");
  Serial.printf("[INIT] Device ID: %s\n", DEVICE_ID);

  buildTopics();
  setupOutputs();
  setupIna219();

  // Try Wi-Fi if configured
  if (String(WIFI_SSID) != "YOUR_WIFI_SSID" && strlen(WIFI_SSID) > 0) {
    setupWifi();
    setupMqtt();
  } else {
    Serial.println("[WiFi] No Wi-Fi SSID configured. Running in USB Direct Serial Mode.");
    Serial.println("[USB] Ready! Connect directly in Chrome via Web Serial.");
  }
}

// ─────────────────────────────────────────────────────────────────────
// 6. MAIN LOOP (NON-BLOCKING: USB SERIAL + WIFI)
// ─────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Process Incoming USB Serial Commands (Instant Response)
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\n' || ch == '\r') {
      if (serialBuffer.length() > 0) {
        handleSerialLine(serialBuffer);
        serialBuffer = "";
      }
    } else {
      serialBuffer += ch;
      // Single-character commands for fast control
      if (serialBuffer.length() == 1 && (ch >= '0' && ch <= '9' || ch == 'i' || ch == 't')) {
        handleSerialChar(ch);
        serialBuffer = "";
      }
    }
  }

  // 2. Wi-Fi & MQTT (if Wi-Fi credentials are set)
  if (String(WIFI_SSID) != "YOUR_WIFI_SSID" && strlen(WIFI_SSID) > 0) {
    if (WiFi.status() != WL_CONNECTED) {
      if (now - lastWifiReconnect > WIFI_RECONNECT_INTERVAL_MS) {
        lastWifiReconnect = now;
        WiFi.reconnect();
      }
    } else {
      if (!mqttClient.connected()) {
        if (now - lastMqttReconnect > MQTT_RECONNECT_INTERVAL_MS) {
          lastMqttReconnect = now;
          reconnectMqtt();
        }
      } else {
        mqttClient.loop();
      }
    }
  }

  // 3. Periodic USB Serial JSON Telemetry Report (Every 1s for Web Serial in Chrome)
  if (now - lastSerialReport >= SERIAL_REPORT_INTERVAL_MS) {
    lastSerialReport = now;
    
    float v = 5.00;
    float c = 145.2;
    if (ina219Connected) {
      v = ina219.getBusVoltage_V();
      c = ina219.getCurrent_mA();
      if (c < 0) c = 0.0;
    }

    // Single-line JSON emitted to USB Serial
    Serial.printf("{\"status\":\"ONLINE\",\"device_id\":\"%s\",\"bus_voltage_v\":%.2f,\"current_ma\":%.1f,\"output_states\":{\"T1\":\"%s\",\"T2\":\"%s\",\"T3\":\"%s\",\"T4\":\"%s\",\"T5\":\"%s\"}}\n",
      DEVICE_ID, v, c,
      outputs[0].current_state ? "ON" : "OFF",
      outputs[1].current_state ? "ON" : "OFF",
      outputs[2].current_state ? "ON" : "OFF",
      outputs[3].current_state ? "ON" : "OFF",
      outputs[4].current_state ? "ON" : "OFF"
    );
  }

  // 4. Periodic MQTT Telemetry (if connected)
  if (mqttClient.connected()) {
    if (now - lastSensorRead > SENSOR_READ_INTERVAL_MS) {
      lastSensorRead = now;
      publishTelemetry();
    }
    if (now - lastHeartbeat > HEARTBEAT_INTERVAL_MS) {
      lastHeartbeat = now;
      publishHeartbeat();
    }
  }

  delay(2);
}

// ─────────────────────────────────────────────────────────────────────
// 7. GPIO OUTPUT SETUP
// ─────────────────────────────────────────────────────────────────────
void setupOutputs() {
  Serial.println("[GPIO] Initializing 5-Tower Relay Pins...");
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    pinMode(outputs[i].gpio_pin, OUTPUT);
    digitalWrite(outputs[i].gpio_pin, RELAY_STATE_ON); // Initial State: All Towers ON
    outputs[i].current_state = true;
    Serial.printf("[GPIO] Tower %s -> GPIO %d [ON]\n", outputs[i].output_id, outputs[i].gpio_pin);
  }

  pinMode(RELAY_6_PIN, OUTPUT);
  digitalWrite(RELAY_6_PIN, RELAY_STATE_OFF);
  Serial.printf("[GPIO] Bypass Ch 6 -> GPIO %d [STANDBY]\n", RELAY_6_PIN);
}

// ─────────────────────────────────────────────────────────────────────
// 8. INA219 SENSOR SETUP
// ─────────────────────────────────────────────────────────────────────
void setupIna219() {
  Wire.begin(INA219_SDA_PIN, INA219_SCL_PIN);
  if (ina219.begin(&Wire)) {
    ina219Connected = true;
    Serial.println("[INA219] High-side sensor detected (I2C 0x40).");
  } else {
    ina219Connected = false;
    Serial.println("[INA219] Sensor not detected. Using simulated telemetry fallback.");
  }
}

// ─────────────────────────────────────────────────────────────────────
// 9. SERIAL COMMAND DISPATCHER (FOR WEB SERIAL IN CHROME)
// ─────────────────────────────────────────────────────────────────────
void handleSerialChar(char ch) {
  if (ch >= '1' && ch <= '5') {
    int idx = ch - '1';
    setRelayHardware(idx, !outputs[idx].current_state);
  } else if (ch == '0') {
    Serial.println("[CMD] De-energizing ALL Towers (ALL_OFF)...");
    for (int i = 0; i < NUM_OUTPUTS; i++) setRelayHardware(i, false);
  } else if (ch == '9') {
    Serial.println("[CMD] Energizing ALL Towers (ALL_ON)...");
    for (int i = 0; i < NUM_OUTPUTS; i++) setRelayHardware(i, true);
  } else if (ch == 'i' || ch == 'I') {
    RELAY_ACTIVE_LOW = !RELAY_ACTIVE_LOW;
    Serial.printf("[CONFIG] Inverted relay logic: %s\n", RELAY_ACTIVE_LOW ? "Active-LOW" : "Active-HIGH");
    for (int i = 0; i < NUM_OUTPUTS; i++) {
      int pinVal = outputs[i].current_state ? RELAY_STATE_ON : RELAY_STATE_OFF;
      digitalWrite(outputs[i].gpio_pin, pinVal);
    }
  } else if (ch == 't' || ch == 'T') {
    Serial.println("[TEST] Running sequential test...");
    for (int i = 0; i < NUM_OUTPUTS; i++) { setRelayHardware(i, false); delay(250); }
    for (int i = 0; i < NUM_OUTPUTS; i++) { setRelayHardware(i, true); delay(250); }
  }
}

void handleSerialLine(String line) {
  line.trim();
  if (line.startsWith("{")) {
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, line);
    if (!err) {
      handleCommand(doc);
    }
  }
}

void setRelayHardware(int idx, bool targetState) {
  if (idx < 0 || idx >= NUM_OUTPUTS) return;
  int pin = outputs[idx].gpio_pin;
  int pinVal = targetState ? RELAY_STATE_ON : RELAY_STATE_OFF;
  digitalWrite(pin, pinVal);
  outputs[idx].current_state = targetState;

  Serial.printf("[HARDWARE] %s (GPIO %d) -> %s\n",
    outputs[idx].output_id, pin, targetState ? "ON" : "OFF");

  if (mqttClient.connected()) {
    publishHeartbeat();
  }
}

// ─────────────────────────────────────────────────────────────────────
// 10. MQTT COMMAND PARSER
// ─────────────────────────────────────────────────────────────────────
void handleCommand(JsonDocument& doc) {
  const char* command_id     = doc["command_id"];
  const char* output_id      = doc["output_id"];
  const char* requested_state = doc["requested_state"];
  const char* action         = doc["action"];

  if (action && String(action) == "ALL_ON") {
    for (int i = 0; i < NUM_OUTPUTS; i++) setRelayHardware(i, true);
    if (command_id) publishAck(command_id, "ALL", true, "ON", NULL);
    return;
  }
  if (action && String(action) == "ALL_OFF") {
    for (int i = 0; i < NUM_OUTPUTS; i++) setRelayHardware(i, false);
    if (command_id) publishAck(command_id, "ALL", true, "OFF", NULL);
    return;
  }
  if (action && String(action) == "ISOLATE" && output_id) {
    int idx = findOutputIndex(output_id);
    if (idx >= 0) {
      setRelayHardware(idx, false);
      if (command_id) publishAck(command_id, output_id, true, "ISOLATED", NULL);
    }
    return;
  }
  if (action && String(action) == "RESTORE" && output_id) {
    int idx = findOutputIndex(output_id);
    if (idx >= 0) {
      setRelayHardware(idx, true);
      if (command_id) publishAck(command_id, output_id, true, "ON", NULL);
    }
    return;
  }
  if (output_id && requested_state) {
    int idx = findOutputIndex(output_id);
    if (idx >= 0) {
      bool target = (String(requested_state) == "ON");
      setRelayHardware(idx, target);
      if (command_id) publishAck(command_id, output_id, true, target ? "ON" : "OFF", NULL);
    }
  }
}

int findOutputIndex(const char* output_id) {
  if (!output_id) return -1;
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    if (String(outputs[i].output_id) == String(output_id)) return i;
  }
  return -1;
}

// ─────────────────────────────────────────────────────────────────────
// 11. WIFI & MQTT ROUTINES
// ─────────────────────────────────────────────────────────────────────
void buildTopics() {
  snprintf(topicStatus, sizeof(topicStatus), "gridtwin/devices/%s/status", DEVICE_ID);
  snprintf(topicTelemetry, sizeof(topicTelemetry), "gridtwin/devices/%s/telemetry", DEVICE_ID);
  snprintf(topicCommands, sizeof(topicCommands), "gridtwin/devices/%s/commands", DEVICE_ID);
  snprintf(topicAck, sizeof(topicAck), "gridtwin/devices/%s/ack", DEVICE_ID);
  snprintf(topicAvailability, sizeof(topicAvailability), "gridtwin/devices/%s/availability", DEVICE_ID);
}

void setupWifi() {
  Serial.printf("[WiFi] Connecting to '%s'...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void setupMqtt() {
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(1536);
  mqttClient.setKeepAlive(30);
}

void reconnectMqtt() {
  Serial.printf("[MQTT] Connecting to %s:%d...\n", MQTT_BROKER, MQTT_PORT);
  if (mqttClient.connect(DEVICE_ID)) {
    Serial.println("[MQTT] Connected!");
    mqttClient.subscribe(topicCommands, 1);
    publishAvailability("online");
    publishHeartbeat();
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (!error && String(topic) == String(topicCommands)) {
    handleCommand(doc);
  }
}

void publishAck(const char* command_id, const char* output_id, 
                bool success, const char* reported_state, const char* error_reason) {
  StaticJsonDocument<512> doc;
  doc["command_id"]     = command_id;
  doc["device_id"]      = DEVICE_ID;
  doc["output_id"]      = output_id;
  doc["success"]        = success;
  doc["reported_state"] = reported_state;
  char buf[512];
  serializeJson(doc, buf, sizeof(buf));
  mqttClient.publish(topicAck, buf, false);
}

void publishAvailability(const char* status) {
  StaticJsonDocument<256> doc;
  doc["status"]    = status;
  doc["device_id"] = DEVICE_ID;
  char buf[256];
  serializeJson(doc, buf, sizeof(buf));
  mqttClient.publish(topicAvailability, buf, true);
}

void publishHeartbeat() {
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["status"]    = "online";
  JsonObject states = doc.createNestedObject("output_states");
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    states[outputs[i].output_id] = outputs[i].current_state ? "ON" : "OFF";
  }
  char buf[512];
  serializeJson(doc, buf, sizeof(buf));
  mqttClient.publish(topicStatus, buf, false);
}

void publishTelemetry() {
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  float v = ina219Connected ? ina219.getBusVoltage_V() : 5.0;
  float c = ina219Connected ? ina219.getCurrent_mA() : 145.2;
  if (c < 0) c = 0.0;
  doc["bus_voltage_v"] = round(v * 100) / 100.0;
  doc["current_ma"]    = round(c * 10) / 10.0;
  char buf[512];
  serializeJson(doc, buf, sizeof(buf));
  mqttClient.publish(topicTelemetry, buf, false);
}
