// src/services/telloService.js
import dgram from 'react-native-udp';

// --- Constants ---
const TELLO_IP = '192.168.10.1';
const TELLO_COMMAND_PORT = 8889;
const TELLO_STATE_PORT = 8890; // Port the drone sends state FROM

// Local ports to bind OUR sockets to
const LOCAL_COMMAND_PORT_BIND = 9000; // Port we listen for command responses ON
const LOCAL_STATE_PORT_BIND = 8890; // Port we listen for state messages ON (can be the same as drone's state port)

let commandSocket = null;
let stateSocket = null; // Add a variable for the state socket
let statusCallback = null; // Store the callback function

// --- Status String Parser (Keep as is) ---
const parseStatusString = (statusStr) => {
  const statusData = {};
  try {
    statusStr.split(';').forEach(pair => {
      if (pair && pair.includes(':')) {
        const [key, value] = pair.split(':');
        if (key && value !== undefined) {
          const trimmedKey = key.trim();
          if (trimmedKey) {
            statusData[trimmedKey] = value.trim();
          }
        }
      }
    });
    // Add a check for empty object - sometimes Tello sends empty/invalid strings
    if (Object.keys(statusData).length === 0 && statusStr.trim().length > 0 && !statusStr.includes('error')) {
        console.warn("Tello Service: Status string parsed into empty object:", statusStr);
        return null; // Treat as invalid if parsing results in nothing but wasn't an empty input
    }
    return Object.keys(statusData).length > 0 ? statusData : null; // Return null if parsing resulted in empty object
  } catch (e) {
    console.error("Tello Service: Error parsing status string:", statusStr, e);
    return null; // Return null on parsing failure
  }
};

// --- Modify initialize to handle BOTH sockets ---
export const initialize = (onStatusUpdate) => {
  return new Promise((resolve, reject) => {
    if (commandSocket || stateSocket) {
      console.warn("Tello Service: Sockets already initialized or partially initialized. Closing first.");
       // Close existing sockets before re-initializing fully
       close().then(() => {
           _createSockets(onStatusUpdate, resolve, reject); // Call helper after closing
       });
    } else {
        _createSockets(onStatusUpdate, resolve, reject); // Call helper directly
    }
  });
};


// --- Helper function to create and bind sockets ---
const _createSockets = (onStatusUpdate, resolve, reject) => {
     statusCallback = onStatusUpdate; // Store the callback

    let commandSocketBound = false;
    let stateSocketBound = false;
    let errorOccurred = false; // Flag to prevent multiple rejections

    const checkResolve = () => {
        // Resolve only when both sockets are successfully bound
        if (commandSocketBound && stateSocketBound && !errorOccurred) {
            console.log("Tello Service: Both Command and State sockets initialized successfully.");
            resolve();
        }
    };

     const handleError = (socketType, err) => {
         if (errorOccurred) return; // Prevent multiple rejects/logs for the same init attempt
         errorOccurred = true;
         const errorMsg = `Tello Service: UDP ${socketType} Socket error: ${err.message}`;
         console.error(errorMsg, err);
         if (statusCallback) {
             statusCallback({ error: errorMsg });
         }
         close(); // Attempt cleanup on error
         reject(new Error(errorMsg)); // Reject the main initialize promise
     };


    try {
        // --- Create Command Socket ---
        console.log('Tello Service: Creating UDP command socket...');
        const cmdSock = dgram.createSocket({ type: 'udp4' });

        cmdSock.on('error', (err) => handleError('Command', err));

        cmdSock.on('message', (msg, rinfo) => {
            const messageStr = msg.toString();
            // Command socket only logs simple responses ('ok', 'error', query results)
            // It DOES NOT handle the periodic status string anymore.
            console.log(`Tello Service: Drone command response: "${messageStr}" from ${rinfo.address}:${rinfo.port}`);
            // Optional: Handle specific non-status responses if needed (e.g., wifi?)
            // if (messageStr.startsWith('wifi')) { ... }
        });

        cmdSock.bind(LOCAL_COMMAND_PORT_BIND, (err) => {
            if (err) {
                handleError('Command Bind', err);
            } else {
                console.log(`Tello Service: Command Socket bound successfully to port ${LOCAL_COMMAND_PORT_BIND}`);
                commandSocket = cmdSock;
                commandSocketBound = true;
                checkResolve(); // Check if both are bound now
            }
        });

        // --- Create State Socket ---
        console.log('Tello Service: Creating UDP state socket...');
        const statSock = dgram.createSocket({ type: 'udp4' });

        statSock.on('error', (err) => handleError('State', err));

        statSock.on('message', (msg, rinfo) => {
            // State socket receives the periodic status string.
            const messageStr = msg.toString();
            // console.log(`Tello Service: Received state data: ${messageStr}`); // Debug: Log raw state string
            const parsedData = parseStatusString(messageStr);
            if (parsedData && statusCallback) {
                // Call the provided callback with the parsed data
                statusCallback(parsedData);
            } else if (!parsedData && messageStr.trim().length > 0 && !messageStr.includes('error')) {
                 console.warn("Tello Service: Received message on state port failed to parse:", messageStr);
            }
            // Ignore 'ok' or other messages potentially received here, focus on status string
        });

        statSock.bind(LOCAL_STATE_PORT_BIND, (err) => {
             if (err) {
                handleError('State Bind', err);
             } else {
                console.log(`Tello Service: State Socket bound successfully to port ${LOCAL_STATE_PORT_BIND}`);
                stateSocket = statSock;
                stateSocketBound = true;
                checkResolve(); // Check if both are bound now
             }
        });

    } catch (error) {
        handleError('Create', error); // Handle synchronous errors during createSocket calls
    }
}


// --- sendCommand remains the same (uses commandSocket) ---
export const sendCommand = (command) => {
  return new Promise((resolve, reject) => {
    if (!commandSocket) {
      console.error("Tello Service: sendCommand called but command socket not ready.");
      return reject(new Error("Command socket not initialized"));
    }
    console.log(`Tello Service: Sending command: ${command}`);
    commandSocket.send(command, 0, command.length, TELLO_COMMAND_PORT, TELLO_IP, (err) => {
      if (err) {
        console.error(`Tello Service: Failed to send command ${command}:`, err);
        reject(err);
      } else {
        // console.log(`Tello Service: Command ${command} sent.`); // Less verbose logging
        resolve();
      }
    });
  });
};

// --- Modify close to handle BOTH sockets ---
export const close = () => {
 return new Promise((resolve) => {
    let closedCount = 0;
    const socketsToClose = [commandSocket, stateSocket].filter(s => s !== null); // Get non-null sockets

    if (socketsToClose.length === 0) {
        console.log("Tello Service: Close called but no sockets to close.");
        statusCallback = null; // Ensure callback is cleared
        resolve();
        return;
    }

    console.log(`Tello Service: Closing ${socketsToClose.length} UDP socket(s)...`);
    statusCallback = null; // Clear callback immediately

    socketsToClose.forEach((socket, index) => {
        const socketName = index === 0 && socket === commandSocket ? "Command" : "State";
        try {
            socket.close(() => { // Use callback form of close if available/needed
                 console.log(`Tello Service: ${socketName} socket closed.`);
                 closedCount++;
                 if (closedCount === socketsToClose.length) {
                     resolve(); // Resolve only after all sockets confirm close
                 }
            });
        } catch (e) {
            console.error(`Tello Service: Error closing ${socketName} socket:`, e);
            closedCount++; // Count it even on error to prevent hanging
            if (closedCount === socketsToClose.length) {
                resolve();
            }
        } finally {
             // Ensure variables are nulled regardless of close success/failure
             if (socket === commandSocket) commandSocket = null;
             if (socket === stateSocket) stateSocket = null;
        }
    });
 });
};