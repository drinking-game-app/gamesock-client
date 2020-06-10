/**
 * Resolve a promise after a delay
 * @param {number} delay    A delay in milliseconds
 * @returns {Promise} Resolves after given delay
 */
export const wait=(delay:number)=> {
  return new Promise((resolve)=> {
    setTimeout(resolve, delay);
  });
}

/**
 * Repeat a given asynchronous function a number of times
 * @param {function} fn   A function returning a promise
 * @param {number} times
 * @return {Promise}
 */
export const repeat=(fn:()=>Promise<number>, times:number)=> {
  return new Promise((resolve, reject)=> {
    let count = 0;
    const results:number[] = [];

    const recurse=()=> {
      if (count < times) {
        count++;
        fn().then( (result)=> {
          results.push(result);
          recurse();
        })
      }
      else {
        resolve(results);
      }
    }

    recurse();
  });
}

/**
 * Repeat an asynchronous callback function whilst
 * @param {function} condition   A function returning true or false
 * @param {function} callback    A callback returning a Promise
 * @returns {Promise}
 */
export const whilst=(condition:()=>boolean, callback:()=>Promise<number>)=> {
  return new Promise( (resolve, reject)=> {
    const recurse=() =>{
      if (condition()) {
        callback().then(() => recurse());
      }
      else {
        resolve();
      }
    }

    recurse();
  });
}

/**
 * Simple id generator
 * @returns {number} Returns a new id
 */
export const nextId=()=> {
  return _id++;
}
let _id = 0;
