@echo off
title GRIDTWIN — ESP32 Hardware Simulator & Live Cloud Bridge
echo ========================================================
echo     GRIDTWIN — ESP32 HARDWARE SIMULATOR & CLOUD BRIDGE
echo ========================================================
echo.
echo Connecting to HiveMQ MQTT broker (broker.hivemq.com)...
echo Bridging to live Web Twin & Toll-Free Helpline...
echo.

cd /d "%~dp0gridtwin\firmware"

python -c "import paho.mqtt.client" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing required paho-mqtt package...
    pip install paho-mqtt
)

python esp32_simulator.py

pause

