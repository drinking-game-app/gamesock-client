import ioClient from 'socket.io-client';

let url=`http://localhost:3000`;
const setup = (endpointURL:string)=>{
    url=endpointURL;
}

const connect = ()=>{
    // Setup
    return ioClient.connect(url, {
    transports: ['polling', 'websocket'],
  });
  }

/**
 *  JoinLobby will join a currently open lobby
 * @param lobbyName The name of the lobby you want to join as a string
 */
const joinLobby = (lobbyName:string) => {
    const clientSocket = connect();
    clientSocket.emit('joinLobby', lobbyName);
}

/**
 *  Create lobby will create a lobby if the user is authorized
 * @param lobbyName The name of the lobby you want to join as a string
 * @param authToken The auth token to verify the user
 */
const createLobby = (lobbyName:string, authToken:string) => {
    const clientSocket = connect();
    clientSocket.emit('createLobby', lobbyName, authToken);
}

export default{
    setup,
    joinLobby,
    createLobby
}