// src/services/telloService.js
import dgram from 'react-native-udp';
// --- Constants --- (keep existing)
const TELLO_IP = '192.168.10.1';
const TELLO_COMMAND_PORT = 8889;
const LOCAL_COMMAND_PORT_BIND = 9000;

let commandSocket = null;
let statusCallback = null; // Store the callback function

// --- Status String Parser ---
const parseStatusString = (statusStr) => {
  const statusData = {};
  try {
    statusStr.split(';').forEach(pair => {
      // Ensure the pair has a colon and is not empty
      if (pair && pair.includes(':')) {
        const [key, value] = pair.split(':');
        if (key && value !== undefined) {
          // Trim whitespace just in case
          const trimmedKey = key.trim();
          if (trimmedKey) { // Ensure key is not empty after trimming
             statusData[trimmedKey] = value.trim();
          }
        }
      }
    });
    return statusData;
  } catch (e) {
    console.error("Tello Service: Error parsing status string:", statusStr, e);
    return null; // Return null or empty object on parsing failure
  }
};

// --- Modify initialize ---
export const initialize = (onStatusUpdate) => { // Accept callback
  return new Promise((resolve, reject) => {
    if (commandSocket) {
      console.warn("Tello Service: Socket already initialized.");
      statusCallback = onStatusUpdate; // Update callback even if socket exists
      resolve();
      return;
    }

    statusCallback = onStatusUpdate; // Store the callback

    try {
      console.log('Tello Service: Creating UDP command socket...');
      const socket = dgram.createSocket({ type: 'udp4' });

      socket.on('error', (err) => {
        const errorMsg = `Tello Service: UDP Socket error: ${err.message}`;
        console.error(errorMsg, err);
        close();
        // Potentially call statusCallback with an error indicator?
         if (statusCallback) {
             statusCallback({ error: errorMsg });
         }
      });

      socket.on('message', (msg, rinfo) => {
        const messageStr = msg.toString();
        // Basic check for status string format (key:value pairs separated by ';')
        // This is a heuristic, might need refinement based on other drone messages
        if (messageStr.includes(':') && messageStr.includes(';')) {
            // Assume it's a status message
            const parsedData = parseStatusString(messageStr);
            if (parsedData && statusCallback) {
                // Call the provided callback with the parsed data
                statusCallback(parsedData);
            } else if (!parsedData) {
                 console.warn("Tello Service: Received message looked like status but failed to parse:", messageStr);
            }
        } else {
          // Log other messages (like 'ok', 'error', wifi SNR)
          console.log(`Tello Service: Drone response: ${messageStr} from ${rinfo.address}:${rinfo.port}`);
           // --- Optional: Handle Wifi SNR specifically ---
           // if (messageStr.startsWith('wifi')) { // Or check specifically for SNR format
           //     const snrValue = messageStr.split(':').pop()?.trim();
           //     if (snrValue && statusCallback) {
           //         // Use a specific field or type in the callback object
           //         statusCallback({ wifiSnr: snrValue });
           //     }
           // }
        }
      });

      socket.bind(LOCAL_COMMAND_PORT_BIND, (err) => {
        if (err) {
          const bindError = `Tello Service: Failed to bind socket to port ${LOCAL_COMMAND_PORT_BIND}: ${err.message}`;
          console.error('Socket bind error:', bindError);
          commandSocket = null;
          statusCallback = null; // Clear callback on bind failure
          reject(new Error(bindError));
        } else {
          console.log(`Tello Service: Socket bound successfully to port ${LOCAL_COMMAND_PORT_BIND}`);
          commandSocket = socket;
          resolve();
        }
      });

    } catch (error) {
       console.error("Tello Service: Error creating socket:", error);
       reject(error);
    }
  });
};

// --- sendCommand remains the same ---
export const sendCommand = (command) => {
  // ... (existing implementation)
  return new Promise((resolve, reject) => {
    if (!commandSocket) {
      console.error("Tello Service: sendCommand called but socket not ready.");
      return reject(new Error("Socket not initialized"));
    }
    console.log(`Tello Service: Sending command: ${command}`);
    commandSocket.send(command, 0, command.length, TELLO_COMMAND_PORT, TELLO_IP, (err) => {
      if (err) {
        console.error(`Tello Service: Failed to send command ${command}:`, err);
        reject(err);
      } else {
        console.log(`Tello Service: Command ${command} sent.`);
        resolve();
      }
    });
  });
};

// --- close remains the same ---
export const close = () => {
 // ... (existing implementation)
 return new Promise((resolve) => {
    if (commandSocket) {
      console.log('Tello Service: Closing UDP socket');
      try {
        commandSocket.close();
      } catch (e) {
        console.error("Tello Service: Error closing socket:", e);
      } finally {
         commandSocket = null;
         statusCallback = null; // Clear callback on close
      }
    } else {
        console.log("Tello Service: Close called but no socket to close.");
    }
    resolve();
 });
};