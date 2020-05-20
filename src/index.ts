import ioClient from 'socket.io-client';

let url = `http://localhost:3000`;
let clientSocket: SocketIOClient.Socket;

export interface Message{
    ok:boolean,
    msg:string
}
export type MessageFn = (message: Message) =>void;
export type PlayerReadyFn = (message: Message) =>void;

// tslint:disable-next-line: no-empty
let messageFn = (message:Message)=>{};
// tslint:disable-next-line: no-empty
let playerReadyFn = (playerNum:number)=>{};

export const onMessage = (messageEventFunction:(message:Message)=>void)=>{
    messageFn=messageEventFunction;
}

export const onPLayerReady = (playerReadyEventFunction:(playerNum:number)=>void)=>{
  playerReadyFn=playerReadyEventFunction;
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
export const joinLobby = (lobbyName: string) => {
  clientSocket = connect();
  startMessageListener();
  startReadyListener();
  clientSocket.emit('joinLobby', lobbyName);
};

/**
 *  Create lobby will create a lobby if the user is authorized
 * @param lobbyName The name of the lobby you want to join as a string
 * @param authToken The auth token to verify the user
 */
export const createLobby = (lobbyName: string, authToken: string) => {
  clientSocket = connect();
  startMessageListener();
  startReadyListener();
  clientSocket.emit('createLobby', lobbyName, authToken);
};

/**
 * Let the server know that the player is ready for the game to start.
 * Once a game is started this will have no effect
 */
export const setReady = (lobbyName:string) => {
  clientSocket.emit('playerReady',lobbyName);
};


// Start the listener to handle messages
const startMessageListener=()=>{
    clientSocket.on('message', (msgData:Message)=>{
        messageFn(msgData);
    });
}

const startReadyListener = () =>{
  clientSocket.on('playerReady', (playerNum:number)=>{
    playerReadyFn(playerNum)
  })
}


export default {
  setup,
  joinLobby,
  createLobby,
  setReady,
  onMessage,
  onPLayerReady
};
