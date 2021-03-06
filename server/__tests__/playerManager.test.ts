import { Server, Socket as ServerSocket } from 'socket.io';
import { Socket as ClientSocket } from 'socket.io-client';
import { PlayerManager } from "../src/player/PlayerManager";
import { Player } from '../src/player/player';
import { createSocketPairs, createSocketServer } from './helpers';

describe('player manager tests', () => {
  const IN_BETWEEN_DELAY = 25;
  const CLIENTS_COUNT = 5;
  let port: number;
  let io: Server;
  let clientSockets: ClientSocket[];
  let serverSockets: ServerSocket[];
  let players: Player[];
  let playerManager: PlayerManager;
  let playerCount = 1;

  beforeAll(async () => {
    [io, port] = await createSocketServer();
    clientSockets = [];
    serverSockets = [];
    players = [];
    io.on('connect', (socket) => {
      let newPlayer = new Player(socket, 'Player ' + playerCount)
      players.push(newPlayer);
      playerManager.addPlayer(newPlayer);
      playerCount++;
    })
  });

  afterAll(() => {
    io.close();
    clientSockets.forEach((clientSocket) => {
      clientSocket.close();
    });
    if (global.gc) { global.gc() }
  });

  beforeEach(async () => {
    playerManager = new PlayerManager();
    playerCount = 1;
    [clientSockets, serverSockets] = await createSocketPairs(io, port, CLIENTS_COUNT);
  });

  afterEach((done) => {
    clientSockets.forEach((socket) => socket.close());
    players = [];
    setTimeout(done, IN_BETWEEN_DELAY);
  });

  describe('player manager info', () => {
    it('get count returns correct number of players (' + CLIENTS_COUNT + ')', () => {
      expect(playerManager.getCount()).toBe(CLIENTS_COUNT);
    });

    it('get names returns correct player names', () => {
      let expectedNames: string[] = [];
      for (let count = 0; count < CLIENTS_COUNT; count++) {
        // Assuming names are ordered
        expectedNames.push('Player ' + (count + 1));
      }
      expect(playerManager.getNames()).toEqual(expect.arrayContaining(expectedNames));
    });

    it('get names returns correct socket ids', () => {
      let expectedIds = clientSockets.map((socket) => {
        return socket.id;
      });
      expect(playerManager.getIds()).toEqual(expect.arrayContaining(expectedIds));
    });

    it('get player by socket id returns correct player and socket', () => {
      clientSockets.forEach((clientSocket, index) => {
        let player = playerManager.getPlayerById(clientSocket.id);
        expect(player?.id).toBe(clientSocket.id);
      });
    });
  });

  describe('adding and removing players', () => {
    it('players list matches', () => {
      expect(Array.from(playerManager.playerMap.values())).toEqual(expect.arrayContaining(players));
    });

    it('add new players get names returns new ids', async () => {
      let [newClientSocket, newServerSocket] = await createSocketPairs(io, port, 1);
      clientSockets.push(newClientSocket[0]);
      let expectedIds = clientSockets.map((socket) => {
        return socket.id;
      });
      expect(playerManager.getIds()).toEqual(expect.arrayContaining(expectedIds));
    });

    it('add same player multiple times throws error', async () => {
      let [newClientSockets, newServerSockets] = (await createSocketPairs(io, port, 1));
      clientSockets.push(newClientSockets[0]); // to let jest hooks cleanup the new socket
      let newPlayer = new Player(newServerSockets[0], 'New Player');
      expect(() => playerManager.addPlayer(newPlayer)).toThrowError();
    });

    it('remove first player get names doesnt include first player', () => {
      playerManager.removePlayer(clientSockets[0].id);
      clientSockets[0].close();
      clientSockets.shift();
      let expectedIds = clientSockets.map((socket) => {
        return socket.id;
      });
      expect(playerManager.getIds()).toEqual(expect.arrayContaining(expectedIds));
    });

    it('remove first player returns player with correct nfo', () => {
      let player = playerManager.removePlayer(clientSockets[0].id);
      if (!player) {
        throw new Error('player is undefined!');
      }
      expect(player.id).toBe(clientSockets[0].id);
    });

    it('remove first player gives undefined second time', () => {
      playerManager.removePlayer(clientSockets[0].id);
      expect(playerManager.removePlayer(clientSockets[0].id)).toBe(undefined);
    });

    it('get nonexisent player gives undefined', () => {
      expect(playerManager.getPlayerById('invalid player name')).toBe(undefined);
    });

    it('remove nonexistaent player gives undefined', () => {
      expect(playerManager.removePlayer('invalid player name')).toBe(undefined);
    });

  });
});