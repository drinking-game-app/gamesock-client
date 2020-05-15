import ioClient from 'socket.io-client';

const setup = ()=>{
    // Setup
    return ioClient.connect(`http://localhost:8000`, {
    transports: ['polling', 'websocket'],
  });
  }


const join = (lobbyName:string)=>{
    const clientSocket = setup();
    clientSocket.emit('createLobby', 'test');
}

export default{
    join
}