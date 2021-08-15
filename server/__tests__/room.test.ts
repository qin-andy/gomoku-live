import { createServer } from 'http';
import { AddressInfo } from 'net';
import { Server, Socket as ServerSocket } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { Player } from "../src/socket/PlayerManager";
import { Room } from '../src/socket/room';

describe('player manager tests', () => {
  const DONE_DELAY = 100;
  const IN_BETWEEN_DELAY = 100;
  const CLIENTS_COUNT = 5;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let room: Room;
  let count = 1;

  beforeAll((done) => {
    // create room
    room = new Room('Test Room');
    clientSockets = [];

    // create server instance
    const httpServer = createServer();
    io = new Server(httpServer);

    // once server is listening
    httpServer.listen(() => {
      io.on('connection', (socket) => {
        // increment each socket connected name
        let name = 'Player ' + count;
        room.addPlayer(new Player(socket, name));
        count++;
      });
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll(() => {
    io.close();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
    room.close();
  });

  beforeEach((done) => {
    let connectedCount = 0; // track number of connected sockets

    // Create CLIENTs_COUNT new sockets and store them in clientSockets
    for (let i = 0; i < CLIENTS_COUNT; i++) {
      let clientSocket = Client(`http://localhost:${port}`);
      clientSockets.push(clientSocket);
      clientSocket.on('connect', () => {
        connectedCount++;
        if (connectedCount === CLIENTS_COUNT) {
          setTimeout(done, IN_BETWEEN_DELAY); // finish once all sockets are connected
        }
      });
    }
    count = 1;
  });

  afterEach((done) => {
    clientSockets.forEach((socket) => socket.close());
    clientSockets = [];
    room.close();
    room = new Room('Test Room');

    setTimeout(done, IN_BETWEEN_DELAY);
  });

  describe('basic room info', () => {
    it('get room name returns room name', () => {
      expect(room.getRoomName()).toBe('Test Room');
    });

    it('get player names matches client names', () => {
      let expectedNames: string[] = [];
      for (let count = 0; count < CLIENTS_COUNT; count++) {
        // Assuming names are ordered
        expectedNames.push('Player ' + (count + 1));
      }
      expect(room.getPlayerNames()).toEqual(expect.arrayContaining(expectedNames));
    });
  });

  describe('adding and removing players', () => {
    it('add player adds new player', (done) => {
      let newClientSocket = Client(`http://localhost:${port}`);
      let expectedNames: string[] = [];
      for (let count = 0; count < CLIENTS_COUNT + 1; count++) {
        // Assuming names are ordered
        expectedNames.push('Player ' + (count + 1));
      }
      newClientSocket.on('connect', () => {
        try {
          expect(room.getPlayerNames()).toEqual(expect.arrayContaining(expectedNames));
          done();
        } catch (err) {
          done(err)
        }
      });
    });

    it('remove player removes player', () => {
      let removedName = room.removePlayer(clientSockets[0].id).getName();
      expect(room.getPlayerNames()).not.toEqual(expect.arrayContaining([removedName]));
    });
  });

  // Host tests start with empty room. Could I scope out the clientSockets
  // initialization and avoid having to close and reinitialize room every time?
  describe('host management', () => {
    it('room is created with host', () => {
      expect(room.getHost()).toBeTruthy();
    });

    it('empty room has no host', () => {
      room.close();
      room = new Room('Hostless Room');
      expect(room.host).toBe(null);
    });

    it('get host with no host throws no host error', () => {
      room.close();
      room = new Room('Hostless Room');
      expect(() => { room.getHost() }).toThrow('room Hostless Room has no host!');
    });

    it('adding player to empty room makes them the host', (done) => {
      room.close();
      room = new Room('Hostless Room');
      let newClientSocket = Client(`http://localhost:${port}`);
      newClientSocket.on('connect', () => {
        try {
          // Compares client socket id to server player id;
          expect(room.getHost().getId()).toBe(newClientSocket.id);
          done();
        }
        catch (err) {
          done(err);
        }
      });
    });

    it('removing host replaces host with another player', (done) => {
      // empty room -> host player and new player -> remove host -> check if new player is host
      room.close();
      room = new Room('Hostled Room');
      let hostSocket = Client(`http://localhost:${port}`);

      // trying to mitigate pyramid of doom
      const removeHostCallback = (newSocket: ClientSocket) => {
        try {
          room.removePlayer(hostSocket.id);
          expect(room.getHost().getId()).toBe(newSocket.id);
          done();
        } catch (err) {
          done(err);
        }
      }

      hostSocket.on('connect', () => { // TODO: fix pyramid of doom
        let newSocket = Client(`http://localhost:${port}`);
        newSocket.on('connect', () => removeHostCallback(newSocket));
      });
    });

    it('close room removes host', () => {
      room.close();
      expect(() => { room.getHost() }).toThrow('room Test Room has no host!');
    });
  });

  describe('listener management', () => {
    it('close room disconnects all sockets', (done) => {
      let disconnectedCount = 0;
      clientSockets.forEach((clientSocket) => {
        clientSocket.on('disconnect', () => {
          disconnectedCount++;
          if (disconnectedCount === CLIENTS_COUNT) {
            done();
          }
        });
      });
      room.close();
    });
  });
});