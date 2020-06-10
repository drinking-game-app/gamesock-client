import { TimeSync } from "./timesync";



export interface Emitter{
  emit:()=>void
  on:Emitter
  off:Emitter
  list:Callback[]
}
export type Callback = (data:any)=>void
/**
 * Turn an object into an event emitter. Attaches methods `on`, `off`,
 * `emit`, and `list`
 * @param {Object} obj
 * @return {Object} Returns the original object, extended with emitter functions
 */
 const emitter=(obj:ToEmit):TimeSync=> {
  const _callbacks:{[event:string]:Callback[]} = {};

  obj.emit =  (event:string, data:any)=> {
    const callbacks = _callbacks[event];
    if(callbacks) callbacks.forEach(callback => callback(data));
  };

  obj.on =  (event:string, callback:Callback)=> {
    const callbacks = _callbacks[event] || (_callbacks[event] = []);
    callbacks.push(callback);
    return obj;
  };

  obj.off =  (event:string, callback:Callback)=> {
    if (callback) {
      const callbacks = _callbacks[event];
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        delete _callbacks[event];
      }
    }
    else {
      delete _callbacks[event];
    }
    return obj;
  };

  obj.list =  (event:string)=> {
    return _callbacks[event] || [];
  };
// @ts-ignore
  return obj as TimeSync & Emitter;
}


export default emitter