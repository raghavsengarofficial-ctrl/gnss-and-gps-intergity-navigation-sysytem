#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <TinyGPSPlus.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>

// ===================== USER CONFIG =====================
const char *WIFI_SSID = "Project1";
const char *WIFI_PASSWORD = "12345678";
const char *BACKEND_URL = "http://10.222.145.83:8000/data";

// ESP32 UART2 pins for NEO-6M GPS.
constexpr int GPS_RX_PIN = 16; // ESP32 receives from GPS TX
constexpr int GPS_TX_PIN = 17; // ESP32 transmits to GPS RX
constexpr uint32_t GPS_BAUD = 9600;

constexpr int GREEN_LED_PIN = 25;
constexpr int RED_LED_PIN = 26;
constexpr bool SIMULATION_MODE_WHEN_NO_GPS = true;
constexpr unsigned long POST_INTERVAL_MS = 1000;
constexpr unsigned long GPS_LOSS_TIMEOUT_MS = 5000;

// ===================== GLOBALS =====================
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;
Adafruit_MPU6050 mpu;

struct SatelliteInfo {
  int prn = 0;
  int elevation = 0;
  int azimuth = 0;
  int snr = 0;
  bool used = false;
};

SatelliteInfo satellites[32];
int satelliteCount = 0;
unsigned long lastPost = 0;
unsigned long lastGpsChar = 0;
bool mpuReady = false;

String nmeaLine;

void setLedStatus(const String &status) {
  bool anomaly = status == "ANOMALY";
  digitalWrite(GREEN_LED_PIN, anomaly ? LOW : HIGH);
  digitalWrite(RED_LED_PIN, anomaly ? HIGH : LOW);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed. Will retry in loop.");
  }
}

int nextCsvField(const String &line, int &start) {
  int comma = line.indexOf(',', start);
  if (comma < 0) {
    int old = start;
    start = line.length();
    return old;
  }
  int old = start;
  start = comma + 1;
  return old;
}

String fieldAt(const String &line, int index) {
  int start = 0;
  for (int i = 0; i <= index; i++) {
    int begin = nextCsvField(line, start);
    int end = line.indexOf(',', begin);
    if (end < 0) end = line.indexOf('*', begin);
    if (end < 0) end = line.length();
    if (i == index) return line.substring(begin, end);
  }
  return "";
}

void parseGsv(const String &line) {
  if (!(line.startsWith("$GPGSV") || line.startsWith("$GLGSV") || line.startsWith("$GAGSV") || line.startsWith("$BDGSV"))) {
    return;
  }

  int messageNumber = fieldAt(line, 2).toInt();
  if (messageNumber == 1) {
    satelliteCount = 0;
  }

  for (int base = 4; base + 3 <= 19 && satelliteCount < 32; base += 4) {
    String prn = fieldAt(line, base);
    if (prn.length() == 0) continue;
    satellites[satelliteCount].prn = prn.toInt();
    satellites[satelliteCount].elevation = fieldAt(line, base + 1).toInt();
    satellites[satelliteCount].azimuth = fieldAt(line, base + 2).toInt();
    satellites[satelliteCount].snr = fieldAt(line, base + 3).toInt();
    satellites[satelliteCount].used = satellites[satelliteCount].snr >= 25;
    satelliteCount++;
  }
}

void readGpsStream() {
  while (gpsSerial.available()) {
    char c = gpsSerial.read();
    gps.encode(c);
    lastGpsChar = millis();

    if (c == '\n') {
      parseGsv(nmeaLine);
      nmeaLine = "";
    } else if (c != '\r' && nmeaLine.length() < 120) {
      nmeaLine += c;
    }
  }
}

void readMotion(float &ax, float &ay, float &az, float &gx, float &gy, float &gz) {
  ax = ay = gx = gy = gz = 0.0f;
  az = 9.81f;
  if (!mpuReady) return;

  sensors_event_t accel, gyro, temp;
  mpu.getEvent(&accel, &gyro, &temp);
  ax = accel.acceleration.x;
  ay = accel.acceleration.y;
  az = accel.acceleration.z;
  gx = gyro.gyro.x;
  gy = gyro.gyro.y;
  gz = gyro.gyro.z;
}

double simulatedLat() {
  return 12.9716 + 0.00008 * sin(millis() / 12000.0);
}

double simulatedLon() {
  return 77.5946 + 0.00008 * cos(millis() / 15000.0);
}

void ensureSimulatedSatellites() {
  satelliteCount = 12;
  for (int i = 0; i < satelliteCount; i++) {
    satellites[i].prn = i + 1;
    satellites[i].azimuth = (i * 31 + millis() / 250) % 360;
    satellites[i].elevation = 18 + ((i * 13) % 68);
    satellites[i].snr = 28 + ((i * 7) % 18);
    satellites[i].used = i < 8;
  }
}

String postTelemetry(const String &payload) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return "ANOMALY";
  }

  HTTPClient http;
  http.setTimeout(1500);
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(payload);
  String status = "ANOMALY";

  if (code > 0) {
    String response = http.getString();
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, response);
    if (!err && doc["status"].is<const char *>()) {
      status = doc["status"].as<String>();
    }
  }

  http.end();
  return status;
}

void sendTelemetry() {
  float ax, ay, az, gx, gy, gz;
  readMotion(ax, ay, az, gx, gy, gz);

  bool gpsFresh = millis() - lastGpsChar < GPS_LOSS_TIMEOUT_MS && gps.location.isValid();
  bool simulated = !gpsFresh && SIMULATION_MODE_WHEN_NO_GPS;
  if (simulated) ensureSimulatedSatellites();

  double lat = simulated ? simulatedLat() : gps.location.lat();
  double lon = simulated ? simulatedLon() : gps.location.lng();
  double hdop = simulated ? 0.9 + 0.25 * sin(millis() / 8000.0) : (gps.hdop.isValid() ? gps.hdop.hdop() : 99.9);
  int sats = simulated ? satelliteCount : (gps.satellites.isValid() ? gps.satellites.value() : 0);

  StaticJsonDocument<4096> doc;
  doc["device_id"] = "ESP32-GPS-IM-001";
  doc["timestamp_ms"] = millis();
  doc["lat"] = lat;
  doc["lon"] = lon;
  doc["hdop"] = hdop;
  doc["sat_count"] = sats;
  doc["gps_fix"] = gpsFresh || simulated;
  doc["simulation"] = simulated;
  doc["ax"] = ax;
  doc["ay"] = ay;
  doc["az"] = az;
  doc["gx"] = gx;
  doc["gy"] = gy;
  doc["gz"] = gz;

  JsonArray satsArray = doc.createNestedArray("satellites");
  for (int i = 0; i < satelliteCount; i++) {
    JsonObject s = satsArray.createNestedObject();
    s["prn"] = satellites[i].prn;
    s["azimuth"] = satellites[i].azimuth;
    s["elevation"] = satellites[i].elevation;
    s["snr"] = satellites[i].snr;
    s["used"] = satellites[i].used;
    s["constellation"] = satellites[i].prn > 64 ? "GLONASS" : "GPS";
  }

  String payload;
  serializeJson(doc, payload);
  String status = postTelemetry(payload);
  setLedStatus(status);

  Serial.print("Posted telemetry, status=");
  Serial.println(status);
}

void setup() {
  Serial.begin(115200);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  setLedStatus("ANOMALY");

  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Wire.begin();

  mpuReady = mpu.begin();
  if (mpuReady) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  } else {
    Serial.println("MPU6050 not detected; motion values will be degraded.");
  }

  connectWiFi();
}

void loop() {
  readGpsStream();
  if (millis() - lastPost >= POST_INTERVAL_MS) {
    lastPost = millis();
    sendTelemetry();
  }
}
