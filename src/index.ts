import ioClient from 'socket.io-client';

let url = `http://localhost:3000`;
let clientSocket: SocketIOClient.Socket;

/**
 * The lobby object
 */
export interface Lobby {
  readonly name: string;
  // If round is 0 game has not started
  round: 0;
  // Host will always be players[0]
  players: Player[];
}

export interface Player {
  // socketIO id
  readonly id: string;
  name: string;
  ready: boolean;
}
export interface Message{
    ok:boolean,
    msg:string
}
export type MessageFn = (message: Message) =>void;
export type PlayerReadyFn = (playerNum: number) =>void;
export type SinglePlayerUpdateFn = (player: Player) =>void;
export type PlayerListUpdateFn = (player: Player) =>void;
export type StartGameFn = (gameOptions:any) =>void;

// tslint:disable-next-line: no-empty
let messageFn = (message:Message)=>{};
// tslint:disable-next-line: no-empty
let playerReadyFn = (playerNum:number)=>{};
// tslint:disable-next-line: no-empty
let singlePlayerUpdateFn = (player:Player)=>{};
// tslint:disable-next-line: no-empty
let playerListUpdateFn = (playerList:Player[])=>{};
// tslint:disable-next-line: no-empty
let startGameFn = (gameOptions:any)=>{};

export const onMessage = (messageEventFunction:(message:Message)=>void)=>{
    messageFn=messageEventFunction;
}

export const onPlayerReady = (playerReadyEventFunction:(playerNum:number)=>void)=>{
  playerReadyFn=playerReadyEventFunction;
}

export const onSinglePlayerUpdate = (singlePlayerUpdateEventFunction:(player:Player)=>void)=>{
  singlePlayerUpdateFn=singlePlayerUpdateEventFunction;
}

export const onPlayerListUpdate = (playerListUpdateEventFunction:(playerList:Player[])=>void)=>{
  playerListUpdateFn=playerListUpdateEventFunction;
}

export const onStartGame = (startGameEventFunction:(playerList:Player[])=>void)=>{
  startGameFn=startGameEventFunction;
}

export const setup = (endpointURL: string) => {
  url = endpointURL;
};

const connect = () => {
  // Setup
  return ioClient.connect(url, {
    transports: ['polling', 'websocket'],
  });
};

/**
 *  JoinLobby will join a currently open lobby
 * @param lobbyName The name of the lobby you want to join as a string
 */
export const joinLobby = async (lobbyName: string) => {
  clientSocket = connect();
  // Start all listeners for events from server
  startLobbyListeners();
  return new Promise<Player[]>((res,rej)=>{
    clientSocket.emit('joinLobby', lobbyName, (players:Player[])=>{
      if(players.length===0){
        rej('Could not join lobby');
      }
      res(players)
    });
  })
};

/**
 *  Create lobby will create a lobby if the user is authorized
 * @param lobbyName The name of the lobby you want to join as a string
 * @param authToken The auth token to verify the user
 */
export const createLobby = async (lobbyName: string, authToken: string) => {
  clientSocket = connect();
  startLobbyListeners();
  return new Promise<Player[]>((res,rej)=>{
    clientSocket.emit('createLobby', lobbyName, authToken, (players:Player[])=>{
      if(players.length===0){
        rej('Could not create lobby');
      }
      res(players)
    });
  })
};

/**
 * Let the server know that the player has updated their name
 * Once a game is started this will have no effect
 */
export const setReady = (lobbyName:string) => {
  clientSocket.emit('playerReady',lobbyName);
};

/**
 * Let the server know that the player is ready for the game to start.
 * Once a game is started this will have no effect
 */
export const updateSelf = (lobbyName:string, player:Player) => {
  clientSocket.emit('updateSelf', lobbyName, player);
}

/**
 * Attempt to start the game, can only be triggered by the host
 *
 */
export const startGame = (lobbyName:string) => {
  clientSocket.emit('startGame',lobbyName);
};

/**
 * Manually trigger a sync of the players,
 * Will return an array of players in the order of the server
 *
 */
export const getPlayers = (lobbyName:string) => {
  clientSocket.emit('getPlayers', lobbyName,);
}

// Start the listener to handle messages
const startMessageListener=()=>{
    clientSocket.on('message', (msgData:Message)=>{
        messageFn(msgData);
    });
}

const startErrorListener=()=>{
  clientSocket.on('gamesockError', (errorMsg:string)=>{
      console.error(`Gamesock-Server Error: ${errorMsg}`);
  });
}

const startReadyListener = () =>{
  clientSocket.on('playerReady', (playerNum:number)=>{
    playerReadyFn(playerNum);
  })
}

const startSinglePlayerUpdateListener = () =>{
  clientSocket.on('playerUpdated', (player:Player)=>{
    singlePlayerUpdateFn(player);
  });
}

const startPlayerListUpdateListener = () =>{
  clientSocket.on('getPlayers', (playerList:Player[])=>{
    playerListUpdateFn(playerList);
  });
}

const startStartGameListener = () =>{
  clientSocket.on('startGame', (gameOptions:any)=>{
    startGameFn(gameOptions);
    // Start the game listeners which are only for the game
    startGameListeners();
  });
}


// Start listeners specific to the lobby
const startLobbyListeners = ()=>{
  // Generic listnerts
  startMessageListener();
  startErrorListener();
  // TODO: Remove
  startReadyListener();
  // Start Syncing listners
  startSinglePlayerUpdateListener();
  startPlayerListUpdateListener();
  // Start lobby specific listeners
  startStartGameListener();
}

// Start listeners specific to the game
const startGameListeners = ()=>{
  // Start game specific listeners
  // startStartRoundListner
  // startRoundEndListenre ......
}


export default {
  setup,
  joinLobby,
  createLobby,
  setReady,
  onMessage,
  onPlayerReady,
  onSinglePlayerUpdate,
  onPlayerListUpdate,
  onStartGame,
  startGame
};
