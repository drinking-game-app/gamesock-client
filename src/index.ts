import ioClient from 'socket.io-client';
// import {TimeSync} from './tsLib/timesync';
import {version} from './info.json'
// const version = require()
// const version='0.2.1'
// @ts-ignore
import * as timesync from './jsLib/timesync';

let url = `http://localhost:3000`;
let clientSocket: SocketIOClient.Socket;
// import {version} from "../package.json"
// Timer shit
// tslint:disable-next-line: prefer-const
let timerUrl='http://localhost:3000/timesync';
// Timesync variable
let ts:any;

export let secondsLeft=0;

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
  score: number;
}
export interface Message {
  ok: boolean;
  msg: string;
}


export type RoundOptions = {
  // Current round number
  roundNum: number;
  // Players picked to be in the hotseat
  hotseatPlayers: [Player, Player];
  // Number of questions to answer
  numQuestions: number;
  // // Time to fill in questions in seconds
  time?: number;
  // // Time to start first timer: Date.now foramt
  timerStart?: number;
  // Time to answer
  tta:number
  // Delay between questions
  delayBetweenQs:number
};

export interface HotseatOptions{
  // The time to answer each question
  tta:number;
  delayBetweenQs:number;
}

export interface GameOptions{
  // Total number of rounds in the game
  rounds:number
}
export interface Question {
  playerId: string;
  question: string;
  // Time to Start
  tts?: number;
  answers?: number[];
}
export type CallbackFunction = (data: any, error?: string) => void;

export type MessageFn = (message: Message) => void;
// export type PlayerReadyFn = (playerNum: number) =>void;
export type SinglePlayerUpdateFn = (player: Player) => void;
export type PlayerListUpdateFn = (player: Player[]) => void;
export type StartGameFn = (gameOptions: GameOptions) => void;
export type SendQuestionsFn = ()=>string[];
export type StartHotseatFn = (allQuestions:Question[], hotseatOptions:HotseatOptions) => void;
export type RoundEndFn = () => void;
export type HotseatAnswerFn = (questionIndex:number, answers:number[]) => void;
export type ErrorFn = (error:string) => void;
export type DisconnectFn = (reason:string) => void;

// tslint:disable-next-line: no-empty
let messageFn:MessageFn = (message: Message) => {};
// tslint:disable-next-line: no-empty
let singlePlayerUpdateFn:SinglePlayerUpdateFn = (player: Player) => {};
// tslint:disable-next-line: no-empty
let playerListUpdateFn:PlayerListUpdateFn = (playerList: Player[]) => {};
// tslint:disable-next-line: no-empty
let startGameFn:StartGameFn = (gameOptions: GameOptions) => {};
// tslint:disable-next-line: no-empty
let startRoundFn = (roundOptions:RoundOptions) => {};
// tslint:disable-next-line: no-empty
let timerUpdateFn = (secondsLeftInTimer:number) => {};
// tslint:disable-next-line: no-empty
let sendQuestionsFn:SendQuestionsFn=()=>['Questions were not answered']
// tslint:disable-next-line: no-empty
let onStartHotseatFn: StartHotseatFn = () => { };
// tslint:disable-next-line: no-empty
let onRoundEndFn: RoundEndFn = () => { }
// tslint:disable-next-line: no-empty
let onHotseatAnswerFn: HotseatAnswerFn = (questionIndex:number, answers:number[]) => { }
// tslint:disable-next-line: no-empty
let onErrorFn: ErrorFn = (error:string) => { }
// tslint:disable-next-line: no-empty
let onDisconnectFn: DisconnectFn = (reason:string) => { }

export const onMessage = (messageEventFunction: MessageFn) => {
  messageFn = messageEventFunction;
};

export const onSinglePlayerUpdate = (singlePlayerUpdateEventFunction: SinglePlayerUpdateFn) => {
  singlePlayerUpdateFn = singlePlayerUpdateEventFunction;
};

export const onPlayerListUpdate = (playerListUpdateEventFunction:PlayerListUpdateFn) => {
  playerListUpdateFn = playerListUpdateEventFunction;
};

export const onStartGame = (startGameEventFunction: StartGameFn) => {
  startGameFn = startGameEventFunction;
};

export const onStartRound = (startRoundEventFunction: (roundOptions:RoundOptions) => void) => {
  startRoundFn = startRoundEventFunction;
};

export const onTimerUpdate =(newTimerUpdateFn:(secondsLeftInTimer:number)=>void)=>{
  timerUpdateFn=newTimerUpdateFn
}

export const onRequestQuestions =(newSendQuestionsFn:SendQuestionsFn)=>{
  sendQuestionsFn=newSendQuestionsFn
}

export const setup = (endpointURL: string,timerEndpoint:string) => {
  url = endpointURL;
  timerUrl = timerEndpoint;
  console.log(`%cGamesock-Client %cVersion: ${version} Initialized`, 'color:green;padding:1px 5px;border:1px solid black', 'color:black;padding:1px 5px;border:1px solid black');
};
export const onStartHotseat = (newOnStartHotseatFn:StartHotseatFn) => {
  onStartHotseatFn = newOnStartHotseatFn;
};
export const onHotseatAnswer = (newOnHotseatAnswerFn:HotseatAnswerFn) => {
  onHotseatAnswerFn = newOnHotseatAnswerFn;
};
export const onRoundEnd = (newOnRoundEndFn:RoundEndFn) => {
  onRoundEndFn = newOnRoundEndFn;
};
export const onDisconnect = (newDisconnectFn:DisconnectFn) => {
  onDisconnectFn = newDisconnectFn;
};
export const onError= (newErrorFn:ErrorFn) => {
  onErrorFn = newErrorFn;
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
export const joinLobby = async (lobbyName: string,username:string) => {
  clientSocket = connect();
  // Start all listeners for events from server
  startLobbyListeners();
  return new Promise<Player[]>((res, rej) => {
    clientSocket.emit('joinLobby', lobbyName,username, (players: Player[]) => {
      if (players.length === 0) {
        rej('Could not join lobby');
      }
      res(players);
    });
  });
};

/**
 *  Create lobby will create a lobby if the user is authorized
 * @param lobbyName The name of the lobby you want to join as a string
 * @param authToken The auth token to verify the user
 */
export const createLobby = async (lobbyName: string,username:string, authToken: string) => {
  clientSocket = connect();
  startLobbyListeners();
  return new Promise<Player[]>((res, rej) => {
    clientSocket.emit('createLobby', lobbyName,username, authToken, (players: Player[]) => {
      if (players.length === 0) {
        rej('Could not create lobby');
      }
      res(players);
    });
  });
};

/**
 * Let the server know that the player is ready for the game to start.
 * Once a game is started this will have no effect
 */
export const updateSelf = (lobbyName: string, player: Player) => {
  clientSocket.emit('updateSelf', lobbyName, player);
};

/**
 * Attempt to start the game, can only be triggered by the host
 *
 */
export const startGame = (lobbyName: string) => {
  clientSocket.emit('startGame', lobbyName);
};

export const continueWithGame = (lobbyName: string) => {
  clientSocket.emit('continue', lobbyName);
};

export const startNextRound=(lobbyName:string)=>{
  clientSocket.emit('startNextRound',lobbyName)
}
/**
 * Manually trigger a sync of the players,
 * Will return an array of players in the order of the server
 *
 */
export const getPlayers = (lobbyName: string) => {
  clientSocket.emit('getPlayers', lobbyName);
};

export const sendAnswer = (lobbyName: string, question:number,answer:number,roundNum:number) => {
  clientSocket.emit('hotseatAnswer', lobbyName, question,answer,roundNum);
}

const ping = () =>{
  clientSocket.emit('pinger',(data:string)=>{
    if(data!=='ponger'){
      console.error('Gamesock-client: Did not return ping')
    }
  })
  setTimeout(ping, 4000);
}

// Start the listener to handle messages
const startMessageListener = () => {
  clientSocket.on('message', (msgData: Message) => {
    messageFn(msgData);
  });
};

const startErrorListener = () => {
  clientSocket.on('gamesockError', (errorMsg: string) => {
    console.error(`Gamesock-Server Error: ${errorMsg}`);
    onErrorFn(errorMsg)
  });
  clientSocket.on('disconnect',(reason:string)=>{
    onDisconnectFn(reason)
  })
};


const startSinglePlayerUpdateListener = () => {
  clientSocket.on('playerUpdated', (player: Player) => {
    singlePlayerUpdateFn(player);
  });
};

const startPlayerListUpdateListener = () => {
  clientSocket.on('getPlayers', (playerList: Player[]) => {
    playerListUpdateFn(playerList);
  });
};

const startRoundStartListener = () => {
  clientSocket.on('startRound', (roundOptions:RoundOptions) => {
    // console.log('roundOptions',roundOptions)
    startRoundFn(roundOptions)
    // start a synchronised timer
    timerSync(roundOptions.time!, roundOptions.timerStart!);
  });
};

const startQuestionRequestListener = () => {
  clientSocket.on('collectQuestions', (callback:CallbackFunction) => {
    callback({
      ok:true,
      questions: sendQuestionsFn()
    })
  });
};

const startStartGameListener = () => {
  clientSocket.on('startGame', (gameOptions: GameOptions) => {
    startGameFn(gameOptions);

    // Show the synced up time
    // console.log('Synced Time: '+ts.now())

    // Start the game listeners which are only for the game
    startGameListeners();
  });
};

const startHotseatListener = () => {
  clientSocket.on('startHotseat', (allQuestions:Question[], hotseatOptions:HotseatOptions) => {
    onStartHotseatFn(allQuestions, hotseatOptions);
    for (const question of allQuestions) {
      timerSync(hotseatOptions.tta,question.tts!)
    }
  })
}
const startHotseatAnswerListener = () => {
  clientSocket.on('hotseatResult', (questionIndex:number, answers:number[]) => {
    onHotseatAnswerFn(questionIndex,answers);
  })
}

const startRoundEndListener = () => {
  clientSocket.on('roundEnd', () => {
    onRoundEndFn();
  })
}

// Start listeners specific to the lobby
const startLobbyListeners = () => {
  ping()
  ts=timesync.create({
    server:timerUrl,
    interval:100000
  }) as any;
  // Generic listnerts
  startMessageListener();
  startErrorListener();
  // Start Syncing listners
  startSinglePlayerUpdateListener();
  startPlayerListUpdateListener();
  // Start lobby specific listeners
  startStartGameListener();
  startRoundStartListener();
} ;

// Start listeners specific to the game
const startGameListeners = () => {
  // Start game specific listeners
  startQuestionRequestListener()
  startHotseatListener();
  startRoundEndListener();
  startHotseatAnswerListener()
};


const timerSync = async (seconds:number,timerStart:number)=>{
  // console.log('Starting timerSync')
  // secondsLeft=seconds;
// @ts-ignore
  const startTime:number=ts.now();
  const waitTime=timerStart-startTime;
  // Function, delay, parameter
  setTimeout(
      startTimer,
      waitTime,
      seconds)
}

const startTimer = (seconds:number) => {
  secondsLeft=seconds;
  // console.log('Starting timer')
  for (let index = secondsLeft; index--;) {
    setTimeout(
      ()=>{
        secondsLeft--;
        timerUpdateFn(secondsLeft)
        if(secondsLeft<0)console.error('Gamesock-Client Error - Timer less than 0. 🙀 This means there was probably a syncing error')
      },
      index * 1000)
  }

}



export default {
  setup,
  joinLobby,
  createLobby,
  onMessage,
  onSinglePlayerUpdate,
  onPlayerListUpdate,
  onStartGame,
  startGame,
  onTimerUpdate,
  onStartHotseat,
  onRoundEnd,
  onHotseatAnswer,
  onError,
  onDisconnect,
  continueWithGame
};