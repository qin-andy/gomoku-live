import { createSlice } from "@reduxjs/toolkit";
import { GameResponse, marking } from "../types";

interface TictactoeState {
  running: boolean,
  completed: boolean,
  winner: marking,
  turn: marking,
  board: marking[],
  x: number,
  y: number,
  latestResponse: GameResponse | null
}

const initialState: TictactoeState = {
  running: false,
  completed: false,
  winner: '*',
  turn: '*',
  board: [],
  x: 0,
  y: 0,
  latestResponse: null
}

const tictactoeSlice = createSlice({
  name: 'tictactoe',
  initialState,
  reducers: {
    gameResponseReceived(state, action) {
      state.latestResponse = action.payload;
    },
    gameStarted(state, action) {
      state.x = action.payload.x;
      state.y = action.payload.y;
      state.board = action.payload.board;
      state.running = true;
    },
    boardUpdated(state, action) {
      state.board = action.payload;
    },
    gameWon(state, action) {
      state.completed = true;
      state.running = false;
      state.board = action.payload.board;
      state.winner = action.payload.winner;
    }
  }
});

export default tictactoeSlice.reducer;
export const { gameStarted, boardUpdated, gameResponseReceived } = tictactoeSlice.actions;