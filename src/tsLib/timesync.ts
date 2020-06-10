/**
 * timesync
 *
 * Time synchronization between peers
 *
 * https://github.com/enmasseio/timesync
 */

import * as util from './util.js';
import * as stat from './stat.js';
import * as request from './request/request.browser';
import emitter, { Emitter } from './emitter.js';

export interface Options{
      interval?:number;
      timeout?: number
      delay?: number
      repeat?: number
      peers?:string[]
      server?: string|null
      now?: ()=>number
}

export interface TimeSync{
  options:Options;
  offset:number;
  _timeout:number|null;
  _inProgress:{[id:string]:(data:any)=>void}
  _isFirst:boolean,
  send:(to:string, data:any, timeout?:number)=>void;
  receive:  (from:string|undefined, data:any)=> void;
  _handleRPCSendError:(id:string, reject:(value?:unknown)=>void) =>void
  rpc:(to:string, method:string, params:any)=>Promise<unknown>
  sync:()=>void
  _validOffset:(offset:number)=>void
  _syncWithPeer: (peer:string)=>boolean
  _getOffset:  (peer:string)=> Promise<{roundtrip: number, offset: number} | null>
  now:()=>number
  destroy:()=>void
}
/**
 * Factory function to create a timesync instance
 * @param {Object} [options]  TODO: describe options
 * @return {Object} Returns a new timesync instance
 */
export function create(options:Options|undefined={
  interval: 60 * 60 * 1000, // interval for doing synchronizations in ms. Set to null to disable auto sync
  timeout: 10000,           // timeout for requests to fail in ms
  delay: 1000,              // delay between requests in ms
  repeat: 5,                // number of times to do a request to one peer
  peers: [],                // uri's or id's of the peers
  server: null,             // uri of a single server (master/slave configuration)
  now: Date.now             // function returning the system time
}) {
  let timesync:TimeSync = {
    // configurable options
    options: {
      interval: 60 * 60 * 1000, // interval for doing synchronizations in ms. Set to null to disable auto sync
      timeout: 10000,           // timeout for requests to fail in ms
      delay: 1000,              // delay between requests in ms
      repeat: 5,                // number of times to do a request to one peer
      peers: [],                // uri's or id's of the peers
      server: null,             // uri of a single server (master/slave configuration)
      now: Date.now             // function returning the system time
    },

    /** @type {number} The current offset from system time */
    offset: 0, // ms

    /** @type {number} Contains the timeout for the next synchronization */
    _timeout: null,

    /** @type {Object.<string, function>} Contains a map with requests in progress */
    _inProgress: {},

    /**
     * @type {boolean}
     * This property used to immediately apply the first ever received offset.
     * After that, it's set to false and not used anymore.
     */
    _isFirst: true,

    /**
     * Send a message to a peer
     * This method must be overridden when using timesync
     * @param {string} to
     * @param {*} data
     */
    send:  (to:string, data:any, timeout?:number)=> {
        return request.post(to, data, timeout!)
            .then((val)=> {
                const res = val[0];
                timesync.receive(to, res);
            })
            .catch((err)=> {
              emitError(err);
            });
    },

    /**
     * Receive method to be called when a reply comes in
     * @param {string | undefined} [from]
     * @param {*} data
     */
    receive:  (from:string|undefined, data:any)=> {
      if (data === undefined) {
        data = from;
        from = undefined;
      }

      if (data &&  data.id in timesync._inProgress) {
        // this is a reply
        timesync._inProgress[data.id](data.result);
      }
      else if (data && data.id !== undefined&&from!==undefined) {
        // this is a request from an other peer
        // reply with our current time
        timesync.send(from, {
          jsonrpc: '2.0',
          id: data.id,
          result: timesync.now()
        })
      }
    },

    _handleRPCSendError:  (id:string, reject:(value?:unknown)=>void) => {
      delete timesync._inProgress[id];
      reject(new Error('Send failure'));
    },

    /**
     * Send a JSON-RPC message and retrieve a response
     * @param {string} to
     * @param {string} method
     * @param {*} [params]
     * @returns {Promise}
     */
    rpc:  (to:string, method:string, params:any) => {
      const id = util.nextId();
      let resolve:(value?:unknown)=>void;
      let reject:(value?:unknown)=>void;
      const deferred = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });

      timesync._inProgress[id] =  (data:any) =>{
        delete timesync._inProgress[id];

        resolve(data);
      };

      let sendResult;

      try {
        sendResult= timesync.send(to, {
          jsonrpc: '2.0',
          id: id,
          method: method,
          params: params
        }, timesync.options.timeout);
      } catch(err) {
        timesync._handleRPCSendError(id, reject, err);
      }

      if (sendResult && (sendResult instanceof Promise)) {
        sendResult.catch(timesync._handleRPCSendError.bind(this, id, reject));
      } else {
        console.warn('Send should return a promise');
      }

      return deferred;
    },

    /**
     * Synchronize now with all configured peers
     * Docs: http://www.mine-control.com/zack/timesync/timesync.html
     */
    sync:  ()=> {
      timesync.emit('sync', 'start');

      const peers = timesync.options.server ?
          [timesync.options.server] :
          timesync.options.peers;
      return Promise
          .all(peers.map(peer => timesync._syncWithPeer(peer)))
          .then(function (all) {
            var offsets = all.filter(offset => timesync._validOffset(offset));
            if (offsets.length > 0) {
              // take the average of all peers (excluding self) as new offset
              timesync.offset = stat.mean(offsets);
              timesync.emit('change', timesync.offset);
            }
            timesync.emit('sync', 'end');
          });
    },

    /**
     * Test whether given offset is a valid number (not NaN, Infinite, or null)
     * @param {number} offset
     * @returns {boolean}
     * @private
     */
    _validOffset:  (offset:number)=> {
      return offset !== null && !isNaN(offset) && isFinite(offset);
    },

    /**
     * Sync one peer
     * @param {string} peer
     * @return {Promise.<number | null>}  Resolves with the offset to this peer,
     *                                    or null if failed to sync with this peer.
     * @private
     */
    _syncWithPeer: (peer:string)=> {
      // retrieve the offset of a peer, then wait 1 sec
      const all:number[] = [];

      const sync =()=> {
        return timesync._getOffset(peer).then((result:number) => all.push(result));
      }

      const waitAndSync=()=> {
        return util.wait(timesync.options.delay).then(sync);
      }

      const notDone=()=> {
        return all.length < timesync.options.repeat;
      }

      return sync()
          .then( ()=> {
            return util.whilst(notDone, waitAndSync)
          })
          .then( ()=> {
            // filter out null results
            const results = all.filter(result => result !== null);

            // calculate the limit for outliers
            const roundtrips = results.map(result => result.roundtrip);
            const limit = stat.median(roundtrips) + stat.std(roundtrips);

            // filter all results which have a roundtrip smaller than the mean+std
            const filtered = results.filter(result => result.roundtrip < limit);
            const offsets = filtered.map(result => result.offset);

            // return the new offset
            return (offsets.length > 0) ? stat.mean(offsets) : null;
          });
    },

    /**
     * Retrieve the offset from one peer by doing a single call to the peer
     * @param {string} peer
     * @returns {Promise.<{roundtrip: number, offset: number} | null>}
     * @private
     */
    _getOffset:  (peer:string)=> {
      const start = timesync.options.now(); // local system time

      return timesync.rpc(peer, 'timesync')
          .then((timestamp) =>{
            const end = timesync.options.now(); // local system time
            const roundtrip = end - start;
            const offset = timestamp - end + roundtrip / 2; // offset from local system time

            // apply the first ever retrieved offset immediately.
            if (timesync._isFirst) {
              timesync._isFirst = false;
              timesync.offset = offset;
              timesync.emit('change', offset);
            }

            return {
              roundtrip: roundtrip,
              offset: offset
            };
          })
          .catch((err)=> {
            // just ignore failed requests, return null
            return null;
          });
    },

    /**
     * Get the current time
     * @returns {number} Returns a timestamp
     */
    now:() =>{
      return timesync.options.now() + timesync.offset;
    },

    /**
     * Destroy the timesync instance. Stops automatic synchronization.
     * If timesync is currently executing a synchronization, this
     * synchronization will be finished first.
     */
    destroy: ()=> {
      clearTimeout(timesync._timeout);
    }
  };

  // apply provided options
  if (options) {
    if (options.server && options.peers) {
      throw new Error('Configure either option "peers" or "server", not both.');
    }

    timesync.options={...timesync.options, options}
  }

  // turn into an event emitter
  timesync = emitter(timesync);

  /**
   * Emit an error message. If there are no listeners, the error is outputted
   * to the console.
   * @param {Error} err
   */
   const emitError=(err:Error)=> {
    if (timesync.list('error').length > 0) {
      timesync.emit('error', err);
    }
    else {
      console.log('Error', err);
    }
  }

  if (timesync.options.interval !== null) {
    // start an interval to automatically run a synchronization once per interval
    timesync._timeout = setInterval(timesync.sync, timesync.options.interval);

    // synchronize immediately on the next tick (allows to attach event
    // handlers before the timesync starts).
    setTimeout( () =>{
      timesync.sync().catch(err => emitError(err));
    }, 0);
  }

  return timesync as TimeSync & Emitter;
}
