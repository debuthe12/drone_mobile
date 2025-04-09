// src/services/telloService.js
import dgram from 'react-native-udp';

// --- Constants ---
const TELLO_IP = '192.168.10.1';
const TELLO_COMMAND_PORT = 8889;
const LOCAL_COMMAND_PORT_BIND = 9000; // Local port for sending/receiving

let commandSocket = null; // Module-level variable to hold the socket

export const initialize = () => {
  return new Promise((resolve, reject) => {
    if (commandSocket) {
      console.warn("Tello Service: Socket already initialized.");
      // Optionally close existing before creating new, or just resolve
      // close().catch(e => console.error("Error closing existing socket:", e));
       resolve();
       return;
    }

    try {
      console.log('Tello Service: Creating UDP command socket...');
      const socket = dgram.createSocket({ type: 'udp4' });

      socket.on('error', (err) => {
        const errorMsg = `Tello Service: UDP Socket error: ${err.message}`;
        console.error(errorMsg, err);
        close(); // Attempt to close on error
        // Note: Cannot reject the initialize promise here as it might have already resolved
        // Handle errors via global state or event emitter if needed later
      });

      socket.on('message', (msg, rinfo) => {
        console.log(`Tello Service: Drone response: ${msg.toString()} from ${rinfo.address}:${rinfo.port}`);
        // Here you could potentially dispatch Redux actions based on responses
      });

      socket.bind(LOCAL_COMMAND_PORT_BIND, (err) => {
        if (err) {
          const bindError = `Tello Service: Failed to bind socket to port ${LOCAL_COMMAND_PORT_BIND}: ${err.message}`;
          console.error('Socket bind error:', bindError);
          commandSocket = null; // Ensure socket ref is null on bind failure
          reject(new Error(bindError));
        } else {
          console.log(`Tello Service: Socket bound successfully to port ${LOCAL_COMMAND_PORT_BIND}`);
          commandSocket = socket; // Store the successfully bound socket
          resolve();
        }
      });

    } catch (error) {
       console.error("Tello Service: Error creating socket:", error);
       reject(error);
    }
  });
};

export const sendCommand = (command) => {
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

export const close = () => {
 return new Promise((resolve) => {
    if (commandSocket) {
      console.log('Tello Service: Closing UDP socket');
      try {
        commandSocket.close();
      } catch (e) {
        console.error("Tello Service: Error closing socket:", e);
        // Resolve anyway, as the goal is to nullify the reference
      } finally {
         commandSocket = null;
      }
    } else {
        console.log("Tello Service: Close called but no socket to close.");
    }
    resolve(); // Resolve even if there was nothing to close or an error occurred
 });
};