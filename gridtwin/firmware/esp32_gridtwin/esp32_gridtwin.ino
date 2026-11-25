/**
 * ═══════════════════════════════════════════════════════════════════════
 * GRIDTWIN - ESP32 SMART GRID PHYSICAL DIGITAL TWIN FIRMWARE
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Hardware Architecture & Verified Pinout:
 * - ESP32 DevKit V1 (30-pin or 38-pin)
 * - 8-Channel 5V Optoisolated Relay Board (Active-LOW, JD-VCC jumper)
 * - INA219 I2C High-Side DC Voltage & Current Sensor (Address 0x40)
 * - 5x Transmission Tower Physical LEDs (T1, T2, T3, T4, T5)
 * 
 * Verified Wiring Connections:
 * ─────────────────────────────────────────────────────────────────────
 * 1. ESP32 to Relay Board Inputs:
 *    - GPIO 13 -> Relay IN1 (Tower 1 LED)
 *    - GPIO 14 -> Relay IN2 (Tower 2 LED)
 *    - GPIO 25 -> Relay IN3 (Tower 3 LED - Isolation Target)
 *    - GPIO 26 -> Relay IN4 (Tower 4 LED)
 *    - GPIO 27 -> Relay IN5 (Tower 5 LED)
 *    - GPIO 32 -> Relay IN6 (Reserved Bypass Path)
 * 
 * 2. ESP32 to INA219 I2C Sensor:
 *    - ESP32 3V3 -> INA VCC
 *    - ESP32 GND -> INA GND
 *    - GPIO 21   -> INA SDA
 *    - GPIO 22   -> INA SCL
 * 
 * 3. Power Supply (5V Adapter) & Relay Power Circuit:
 *    - 5V Adapter (+) -> INA219 VIN+
 *    - INA219 VIN-   -> Common rail to ALL Relay COM terminals (1, 2, 3, 4, 5)
 *    - 5V Adapter (+) -> Relay Board VCC (or JD-VCC)
 *    - 5V Adapter (-) -> Relay Board GND
 *    - ⚠️ IMPORTANT COMMON GROUND: Connect ESP32 GND to 5V Adapter (-)
 *      (Ensures control signal return path and accurate INA219 voltage reading)
 * 
 * 4. Relays to Tower LEDs:
 *    - Relay 1 NO -> Resistor -> LED Anode (Long leg) -> LED Cathode (Short leg) -> 5V Adapter (-)
 *    - Relay 2 NO -> Resistor -> LED Anode (Long leg) -> LED Cathode (Short leg) -> 5V Adapter (-)
 *    - Relay 3 NO -> Resistor -> LED Anode (Long leg) -> LED Cathode (Short leg) -> 5V Adapter (-)
 *    - Relay 4 NO -> Resistor -> LED Anode (Long leg) -> LED Cathode (Short leg) -> 5V Adapter (-)
 *    - Relay 5 NO -> Resistor -> LED Anode (Long leg) -> LED Cathode (Short leg) -> 5V Adapter (-)
 *    (Note: On standard LEDs, Long Leg = Anode [+], Short Leg = Cathode [-])
 * 
 * Connection Modes:
 * 1. USB DIRECT (Web Serial API): Plug USB cable into PC, click "Connect USB" in Chrome.
 * 2. CLOUD WI-FI (MQTT): Connects to broker.hivemq.com (Zero-config, global sync).
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
const char* FIRMWARE_VERSION  = "2.6.0-direct-sync";
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
// When true: LOW = Energized (LED ON), HIGH/INPUT = De-energized (LED OFF)
// When false: HIGH = Energized (LED ON), LOW = De-energized (LED OFF)
bool RELAY_ACTIVE_LOW = true;

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
void updateAllPins();
void printHardwareStatus();
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
  Serial.println("║   Deterministic Tower Isolation & INA219 Telemetry   ║");
  Serial.println("╚══════════════════════════════════════════════════════╝");
  Serial.printf("[INIT] Device ID: %s\n", DEVICE_ID);
  Serial.printf("[INIT] Firmware Version: %s\n", FIRMWARE_VERSION);

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
      if (serialBuffer.length() > 256) {
        serialBuffer = ""; // Prevent buffer overflow
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

    // Single-line JSON emitted to USB Serial for the frontend
    Serial.printf("{\"status\":\"ONLINE\",\"device_id\":\"%s\",\"bus_voltage_v\":%.2f,\"current_ma\":%.1f,\"output_states\":{\"T1\":\"%s\",\"T2\":\"%s\",\"T3\":\"%s\",\"T4\":\"%s\",\"T5\":\"%s\"},\"logic\":\"%s\"}\n",
      DEVICE_ID, v, c,
      outputs[0].current_state ? "ON" : "OFF",
      outputs[1].current_state ? "ON" : "OFF",
      outputs[2].current_state ? "ON" : "OFF",
      outputs[3].current_state ? "ON" : "OFF",
      outputs[4].current_state ? "ON" : "OFF",
      RELAY_ACTIVE_LOW ? "ACTIVE_LOW" : "ACTIVE_HIGH"
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
// 7. GPIO OUTPUT SETUP & RELAY DRIVING
// ─────────────────────────────────────────────────────────────────────
void setupOutputs() {
  Serial.println("[GPIO] Initializing 5-Tower Relay Pins...");
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    outputs[i].current_state = true; // All towers energized initially
    setRelayHardware(i, true);
    Serial.printf("[GPIO] Tower %s -> GPIO %d [ON]\n", outputs[i].output_id, outputs[i].gpio_pin);
  }

  pinMode(RELAY_6_PIN, OUTPUT);
  if (RELAY_ACTIVE_LOW) {
    pinMode(RELAY_6_PIN, INPUT);
    digitalWrite(RELAY_6_PIN, HIGH);
  } else {
    digitalWrite(RELAY_6_PIN, LOW);
  }
  Serial.printf("[GPIO] Bypass Ch 6 -> GPIO %d [STANDBY]\n", RELAY_6_PIN);
}

/**
 * Robust Hardware Driving Function:
 * Handles 5V Optocoupled Relay modules driven by 3.3V ESP32 GPIOs.
 * 
 * For Active-LOW:
 * - ON: pinMode OUTPUT, digitalWrite LOW (sinks current to GND -> relay energizes -> LED ON)
 * - OFF: pinMode INPUT, digitalWrite HIGH (high-Z floating mode -> 0mA leakage from 5V -> relay de-energizes -> LED OFF)
 * 
 * For Active-HIGH:
 * - ON: pinMode OUTPUT, digitalWrite HIGH
 * - OFF: pinMode OUTPUT, digitalWrite LOW
 */
void setRelayHardware(int idx, bool targetState) {
  if (idx < 0 || idx >= NUM_OUTPUTS) return;
  int pin = outputs[idx].gpio_pin;

  if (RELAY_ACTIVE_LOW) {
    if (targetState) {
      // Energize: Pull LOW to sink current to GND
      pinMode(pin, OUTPUT);
      digitalWrite(pin, LOW);
    } else {
      // De-energize: Floating INPUT stops any 5V-to-3.3V leakage through optocoupler
      pinMode(pin, INPUT);
      digitalWrite(pin, HIGH);
    }
  } else {
    // Active-HIGH mode
    pinMode(pin, OUTPUT);
    digitalWrite(pin, targetState ? HIGH : LOW);
  }

  outputs[idx].current_state = targetState;

  Serial.printf("[HARDWARE] %s (GPIO %d) -> %s [Relay %s]\n",
    outputs[idx].output_id, pin, targetState ? "ON" : "OFF", targetState ? "ENERGIZED" : "DE-ENERGIZED");

  if (mqttClient.connected()) {
    publishHeartbeat();
  }
}

void updateAllPins() {
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    setRelayHardware(i, outputs[i].current_state);
  }
}

void printHardwareStatus() {
  Serial.println("\n─── [HARDWARE STATUS REPORT] ───");
  Serial.printf("Relay Logic Mode: %s\n", RELAY_ACTIVE_LOW ? "Active-LOW (JD-VCC)" : "Active-HIGH");
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    Serial.printf("  %s (GPIO %d): %s\n", outputs[i].output_id, outputs[i].gpio_pin, outputs[i].current_state ? "ON (Energized)" : "OFF (Isolated)");
  }
  if (ina219Connected) {
    Serial.printf("  INA219: %.2f V, %.1f mA\n", ina219.getBusVoltage_V(), ina219.getCurrent_mA());
  } else {
    Serial.println("  INA219: Not detected (Simulated 5.0V / 145mA)");
  }
  Serial.println("────────────────────────────────\n");
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
void handleSerialLine(String line) {
  line.trim();
  if (line.length() == 0) return;

  // 1. JSON Command Support (from Web Serial or test script)
  if (line.startsWith("{")) {
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, line);
    if (!err) {
      handleCommand(doc);
    }
    return;
  }

  // 2. Direct Explicit Text Commands (Unambiguous, Case-Insensitive)
  String upper = line;
  upper.toUpperCase();

  // Tower 1
  if (upper == "T1:OFF" || upper == "T1:0" || upper == "ISOLATE:T1" || upper == "ISOLATE T1" || upper == "T1 OFF") {
    setRelayHardware(0, false);
  } else if (upper == "T1:ON" || upper == "T1:1" || upper == "RESTORE:T1" || upper == "RESTORE T1" || upper == "T1 ON") {
    setRelayHardware(0, true);

  // Tower 2
  } else if (upper == "T2:OFF" || upper == "T2:0" || upper == "ISOLATE:T2" || upper == "ISOLATE T2" || upper == "T2 OFF") {
    setRelayHardware(1, false);
  } else if (upper == "T2:ON" || upper == "T2:1" || upper == "RESTORE:T2" || upper == "RESTORE T2" || upper == "T2 ON") {
    setRelayHardware(1, true);

  // Tower 3
  } else if (upper == "T3:OFF" || upper == "T3:0" || upper == "ISOLATE:T3" || upper == "ISOLATE T3" || upper == "T3 OFF") {
    setRelayHardware(2, false);
  } else if (upper == "T3:ON" || upper == "T3:1" || upper == "RESTORE:T3" || upper == "RESTORE T3" || upper == "T3 ON") {
    setRelayHardware(2, true);

  // Tower 4
  } else if (upper == "T4:OFF" || upper == "T4:0" || upper == "ISOLATE:T4" || upper == "ISOLATE T4" || upper == "T4 OFF") {
    setRelayHardware(3, false);
  } else if (upper == "T4:ON" || upper == "T4:1" || upper == "RESTORE:T4" || upper == "RESTORE T4" || upper == "T4 ON") {
    setRelayHardware(3, true);

  // Tower 5
  } else if (upper == "T5:OFF" || upper == "T5:0" || upper == "ISOLATE:T5" || upper == "ISOLATE T5" || upper == "T5 OFF") {
    setRelayHardware(4, false);
  } else if (upper == "T5:ON" || upper == "T5:1" || upper == "RESTORE:T5" || upper == "RESTORE T5" || upper == "T5 ON") {
    setRelayHardware(4, true);

  // Batch All Commands
  } else if (upper == "ALL:OFF" || upper == "ALL:0" || upper == "ALL OFF") {
    Serial.println("[CMD] De-energizing ALL Towers (ALL_OFF)...");
    for (int i = 0; i < NUM_OUTPUTS; i++) setRelayHardware(i, false);
  } else if (upper == "ALL:ON" || upper == "ALL:1" || upper == "ALL ON") {
    Serial.println("[CMD] Energizing ALL Towers (ALL_ON)...");
    for (int i = 0; i < NUM_OUTPUTS; i++) setRelayHardware(i, true);

  // Invert Relay Polarity
  } else if (upper == "INVERT") {
    RELAY_ACTIVE_LOW = !RELAY_ACTIVE_LOW;
    Serial.printf("[CONFIG] Inverted relay logic: %s\n", RELAY_ACTIVE_LOW ? "Active-LOW (JD-VCC)" : "Active-HIGH");
    updateAllPins();

  // Status Report
  } else if (upper == "STATUS" || upper == "INFO") {
    printHardwareStatus();

  // Single-character shorthand fallback
  } else if (upper.length() == 1) {
    handleSerialChar(upper.charAt(0));
  }
}

void handleSerialChar(char ch) {
  if (ch >= '1' && ch <= '5') {
    int idx = ch - '1';
    // Toggle specified tower
    setRelayHardware(idx, !outputs[idx].current_state);
  } else if (ch == '0') {
    for (int i = 0; i < NUM_OUTPUTS; i++) setRelayHardware(i, false);
  } else if (ch == '9') {
    for (int i = 0; i < NUM_OUTPUTS; i++) setRelayHardware(i, true);
  } else if (ch == 'i' || ch == 'I') {
    RELAY_ACTIVE_LOW = !RELAY_ACTIVE_LOW;
    Serial.printf("[CONFIG] Inverted relay logic: %s\n", RELAY_ACTIVE_LOW ? "Active-LOW" : "Active-HIGH");
    updateAllPins();
  } else if (ch == 't' || ch == 'T') {
    Serial.println("[TEST] Running sequential test cycle...");
    for (int i = 0; i < NUM_OUTPUTS; i++) { setRelayHardware(i, false); delay(250); }
    for (int i = 0; i < NUM_OUTPUTS; i++) { setRelayHardware(i, true); delay(250); }
  }
}

// ─────────────────────────────────────────────────────────────────────
// 10. MQTT & JSON COMMAND PARSER
// ─────────────────────────────────────────────────────────────────────
void handleCommand(JsonDocument& doc) {
  const char* command_id      = doc["command_id"];
  const char* output_id       = doc["output_id"];
  const char* requested_state = doc["requested_state"];
  const char* action          = doc["action"];

  // Invert Logic Command
  if (action && (String(action) == "INVERT" || String(action) == "TOGGLE_LOGIC")) {
    RELAY_ACTIVE_LOW = !RELAY_ACTIVE_LOW;
    Serial.printf("[CONFIG] Inverted relay logic: %s\n", RELAY_ACTIVE_LOW ? "Active-LOW" : "Active-HIGH");
    updateAllPins();
    if (command_id) publishAck(command_id, "ALL", true, RELAY_ACTIVE_LOW ? "ACTIVE_LOW" : "ACTIVE_HIGH", NULL);
    return;
  }

  // Batch ALL Commands
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

  // Deterministic ISOLATE Command -> Explicitly Turn OFF
  if (action && String(action) == "ISOLATE" && output_id) {
    int idx = findOutputIndex(output_id);
    if (idx >= 0) {
      setRelayHardware(idx, false);
      if (command_id) publishAck(command_id, output_id, true, "OFF", NULL);
    }
    return;
  }

  // Deterministic RESTORE Command -> Explicitly Turn ON
  if (action && String(action) == "RESTORE" && output_id) {
    int idx = findOutputIndex(output_id);
    if (idx >= 0) {
      setRelayHardware(idx, true);
      if (command_id) publishAck(command_id, output_id, true, "ON", NULL);
    }
    return;
  }

  // Direct requested_state (ON / OFF)
  if (output_id && requested_state) {
    int idx = findOutputIndex(output_id);
    if (idx >= 0) {
      bool target = (String(requested_state) == "ON" || String(requested_state) == "RESTORE");
      setRelayHardware(idx, target);
      if (command_id) publishAck(command_id, output_id, true, target ? "ON" : "OFF", NULL);
    }
  }
}

int findOutputIndex(const char* output_id) {
  if (!output_id) return -1;
  for (int i = 0; i < NUM_OUTPUTS; i++) {
    if (String(outputs[i].output_id).equalsIgnoreCase(String(output_id))) return i;
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
